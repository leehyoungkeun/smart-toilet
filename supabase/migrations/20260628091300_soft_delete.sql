-- 소프트 삭제(이력 보존) + 복원. 하드 삭제(admin_delete_location)는 기존 유지(테스트 데이터용).

alter table public.locations add column if not exists deleted_at timestamptz;
create index if not exists locations_deleted_idx on public.locations (deleted_at);

-- 소프트 삭제 / 복원
create or replace function public.admin_soft_delete_location(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform require_location_admin(p_id);
  update locations set deleted_at = now() where id = p_id;
end; $$;

create or replace function public.admin_restore_location(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform require_location_admin(p_id);
  update locations set deleted_at = null where id = p_id;
end; $$;

-- fleet_locations: 삭제 포함 반환 + deleted 플래그(콘솔에서 필터/복원)
create or replace function public.fleet_locations()
returns json language plpgsql stable security definer set search_path = public as $$
declare v json;
begin
  select coalesce(json_agg(r order by r.code), '[]'::json) into v from (
    select l.id, l.code, l.name, l.sido, l.sigungu, o.name as org_name,
      l.status, l.created_at, (l.deleted_at is not null) as deleted,
      (d.last_seen_at is not null and d.last_seen_at > now() - interval '5 minutes') as online,
      d.last_seen_at,
      case when d.id is not null then upper(substr(replace(d.id::text, '-', ''), 1, 6)) end as device_code,
      inv.quantity as pad_qty, inv.capacity as pad_cap,
      (select count(*) from complaints c where c.location_id = l.id and c.status <> 'done') as open_complaints,
      el.temperature, el.humidity, el.pm25, el.recorded_at as env_at
    from locations l
    join organizations o on o.id = l.org_id
    left join lateral (select id, last_seen_at from devices d where d.location_id = l.id order by last_seen_at desc nulls last limit 1) d on true
    left join inventory inv on inv.location_id = l.id and inv.item = 'sanitary_pad'
    left join env_latest el on el.location_id = l.id
    where l.id in (select accessible_location_ids())
  ) r;
  return v;
end; $$;

-- fleet_overview: 삭제된 화장실 제외
create or replace function public.fleet_overview()
returns json language plpgsql stable security definer set search_path = public as $$
declare v json; ids uuid[];
begin
  select array_agg(id) into ids from locations
   where deleted_at is null and id in (select accessible_location_ids());
  ids := coalesce(ids, array[]::uuid[]);
  select json_build_object(
    'locations',       array_length(ids, 1),
    'online',          (select count(*) from devices where location_id = any(ids) and last_seen_at > now() - interval '5 minutes'),
    'offline',         (select count(*) from devices where location_id = any(ids) and (last_seen_at is null or last_seen_at <= now() - interval '5 minutes')),
    'low_stock',       (select count(*) from inventory where location_id = any(ids) and item = 'sanitary_pad' and quantity <= 10),
    'open_complaints', (select count(*) from complaints where location_id = any(ids) and status <> 'done'),
    'safety_today',    (select count(*) from safety_events where location_id = any(ids) and occurred_at >= start_of_today_kst())
  ) into v;
  return v;
end; $$;

grant execute on function public.admin_soft_delete_location(uuid) to authenticated;
grant execute on function public.admin_restore_location(uuid) to authenticated;
