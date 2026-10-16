import type { Session } from '@supabase/supabase-js';
import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
    type ReactNode,
} from 'react';
import { AppState } from 'react-native';

import { supabase } from '@/lib/supabase';

import { authErrorMessage, EMAIL_SUDAH_TERDAFTAR } from './errors';

export type Role = 'user' | 'admin';

export type Profile = {
  id: string;
  nama: string;
  role: Role;
  is_aktif: boolean;
};

// loading : sesi atau profil sedang dimuat
// signedOut: belum masuk
// signedIn : sudah masuk, profil aktif sudah dimuat
// error    : sudah punya sesi tetapi profil gagal dimuat (misalnya tanpa internet)
export type AuthStatus = 'loading' | 'signedOut' | 'signedIn' | 'error';

export type AuthResult = { ok: true; needsConfirmation?: boolean } | { ok: false; message: string };

type AuthContextValue = {
  status: AuthStatus;
  session: Session | null;
  profile: Profile | null;
  isAdmin: boolean;
  /** Pesan yang perlu dibaca setelah dikeluarkan paksa (misalnya akun dinonaktifkan). */
  notice: string | null;
  clearNotice: () => void;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (nama: string, email: string, password: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
  /** Mencoba memuat ulang profil setelah status `error`. */
  retryProfile: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

type ProfileResult =
  { kind: 'ok'; profile: Profile } | { kind: 'missing' } | { kind: 'inactive' } | { kind: 'error' };

// RLS (Fase 2) mengizinkan pengguna membaca profilnya sendiri, termasuk saat akunnya nonaktif,
// jadi pengecekan is_aktif di sini selalu bisa dilakukan.
async function fetchProfile(userId: string): Promise<ProfileResult> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, nama, role, is_aktif')
    .eq('id', userId)
    .maybeSingle();

  if (error) return { kind: 'error' };
  if (!data) return { kind: 'missing' };
  if (!data.is_aktif) return { kind: 'inactive' };
  return { kind: 'ok', profile: data as Profile };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileState, setProfileState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [notice, setNotice] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const userId = session?.user.id ?? null;
  // Menyimpan ID pengguna terbaru supaya hasil permintaan yang terlambat (milik pengguna lama)
  // tidak menimpa keadaan pengguna baru.
  const userIdRef = useRef<string | null>(null);
  useEffect(() => {
    userIdRef.current = userId;
  }, [userId]);

  // 1) Ikuti perubahan sesi. PENTING: jangan memanggil fungsi Supabase lain (apalagi dengan await)
  // di dalam callback ini, karena bisa menyebabkan deadlock. Pekerjaan lanjutan dilakukan di effect.
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setSessionReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Keluar dari perangkat ini tanpa menunggu: dipakai saat akun nonaktif atau profil tidak ada.
  const forceSignOut = useCallback(async (message: string) => {
    setNotice(message);
    const { error } = await supabase.auth.signOut({ scope: 'local' });
    if (error) {
      // Sesi lokal sudah dibuang oleh supabase-js; bila status tetap macet, tampilkan layar galat.
      setProfileState('error');
    }
  }, []);

  const loadProfile = useCallback(
    async (id: string, silent: boolean) => {
      if (!silent) setProfileState('loading');
      const result = await fetchProfile(id);
      if (userIdRef.current !== id) return;

      switch (result.kind) {
        case 'ok':
          setProfile(result.profile);
          setProfileState('ready');
          break;
        case 'error':
          // Pemuatan senyap (saat aplikasi kembali aktif) yang gagal diabaikan saja.
          if (!silent) setProfileState('error');
          break;
        case 'missing':
          await forceSignOut('Profil akunmu tidak ditemukan. Hubungi admin untuk bantuan.');
          break;
        case 'inactive':
          await forceSignOut('Akunmu dinonaktifkan. Hubungi admin untuk bantuan.');
          break;
      }
    },
    [forceSignOut],
  );

  // 2) Setelah sesi siap dan ID pengguna berubah (masuk, keluar, ganti akun), muat profilnya.
  useEffect(() => {
    if (!sessionReady) return;
    if (!userId) {
      setProfile(null);
      setProfileState('idle');
      return;
    }
    void loadProfile(userId, false);
  }, [sessionReady, userId, reloadKey, loadProfile]);

  // 3) Saat aplikasi kembali dibuka, cek ulang profil. Bila admin menonaktifkan akun ini selagi
  // aplikasi di latar belakang, pengguna langsung dikeluarkan (tugas 3.6).
  useEffect(() => {
    if (!userId) return;
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void loadProfile(userId, true);
    });
    return () => subscription.remove();
  }, [userId, loadProfile]);

  const status: AuthStatus = !sessionReady
    ? 'loading'
    : !session
      ? 'signedOut'
      : profileState === 'ready' && profile
        ? 'signedIn'
        : profileState === 'error'
          ? 'error'
          : 'loading';

  const signIn = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    setNotice(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error ? { ok: false, message: authErrorMessage(error) } : { ok: true };
  }, []);

  const signUp = useCallback(
    async (nama: string, email: string, password: string): Promise<AuthResult> => {
      setNotice(null);
      // `nama` dibaca trigger handle_new_user (Fase 2) untuk mengisi profiles.nama.
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { nama } },
      });
      if (error) return { ok: false, message: authErrorMessage(error) };

      // Bila konfirmasi email aktif dan emailnya sudah terdaftar, Supabase tidak mengirim galat
      // (agar alamat email tidak bisa ditebak) tetapi mengembalikan pengguna tanpa identitas.
      if (data.user && data.user.identities?.length === 0) {
        return { ok: false, message: EMAIL_SUDAH_TERDAFTAR };
      }
      // Tanpa sesi berarti akun menunggu konfirmasi email.
      return { ok: true, needsConfirmation: !data.session };
    },
    [],
  );

  const signOut = useCallback(async () => {
    setNotice(null);
    // Mode lokal: hanya perangkat ini. Bila internet putus, supabase-js tetap membuang sesi lokal
    // sebelum mengembalikan galat, jadi pengguna tetap keluar dari aplikasi.
    const { error } = await supabase.auth.signOut({ scope: 'local' });
    if (error && __DEV__) {
      console.warn('signOut:', error.message);
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      session,
      profile: status === 'signedIn' ? profile : null,
      isAdmin: status === 'signedIn' && profile?.role === 'admin',
      notice,
      clearNotice: () => setNotice(null),
      signIn,
      signUp,
      signOut,
      retryProfile: () => setReloadKey((key) => key + 1),
    }),
    [status, session, profile, notice, signIn, signUp, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth harus dipakai di dalam <AuthProvider>.');
  }
  return context;
}

