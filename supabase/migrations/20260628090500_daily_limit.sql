-- 1일 1회 지급 제한 (본인인증 없음 → 폰 브라우저의 claimant_id 기준, 서버에서 강제)
-- claimant_id 는 모바일 수령 페이지가 localStorage 에 보관하는 영구 난수 id.
-- 전체 화장실 통합 기준 1일 1회 (Asia/Seoul 자정 기준).

alter table public.dispense_logs add column if not exists claimant_id text;
create index if not exists dispense_logs_claimant_idx
  on public.dispense_logs (claimant_id, dispensed_at desc);

-- authorize_dispense 시그니처 변경(파라미터 추가) → 기존 함수 드롭 후 재생성
drop function if exists public.authorize_dispense(text, boolean);

create or replace function public.authorize_dispense(
  p_token text,
  p_consent boolean default true,
  p_claimant_id text default null
) returns json language plpgsql security definer set search_path = public as $$
declare v_sess dispense_sessions%rowtype; v_qty int;
begin
  if not coalesce(p_consent, false) then raise exception 'consent_required'; end if;

  select * into v_sess from dispense_sessions where token = p_token for update;
  if not found then return json_build_object('success', false, 'reason', 'invalid'); end if;
  if v_sess.status <> 'pending' then return json_build_object('success', false, 'reason', 'already_used'); end if;
  if v_sess.expires_at < now() then
    update dispense_sessions set status = 'expired' where id = v_sess.id;
    return json_build_object('success', false, 'reason', 'expired');
  end if;

  -- 1일 1회 제한 (claimant 기준, 전체 화장실 통합)
  if p_claimant_id is not null and exists (
    select 1 from dispense_logs
     where claimant_id = p_claimant_id and dispensed_at >= start_of_today_kst()
  ) then
    return json_build_object('success', false, 'reason', 'already_claimed_today');
  end if;

  update inventory set quantity = quantity - 1
   where location_id = v_sess.location_id and item = v_sess.item and quantity > 0
   returning quantity into v_qty;
  if v_qty is null then
    return json_build_object('success', false, 'reason', 'out_of_stock');
  end if;

  insert into dispense_logs (location_id, item, quantity, status, method, claimant_id)
  values (v_sess.location_id, v_sess.item, 1, 'completed', 'qr', p_claimant_id);

  update dispense_sessions set status = 'dispensed', authorized_at = now() where id = v_sess.id;
  return json_build_object('success', true, 'remaining', v_qty);
end; $$;

grant execute on function public.authorize_dispense(text, boolean, text) to anon, authenticated;
