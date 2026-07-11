// 키오스크 부팅 상태 전역 제공
// status: 'loading' | 'pairing' | 'ready' | 'error'
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { ensureSession, fetchLocation, claimDevice, heartbeat } from '../lib/kiosk';
import * as hardware from '../lib/hardware';

const KioskContext = createContext(null);

export function KioskProvider({ children }) {
  const [state, setState] = useState({ status: 'loading', location: null, error: null });
  const hb = useRef(null);

  const boot = useCallback(async () => {
    setState((s) => ({ ...s, status: 'loading', error: null }));
    try {
      await ensureSession();
      const location = await fetchLocation();
      setState({ status: location ? 'ready' : 'pairing', location, error: null });
    } catch (e) {
      setState({ status: 'error', location: null, error: e?.message ?? String(e) });
    }
  }, []);

  useEffect(() => { boot(); }, [boot]);

  // 페어링 완료(ready) 상태에서 60초마다 하트비트 → 콘솔 온라인 표시
  useEffect(() => {
    if (state.status !== 'ready') return;
    heartbeat().catch(() => {});
    hb.current = setInterval(() => heartbeat().catch(() => {}), 60000);
    return () => clearInterval(hb.current);
  }, [state.status]);

  // 하드웨어(NUC120 센서보드) USB 시리얼 — 개발 빌드에서만 실동작(Expo Go는 no-op)
  // 6초마다 연결 상태 점검 → USB를 뺐다 꽂아도(장치ID 변경) 자동 재연결. ENV 수신 시 Supabase 자동 업로드.
  useEffect(() => {
    if (state.status !== 'ready') return;
    let stop = false, timer = null;
    const tick = async () => {
      if (stop) return;
      try { await hardware.ensureConnected(); } catch (e) {}
      if (!stop) timer = setTimeout(tick, 6000);
    };
    tick();
    return () => { stop = true; if (timer) clearTimeout(timer); hardware.disconnect(); };
  }, [state.status]);

  const pair = useCallback(async (code) => {
    const res = await claimDevice(code);
    const location = await fetchLocation();
    setState({ status: 'ready', location, error: null });
    return res;
  }, []);

  return (
    <KioskContext.Provider
      value={{
        ...state,
        locationId: state.location?.id ?? null,
        locationName: state.location?.name ?? null,
        retry: boot,
        pair,
      }}
    >
      {children}
    </KioskContext.Provider>
  );
}

export function useKiosk() {
  const v = useContext(KioskContext);
  if (!v) throw new Error('useKiosk 는 KioskProvider 안에서만 사용할 수 있습니다.');
  return v;
}
