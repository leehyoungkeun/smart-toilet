// 디지털 점검 현황 — 청결·시설·안전·비품 점검 내역 + QR 청소·점검 인증
import React, { useState, useRef, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, StyleSheet, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from '../icons';
import { BackHeader, Badge } from '../ui';
import { colors, radius, FONT } from '../theme';

const ITEMS = [
  { icon: 'home', title: '청결 점검', sub: '바닥·변기·세면대 청소 · 담당 김민수', time: '09:20' },
  { icon: 'wrench', title: '시설 점검', sub: '수전·배수·도어 잠금 상태 · 담당 김민수', time: '09:25' },
  { icon: 'shieldPlain', title: '안전·설비 점검', sub: '비상벨·조명·환기·센서 동작 · 담당 박지영', time: '09:30' },
  { icon: 'bag', title: '비품 점검', sub: '생리용품·화장지·손비누 재고 충분', time: '09:32' },
];

const now = () => { const n = new Date(); const p = (x) => String(x).padStart(2, '0'); return p(n.getHours()) + ':' + p(n.getMinutes()); };

export default function InspectionScreen({ onBack }) {
  const [step, setStep] = useState(0); // 0 닫힘, 1 스캔, 2 인증중, 3 완료
  const [certified, setCertified] = useState(false);
  const [certTime, setCertTime] = useState('');
  const timer = useRef(null);

  const start = () => {
    setStep(2);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => { setStep(3); setCertified(true); setCertTime(now()); }, 1700);
  };
  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 18, paddingHorizontal: 28 }}>
        <BackHeader title="화장실 점검" subtitle="오늘 진행된 청소·점검 내역입니다 · 1일 4회 점검" onBack={onBack} />

        <LinearGradient colors={['#E4F6EC', '#EFFaF3']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.summary}>
          <View style={s.summaryIcon}><Icon name="check" size={26} color="#fff" strokeWidth={2.4} /></View>
          <View style={{ flex: 1 }}>
            <Text style={s.summaryTitle}>현재 화장실 상태 — 정상</Text>
            <Text style={s.summarySub}>오늘 예정된 모든 점검이 정상 완료되었습니다</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={s.summaryMeta}>최근 점검</Text>
            <Text style={s.summaryTime}>{certified ? certTime : '09:32'}</Text>
          </View>
        </LinearGradient>

        <View style={{ gap: 12 }}>
          {certified && (
            <View style={[s.row, { backgroundColor: '#EAF2FE', borderColor: '#CFE0F8' }]}>
              <View style={[s.rowIcon, { backgroundColor: colors.primary }]}><Icon name="qr" size={22} color="#fff" /></View>
              <View style={{ flex: 1 }}>
                <Text style={s.rowTitle}>청소·점검 인증 (관리자)</Text>
                <Text style={s.rowSub}>QR 사원증 인증 완료 · 현장 점검 확인</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <View style={{ backgroundColor: '#E3EDFB', borderRadius: radius.pill, paddingVertical: 5, paddingHorizontal: 12 }}><Text style={{ color: colors.primary, fontWeight: '700', fontSize: 16, fontFamily: FONT }}>인증 완료</Text></View>
                <Text style={s.rowTime}>{certTime}</Text>
              </View>
            </View>
          )}
          {ITEMS.map((it) => (
            <View key={it.title} style={s.row}>
              <View style={s.rowIcon}><Icon name={it.icon} size={22} color={colors.primary} /></View>
              <View style={{ flex: 1 }}>
                <Text style={s.rowTitle}>{it.title}</Text>
                <Text style={s.rowSub}>{it.sub}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Badge label="완료" />
                <Text style={s.rowTime}>{it.time}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={s.footRow}>
          <Text style={s.foot}>다음 점검 예정 <Text style={{ color: colors.primary, fontWeight: '700' }}>14:00</Text> · 결과는 통합관제센터로 자동 전송됩니다</Text>
          <TouchableOpacity activeOpacity={0.9} onPress={() => setStep(1)} style={s.certBtn}>
            <Icon name="qr" size={24} color="#fff" />
            <Text style={s.certBtnText}>QR로 청소·점검 인증</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal visible={step > 0} transparent animationType="fade" onRequestClose={() => setStep(0)}>
        <View style={s.backdrop}>
          <View style={s.modalCard}>
            {step === 1 && (
              <>
                <Text style={s.modalTitle}>관리자 점검 인증</Text>
                <Text style={s.modalSub}>청소·점검 완료 후 관리자 QR(사원증)을 스캔해 주세요</Text>
                <ScanBox />
                <View style={{ flexDirection: 'row', gap: 12, marginTop: 26 }}>
                  <TouchableOpacity onPress={() => setStep(0)} style={[s.mBtn, s.mBtnGhost, { flex: 1 }]}><Text style={s.mBtnGhostText}>취소</Text></TouchableOpacity>
                  <TouchableOpacity onPress={start} style={[s.mBtn, s.mBtnPrimary, { flex: 2 }]}><Text style={s.mBtnPrimaryText}>QR 인증 시작</Text></TouchableOpacity>
                </View>
              </>
            )}
            {step === 2 && (
              <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                <Spinner />
                <Text style={s.modalTitle2}>점검 내역을 인증하는 중입니다</Text>
                <Text style={s.modalSub}>잠시만 기다려 주세요</Text>
              </View>
            )}
            {step === 3 && (
              <View style={{ paddingVertical: 8, alignItems: 'center' }}>
                <View style={s.doneCircle}><Icon name="check" size={46} color="#1FA463" strokeWidth={2.4} /></View>
                <Text style={s.modalTitle2}>청소·점검이 인증되었습니다</Text>
                <Text style={s.modalSub}>{certTime} 인증 · 통합관제센터로 전송 완료</Text>
                <TouchableOpacity onPress={() => setStep(0)} style={[s.mBtn, s.mBtnPrimary, { marginTop: 24, paddingHorizontal: 44 }]}><Text style={s.mBtnPrimaryText}>확인</Text></TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

function Spinner() {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.loop(Animated.timing(a, { toValue: 1, duration: 900, easing: Easing.linear, useNativeDriver: true })).start(); }, [a]);
  const rotate = a.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  return <Animated.View style={[s.spinner, { transform: [{ rotate }] }]} />;
}

function ScanBox() {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(a, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(a, { toValue: 0, duration: 1100, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ])).start();
  }, [a]);
  const translateY = a.interpolate({ inputRange: [0, 1], outputRange: [18, 180] });
  return (
    <View style={s.scanBox}>
      {[['t','l'],['t','r'],['b','l'],['b','r']].map(([v, h]) => (
        <View key={v + h} style={[s.corner, v === 'b' ? { bottom: 14 } : { top: 14 }, h === 'r' ? { right: 14 } : { left: 14 },
          { borderTopWidth: v === 'b' ? 0 : 4, borderBottomWidth: v === 'b' ? 4 : 0, borderLeftWidth: h === 'r' ? 0 : 4, borderRightWidth: h === 'r' ? 4 : 0 }]} />
      ))}
      <Icon name="qr" size={110} color="#B8C8E0" strokeWidth={1.6} />
      <Animated.View style={[s.scanLine, { transform: [{ translateY }] }]} />
    </View>
  );
}

const s = StyleSheet.create({
  summary: { borderRadius: radius.lg, borderWidth: 1, borderColor: colors.greenBorder, padding: 14, paddingHorizontal: 24, flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 14 },
  summaryIcon: { width: 48, height: 48, borderRadius: 14, backgroundColor: '#1FA463', alignItems: 'center', justifyContent: 'center' },
  summaryTitle: { fontSize: 25, fontWeight: '700', color: colors.greenDeep, fontFamily: FONT },
  summarySub: { fontSize: 19, color: '#3C7A5A', marginTop: 2, fontFamily: FONT },
  summaryMeta: { fontSize: 17, color: '#3C7A5A', fontFamily: FONT },
  summaryTime: { fontSize: 24, fontWeight: '700', color: colors.greenDeep, fontFamily: FONT },

  row: { backgroundColor: '#fff', borderRadius: radius.md, paddingVertical: 12, paddingHorizontal: 22, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 16 },
  rowIcon: { width: 44, height: 44, borderRadius: radius.sm, backgroundColor: colors.tintBg, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontSize: 22, fontWeight: '700', color: colors.text, fontFamily: FONT },
  rowSub: { fontSize: 18, color: colors.muted, marginTop: 2, fontFamily: FONT },
  rowTime: { fontSize: 17, color: colors.subtle, marginTop: 6, fontFamily: FONT },

  footRow: { marginTop: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16 },
  foot: { flex: 1, fontSize: 18, color: colors.muted, fontFamily: FONT },
  certBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 15, paddingHorizontal: 24 },
  certBtnText: { color: '#fff', fontSize: 19, fontWeight: '700', fontFamily: FONT },

  backdrop: { flex: 1, backgroundColor: 'rgba(12,24,48,0.55)', alignItems: 'center', justifyContent: 'center' },
  modalCard: { width: 560, maxWidth: '90%', backgroundColor: '#fff', borderRadius: 24, padding: 36, alignItems: 'center' },
  modalTitle: { fontSize: 26, fontWeight: '700', color: colors.text, fontFamily: FONT },
  modalTitle2: { fontSize: 23, fontWeight: '700', color: colors.text, marginTop: 22, fontFamily: FONT },
  modalSub: { fontSize: 17, color: colors.muted, marginTop: 8, textAlign: 'center', fontFamily: FONT },

  scanBox: { width: 220, height: 220, borderRadius: 20, backgroundColor: '#F3F7FD', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginTop: 22 },
  corner: { position: 'absolute', width: 30, height: 30, borderColor: colors.primary },
  scanLine: { position: 'absolute', left: 18, right: 18, height: 3, backgroundColor: colors.primary, borderRadius: 2, opacity: 0.85 },

  spinner: { width: 64, height: 64, borderRadius: 32, borderWidth: 6, borderColor: '#E3ECF8', borderTopColor: colors.primary },
  doneCircle: { width: 84, height: 84, borderRadius: 42, backgroundColor: '#E4F6EC', alignItems: 'center', justifyContent: 'center' },

  mBtn: { borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  mBtnGhost: { borderWidth: 1, borderColor: colors.borderStrong },
  mBtnGhostText: { fontSize: 18, fontWeight: '700', color: colors.muted, fontFamily: FONT },
  mBtnPrimary: { backgroundColor: colors.primary },
  mBtnPrimaryText: { fontSize: 18, fontWeight: '700', color: '#fff', fontFamily: FONT },
});
