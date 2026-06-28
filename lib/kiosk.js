// 키오스크 부팅/온보딩 로직
// 1) 익명 세션 보장 → 2) 페어링된 화장실(location) 조회 → 3) 미페어링이면 코드로 연결
import { supabase } from './supabase';

// 익명 세션 보장 (기기에 1회 생성 후 영구 유지)
export async function ensureSession() {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) return session;
  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) throw error;
  return data.session;
}

// 이 단말이 연결된 화장실 id (미페어링이면 null)
// RLS 정책상 devices 는 auth_user_id = auth.uid() 행만 보인다.
export async function fetchLocationId() {
  const { data, error } = await supabase
    .from('devices')
    .select('location_id')
    .maybeSingle();
  if (error) throw error;
  return data?.location_id ?? null;
}

// 페어링 코드로 단말 ↔ 화장실 연결
export async function claimDevice(code) {
  const { data, error } = await supabase.rpc('claim_device', { p_code: code });
  if (error) throw error;
  return data; // { device_id, location_id }
}

// 단말 하트비트 (선택) — 마지막 접속 시각 갱신용으로 추후 RPC 추가 가능
