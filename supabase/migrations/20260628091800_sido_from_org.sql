-- 시·도 입력 생략 → 지자체(조직) 이름으로 자동 채움

create or replace function public.admin_create_location(
  p_org_code text, p_code text, p_name text,
  p_sido text default null, p_sigungu text default null,
  p_lat numeric default null, p_lng numeric default null,
  p_device_label text default null, p_stock int default 0
) returns json language plpgsql security definer set search_path = public as $$
declare v_org uuid; v_orgname text; v_loc uuid; v_pair text;
begin
  v_org := require_org_access(p_org_code);
  select name into v_orgname from organizations where id = v_org;
  insert into locations (org_id, code, name, sido, sigungu, lat, lng)
  values (v_org, p_code, p_name, coalesce(nullif(p_sido,''), v_orgname), p_sigungu, p_lat, p_lng)
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

create or replace function public.admin_bulk_create_locations(p_rows jsonb)
returns json language plpgsql security definer set search_path = public as $$
declare r jsonb; out jsonb := '[]'::jsonb; v_org uuid; v_orgname text; v_loc uuid; v_pair text; v_code text;
begin
  for r in select value from jsonb_array_elements(p_rows) loop
    v_code := r->>'code';
    begin
      v_org := require_org_access(r->>'org_code');
      select name into v_orgname from organizations where id = v_org;
      insert into locations (org_id, code, name, sido, sigungu, lat, lng)
      values (v_org, v_code, r->>'name',
              coalesce(nullif(r->>'sido',''), v_orgname), nullif(r->>'sigungu',''),
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
      when unique_violation then out := out || jsonb_build_object('code', v_code, 'status', 'duplicate');
      when others then out := out || jsonb_build_object('code', v_code, 'status', 'error', 'message', SQLERRM);
    end;
  end loop;
  return out;
end; $$;
