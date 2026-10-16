import { isAuthRetryableFetchError, type AuthError } from '@supabase/supabase-js';

export const EMAIL_SUDAH_TERDAFTAR = 'Email ini sudah terdaftar. Silakan masuk.';

// Mengubah galat Supabase Auth menjadi pesan Bahasa Indonesia yang ramah.
// Daftar kode: https://supabase.com/docs/guides/auth/debugging/error-codes
export function authErrorMessage(error: AuthError): string {
  // Jaringan putus atau server tidak terjangkau.
  if (isAuthRetryableFetchError(error)) {
    return 'Tidak bisa terhubung ke server. Periksa koneksi internetmu, lalu coba lagi.';
  }
  switch (error.code) {
    case 'invalid_credentials':
      return 'Email atau kata sandi salah.';
    case 'email_not_confirmed':
      return 'Email belum dikonfirmasi. Buka email dari Scannest dan klik tautan konfirmasinya.';
    case 'user_already_exists':
    case 'email_exists':
      return EMAIL_SUDAH_TERDAFTAR;
    case 'weak_password':
      return 'Kata sandi terlalu lemah. Pakai kombinasi yang lebih sulit ditebak.';
    case 'over_request_rate_limit':
    case 'over_email_send_rate_limit':
      return 'Terlalu banyak percobaan. Tunggu beberapa menit, lalu coba lagi.';
    case 'signup_disabled':
    case 'email_provider_disabled':
      return 'Pendaftaran sedang ditutup. Coba lagi nanti.';
    case 'email_address_invalid':
      return 'Alamat email ini tidak diterima. Pakai alamat email yang lain.';
    case 'user_banned':
      return 'Akun ini sedang diblokir. Hubungi admin untuk bantuan.';
    default:
      if (__DEV__) {
        // Hanya di mode pengembangan: tampilkan kode asli agar mudah dilacak.
        console.warn('Galat Auth tidak dikenal:', error.code, error.message);
      }
      return 'Terjadi kesalahan. Coba lagi sebentar lagi.';
  }
}
