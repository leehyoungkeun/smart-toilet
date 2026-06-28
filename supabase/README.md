# Supabase 백엔드 — 지자체 공중화장실 서비스 플랫폼

멀티테넌트 설계. 여러 **지자체**가 각자 다수의 **화장실**을 운영하고, 화장실마다 1대 이상의 **키오스크**가 붙는다. 1,000+ 화장실 확장 대비.

```
organizations (지자체)
   └─ locations (화장실)            ← 모든 운영 데이터의 테넌트 키(location_id)
        ├─ devices (키오스크)        ← 익명 인증 사용자에 매핑
        ├─ location_settings (PIN·민원카운터)
        ├─ inventory / env_latest
        └─ env_readings · dispense_logs · complaints · satisfaction_responses · inspections · safety_events
profiles (운영자) ─ operator_locations (담당 화장실)
```

## 멀티테넌시 & 인증

모든 접근 주체는 Supabase Auth 사용자다.

- **키오스크** = 익명 로그인(anonymous sign-in) 사용자. `devices.auth_user_id` 로 **정확히 한 화장실**에 매핑.
- **운영자** = `profiles.role`: `platform_admin`(전체) / `org_admin`(지자체 단위) / `operator`(배정된 화장실).

접근 가능 화장실 판정은 `can_access_location(location_id)` **한 함수**로 통일 → 모든 운영 테이블에 동일 정책 적용. 키오스크는 자기 화장실만, 운영자는 권한 범위만 보인다.

### 키오스크 온보딩 (페어링)
1. 단말 첫 부팅 → **익명 로그인**으로 `auth.uid()` 확보(기기에 세션 영구 저장).
2. 운영자가 미리 만든 `devices.pairing_code` 를 단말에 입력 → `claim_device(code)` 호출.
3. 이후 단말의 모든 요청은 `current_location()` 으로 자기 화장실로 자동 스코핑.

> 키오스크는 **location_id 를 직접 보내지 않는다.** 민원/지급/만족도 RPC가 서버에서 `current_location()` 으로 결정 → 단말이 남의 화장실 데이터를 위조 불가.

## 데이터 규모 (1,000곳)

- 환경 측정 = 1,000곳 × 1분 = **하루 144만 행**. `env_readings` 를 `recorded_at` **월 파티셔닝**, `maintain_env_partitions()`(매일 cron)이 다음 달 파티션 선생성 + 보관 6개월 경과분 삭제.
- 키오스크/콘솔 화면은 원시 시계열 대신 **`env_latest`(화장실당 1행)** 만 읽는다(O(1)). `env_readings` INSERT 시 트리거가 자동 동기화 → 실센서든 시뮬레이터든 소스 무관.
- Realtime 은 `env_latest`만 구독(원시 시계열 제외)해서 부하 억제.

## 자동 온보딩 (확장성)

`locations` INSERT → 트리거 `provision_location()` 가 그 화장실의 `location_settings`(PIN 기본 1234)·`inventory`(생리용품 0/30)를 자동 생성. 화장실 1곳 추가 = INSERT 한 줄.

## RPC

| 함수 | 호출자 | 설명 |
|------|--------|------|
| `claim_device(code)` | 키오스크 | 페어링 코드로 단말↔화장실 연결 |
| `submit_complaint(category, detail, location_label)` | 키오스크 | 화장실별 접수번호 발급 |
| `dispense_sanitary()` | 키오스크 | 재고 원자적 −1 + 지급 로그 |
| `submit_satisfaction(rating, comment)` | 키오스크 | 만족도 제출 |
| `verify_admin_pin(pin)` | 키오스크 | 현장 관리자 PIN 검증 |
| `admin_dashboard(pin)` | 키오스크 | 자기 화장실 KPI + 최근 민원/안심 로그 |
| `admin_set_inventory(pin, qty)` | 키오스크 | 재고 설정 |
| `admin_update_complaint(pin, id, status)` | 키오스크 | 민원 상태 변경 |

> 운영자 **중앙 콘솔**(웹)은 Supabase Auth 로그인 후 RLS 로 스코핑된 테이블을 직접 쿼리한다(별도 PIN 불필요). 키오스크 현장 관리자만 PIN 게이트를 쓴다.

## 적용 방법

### A. Supabase CLI (권장)
```bash
supabase init
supabase link --project-ref <YOUR_PROJECT_REF>
supabase start
supabase db reset      # migrations + seed.sql
supabase db push       # 원격 반영
```
익명 로그인 사용 → Dashboard > Authentication > Providers 에서 **Anonymous sign-ins** 활성화.

### B. 대시보드 SQL 에디터
`migrations/` 를 번호 순서대로 실행 후 `seed.sql`. `pg_cron` 은 Extensions 에서 먼저 활성화.

## 운영 단계 보안 체크리스트
- 화장실별 PIN(기본 1234)을 온보딩 시 변경 강제.
- `pairing_code` 는 1회성·만료 처리(현재는 미사용 코드면 영구 유효).
- 익명 단말 세션 탈취 대비: 단말 분실 시 `devices.auth_user_id` 초기화 → 재페어링.
- 운영자 RLS 는 `profiles`/`operator_locations` 데이터 무결성에 의존 → 계정 관리 콘솔에서만 변경.

## 다음 단계 (앱 연동)
1. `package.json` / `app.json`(`orientation: landscape`) + `@supabase/supabase-js` 설치
2. `lib/supabase.js` — anon 키 클라이언트 + 부팅 시 익명 로그인 + (최초) `claim_device`
3. 화면별 더미 → 쿼리/RPC/Realtime 로 교체 (Home/Env: `env_latest` 구독, Sanitary: `dispense_sanitary`, …)
4. (별도) 운영자 중앙 콘솔(웹) — 지자체/화장실 관리·민원 처리·KPI 집계
