-- RLS 정책 (멀티테넌트)
-- 인증 주체는 모두 Supabase Auth 사용자(role=authenticated):
--   · 키오스크 = 익명 인증 사용자, devices.auth_user_id 로 1개 location 에 매핑
--   · 운영자   = profiles 의 platform_admin / org_admin / operator
-- 접근 가능 location 집합을 can_access_location() 한 곳에서 판정 → 모든 테이블 동일 적용.

-- ── 스코프 판정 헬퍼 ────────────────────────────────────
-- 현재 단말의 location (운영자면 null)
create or replace function public.current_location()
returns uuid language sql stable security definer set search_path = public as $$
  select location_id from devices where auth_user_id = auth.uid();
$$;

-- 이 사용자가 해당 location 에 접근 가능한가?
create or replace function public.can_access_location(loc uuid)
returns boolean language plpgsql stable security definer set search_path = public as $$
declare v_role text; v_org uuid; v_loc_org uuid;
begin
  if loc is null then return false; end if;
  -- 1) 단말: 자기 화장실만
  if exists (select 1 from devices where auth_user_id = auth.uid() and location_id = loc) then
    return true;
  end if;
  -- 2) 운영자 역할
  select role, org_id into v_role, v_org from profiles where id = auth.uid();
  if v_role is null then return false; end if;
  if v_role = 'platform_admin' then return true; end if;
  select org_id into v_loc_org from locations where id = loc;
  if v_role = 'org_admin' and v_org = v_loc_org then return true; end if;
  if v_role = 'operator'
     and exists (select 1 from operator_locations where profile_id = auth.uid() and location_id = loc)
  then return true; end if;
  return false;
end; $$;

-- ── RLS 활성화 ─────────────────────────────────────────
alter table public.organizations           enable row level security;
alter table public.profiles                 enable row level security;
alter table public.locations                enable row level security;
alter table public.operator_locations       enable row level security;
alter table public.devices                  enable row level security;
alter table public.location_settings        enable row level security;
alter table public.inventory                enable row level security;
alter table public.env_readings             enable row level security;
alter table public.env_latest               enable row level security;
alter table public.dispense_logs            enable row level security;
alter table public.complaints               enable row level security;
alter table public.satisfaction_responses   enable row level security;
alter table public.inspections              enable row level security;
alter table public.safety_events            enable row level security;

-- 명령 단위 GRANT (RLS 는 행 단위. 둘 다 필요)
grant select, insert, update, delete on all tables in schema public to authenticated;

-- ── 디렉터리/계정 정책 ─────────────────────────────────
-- 본인 프로필
create policy "self profile" on public.profiles for select to authenticated using (id = auth.uid());
-- 소속/접근 가능 조직
create policy "read own org" on public.organizations for select to authenticated
  using (exists (select 1 from profiles p where p.id = auth.uid()
                 and (p.role = 'platform_admin' or p.org_id = organizations.id)));
-- 접근 가능 화장실
create policy "read accessible locations" on public.locations for select to authenticated
  using (can_access_location(id));
-- 단말: 자기 자신 또는 접근 가능 화장실의 단말
create policy "read accessible devices" on public.devices for select to authenticated
  using (auth_user_id = auth.uid() or can_access_location(location_id));
-- 운영자 배정: 본인 것
create policy "read own assignments" on public.operator_locations for select to authenticated
  using (profile_id = auth.uid());
-- 화장실 설정: 접근 가능 범위 (PIN 해시는 RPC 로만 검증 — 직접 노출 주의)
create policy "access location settings" on public.location_settings for all to authenticated
  using (can_access_location(location_id)) with check (can_access_location(location_id));

-- ── 운영 데이터 정책: 전 테이블 동일 패턴 ───────────────
-- 접근 가능 location 의 행만 읽고/쓸 수 있다. (단말=자기 화장실, 운영자=담당 범위)
do $$
declare t text;
begin
  foreach t in array array[
    'inventory','env_readings','env_latest','dispense_logs',
    'complaints','satisfaction_responses','inspections','safety_events'
  ] loop
    execute format($f$
      create policy "loc access %1$s" on public.%1$I for all to authenticated
      using (can_access_location(location_id))
      with check (can_access_location(location_id));
    $f$, t);
  end loop;
end $$;

-- 참고: 민원 접수번호 발급·재고 차감 등은 SECURITY DEFINER RPC 로 수행하여
-- 단말이 location_id 를 위조할 수 없도록 한다(다음 마이그레이션). 위 정책은
-- 운영자 콘솔의 직접 조회/수정 및 단말의 자기-화장실 읽기를 커버.
