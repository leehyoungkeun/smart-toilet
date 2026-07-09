-- 화장실 청소 로그 — '청소 완료' 시각 기록 → 하루 청소 횟수 집계

create table public.cleaning_logs (
  id          bigint generated always as identity primary key,
  location_id uuid not null references public.locations(id) on delete cascade,
  cleaned_at  timestamptz not null default now(),
  cleaner     text,
  note        text
);
create index on public.cleaning_logs (location_id, cleaned_at desc);

alter table public.cleaning_logs enable row level security;
grant select, insert, update, delete on public.cleaning_logs to authenticated;
create policy "loc access cleaning_logs" on public.cleaning_logs
  for all to authenticated using (can_access_location(location_id)) with check (can_access_location(location_id));
alter publication supabase_realtime add table public.cleaning_logs;

-- 청소 완료 기록 (현장 관리자 PIN 인증)
create or replace function public.record_cleaning(p_pin text, p_cleaner text default null, p_note text default null)
returns json language plpgsql security definer set search_path = public as $$
declare v_loc uuid := current_location(); v_today int;
begin
  if v_loc is null then raise exception 'unregistered device'; end if;
  if not verify_admin_pin(p_pin) then raise exception 'unauthorized'; end if;
  insert into cleaning_logs (location_id, cleaner, note)
  values (v_loc, nullif(p_cleaner,''), nullif(p_note,''));
  select count(*) into v_today from cleaning_logs
   where location_id = v_loc and cleaned_at >= start_of_today_kst();
  return json_build_object('today_count', v_today);
end; $$;
grant execute on function public.record_cleaning(text, text, text) to authenticated;

-- fleet_locations 에 오늘 청소 횟수 추가
create or replace function public.fleet_locations()
returns json language plpgsql stable security definer set search_path = public as $$
declare v json;
begin
  select coalesce(json_agg(r order by r.code), '[]'::json) into v from (
    select l.id, l.code, l.name, l.sido, l.sigungu, o.name as org_name,
      l.status, l.created_at, l.maintenance_until, (l.deleted_at is not null) as deleted,
      (d.last_seen_at is not null and d.last_seen_at > now() - interval '5 minutes') as online,
      d.last_seen_at, (d.auth_user_id is not null) as paired,
      d.pairing_code as device_code,
      inv.quantity as pad_qty, inv.capacity as pad_cap,
      (select count(*) from complaints c where c.location_id = l.id and c.status <> 'done') as open_complaints,
      (select count(*) from cleaning_logs cl where cl.location_id = l.id and cl.cleaned_at >= start_of_today_kst()) as today_cleanings,
      el.temperature, el.humidity, el.pm25, el.recorded_at as env_at
    from locations l
    join organizations o on o.id = l.org_id
    left join lateral (select id, last_seen_at, pairing_code, auth_user_id from devices d where d.location_id = l.id order by last_seen_at desc nulls last limit 1) d on true
    left join inventory inv on inv.location_id = l.id and inv.item = 'sanitary_pad'
    left join env_latest el on el.location_id = l.id
    where l.id in (select accessible_location_ids())
  ) r;
  return v;
end; $$;
