// Supabase 클라이언트 (React Native)
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // .env 에 EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY 설정 필요
  console.warn('[supabase] 환경변수가 설정되지 않았습니다. .env.example 을 참고해 .env 를 만드세요.');
}

export const supabase = createClient(url ?? '', anonKey ?? '', {
  auth: {
    storage: AsyncStorage,      // 키오스크 세션을 기기에 영구 저장
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,  // RN 에는 URL 콜백 없음
  },
});
