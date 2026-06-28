// 홈 — 실시간 환경 상태 + 기능 그리드 (키오스크 풀스크린, 스크롤 없음)
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from '../icons';
import { Badge } from '../ui';
import { colors, radius, shadow, FONT } from '../theme';

const ENV = [
  { icon: 'thermo', value: '24.7', unit: '°C', label: '실내 온도', tone: '정상' },
  { icon: 'droplet', value: '53', unit: '%', label: '실내 습도', tone: '정상' },
  { icon: 'wind', value: '0.02', unit: 'ppm', label: '암모니아 (악취)', tone: '정상' },
  { icon: 'dust', value: '12', unit: '㎍/㎥', label: '미세먼지 (PM2.5)', tone: '좋음' },
];

const SERVICES = [
  { key: 'sanitary', icon: 'qr', title: '무상 생리용품', sub: 'QR 인증 후 무료 제공', primary: true },
  { key: 'env', icon: 'wind', title: '화장실 환경', sub: '온도·습도·공기질 확인' },
  { key: 'check', icon: 'clipboard', title: '화장실 점검', sub: '오늘의 청소·점검 내역' },
  { key: 'civil', icon: 'message', title: '민원 접수', sub: '고장·불편 사항 신고' },
  { key: 'satis', icon: 'smile', title: '만족도 조사', sub: '이용 후기를 남겨주세요' },
  { key: 'guide', icon: 'info', title: '이용 안내', sub: '시설·위치 정보 확인' },
];

export default function HomeScreen({ go }) {
  return (
    <View style={s.root}>
      {/* 실시간 환경 상태 */}
      <View style={s.envRow}>
        {ENV.map((e) => (
          <TouchableOpacity key={e.label} activeOpacity={0.85} onPress={() => go('env')} style={s.envCard}>
            <View style={s.envTop}>
              <View style={s.envIcon}><Icon name={e.icon} size={22} color={colors.primary} /></View>
              <Badge label={e.tone} />
            </View>
            <Text style={s.envValue}>{e.value}<Text style={s.envUnit}> {e.unit}</Text></Text>
            <Text style={s.envLabel}>{e.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 섹션 제목 */}
      <View style={s.sectionRow}>
        <Text style={s.sectionTitle}>서비스 이용</Text>
        <Text style={s.sectionHint}>원하시는 서비스를 선택해 주세요</Text>
      </View>

      {/* 기능 그리드 (화면 채움) */}
      <View style={s.grid}>
        {SERVICES.map((sv) => (
          <TouchableOpacity key={sv.key} activeOpacity={0.9} onPress={() => go(sv.key)} style={s.cellWrap}>
            {sv.primary ? (
              <LinearGradient colors={[colors.primary, colors.primaryDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[s.cell, s.cellPrimary]}>
                <View style={s.iconPrimary}><Icon name={sv.icon} size={38} color="#fff" /></View>
                <View>
                  <Text style={s.titlePrimary}>{sv.title}</Text>
                  <Text style={s.subPrimary}>{sv.sub}</Text>
                </View>
              </LinearGradient>
            ) : (
              <View style={[s.cell, s.cellWhite]}>
                <View style={s.iconTint}><Icon name={sv.icon} size={38} color={colors.primary} /></View>
                <View>
                  <Text style={s.title}>{sv.title}</Text>
                  <Text style={s.sub}>{sv.sub}</Text>
                </View>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, padding: 18, paddingHorizontal: 28 },

  envRow: { flexDirection: 'row', gap: 16 },
  envCard: { flex: 1, backgroundColor: '#fff', borderRadius: 18, padding: 11, paddingHorizontal: 18, borderWidth: 1, borderColor: colors.border, ...shadow(8, 0.05) },
  envTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  envIcon: { width: 40, height: 40, borderRadius: radius.sm, backgroundColor: colors.tintBg, alignItems: 'center', justifyContent: 'center' },
  envValue: { fontSize: 30, fontWeight: '700', color: colors.text, marginTop: 8, fontFamily: FONT },
  envUnit: { fontSize: 17, fontWeight: '600', color: colors.muted },
  envLabel: { fontSize: 16, color: colors.muted, marginTop: 2, fontWeight: '500', fontFamily: FONT },

  sectionRow: { marginTop: 14, marginBottom: 12, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  sectionTitle: { fontSize: 27, fontWeight: '700', color: colors.text, fontFamily: FONT },
  sectionHint: { fontSize: 19, color: colors.muted, fontFamily: FONT },

  // 그리드: 3열 x 2행, 남은 세로 공간을 꽉 채움
  grid: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  cellWrap: { flexBasis: '30%', flexGrow: 1, height: '48.5%' },
  cell: { flex: 1, borderRadius: radius.xl, padding: 24, justifyContent: 'space-between' },
  cellPrimary: { ...shadow(24, 0.28) },
  cellWhite: { backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, ...shadow(8, 0.05) },
  iconPrimary: { width: 70, height: 70, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  iconTint: { width: 70, height: 70, borderRadius: 19, backgroundColor: colors.tintBg, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 46, fontWeight: '800', color: colors.text, fontFamily: FONT },
  sub: { fontSize: 25, color: colors.muted, marginTop: 8, fontFamily: FONT },
  titlePrimary: { fontSize: 46, fontWeight: '800', color: '#fff', fontFamily: FONT },
  subPrimary: { fontSize: 25, color: 'rgba(255,255,255,0.9)', marginTop: 8, fontFamily: FONT },
});
