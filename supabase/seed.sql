-- 초기 데이터 (로컬 개발 / 데모용)
-- supabase db reset 시 자동 적용. 운영 DB 에는 PIN·페어링코드를 안전하게 별도 설정할 것.
-- locations INSERT 시 트리거가 location_settings(PIN 1234)·inventory 를 자동 생성한다.

do $$
declare
  v_org uuid;
  v_loc uuid;
  rec   record;
begin
  -- 지자체
  insert into organizations (code, name, type)
  values ('GG', '경기도', 'municipality')
  returning id into v_org;

  -- 샘플 화장실 3곳 (실제로는 1,000곳까지 동일 패턴으로 확장)
  for rec in
    select * from (values
      ('GG-SUWON-001', '중앙근린공원 공중화장실', '수원시', 12, 'PAIR-SUWON-001'),
      ('GG-SUWON-002', '팔달문 공영주차장 화장실', '수원시',  8, 'PAIR-SUWON-002'),
      ('GG-SEONGNAM-001', '율동공원 공중화장실',   '성남시',  5, 'PAIR-SEONGNAM-001')
    ) as t(code, name, sigungu, pad_qty, pairing)
  loop
    insert into locations (org_id, code, name, sido, sigungu, status)
    values (v_org, rec.code, rec.name, '경기도', rec.sigungu, 'active')
    returning id into v_loc;

    -- 재고 수량 반영 (행은 트리거가 이미 생성)
    update inventory set quantity = rec.pad_qty where location_id = v_loc and item = 'sanitary_pad';

    -- 키오스크 단말 (페어링 코드로 온보딩 대기)
    insert into devices (location_id, label, pairing_code)
    values (v_loc, rec.name || ' 입구 키오스크', rec.pairing);

    -- 환경 시드 1건 (시뮬레이터가 이 값을 기준으로 이어감 / env_latest 트리거 동기화)
    insert into env_readings (location_id, temperature, humidity, ammonia_ppm, pm25)
    values (v_loc, 24.7, 53.0, 0.02, 12.0);

    -- 점검 내역
    insert into inspections (location_id, category, title, status, inspector) values
      (v_loc, 'cleanliness', '바닥·세면대 청소 완료', 'done', '관리원 김'),
      (v_loc, 'facility',    '변기·수전 작동 점검',    'done', '관리원 김'),
      (v_loc, 'safety',      '비상벨·조명 작동 확인',  'done', '관리원 박'),
      (v_loc, 'supplies',    '화장지·세정제 보충',     'done', '관리원 박');

    -- 안심 이벤트
    insert into safety_events (location_id, type, title, detail, status, occurred_at) values
      (v_loc, 'emergency_bell', '안심 비상벨 호출',       '여성 3번 칸',               'resolved', now() - interval '2 hour'),
      (v_loc, 'spycam_scan',    '불법촬영(몰카) 탐지',     'RF·렌즈 상시 스캔 · 감지 0건', 'normal',  now() - interval '1 hour'),
      (v_loc, 'abnormal_sound', '디지털 이상음 감지',      '최근 7일 감지 0건',          'normal',  now() - interval '10 minute');

    -- 민원 샘플 3건 + 카운터 동기화
    insert into complaints (location_id, reception_no, category, detail, location_label, status) values
      (v_loc, '#0001', '청결', '세면대 주변 청결 요청', '세면대',      'done'),
      (v_loc, '#0002', '비품', '화장지 보충 요청',      '여성 칸',     'received'),
      (v_loc, '#0003', '고장', '여성 2번 칸 변기 고장',  '여성 2번 칸', 'in_progress');
    update location_settings set complaint_seq = 3 where location_id = v_loc;

    -- 만족도 샘플
    insert into satisfaction_responses (location_id, rating)
    select v_loc, r from unnest(array[5,4,5,5,4,5,4,5]) as r;
  end loop;
end $$;
