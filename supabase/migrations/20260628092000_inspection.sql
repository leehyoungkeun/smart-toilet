-- 청소·점검 인증 기록 — 현장 관리자 PIN 인증 후 점검 항목을 inspections 에 저장
create or replace function public.record_inspection(
  p_pin text, p_inspector text, p_items jsonb
) returns json language plpgsql security definer set search_path = public as $$
declare v_loc uuid := current_location(); it jsonb; n int := 0;
begin
  if v_loc is null then raise exception 'unregistered device'; end if;
  if not verify_admin_pin(p_pin) then raise exception 'unauthorized'; end if;
  for it in select value from jsonb_array_elements(p_items) loop
    insert into inspections (location_id, category, title, status, inspector)
    values (v_loc, it->>'category', it->>'title', 'done', nullif(p_inspector,''));
    n := n + 1;
  end loop;
  return json_build_object('inserted', n);
end; $$;

grant execute on function public.record_inspection(text, text, jsonb) to authenticated;
