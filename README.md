# 스마트 공중화장실 키오스크 — React Native

가로형(Landscape) 벽면 태블릿 키오스크 앱. HTML 디자인 프로토타입(`스마트 공중화장실 키오스크.dc.html`)을 React Native로 1:1 이식한 소스입니다.

## 구성 기능
- **무상 생리용품 지급** — QR 인증 → 인증중 → 지급중 → 완료 플로우 (`SanitaryScreen`)
- **실시간 환경 모니터링** — 온도·습도·암모니아·미세먼지 게이지 (`EnvScreen`)
- **디지털 점검 현황** — 청결·시설·안전·비품 점검 내역 (`InspectionScreen`)
- **민원 접수** — 유형 선택 → 접수번호 발급 (`ComplaintScreen`)
- **만족도 조사** — 5단계 이모지 평가 (`SatisfactionScreen`)
- **이용 안내** — 운영정보·시설·안심시설·생리용품 (`GuideScreen`)
- **관리자 화면** — 헤더 우측 ⚙ 버튼 → PIN 인증(데모 `1234`) → 대시보드: KPI·환경 알람·안심 이벤트 로그·민원 처리·재고 관리 (`AdminScreen`)

> **키오스크 레이아웃**: 글씨는 멀리서도 읽히도록 크게(약 1.34배) 키웠고, 각 화면은 스크롤 없이 한 화면(가로 태블릿)에 꽉 차도록 flex로 구성했습니다. 실제 기기 해상도에 맞춰 폰트/여백을 미세 조정하세요.

> **하드웨어 기능**: 안심 비상벨 · 디지털 이상음(귀) 감지 · 외부 AI CCTV 연계는 태블릿 메뉴가 아니라
> 홈의 "안심 모드" 띠와 이용안내의 '안심 시설' 카드에 상시 안내 형태로 표시됩니다. 실제 동작은 네이티브/백엔드 연동으로 구현하세요.

## 설치 (Expo 기준)
```bash
npx create-expo-app smart-toilet --template blank
cd smart-toilet
# 이 폴더(react-native/)의 파일들을 프로젝트 루트로 복사
npx expo install react-native-svg expo-linear-gradient
npx expo start
```

### 필수 의존성
- `react-native-svg` — 아이콘 렌더링 (`icons.js`)
- `expo-linear-gradient` — 헤더/주요 카드 그라데이션
- (선택) `expo-font` + Pretendard `.ttf` — `theme.js`의 `FONT = 'Pretendard'` 적용. 미설치 시 시스템 폰트로 자동 대체됩니다.

### 가로 고정
`app.json`:
```json
{ "expo": { "orientation": "landscape" } }
```

## 파일 구조
```
App.js                     루트 — 상태 기반 화면 전환 + 실시간 시계
theme.js                   색상·간격·그림자 토큰
icons.js                   react-native-svg 아이콘 세트
ui.js                      공용 컴포넌트 (헤더, 뒤로가기, 배지, 카드, 안심 점)
screens/
  HomeScreen.js            홈 (환경상태 + 기능 그리드 + 안심 띠)
  SanitaryScreen.js        무상 생리용품 지급
  EnvScreen.js             환경 모니터링
  InspectionScreen.js      디지털 점검 현황
  ComplaintScreen.js       민원 접수
  SatisfactionScreen.js    만족도 조사
  GuideScreen.js           이용 안내
  AdminScreen.js           관리자 (PIN 인증 + 대시보드)
```

## 다음 단계 (실데이터 연동 지점)
- `EnvScreen` / `HomeScreen`의 환경 값 → IoT 센서 API로 교체 (현재 더미값)
- `SanitaryScreen`의 `start()` 타이머 → 실제 QR 인증·지급기 제어 모듈로 교체
- `ComplaintScreen` 제출 → 통합관제 플랫폼 민원 API 연동, 접수번호 서버 발급
- `InspectionScreen` 점검 내역 → 디지털 점검부 데이터 바인딩
- 화면 전환을 `@react-navigation/native`로 바꾸면 라우팅/딥링크 관리가 쉬워집니다 (현재는 단순 `useState`).

## 참고
- 기능 그리드 셀 폭은 `HomeScreen.js`의 `gridCellWrap: { width: '31.7%' }`에서 조정합니다(3열 기준). 태블릿 해상도에 맞춰 미세 조정하세요.
- RN의 `gap` 스타일은 0.71+ 에서 지원됩니다. 구버전이면 margin으로 대체하세요.
