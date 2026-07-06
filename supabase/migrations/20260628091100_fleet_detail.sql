-- 콘솔 상세 대시보드용 — fleet_locations 확장(상태/등록일/장비코드)
create or replace function public.fleet_locations()
returns json language plpgsql stable security definer set search_path = public as $$
declare v json;
begin
  select coalesce(json_agg(r order by r.code), '[]'::json) into v from (
    select l.id, l.code, l.name, l.sido, l.sigungu, o.name as org_name,
      l.status, l.created_at,
      (d.last_seen_at is not null and d.last_seen_at > now() - interval '5 minutes') as online,
      d.last_seen_at,
      case when d.id is not null then upper(substr(replace(d.id::text, '-', ''), 1, 6)) end as device_code,
      inv.quantity as pad_qty, inv.capacity as pad_cap,
      (select count(*) from complaints c where c.location_id = l.id and c.status <> 'done') as open_complaints,
      el.temperature, el.humidity, el.pm25, el.recorded_at as env_at
    from locations l
    join organizations o on o.id = l.org_id
    left join lateral (
      select id, last_seen_at from devices d where d.location_id = l.id
      order by last_seen_at desc nulls last limit 1
    ) d on true
    left join inventory inv on inv.location_id = l.id and inv.item = 'sanitary_pad'
    left join env_latest el on el.location_id = l.id
    where l.id in (select accessible_location_ids())
  ) r;
  return v;
end; $$;
