-- 스마트 공중화장실 서비스 플랫폼 — 초기 스키마 (멀티테넌트)
-- 계층: organizations(지자체) → locations(화장실) → devices(키오스크)
-- 모든 운영 데이터는 location_id 로 격리. 1,000+ 화장실 확장 대비.

create extension if not exists pgcrypto with schema extensions; -- PIN 해시(crypt)

-- 공용 트리거: updated_at 자동 갱신
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

-- ════════════════════════════════════════════════════════
--  테넌시 / 디렉터리
-- ════════════════════════════════════════════════════════

-- 지자체(운영 주체)
create table public.organizations (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,                 -- 'GG' (경기도) 등
  name        text not null,
  type        text not null default 'municipality', -- 광역/기초/위탁사 등
  created_at  timestamptz not null default now()
);

-- 운영자 계정(= Supabase Auth 사용자 1:1). 중앙/지역 콘솔용.
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  role        text not null default 'operator'
                check (role in ('platform_admin','org_admin','operator')),
  org_id      uuid references public.organizations(id) on delete set null,
  created_at  timestamptz not null default now()
);

-- 화장실(테넌트 단위)
create table public.locations (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.organizations(id) on delete restrict,
  code        text not null unique,                 -- 'GG-SUWON-001'
  name        text not null,                        -- '중앙근린공원 공중화장실'
  address     text,
  sido        text,                                 -- 시·도
  sigungu     text,                                 -- 시·군·구
  lat         numeric(9,6),
  lng         numeric(9,6),
  status      text not null default 'active'
                check (status in ('active','inactive','maintenance')),
  created_at  timestamptz not null default now()
);
create index on public.locations (org_id);
create index on public.locations (sido, sigungu);

-- 운영자 ↔ 담당 화장실 (operator 역할의 세부 스코프)
create table public.operator_locations (
  profile_id  uuid not null references public.profiles(id) on delete cascade,
  location_id uuid not null references public.locations(id) on delete cascade,
  primary key (profile_id, location_id)
);

-- 키오스크 단말. 익명 인증 사용자(auth_user_id)와 매핑.
create table public.devices (
  id           uuid primary key default gen_random_uuid(),
  location_id  uuid not null references public.locations(id) on delete cascade,
  label        text,
  pairing_code text not null unique,                -- 온보딩용 1회성 코드
  auth_user_id uuid unique references auth.users(id) on delete set null,
  claimed_at   timestamptz,
  last_seen_at timestamptz,
  status       text not null default 'active'
                check (status in ('active','inactive','retired')),
  created_at   timestamptz not null default now()
);
create index on public.devices (location_id);

-- 화장실별 설정(PIN·민원 카운터). 온보딩 트리거가 자동 생성.
create table public.location_settings (
  location_id   uuid primary key references public.locations(id) on delete cascade,
  pin_hash      text not null,            -- 현장 관리자 PIN (bcrypt)
  complaint_seq int  not null default 0,  -- 화장실별 민원 접수번호 카운터
  updated_at    timestamptz not null default now()
);
create trigger trg_location_settings_updated before update on public.location_settings
  for each row execute function public.set_updated_at();

-- ════════════════════════════════════════════════════════
--  운영 데이터 (전부 location_id 격리)
-- ════════════════════════════════════════════════════════

-- 비품 재고 (화장실 × 품목)
create table public.inventory (
  location_id uuid not null references public.locations(id) on delete cascade,
  item        text not null,                 -- 'sanitary_pad'
  label       text not null,
  quantity    int  not null default 0 check (quantity >= 0),
  capacity    int  not null default 30 check (capacity > 0),
  updated_at  timestamptz not null default now(),
  primary key (location_id, item)
);
create trigger trg_inventory_updated before update on public.inventory
  for each row execute function public.set_updated_at();

-- 환경 측정 시계열 — recorded_at 월 단위 RANGE 파티셔닝
create table public.env_readings (
  id           bigint generated always as identity,
  location_id  uuid not null references public.locations(id) on delete cascade,
  recorded_at  timestamptz not null default now(),
  temperature  numeric(4,1) not null,
  humidity     numeric(4,1) not null,
  ammonia_ppm  numeric(6,3) not null,
  pm25         numeric(5,1) not null,
  primary key (recorded_at, id)
) partition by range (recorded_at);
create index on public.env_readings (location_id, recorded_at desc);

-- 초기 파티션(이번 달 + 다음 달). 이후 유지보수는 cron 마이그레이션 참고.
do $$
declare s date := date_trunc('month', now())::date;
begin
  execute format('create table if not exists public.env_readings_%s partition of public.env_readings for values from (%L) to (%L)',
    to_char(s,'YYYYMM'), s, (s + interval '1 month')::date);
  execute format('create table if not exists public.env_readings_%s partition of public.env_readings for values from (%L) to (%L)',
    to_char((s + interval '1 month')::date,'YYYYMM'), (s + interval '1 month')::date, (s + interval '2 month')::date);
end $$;

-- 환경 최신값 캐시 (화장실당 1행, O(1) 조회 + Realtime)
create table public.env_latest (
  location_id uuid primary key references public.locations(id) on delete cascade,
  recorded_at timestamptz not null,
  temperature numeric(4,1) not null,
  humidity    numeric(4,1) not null,
  ammonia_ppm numeric(6,3) not null,
  pm25        numeric(5,1) not null
);

-- 생리용품 지급 로그
create table public.dispense_logs (
  id            bigint generated always as identity primary key,
  location_id   uuid not null references public.locations(id) on delete cascade,
  dispensed_at  timestamptz not null default now(),
  item          text not null default 'sanitary_pad',
  quantity      int  not null default 1,
  method        text not null default 'qr',
  status        text not null default 'completed'
);
create index on public.dispense_logs (location_id, dispensed_at desc);

-- 민원 (접수번호는 화장실별 유니크)
create table public.complaints (
  id              bigint generated always as identity primary key,
  location_id     uuid not null references public.locations(id) on delete cascade,
  reception_no    text not null,
  category        text not null,
  detail          text,
  location_label  text,
  status          text not null default 'received'
                    check (status in ('received','in_progress','done')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (location_id, reception_no)
);
create index on public.complaints (location_id, status, created_at desc);
create trigger trg_complaints_updated before update on public.complaints
  for each row execute function public.set_updated_at();

-- 만족도
create table public.satisfaction_responses (
  id          bigint generated always as identity primary key,
  location_id uuid not null references public.locations(id) on delete cascade,
  rating      int not null check (rating between 1 and 5),
  comment     text,
  created_at  timestamptz not null default now()
);
create index on public.satisfaction_responses (location_id, created_at desc);

-- 점검 내역 (공개 표시)
create table public.inspections (
  id            bigint generated always as identity primary key,
  location_id   uuid not null references public.locations(id) on delete cascade,
  category      text not null,
  title         text not null,
  status        text not null default 'done',
  inspector     text,
  inspected_at  timestamptz not null default now()
);
create index on public.inspections (location_id, inspected_at desc);

-- 안심 이벤트 로그 (운영자 전용)
create table public.safety_events (
  id          bigint generated always as identity primary key,
  location_id uuid not null references public.locations(id) on delete cascade,
  type        text not null,
  title       text not null,
  detail      text,
  status      text not null default 'normal'
                check (status in ('normal','resolved','confirmed')),
  occurred_at timestamptz not null default now()
);
create index on public.safety_events (location_id, occurred_at desc);

-- ════════════════════════════════════════════════════════
--  자동화 트리거
-- ════════════════════════════════════════════════════════

-- 화장실 신규 등록 시 설정·기본 재고 자동 프로비저닝 (확장 온보딩)
create or replace function public.provision_location()
returns trigger language plpgsql security definer
set search_path = public, extensions as $$
begin
  insert into location_settings (location_id, pin_hash, complaint_seq)
  values (new.id, extensions.crypt('1234', extensions.gen_salt('bf')), 0);
  insert into inventory (location_id, item, label, quantity, capacity)
  values (new.id, 'sanitary_pad', '생리용품', 0, 30);
  return new;
end; $$;
create trigger trg_provision_location after insert on public.locations
  for each row execute function public.provision_location();

-- env_readings INSERT → env_latest 최신값 동기화 (실센서/시뮬레이터 공통)
create or replace function public.sync_env_latest()
returns trigger language plpgsql as $$
begin
  insert into env_latest (location_id, recorded_at, temperature, humidity, ammonia_ppm, pm25)
  values (new.location_id, new.recorded_at, new.temperature, new.humidity, new.ammonia_ppm, new.pm25)
  on conflict (location_id) do update set
    recorded_at = excluded.recorded_at, temperature = excluded.temperature,
    humidity = excluded.humidity, ammonia_ppm = excluded.ammonia_ppm, pm25 = excluded.pm25
  where excluded.recorded_at >= env_latest.recorded_at;
  return null;
end; $$;
create trigger trg_sync_env_latest after insert on public.env_readings
  for each row execute function public.sync_env_latest();
