// 키오스크 하드웨어(USB 시리얼) — NUC120 센서 수신 + 배출 명령
// 개발 빌드에서만 동작. Expo Go 등 네이티브 모듈이 없으면 자동 no-op.
//
// 프로토콜(115200 8N1):
//   NUC120 → : "ENV,온도,습도,암모니아,미세먼지" / "DISP_OK" / "DISP_ERR,<사유>" / "READY"
//   → NUC120 : "DISPENSE"
//
// 재연결: ensureConnected() 를 주기적으로 호출하면, USB를 뺐다 꽂아도(장치ID 변경) 자동 재연결.

import { recordEnvReading } from './api';

let USB = null;
try { USB = require('react-native-usb-serialport-for-android'); } catch (e) { USB = null; }

export const hardwareAvailable = () => !!USB;

const hexToStr = (hex) => {
  let s = '';
  for (let i = 0; i < hex.length; i += 2) s += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
  return s;
};
const strToHex = (str) => str.split('').map((c) => c.charCodeAt(0).toString(16).padStart(2, '0')).join('');

let port = null;
let openedId = null;
let rxBuf = '';
let sub = null;
const dispWaiters = [];

export const isConnected = () => !!port;

function handleLine(line) {
  const t = line.trim();
  if (!t) return;
  if (t.startsWith('ENV,')) {
    const p = t.split(',');
    const [temp, hum, amm, pm] = [p[1], p[2], p[3], p[4]].map(Number);
    if ([temp, hum, amm, pm].every((n) => Number.isFinite(n))) {
      recordEnvReading(temp, hum, amm, pm).catch(() => {});
    }
  } else if (t === 'DISP_OK') {
    const w = dispWaiters.shift(); if (w) { clearTimeout(w.timer); w.resolve({ ok: true }); }
  } else if (t.startsWith('DISP_ERR')) {
    const reason = t.split(',')[1] || 'error';
    const w = dispWaiters.shift(); if (w) { clearTimeout(w.timer); w.reject(new Error(reason)); }
  }
}

export function disconnect() {
  try { if (sub) sub.remove(); } catch (e) {}
  try { if (port) port.close(); } catch (e) {}
  sub = null; port = null; openedId = null; rxBuf = '';
  while (dispWaiters.length) { const w = dispWaiters.shift(); clearTimeout(w.timer); w.reject(new Error('disconnected')); }
}

async function openDevice(id) {
  const { UsbSerialManager, Parity } = USB;
  await UsbSerialManager.tryRequestPermission(id);
  const p = await UsbSerialManager.open(id, { baudRate: 115200, parity: Parity.None, dataBits: 8, stopBits: 1 });
  sub = p.onReceived((ev) => {
    rxBuf += hexToStr(ev.data);
    let nl;
    while ((nl = rxBuf.indexOf('\n')) >= 0) { handleLine(rxBuf.slice(0, nl)); rxBuf = rxBuf.slice(nl + 1); }
  });
  port = p; openedId = id;
}

// 장치 상태에 맞춰 연결 유지/재연결. 주기적으로(예: 6초) 호출.
export async function ensureConnected() {
  if (!USB) return false;
  const { UsbSerialManager } = USB;
  let devices = [];
  try { devices = await UsbSerialManager.list(); } catch (e) { return isConnected(); }
  if (!devices || !devices.length) { if (port) disconnect(); return false; }  // 뺌 → 정리
  const id = devices[0].deviceId;
  if (port && openedId === id) return true;   // 같은 장치 이미 연결됨
  disconnect();                                // 재삽입(ID 변경) 또는 미연결 → 새로 연결
  try { await openDevice(id); return true; } catch (e) { disconnect(); return false; }
}

// 하위호환
export async function connect() { return ensureConnected(); }

// 배출 명령 → DISP_OK 대기. 미연결이면 재연결 시도 후 실패 시 에러.
export async function dispense(timeoutMs = 6000) {
  if (!USB) return { ok: true, simulated: true };   // Expo Go 등 — no-op
  if (!port) { await ensureConnected(); }
  if (!port) throw new Error('not_connected');      // 하드웨어 지원되나 장치 없음/미연결
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      const i = dispWaiters.findIndex((w) => w.timer === timer);
      if (i >= 0) dispWaiters.splice(i, 1);
      reject(new Error('timeout'));
    }, timeoutMs);
    dispWaiters.push({ resolve, reject, timer });
    port.send(strToHex('DISPENSE\n')).catch((e) => {
      clearTimeout(timer);
      const i = dispWaiters.findIndex((w) => w.timer === timer);
      if (i >= 0) dispWaiters.splice(i, 1);
      disconnect();   // 포트가 죽었으면 정리 → 다음 ensureConnected가 재연결
      reject(e);
    });
  });
}
