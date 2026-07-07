-- 유지보수 만료일 (maintenance_until) — 대시보드에 남은 일수/정상·임박·만료 표시

alter table public.locations add column if not exists maintenance_until date;

-- admin_update_location 에 유지보수 만료일 파라미터 추가 (시그니처 변경 → drop 후 재생성)
drop function if exists public.admin_update_location(uuid,text,text,text,text,int);
create or replace function public.admin_update_location(
  p_id uuid, p_name text default null, p_sido text default null,
  p_sigungu text default null, p_status text default null, p_stock int default null,
  p_maintenance_until date default null
) returns void language plpgsql security definer set search_path = public as $$
begin
  perform require_location_admin(p_id);
  if p_status is not null and p_status not in ('active','maintenance','inactive') then
    raise exception 'invalid status';
  end if;
  update locations set
    name = coalesce(p_name, name),
    sido = coalesce(p_sido, sido),
    sigungu = coalesce(p_sigungu, sigungu),
    status = coalesce(p_status, status),
    maintenance_until = coalesce(p_maintenance_until, maintenance_until)
  where id = p_id;
  if p_stock is not null then
    update inventory set quantity = greatest(0, least(p_stock, capacity))
    where location_id = p_id and item = 'sanitary_pad';
  end if;
end; $$;
grant execute on function public.admin_update_location(uuid,text,text,text,text,int,date) to authenticated;

-- fleet_locations 에 maintenance_until 추가
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
