// 무상 생리용품 지급 — 실제 QR 세션
// 키오스크가 세션 생성 → QR 표시 → 폰이 스캔/동의 → Realtime 으로 지급중 → 완료
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Animated, Easing, ActivityIndicator } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import Icon from '../icons';
import { BackHeader } from '../ui';
import { colors, radius, shadow, FONT } from '../theme';
import { createDispenseSession, subscribeDispenseSession, claimUrl } from '../lib/api';
import * as hardware from '../lib/hardware';

export default function SanitaryScreen({ onBack, onHome }) {
  const [step, setStep] = useState('loading'); // loading | scan | dispensing | done | error
  const [token, setToken] = useState(null);
  const [errMsg, setErrMsg] = useState('');
  const unsub = useRef(null);
  const timer = useRef(null);

  const cleanup = () => {
    if (unsub.current) { unsub.current(); unsub.current = null; }
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
  };

  const begin = async () => {
    cleanup();
    setStep('loading'); setErrMsg('');
    try {
      const { session_id, token } = await createDispenseSession();
      setToken(token);
      setStep('scan');
      unsub.current = subscribeDispenseSession(session_id, (row) => {
        if (row.status === 'dispensed') {
          setStep('dispensing');
          // 하드웨어(NUC120)에 배출 명령 → 릴레이/모터 구동. Expo Go/미연결이면 즉시 성공(no-op).
          const started = Date.now();
          hardware.dispense().catch(() => {}).finally(() => {
            const wait = Math.max(0, 1600 - (Date.now() - started)); // '지급중' 최소 노출
            timer.current = setTimeout(() => setStep('done'), wait);
          });
        }
      });
    } catch (e) {
      setErrMsg('세션을 시작할 수 없습니다. 다시 시도해 주세요.');
      setStep('error');
    }
  };

  useEffect(() => { begin(); return cleanup; }, []);

  const url = token ? claimUrl(token) : '';

  return (
    <ScrollView contentContainerStyle={{ padding: 24, paddingHorizontal: 30 }}>
      <BackHeader title="무상 생리용품" subtitle="여성·청소년 누구나 1일 1회 무료로 제공됩니다" onBack={onBack} />

      {step === 'loading' && (
        <Center><Spinner /><Text style={s.bigTitle}>준비 중입니다</Text><Text style={s.bigSub}>잠시만 기다려 주세요</Text></Center>
      )}

      {step === 'error' && (
        <Center pad={56}>
          <View style={[s.dispenseIcon, { backgroundColor: '#FBE3E3' }]}><Icon name="message" size={40} color={colors.danger} /></View>
          <Text style={s.bigTitle}>{errMsg}</Text>
          <TouchableOpacity activeOpacity={0.9} onPress={begin} style={[s.cta, { paddingHorizontal: 44, marginTop: 24 }]}>
            <Text style={s.ctaText}>다시 시도</Text>
          </TouchableOpacity>
        </Center>
      )}

      {step === 'scan' && (
        <View style={{ flexDirection: 'row', gap: 20 }}>
          <View style={[s.card, { flex: 1, alignItems: 'center', padding: 32 }]}>
            <QrBox url={url} />
            <Text style={s.scanTitle}>스마트폰으로 QR 코드를 스캔하세요</Text>
            <Text style={s.scanDesc}>카메라 앱으로 QR을 비추면 안내 페이지가 열립니다{'\n'}동의 후 생리용품이 지급됩니다</Text>
            <TouchableOpacity activeOpacity={0.8} onPress={begin} style={s.refreshBtn}>
              <Text style={s.refreshText}>QR 새로고침</Text>
            </TouchableOpacity>
          </View>
          <View style={[s.card, { width: 380, padding: 28 }]}>
            <Text style={s.stepsTitle}>이용 방법</Text>
            <StepRow n="1" title="QR 코드 스캔" sub="스마트폰 카메라로 스캔" />
            <StepRow n="2" title="대상 확인·동의" sub="안내 페이지에서 동의" />
            <StepRow n="3" title="생리용품 수령" sub="하단 지급구에서 수령" />
            <View style={s.stockNote}><Text style={s.stockNoteText}>QR은 약 3분간 유효합니다</Text></View>
          </View>
        </View>
      )}

      {step === 'dispensing' && (
        <Center>
          <View style={s.dispenseIcon}><Icon name="dispense" size={40} color={colors.primary} /></View>
          <Text style={s.bigTitle}>생리용품을 지급하고 있습니다</Text>
          <Text style={s.bigSub}>하단 지급구를 확인해 주세요</Text>
        </Center>
      )}

      {step === 'done' && (
        <Center pad={56}>
          <View style={s.checkCircle}><Icon name="check" size={48} color={colors.greenText} strokeWidth={2.4} /></View>
          <Text style={[s.bigTitle, { fontSize: 32 }]}>지급이 완료되었습니다</Text>
          <Text style={s.bigSub}>건강하고 편안한 하루 되세요</Text>
          <View style={s.doneNote}><Text style={s.doneNoteText}>오늘 제공: 생리대 1팩 · 1일 1회 완료</Text></View>
          <TouchableOpacity activeOpacity={0.9} onPress={onHome} style={[s.cta, { paddingHorizontal: 44, marginTop: 26 }]}>
            <Text style={s.ctaText}>처음으로</Text>
          </TouchableOpacity>
        </Center>
      )}
    </ScrollView>
  );
}

function Center({ children, pad = 64 }) {
  return <View style={[s.card, { alignItems: 'center', padding: pad }]}>{children}</View>;
}

function StepRow({ n, title, sub }) {
  return (
    <View style={s.step}>
      <View style={s.stepNum}><Text style={s.stepNumText}>{n}</Text></View>
      <View>
        <Text style={s.stepTitle}>{title}</Text>
        <Text style={s.stepSub}>{sub}</Text>
      </View>
    </View>
  );
}

function Spinner() {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(Animated.timing(a, { toValue: 1, duration: 900, easing: Easing.linear, useNativeDriver: true })).start();
  }, [a]);
  const rotate = a.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  return <Animated.View style={[s.spinner, { transform: [{ rotate }] }]} />;
}

// 실제 QR + 코너 프레임
function QrBox({ url }) {
  return (
    <View style={s.scanBox}>
      {[['tl', 0, 0], ['tr', 0, 1], ['bl', 1, 0], ['br', 1, 1]].map(([k, b, r]) => (
        <View key={k} style={[s.corner, b ? { bottom: 16 } : { top: 16 }, r ? { right: 16 } : { left: 16 },
          { borderTopWidth: b ? 0 : 4, borderBottomWidth: b ? 4 : 0, borderLeftWidth: r ? 0 : 4, borderRightWidth: r ? 4 : 0 }]} />
      ))}
      {url ? (
        <View style={s.qrInner}><QRCode value={url} size={196} backgroundColor="#fff" color={colors.text} /></View>
      ) : (
        <ActivityIndicator color={colors.primary} />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, ...shadow(16, 0.06) },
  scanBox: { width: 272, height: 272, borderRadius: radius.xl, backgroundColor: '#F3F7FD', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  qrInner: { padding: 14, backgroundColor: '#fff', borderRadius: 12 },
  corner: { position: 'absolute', width: 34, height: 34, borderColor: colors.primary, zIndex: 2 },
  scanTitle: { fontSize: 25, fontWeight: '700', color: colors.text, marginTop: 24, fontFamily: FONT },
  scanDesc: { fontSize: 19, color: colors.muted, marginTop: 6, textAlign: 'center', lineHeight: 24, fontFamily: FONT },
  refreshBtn: { marginTop: 16, paddingVertical: 8, paddingHorizontal: 18, borderRadius: radius.pill, backgroundColor: colors.tintBg },
  refreshText: { fontSize: 16, fontWeight: '600', color: colors.primary, fontFamily: FONT },

  stepsTitle: { fontSize: 24, fontWeight: '700', color: colors.text, marginBottom: 18, fontFamily: FONT },
  step: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, marginBottom: 18 },
  stepNum: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  stepNumText: { color: '#fff', fontWeight: '700', fontFamily: FONT },
  stepTitle: { fontSize: 21, fontWeight: '600', color: colors.text, fontFamily: FONT },
  stepSub: { fontSize: 18, color: colors.muted, marginTop: 2, fontFamily: FONT },
  stockNote: { backgroundColor: colors.tintBgSoft, borderRadius: 14, padding: 14, marginTop: 4 },
  stockNoteText: { fontSize: 18, color: colors.primary, fontWeight: '600', fontFamily: FONT },

  cta: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 18, alignItems: 'center', ...shadow(16, 0.28) },
  ctaText: { color: '#fff', fontSize: 24, fontWeight: '700', fontFamily: FONT },

  spinner: { width: 72, height: 72, borderRadius: 36, borderWidth: 6, borderColor: '#E3ECF8', borderTopColor: colors.primary },
  dispenseIcon: { width: 72, height: 72, borderRadius: 18, backgroundColor: colors.tintBg, alignItems: 'center', justifyContent: 'center' },
  checkCircle: { width: 88, height: 88, borderRadius: 44, backgroundColor: colors.greenBg, alignItems: 'center', justifyContent: 'center' },
  bigTitle: { fontSize: 29, fontWeight: '700', color: colors.text, marginTop: 24, fontFamily: FONT, textAlign: 'center' },
  bigSub: { fontSize: 20, color: colors.muted, marginTop: 8, fontFamily: FONT, textAlign: 'center' },
  doneNote: { backgroundColor: colors.tintBgSoft, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 22, marginTop: 22 },
  doneNoteText: { fontSize: 19, fontWeight: '600', color: colors.primary, fontFamily: FONT },
});
