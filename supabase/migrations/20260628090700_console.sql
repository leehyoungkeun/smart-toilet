-- 운영자 중앙 콘솔 백엔드 — 하트비트 + 권한 스코핑 집계 + 계정 프로비저닝
-- 역할: platform_admin(전체) / org_admin(자기 지자체) / operator(배정 화장실)

-- ── 현재 사용자가 접근 가능한 location id 집합 ──────────
create or replace function public.accessible_location_ids()
returns setof uuid language plpgsql stable security definer set search_path = public as $$
declare v_role text; v_org uuid;
begin
  -- 단말(키오스크): 자기 화장실
  return query select location_id from devices where auth_user_id = auth.uid();
  -- 운영자
  select role, org_id into v_role, v_org from profiles where id = auth.uid();
  if v_role = 'platform_admin' then
    return query select id from locations;
  elsif v_role = 'org_admin' then
    return query select id from locations where org_id = v_org;
  elsif v_role = 'operator' then
    return query select location_id from operator_locations where profile_id = auth.uid();
  end if;
end; $$;

-- ── 키오스크 하트비트 (온라인/오프라인 판정용) ──────────
create or replace function public.device_heartbeat()
returns void language plpgsql security definer set search_path = public as $$
begin
  update devices set last_seen_at = now() where auth_user_id = auth.uid();
end; $$;

-- ── 플릿 KPI (권한 범위 자동 스코핑) ────────────────────
create or replace function public.fleet_overview()
returns json language plpgsql stable security definer set search_path = public as $$
declare v json;
begin
  select json_build_object(
    'locations',       (select count(*) from locations where id in (select accessible_location_ids())),
    'online',          (select count(*) from devices where location_id in (select accessible_location_ids())
                          and last_seen_at > now() - interval '5 minutes'),
    'offline',         (select count(*) from devices where location_id in (select accessible_location_ids())
                          and (last_seen_at is null or last_seen_at <= now() - interval '5 minutes')),
    'low_stock',       (select count(*) from inventory where location_id in (select accessible_location_ids())
                          and item = 'sanitary_pad' and quantity <= 10),
    'open_complaints', (select count(*) from complaints where location_id in (select accessible_location_ids())
                          and status <> 'done'),
    'safety_today',    (select count(*) from safety_events where location_id in (select accessible_location_ids())
                          and occurred_at >= start_of_today_kst())
  ) into v;
  return v;
end; $$;

-- ── 화장실별 상태 목록 (대시보드 표) ────────────────────
create or replace function public.fleet_locations()
returns json language plpgsql stable security definer set search_path = public as $$
declare v json;
begin
  select coalesce(json_agg(r order by r.code), '[]'::json) into v from (
    select l.id, l.code, l.name, l.sido, l.sigungu, o.name as org_name,
      (d.last_seen_at is not null and d.last_seen_at > now() - interval '5 minutes') as online,
      d.last_seen_at,
      inv.quantity as pad_qty, inv.capacity as pad_cap,
      (select count(*) from complaints c where c.location_id = l.id and c.status <> 'done') as open_complaints,
      el.temperature, el.humidity, el.ammonia_ppm, el.pm25, el.recorded_at as env_at
    from locations l
    join organizations o on o.id = l.org_id
    left join lateral (
      select last_seen_at from devices d where d.location_id = l.id
      order by last_seen_at desc nulls last limit 1
    ) d on true
    left join inventory inv on inv.location_id = l.id and inv.item = 'sanitary_pad'
    left join env_latest el on el.location_id = l.id
    where l.id in (select accessible_location_ids())
  ) r;
  return v;
end; $$;

-- ── 신규 로그인 사용자 → profiles 자동 생성 (익명 단말 제외) ──
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if coalesce(new.is_anonymous, false) then return new; end if;  -- 키오스크(익명)는 제외
  insert into profiles (id, full_name, role)
  values (new.id, new.raw_user_meta_data->>'full_name', 'operator')
  on conflict (id) do nothing;
  return new;
end; $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── platform_admin 이 운영자 역할/소속 지정 ─────────────
create or replace function public.admin_set_operator(p_user uuid, p_role text, p_org uuid default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from profiles where id = auth.uid() and role = 'platform_admin') then
    raise exception 'forbidden';
  end if;
  if p_role not in ('platform_admin','org_admin','operator') then raise exception 'invalid role'; end if;
  update profiles set role = p_role, org_id = p_org where id = p_user;
end; $$;

grant execute on function public.accessible_location_ids()                      to authenticated;
grant execute on function public.device_heartbeat()                            to authenticated;
grant execute on function public.fleet_overview()                              to authenticated;
grant execute on function public.fleet_locations()                             to authenticated;
grant execute on function public.admin_set_operator(uuid, text, uuid)          to authenticated;
