// 관리자 화면 — PIN 인증(verify_admin_pin) + 대시보드(admin_dashboard) 실데이터
// 재고 설정/민원 처리도 실제 RPC. 환경 알람 패널만 센서라 정적 유지.
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import Icon from '../icons';
import { colors, radius, FONT } from '../theme';
import { verifyAdminPin, adminDashboard, adminSetInventory, adminUpdateComplaint } from '../lib/api';
import * as hardware from '../lib/hardware';

const fmt = (iso) => { try { const n = new Date(iso); const p = (x) => String(x).padStart(2, '0'); return `${p(n.getMonth() + 1)}.${p(n.getDate())} ${p(n.getHours())}:${p(n.getMinutes())}`; } catch { return ''; } };

export default function AdminScreen({ onExit }) {
  const [pin, setPin] = useState('');
  const [err, setErr] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [adminPin, setAdminPin] = useState(null);
  const [data, setData] = useState(null);
  const [padStock, setPadStock] = useState(0);
  const [padCap, setPadCap] = useState(30);
  const [padSaved, setPadSaved] = useState(false);

  const load = async (p) => {
    const d = await adminDashboard(p);
    setData(d);
    setPadStock(d.inventory_qty ?? 0);
    setPadCap(d.inventory_cap ?? 30);
  };

  const verify = async (np) => {
    setVerifying(true);
    try {
      const ok = await verifyAdminPin(np);
      if (!ok) { setPin(''); setErr(true); return; }
      setAdminPin(np); setPin(''); setErr(false);
      await load(np);
    } catch (e) {
      setPin(''); setErr(true);
    } finally {
      setVerifying(false);
    }
  };

  const press = (d) => {
    if (pin.length >= 4 || verifying) return;
    const np = pin + d;
    if (np.length === 4) { setPin(np); verify(np); }
    else { setPin(np); setErr(false); }
  };

  const setPad = (n) => { setPadStock(Math.max(0, Math.min(padCap, n))); setPadSaved(false); };
  const onSave = async () => {
    try { const r = await adminSetInventory(adminPin, padStock); setPadStock(r.quantity); setPadSaved(true); } catch (e) {}
  };
  const completeComplaint = async (id) => {
    try { await adminUpdateComplaint(adminPin, id, 'done'); await load(adminPin); } catch (e) {}
  };

  if (!adminPin) {
    return <PinGate pin={pin} err={err} verifying={verifying} onKey={press} onClear={() => { setPin(''); setErr(false); }} onCancel={onExit} />;
  }
  if (!data) {
    return <View style={s.loading}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }
  return <Dashboard onExit={onExit} data={data} padStock={padStock} padCap={padCap} setPad={setPad}
    padSaved={padSaved} onSave={onSave} onComplete={completeComplaint} />;
}

function PinGate({ pin, err, verifying, onKey, onClear, onCancel }) {
  const dots = '●'.repeat(pin.length) + '○'.repeat(4 - pin.length);
  const keys = ['1','2','3','4','5','6','7','8','9'];
  return (
    <View style={s.pinRoot}>
      <View style={s.pinCard}>
        <View style={s.pinLock}><Icon name="shieldPlain" size={30} color={colors.primary} /></View>
        <Text style={s.pinTitle}>관리자 인증</Text>
        <Text style={s.pinSub}>관리자 PIN을 입력하세요</Text>
        <Text style={s.pinDots}>{verifying ? '확인 중…' : dots}</Text>
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

function Panel({ children, style }) { return <View style={[s.panel, style]}>{children}</View>; }

function StatusPill({ label, tone }) {
  const map = { green: { bg: '#E4F6EC', fg: '#138A55' }, amber: { bg: '#FCEFD6', fg: '#B5730A' }, blue: { bg: '#E3EDFB', fg: '#2C6CD0' } };
  const t = map[tone] || map.green;
  return <View style={{ backgroundColor: t.bg, borderRadius: radius.pill, paddingVertical: 4, paddingHorizontal: 10 }}><Text style={{ color: t.fg, fontWeight: '700', fontSize: 12, fontFamily: FONT }}>{label}</Text></View>;
}

const SAFETY = {
  emergency_bell: { icon: 'bell', ibg: '#FBE3E3', ic: '#C42B28' },
  spycam_scan: { icon: 'scan', ibg: '#FDEBD6', ic: '#C8780A' },
  cctv: { icon: 'camera', ibg: '#E3EDFB', ic: '#2C6CD0' },
  abnormal_sound: { icon: 'ear', ibg: '#E8F1FF', ic: '#2C6CD0' },
};
const SAFETY_PILL = { normal: { l: '이상 없음', t: 'green' }, resolved: { l: '정상 종료', t: 'green' }, confirmed: { l: '확인 완료', t: 'blue' } };
const CIVIL_PILL = { received: { l: '접수', t: 'blue' }, in_progress: { l: '처리중', t: 'amber' }, done: { l: '완료', t: 'green' } };

const TEST_LABEL = { idle: '배출 테스트', testing: '동작 중…', ok: '딸깍! 성공', sim: '미연결(개발빌드 필요)', fail: '실패 · 미연결' };

function Dashboard({ onExit, data, padStock, padCap, setPad, padSaved, onSave, onComplete }) {
  const padLow = padStock <= 10;
  const padColor = padLow ? '#E8950C' : '#1FA463';
  const complaints = data.recent_complaints || [];
  const safety = data.recent_safety || [];
  const [testState, setTestState] = useState('idle');
  const runTest = async () => {
    if (testState === 'testing') return;
    setTestState('testing');
    try {
      const r = await hardware.dispense();          // "DISPENSE" 전송 → 릴레이/모터 구동
      setTestState(r && r.simulated ? 'sim' : 'ok'); // 하드웨어 없으면 simulated
    } catch (e) { setTestState('fail'); }
    setTimeout(() => setTestState('idle'), 2600);
  };
  const testColor = testState === 'ok' ? '#0F7A48' : testState === 'fail' ? colors.danger : testState === 'sim' ? '#B5730A' : colors.primary;
  return (
    <View style={s.dash}>
      <View style={s.dashHead}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <View style={s.dashIcon}><Icon name="home" size={26} color="#fff" /></View>
          <View>
            <Text style={s.dashTitle}>관리자 대시보드</Text>
            <Text style={s.dashSub}>현장 관리자 모드</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity activeOpacity={0.85} onPress={runTest} style={[s.testBtn, { borderColor: testColor }]}>
            {testState === 'testing'
              ? <ActivityIndicator size="small" color={testColor} />
              : <Icon name="dispense" size={18} color={testColor} />}
            <Text style={[s.testText, { color: testColor }]}>{TEST_LABEL[testState]}</Text>
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.8} onPress={onExit} style={s.exitBtn}>
            <Icon name="back" size={18} color={colors.danger} />
            <Text style={s.exitText}>나가기</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={s.kpiRow}>
        <Kpi label="오늘 생리용품 지급" value={String(data.today_dispensed ?? 0)} unit="건" />
        <Kpi label="생리용품 재고" value={String(padStock)} unit="개" color={padColor} />
        <Kpi label="미처리 민원" value={String(data.open_complaints ?? 0)} unit="건" color={(data.open_complaints ?? 0) > 0 ? '#B5730A' : undefined} />
        <Kpi label="평균 만족도" value={data.avg_satisfaction != null ? String(data.avg_satisfaction) : '-'} unit="/ 5.0" color={colors.primary} />
      </View>

      <View style={s.quad}>
        {/* 환경 알람 — 센서 미연동이라 정적 표시 */}
        <Panel>
          <View style={s.panelHead}><Text style={s.panelTitle}>환경 알람 현황</Text><StatusPill label="센서 연동 예정" tone="blue" /></View>
          {[['온도','24.7°C'],['습도','53%'],['암모니아','0.02ppm'],['미세먼지','12㎍/㎥']].map(([k,v],i,a)=>(
            <View key={k} style={[s.envRow, i<a.length-1 && s.rowBorder]}>
              <Text style={s.envKey}>{k}</Text>
              <Text style={s.envVal}>{v} <Text style={{ color: '#8492AB' }}>더미</Text></Text>
            </View>
          ))}
        </Panel>

        {/* 안심 이벤트 — 실데이터 */}
        <Panel>
          <View style={s.panelHead}><Text style={s.panelTitle}>안심 이벤트 로그</Text><Text style={s.panelMeta}>최근 {safety.length}건</Text></View>
          {safety.length === 0 && <Text style={s.empty}>최근 이벤트가 없습니다.</Text>}
          {safety.map((ev, i) => {
            const cfg = SAFETY[ev.type] || { icon: 'shieldPlain', ibg: '#E8F1FF', ic: colors.primary };
            const pill = SAFETY_PILL[ev.status] || { l: ev.status, t: 'green' };
            return <LogRow key={i} icon={cfg.icon} ibg={cfg.ibg} ic={cfg.ic} title={ev.title}
              meta={`${fmt(ev.occurred_at)}${ev.detail ? ' · ' + ev.detail : ''}`} pill={pill.l} tone={pill.t} last={i === safety.length - 1} />;
          })}
        </Panel>

        {/* 민원 처리 — 실데이터 + 완료 처리 */}
        <Panel>
          <View style={s.panelHead}><Text style={s.panelTitle}>민원 처리 현황</Text><Text style={s.panelMeta}>최근 {complaints.length}건</Text></View>
          {complaints.length === 0 && <Text style={s.empty}>접수된 민원이 없습니다.</Text>}
          {complaints.map((c, i) => {
            const pill = CIVIL_PILL[c.status] || { l: c.status, t: 'blue' };
            return (
              <View key={c.id} style={[s.civilRow, i < complaints.length - 1 && s.rowBorder]}>
                <Text style={s.civilNo}>{c.reception_no}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={s.logTitle}>{c.category}{c.detail ? ` · ${c.detail}` : ''}</Text>
                  <Text style={s.logMeta}>{fmt(c.created_at)} 접수</Text>
                </View>
                {c.status !== 'done' ? (
                  <TouchableOpacity onPress={() => onComplete(c.id)} style={s.doneBtn}><Text style={s.doneBtnText}>완료</Text></TouchableOpacity>
                ) : <StatusPill label={pill.l} tone={pill.t} />}
              </View>
            );
          })}
        </Panel>

        {/* 재고 관리 — 실데이터 */}
        <Panel style={{ justifyContent: 'space-between' }}>
          <View>
            <View style={s.panelHead}><Text style={s.panelTitle}>비품 재고 관리</Text><Text style={s.panelMeta}>지급 시 자동 차감</Text></View>
            <View style={s.padBox}>
              <View style={s.padHead}>
                <Text style={s.padName}>생리용품</Text>
                <Text style={[s.padQty, { color: padColor }]}>{padStock} / {padCap}</Text>
              </View>
              <View style={s.padTrack}><View style={{ height: 9, borderRadius: 999, width: `${Math.round((padStock / padCap) * 100)}%`, backgroundColor: padColor }} /></View>
              <View style={s.padCtrl}>
                <TouchableOpacity activeOpacity={0.8} onPress={() => setPad(padStock - 1)} style={s.stepBtn}><Icon name="minus" size={22} color={colors.primary} strokeWidth={2.6} /></TouchableOpacity>
                <Text style={s.stepVal}>{padStock}</Text>
                <TouchableOpacity activeOpacity={0.8} onPress={() => setPad(padStock + 1)} style={s.stepBtn}><Icon name="plus" size={22} color={colors.primary} strokeWidth={2.6} /></TouchableOpacity>
                <TouchableOpacity activeOpacity={0.8} onPress={() => setPad(padStock + 5)} style={s.quickBtn}><Text style={s.quickText}>+5</Text></TouchableOpacity>
                <TouchableOpacity activeOpacity={0.8} onPress={() => setPad(padCap)} style={s.quickBtn}><Text style={s.quickText}>가득 채움</Text></TouchableOpacity>
              </View>
            </View>
            <Text style={s.padNote}>보충 후 수량을 설정하고 저장하면 대시보드·키오스크에 즉시 반영됩니다.</Text>
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

const s = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  pinRoot: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  pinCard: { width: 420, backgroundColor: '#fff', borderRadius: radius.xl, padding: 36, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  pinLock: { width: 58, height: 58, borderRadius: 18, backgroundColor: colors.tintBg, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  pinTitle: { fontSize: 26, fontWeight: '700', color: colors.text, fontFamily: FONT },
  pinSub: { fontSize: 16, color: colors.muted, marginTop: 4, fontFamily: FONT },
  pinDots: { fontSize: 32, letterSpacing: 6, color: colors.primary, marginVertical: 18, fontFamily: FONT },
  pinErr: { fontSize: 15, color: colors.danger, fontWeight: '600', marginBottom: 6, fontFamily: FONT },
  pad: { width: '100%', flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 6 },
  padKey: { width: '31%', backgroundColor: '#F3F7FD', borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  padKeyText: { fontSize: 26, fontWeight: '700', color: colors.text, fontFamily: FONT },
  padBlank: { width: '31%', borderRadius: 14, paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  padCancel: { fontSize: 16, fontWeight: '600', color: colors.muted, fontFamily: FONT },

  dash: { flex: 1, padding: 18, paddingHorizontal: 28 },
  dashHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dashIcon: { width: 46, height: 46, borderRadius: 14, backgroundColor: '#16223C', alignItems: 'center', justifyContent: 'center' },
  dashTitle: { fontSize: 25, fontWeight: '700', color: colors.text, fontFamily: FONT },
  dashSub: { fontSize: 14, color: colors.muted, marginTop: 1, fontFamily: FONT },
  exitBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.borderStrong, borderRadius: 13, paddingVertical: 11, paddingHorizontal: 18 },
  exitText: { fontSize: 16, fontWeight: '600', color: colors.danger, fontFamily: FONT },
  testBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff', borderWidth: 1.5, borderColor: colors.primary, borderRadius: 13, paddingVertical: 11, paddingHorizontal: 18, minWidth: 150, justifyContent: 'center' },
  testText: { fontSize: 16, fontWeight: '700', fontFamily: FONT },

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
  empty: { fontSize: 14, color: colors.subtle, paddingVertical: 10, fontFamily: FONT },

  envRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 7 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  envKey: { fontSize: 15, color: '#5C6B86', fontFamily: FONT },
  envVal: { fontSize: 15, fontWeight: '600', color: colors.text, fontFamily: FONT },

  logRow: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 7 },
  logIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  logTitle: { fontSize: 15, fontWeight: '600', color: colors.text, fontFamily: FONT },
  logMeta: { fontSize: 12.5, color: colors.subtle, fontFamily: FONT },

  civilRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 7 },
  civilNo: { fontSize: 13, color: colors.subtle, width: 52, fontFamily: FONT },
  doneBtn: { backgroundColor: colors.primary, borderRadius: radius.pill, paddingVertical: 5, paddingHorizontal: 14 },
  doneBtnText: { color: '#fff', fontWeight: '700', fontSize: 12, fontFamily: FONT },

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
