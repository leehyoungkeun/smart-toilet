// 화장실 점검 — 실제 '관리점검표' 방식
// 청소완료 = 시간대(오전/오후) + 점검표 전 항목 체크 + 담당자 + 관리자 PIN → 한 번에 기록
// 하루 청소 횟수(오전/오후) 카운트 + 점검 항목 로그 저장
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, TextInput, StyleSheet, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from '../icons';
import { BackHeader } from '../ui';
import { colors, radius, FONT } from '../theme';
import { useKiosk } from '../context/KioskContext';
import { getCleaningLogs, recordCleaning, getInspections } from '../lib/api';

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
  { category: 'cleanliness', title: '대소변기 청소상태 양호' },
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
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    try { setCleanLogs(await getCleaningLogs(locationId)); }
    catch (e) { setCleanLogs([]); }
  }, [locationId]);
  useEffect(() => { load(); }, [load]);

  const todayLogs = (cleanLogs || []).filter((l) => isToday(l.cleaned_at));
  const todayCount = todayLogs.length;
  const lastClean = cleanLogs && cleanLogs.length ? hhmm(cleanLogs[0].cleaned_at) : '—';

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 18, paddingHorizontal: 28 }}>
        <BackHeader title="화장실 점검" subtitle="청소를 마치면 점검표를 체크하고 청소완료를 기록하세요" onBack={onBack} />

        <LinearGradient colors={[colors.primary, colors.primaryDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.cleanCard}>
          <View style={{ flex: 1 }}>
            <Text style={s.cleanKicker}>오늘 청소 횟수</Text>
            <Text style={s.cleanCount}>{todayCount}<Text style={s.cleanUnit}>회</Text></Text>
            <Text style={s.cleanMeta}>최근 청소 {lastClean}</Text>
          </View>
          <TouchableOpacity activeOpacity={0.9} onPress={() => setOpen(true)} style={s.cleanBtn}>
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
                <Text style={s.rowTitle}>청소완료{l.shift ? ` · ${l.shift}` : ''} ({todayCount - i}회차)</Text>
                <Text style={s.rowSub}>{l.cleaner ? `담당 ${l.cleaner}` : '담당자 미기재'}</Text>
              </View>
              <Text style={s.rowTime}>{hhmm(l.cleaned_at)}</Text>
            </View>
          ))}
        </View>

        <Text style={[s.sectionTitle, { marginTop: 24 }]}>주간 청소 이력</Text>
        <View style={{ gap: 8 }}>
          {(cleanLogs || []).filter((l) => !isToday(l.cleaned_at)).slice(0, 10).map((l) => (
            <View key={l.id} style={[s.row, { paddingVertical: 10 }]}>
              <View style={{ flex: 1 }}>
                <Text style={s.rowSub}>{new Date(l.cleaned_at).toLocaleDateString('ko-KR')} {l.shift || ''}</Text>
              </View>
              <Text style={s.rowSub}>{l.cleaner || ''} {hhmm(l.cleaned_at)}</Text>
            </View>
          ))}
          {cleanLogs && cleanLogs.filter((l) => !isToday(l.cleaned_at)).length === 0 && (
            <View style={s.row}><Text style={s.rowSub}>이전 청소 이력이 없습니다.</Text></View>
          )}
        </View>
      </ScrollView>

      {open && <CleanChecklistModal onClose={() => setOpen(false)} onDone={() => { setOpen(false); load(); }} />}
    </View>
  );
}

function CleanChecklistModal({ onClose, onDone }) {
  const [shift, setShift] = useState('오전');
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
      await recordCleaning(pin, cleaner, shift, items);
      onDone();
    } catch (e) { setErr('PIN이 일치하지 않거나 기록에 실패했습니다.'); setBusy(false); }
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.backdrop}>
        <View style={s.modalCard}>
          <View style={s.mHead}>
            <Text style={s.mTitle}>청소완료 점검표</Text>
            <TouchableOpacity onPress={onClose} style={s.mClose}><Text style={s.mCloseText}>닫기</Text></TouchableOpacity>
          </View>

          {/* 시간대 */}
          <View style={s.seg}>
            {['오전', '오후'].map((v) => (
              <TouchableOpacity key={v} onPress={() => setShift(v)} style={[s.segBtn, shift === v && s.segBtnOn]}>
                <Text style={[s.segText, shift === v && s.segTextOn]}>{v}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* 점검표 */}
          <View style={s.checkHead}>
            <Text style={s.checkHeadText}>점검 항목 ({checkedCount}/{CHECK.length})</Text>
            <TouchableOpacity onPress={() => setAll(!allOn)}><Text style={s.checkAll}>{allOn ? '전체 해제' : '전체 선택'}</Text></TouchableOpacity>
          </View>
          <ScrollView style={s.checkScroll} contentContainerStyle={{ gap: 7, paddingVertical: 2 }}>
            {CHECK.map((c, i) => (
              <TouchableOpacity key={i} activeOpacity={0.8} onPress={() => toggle(i)} style={[s.checkRow, checks[i] && s.checkRowOn]}>
                <View style={[s.checkBox, checks[i] && s.checkBoxOn]}>{checks[i] && <Icon name="check" size={14} color="#fff" strokeWidth={3} />}</View>
                <Text style={s.checkLabel}>{c.title}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TextInput style={[s.input, { marginTop: 12 }]} value={cleaner} onChangeText={setCleaner} placeholder="담당자 이름 (선택)" placeholderTextColor={colors.subtle} />
          <TextInput style={s.input} value={pin} onChangeText={(t) => setPin(t.replace(/\D/g, ''))} placeholder="관리자 PIN (4자리)" placeholderTextColor={colors.subtle} keyboardType="number-pad" secureTextEntry maxLength={4} />
          {!!err && <Text style={s.mErr}>{err}</Text>}
          <TouchableOpacity activeOpacity={0.9} onPress={submit} style={[s.mBtnPrimary, (pin.length < 4 || checkedCount === 0 || busy) && { opacity: 0.5 }]} disabled={pin.length < 4 || checkedCount === 0 || busy}>
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.mBtnPrimaryText}>{shift} 청소완료 기록</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
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

  backdrop: { flex: 1, backgroundColor: 'rgba(12,24,48,0.55)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  modalCard: { width: 560, maxWidth: '100%', maxHeight: '92%', backgroundColor: '#fff', borderRadius: 24, padding: 26 },
  mHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  mTitle: { fontSize: 25, fontWeight: '700', color: colors.text, fontFamily: FONT },
  mClose: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, borderColor: colors.borderStrong },
  mCloseText: { fontSize: 16, fontWeight: '600', color: colors.muted, fontFamily: FONT },
  mErr: { fontSize: 15, color: colors.danger, fontWeight: '600', marginTop: 8, fontFamily: FONT },

  seg: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  segBtn: { flex: 1, paddingVertical: 13, borderRadius: 12, borderWidth: 1, borderColor: colors.borderStrong, alignItems: 'center' },
  segBtnOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  segText: { fontSize: 19, fontWeight: '700', color: colors.muted, fontFamily: FONT },
  segTextOn: { color: '#fff' },

  checkHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  checkHeadText: { fontSize: 16, fontWeight: '700', color: colors.text, fontFamily: FONT },
  checkAll: { fontSize: 15, fontWeight: '700', color: colors.primary, fontFamily: FONT },
  checkScroll: { maxHeight: 260, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 8, backgroundColor: '#FAFBFD' },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border },
  checkRowOn: { borderColor: colors.primary, backgroundColor: 'rgba(44,108,208,0.06)' },
  checkBox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center' },
  checkBoxOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkLabel: { fontSize: 17, fontWeight: '600', color: colors.text, fontFamily: FONT },

  input: { height: 52, borderRadius: radius.md, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: '#F7F9FD', paddingHorizontal: 16, fontSize: 18, color: colors.text, fontFamily: FONT, marginBottom: 10 },
  mBtnPrimary: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 17, alignItems: 'center', marginTop: 6 },
  mBtnPrimaryText: { color: '#fff', fontSize: 21, fontWeight: '700', fontFamily: FONT },
});
