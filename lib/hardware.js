// 키오스크 하드웨어(USB 시리얼) — NUC100 센서 수신 + 호퍼 모터 명령
// 개발 빌드에서만 동작. Expo Go 등 네이티브 모듈이 없으면 자동 no-op(앱은 정상 실행).
//
// 프로토콜(115200 8N1):
//   NUC100 → : "ENV,온도,습도,암모니아,미세먼지" / "DISP_OK" / "DISP_ERR,<사유>" / "READY"
//   → NUC100 : "DISPENSE"

import { recordEnvReading } from './api';

// 네이티브 모듈 안전 로드 (없으면 stub)
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
let rxBuf = '';
let sub = null;
const dispWaiters = []; // { resolve, reject, timer }

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

// 연결: 첫 USB 시리얼 장치 열고 수신 시작
export async function connect() {
  if (!USB) return false;
  const { UsbSerialManager, Parity } = USB;
  const devices = await UsbSerialManager.list();
  if (!devices || !devices.length) return false;
  const id = devices[0].deviceId;
  await UsbSerialManager.tryRequestPermission(id);
  port = await UsbSerialManager.open(id, { baudRate: 115200, parity: Parity.None, dataBits: 8, stopBits: 1 });
  sub = port.onReceived((ev) => {
    rxBuf += hexToStr(ev.data);
    let nl;
    while ((nl = rxBuf.indexOf('\n')) >= 0) {
      handleLine(rxBuf.slice(0, nl));
      rxBuf = rxBuf.slice(nl + 1);
    }
  });
  return true;
}

export function disconnect() {
  try { if (sub) sub.remove(); } catch (e) {}
  try { if (port) port.close(); } catch (e) {}
  sub = null; port = null; rxBuf = '';
}

// 배출 명령 → DISP_OK 대기 (타임아웃 6초). 하드웨어 없으면 즉시 성공(개발용).
export function dispense(timeoutMs = 6000) {
  if (!USB || !port) return Promise.resolve({ ok: true, simulated: true });
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      const idx = dispWaiters.findIndex((w) => w.timer === timer);
      if (idx >= 0) dispWaiters.splice(idx, 1);
      reject(new Error('timeout'));
    }, timeoutMs);
    dispWaiters.push({ resolve, reject, timer });
    port.send(strToHex('DISPENSE\n')).catch((e) => {
      clearTimeout(timer); dispWaiters.pop(); reject(e);
    });
  });
}
