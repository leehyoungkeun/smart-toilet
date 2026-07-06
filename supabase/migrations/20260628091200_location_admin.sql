-- 화장실 수정/삭제 RPC (platform_admin: 전체, org_admin: 자기 지자체만)

create or replace function public.require_location_admin(p_id uuid)
returns void language plpgsql stable security definer set search_path = public as $$
declare v_role text; v_org uuid; v_loc_org uuid;
begin
  select role, org_id into v_role, v_org from profiles where id = auth.uid();
  if v_role = 'platform_admin' then return; end if;
  select org_id into v_loc_org from locations where id = p_id;
  if v_role = 'org_admin' and v_org = v_loc_org then return; end if;
  raise exception 'forbidden';
end; $$;

-- 수정 — null 인자는 유지. 재고는 지정 시에만 반영.
create or replace function public.admin_update_location(
  p_id uuid, p_name text default null, p_sido text default null,
  p_sigungu text default null, p_status text default null, p_stock int default null
) returns void language plpgsql security definer set search_path = public as $$
begin
  perform require_location_admin(p_id);
  if p_status is not null and p_status not in ('active','maintenance','inactive') then
    raise exception 'invalid status';
  end if;
  update locations set
    name    = coalesce(p_name, name),
    sido    = coalesce(p_sido, sido),
    sigungu = coalesce(p_sigungu, sigungu),
    status  = coalesce(p_status, status)
  where id = p_id;
  if p_stock is not null then
    update inventory set quantity = greatest(0, least(p_stock, capacity))
    where location_id = p_id and item = 'sanitary_pad';
  end if;
end; $$;

-- 삭제 — FK on delete cascade 로 단말·재고·민원·기록도 함께 삭제
create or replace function public.admin_delete_location(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform require_location_admin(p_id);
  delete from locations where id = p_id;
end; $$;

grant execute on function public.admin_update_location(uuid,text,text,text,text,int) to authenticated;
grant execute on function public.admin_delete_location(uuid) to authenticated;
