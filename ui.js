// 공용 UI 컴포넌트
import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Easing } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from './icons';
import { colors, radius, shadow, FONT } from './theme';

// 깜빡이는 안심 표시 점
export function PulseDot({ color = colors.pulse, size = 9 }) {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.timing(a, { toValue: 1, duration: 2000, easing: Easing.out(Easing.ease), useNativeDriver: true })
    ).start();
  }, [a]);
  const scale = a.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 2, 2] });
  const opacity = a.interpolate({ inputRange: [0, 0.7, 1], outputRange: [0.55, 0, 0] });
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={{ position: 'absolute', width: size, height: size, borderRadius: size / 2, backgroundColor: color, transform: [{ scale }], opacity }} />
      <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }} />
    </View>
  );
}

// 상단 브랜드 헤더 (모든 화면 공통)
export function AppHeader({ title, time, date, onBrandPress, onAdminPress }) {
  const insets = useSafeAreaInsets();
  const headerStyle = [
    s.header,
    {
      height: 92 + insets.top,
      paddingTop: insets.top,
      paddingLeft: 30 + insets.left,
      paddingRight: 30 + insets.right,
    },
  ];
  return (
    <LinearGradient colors={[colors.headerFrom, colors.headerTo]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={headerStyle}>
      <TouchableOpacity activeOpacity={0.8} onPress={onBrandPress} style={s.brand}>
        <View style={s.brandIcon}><Icon name="pin" size={26} color="#fff" /></View>
        <View>
          <Text style={s.brandKicker}>경기도 스마트 공중화장실</Text>
          <Text style={s.brandTitle}>{title || '공중화장실'}</Text>
        </View>
      </TouchableOpacity>
      <View style={s.headerRight}>
        <View style={s.safeChip}>
          <PulseDot />
          <Text style={s.safeChipText}>안심 모드 작동 중</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={s.time}>{time}</Text>
          <Text style={s.date}>{date}</Text>
        </View>
        <TouchableOpacity activeOpacity={0.8} onPress={onAdminPress} style={s.gearBtn}>
          <Icon name="gear" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

// 뒤로가기 + 제목 (서브 화면 공통)
export function BackHeader({ title, subtitle, onBack }) {
  return (
    <View style={s.backRow}>
      <TouchableOpacity activeOpacity={0.7} onPress={onBack} style={s.backBtn}>
        <Icon name="back" size={24} color={colors.primary} strokeWidth={2.2} />
      </TouchableOpacity>
      <View>
        <Text style={s.backTitle}>{title}</Text>
        {!!subtitle && <Text style={s.backSub}>{subtitle}</Text>}
      </View>
    </View>
  );
}

// 정상/좋음 배지
export function Badge({ label, tone = 'green' }) {
  const map = {
    green: { bg: colors.greenBg, fg: colors.greenText },
  };
  const t = map[tone] || map.green;
  return (
    <View style={{ backgroundColor: t.bg, borderRadius: radius.pill, paddingVertical: 5, paddingHorizontal: 12 }}>
      <Text style={{ color: t.fg, fontWeight: '700', fontSize: 16, fontFamily: FONT }}>{label}</Text>
    </View>
  );
}

// 흰 카드
export function Card({ style, children, onPress }) {
  const inner = <View style={[s.card, style]}>{children}</View>;
  if (onPress) return <TouchableOpacity activeOpacity={0.85} onPress={onPress}>{inner}</TouchableOpacity>;
  return inner;
}

const s = StyleSheet.create({
  header: { height: 92, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 30 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  brandIcon: { width: 50, height: 50, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' },
  brandKicker: { fontSize: 17, letterSpacing: 0.6, color: 'rgba(255,255,255,0.85)', fontWeight: '600', fontFamily: FONT },
  brandTitle: { fontSize: 29, fontWeight: '700', color: '#fff', marginTop: 2, fontFamily: FONT },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  safeChip: { flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: 'rgba(255,255,255,0.14)', paddingVertical: 9, paddingHorizontal: 16, borderRadius: radius.pill },
  safeChipText: { fontSize: 19, fontWeight: '600', color: '#fff', fontFamily: FONT },
  gearBtn: { width: 46, height: 46, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' },
  time: { fontSize: 35, fontWeight: '700', color: '#fff', letterSpacing: 0.5, fontFamily: FONT },
  date: { fontSize: 17, color: 'rgba(255,255,255,0.85)', marginTop: 3, fontFamily: FONT },

  backRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 22 },
  backBtn: { width: 52, height: 52, borderRadius: radius.md, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center', ...shadow(4, 0.05) },
  backTitle: { fontSize: 32, fontWeight: '700', color: colors.text, fontFamily: FONT },
  backSub: { fontSize: 19, color: colors.muted, marginTop: 2, fontFamily: FONT },

  card: { backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, ...shadow(8, 0.05) },
});
