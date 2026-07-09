-- 청소완료 = 시간대(오전/오후) + 점검표 체크리스트 동시 기록 (실제 관리점검표 방식)
alter table public.cleaning_logs add column if not exists shift text;  -- '오전' / '오후'

drop function if exists public.record_cleaning(text, text, text);

-- 청소완료: cleaning_logs(시간대) 기록 + 점검표 항목들을 inspections 에 함께 기록
create or replace function public.record_cleaning(
  p_pin text, p_cleaner text default null, p_shift text default null, p_items jsonb default '[]'::jsonb
) returns json language plpgsql security definer set search_path = public as $$
declare v_loc uuid := current_location(); it jsonb; v_today int;
begin
  if v_loc is null then raise exception 'unregistered device'; end if;
  if not verify_admin_pin(p_pin) then raise exception 'unauthorized'; end if;

  insert into cleaning_logs (location_id, cleaner, shift)
  values (v_loc, nullif(p_cleaner,''), nullif(p_shift,''));

  for it in select value from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) loop
    insert into inspections (location_id, category, title, status, inspector)
    values (v_loc, coalesce(it->>'category','cleanliness'), it->>'title', 'done', nullif(p_cleaner,''));
  end loop;

  select count(*) into v_today from cleaning_logs
   where location_id = v_loc and cleaned_at >= start_of_today_kst();
  return json_build_object('today_count', v_today);
end; $$;
grant execute on function public.record_cleaning(text, text, text, jsonb) to authenticated;
