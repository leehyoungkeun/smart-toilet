// 화면 ↔ 백엔드 데이터 레이어
// 모든 행위 RPC 는 서버가 current_location() 으로 화장실을 결정하므로 location_id 를 보내지 않는다.
// 조회/구독은 RLS 가 자기 화장실로 자동 스코핑하지만, 인덱스 활용을 위해 location_id 필터를 건다.
import { supabase } from './supabase';

// ── 환경 (Home / Env) ───────────────────────────────────
export async function getEnvLatest(locationId) {
  const { data, error } = await supabase
    .from('env_latest').select('*').eq('location_id', locationId).maybeSingle();
  if (error) throw error;
  return data;
}
export function subscribeEnvLatest(locationId, onChange) {
  const ch = supabase
    .channel(`env_latest:${locationId}`)
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'env_latest', filter: `location_id=eq.${locationId}` },
      (payload) => onChange(payload.new))
    .subscribe();
  return () => supabase.removeChannel(ch);
}

// ── 재고 (Sanitary / Admin) ─────────────────────────────
export async function getInventory(locationId, item = 'sanitary_pad') {
  const { data, error } = await supabase
    .from('inventory').select('*').eq('location_id', locationId).eq('item', item).maybeSingle();
  if (error) throw error;
  return data;
}
export function subscribeInventory(locationId, onChange) {
  const ch = supabase
    .channel(`inventory:${locationId}`)
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'inventory', filter: `location_id=eq.${locationId}` },
      (payload) => onChange(payload.new))
    .subscribe();
  return () => supabase.removeChannel(ch);
}

// ── 점검 (Inspection) ───────────────────────────────────
export async function getInspections(locationId, limit = 20) {
  const { data, error } = await supabase
    .from('inspections').select('*').eq('location_id', locationId)
    .order('inspected_at', { ascending: false }).limit(limit);
  if (error) throw error;
  return data ?? [];
}
export async function recordInspection(pin, inspector, items) {
  const { data, error } = await supabase.rpc('record_inspection', { p_pin: pin, p_inspector: inspector || null, p_items: items });
  if (error) throw error;
  return data;
}

// ── 청소 로그 (Cleaning) ────────────────────────────────
export async function getCleaningLogs(locationId, limit = 30) {
  const { data, error } = await supabase
    .from('cleaning_logs').select('*').eq('location_id', locationId)
    .order('cleaned_at', { ascending: false }).limit(limit);
  if (error) throw error;
  return data ?? [];
}
export async function recordCleaning(pin, cleaner, shift, items) {
  const { data, error } = await supabase.rpc('record_cleaning', {
    p_pin: pin, p_cleaner: cleaner || null, p_shift: shift || null, p_items: items || [],
  });
  if (error) throw error;
  return data; // { today_count }
}

// ── 키오스크 행위 RPC ───────────────────────────────────
export async function dispenseSanitary() {
  const { data, error } = await supabase.rpc('dispense_sanitary');
  if (error) throw error;
  return data; // { success, remaining } | { success:false, reason }
}

// ── QR 지급 세션 (스마트폰 스캔 흐름) ───────────────────
export async function createDispenseSession() {
  const { data, error } = await supabase.rpc('create_dispense_session');
  if (error) throw error;
  return data; // { session_id, token }
}
export function subscribeDispenseSession(sessionId, onChange) {
  const ch = supabase
    .channel(`dispense:${sessionId}`)
    .on('postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'dispense_sessions', filter: `id=eq.${sessionId}` },
      (payload) => onChange(payload.new))
    .subscribe();
  return () => supabase.removeChannel(ch);
}
// 폰이 스캔해서 열 모바일 웹페이지 URL (GitHub Pages 정적 호스팅)
// Supabase Edge Function 은 자사 도메인에서 HTML 렌더링을 막아(CSP sandbox) 사용 불가 → 정적 호스팅 사용.
const CLAIM_BASE = process.env.EXPO_PUBLIC_CLAIM_URL || 'https://leehyoungkeun.github.io/smart-toilet/claim/';
export const claimUrl = (token) => `${CLAIM_BASE}?token=${token}`;
export async function submitComplaint(category, detail, locationLabel) {
  const { data, error } = await supabase.rpc('submit_complaint', {
    p_category: category, p_detail: detail ?? null, p_location_label: locationLabel ?? null,
  });
  if (error) throw error;
  return Array.isArray(data) ? data[0] : data; // { reception_no, status, created_at }
}
export async function submitSatisfaction(rating, comment) {
  const { error } = await supabase.rpc('submit_satisfaction', { p_rating: rating, p_comment: comment ?? null });
  if (error) throw error;
}

// ── 현장 관리자 (PIN 게이트) ────────────────────────────
export async function verifyAdminPin(pin) {
  const { data, error } = await supabase.rpc('verify_admin_pin', { p_pin: pin });
  if (error) throw error;
  return data === true;
}
export async function adminDashboard(pin) {
  const { data, error } = await supabase.rpc('admin_dashboard', { p_pin: pin });
  if (error) throw error;
  return data;
}
export async function adminSetInventory(pin, qty) {
  const { data, error } = await supabase.rpc('admin_set_inventory', { p_pin: pin, p_qty: qty });
  if (error) throw error;
  return data; // { quantity, capacity }
}
export async function adminUpdateComplaint(pin, id, status) {
  const { data, error } = await supabase.rpc('admin_update_complaint', { p_pin: pin, p_id: id, p_status: status });
  if (error) throw error;
  return data;
}
