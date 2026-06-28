// 무상 생리용품 지급 — QR 인증 → 인증중 → 지급중 → 완료
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Animated, Easing } from 'react-native';
import Icon from '../icons';
import { BackHeader } from '../ui';
import { colors, radius, shadow, FONT } from '../theme';

export default function SanitaryScreen({ onBack, onHome }) {
  const [step, setStep] = useState(0); // 0 안내, 1 인증중, 2 지급중, 3 완료
  const t1 = useRef(null);
  const t2 = useRef(null);

  const start = () => {
    setStep(1);
    clearTimeout(t1.current); clearTimeout(t2.current);
    t1.current = setTimeout(() => setStep(2), 1600);
    t2.current = setTimeout(() => setStep(3), 3400);
  };
  useEffect(() => () => { clearTimeout(t1.current); clearTimeout(t2.current); }, []);

  return (
    <ScrollView contentContainerStyle={{ padding: 24, paddingHorizontal: 30 }}>
      <BackHeader title="무상 생리용품" subtitle="여성·청소년 누구나 1일 1회 무료로 제공됩니다" onBack={onBack} />

      {step === 0 && (
        <View style={{ flexDirection: 'row', gap: 20 }}>
          <View style={[s.card, { flex: 1, alignItems: 'center', padding: 32 }]}>
            <ScanFrame />
            <Text style={s.scanTitle}>스마트폰으로 QR 코드를 스캔하세요</Text>
            <Text style={s.scanDesc}>카메라 앱을 열고 화면의 QR 코드를 비추면{'\n'}본인 인증이 자동으로 진행됩니다</Text>
          </View>
          <View style={[s.card, { width: 380, padding: 28 }]}>
            <Text style={s.stepsTitle}>이용 방법</Text>
            <Step n="1" title="QR 코드 스캔" sub="스마트폰 카메라로 인증" />
            <Step n="2" title="본인 인증" sub="지원 대상 자동 확인" />
            <Step n="3" title="생리용품 수령" sub="하단 지급구에서 수령" />
            <View style={s.stockNote}><Text style={s.stockNoteText}>재고 충분 · 오늘 12개 지급 가능</Text></View>
            <TouchableOpacity activeOpacity={0.9} onPress={start} style={s.cta}>
              <Text style={s.ctaText}>QR 인증 시작</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {step === 1 && (
        <Center>
          <Spinner />
          <Text style={s.bigTitle}>본인 인증 중입니다</Text>
          <Text style={s.bigSub}>잠시만 기다려 주세요</Text>
        </Center>
      )}

      {step === 2 && (
        <Center>
          <View style={s.dispenseIcon}><Icon name="dispense" size={40} color={colors.primary} /></View>
          <Text style={s.bigTitle}>생리용품을 지급하고 있습니다</Text>
          <Text style={s.bigSub}>하단 지급구를 확인해 주세요</Text>
        </Center>
      )}

      {step === 3 && (
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

function Step({ n, title, sub }) {
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

function ScanFrame() {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(a, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(a, { toValue: 0, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ])).start();
  }, [a]);
  const translateY = a.interpolate({ inputRange: [0, 1], outputRange: [22, 230] });
  return (
    <View style={s.scanBox}>
      {[['tl',0,0],['tr',0,1],['bl',1,0],['br',1,1]].map(([k, b, r]) => (
        <View key={k} style={[s.corner, b ? { bottom: 16 } : { top: 16 }, r ? { right: 16 } : { left: 16 },
          { borderTopWidth: b ? 0 : 4, borderBottomWidth: b ? 4 : 0, borderLeftWidth: r ? 0 : 4, borderRightWidth: r ? 4 : 0 }]} />
      ))}
      <Icon name="qr" size={150} color="#B8C8E0" strokeWidth={1.6} />
      <Animated.View style={[s.scanLine, { transform: [{ translateY }] }]} />
    </View>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, ...shadow(16, 0.06) },
  scanBox: { width: 272, height: 272, borderRadius: radius.xl, backgroundColor: '#F3F7FD', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  corner: { position: 'absolute', width: 34, height: 34, borderColor: colors.primary },
  scanLine: { position: 'absolute', left: 24, right: 24, height: 3, backgroundColor: colors.primary, borderRadius: 2, opacity: 0.85 },
  scanTitle: { fontSize: 25, fontWeight: '700', color: colors.text, marginTop: 24, fontFamily: FONT },
  scanDesc: { fontSize: 19, color: colors.muted, marginTop: 6, textAlign: 'center', lineHeight: 21, fontFamily: FONT },

  stepsTitle: { fontSize: 24, fontWeight: '700', color: colors.text, marginBottom: 18, fontFamily: FONT },
  step: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, marginBottom: 18 },
  stepNum: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  stepNumText: { color: '#fff', fontWeight: '700', fontFamily: FONT },
  stepTitle: { fontSize: 21, fontWeight: '600', color: colors.text, fontFamily: FONT },
  stepSub: { fontSize: 18, color: colors.muted, marginTop: 2, fontFamily: FONT },
  stockNote: { backgroundColor: colors.tintBgSoft, borderRadius: 14, padding: 14, marginBottom: 18 },
  stockNoteText: { fontSize: 18, color: colors.primary, fontWeight: '600', fontFamily: FONT },

  cta: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 18, alignItems: 'center', ...shadow(16, 0.28) },
  ctaText: { color: '#fff', fontSize: 24, fontWeight: '700', fontFamily: FONT },

  spinner: { width: 72, height: 72, borderRadius: 36, borderWidth: 6, borderColor: '#E3ECF8', borderTopColor: colors.primary },
  dispenseIcon: { width: 72, height: 72, borderRadius: 18, backgroundColor: colors.tintBg, alignItems: 'center', justifyContent: 'center' },
  checkCircle: { width: 88, height: 88, borderRadius: 44, backgroundColor: colors.greenBg, alignItems: 'center', justifyContent: 'center' },
  bigTitle: { fontSize: 29, fontWeight: '700', color: colors.text, marginTop: 24, fontFamily: FONT },
  bigSub: { fontSize: 20, color: colors.muted, marginTop: 8, fontFamily: FONT },
  doneNote: { backgroundColor: colors.tintBgSoft, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 22, marginTop: 22 },
  doneNoteText: { fontSize: 19, fontWeight: '600', color: colors.primary, fontFamily: FONT },
});
