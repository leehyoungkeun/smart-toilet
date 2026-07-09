// 민원 접수 — 유형 선택 → submit_complaint RPC → 접수번호 발급
import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import Icon from '../icons';
import { BackHeader } from '../ui';
import { colors, radius, shadow, FONT } from '../theme';
import { submitComplaint } from '../lib/api';

const CATS = [
  { id: 1, icon: 'wrenchTool', label: '고장 신고', category: '고장' },
  { id: 2, icon: 'chart', label: '청결 요청', category: '청결' },
  { id: 3, icon: 'bag', label: '비품 부족', category: '비품' },
  { id: 4, icon: 'alert', label: '기타', category: '기타' },
];
const AREAS = ['남자', '여자', '공용·장애인'];
const SPOTS = ['대변기', '소변기', '세면대', '바닥', '거울', '기타'];

function Chip({ label, on, onPress }) {
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={[s.chip, on && s.chipOn]}>
      <Text style={[s.chipText, on && s.chipTextOn]}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function ComplaintScreen({ onBack, onHome }) {
  const [cat, setCat] = useState(0);
  const [area, setArea] = useState('');
  const [spot, setSpot] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [receipt, setReceipt] = useState(null);

  const submit = async () => {
    const chosen = CATS.find((c) => c.id === cat);
    if (!chosen || busy) return;
    setBusy(true); setErr('');
    try {
      const loc = [area, spot].filter(Boolean).join(' ');
      const res = await submitComplaint(chosen.category, loc || chosen.label, loc || null);
      setReceipt(res.reception_no);
    } catch (e) {
      setErr('접수에 실패했습니다. 잠시 후 다시 시도해 주세요.');
      setBusy(false);
    }
  };

  if (receipt) {
    return (
      <ScrollView contentContainerStyle={{ padding: 24, paddingHorizontal: 30 }}>
        <View style={[s.card, { alignItems: 'center', padding: 56, marginTop: 30 }]}>
          <View style={s.checkCircle}><Icon name="check" size={48} color={colors.greenText} strokeWidth={2.4} /></View>
          <Text style={s.doneTitle}>민원이 접수되었습니다</Text>
          <Text style={s.doneSub}>통합관제센터로 전달되어 신속히 처리됩니다</Text>
          <View style={s.ticket}><Text style={s.ticketText}>접수번호 {receipt}</Text></View>
          <TouchableOpacity activeOpacity={0.9} onPress={onHome} style={[s.cta, { paddingHorizontal: 44, marginTop: 26 }]}>
            <Text style={s.ctaText}>처음으로</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 24, paddingHorizontal: 30 }}>
      <BackHeader title="민원 접수" subtitle="불편 사항을 알려주시면 빠르게 조치하겠습니다" onBack={onBack} />
      <Text style={s.q}>어떤 점이 불편하셨나요?</Text>
      <View style={s.cats}>
        {CATS.map((c) => {
          const sel = cat === c.id;
          return (
            <TouchableOpacity key={c.id} activeOpacity={0.85} onPress={() => setCat(c.id)} style={[s.cat, sel && s.catSel]}>
              <View style={s.catIcon}><Icon name={c.icon} size={24} color={colors.primary} /></View>
              <Text style={s.catLabel}>{c.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={s.q}>어디가 불편하셨나요? <Text style={s.qOpt}>(선택)</Text></Text>
      <View style={s.chipsRow}>
        {AREAS.map((a) => <Chip key={a} label={a} on={area === a} onPress={() => setArea(area === a ? '' : a)} />)}
      </View>
      <View style={[s.chipsRow, { marginBottom: 22 }]}>
        {SPOTS.map((sp) => <Chip key={sp} label={sp} on={spot === sp} onPress={() => setSpot(spot === sp ? '' : sp)} />)}
      </View>

      {!!err && <Text style={s.err}>{err}</Text>}

      {cat > 0 ? (
        <TouchableOpacity activeOpacity={0.9} onPress={submit} style={[s.cta, busy && { opacity: 0.6 }]} disabled={busy}>
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.ctaText}>민원 접수하기</Text>}
        </TouchableOpacity>
      ) : (
        <View style={s.ctaDisabled}><Text style={s.ctaDisabledText}>유형을 선택해 주세요</Text></View>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, ...shadow(16, 0.06) },
  q: { fontSize: 23, fontWeight: '700', color: colors.text, marginBottom: 14, fontFamily: FONT },
  qOpt: { fontSize: 18, fontWeight: '500', color: colors.subtle },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 12 },
  chip: { paddingVertical: 14, paddingHorizontal: 22, borderRadius: 14, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: '#fff' },
  chipOn: { borderWidth: 2, borderColor: colors.primary, backgroundColor: 'rgba(44,108,208,0.06)' },
  chipText: { fontSize: 20, fontWeight: '700', color: colors.muted, fontFamily: FONT },
  chipTextOn: { color: colors.primary },
  cats: { flexDirection: 'row', gap: 14, marginBottom: 22 },
  cat: { flex: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.borderStrong, borderRadius: 18, paddingVertical: 24, alignItems: 'center' },
  catSel: { borderWidth: 3, borderColor: colors.primary, backgroundColor: 'rgba(44,108,208,0.06)' },
  catIcon: { width: 46, height: 46, borderRadius: 13, backgroundColor: colors.tintBg, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  catLabel: { fontSize: 21, fontWeight: '700', color: colors.text, fontFamily: FONT },

  photo: { backgroundColor: '#fff', borderWidth: 1, borderStyle: 'dashed', borderColor: '#C7D4E8', borderRadius: 18, padding: 22, flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 22 },
  photoIcon: { width: 48, height: 48, borderRadius: 14, backgroundColor: colors.tintBgSoft, alignItems: 'center', justifyContent: 'center' },
  photoTitle: { fontSize: 21, fontWeight: '700', color: colors.text, fontFamily: FONT },
  photoSub: { fontSize: 18, color: colors.muted, marginTop: 2, fontFamily: FONT },
  photoBtn: { borderWidth: 1, borderColor: '#C7D4E8', borderRadius: radius.sm, paddingVertical: 10, paddingHorizontal: 18 },
  photoBtnText: { fontSize: 19, color: colors.primary, fontWeight: '600', fontFamily: FONT },

  err: { fontSize: 17, color: colors.danger, fontWeight: '600', marginBottom: 12, fontFamily: FONT },
  cta: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 18, alignItems: 'center', ...shadow(16, 0.28) },
  ctaText: { color: '#fff', fontSize: 24, fontWeight: '700', fontFamily: FONT },
  ctaDisabled: { backgroundColor: colors.disabledBg, borderRadius: radius.md, paddingVertical: 18, alignItems: 'center' },
  ctaDisabledText: { color: colors.disabledText, fontSize: 24, fontWeight: '700', fontFamily: FONT },

  checkCircle: { width: 88, height: 88, borderRadius: 44, backgroundColor: colors.greenBg, alignItems: 'center', justifyContent: 'center' },
  doneTitle: { fontSize: 32, fontWeight: '700', color: colors.text, marginTop: 24, fontFamily: FONT },
  doneSub: { fontSize: 20, color: colors.muted, marginTop: 8, fontFamily: FONT },
  ticket: { backgroundColor: colors.tintBgSoft, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 24, marginTop: 22 },
  ticketText: { fontSize: 20, fontWeight: '700', color: colors.primary, fontFamily: FONT },
});
