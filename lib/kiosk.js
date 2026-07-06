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

// 이 단말이 연결된 화장실 정보 (미페어링이면 null)
// RLS 정책상 devices 는 auth_user_id = auth.uid() 행만, locations 는 자기 화장실만 보인다.
export async function fetchLocation() {
  const { data, error } = await supabase
    .from('devices')
    .select('location_id, locations(name, sido, sigungu)')
    .maybeSingle();
  if (error) throw error;
  if (!data?.location_id) return null;
  return {
    id: data.location_id,
    name: data.locations?.name ?? null,
    sido: data.locations?.sido ?? null,
    sigungu: data.locations?.sigungu ?? null,
  };
}

// 페어링 코드로 단말 ↔ 화장실 연결
export async function claimDevice(code) {
  const { data, error } = await supabase.rpc('claim_device', { p_code: code });
  if (error) throw error;
  return data; // { device_id, location_id }
}

// 단말 하트비트 — last_seen_at 갱신 (콘솔의 온라인/오프라인 판정)
export async function heartbeat() {
  const { error } = await supabase.rpc('device_heartbeat');
  if (error) throw error;
}
