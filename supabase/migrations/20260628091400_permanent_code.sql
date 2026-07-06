-- 페어링 코드를 '영구 고유 코드'로 전환 (재사용/반납 제거)
-- 각 단말은 변하지 않는 유일한 코드를 보유. 4자리 영숫자 ≈ 100만 공간 → 1만 대에 충분.

-- 1) 과거 반납되어 코드가 없는 단말에 코드 backfill
do $$
declare r record;
begin
  for r in select id from devices where pairing_code is null loop
    update devices set pairing_code = gen_pairing_code() where id = r.id;
  end loop;
end $$;

-- 2) 이제 모든 단말은 항상 코드 보유
alter table public.devices alter column pairing_code set not null;

-- 3) 등록(claim) 시 코드를 유지(반납 X) — 코드가 영구 고유 식별자
create or replace function public.claim_device(p_code text)
returns json language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_loc uuid;
begin
  if auth.uid() is null then raise exception 'auth required'; end if;
  update devices
     set auth_user_id = auth.uid(), claimed_at = now(), last_seen_at = now()
   where pairing_code = p_code and auth_user_id is null
   returning id, location_id into v_id, v_loc;
  if v_id is null then raise exception 'invalid or already-claimed pairing code'; end if;
  return json_build_object('device_id', v_id, 'location_id', v_loc);
end; $$;

-- 4) 재페어링 초기화 (태블릿 교체) — 연결만 해제, 같은 코드로 다시 등록 가능
create or replace function public.admin_unpair_device(p_location_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform require_location_admin(p_location_id);
  update devices set auth_user_id = null, claimed_at = null where location_id = p_location_id;
end; $$;

-- 5) 코드 재발급 (분실/노출 시 새 고유 코드) — 단말별로 새 코드 부여
create or replace function public.admin_reissue_pairing_code(p_location_id uuid)
returns json language plpgsql security definer set search_path = public as $$
declare r record; v_codes text[] := array[]::text[]; v_new text;
begin
  perform require_location_admin(p_location_id);
  for r in select id from devices where location_id = p_location_id loop
    v_new := gen_pairing_code();
    update devices set pairing_code = v_new where id = r.id;
    v_codes := v_codes || v_new;
  end loop;
  return json_build_object('codes', v_codes);
end; $$;

-- 6) fleet_locations: 장비코드를 '영구 고유 페어링 코드'로 표시
create or replace function public.fleet_locations()
returns json language plpgsql stable security definer set search_path = public as $$
declare v json;
begin
  select coalesce(json_agg(r order by r.code), '[]'::json) into v from (
    select l.id, l.code, l.name, l.sido, l.sigungu, o.name as org_name,
      l.status, l.created_at, (l.deleted_at is not null) as deleted,
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

grant execute on function public.admin_unpair_device(uuid) to authenticated;
grant execute on function public.admin_reissue_pairing_code(uuid) to authenticated;
