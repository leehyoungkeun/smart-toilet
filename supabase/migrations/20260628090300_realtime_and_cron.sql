-- Realtime 구독 + 파티션 유지보수 + 센서 시뮬레이터(cron)

-- ── Realtime ────────────────────────────────────────────
-- 원시 시계열(env_readings)은 과다 → 최신값 캐시(env_latest)만 구독.
-- 단말은 자기 location_id 필터 + RLS 로 자기 행만 수신.
alter publication supabase_realtime add table public.env_latest;
alter publication supabase_realtime add table public.inventory;
alter publication supabase_realtime add table public.complaints;
alter publication supabase_realtime add table public.safety_events;
alter publication supabase_realtime add table public.dispense_logs;

-- ── 환경 시계열 파티션 유지보수 ─────────────────────────
create or replace function public.ensure_env_partition(p_month date)
returns void language plpgsql as $$
declare s date := date_trunc('month', p_month)::date;
        nm text := 'env_readings_' || to_char(s, 'YYYYMM');
begin
  if not exists (select 1 from pg_class where relname = nm) then
    execute format('create table public.%I partition of public.env_readings for values from (%L) to (%L)',
                   nm, s, (s + interval '1 month')::date);
  end if;
end; $$;

-- 다음 달 파티션 선생성 + 보관기간(기본 6개월) 경과 파티션 삭제
create or replace function public.maintain_env_partitions()
returns void language plpgsql security definer set search_path = public as $$
declare r record; cutoff date := (date_trunc('month', now()) - interval '6 months')::date;
begin
  perform ensure_env_partition(now()::date);
  perform ensure_env_partition((now() + interval '1 month')::date);
  for r in
    select c.relname from pg_inherits i
      join pg_class c on c.oid = i.inhrelid
      join pg_class p on p.oid = i.inhparent
     where p.relname = 'env_readings'
  loop
    if r.relname ~ '^env_readings_\d{6}$'
       and to_date(right(r.relname, 6), 'YYYYMM') < cutoff then
      execute format('drop table if exists public.%I', r.relname);
    end if;
  end loop;
end; $$;

-- ── 환경 센서 시뮬레이터 (전 화장실 일괄, 직전값 랜덤워크) ──
-- 실센서/게이트웨이 도입 시: 이 함수와 cron 잡만 제거하고
-- 게이트웨이가 env_readings 에 INSERT (env_latest 는 트리거가 자동 동기화).
create or replace function public.simulate_all_env()
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into env_readings (location_id, temperature, humidity, ammonia_ppm, pm25)
  select l.id,
    greatest(18,  least(30,  round((coalesce(el.temperature, 24.5) + (random()-0.5)*0.6)::numeric, 1))),
    greatest(30,  least(80,  round((coalesce(el.humidity,    53.0) + (random()-0.5)*2.0)::numeric, 1))),
    greatest(0,   least(1,   round((coalesce(el.ammonia_ppm,  0.02) + (random()-0.5)*0.004)::numeric, 3))),
    greatest(0,   least(150, round((coalesce(el.pm25,        12.0) + (random()-0.5)*3.0)::numeric, 1)))
  from locations l
  left join env_latest el on el.location_id = l.id
  where l.status = 'active';
end; $$;

-- ── pg_cron 스케줄 ──────────────────────────────────────
-- (Supabase: Dashboard > Database > Extensions 에서 pg_cron 활성화 필요할 수 있음)
create extension if not exists pg_cron;

select cron.unschedule('simulate-env')      where exists (select 1 from cron.job where jobname = 'simulate-env');
select cron.unschedule('maintain-env-part') where exists (select 1 from cron.job where jobname = 'maintain-env-part');

-- 1분마다 전 화장실 환경값 생성
select cron.schedule('simulate-env', '* * * * *', $$ select public.simulate_all_env(); $$);
-- 매일 03:10 파티션 선생성/정리
select cron.schedule('maintain-env-part', '10 3 * * *', $$ select public.maintain_env_partitions(); $$);
