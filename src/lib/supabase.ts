import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, processLock } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';
import 'react-native-url-polyfill/auto';

import { env } from './env';

// Satu klien Supabase untuk seluruh aplikasi. Hanya memakai publishable key: aman berada di
// aplikasi karena akses data dibatasi RLS (Fase 2). Jangan pernah memakai secret key di sini.
export const supabase = createClient(env.supabaseUrl, env.supabasePublishableKey, {
  auth: {
    // Di Android/iOS sesi disimpan di AsyncStorage agar login bertahan setelah aplikasi ditutup.
    // Di web, supabase-js memakai localStorage bawaan browser.
    ...(Platform.OS !== 'web' ? { storage: AsyncStorage } : {}),
    autoRefreshToken: true,
    persistSession: true,
    // Tidak ada URL callback di aplikasi mobile, jadi pemindaian URL dimatikan.
    detectSessionInUrl: false,
    lock: processLock,
  },
});

// Perbarui token otomatis hanya saat aplikasi terlihat di layar (anjuran dokumentasi Supabase).
// Cukup didaftarkan sekali, dan modul ini hanya dimuat sekali.
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}

