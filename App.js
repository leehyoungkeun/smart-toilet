// 스마트 공중화장실 키오스크 — 루트
// 가로형 태블릿 (Landscape) 기준. app.json 에서 orientation: "landscape" 권장.
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, StatusBar, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppHeader } from './ui';
import { colors, FONT } from './theme';
import { KioskProvider, useKiosk } from './context/KioskContext';
import PairingScreen from './screens/PairingScreen';
import HomeScreen from './screens/HomeScreen';
import SanitaryScreen from './screens/SanitaryScreen';
import EnvScreen from './screens/EnvScreen';
import InspectionScreen from './screens/InspectionScreen';
import ComplaintScreen from './screens/ComplaintScreen';
import SatisfactionScreen from './screens/SatisfactionScreen';
import GuideScreen from './screens/GuideScreen';
import AdminScreen from './screens/AdminScreen';

const pad = (n) => String(n).padStart(2, '0');
const DAYS = ['일', '월', '화', '수', '목', '금', '토'];

// 부팅 게이트: 세션/페어링 상태에 따라 화면 분기
export default function App() {
  return (
    <SafeAreaProvider>
      <KioskProvider>
        <Gate />
      </KioskProvider>
    </SafeAreaProvider>
  );
}

function Gate() {
  const { status, error, retry } = useKiosk();

  if (status === 'loading') {
    return (
      <View style={s.center}>
        <StatusBar hidden />
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={s.centerText}>연결 중…</Text>
      </View>
    );
  }
  if (status === 'error') {
    return (
      <View style={s.center}>
        <StatusBar hidden />
        <Text style={s.centerText}>{error || '연결에 실패했습니다.'}</Text>
        <TouchableOpacity onPress={retry} style={s.retryBtn}>
          <Text style={s.retryText}>다시 시도</Text>
        </TouchableOpacity>
      </View>
    );
  }
  if (status === 'pairing') {
    return (<><StatusBar hidden /><PairingScreen /></>);
  }
  return <Kiosk />;
}

// 무동작 자동 복귀 시간(ms): 점검은 3분, 나머지는 1분
const idleFor = (sc) => (sc === 'check' ? 180000 : 60000);

function Kiosk() {
  const { locationName } = useKiosk();
  const [screen, setScreen] = useState('home');
  const [now, setNow] = useState(new Date());
  const idleRef = useRef(null);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // 무동작 타이머: 홈이 아닐 때만 작동, 화면 전환/터치 시 리셋
  const resetIdle = useCallback((ms) => {
    if (idleRef.current) clearTimeout(idleRef.current);
    idleRef.current = setTimeout(() => setScreen('home'), ms);
  }, []);
  useEffect(() => {
    if (idleRef.current) clearTimeout(idleRef.current);
    if (screen !== 'home') resetIdle(idleFor(screen));
    return () => { if (idleRef.current) clearTimeout(idleRef.current); };
  }, [screen, resetIdle]);

  const time = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  const date = `${now.getFullYear()}.${pad(now.getMonth() + 1)}.${pad(now.getDate())} (${DAYS[now.getDay()]})`;

  const go = (s) => setScreen(s);
  const home = () => setScreen('home');

  return (
    <View style={s.root} onStartShouldSetResponderCapture={() => { if (screen !== 'home') resetIdle(idleFor(screen)); return false; }}>
      <StatusBar hidden />
      <AppHeader title={locationName} time={time} date={date} onBrandPress={home} onAdminPress={() => setScreen('admin')} />
      <View style={{ flex: 1 }}>
        {screen === 'home' && <HomeScreen go={go} />}
        {screen === 'sanitary' && <SanitaryScreen onBack={home} onHome={home} />}
        {screen === 'env' && <EnvScreen onBack={home} />}
        {screen === 'check' && <InspectionScreen onBack={home} />}
        {screen === 'civil' && <ComplaintScreen onBack={home} onHome={home} />}
        {screen === 'satis' && <SatisfactionScreen onBack={home} onHome={home} />}
        {screen === 'guide' && <GuideScreen onBack={home} />}
        {screen === 'admin' && <AdminScreen onExit={home} />}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg, gap: 16 },
  centerText: { fontSize: 18, color: colors.muted, fontFamily: FONT, textAlign: 'center', paddingHorizontal: 40 },
  retryBtn: { backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 30 },
  retryText: { color: '#fff', fontSize: 18, fontWeight: '700', fontFamily: FONT },
});
