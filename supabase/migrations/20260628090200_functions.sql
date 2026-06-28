-- RPC (SECURITY DEFINER)
-- 키오스크 행위는 location_id 를 인자로 받지 않고 current_location() 으로 서버가 결정
-- → 단말이 다른 화장실 데이터를 조작할 수 없다.

create or replace function public.start_of_today_kst()
returns timestamptz language sql stable as $$
  select date_trunc('day', now() at time zone 'Asia/Seoul') at time zone 'Asia/Seoul';
$$;

-- ── 단말 온보딩: 페어링 코드로 자기 자신을 화장실에 연결 ──
-- 키오스크는 먼저 익명 로그인(auth.uid 확보) 후 이 RPC 를 1회 호출.
create or replace function public.claim_device(p_code text)
returns json language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_loc uuid;
begin
  if auth.uid() is null then raise exception 'auth required'; end if;
  update devices set auth_user_id = auth.uid(), claimed_at = now(), last_seen_at = now()
   where pairing_code = p_code and auth_user_id is null
   returning id, location_id into v_id, v_loc;
  if v_id is null then raise exception 'invalid or already-claimed pairing code'; end if;
  return json_build_object('device_id', v_id, 'location_id', v_loc);
end; $$;

-- ── 민원 접수: 화장실별 접수번호 발급 ───────────────────
create or replace function public.submit_complaint(
  p_category text, p_detail text default null, p_location_label text default null
) returns table (reception_no text, status text, created_at timestamptz)
language plpgsql security definer set search_path = public as $$
declare v_loc uuid := current_location(); v_no text; v_n int;
begin
  if v_loc is null then raise exception 'unregistered device'; end if;
  if coalesce(trim(p_category), '') = '' then raise exception '민원 유형은 필수입니다'; end if;
  update location_settings set complaint_seq = complaint_seq + 1
   where location_id = v_loc returning complaint_seq into v_n;
  v_no := '#' || lpad(v_n::text, 4, '0');
  return query
    insert into complaints (location_id, reception_no, category, detail, location_label)
    values (v_loc, v_no, p_category, left(p_detail, 1000), p_location_label)
    returning complaints.reception_no, complaints.status, complaints.created_at;
end; $$;

-- ── 생리용품 지급: 재고 원자적 차감 + 로그 ──────────────
create or replace function public.dispense_sanitary()
returns json language plpgsql security definer set search_path = public as $$
declare v_loc uuid := current_location(); v_qty int;
begin
  if v_loc is null then raise exception 'unregistered device'; end if;
  update inventory set quantity = quantity - 1
   where location_id = v_loc and item = 'sanitary_pad' and quantity > 0
   returning quantity into v_qty;
  if v_qty is null then return json_build_object('success', false, 'reason', 'out_of_stock'); end if;
  insert into dispense_logs (location_id, item, quantity, status, method)
  values (v_loc, 'sanitary_pad', 1, 'completed', 'qr');
  return json_build_object('success', true, 'remaining', v_qty);
end; $$;

-- ── 만족도 제출 ─────────────────────────────────────────
create or replace function public.submit_satisfaction(p_rating int, p_comment text default null)
returns void language plpgsql security definer set search_path = public as $$
declare v_loc uuid := current_location();
begin
  if v_loc is null then raise exception 'unregistered device'; end if;
  if p_rating not between 1 and 5 then raise exception 'rating out of range'; end if;
  insert into satisfaction_responses (location_id, rating, comment)
  values (v_loc, p_rating, left(p_comment, 500));
end; $$;

-- ── 현장 관리자 PIN 검증 (해당 화장실 설정 기준) ────────
create or replace function public.verify_admin_pin(p_pin text)
returns boolean language plpgsql security definer
set search_path = public, extensions as $$
declare v_loc uuid := current_location(); v_hash text;
begin
  if v_loc is null then return false; end if;
  select pin_hash into v_hash from location_settings where location_id = v_loc;
  return v_hash is not null and v_hash = extensions.crypt(p_pin, v_hash);
end; $$;

-- ── 현장 관리자 대시보드 (자기 화장실, PIN 게이트) ──────
create or replace function public.admin_dashboard(p_pin text)
returns json language plpgsql security definer set search_path = public as $$
declare v_loc uuid := current_location(); v json;
begin
  if not verify_admin_pin(p_pin) then raise exception 'unauthorized'; end if;
  select json_build_object(
    'today_dispensed',  (select count(*) from dispense_logs where location_id = v_loc and dispensed_at >= start_of_today_kst()),
    'inventory_qty',    (select quantity from inventory where location_id = v_loc and item = 'sanitary_pad'),
    'inventory_cap',    (select capacity from inventory where location_id = v_loc and item = 'sanitary_pad'),
    'open_complaints',  (select count(*) from complaints where location_id = v_loc and status <> 'done'),
    'avg_satisfaction', (select round(avg(rating),1) from satisfaction_responses
                          where location_id = v_loc and created_at >= now() - interval '30 days'),
    'recent_complaints',(select coalesce(json_agg(c order by c.created_at desc), '[]'::json) from
                          (select id, reception_no, category, detail, location_label, status, created_at
                             from complaints where location_id = v_loc order by created_at desc limit 5) c),
    'recent_safety',    (select coalesce(json_agg(s order by s.occurred_at desc), '[]'::json) from
                          (select type, title, detail, status, occurred_at
                             from safety_events where location_id = v_loc order by occurred_at desc limit 5) s)
  ) into v;
  return v;
end; $$;

-- ── 현장 관리자: 재고 설정 / 민원 상태 변경 (PIN 게이트) ─
create or replace function public.admin_set_inventory(p_pin text, p_qty int)
returns json language plpgsql security definer set search_path = public as $$
declare v_loc uuid := current_location(); v_qty int; v_cap int;
begin
  if not verify_admin_pin(p_pin) then raise exception 'unauthorized'; end if;
  update inventory set quantity = greatest(0, least(p_qty, capacity))
   where location_id = v_loc and item = 'sanitary_pad'
   returning quantity, capacity into v_qty, v_cap;
  return json_build_object('quantity', v_qty, 'capacity', v_cap);
end; $$;

create or replace function public.admin_update_complaint(p_pin text, p_id bigint, p_status text)
returns json language plpgsql security definer set search_path = public as $$
declare v_loc uuid := current_location(); v_no text;
begin
  if not verify_admin_pin(p_pin) then raise exception 'unauthorized'; end if;
  if p_status not in ('received','in_progress','done') then raise exception 'invalid status'; end if;
  update complaints set status = p_status
   where id = p_id and location_id = v_loc          -- 자기 화장실 민원만
   returning reception_no into v_no;
  if v_no is null then raise exception 'not found'; end if;
  return json_build_object('reception_no', v_no, 'status', p_status);
end; $$;

-- 실행 권한 (authenticated = 단말 + 운영자)
grant execute on function
  public.claim_device(text),
  public.submit_complaint(text, text, text),
  public.dispense_sanitary(),
  public.submit_satisfaction(int, text),
  public.verify_admin_pin(text),
  public.admin_dashboard(text),
  public.admin_set_inventory(text, int),
  public.admin_update_complaint(text, bigint, text)
to authenticated;
