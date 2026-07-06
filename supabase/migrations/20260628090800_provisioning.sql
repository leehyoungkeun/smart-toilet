-- 화장실/단말 프로비저닝 RPC — 콘솔에서 단일·대량 추가 (페어링 코드 자동생성)
-- 권한: platform_admin(모든 조직) / org_admin(자기 조직만)

-- 고유 페어링 코드 생성
create or replace function public.gen_pairing_code()
returns text language plpgsql security definer set search_path = public as $$
declare c text;
begin
  loop
    c := 'PAIR-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    exit when not exists (select 1 from devices where pairing_code = c);
  end loop;
  return c;
end; $$;

-- 요청한 org_code 에 쓸 권한이 있는지 확인하고 org_id 반환
create or replace function public.require_org_access(p_org_code text)
returns uuid language plpgsql stable security definer set search_path = public as $$
declare v_role text; v_org uuid; v_target uuid;
begin
  select role, org_id into v_role, v_org from profiles where id = auth.uid();
  if v_role = 'platform_admin' then
    select id into v_target from organizations where code = p_org_code;
    if v_target is null then raise exception 'unknown org_code: %', p_org_code; end if;
    return v_target;
  elsif v_role = 'org_admin' then
    if p_org_code is not null and p_org_code <> (select code from organizations where id = v_org) then
      raise exception 'org_admin can only add to own org';
    end if;
    return v_org;
  end if;
  raise exception 'forbidden';
end; $$;

-- 단일 화장실 추가 (location + device + 재고). 트리거가 설정·재고행 자동 생성.
create or replace function public.admin_create_location(
  p_org_code text, p_code text, p_name text,
  p_sido text default null, p_sigungu text default null,
  p_lat numeric default null, p_lng numeric default null,
  p_device_label text default null, p_stock int default 0
) returns json language plpgsql security definer set search_path = public as $$
declare v_org uuid; v_loc uuid; v_pair text;
begin
  v_org := require_org_access(p_org_code);
  insert into locations (org_id, code, name, sido, sigungu, lat, lng)
  values (v_org, p_code, p_name, p_sido, p_sigungu, p_lat, p_lng)
  returning id into v_loc;

  if coalesce(p_stock, 0) > 0 then
    update inventory set quantity = least(p_stock, capacity)
    where location_id = v_loc and item = 'sanitary_pad';
  end if;

  v_pair := gen_pairing_code();
  insert into devices (location_id, label, pairing_code)
  values (v_loc, coalesce(p_device_label, p_name || ' 키오스크'), v_pair);

  return json_build_object('location_id', v_loc, 'code', p_code, 'pairing_code', v_pair);
end; $$;

-- 대량 추가 — jsonb 배열 [{org_code, code, name, sido, sigungu, lat, lng, stock, device_label}]
-- 행별 savepoint 로 한 건 실패해도 나머지는 진행. 결과 배열 반환.
create or replace function public.admin_bulk_create_locations(p_rows jsonb)
returns json language plpgsql security definer set search_path = public as $$
declare r jsonb; out jsonb := '[]'::jsonb; v_org uuid; v_loc uuid; v_pair text; v_code text;
begin
  for r in select value from jsonb_array_elements(p_rows) loop
    v_code := r->>'code';
    begin
      v_org := require_org_access(r->>'org_code');
      insert into locations (org_id, code, name, sido, sigungu, lat, lng)
      values (v_org, v_code, r->>'name', nullif(r->>'sido',''), nullif(r->>'sigungu',''),
              (nullif(r->>'lat',''))::numeric, (nullif(r->>'lng',''))::numeric)
      returning id into v_loc;

      if coalesce((nullif(r->>'stock',''))::int, 0) > 0 then
        update inventory set quantity = least((r->>'stock')::int, capacity)
        where location_id = v_loc and item = 'sanitary_pad';
      end if;

      v_pair := gen_pairing_code();
      insert into devices (location_id, label, pairing_code)
      values (v_loc, coalesce(nullif(r->>'device_label',''), (r->>'name') || ' 키오스크'), v_pair);

      out := out || jsonb_build_object('code', v_code, 'pairing_code', v_pair, 'status', 'ok');
    exception
      when unique_violation then
        out := out || jsonb_build_object('code', v_code, 'status', 'duplicate');
      when others then
        out := out || jsonb_build_object('code', v_code, 'status', 'error', 'message', SQLERRM);
    end;
  end loop;
  return out;
end; $$;

grant execute on function public.admin_create_location(text,text,text,text,text,numeric,numeric,text,int) to authenticated;
grant execute on function public.admin_bulk_create_locations(jsonb) to authenticated;
