// Membaca variabel lingkungan dari .env.
// Penulisan `process.env.EXPO_PUBLIC_NAMA` harus persis seperti ini (bukan lewat destructuring atau
// nama dinamis), karena Expo mengganti teks tersebut dengan nilainya saat aplikasi dibundel.
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

// Gagal cepat dengan pesan jelas bila .env belum diisi, daripada galat samar dari Supabase.
if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error(
    'EXPO_PUBLIC_SUPABASE_URL dan EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY belum diisi di .env. ' +
      'Isi keduanya (lihat .env.example), lalu jalankan ulang dengan: npx expo start --clear',
  );
}

export const env = { supabaseUrl, supabasePublishableKey } as const;

