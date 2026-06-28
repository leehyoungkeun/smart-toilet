// 이용 안내 — 운영정보·시설·안심시설·생리용품
import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from '../icons';
import { BackHeader } from '../ui';
import { colors, radius, shadow, FONT } from '../theme';

function InfoCard({ icon, title, rows, gradient }) {
  const Header = (
    <View style={s.cardHead}>
      <View style={[s.cardHeadIcon, gradient && { backgroundColor: colors.primary }]}>
        <Icon name={icon} size={20} color={gradient ? '#fff' : colors.primary} />
      </View>
      <Text style={s.cardTitle}>{title}</Text>
    </View>
  );
  const body = (
    <>
      {Header}
      {rows.map((r, i) => (
        <View key={i} style={[s.row, i < rows.length - 1 && s.rowBorder]}>
          <Text style={s.rowKey}>{r.k}</Text>
          <Text style={s.rowVal}>{r.v}</Text>
        </View>
      ))}
    </>
  );
  if (gradient) {
    return <LinearGradient colors={['#EAF2FE', '#F4F8FF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.card}>{body}</LinearGradient>;
  }
  return <View style={[s.card, s.cardWhite]}>{body}</View>;
}

export default function GuideScreen({ onBack }) {
  return (
    <ScrollView contentContainerStyle={{ padding: 24, paddingHorizontal: 30 }}>
      <BackHeader title="이용 안내" subtitle="시설 위치와 이용 정보를 확인하세요" onBack={onBack} />
      <View style={s.grid}>
        <InfoCard icon="clock" title="운영 정보" rows={[
          { k: '위치', v: '중앙근린공원 동측 광장' },
          { k: '운영시간', v: '05:00 ~ 24:00' },
          { k: '관리기관', v: '○○구청 공원녹지과' },
          { k: '연락처', v: '031-000-0000' },
        ]} />
        <InfoCard icon="building" title="시설 안내" rows={[
          { k: '남성', v: '대변기 4 · 소변기 3' },
          { k: '여성', v: '대변기 6칸' },
          { k: '장애인 겸용', v: '1칸' },
          { k: '편의시설', v: '기저귀 교환대 · 파우더룸' },
        ]} />

        {/* 안심 시설 (강조) */}
        <LinearGradient colors={['#EAF2FE', '#F4F8FF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.card}>
          <View style={s.cardHead}>
            <View style={[s.cardHeadIcon, { backgroundColor: colors.primary }]}><Icon name="shield" size={20} color="#fff" /></View>
            <Text style={s.cardTitle}>안심 시설</Text>
          </View>
          <SafeRow icon="bell" color={colors.danger} bold="안심 비상벨" text=" — 각 칸·출입구에 설치, 누르면 통합관제센터·112/119로 즉시 연결" />
          <SafeRow icon="camera" color={colors.primary} bold="외부 AI CCTV 연계" text=" — 화장실 외부 지능형 CCTV로 이상행동 감지·범죄 예방" />
          <SafeRow icon="ear" color={colors.primary} bold="디지털 이상음 감지" text=" — 비명·도움 요청 등 이상징후 24시간 자동 탐지" />
          <SafeRow icon="scan" color="#C8780A" bold="불법촬영(몰카) 탐지" text=" — RF·렌즈 상시 스캔으로 불법촬영 장비를 자동 탐지" />
        </LinearGradient>

        <InfoCard icon="qr" title="무상 생리용품" rows={[
          { k: '지급 방식', v: 'QR 인증 후 무료' },
          { k: '제공 횟수', v: '1일 1회' },
          { k: '현재 재고', v: '충분 (실시간 감지)' },
        ]} />
      </View>
    </ScrollView>
  );
}

function SafeRow({ icon, color, bold, text }) {
  return (
    <View style={s.safeRow}>
      <Icon name={icon} size={19} color={color} />
      <Text style={s.safeText}><Text style={{ fontWeight: '700' }}>{bold}</Text>{text}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 18 },
  card: { width: '48.5%', borderRadius: radius.lg, padding: 24, borderWidth: 1, borderColor: colors.borderBlue },
  cardWhite: { backgroundColor: '#fff', borderColor: colors.border, ...shadow(8, 0.05) },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  cardHeadIcon: { width: 38, height: 38, borderRadius: 11, backgroundColor: colors.tintBg, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 23, fontWeight: '700', color: colors.text, fontFamily: FONT },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 11 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  rowKey: { fontSize: 19, color: colors.muted, fontFamily: FONT },
  rowVal: { fontSize: 19, fontWeight: '600', color: colors.text, fontFamily: FONT },
  safeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 11, paddingVertical: 9 },
  safeText: { flex: 1, fontSize: 19, lineHeight: 21, color: colors.text, fontFamily: FONT },
});
