-- 전국 17개 광역 지자체(시·도) 등록. 경기도(GG)는 이미 있으면 스킵.
insert into public.organizations (code, name, type) values
  ('SEOUL',    '서울특별시',       'municipality'),
  ('BUSAN',    '부산광역시',       'municipality'),
  ('DAEGU',    '대구광역시',       'municipality'),
  ('INCHEON',  '인천광역시',       'municipality'),
  ('GWANGJU',  '광주광역시',       'municipality'),
  ('DAEJEON',  '대전광역시',       'municipality'),
  ('ULSAN',    '울산광역시',       'municipality'),
  ('SEJONG',   '세종특별자치시',   'municipality'),
  ('GG',       '경기도',           'municipality'),
  ('GANGWON',  '강원특별자치도',   'municipality'),
  ('CHUNGBUK', '충청북도',         'municipality'),
  ('CHUNGNAM', '충청남도',         'municipality'),
  ('JEONBUK',  '전북특별자치도',   'municipality'),
  ('JEONNAM',  '전라남도',         'municipality'),
  ('GYEONGBUK','경상북도',         'municipality'),
  ('GYEONGNAM','경상남도',         'municipality'),
  ('JEJU',     '제주특별자치도',   'municipality')
on conflict (code) do nothing;
