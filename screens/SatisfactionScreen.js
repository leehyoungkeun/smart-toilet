// 만족도 조사 — 5단계 이모지 평가 → 제출 → 감사
import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { BackHeader } from '../ui';
import { colors, radius, shadow, FONT } from '../theme';

const FACES = [
  { id: 1, emoji: '😞', label: '매우 불만' },
  { id: 2, emoji: '🙁', label: '불만' },
  { id: 3, emoji: '😐', label: '보통' },
  { id: 4, emoji: '🙂', label: '만족' },
  { id: 5, emoji: '😄', label: '매우 만족' },
];

export default function SatisfactionScreen({ onBack, onHome }) {
  const [rating, setRating] = useState(0);
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <ScrollView contentContainerStyle={{ padding: 24, paddingHorizontal: 30 }}>
        <View style={[s.card, { alignItems: 'center', padding: 56, marginTop: 30 }]}>
          <Text style={{ fontSize: 86 }}>🙏</Text>
          <Text style={s.doneTitle}>소중한 의견 감사합니다</Text>
          <Text style={s.doneSub}>더 깨끗하고 안전한 화장실을 만들겠습니다</Text>
          <View style={s.avgBox}>
            <Text style={s.avgLabel}>이번 달 평균 만족도</Text>
            <Text style={s.avgValue}>4.6</Text>
            <Text style={s.avgUnit}>/ 5.0</Text>
          </View>
          <TouchableOpacity activeOpacity={0.9} onPress={onHome} style={[s.cta, { paddingHorizontal: 44, marginTop: 26 }]}>
            <Text style={s.ctaText}>처음으로</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 24, paddingHorizontal: 30 }}>
      <BackHeader title="만족도 조사" subtitle="소중한 의견은 더 나은 화장실을 만드는 데 사용됩니다" onBack={onBack} />
      <View style={[s.card, { padding: 36 }]}>
        <Text style={s.q}>오늘 화장실 이용은 어떠셨나요?</Text>
        <View style={s.faces}>
          {FACES.map((f) => {
            const sel = rating === f.id;
            return (
              <TouchableOpacity key={f.id} activeOpacity={0.85} onPress={() => setRating(f.id)} style={[s.face, sel && s.faceSel]}>
                <Text style={{ fontSize: 62 }}>{f.emoji}</Text>
                <Text style={s.faceLabel}>{f.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
      <View style={{ marginTop: 22 }}>
        {rating > 0 ? (
          <TouchableOpacity activeOpacity={0.9} onPress={() => setDone(true)} style={s.cta}>
            <Text style={s.ctaText}>평가 제출</Text>
          </TouchableOpacity>
        ) : (
          <View style={s.ctaDisabled}><Text style={s.ctaDisabledText}>평가를 선택해 주세요</Text></View>
        )}
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, ...shadow(8, 0.05) },
  q: { fontSize: 29, fontWeight: '700', color: colors.text, textAlign: 'center', fontFamily: FONT },
  faces: { flexDirection: 'row', gap: 14, marginTop: 30 },
  face: { flex: 1, paddingVertical: 20, borderRadius: 18, borderWidth: 1, borderColor: colors.borderStrong, alignItems: 'center' },
  faceSel: { borderWidth: 3, borderColor: colors.primary, backgroundColor: 'rgba(44,108,208,0.06)' },
  faceLabel: { fontSize: 19, fontWeight: '600', marginTop: 8, color: '#5C6B86', fontFamily: FONT },

  cta: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 18, alignItems: 'center', ...shadow(16, 0.28) },
  ctaText: { color: '#fff', fontSize: 24, fontWeight: '700', fontFamily: FONT },
  ctaDisabled: { backgroundColor: colors.disabledBg, borderRadius: radius.md, paddingVertical: 18, alignItems: 'center' },
  ctaDisabledText: { color: colors.disabledText, fontSize: 24, fontWeight: '700', fontFamily: FONT },

  doneTitle: { fontSize: 32, fontWeight: '700', color: colors.text, marginTop: 18, fontFamily: FONT },
  doneSub: { fontSize: 20, color: colors.muted, marginTop: 8, fontFamily: FONT },
  avgBox: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.tintBgSoft, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 24, marginTop: 22 },
  avgLabel: { fontSize: 19, color: '#5C6B86', fontWeight: '600', fontFamily: FONT },
  avgValue: { fontSize: 27, fontWeight: '700', color: colors.primary, fontFamily: FONT },
  avgUnit: { fontSize: 19, color: colors.subtle, fontFamily: FONT },
});
