// 키오스크 부팅 상태 전역 제공
// status: 'loading' | 'pairing' | 'ready' | 'error'
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { ensureSession, fetchLocationId, claimDevice, heartbeat } from '../lib/kiosk';

const KioskContext = createContext(null);

export function KioskProvider({ children }) {
  const [state, setState] = useState({ status: 'loading', locationId: null, error: null });
  const hb = useRef(null);

  const boot = useCallback(async () => {
    setState((s) => ({ ...s, status: 'loading', error: null }));
    try {
      await ensureSession();
      const locationId = await fetchLocationId();
      setState({ status: locationId ? 'ready' : 'pairing', locationId, error: null });
    } catch (e) {
      setState({ status: 'error', locationId: null, error: e?.message ?? String(e) });
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

  const pair = useCallback(async (code) => {
    const res = await claimDevice(code);
    setState({ status: 'ready', locationId: res.location_id, error: null });
    return res;
  }, []);

  return (
    <KioskContext.Provider value={{ ...state, retry: boot, pair }}>
      {children}
    </KioskContext.Provider>
  );
}

export function useKiosk() {
  const v = useContext(KioskContext);
  if (!v) throw new Error('useKiosk 는 KioskProvider 안에서만 사용할 수 있습니다.');
  return v;
}
