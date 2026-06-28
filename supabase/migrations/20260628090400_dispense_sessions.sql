-- QR 지급 세션 (스마트폰 스캔 → 모바일 웹 승인 → 키오스크 Realtime 반영)
-- 흐름: 키오스크가 세션 생성(QR에 토큰) → 폰이 토큰으로 승인 → 재고차감/로그 → 키오스크 화면 전환
-- 본인인증 없음(간이 동의). 1일 1회는 세션/기기 기준의 느슨한 제한.

create table public.dispense_sessions (
  id            uuid primary key default gen_random_uuid(),
  location_id   uuid not null references public.locations(id) on delete cascade,
  token         text not null unique,                 -- QR 에 담기는 1회성 토큰
  item          text not null default 'sanitary_pad',
  status        text not null default 'pending'
                  check (status in ('pending','dispensed','expired','cancelled')),
  created_at    timestamptz not null default now(),
  expires_at    timestamptz not null default now() + interval '3 minutes',
  authorized_at timestamptz
);
create index on public.dispense_sessions (location_id, created_at desc);

alter table public.dispense_sessions enable row level security;
grant select, insert, update, delete on public.dispense_sessions to authenticated;

-- 키오스크(자기 화장실)·운영자만 세션 행을 직접 조회/구독
create policy "loc access dispense_sessions" on public.dispense_sessions
  for all to authenticated
  using (can_access_location(location_id))
  with check (can_access_location(location_id));

-- Realtime: 키오스크가 세션 상태 변화를 구독
alter publication supabase_realtime add table public.dispense_sessions;

-- ── 키오스크: 지급 세션 생성 (QR 토큰 발급) ─────────────
create or replace function public.create_dispense_session()
returns json language plpgsql security definer set search_path = public as $$
declare v_loc uuid := current_location(); v_token text; v_id uuid;
begin
  if v_loc is null then raise exception 'unregistered device'; end if;
  -- 직전 미완료(pending) 세션은 정리
  update dispense_sessions set status = 'cancelled'
   where location_id = v_loc and status = 'pending';
  v_token := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  insert into dispense_sessions (location_id, token)
  values (v_loc, v_token)
  returning id into v_id;
  return json_build_object('session_id', v_id, 'token', v_token);
end; $$;

-- ── 폰(anon): 토큰으로 세션 정보 조회 (페이지 렌더용) ───
create or replace function public.get_dispense_session(p_token text)
returns json language plpgsql security definer set search_path = public as $$
declare v_sess record; v_name text; v_label text; v_qty int;
begin
  select * into v_sess from dispense_sessions where token = p_token;
  if v_sess is null then return json_build_object('found', false); end if;
  select name into v_name from locations where id = v_sess.location_id;
  select label, quantity into v_label, v_qty
    from inventory where location_id = v_sess.location_id and item = v_sess.item;
  return json_build_object(
    'found', true,
    'status', case when v_sess.status = 'pending' and v_sess.expires_at < now()
                   then 'expired' else v_sess.status end,
    'location_name', v_name,
    'item_label', v_label,
    'available', coalesce(v_qty, 0) > 0
  );
end; $$;

-- ── 폰(anon): 동의 후 지급 승인 (재고 차감 + 로그 + 세션 종료) ──
create or replace function public.authorize_dispense(p_token text, p_consent boolean default true)
returns json language plpgsql security definer set search_path = public as $$
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

  update inventory set quantity = quantity - 1
   where location_id = v_sess.location_id and item = v_sess.item and quantity > 0
   returning quantity into v_qty;
  if v_qty is null then
    return json_build_object('success', false, 'reason', 'out_of_stock');
  end if;

  insert into dispense_logs (location_id, item, quantity, status, method)
  values (v_sess.location_id, v_sess.item, 1, 'completed', 'qr');

  update dispense_sessions set status = 'dispensed', authorized_at = now() where id = v_sess.id;
  return json_build_object('success', true, 'remaining', v_qty);
end; $$;

-- 실행 권한: 세션 생성은 키오스크(authenticated), 조회/승인은 폰(anon) 포함
grant execute on function public.create_dispense_session()            to authenticated;
grant execute on function public.get_dispense_session(text)           to anon, authenticated;
grant execute on function public.authorize_dispense(text, boolean)    to anon, authenticated;
