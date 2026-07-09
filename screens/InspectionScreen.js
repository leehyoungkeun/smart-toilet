// 화장실 점검 — 청소 후 점검표를 한 화면에 펼쳐 체크 → 담당자 → PIN → 청소완료
// 시간대 구분 없음(클릭 시각이 로그에 남음). 하루 청소 횟수 카운트 + 이력.
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from '../icons';
import { BackHeader } from '../ui';
import { colors, radius, FONT } from '../theme';
import { useKiosk } from '../context/KioskContext';
import { getCleaningLogs, recordCleaning } from '../lib/api';

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
  const [mode, setMode] = useState('list'); // 'list' | 'checklist'

  const load = useCallback(async () => {
    try { setCleanLogs(await getCleaningLogs(locationId)); }
    catch (e) { setCleanLogs([]); }
  }, [locationId]);
  useEffect(() => { load(); }, [load]);

  if (mode === 'checklist') {
    return <Checklist onCancel={() => setMode('list')} onDone={() => { setMode('list'); load(); }} />;
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
        <TouchableOpacity activeOpacity={0.9} onPress={() => setMode('checklist')} style={s.cleanBtn}>
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

// 한 화면에 점검표 전 항목 펼침 → 체크 → 담당자·PIN → 청소완료
function Checklist({ onCancel, onDone }) {
  const [checks, setChecks] = useState(CHECK.map(() => true));
  const [cleaner, setCleaner] = useState('');
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const checkedCount = checks.filter(Boolean).length;
  const allOn = checkedCount === CHECK.length;
  const toggle = (i) => setChecks((c) => c.map((v, j) => (j === i ? !v : v)));
  const setAll = (v) => setChecks(CHECK.map(() => v));

  const submit = async () => {
    if (pin.length < 4 || checkedCount === 0 || busy) return;
    setBusy(true); setErr('');
    try {
      const items = CHECK.filter((_, i) => checks[i]);
      await recordCleaning(pin, cleaner, null, items);
      onDone();
    } catch (e) { setErr('PIN이 일치하지 않거나 기록에 실패했습니다.'); setBusy(false); }
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

      {/* 점검표 전 항목 (스크롤 없이 한 화면) */}
      <View style={s.grid}>
        {CHECK.map((c, i) => (
          <TouchableOpacity key={i} activeOpacity={0.8} onPress={() => toggle(i)} style={[s.cell, checks[i] && s.cellOn]}>
            <View style={[s.box, checks[i] && s.boxOn]}>{checks[i] && <Icon name="check" size={15} color="#fff" strokeWidth={3} />}</View>
            <Text style={s.cellLabel} numberOfLines={1}>{c.title}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 마무리: 담당자 + PIN + 완료 */}
      <View style={s.footer}>
        <TextInput style={[s.input, { flex: 1 }]} value={cleaner} onChangeText={setCleaner} placeholder="담당자 이름 (선택)" placeholderTextColor={colors.subtle} />
        <TextInput style={[s.input, { width: 200 }]} value={pin} onChangeText={(t) => setPin(t.replace(/\D/g, ''))} placeholder="관리자 PIN (4자리)" placeholderTextColor={colors.subtle} keyboardType="number-pad" secureTextEntry maxLength={4} />
        <TouchableOpacity activeOpacity={0.9} onPress={submit} style={[s.doneBtn, (pin.length < 4 || checkedCount === 0 || busy) && { opacity: 0.5 }]} disabled={pin.length < 4 || checkedCount === 0 || busy}>
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

  // 점검표(한 화면)
  clRoot: { flex: 1, padding: 20, paddingHorizontal: 28 },
  clHead: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 },
  clTitle: { fontSize: 28, fontWeight: '800', color: colors.text, fontFamily: FONT },
  clSub: { fontSize: 17, color: colors.muted, marginTop: 3, fontFamily: FONT },
  clGhost: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: '#fff' },
  clGhostText: { fontSize: 16, fontWeight: '700', color: colors.primary, fontFamily: FONT },

  grid: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignContent: 'flex-start' },
  cell: { flexBasis: '31.8%', flexGrow: 1, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.borderStrong, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 14 },
  cellOn: { borderColor: colors.primary, backgroundColor: 'rgba(44,108,208,0.06)' },
  box: { width: 26, height: 26, borderRadius: 7, borderWidth: 2, borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center' },
  boxOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  cellLabel: { flex: 1, fontSize: 17, fontWeight: '600', color: colors.text, fontFamily: FONT },

  footer: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 14 },
  input: { height: 58, borderRadius: radius.md, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: '#F7F9FD', paddingHorizontal: 18, fontSize: 20, color: colors.text, fontFamily: FONT },
  doneBtn: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 18, paddingHorizontal: 40, alignItems: 'center', justifyContent: 'center' },
  doneBtnText: { color: '#fff', fontSize: 22, fontWeight: '800', fontFamily: FONT },
  clErr: { fontSize: 16, color: colors.danger, fontWeight: '600', marginTop: 10, fontFamily: FONT },
});
