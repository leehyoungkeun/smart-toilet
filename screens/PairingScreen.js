// 단말 온보딩 — 페어링 코드 입력 (미연결 키오스크 최초 1회)
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import Icon from '../icons';
import { colors, radius, shadow, FONT } from '../theme';
import { useKiosk } from '../context/KioskContext';

export default function PairingScreen() {
  const { pair } = useKiosk();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const submit = async () => {
    if (!code.trim() || busy) return;
    setBusy(true); setErr('');
    try {
      await pair(code.trim());
    } catch (e) {
      setErr('페어링에 실패했습니다. 코드를 확인해 주세요.');
      setBusy(false);
    }
  };

  return (
    <View style={s.root}>
      <View style={s.card}>
        <View style={s.icon}><Icon name="pin" size={34} color={colors.primary} /></View>
        <Text style={s.title}>키오스크 등록</Text>
        <Text style={s.sub}>관리자에게 받은 페어링 코드를 입력하세요</Text>
        <TextInput
          style={s.input}
          value={code}
          onChangeText={(t) => setCode(t.toUpperCase())}
          placeholder="4자리 코드"
          placeholderTextColor={colors.subtle}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={12}
          editable={!busy}
        />
        {!!err && <Text style={s.err}>{err}</Text>}
        <TouchableOpacity activeOpacity={0.9} onPress={submit} style={[s.cta, busy && { opacity: 0.6 }]} disabled={busy}>
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.ctaText}>등록하기</Text>}
        </TouchableOpacity>
        <Text style={s.hint}>콘솔에서 발급된 페어링 코드를 입력하세요</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  card: { width: 460, backgroundColor: '#fff', borderRadius: radius.xl, padding: 40, borderWidth: 1, borderColor: colors.border, alignItems: 'center', ...shadow(16, 0.06) },
  icon: { width: 64, height: 64, borderRadius: 18, backgroundColor: colors.tintBg, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  title: { fontSize: 28, fontWeight: '700', color: colors.text, fontFamily: FONT },
  sub: { fontSize: 17, color: colors.muted, marginTop: 6, marginBottom: 22, textAlign: 'center', fontFamily: FONT },
  input: { width: '100%', height: 60, borderRadius: radius.md, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: '#F7F9FD', paddingHorizontal: 18, fontSize: 22, fontWeight: '600', color: colors.text, fontFamily: FONT, textAlign: 'center', letterSpacing: 1 },
  err: { fontSize: 15, color: colors.danger, fontWeight: '600', marginTop: 12, fontFamily: FONT },
  cta: { width: '100%', backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 18, alignItems: 'center', marginTop: 18, ...shadow(16, 0.28) },
  ctaText: { color: '#fff', fontSize: 22, fontWeight: '700', fontFamily: FONT },
  hint: { fontSize: 14, color: colors.subtle, marginTop: 16, fontFamily: FONT },
});
