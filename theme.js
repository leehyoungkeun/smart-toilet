// 스마트 공중화장실 키오스크 — 디자인 토큰
// 가로형 태블릿 키오스크 (1280 x 800 기준)

export const colors = {
  bg: '#EAF0F9',
  card: '#FFFFFF',
  primary: '#2C6CD0',
  primaryDark: '#1A4AA0',
  headerFrom: '#15408F',
  headerTo: '#2C6CD0',
  text: '#16223C',
  muted: '#6B7A95',
  subtle: '#8492AB',
  tintBg: '#E8F1FF',
  tintBgSoft: '#F0F6FF',
  greenText: '#138A55',
  greenDeep: '#0F7A48',
  greenBg: '#E4F6EC',
  greenBorder: '#CDEBD9',
  danger: '#E0322F',
  border: '#ECF1F9',
  borderStrong: '#E2E9F4',
  borderBlue: '#DCE8FA',
  divider: '#F0F3F9',
  disabledBg: '#D7DEEA',
  disabledText: '#9AA7BD',
  pulse: '#46E08B',
};

export const radius = {
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  pill: 999,
};

export const space = {
  xs: 4,
  s: 8,
  m: 12,
  l: 16,
  xl: 20,
  xxl: 24,
  xxxl: 30,
};

// RN 그림자 헬퍼 (iOS shadow + Android elevation)
export const shadow = (elevation = 4, opacity = 0.06) => ({
  shadowColor: '#15376E',
  shadowOffset: { width: 0, height: elevation / 2 },
  shadowOpacity: opacity,
  shadowRadius: elevation,
  elevation,
});

export const FONT = 'Pretendard'; // expo-font 로 Pretendard 로드 권장 (없으면 시스템 폰트)
