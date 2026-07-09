// 화장실 점검 — 청소 로그(청소 완료 기록·하루 횟수) + 점검 기록(체크리스트)
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, TextInput, StyleSheet, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from '../icons';
import { BackHeader, Badge } from '../ui';
import { colors, radius, FONT } from '../theme';
import { useKiosk } from '../context/KioskContext';
import { getCleaningLogs, recordCleaning, getInspections, recordInspection } from '../lib/api';

const CAT_ICON = { cleanliness: 'home', facility: 'wrench', safety: 'shieldPlain', supplies: 'bag' };
const CHECK = [
  { category: 'cleanliness', title: '청결 (바닥·변기·세면대)' },
  { category: 'facility', title: '시설 (수전·배수·도어)' },
  { category: 'safety', title: '안전·설비 (비상벨·조명·환기)' },
  { category: 'supplies', title: '비품 (화장지·세정제·생리용품)' },
];
const pad2 = (x) => String(x).padStart(2, '0');
const hhmm = (iso) => { try { const n = new Date(iso); return pad2(n.getHours()) + ':' + pad2(n.getMinutes()); } catch { return ''; } };
const isToday = (iso) => { try { return new Date(iso).toDateString() === new Date().toDateString(); } catch { return false; } };

export default function InspectionScreen({ onBack }) {
  const { locationId } = useKiosk();
  const [cleanLogs, setCleanLogs] = useState(null);
  const [inspections, setInspections] = useState(null);
  const [modal, setModal] = useState(null); // null | 'clean' | 'inspect'

  const load = useCallback(async () => {
    try {
      const [c, i] = await Promise.all([getCleaningLogs(locationId), getInspections(locationId)]);
      setCleanLogs(c); setInspections(i);
    } catch (e) { setCleanLogs([]); setInspections([]); }
  }, [locationId]);
  useEffect(() => { load(); }, [load]);

  const todayLogs = (cleanLogs || []).filter((l) => isToday(l.cleaned_at));
  const todayCount = todayLogs.length;
  const lastClean = cleanLogs && cleanLogs.length ? hhmm(cleanLogs[0].cleaned_at) : '—';

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 18, paddingHorizontal: 28 }}>
        <BackHeader title="화장실 점검" subtitle="청소 완료 기록과 점검 내역을 관리합니다" onBack={onBack} />

        {/* 청소 현황 + 청소 완료 기록 */}
        <LinearGradient colors={[colors.primary, colors.primaryDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.cleanCard}>
          <View style={{ flex: 1 }}>
            <Text style={s.cleanKicker}>오늘 청소 횟수</Text>
            <Text style={s.cleanCount}>{todayCount}<Text style={s.cleanUnit}>회</Text></Text>
            <Text style={s.cleanMeta}>최근 청소 {lastClean}</Text>
          </View>
          <TouchableOpacity activeOpacity={0.9} onPress={() => setModal('clean')} style={s.cleanBtn}>
            <Icon name="check" size={26} color={colors.primary} strokeWidth={2.6} />
            <Text style={s.cleanBtnText}>청소 완료 기록</Text>
          </TouchableOpacity>
        </LinearGradient>

        {/* 오늘 청소 로그 */}
        <Text style={s.sectionTitle}>오늘 청소 로그</Text>
        <View style={{ gap: 10, marginBottom: 20 }}>
          {cleanLogs === null && <View style={[s.row, { justifyContent: 'center' }]}><ActivityIndicator color={colors.primary} /></View>}
          {cleanLogs && todayLogs.length === 0 && <View style={s.row}><Text style={s.rowSub}>오늘 청소 기록이 없습니다.</Text></View>}
          {todayLogs.map((l, i) => (
            <View key={l.id} style={s.row}>
              <View style={[s.rowIcon, { backgroundColor: colors.greenBg }]}><Icon name="check" size={20} color={colors.greenText} strokeWidth={2.4} /></View>
              <View style={{ flex: 1 }}>
                <Text style={s.rowTitle}>청소 완료 {todayCount - i}회차</Text>
                <Text style={s.rowSub}>{l.cleaner ? `담당 ${l.cleaner}` : '담당자 미기재'}{l.note ? ` · ${l.note}` : ''}</Text>
              </View>
              <Text style={s.rowTime}>{hhmm(l.cleaned_at)}</Text>
            </View>
          ))}
        </View>

        {/* 점검 내역 */}
        <View style={s.sectionRow}>
          <Text style={s.sectionTitle}>점검 내역</Text>
          <TouchableOpacity activeOpacity={0.9} onPress={() => setModal('inspect')} style={s.inspectBtn}>
            <Icon name="clipboard" size={20} color="#fff" />
            <Text style={s.inspectBtnText}>점검 인증</Text>
          </TouchableOpacity>
        </View>
        <View style={{ gap: 10 }}>
          {inspections === null && <View style={[s.row, { justifyContent: 'center' }]}><ActivityIndicator color={colors.primary} /></View>}
          {inspections && inspections.length === 0 && <View style={s.row}><Text style={s.rowSub}>점검 내역이 없습니다.</Text></View>}
          {inspections && inspections.map((it) => (
            <View key={it.id} style={s.row}>
              <View style={s.rowIcon}><Icon name={CAT_ICON[it.category] || 'clipboard'} size={20} color={colors.primary} /></View>
              <View style={{ flex: 1 }}>
                <Text style={s.rowTitle}>{it.title}</Text>
                <Text style={s.rowSub}>{it.inspector ? `담당 ${it.inspector}` : '점검 완료'}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Badge label={it.status === 'done' ? '완료' : it.status} />
                <Text style={s.rowTime}>{hhmm(it.inspected_at)}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {modal === 'clean' && <CleanModal onClose={() => setModal(null)} onDone={() => { setModal(null); load(); }} />}
      {modal === 'inspect' && <InspectModal onClose={() => setModal(null)} onDone={() => { setModal(null); load(); }} />}
    </View>
  );
}

function PinField({ value, onChangeText }) {
  return (
    <TextInput style={s.input} value={value} onChangeText={(t) => onChangeText(t.replace(/\D/g, ''))}
      placeholder="관리자 PIN (4자리)" placeholderTextColor={colors.subtle}
      keyboardType="number-pad" secureTextEntry maxLength={4} />
  );
}

function CleanModal({ onClose, onDone }) {
  const [cleaner, setCleaner] = useState('');
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const submit = async () => {
    if (pin.length < 4 || busy) return;
    setBusy(true); setErr('');
    try { await recordCleaning(pin, cleaner, null); onDone(); }
    catch (e) { setErr('PIN이 일치하지 않거나 기록에 실패했습니다.'); setBusy(false); }
  };
  return (
    <ModalShell title="청소 완료 기록" onClose={onClose}>
      <Text style={s.mSub}>청소를 마친 후 담당자와 관리자 PIN을 입력하세요.</Text>
      <TextInput style={s.input} value={cleaner} onChangeText={setCleaner} placeholder="담당자 이름 (선택)" placeholderTextColor={colors.subtle} />
      <PinField value={pin} onChangeText={setPin} />
      {!!err && <Text style={s.mErr}>{err}</Text>}
      <TouchableOpacity activeOpacity={0.9} onPress={submit} style={[s.mBtnPrimary, (pin.length < 4 || busy) && { opacity: 0.5 }]} disabled={pin.length < 4 || busy}>
        {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.mBtnPrimaryText}>청소 완료로 기록</Text>}
      </TouchableOpacity>
    </ModalShell>
  );
}

function InspectModal({ onClose, onDone }) {
  const [checks, setChecks] = useState(CHECK.map(() => true));
  const [inspector, setInspector] = useState('');
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const toggle = (i) => setChecks((c) => c.map((v, j) => (j === i ? !v : v)));
  const items = CHECK.filter((_, i) => checks[i]);
  const submit = async () => {
    if (pin.length < 4 || items.length === 0 || busy) return;
    setBusy(true); setErr('');
    try { await recordInspection(pin, inspector, items); onDone(); }
    catch (e) { setErr('PIN이 일치하지 않거나 기록에 실패했습니다.'); setBusy(false); }
  };
  return (
    <ModalShell title="점검 인증" onClose={onClose}>
      <Text style={s.mSub}>점검한 항목을 선택하고 관리자 PIN으로 인증하세요.</Text>
      {CHECK.map((c, i) => (
        <TouchableOpacity key={c.category} activeOpacity={0.8} onPress={() => toggle(i)} style={[s.checkRow, checks[i] && s.checkRowOn]}>
          <View style={[s.checkBox, checks[i] && s.checkBoxOn]}>{checks[i] && <Icon name="check" size={16} color="#fff" strokeWidth={3} />}</View>
          <Text style={s.checkLabel}>{c.title}</Text>
        </TouchableOpacity>
      ))}
      <TextInput style={[s.input, { marginTop: 12 }]} value={inspector} onChangeText={setInspector} placeholder="담당자 이름 (선택)" placeholderTextColor={colors.subtle} />
      <PinField value={pin} onChangeText={setPin} />
      {!!err && <Text style={s.mErr}>{err}</Text>}
      <TouchableOpacity activeOpacity={0.9} onPress={submit} style={[s.mBtnPrimary, (pin.length < 4 || items.length === 0 || busy) && { opacity: 0.5 }]} disabled={pin.length < 4 || items.length === 0 || busy}>
        {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.mBtnPrimaryText}>{items.length}개 항목 점검 완료</Text>}
      </TouchableOpacity>
    </ModalShell>
  );
}

function ModalShell({ title, onClose, children }) {
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.backdrop}>
        <View style={s.modalCard}>
          <View style={s.mHead}>
            <Text style={s.mTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={s.mClose}><Text style={s.mCloseText}>닫기</Text></TouchableOpacity>
          </View>
          {children}
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
  cleanBtn: { backgroundColor: '#fff', borderRadius: radius.md, paddingVertical: 18, paddingHorizontal: 24, alignItems: 'center', flexDirection: 'row', gap: 10 },
  cleanBtnText: { fontSize: 22, fontWeight: '800', color: colors.primary, fontFamily: FONT },

  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sectionTitle: { fontSize: 23, fontWeight: '700', color: colors.text, marginBottom: 12, fontFamily: FONT },
  inspectBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 11, paddingHorizontal: 18 },
  inspectBtnText: { color: '#fff', fontSize: 17, fontWeight: '700', fontFamily: FONT },

  row: { backgroundColor: '#fff', borderRadius: radius.md, paddingVertical: 12, paddingHorizontal: 20, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 14 },
  rowIcon: { width: 42, height: 42, borderRadius: radius.sm, backgroundColor: colors.tintBg, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontSize: 20, fontWeight: '700', color: colors.text, fontFamily: FONT },
  rowSub: { fontSize: 17, color: colors.muted, marginTop: 2, fontFamily: FONT },
  rowTime: { fontSize: 18, fontWeight: '600', color: colors.subtle, fontFamily: FONT },

  backdrop: { flex: 1, backgroundColor: 'rgba(12,24,48,0.55)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  modalCard: { width: 520, maxWidth: '100%', backgroundColor: '#fff', borderRadius: 24, padding: 28 },
  mHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  mTitle: { fontSize: 25, fontWeight: '700', color: colors.text, fontFamily: FONT },
  mClose: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, borderColor: colors.borderStrong },
  mCloseText: { fontSize: 16, fontWeight: '600', color: colors.muted, fontFamily: FONT },
  mSub: { fontSize: 17, color: colors.muted, marginTop: 6, marginBottom: 16, fontFamily: FONT },
  mErr: { fontSize: 15, color: colors.danger, fontWeight: '600', marginTop: 10, fontFamily: FONT },
  input: { height: 54, borderRadius: radius.md, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: '#F7F9FD', paddingHorizontal: 16, fontSize: 19, color: colors.text, fontFamily: FONT, marginBottom: 12 },

  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, borderColor: colors.borderStrong, marginBottom: 8 },
  checkRowOn: { borderColor: colors.primary, backgroundColor: 'rgba(44,108,208,0.06)' },
  checkBox: { width: 26, height: 26, borderRadius: 7, borderWidth: 2, borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center' },
  checkBoxOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkLabel: { fontSize: 18, fontWeight: '600', color: colors.text, fontFamily: FONT },

  mBtnPrimary: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 17, alignItems: 'center', marginTop: 8 },
  mBtnPrimaryText: { color: '#fff', fontSize: 21, fontWeight: '700', fontFamily: FONT },
});
