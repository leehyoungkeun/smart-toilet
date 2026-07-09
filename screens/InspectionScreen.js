// 화장실 점검 — 청소완료 점검표(관리자 전용)
// 진입 시 PIN 인증(추후 QR로 교체) → 점검표 한 화면 체크 → 담당자 → 청소완료
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from '../icons';
import { BackHeader } from '../ui';
import { colors, radius, FONT } from '../theme';
import { useKiosk } from '../context/KioskContext';
import { getCleaningLogs, recordCleaning, verifyAdminPin } from '../lib/api';

// 관리점검표 항목 (사진 기준 표준안 — 필요 시 수정)
const CHECK = [
  { category: 'facility', title: '배수 상태 정상' },
  { category: 'cleanliness', title: '악취 제거 상태' },
  { category: 'facility', title: '변기 상태 정상' },
  { category: 'facility', title: '타일·바닥 파손 없음' },
  { category: 'facility', title: '세면대 상태 정상' },
  { category: 'facility', title: '수전(수도) 상태 정상' },
  { category: 'facility', title: '환기구 청소·작동' },
  { category: 'supplies', title: '화장지 비치' },
  { category: 'cleanliness', title: '바닥 청결' },
  { category: 'facility', title: '손건조기 정상 작동' },
  { category: 'cleanliness', title: '거울 청결' },
  { category: 'cleanliness', title: '대소변기 청소상태' },
  { category: 'cleanliness', title: '각종 장비 청소상태' },
  { category: 'cleanliness', title: '낙서 없음' },
  { category: 'cleanliness', title: '거미줄 없음' },
  { category: 'safety', title: '조명 정상 점등' },
  { category: 'cleanliness', title: '소독상태 양호' },
  { category: 'facility', title: '유리창·급배기 상태' },
];

const pad2 = (x) => String(x).padStart(2, '0');
const hhmm = (iso) => { try { const n = new Date(iso); return pad2(n.getHours()) + ':' + pad2(n.getMinutes()); } catch { return ''; } };
const isToday = (iso) => { try { return new Date(iso).toDateString() === new Date().toDateString(); } catch { return false; } };

export default function InspectionScreen({ onBack }) {
  const { locationId } = useKiosk();
  const [cleanLogs, setCleanLogs] = useState(null);
  const [mode, setMode] = useState('list');   // 'list' | 'pin' | 'checklist'
  const [adminPin, setAdminPin] = useState('');

  const load = useCallback(async () => {
    try { setCleanLogs(await getCleaningLogs(locationId)); }
    catch (e) { setCleanLogs([]); }
  }, [locationId]);
  useEffect(() => { load(); }, [load]);

  if (mode === 'pin') {
    return <PinGate onCancel={() => setMode('list')} onOk={(p) => { setAdminPin(p); setMode('checklist'); }} />;
  }
  if (mode === 'checklist') {
    return <Checklist adminPin={adminPin} onCancel={() => setMode('list')} onDone={() => { setMode('list'); load(); }} />;
  }

  const todayLogs = (cleanLogs || []).filter((l) => isToday(l.cleaned_at));
  const todayCount = todayLogs.length;
  const lastClean = cleanLogs && cleanLogs.length ? hhmm(cleanLogs[0].cleaned_at) : '—';

  return (
    <ScrollView contentContainerStyle={{ padding: 18, paddingHorizontal: 28 }}>
      <BackHeader title="화장실 점검" subtitle="청소를 마치면 점검표를 체크하고 청소완료를 기록하세요" onBack={onBack} />

      <LinearGradient colors={[colors.primary, colors.primaryDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.cleanCard}>
        <View style={{ flex: 1 }}>
          <Text style={s.cleanKicker}>오늘 청소 횟수</Text>
          <Text style={s.cleanCount}>{todayCount}<Text style={s.cleanUnit}>회</Text></Text>
          <Text style={s.cleanMeta}>최근 청소 {lastClean}</Text>
        </View>
        <TouchableOpacity activeOpacity={0.9} onPress={() => setMode('pin')} style={s.cleanBtn}>
          <Icon name="clipboard" size={26} color={colors.primary} />
          <Text style={s.cleanBtnText}>청소완료 점검표</Text>
        </TouchableOpacity>
      </LinearGradient>

      <Text style={s.sectionTitle}>오늘 청소 로그</Text>
      <View style={{ gap: 10 }}>
        {cleanLogs === null && <View style={[s.row, { justifyContent: 'center' }]}><ActivityIndicator color={colors.primary} /></View>}
        {cleanLogs && todayLogs.length === 0 && <View style={s.row}><Text style={s.rowSub}>오늘 청소 기록이 없습니다.</Text></View>}
        {todayLogs.map((l, i) => (
          <View key={l.id} style={s.row}>
            <View style={[s.rowIcon, { backgroundColor: colors.greenBg }]}><Icon name="check" size={20} color={colors.greenText} strokeWidth={2.4} /></View>
            <View style={{ flex: 1 }}>
              <Text style={s.rowTitle}>청소완료 ({todayCount - i}회차)</Text>
              <Text style={s.rowSub}>{l.cleaner ? `담당 ${l.cleaner}` : '담당자 미기재'}</Text>
            </View>
            <Text style={s.rowTime}>{hhmm(l.cleaned_at)}</Text>
          </View>
        ))}
      </View>

      <Text style={[s.sectionTitle, { marginTop: 24 }]}>이전 청소 이력</Text>
      <View style={{ gap: 8 }}>
        {(cleanLogs || []).filter((l) => !isToday(l.cleaned_at)).slice(0, 8).map((l) => (
          <View key={l.id} style={[s.row, { paddingVertical: 10 }]}>
            <Text style={[s.rowSub, { flex: 1 }]}>{new Date(l.cleaned_at).toLocaleDateString('ko-KR')}</Text>
            <Text style={s.rowSub}>{l.cleaner || ''} {hhmm(l.cleaned_at)}</Text>
          </View>
        ))}
        {cleanLogs && cleanLogs.filter((l) => !isToday(l.cleaned_at)).length === 0 && (
          <View style={s.row}><Text style={s.rowSub}>이전 청소 이력이 없습니다.</Text></View>
        )}
      </View>
    </ScrollView>
  );
}

// 진입 게이트 — 관리자 PIN 인증 (추후 QR 스캔으로 교체)
function PinGate({ onCancel, onOk }) {
  const [pin, setPin] = useState('');
  const [err, setErr] = useState(false);
  const [busy, setBusy] = useState(false);
  const dots = '●'.repeat(pin.length) + '○'.repeat(4 - pin.length);

  const press = async (d) => {
    if (pin.length >= 4 || busy) return;
    const np = pin + d;
    if (np.length < 4) { setPin(np); setErr(false); return; }
    setPin(np); setBusy(true);
    let ok = false;
    try { ok = await verifyAdminPin(np); } catch (e) { ok = false; }
    setBusy(false);
    if (ok) onOk(np);
    else { setPin(''); setErr(true); }
  };
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

  return (
    <View style={s.pinRoot}>
      <View style={s.pinCard}>
        <View style={s.pinLock}><Icon name="clipboard" size={30} color={colors.primary} /></View>
        <Text style={s.pinTitle}>청소완료 점검표 · 관리자 인증</Text>
        <Text style={s.pinSub}>관리자만 이용할 수 있습니다. PIN을 입력하세요.</Text>
        <Text style={s.pinDots}>{busy ? '확인 중…' : dots}</Text>
        {err && <Text style={s.pinErr}>PIN이 일치하지 않습니다. 다시 입력해 주세요.</Text>}
        <View style={s.pad}>
          {keys.map((k) => (
            <TouchableOpacity key={k} activeOpacity={0.7} onPress={() => press(k)} style={s.padKey}><Text style={s.padKeyText}>{k}</Text></TouchableOpacity>
          ))}
          <TouchableOpacity activeOpacity={0.7} onPress={onCancel} style={s.padBlank}><Text style={s.padCancel}>취소</Text></TouchableOpacity>
          <TouchableOpacity activeOpacity={0.7} onPress={() => press('0')} style={s.padKey}><Text style={s.padKeyText}>0</Text></TouchableOpacity>
          <TouchableOpacity activeOpacity={0.7} onPress={() => { setPin(''); setErr(false); }} style={s.padBlank}><Icon name="back" size={26} color={colors.muted} /></TouchableOpacity>
        </View>
        <Text style={s.pinHint}>추후 QR 사원증 스캔으로 교체 예정</Text>
      </View>
    </View>
  );
}

// 점검표 한 화면 체크 → 담당자 → 청소완료 (PIN은 진입 시 인증됨)
function Checklist({ adminPin, onCancel, onDone }) {
  const [checks, setChecks] = useState(CHECK.map(() => true));
  const [cleaner, setCleaner] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const checkedCount = checks.filter(Boolean).length;
  const allOn = checkedCount === CHECK.length;
  const toggle = (i) => setChecks((c) => c.map((v, j) => (j === i ? !v : v)));
  const setAll = (v) => setChecks(CHECK.map(() => v));

  const submit = async () => {
    if (checkedCount === 0 || busy) return;
    setBusy(true); setErr('');
    try {
      const items = CHECK.filter((_, i) => checks[i]);
      await recordCleaning(adminPin, cleaner, null, items);
      onDone();
    } catch (e) { setErr('기록에 실패했습니다. 다시 시도해 주세요.'); setBusy(false); }
  };

  return (
    <View style={s.clRoot}>
      <View style={s.clHead}>
        <View>
          <Text style={s.clTitle}>청소완료 점검표</Text>
          <Text style={s.clSub}>청소 후 상태를 점검하고 항목을 체크하세요 · {checkedCount}/{CHECK.length}</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity onPress={() => setAll(!allOn)} style={s.clGhost}><Text style={s.clGhostText}>{allOn ? '전체 해제' : '전체 선택'}</Text></TouchableOpacity>
          <TouchableOpacity onPress={onCancel} style={s.clGhost}><Text style={s.clGhostText}>취소</Text></TouchableOpacity>
        </View>
      </View>

      <View style={s.grid}>
        {CHECK.map((c, i) => (
          <TouchableOpacity key={i} activeOpacity={0.8} onPress={() => toggle(i)} style={[s.cell, checks[i] && s.cellOn]}>
            <View style={[s.box, checks[i] && s.boxOn]}>{checks[i] && <Icon name="check" size={19} color="#fff" strokeWidth={3} />}</View>
            <Text style={s.cellLabel} numberOfLines={1}>{c.title}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={s.footer}>
        <TextInput style={[s.input, { flex: 1 }]} value={cleaner} onChangeText={setCleaner} placeholder="담당자 이름 (선택)" placeholderTextColor={colors.subtle} />
        <TouchableOpacity activeOpacity={0.9} onPress={submit} style={[s.doneBtn, (checkedCount === 0 || busy) && { opacity: 0.5 }]} disabled={checkedCount === 0 || busy}>
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.doneBtnText}>청소완료</Text>}
        </TouchableOpacity>
      </View>
      {!!err && <Text style={s.clErr}>{err}</Text>}
    </View>
  );
}

const s = StyleSheet.create({
  cleanCard: { borderRadius: radius.lg, padding: 22, paddingHorizontal: 26, flexDirection: 'row', alignItems: 'center', marginBottom: 22 },
  cleanKicker: { fontSize: 18, color: 'rgba(255,255,255,0.85)', fontWeight: '600', fontFamily: FONT },
  cleanCount: { fontSize: 54, fontWeight: '800', color: '#fff', marginTop: 2, fontFamily: FONT },
  cleanUnit: { fontSize: 24, fontWeight: '700', color: 'rgba(255,255,255,0.9)' },
  cleanMeta: { fontSize: 17, color: 'rgba(255,255,255,0.85)', marginTop: 2, fontFamily: FONT },
  cleanBtn: { backgroundColor: '#fff', borderRadius: radius.md, paddingVertical: 18, paddingHorizontal: 22, alignItems: 'center', flexDirection: 'row', gap: 10 },
  cleanBtnText: { fontSize: 21, fontWeight: '800', color: colors.primary, fontFamily: FONT },

  sectionTitle: { fontSize: 23, fontWeight: '700', color: colors.text, marginBottom: 12, fontFamily: FONT },
  row: { backgroundColor: '#fff', borderRadius: radius.md, paddingVertical: 12, paddingHorizontal: 20, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 14 },
  rowIcon: { width: 42, height: 42, borderRadius: radius.sm, backgroundColor: colors.tintBg, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontSize: 20, fontWeight: '700', color: colors.text, fontFamily: FONT },
  rowSub: { fontSize: 17, color: colors.muted, fontFamily: FONT },
  rowTime: { fontSize: 18, fontWeight: '600', color: colors.subtle, fontFamily: FONT },

  // PIN 게이트
  pinRoot: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  pinCard: { width: 440, maxWidth: '100%', backgroundColor: '#fff', borderRadius: radius.xl, padding: 34, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  pinLock: { width: 60, height: 60, borderRadius: 18, backgroundColor: colors.tintBg, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  pinTitle: { fontSize: 24, fontWeight: '700', color: colors.text, fontFamily: FONT, textAlign: 'center' },
  pinSub: { fontSize: 16, color: colors.muted, marginTop: 6, textAlign: 'center', fontFamily: FONT },
  pinDots: { fontSize: 32, letterSpacing: 6, color: colors.primary, marginVertical: 18, fontFamily: FONT },
  pinErr: { fontSize: 15, color: colors.danger, fontWeight: '600', marginBottom: 6, fontFamily: FONT },
  pad: { width: '100%', flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  padKey: { width: '31%', backgroundColor: '#F3F7FD', borderRadius: 14, paddingVertical: 18, alignItems: 'center' },
  padKeyText: { fontSize: 28, fontWeight: '700', color: colors.text, fontFamily: FONT },
  padBlank: { width: '31%', borderRadius: 14, paddingVertical: 18, alignItems: 'center', justifyContent: 'center' },
  padCancel: { fontSize: 17, fontWeight: '600', color: colors.muted, fontFamily: FONT },
  pinHint: { fontSize: 14, color: colors.subtle, marginTop: 16, fontFamily: FONT },

  // 점검표(한 화면)
  clRoot: { flex: 1, padding: 20, paddingHorizontal: 28 },
  clHead: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 },
  clTitle: { fontSize: 28, fontWeight: '800', color: colors.text, fontFamily: FONT },
  clSub: { fontSize: 17, color: colors.muted, marginTop: 3, fontFamily: FONT },
  clGhost: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: '#fff' },
  clGhostText: { fontSize: 16, fontWeight: '700', color: colors.primary, fontFamily: FONT },

  grid: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignContent: 'space-between' },
  cell: { flexBasis: '31.6%', flexGrow: 1, flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.borderStrong, borderRadius: 14, paddingVertical: 20, paddingHorizontal: 18 },
  cellOn: { borderColor: colors.primary, backgroundColor: 'rgba(44,108,208,0.06)' },
  box: { width: 32, height: 32, borderRadius: 8, borderWidth: 2, borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center' },
  boxOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  cellLabel: { flex: 1, fontSize: 22, fontWeight: '700', color: colors.text, fontFamily: FONT },

  footer: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 14 },
  input: { height: 58, borderRadius: radius.md, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: '#F7F9FD', paddingHorizontal: 18, fontSize: 20, color: colors.text, fontFamily: FONT },
  doneBtn: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 18, paddingHorizontal: 48, alignItems: 'center', justifyContent: 'center' },
  doneBtnText: { color: '#fff', fontSize: 22, fontWeight: '800', fontFamily: FONT },
  clErr: { fontSize: 16, color: colors.danger, fontWeight: '600', marginTop: 10, fontFamily: FONT },
});
