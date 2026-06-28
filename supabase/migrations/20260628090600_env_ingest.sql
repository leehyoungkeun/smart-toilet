-- 실하드웨어 센서 수집 + 시뮬레이터 자동 양보
-- 태블릿(USB-C로 MCU에서 읽은 값) 또는 컨트롤러가 current_location 기준으로 측정값을 올린다.

-- 키오스크/단말이 센서값 INSERT (location 은 서버가 결정 → 위조 불가)
create or replace function public.record_env_reading(
  p_temp numeric, p_humidity numeric, p_ammonia numeric, p_pm25 numeric
) returns void language plpgsql security definer set search_path = public as $$
declare v_loc uuid := current_location();
begin
  if v_loc is null then raise exception 'unregistered device'; end if;
  insert into env_readings (location_id, temperature, humidity, ammonia_ppm, pm25)
  values (v_loc, p_temp, p_humidity, p_ammonia, p_pm25);
end; $$;

grant execute on function public.record_env_reading(numeric, numeric, numeric, numeric) to authenticated;

-- 시뮬레이터는 '최근 3분 내 실측이 들어온 화장실'은 건너뛴다 → 하드웨어 연결 시 자동 양보.
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
  where l.status = 'active'
    and (el.recorded_at is null or el.recorded_at < now() - interval '3 minutes');
end; $$;
