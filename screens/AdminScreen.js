// 관리자 화면 — PIN 인증 게이트 + 대시보드 (키오스크 풀스크린, 스크롤 없음)
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from '../icons';
import { colors, radius, FONT } from '../theme';

const DEMO_PIN = '1234';

export default function AdminScreen({ onExit }) {
  const [pin, setPin] = useState('');
  const [err, setErr] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [padStock, setPadStock] = useState(12);
  const [padSaved, setPadSaved] = useState(false);
  const setPad = (n) => { setPadStock(Math.max(0, Math.min(30, n))); setPadSaved(false); };

  const press = (d) => {
    if (pin.length >= 4) return;
    const np = pin + d;
    if (np.length === 4) {
      if (np === DEMO_PIN) { setPin(''); setErr(false); setAuthed(true); }
      else { setPin(''); setErr(true); }
    } else { setPin(np); setErr(false); }
  };

  if (!authed) return <PinGate pin={pin} err={err} onKey={press} onClear={() => { setPin(''); setErr(false); }} onCancel={onExit} />;
  return <Dashboard onExit={onExit} padStock={padStock} setPad={setPad} padSaved={padSaved} onSave={() => setPadSaved(true)} />;
}

function PinGate({ pin, err, onKey, onClear, onCancel }) {
  const dots = '●'.repeat(pin.length) + '○'.repeat(4 - pin.length);
  const keys = ['1','2','3','4','5','6','7','8','9'];
  return (
    <View style={s.pinRoot}>
      <View style={s.pinCard}>
        <View style={s.pinLock}><Icon name="shieldPlain" size={30} color={colors.primary} /></View>
        <Text style={s.pinTitle}>관리자 인증</Text>
        <Text style={s.pinSub}>관리자 PIN을 입력하세요</Text>
        <Text style={s.pinDots}>{dots}</Text>
        {err && <Text style={s.pinErr}>PIN이 일치하지 않습니다. 다시 입력해 주세요.</Text>}
        <View style={s.pad}>
          {keys.map((k) => (
            <TouchableOpacity key={k} activeOpacity={0.7} onPress={() => onKey(k)} style={s.padKey}>
              <Text style={s.padKeyText}>{k}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity activeOpacity={0.7} onPress={onCancel} style={s.padBlank}><Text style={s.padCancel}>취소</Text></TouchableOpacity>
          <TouchableOpacity activeOpacity={0.7} onPress={() => onKey('0')} style={s.padKey}><Text style={s.padKeyText}>0</Text></TouchableOpacity>
          <TouchableOpacity activeOpacity={0.7} onPress={onClear} style={s.padBlank}><Icon name="back" size={26} color={colors.muted} /></TouchableOpacity>
        </View>
        <Text style={s.pinHint}>데모 PIN: 1234</Text>
      </View>
    </View>
  );
}

function Kpi({ label, value, unit, color }) {
  return (
    <View style={s.kpi}>
      <Text style={s.kpiLabel}>{label}</Text>
      <Text style={[s.kpiValue, color && { color }]}>{value}<Text style={s.kpiUnit}> {unit}</Text></Text>
    </View>
  );
}

function Panel({ children, style }) {
  return <View style={[s.panel, style]}>{children}</View>;
}

function StatusPill({ label, tone }) {
  const map = {
    green: { bg: '#E4F6EC', fg: '#138A55' },
    amber: { bg: '#FCEFD6', fg: '#B5730A' },
    blue: { bg: '#E3EDFB', fg: '#2C6CD0' },
  };
  const t = map[tone] || map.green;
  return <View style={{ backgroundColor: t.bg, borderRadius: radius.pill, paddingVertical: 4, paddingHorizontal: 10 }}><Text style={{ color: t.fg, fontWeight: '700', fontSize: 12, fontFamily: FONT }}>{label}</Text></View>;
}

function Dashboard({ onExit, padStock, setPad, padSaved, onSave }) {
  const padLow = padStock <= 10;
  const padColor = padLow ? '#E8950C' : '#1FA463';
  return (
    <View style={s.dash}>
      {/* 헤더 */}
      <View style={s.dashHead}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <View style={s.dashIcon}><Icon name="home" size={26} color="#fff" /></View>
          <View>
            <Text style={s.dashTitle}>관리자 대시보드</Text>
            <Text style={s.dashSub}>중앙근린공원 공중화장실 · 관리자 모드</Text>
          </View>
        </View>
        <TouchableOpacity activeOpacity={0.8} onPress={onExit} style={s.exitBtn}>
          <Icon name="back" size={18} color={colors.danger} />
          <Text style={s.exitText}>나가기</Text>
        </TouchableOpacity>
      </View>

      {/* KPI */}
      <View style={s.kpiRow}>
        <Kpi label="오늘 생리용품 지급" value="8" unit="/ 12개" />
        <Kpi label="생리용품 재고" value={String(padStock)} unit="개" color={padColor} />
        <Kpi label="미처리 민원" value="2" unit="건" color="#B5730A" />
        <Kpi label="평균 만족도" value="4.6" unit="/ 5.0" color={colors.primary} />
      </View>

      {/* 2x2 패널 영역 (화면 채움) */}
      <View style={s.quad}>
        <Panel>
          <View style={s.panelHead}><Text style={s.panelTitle}>환경 알람 현황</Text><StatusPill label="전체 정상" tone="green" /></View>
          {[['온도','24.7°C'],['습도','53%'],['암모니아','0.02ppm'],['미세먼지','12㎍/㎥']].map(([k,v],i,a)=>(
            <View key={k} style={[s.envRow, i<a.length-1 && s.rowBorder]}>
              <Text style={s.envKey}>{k}</Text>
              <Text style={s.envVal}>{v} <Text style={{ color: '#138A55' }}>정상</Text></Text>
            </View>
          ))}
        </Panel>

        <Panel>
          <View style={s.panelHead}><Text style={s.panelTitle}>안심 이벤트 로그</Text></View>
          <LogRow icon="bell" ibg="#FBE3E3" ic="#C42B28" title="안심 비상벨 호출" meta="06.27 22:14 · 여성 3번 칸" pill="정상 종료" tone="green" />
          <LogRow icon="scan" ibg="#FDEBD6" ic="#C8780A" title="불법촬영(몰카) 탐지" meta="RF·렌즈 상시 스캔 · 최근 감지 0건" pill="이상 없음" tone="green" />
          <LogRow icon="camera" ibg="#E3EDFB" ic={colors.primary} title="외부 CCTV 이상행동 감지" meta="06.27 23:02 · 출입구 외부" pill="확인 완료" tone="blue" />
          <LogRow icon="ear" ibg="#E8F1FF" ic={colors.primary} title="디지털 이상음 감지" meta="최근 7일 감지 0건" pill="이상 없음" tone="green" last />
        </Panel>

        <Panel>
          <View style={s.panelHead}><Text style={s.panelTitle}>민원 처리 현황</Text><Text style={s.panelMeta}>최근 3건</Text></View>
          <CivilRow no="#014" title="고장 신고 · 여성 2번 칸 변기" meta="오늘 11:32 접수" pill="처리중" tone="amber" />
          <CivilRow no="#013" title="비품 부족 · 화장지 보충 요청" meta="오늘 10:05 접수" pill="접수" tone="blue" />
          <CivilRow no="#012" title="청결 요청 · 세면대 주변" meta="어제 18:40 접수" pill="완료" tone="green" last />
        </Panel>

        <Panel style={{ justifyContent: 'space-between' }}>
          <View>
            <View style={s.panelHead}><Text style={s.panelTitle}>비품 재고 관리</Text><Text style={s.panelMeta}>지급 시 자동 차감</Text></View>
            <View style={s.padBox}>
              <View style={s.padHead}>
                <Text style={s.padName}>생리용품</Text>
                <Text style={[s.padQty, { color: padColor }]}>{padStock} / 30</Text>
              </View>
              <View style={s.padTrack}><View style={{ height: 9, borderRadius: 999, width: `${Math.round((padStock / 30) * 100)}%`, backgroundColor: padColor }} /></View>
              <View style={s.padCtrl}>
                <TouchableOpacity activeOpacity={0.8} onPress={() => setPad(padStock - 1)} style={s.stepBtn}><Icon name="minus" size={22} color={colors.primary} strokeWidth={2.6} /></TouchableOpacity>
                <Text style={s.stepVal}>{padStock}</Text>
                <TouchableOpacity activeOpacity={0.8} onPress={() => setPad(padStock + 1)} style={s.stepBtn}><Icon name="plus" size={22} color={colors.primary} strokeWidth={2.6} /></TouchableOpacity>
                <TouchableOpacity activeOpacity={0.8} onPress={() => setPad(padStock + 5)} style={s.quickBtn}><Text style={s.quickText}>+5</Text></TouchableOpacity>
                <TouchableOpacity activeOpacity={0.8} onPress={() => setPad(30)} style={s.quickBtn}><Text style={s.quickText}>가득 채움</Text></TouchableOpacity>
              </View>
            </View>
            <Text style={s.padNote}>보충 후 현재 수량을 설정하고 저장하면 대시보드에 즉시 반영됩니다.</Text>
          </View>
          {padSaved ? (
            <View style={[s.resupply, { backgroundColor: '#E4F6EC', flexDirection: 'row', justifyContent: 'center', gap: 8 }]}>
              <Icon name="check" size={20} color="#0F7A48" strokeWidth={2.4} />
              <Text style={[s.resupplyText, { color: '#0F7A48' }]}>현재 수량이 저장되었습니다</Text>
            </View>
          ) : (
            <TouchableOpacity activeOpacity={0.9} onPress={onSave} style={[s.resupply, { backgroundColor: colors.primary }]}>
              <Text style={[s.resupplyText, { color: '#fff' }]}>현재 수량 저장</Text>
            </TouchableOpacity>
          )}
        </Panel>
      </View>
    </View>
  );
}

function LogRow({ icon, ibg, ic, title, meta, pill, tone, last }) {
  return (
    <View style={[s.logRow, !last && s.rowBorder]}>
      <View style={[s.logIcon, { backgroundColor: ibg }]}><Icon name={icon} size={17} color={ic} /></View>
      <View style={{ flex: 1 }}>
        <Text style={s.logTitle}>{title}</Text>
        <Text style={s.logMeta}>{meta}</Text>
      </View>
      <StatusPill label={pill} tone={tone} />
    </View>
  );
}

function CivilRow({ no, title, meta, pill, tone, last }) {
  return (
    <View style={[s.civilRow, !last && s.rowBorder]}>
      <Text style={s.civilNo}>{no}</Text>
      <View style={{ flex: 1 }}>
        <Text style={s.logTitle}>{title}</Text>
        <Text style={s.logMeta}>{meta}</Text>
      </View>
      <StatusPill label={pill} tone={tone} />
    </View>
  );
}

function Bar({ label, v, pct, color }) {
  return (
    <View style={{ marginBottom: 10 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
        <Text style={{ fontSize: 14, color: '#5C6B86', fontFamily: FONT }}>{label}</Text>
        <Text style={{ fontSize: 14, fontWeight: '600', fontFamily: FONT }}>{v}</Text>
      </View>
      <View style={{ height: 9, borderRadius: 999, backgroundColor: '#EEF2F8' }}>
        <View style={{ height: 9, borderRadius: 999, width: `${pct}%`, backgroundColor: color }} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  // PIN
  pinRoot: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  pinCard: { width: 420, backgroundColor: '#fff', borderRadius: radius.xl, padding: 36, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  pinLock: { width: 58, height: 58, borderRadius: 18, backgroundColor: colors.tintBg, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  pinTitle: { fontSize: 26, fontWeight: '700', color: colors.text, fontFamily: FONT },
  pinSub: { fontSize: 16, color: colors.muted, marginTop: 4, fontFamily: FONT },
  pinDots: { fontSize: 32, letterSpacing: 6, color: colors.primary, marginVertical: 18 },
  pinErr: { fontSize: 15, color: colors.danger, fontWeight: '600', marginBottom: 6, fontFamily: FONT },
  pad: { width: '100%', flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 6 },
  padKey: { width: '31%', backgroundColor: '#F3F7FD', borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  padKeyText: { fontSize: 26, fontWeight: '700', color: colors.text, fontFamily: FONT },
  padBlank: { width: '31%', borderRadius: 14, paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  padCancel: { fontSize: 16, fontWeight: '600', color: colors.muted, fontFamily: FONT },
  pinHint: { fontSize: 14, color: '#A6B2C7', marginTop: 14, fontFamily: FONT },

  // 대시보드
  dash: { flex: 1, padding: 18, paddingHorizontal: 28 },
  dashHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dashIcon: { width: 46, height: 46, borderRadius: 14, backgroundColor: '#16223C', alignItems: 'center', justifyContent: 'center' },
  dashTitle: { fontSize: 25, fontWeight: '700', color: colors.text, fontFamily: FONT },
  dashSub: { fontSize: 14, color: colors.muted, marginTop: 1, fontFamily: FONT },
  exitBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.borderStrong, borderRadius: 13, paddingVertical: 11, paddingHorizontal: 18 },
  exitText: { fontSize: 16, fontWeight: '600', color: colors.danger, fontFamily: FONT },

  kpiRow: { flexDirection: 'row', gap: 14, marginTop: 14 },
  kpi: { flex: 1, backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.border },
  kpiLabel: { fontSize: 14, color: colors.muted, fontWeight: '500', fontFamily: FONT },
  kpiValue: { fontSize: 28, fontWeight: '700', color: colors.text, marginTop: 4, fontFamily: FONT },
  kpiUnit: { fontSize: 15, color: colors.subtle, fontWeight: '600' },

  quad: { flex: 1, marginTop: 14, flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  panel: { width: '48.5%', flexGrow: 1, flexBasis: '48.5%', backgroundColor: '#fff', borderRadius: 18, padding: 18, borderWidth: 1, borderColor: colors.border },
  panelHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  panelTitle: { fontSize: 18, fontWeight: '700', color: colors.text, fontFamily: FONT },
  panelMeta: { fontSize: 13, color: colors.subtle, fontFamily: FONT },

  envRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 7 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  envKey: { fontSize: 15, color: '#5C6B86', fontFamily: FONT },
  envVal: { fontSize: 15, fontWeight: '600', color: colors.text, fontFamily: FONT },

  logRow: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 7 },
  logIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  logTitle: { fontSize: 15, fontWeight: '600', color: colors.text, fontFamily: FONT },
  logMeta: { fontSize: 12.5, color: colors.subtle, fontFamily: FONT },

  civilRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 7 },
  civilNo: { fontSize: 13, color: colors.subtle, width: 46, fontFamily: FONT },

  resupply: { borderRadius: 14, paddingVertical: 13, alignItems: 'center' },
  resupplyText: { fontSize: 16, fontWeight: '700', fontFamily: FONT },

  padBox: { backgroundColor: '#F7F9FD', borderWidth: 1, borderColor: '#EAF0F8', borderRadius: 14, padding: 14 },
  padHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 7 },
  padName: { fontSize: 15, fontWeight: '700', color: colors.text, fontFamily: FONT },
  padQty: { fontSize: 15, fontWeight: '700', fontFamily: FONT },
  padTrack: { height: 9, borderRadius: 999, backgroundColor: '#EAEFF6', overflow: 'hidden' },
  padCtrl: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
  stepBtn: { width: 46, height: 46, borderRadius: 13, backgroundColor: '#fff', borderWidth: 1, borderColor: '#DCE5F2', alignItems: 'center', justifyContent: 'center' },
  stepVal: { minWidth: 74, textAlign: 'center', fontSize: 30, fontWeight: '800', color: colors.text, fontFamily: FONT },
  quickBtn: { flex: 1, height: 46, borderRadius: 13, backgroundColor: '#EAF1FC', alignItems: 'center', justifyContent: 'center' },
  quickText: { fontSize: 15, fontWeight: '700', color: colors.primary, fontFamily: FONT },
  padNote: { fontSize: 12.5, color: colors.subtle, marginTop: 8, fontFamily: FONT },
});
