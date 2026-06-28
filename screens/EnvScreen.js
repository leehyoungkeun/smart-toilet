// 실시간 환경 상태 — 온도·습도·암모니아·미세먼지 상세 게이지
import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BackHeader, Badge, PulseDot } from '../ui';
import { colors, radius, shadow, FONT } from '../theme';

const GAUGES = [
  { label: '실내 온도', value: '24.7', unit: '°C', tone: '정상', pos: 0.54,
    grad: ['#5BA8F0', '#3FB984', '#E5654E'], left: '16°C', mid: '적정 18~26°C', right: '32°C' },
  { label: '실내 습도', value: '53', unit: '%', tone: '정상', pos: 0.53,
    grad: ['#E5654E', '#3FB984', '#5BA8F0'], left: '건조', mid: '적정 40~60%', right: '습함' },
  { label: '암모니아 (악취·NH₃)', value: '0.02', unit: 'ppm', tone: '정상', pos: 0.08,
    grad: ['#3FB984', '#F4C24A', '#E5654E'], left: '쾌적', mid: '보통', right: '관리 필요 0.1ppm↑' },
  { label: '미세먼지 (PM2.5)', value: '12', unit: '㎍/㎥', tone: '좋음', pos: 0.09,
    grad: ['#3FB984', '#F4C24A', '#E5654E'], left: '좋음', mid: '보통', right: '나쁨 35↑' },
];

export default function EnvScreen({ onBack }) {
  return (
    <ScrollView contentContainerStyle={{ padding: 24, paddingHorizontal: 30 }}>
      <BackHeader title="화장실 환경" subtitle="1분마다 자동 측정되어 통합관제센터로 전송됩니다" onBack={onBack} />
      <View style={s.grid}>
        {GAUGES.map((g) => (
          <View key={g.label} style={s.gauge}>
            <View style={s.gaugeTop}>
              <Text style={s.gaugeLabel}>{g.label}</Text>
              <Badge label={g.tone} />
            </View>
            <Text style={s.gaugeValue}>{g.value}<Text style={s.gaugeUnit}> {g.unit}</Text></Text>
            <View style={s.barWrap}>
              <LinearGradient colors={g.grad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.bar} />
              <View style={[s.marker, { left: `${g.pos * 100}%` }]} />
            </View>
            <View style={s.barLabels}>
              <Text style={[s.barLabel, g.pos < 0.34 && s.barLabelActive]}>{g.left}</Text>
              <Text style={[s.barLabel, g.pos >= 0.34 && g.pos < 0.66 && s.barLabelActive]}>{g.mid}</Text>
              <Text style={[s.barLabel, g.pos >= 0.66 && s.barLabelActive]}>{g.right}</Text>
            </View>
          </View>
        ))}
      </View>
      <View style={s.footer}>
        <PulseDot />
        <Text style={s.footerText}>최근 업데이트 <Text style={{ fontWeight: '700', color: colors.text }}>방금 전</Text> · 측정 위치: 화장실 내부 천장 통합센서 · 기준 초과 시 관리자에게 자동 알림</Text>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 18 },
  gauge: { width: '48.5%', backgroundColor: '#fff', borderRadius: radius.lg, padding: 24, borderWidth: 1, borderColor: colors.border, ...shadow(8, 0.05) },
  gaugeTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  gaugeLabel: { fontSize: 23, fontWeight: '700', color: colors.text, fontFamily: FONT },
  gaugeValue: { fontSize: 54, fontWeight: '700', color: colors.text, marginTop: 8, fontFamily: FONT },
  gaugeUnit: { fontSize: 27, color: colors.muted, fontWeight: '600' },
  barWrap: { height: 12, borderRadius: radius.pill, marginTop: 20, justifyContent: 'center' },
  bar: { height: 12, borderRadius: radius.pill },
  marker: { position: 'absolute', width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff', borderWidth: 4, borderColor: colors.primary, marginLeft: -11, ...shadow(6, 0.18) },
  barLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  barLabel: { fontSize: 17, color: colors.subtle, fontFamily: FONT },
  barLabelActive: { color: colors.primary, fontWeight: '600' },
  footer: { marginTop: 18, backgroundColor: '#F2F7FF', borderWidth: 1, borderColor: colors.borderBlue, borderRadius: radius.md, padding: 16, paddingHorizontal: 22, flexDirection: 'row', alignItems: 'center', gap: 12 },
  footerText: { flex: 1, fontSize: 19, color: '#5C6B86', fontFamily: FONT },
});
