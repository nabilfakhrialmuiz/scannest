# Panduan Fase 3: Autentikasi dan Peran (Scannest)

**Untuk:** Nabil Fakhri Al Muiz · **Terakhir diperbarui:** 16 Oktober 2026 · **Sinkron dengan:** `ROADMAP.md` v0.8 (Fase 3, tugas 3.0 sampai 3.9)

Setelah Fase 3 selesai, Scannest punya **daftar, masuk, dan keluar yang sungguhan**: sesi bertahan setelah aplikasi ditutup, pengguna biasa tidak bisa membuka panel admin, dan akun yang dinonaktifkan otomatis dikeluarkan. Kamu juga akan memahami alur login di balik layar, karena seluruh fase berikutnya (kamera, unggah, dokumen, admin) bergantung pada satu hal: *siapa yang sedang masuk*.

**Apa yang sudah dan belum saya uji:**

- Sudah: seluruh kode di panduan ini saya jalankan sebagai aplikasi web (React Native Web, Expo SDK 54) melawan **server Supabase tiruan** buatan saya di sandbox. **39 skenario lulus**: daftar (termasuk email sudah terdaftar, konfirmasi email aktif, domain ditolak), masuk (isian kosong, email salah format, sandi salah, berhasil), sesi bertahan setelah reload, keluar, internet putus saat masuk dan saat keluar, profil gagal dimuat lalu "Coba lagi", akun nonaktif, profil hilang, akun dinonaktifkan saat aplikasi berjalan, dan user biasa yang mencoba membuka `/admin`. `typecheck`, `lint`, `format:check`, dan `cek:kontras` bersih. Urutan langkah di panduan ini juga saya putar ulang dari repo Fase 1 yang bersih: **0 galat typecheck di setiap tahap**.
- Belum: **HP-mu / Expo Go** (penyimpanan sesi AsyncStorage di perangkat asli, perilaku keyboard Android, gestur kembali), **proyek Supabase sungguhan milikmu** (templat email, batas kirim email, pengaturan *Confirm email*), dan perilaku tepat server asli pada kasus langka (misalnya bentuk jawaban `signUp` untuk email yang sudah terdaftar saat konfirmasi email aktif; kodenya sudah menjaga kasus itu, tetapi saya hanya mengujinya dengan tiruan). Uji tugas 3.9 di HP-mu adalah bukti sebenarnya.

---

## Daftar isi

1. Peta tugas dan keputusan
2. Tugas 3.0: tutup Fase 2 dan siapkan cabang
3. Tugas 3.1: pasang paket
4. Tugas 3.2: klien Supabase
5. Tugas 3.3 (bagian 1): validasi zod dan pesan galat
6. Tugas 3.4, 3.6, dan 3.7 (bagian 1): sesi, profil, dan akun nonaktif
7. Tugas 3.3 (bagian 2) dan 3.7 (bagian 2): komponen dan layar
8. Tugas 3.5: pembatas rute (route guard)
9. Tugas 3.8: bersih-bersih dari Fase 1
10. Tugas 3.9: uji di HP, commit, pull request
11. Yang perlu diingat saat coding nanti
12. Pemecahan masalah
13. Checklist akhir Fase 3
14. Daftar berkas Fase 3
15. Sumber

---

## 1. Peta tugas dan keputusan

| Tugas | Isi | Bagian |
|---|---|---|
| 3.0 | Tutup Fase 2 (dokumen masuk repo), cabang `fase-3-auth` | 2 |
| 3.1 | Pasang `@supabase/supabase-js`, `@react-native-async-storage/async-storage`, `react-native-url-polyfill`, `zod` | 3 |
| 3.2 | `src/lib/env.ts` dan `src/lib/supabase.ts` (klien dengan sesi tersimpan) | 4 |
| 3.3 | Validasi zod (bagian 5) dan layar daftar serta masuk sungguhan (bagian 7) | 5, 7 |
| 3.4 | Context sesi: pengguna, `profiles.role`, status loading | 6 |
| 3.5 | Route guard: belum masuk ke `(auth)`, hanya admin ke `admin/` | 8 |
| 3.6 | Akun `is_aktif = false` dikeluarkan dengan pesan jelas | 6 |
| 3.7 | Keluar dan penanganan galat (sandi salah, jaringan putus) | 5, 6, 7 |
| 3.8 | Hapus `DevShortcuts`, keyboard tidak menutupi kolom | 7, 9 |
| 3.9 | Uji di HP, commit, PR, CI hijau, merge | 10 |

**Pintasan (opsional):** `scannest-fase3-kode.zip` berisi 18 berkas kode Fase 3 dengan susunan folder yang sama dengan repomu. Kamu boleh mengekstraknya ke `C:\scannest` (timpa berkas yang ada) alih-alih mengetik satu per satu, tetapi baca bagian 4 sampai 9 agar paham isinya; setelah itu tetap hapus `DevShortcuts.tsx` (bagian 9.2) dan jalankan perintah di bagian 3.

Nomor tugas sama dengan `ROADMAP.md`. Bagian di panduan ini disusun menurut **urutan pengerjaan** (berkas yang dibutuhkan dibuat lebih dulu), jadi tugas 3.3, 3.4, dan 3.7 muncul di dua tempat.

### Alur masuk, dalam satu gambar

```
Layar Masuk ──signIn()──▶ Supabase Auth ──▶ sesi (token) disimpan di AsyncStorage
                                  │
                 onAuthStateChange ◀┘  (AuthProvider tahu ada sesi baru)
                                  │
                    baca baris profiles milik pengguna  ◀── RLS: hanya miliknya
                                  │
          ┌───────────────────────┼────────────────────────┐
     is_aktif = false        profil tidak ada          profil aktif
     keluar paksa + pesan    keluar paksa + pesan      status "signedIn"
                                                              │
                                  Stack.Protected membuka (tabs), dan admin/ bila role = admin
```

### Keputusan teknis (dicek 14 Oktober 2026)

**K19: tempat menyimpan sesi.**

| Pilihan | Pro | Kontra |
|---|---|---|
| **AsyncStorage** (dipilih) | Ini yang dipakai quickstart dan tutorial resmi Supabase untuk Expo; jalan di Expo Go; kodenya paling sedikit | Tidak dienkripsi: token sesi tersimpan sebagai teks di penyimpanan aplikasi (terlindung oleh sandbox Android, tetapi bukan enkripsi) |
| `expo-sqlite/localStorage` | Satu paket yang sudah ada di Expo | Itu yang tertulis di roadmap lama; dokumentasi Supabase terbaru sudah tidak memakainya, jadi saya tidak mengikutinya |
| SecureStore + enkripsi AES | Token terenkripsi, kuncinya di penyimpanan aman perangkat | Butuh 3 paket tambahan dan kelas penyimpanan sendiri; dokumentasi sendiri memperingatkan kesalahan kecil bisa membuka celah |

Keputusan: AsyncStorage sekarang, SecureStore dicatat sebagai backlog **B10** (P2, Fase 9). *Koreksi roadmap: tugas 3.1 lama menyebut `expo-sqlite`; sekarang `@react-native-async-storage/async-storage`.* Sumber: dokumentasi Supabase, "Use Supabase Auth with React Native" dan "Build a User Management App with Expo React Native".

**K20: pembatas rute.**

| Pilihan | Pro | Kontra |
|---|---|---|
| **`Stack.Protected`** (dipilih) | Fitur bawaan Expo Router: saat `guard` berubah, pengguna dipindahkan otomatis dan riwayat layar terlindung dibersihkan | Hanya di sisi klien; `redirectTo` baru ada di SDK 58, jadi di SDK 54 tujuan pengalihan ditentukan oleh *anchor* (`(tabs)`) atau layar pertama yang diizinkan |
| `<Redirect>` manual di tiap layar | Mudah dipahami | Mudah lupa di satu layar; muncul kedipan layar terlarang |

Keamanan data tetap ada di RLS (Fase 2); pembatas ini hanya mengatur tampilan. Sumber: dokumentasi Expo Router, "Protected routes".

**K21: peran dibaca dari tabel `profiles`**, bukan dari token. Pro: satu sumber kebenaran, dan pengguna tidak bisa mengubah `role` (hak tulis kolom dikunci di Fase 2). Kontra: satu permintaan tambahan setiap kali masuk dan saat aplikasi kembali dibuka.

**K22: keluar memakai `scope: 'local'`** (hanya perangkat ini). Pro: tidak ikut mengeluarkan perangkat lain. Kontra: sesi di server baru berakhir saat kedaluwarsa, bukan seketika. Bila internet putus saat keluar, supabase-js tetap membuang sesi lokal (sudah saya uji), sehingga pengguna tetap keluar dari aplikasi.

---

## 2. Tugas 3.0: tutup Fase 2 dan siapkan cabang

### 2.1 Mengapa ini dulu

Kamu melaporkan bahwa `ROADMAP.md` dan `panduan-fase-0` sampai `panduan-fase-2` belum pernah masuk ke folder proyek. Saya cek repo publikmu pada 14 Oktober 2026: cabang `main` berhenti di PR #1 (Fase 1), tidak ada cabang Fase 2, dan empat berkas nyasar (`tatus`, `h -u origin main`, `(`, `router.push(item.href)}`) masih ada. Jadi tugas 2.0 dan 2.9 sebenarnya belum tertutup. Roadmap adalah satu-satunya sumber kebenaran urutan kerja, dan README/portofolio GitHub-mu kelak akan merujuknya, jadi dokumennya harus ada di repo.

### 2.2 Salin dokumen ke proyek

1. Unduh `scannest-dokumen.zip` dari percakapan ini, klik kanan, **Extract All**.
2. Hasilnya berisi `ROADMAP.md` dan folder `docs` (lima berkas `.md`). Salin **keduanya** ke `C:\scannest`:
   - `ROADMAP.md` berada **di akar** (sejajar `package.json`).
   - folder `docs` juga di akar. Hasil akhirnya: `C:\scannest\docs\panduan-fase-0.md` dan seterusnya.
3. Jangan menyalin apa pun selain dua itu.

Cek di CMD:

```bash
cd C:\scannest
dir docs
```

Harus tampil `panduan-fase-0.md`, `panduan-fase-1.md`, `panduan-fase-2.md`, `panduan-fase-3.md`, dan `panduan-supabase.md`.

### 2.3 Cabang, hapus berkas nyasar, commit

```bash
git switch main
git pull
git switch -c fase-2-database
git rm tatus "h -u origin main" "(" "router.push(item.href)}"
git add ROADMAP.md docs
git status
```

`git status` harus menunjukkan **hanya** empat berkas dihapus dan `ROADMAP.md` serta lima berkas `docs/` ditambahkan. Bila Git berkata sebuah berkas tidak ditemukan, jalankan `git ls-files` untuk melihat nama persisnya. Lalu:

```bash
git commit -m "docs: tambah roadmap dan panduan fase 0 sampai 3, hapus berkas nyasar"
git push -u origin fase-2-database
```

Buka tautan pull request yang dicetak Git, tunggu **CI hijau**, lalu **Merge**. Setelah itu:

```bash
git switch main
git pull
git switch -c fase-3-auth
```

Semua pekerjaan Fase 3 dilakukan di cabang `fase-3-auth`.

### 2.4 Cek pengaturan Supabase sebelum menguji

- **Confirm email**: untuk pengembangan, matikan (panduan Supabase A5). Bila masih menyala, daftar akan menampilkan layar "Cek emailmu" dan kamu tidak akan langsung masuk. Kedua jalur sudah ditangani aplikasi, tetapi tautan konfirmasi di email belum bisa membuka aplikasi (lihat backlog B9), jadi matikan dulu agar uji lancar.
- **Akun uji:** kamu sudah punya akunmu (admin) dan dua akun uji dari Fase 2. Pakai akun uji biasa untuk menguji peran `user`. Alamat email yang dipakai harus tampak valid; Supabase menolak domain contoh seperti `example.com` (kode `email_address_invalid`).
- `.env` sudah berisi URL dan publishable key (tugas 0.9). Kunci `sb_secret_...` **tidak boleh** ada di sana.
- **Periksa `.env` sekarang**, karena Fase 3 adalah pertama kalinya aplikasi benar-benar membacanya: di CMD jalankan `cd C:\scannest`, `dir /a .env*`, lalu `type .env`. Harus ada berkas bernama persis `.env` (bukan `.env.txt`) dengan dua baris yang **keduanya berisi nilai**: `EXPO_PUBLIC_SUPABASE_URL=https://REF.supabase.co` dan `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...`. Bila kosong, isi dari Dashboard **Connect** atau **Settings > API Keys** (panduan Supabase A3 dan A4).

---

## 3. Tugas 3.1: pasang paket

```bash
npx expo install @supabase/supabase-js @react-native-async-storage/async-storage react-native-url-polyfill
npm install zod
```

| Paket | Fungsi |
|---|---|
| `@supabase/supabase-js` | Klien resmi Supabase (login, database). |
| `@react-native-async-storage/async-storage` | Penyimpanan kunci-nilai di perangkat, tempat sesi disimpan. `expo install` memilih versi yang cocok dengan SDK 54. |
| `react-native-url-polyfill` | Melengkapi kelas `URL` yang dipakai supabase-js di React Native. Dipasang sesuai quickstart resmi. |
| `zod` | Validasi isian formulir (pesan galat per kolom). Versi 4. |

Pakai `npx expo install` untuk tiga paket pertama (bukan `npm install`) agar versi sesuai SDK 54; `zod` bukan paket native, jadi `npm install` biasa.

Cek: `package.json` memuat keempatnya, lalu `npm run typecheck` tetap **0 galat**.

---

## 4. Tugas 3.2: klien Supabase

### 4.1 `src/lib/env.ts`

Folder `src/lib` belum ada; buat lewat VS Code (klik kanan `src`, **New Folder**, ketik `lib`).

**Berkas:** `src/lib/env.ts` (berkas baru: buat)

```ts
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
```

| Bagian | Penjelasan |
|---|---|
| `process.env.EXPO_PUBLIC_SUPABASE_URL` | Nilai dari `.env`. Awalan `EXPO_PUBLIC_` membuatnya ikut terbundel ke aplikasi, jadi **hanya** untuk nilai yang boleh publik. Penulisannya harus persis begini; Expo mengganti teks ini saat membundel, sehingga destructuring atau nama dinamis tidak bekerja. |
| `if (!supabaseUrl \|\| !supabasePublishableKey) throw ...` | Berhenti dengan pesan jelas bila `.env` kosong, daripada galat samar dari Supabase. |
| `export const env = {...} as const` | Satu pintu untuk membaca konfigurasi; tipenya sudah pasti `string` (bukan `undefined`) setelah pengecekan di atas. |

### 4.2 `src/lib/supabase.ts`

**Berkas:** `src/lib/supabase.ts` (berkas baru: buat)

```ts
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
```

| Bagian | Penjelasan |
|---|---|
| `createClient(url, key, {...})` | Membuat satu klien yang dipakai seluruh aplikasi. Selalu impor dari sini: `import { supabase } from '@/lib/supabase'`. |
| `storage: AsyncStorage` | Sesi (token) disimpan di perangkat sehingga login bertahan setelah aplikasi ditutup. Hanya untuk non-web; di web supabase-js memakai `localStorage`. |
| `autoRefreshToken`, `persistSession` | Token diperbarui otomatis sebelum kedaluwarsa dan sesi disimpan. |
| `detectSessionInUrl: false` | Aplikasi mobile tidak membaca sesi dari URL (itu untuk situs web). |
| `lock: processLock` | Mencegah dua proses memperbarui token bersamaan; dianjurkan quickstart resmi untuk React Native. |
| `AppState.addEventListener(...)` | Pembaruan token hanya berjalan saat aplikasi terlihat. Cukup didaftarkan sekali, dan modul ini dimuat sekali. |

**Selesai bila:** `npm run typecheck` 0 galat. Jalankan ulang Metro dengan `npx expo start --clear` setiap kali `.env` berubah (Metro menyimpan nilai lama di cache).

---

## 5. Tugas 3.3 (bagian 1): validasi zod dan pesan galat

Folder `src/features/auth` belum ada; buat `src/features`, lalu `auth` di dalamnya.

### 5.1 `src/features/auth/schemas.ts`

**Berkas:** `src/features/auth/schemas.ts` (berkas baru: buat)

```ts
import { z } from 'zod';

// Aturan isian. Batas nama (80) sama dengan constraint kolom profiles.nama di database (Fase 2).
const email = z
  .string()
  .trim()
  .min(1, 'Email wajib diisi')
  .pipe(z.email('Format email belum benar, contoh: nama@email.com'));

const passwordBaru = z
  .string()
  .min(8, 'Kata sandi minimal 8 karakter')
  .max(72, 'Kata sandi maksimal 72 karakter');

export const loginSchema = z.object({
  email,
  // Saat masuk cukup dicek tidak kosong; aturan panjang hanya berlaku untuk kata sandi baru.
  password: z.string().min(1, 'Kata sandi wajib diisi'),
});

export const registerSchema = z.object({
  nama: z.string().trim().min(1, 'Nama wajib diisi').max(80, 'Nama maksimal 80 karakter'),
  email,
  password: passwordBaru,
});

export type LoginValues = z.infer<typeof loginSchema>;
export type RegisterValues = z.infer<typeof registerSchema>;

export type ValidationResult<T> =
  { ok: true; data: T } | { ok: false; errors: Partial<Record<keyof T, string>> };

// Menjalankan skema lalu mengubah galat zod menjadi satu pesan per kolom (pesan pertama saja).
export function validate<S extends z.ZodType<Record<string, unknown>>>(
  schema: S,
  values: unknown,
): ValidationResult<z.infer<S>> {
  const result = schema.safeParse(values);
  if (result.success) {
    return { ok: true, data: result.data };
  }
  const errors: Partial<Record<keyof z.infer<S>, string>> = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0] as keyof z.infer<S> | undefined;
    if (field !== undefined && errors[field] === undefined) {
      errors[field] = issue.message;
    }
  }
  return { ok: false, errors };
}
```

| Bagian | Penjelasan |
|---|---|
| `z.string().trim().min(1, '...')` | Teks dipangkas spasi di ujung, lalu wajib tidak kosong. Pesan galat langsung dalam Bahasa Indonesia. |
| `.pipe(z.email('...'))` | Setelah tidak kosong, diperiksa berformat email. Dipisah agar kolom kosong mendapat pesan "wajib diisi", bukan "format salah". |
| `passwordBaru` (min 8, max 72) | Aturan hanya untuk kata sandi **baru** (daftar). Minimal 8 sesuai anjuran dokumentasi Supabase ("kurang dari 8 karakter tidak dianjurkan"). Batas 72 mengikuti batas bcrypt yang dipakai Supabase untuk hash; angka 72 ini tidak tertulis di dokumentasi yang saya baca, jadi anggap sebagai pagar pengaman. |
| `loginSchema` | Saat masuk, sandi cukup tidak kosong. Bila aturan panjang dipasang di sini, akun lama yang sandinya dibuat dengan aturan lain bisa terkunci. |
| `nama ... max(80)` | Sama dengan constraint `profiles.nama` di database. |
| `z.infer<typeof ...>` | Tipe TypeScript diturunkan otomatis dari skema, jadi satu sumber kebenaran. |
| `validate(schema, values)` | Fungsi bantu: hasilnya `{ ok: true, data }` atau `{ ok: false, errors }` dengan **satu pesan pertama per kolom**, siap dipasang ke `TextField error=...`. |

### 5.2 `src/features/auth/errors.ts`

**Berkas:** `src/features/auth/errors.ts` (berkas baru: buat)

```ts
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
```

| Bagian | Penjelasan |
|---|---|
| `isAuthRetryableFetchError(error)` | Tanda galat jaringan (internet putus, server tak terjangkau). Dicek lebih dulu. |
| `error.code` | Kode stabil dari Supabase Auth, lebih andal daripada membandingkan teks pesan. Semua kode di `switch` sudah saya cocokkan dengan daftar resmi (14 Oktober 2026). |
| `EMAIL_SUDAH_TERDAFTAR` | Konstanta karena dipakai juga di `AuthProvider` untuk kasus email terdaftar tanpa galat. |
| `default` | Pesan umum untuk kode yang tidak dikenal. Kode aslinya hanya dicetak di mode pengembangan (`__DEV__`) supaya mudah dilacak tanpa membocorkan detail ke pengguna. |

Cek: `npm run typecheck` 0 galat.

---

## 6. Tugas 3.4, 3.6, dan 3.7 (bagian 1): sesi, profil, dan akun nonaktif

Ini inti Fase 3. Satu komponen, `AuthProvider`, membungkus seluruh aplikasi dan menyediakan `useAuth()`.

### 6.1 `src/features/auth/AuthProvider.tsx`

**Berkas:** `src/features/auth/AuthProvider.tsx` (berkas baru: buat)

```tsx
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
```

### 6.2 Cara kerjanya

`status` menjawab "pengguna sedang di tahap mana":

| `status` | Artinya | Yang ditampilkan |
|---|---|---|
| `loading` | Sesi atau profil sedang dimuat | Splash (saat buka aplikasi) atau `LoadingScreen` |
| `signedOut` | Tidak ada sesi | Layar `(auth)` |
| `signedIn` | Sesi ada **dan** profil aktif sudah dimuat | `(tabs)`, dan `admin/` bila `role = admin` |
| `error` | Sesi ada, profil gagal dimuat (misalnya tanpa internet) | `ProfileErrorScreen` dengan tombol Coba lagi dan Keluar |

| Bagian kode | Penjelasan |
|---|---|
| `onAuthStateChange` di effect pertama | Supabase memberi tahu setiap kali sesi berubah (masuk, keluar, token diperbarui, dan satu kali di awal untuk sesi yang tersimpan). Di sini hanya `setSession`. **Jangan** memanggil fungsi Supabase lain dengan `await` di dalam callback ini; dokumentasi memperingatkan bisa terjadi *deadlock*. Karena itu pemuatan profil dilakukan di effect kedua. |
| `fetchProfile` | Membaca satu baris `profiles` milik pengguna. RLS Fase 2 mengizinkan pengguna membaca profilnya sendiri **termasuk saat akunnya nonaktif**, sehingga pengecekan `is_aktif` selalu bisa dilakukan. `maybeSingle()` mengembalikan `null` (bukan galat) bila barisnya tidak ada. |
| `userIdRef` | Menyimpan ID pengguna terbaru. Bila jawaban permintaan lama datang terlambat setelah pengguna ganti akun, jawaban itu dibuang. |
| `case 'inactive'` dan `'missing'` | **Tugas 3.6**: akun nonaktif atau tanpa profil dikeluarkan lewat `forceSignOut` dengan pesan jelas. |
| effect ketiga (`AppState`) | Saat aplikasi kembali ke layar depan, profil dicek ulang secara senyap. Bila admin menonaktifkan akunmu saat aplikasi di latar belakang, kamu langsung dikeluarkan. Kegagalan jaringan pada cek senyap diabaikan. |
| `signIn` | `signInWithPassword`. Mengembalikan `{ ok }` atau `{ ok: false, message }` berbahasa Indonesia. Tidak ada navigasi manual: bila berhasil, `status` berubah dan pembatas rute memindahkan pengguna. |
| `signUp` | Mengirim `nama` lewat `options.data`; trigger `handle_new_user` (Fase 2) memakainya untuk mengisi `profiles.nama`. `identities?.length === 0` menangkap email terdaftar saat konfirmasi email aktif (Supabase sengaja tidak mengirim galat agar alamat email tidak bisa ditebak). `needsConfirmation` benar bila tidak ada sesi. |
| `signOut` | `scope: 'local'` (K22). Galatnya tidak ditampilkan; sesi lokal tetap dibuang bahkan bila internet putus. |
| `profile: status === 'signedIn' ? profile : null` | Layar lain tidak pernah melihat profil setengah jadi. |

Cek: `npm run typecheck` 0 galat.

---

## 7. Tugas 3.3 (bagian 2) dan 3.7 (bagian 2): komponen dan layar

### 7.1 Komponen baru: `Banner` dan `LoadingScreen`

**Banner**: kotak pesan untuk galat tingkat formulir ("Email atau kata sandi salah") dan pemberitahuan ("Akunmu dinonaktifkan"). Teks memakai warna utama (kontras tinggi), hanya ikon yang berwarna; pelajaran dari uji kontras: merah `#B04A35` di atas merah muda hanya 4,37:1, di bawah batas 4,5:1.

**Berkas:** `src/components/Banner.tsx` (berkas baru: buat)

```tsx
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/theme';

type BannerProps = {
  message: string;
  /** error: kegagalan. info: pemberitahuan atau keberhasilan. */
  variant?: 'error' | 'info';
};

// Teks selalu memakai warna teks utama (kontras tinggi); hanya ikon yang berwarna.
const variantStyles = {
  error: { background: colors.dangerSoft, icon: colors.danger, name: 'alert-circle' },
  info: { background: colors.primarySoft, icon: colors.primary, name: 'information-circle' },
} as const;

// Kotak pesan untuk galat tingkat formulir atau pemberitahuan. Pesan dibacakan pembaca layar.
export function Banner({ message, variant = 'error' }: BannerProps) {
  const palette = variantStyles[variant];
  return (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={[styles.box, { backgroundColor: palette.background }]}
    >
      <Ionicons name={palette.name} size={20} color={palette.icon} />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  text: { ...typography.body, color: colors.text, flex: 1 },
});
```

**LoadingScreen**: layar tunggu satu halaman penuh.

**Berkas:** `src/components/LoadingScreen.tsx` (berkas baru: buat)

```tsx
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '@/theme';

// Layar tunggu satu halaman penuh, dipakai selagi status masuk sedang ditentukan.
export function LoadingScreen({ message = 'Memuat...' }: { message?: string }) {
  return (
    <View style={styles.root} accessibilityLabel={message} accessibilityLiveRegion="polite">
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    backgroundColor: colors.background,
  },
  text: { ...typography.body, color: colors.textMuted },
});
```

### 7.2 `Screen`: keyboard tidak menutupi kolom (tugas 3.8, bagian 1)

Dengan *edge-to-edge* di SDK 54, Android tidak lagi menaikkan layar sendiri saat keyboard terbuka; dokumentasi Expo menyarankan `KeyboardAvoidingView`. Prop baru `avoidKeyboard` membungkus isi layar dengannya.

**Berkas:** `src/components/Screen.tsx` (berkas lama: ganti seluruh isinya)

```tsx
import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { colors, spacing } from '@/theme';

type ScreenProps = {
  children: ReactNode;
  /** true: isi bisa digulir (layar panjang atau berisi formulir). */
  scroll?: boolean;
  /** Sisi layar yang diberi jarak aman. Layar tab: ['top']. Layar dengan header bawaan: ['bottom']. */
  edges?: Edge[];
  /** false: tanpa padding bawaan (untuk konten tepi ke tepi). */
  padded?: boolean;
  /** true: konten naik saat keyboard terbuka. Pakai di layar berisi kolom isian. */
  avoidKeyboard?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
};

export function Screen({
  children,
  scroll = false,
  edges = ['top'],
  padded = true,
  avoidKeyboard = false,
  contentStyle,
}: ScreenProps) {
  const body = scroll ? (
    <ScrollView
      contentContainerStyle={[styles.scrollContent, padded && styles.padded, contentStyle]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.fill, padded && styles.padded, contentStyle]}>{children}</View>
  );

  return (
    <SafeAreaView style={styles.root} edges={edges}>
      {avoidKeyboard ? (
        // Dengan edge-to-edge (SDK 54), Android tidak lagi menaikkan layar sendiri saat keyboard
        // terbuka, jadi kita yang mengaturnya: padding setinggi keyboard di bawah konten.
        <KeyboardAvoidingView behavior="padding" style={styles.fill}>
          {body}
        </KeyboardAvoidingView>
      ) : (
        body
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  fill: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  padded: { padding: spacing.lg, gap: spacing.lg },
});
```

| Bagian | Penjelasan |
|---|---|
| `avoidKeyboard = false` | Prop baru, mati secara bawaan; hanya layar berformulir yang menyalakannya. |
| `<KeyboardAvoidingView behavior="padding">` | Menambah padding setinggi keyboard di bawah konten. Isi `ScrollView` tetap bisa digulir, dan `keyboardShouldPersistTaps="handled"` membuat tombol tetap bisa diketuk saat keyboard terbuka. |
| `body` | Isi (gulir atau tidak) disusun sekali, lalu dibungkus bila perlu. |

Catatan jujur: ini perilaku yang **belum bisa saya uji di Android asli**. Bila di HP-mu kolom masih tertutup atau ada celah kosong yang aneh di atas keyboard, catat; alternatifnya `react-native-keyboard-controller` (dianjurkan Expo, tetapi menambah satu paket).

### 7.3 `components/index.ts` (versi sementara)

Daftarkan dua komponen baru. `DevShortcuts` **masih dipertahankan** sampai bagian 9, supaya Dashboard lama tetap bisa dikompilasi.

**Berkas:** `src/components/index.ts` (berkas lama: ganti seluruh isinya; versi sementara)

```ts
export { Banner } from './Banner';
export { Button } from './Button';
export { Card } from './Card';
export { DevShortcuts } from './DevShortcuts';
export { EmptyState } from './EmptyState';
export { LoadingScreen } from './LoadingScreen';
export { PlaceholderScreen } from './PlaceholderScreen';
export { Screen } from './Screen';
export { ScreenHeader } from './ScreenHeader';
export { TextField } from './TextField';
```

### 7.4 Layar galat profil dan kartu akun

**ProfileErrorScreen** tampil bila status `error`:

**Berkas:** `src/features/auth/ProfileErrorScreen.tsx` (berkas baru: buat)

```tsx
import { Button, EmptyState, Screen } from '@/components';

import { useAuth } from './AuthProvider';

// Tampil bila sesi ada tetapi profil gagal dimuat (biasanya karena internet putus).
export function ProfileErrorScreen() {
  const { retryProfile, signOut } = useAuth();

  return (
    <Screen scroll edges={['top', 'bottom']}>
      <EmptyState
        icon="cloud-offline-outline"
        title="Akunmu belum bisa dimuat"
        description="Periksa koneksi internetmu, lalu coba lagi. Kamu juga bisa keluar dan masuk kembali."
        actionLabel="Coba lagi"
        onAction={retryProfile}
      />
      <Button title="Keluar" variant="ghost" onPress={signOut} />
    </Screen>
  );
}
```

**AccountCard**: kartu di Dashboard berisi nama, email, peran, tombol panel admin (hanya admin), dan **Keluar** (tugas 3.7).

**Berkas:** `src/features/auth/AccountCard.tsx` (berkas baru: buat)

```tsx
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button, Card } from '@/components';
import { colors, minTouchSize, radius, spacing, typography } from '@/theme';

import { useAuth } from './AuthProvider';

// Kartu akun di Dashboard: siapa yang sedang masuk, jalan pintas ke panel admin, dan tombol keluar.
export function AccountCard() {
  const router = useRouter();
  const { profile, session, isAdmin, signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  if (!profile) return null;

  const initial = (profile.nama.trim()[0] ?? session?.user.email?.[0] ?? '?').toUpperCase();

  async function handleSignOut() {
    setSigningOut(true);
    await signOut();
    // Setelah keluar, guard rute memindahkan pengguna ke layar masuk dan layar ini dilepas.
    setSigningOut(false);
  }

  return (
    <Card>
      <View style={styles.row}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>
        <View style={styles.identity}>
          <Text style={styles.name} numberOfLines={1}>
            {profile.nama || 'Pengguna Scannest'}
          </Text>
          <Text style={styles.email} numberOfLines={1}>
            {session?.user.email}
          </Text>
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{isAdmin ? 'Admin' : 'Pengguna'}</Text>
        </View>
      </View>
      {isAdmin ? (
        <Button
          title="Buka panel admin"
          variant="secondary"
          onPress={() => router.push('/admin')}
        />
      ) : null}
      <Button
        title="Keluar"
        variant="ghost"
        fullWidth
        loading={signingOut}
        onPress={handleSignOut}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: {
    width: minTouchSize,
    height: minTouchSize,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { ...typography.heading, color: colors.primary },
  identity: { flex: 1 },
  name: { ...typography.bodyStrong, color: colors.text },
  email: { ...typography.caption, color: colors.textMuted },
  badge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
  },
  badgeText: { ...typography.caption, color: colors.primary },
});
```

| Bagian | Penjelasan |
|---|---|
| `const { profile, session, isAdmin, signOut } = useAuth()` | Semua data akun dari satu hook. |
| `initial` | Huruf pertama nama (atau email) untuk lingkaran avatar. |
| `isAdmin ? <Button ... /> : null` | Tombol panel admin hanya dirender untuk admin. Ini kemudahan tampilan; penjaganya tetap pembatas rute dan RLS. |
| `router.push('/admin')` | Membuka panel admin. Untuk non-admin rute ini ditolak pembatas rute. |
| `handleSignOut` | Setelah keluar, pembatas rute memindahkan ke layar masuk dan kartu ini dilepas. |
| `minTouchSize` untuk avatar | Ukuran dari token, bukan angka mentah (aturan Fase 1). |

### 7.5 `features/auth/index.ts`

Satu pintu impor: `import { useAuth } from '@/features/auth'`.

**Berkas:** `src/features/auth/index.ts` (berkas baru: buat)

```ts
export { AccountCard } from './AccountCard';
export { AuthProvider, useAuth } from './AuthProvider';
export type { AuthResult, AuthStatus, Profile, Role } from './AuthProvider';
export { ProfileErrorScreen } from './ProfileErrorScreen';
export { loginSchema, registerSchema, validate } from './schemas';
export type { LoginValues, RegisterValues } from './schemas';
```

### 7.6 Layar masuk

**Berkas:** `app/(auth)/login.tsx` (berkas lama: ganti seluruh isinya)

```tsx
import { Link } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { Banner, Button, Screen, ScreenHeader, TextField } from '@/components';
import { loginSchema, useAuth, validate, type LoginValues } from '@/features/auth';
import { colors, spacing, typography } from '@/theme';

type FieldErrors = Partial<Record<keyof LoginValues, string>>;

export default function LoginScreen() {
  const { signIn, notice, clearNotice } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (submitting) return;
    clearNotice();
    setFormError(undefined);

    // 1) Cek isian di perangkat dulu, supaya kesalahan ketik tidak perlu ke server.
    const result = validate(loginSchema, { email, password });
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors({});

    // 2) Kirim ke Supabase. Bila berhasil, guard rute di app/_layout.tsx memindahkan ke Dashboard.
    setSubmitting(true);
    const response = await signIn(result.data.email, result.data.password);
    if (!response.ok) {
      setFormError(response.message);
    }
    setSubmitting(false);
  }

  return (
    <Screen scroll avoidKeyboard edges={['top', 'bottom']}>
      <ScreenHeader title="Masuk" subtitle="Selamat datang kembali di Scannest" />
      {notice ? <Banner variant="info" message={notice} /> : null}
      {formError ? <Banner message={formError} /> : null}
      <TextField
        label="Email"
        value={email}
        onChangeText={setEmail}
        error={errors.email}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        returnKeyType="next"
        placeholder="nama@email.com"
      />
      <TextField
        label="Kata sandi"
        value={password}
        onChangeText={setPassword}
        error={errors.password}
        secureTextEntry
        autoCapitalize="none"
        autoComplete="current-password"
        returnKeyType="done"
        onSubmitEditing={handleSubmit}
      />
      <Button title="Masuk" fullWidth loading={submitting} onPress={handleSubmit} />
      <Text style={styles.footer}>
        Belum punya akun?{' '}
        <Link href="/register" style={styles.link}>
          Daftar
        </Link>
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  footer: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  link: { fontFamily: typography.bodyStrong.fontFamily, color: colors.primary },
});
```

| Bagian | Penjelasan |
|---|---|
| `useAuth()` | `signIn`, plus `notice` (pesan setelah dikeluarkan paksa) dan `clearNotice`. |
| `handleSubmit` | Urutan: (1) `validate(loginSchema, ...)` di perangkat, galat per kolom, **tanpa menghubungi server** bila isian salah; (2) `signIn` ke Supabase; (3) bila gagal, tampilkan `formError`. Bila berhasil, tidak ada `router.push`: pembatas rute (bagian 8) yang memindahkan. |
| `if (submitting) return` | Mencegah ketukan ganda. |
| `{notice ? <Banner variant="info" .../> : null}` | Menampilkan alasan dikeluarkan (akun nonaktif). |
| `onSubmitEditing={handleSubmit}` | Tombol "Selesai" di keyboard ikut mengirim formulir. |
| `autoCorrect={false}`, `keyboardType="email-address"` | Keyboard email tanpa koreksi otomatis. |
| `<Screen scroll avoidKeyboard ...>` | Memakai prop baru dari 7.2. |

### 7.7 Layar daftar

**Berkas:** `app/(auth)/register.tsx` (berkas lama: ganti seluruh isinya)

```tsx
import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { Banner, Button, EmptyState, Screen, ScreenHeader, TextField } from '@/components';
import { registerSchema, useAuth, validate, type RegisterValues } from '@/features/auth';
import { colors, spacing, typography } from '@/theme';

type FieldErrors = Partial<Record<keyof RegisterValues, string>>;

export default function RegisterScreen() {
  const router = useRouter();
  const { signUp } = useAuth();
  const [nama, setNama] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const [waitingConfirmation, setWaitingConfirmation] = useState(false);

  async function handleSubmit() {
    if (submitting) return;
    setFormError(undefined);

    const result = validate(registerSchema, { nama, email, password });
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors({});

    setSubmitting(true);
    const response = await signUp(result.data.nama, result.data.email, result.data.password);
    setSubmitting(false);

    if (!response.ok) {
      setFormError(response.message);
    } else if (response.needsConfirmation) {
      // Konfirmasi email aktif: belum ada sesi, jadi tampilkan petunjuk. Bila tidak aktif, sesi
      // langsung terbentuk dan guard rute memindahkan pengguna ke Dashboard.
      setWaitingConfirmation(true);
    }
  }

  if (waitingConfirmation) {
    return (
      <Screen scroll edges={['top', 'bottom']}>
        <EmptyState
          icon="mail-outline"
          title="Cek emailmu"
          description="Kami mengirim tautan konfirmasi ke emailmu. Klik tautan itu, lalu kembali ke sini dan masuk."
          actionLabel="Ke halaman masuk"
          onAction={() => router.replace('/login')}
        />
      </Screen>
    );
  }

  return (
    <Screen scroll avoidKeyboard edges={['top', 'bottom']}>
      <ScreenHeader title="Daftar" subtitle="Buat akun untuk mulai memindai dokumen" />
      {formError ? <Banner message={formError} /> : null}
      <TextField
        label="Nama"
        value={nama}
        onChangeText={setNama}
        error={errors.nama}
        autoComplete="name"
        autoCapitalize="words"
        returnKeyType="next"
        placeholder="Nama lengkapmu"
      />
      <TextField
        label="Email"
        value={email}
        onChangeText={setEmail}
        error={errors.email}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        returnKeyType="next"
        placeholder="nama@email.com"
      />
      <TextField
        label="Kata sandi"
        value={password}
        onChangeText={setPassword}
        error={errors.password}
        secureTextEntry
        autoCapitalize="none"
        autoComplete="new-password"
        returnKeyType="done"
        onSubmitEditing={handleSubmit}
        helper="Minimal 8 karakter"
      />
      <Button title="Buat akun" fullWidth loading={submitting} onPress={handleSubmit} />
      <Text style={styles.footer}>
        Sudah punya akun?{' '}
        <Link href="/login" style={styles.link}>
          Masuk
        </Link>
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  footer: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  link: { fontFamily: typography.bodyStrong.fontFamily, color: colors.primary },
});
```

| Bagian | Penjelasan |
|---|---|
| `validate(registerSchema, ...)` | Nama, email, dan sandi (minimal 8) dicek sebelum ke server. |
| `signUp(nama, email, password)` | Membuat akun. Trigger Fase 2 otomatis membuat baris `profiles` dengan nama itu. |
| `response.needsConfirmation` | Bila *Confirm email* aktif di Supabase, tidak ada sesi: tampil layar "Cek emailmu". Bila mati, sesi langsung terbentuk dan pengguna dipindahkan ke Dashboard oleh pembatas rute. |
| `router.replace('/login')` | Dari layar "Cek emailmu" kembali ke layar masuk tanpa menumpuk riwayat. |

Cek: `npm run typecheck` 0 galat.

---

## 8. Tugas 3.5: pembatas rute (route guard)

**Berkas:** `app/_layout.tsx` (berkas lama: ganti seluruh isinya)

```tsx
import { Nunito_400Regular, Nunito_600SemiBold, Nunito_700Bold } from '@expo-google-fonts/nunito';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { LoadingScreen } from '@/components';
import { AuthProvider, ProfileErrorScreen, useAuth } from '@/features/auth';
import { stackScreenOptions } from '@/theme';

// Tahan splash screen sampai font dan status masuk selesai ditentukan, supaya layar masuk
// tidak sempat berkedip sebelum pengguna dipindahkan ke Dashboard.
SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
  });

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <RootNavigator />
    </AuthProvider>
  );
}

function RootNavigator() {
  const { status, isAdmin } = useAuth();

  useEffect(() => {
    if (status !== 'loading') {
      SplashScreen.hideAsync();
    }
  }, [status]);

  if (status === 'loading') {
    return <LoadingScreen />;
  }
  if (status === 'error') {
    return <ProfileErrorScreen />;
  }

  const isSignedIn = status === 'signedIn';

  // Stack.Protected: layar di dalamnya hanya bisa dibuka bila `guard` bernilai true. Bila nilainya
  // berubah (masuk atau keluar), expo-router memindahkan pengguna otomatis ke layar yang diizinkan.
  // Ini pembatas tampilan saja; keamanan data sebenarnya ada di RLS dan Edge Function.
  return (
    <Stack screenOptions={stackScreenOptions}>
      <Stack.Protected guard={isSignedIn}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="dokumen/[id]" options={{ title: 'Detail dokumen' }} />
        <Stack.Screen name="editor/[halamanId]" options={{ title: 'Editor' }} />
        <Stack.Protected guard={isAdmin}>
          <Stack.Screen name="admin" options={{ headerShown: false }} />
        </Stack.Protected>
      </Stack.Protected>
      <Stack.Protected guard={!isSignedIn}>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      </Stack.Protected>
    </Stack>
  );
}
```

| Bagian | Penjelasan |
|---|---|
| `unstable_settings.anchor = '(tabs)'` | Layar "rumah". Bila tujuan ditolak, expo-router mengalihkan ke anchor, atau ke layar pertama yang diizinkan (`(auth)` saat belum masuk). |
| `RootLayout` | Memuat font, lalu membungkus semuanya dengan `AuthProvider`. Splash tetap ditahan sampai font siap. |
| `RootNavigator` | Berada **di dalam** `AuthProvider` karena memakai `useAuth()`. |
| `SplashScreen.hideAsync()` saat `status !== 'loading'` | Splash baru hilang setelah status masuk jelas, sehingga layar masuk tidak berkedip sebelum pengguna dipindahkan ke Dashboard. |
| `status === 'loading'` / `'error'` | Menampilkan `LoadingScreen` atau `ProfileErrorScreen` sebagai ganti navigator. |
| `<Stack.Protected guard={isSignedIn}>` | `(tabs)`, `dokumen/[id]`, dan `editor/[halamanId]` hanya bisa dibuka setelah masuk. |
| `<Stack.Protected guard={isAdmin}>` (bersarang) | `admin` hanya untuk `role = admin`. Pengguna biasa yang mencoba `/admin` dialihkan ke Dashboard. |
| `<Stack.Protected guard={!isSignedIn}>` | `(auth)` (masuk dan daftar) hanya untuk yang belum masuk. Setelah masuk, layar ini ditutup otomatis. |
| `+not-found` | Tetap tersedia tanpa dideklarasikan. |

Pembatas ini hanya tampilan. Orang yang memodifikasi aplikasinya tetap tertahan di RLS, tempat data sebenarnya dijaga.

Cek: `npm run typecheck` 0 galat.

---

## 9. Tugas 3.8: bersih-bersih dari Fase 1

### 9.1 Dashboard memakai `AccountCard`

**Berkas lama:** ganti seluruh isi `app/(tabs)/index.tsx`. Pintasan pengembangan (`DevShortcuts`) lepas, `AccountCard` masuk.

**Berkas:** `app/(tabs)/index.tsx` (berkas lama: ganti seluruh isinya)

```tsx
import { useRouter } from 'expo-router';

import { EmptyState, Screen, ScreenHeader } from '@/components';
import { AccountCard } from '@/features/auth';

export default function DashboardScreen() {
  const router = useRouter();

  return (
    <Screen scroll>
      <ScreenHeader title="Dashboard" subtitle="Semua dokumenmu ada di sini" />
      <AccountCard />
      <EmptyState
        icon="document-text-outline"
        title="Belum ada dokumen"
        description="Scan dokumen pertamamu lewat tab Kamera. Hasilnya akan muncul di sini."
        actionLabel="Mulai scan"
        onAction={() => router.navigate('/kamera')}
      />
    </Screen>
  );
}
```

### 9.2 Hapus `DevShortcuts`

Urutannya penting: **ubah `index.ts` dulu, baru hapus berkasnya.**

1. Ganti isi `src/components/index.ts` dengan versi akhir (tanpa baris `DevShortcuts`):

**Berkas:** `src/components/index.ts` (berkas lama: ganti seluruh isinya)

```ts
export { Banner } from './Banner';
export { Button } from './Button';
export { Card } from './Card';
export { EmptyState } from './EmptyState';
export { LoadingScreen } from './LoadingScreen';
export { PlaceholderScreen } from './PlaceholderScreen';
export { Screen } from './Screen';
export { ScreenHeader } from './ScreenHeader';
export { TextField } from './TextField';
```

2. Hapus berkas `src/components/DevShortcuts.tsx` (klik kanan di VS Code, **Delete**).

Bila kamu menghapus berkasnya lebih dulu, `typecheck` memberi 1 galat (`Cannot find module './DevShortcuts'`) sampai `index.ts` diperbaiki. Itu wajar, bukan kerusakan.

### 9.3 Komentar di layout admin

Hanya komentar yang berubah (pembatasan akses kini nyata). Ganti seluruh isi `app/admin/_layout.tsx`:

**Berkas:** `app/admin/_layout.tsx` (berkas lama: ganti seluruh isinya)

```tsx
import { Stack } from 'expo-router';

import { stackScreenOptions } from '@/theme';

// Folder biasa `admin` (bukan grup) agar URL-nya /admin dan tidak bentrok dengan Dashboard di "/".
// Akses dibatasi di app/_layout.tsx (Stack.Protected): hanya akun dengan role admin yang bisa masuk.
export default function AdminLayout() {
  return (
    <Stack screenOptions={stackScreenOptions}>
      <Stack.Screen name="index" options={{ title: 'Panel admin' }} />
      <Stack.Screen name="pengguna" options={{ title: 'Pengguna' }} />
      <Stack.Screen name="dokumen" options={{ title: 'Dokumen' }} />
      <Stack.Screen name="log" options={{ title: 'Log aktivitas' }} />
    </Stack>
  );
}
```

### 9.4 Uji kontras ditambah tiga pasangan

Kotak pesan memakai pasangan warna baru. Ganti seluruh isi `scripts/cek-kontras.mjs` (kini 15 pasangan, sebelumnya 12):

**Berkas:** `scripts/cek-kontras.mjs` (berkas lama: ganti seluruh isinya)

```js
// Mengecek rasio kontras pasangan warna di src/theme/colors.ts (rumus WCAG 2.x).
// Jalankan: npm run cek:kontras
// Butuh Node 22.18 atau lebih baru (bisa membaca berkas .ts langsung).
import { colors } from '../src/theme/colors.ts';

// Luminans relatif sebuah warna heks "#RRGGBB".
function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const linear = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

// Rasio kontras dua warna: (terang + 0,05) / (gelap + 0,05).
function contrast(a, b) {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

// [nama, warna depan, warna belakang, minimum]. Teks butuh 4,5; komponen UI butuh 3.
const checks = [
  ['Teks utama di latar', colors.text, colors.background, 4.5],
  ['Teks utama di kartu', colors.text, colors.surface, 4.5],
  ['Teks redup di latar', colors.textMuted, colors.background, 4.5],
  ['Teks redup di kartu', colors.textMuted, colors.surface, 4.5],
  ['Teks tombol utama', colors.onPrimary, colors.primary, 4.5],
  ['Teks tombol sekunder', colors.primary, colors.primarySoft, 4.5],
  ['Teks tombol ghost dan tautan', colors.primary, colors.background, 4.5],
  ['Teks tombol bahaya', colors.onDanger, colors.danger, 4.5],
  ['Pesan galat di latar', colors.danger, colors.background, 4.5],
  ['Pesan galat di kartu', colors.danger, colors.surface, 4.5],
  ['Teks di kotak pesan galat', colors.text, colors.dangerSoft, 4.5],
  ['Teks di kotak pesan info', colors.text, colors.primarySoft, 4.5],
  ['Ikon kotak pesan galat', colors.danger, colors.dangerSoft, 3],
  ['Ikon aktif di tab bar', colors.primary, colors.surface, 3],
  ['Garis kolom isian', colors.inputBorder, colors.surface, 3],
];

let failed = 0;
for (const [name, fg, bg, min] of checks) {
  const ratio = contrast(fg, bg);
  const ok = ratio >= min;
  if (!ok) failed += 1;
  console.log(`${ok ? 'LULUS' : 'GAGAL'}  ${ratio.toFixed(2).padStart(5)} (min ${min})  ${name}`);
}

console.log(failed === 0 ? '\nSemua pasangan lulus.' : `\n${failed} pasangan gagal.`);
process.exit(failed === 0 ? 0 : 1);
```

### 9.5 Cek akhir kode

```bash
npm run typecheck
npm run lint
npm run format:check
npm run cek:kontras
```

Keempatnya harus bersih (`cek:kontras` berakhir dengan "Semua pasangan lulus."). Bila `format:check` mengeluh, jalankan `npm run format` lalu cek ulang. Cek juga bahwa tidak ada kode warna mentah di tampilan:

```bash
git grep -nE "#[0-9A-Fa-f]{6}" -- app src/components src/features
```

Hasil yang benar: **kosong**.

---

## 10. Tugas 3.9: uji di HP, commit, pull request

### 10.1 Jalankan

```bash
npx expo start --clear
```

Buka lewat Expo Go **SDK 54** di HP (sama seperti tugas 0.8). `--clear` memastikan nilai `.env` terbaca.

### 10.2 Daftar uji di HP

*Status 16 Oktober 2026: seluruh daftar dicentang berdasarkan laporan pengguna bahwa Fase 3 selesai 100%.*

Centang satu per satu dan **laporkan hasilnya kepada saya**, terutama yang gagal.

- [x] Pertama kali dibuka (belum masuk): splash krem, lalu layar **Masuk** (bukan Dashboard).
- [x] Ketuk **Masuk** dengan isian kosong: muncul "Email wajib diisi" dan "Kata sandi wajib diisi".
- [x] Email tanpa `@`: muncul "Format email belum benar".
- [x] Email benar, sandi salah: kotak pesan "Email atau kata sandi salah."
- [x] Ketuk kolom Email dan Kata sandi: kolom **tidak tertutup keyboard** (catat bila tertutup atau ada celah kosong aneh).
- [x] Daftar akun baru (email valid, sandi 8+ karakter): langsung masuk ke Dashboard, kartu akun menampilkan nama dan email, peran **Pengguna**.
- [x] Di Supabase, **Table Editor > `profiles`**: ada baris baru dengan nama yang kamu isi (bukti trigger Fase 2 bekerja bersama aplikasi).
- [x] Daftar dengan email yang sama lagi: "Email ini sudah terdaftar. Silakan masuk."
- [x] Tutup paksa aplikasi (geser dari daftar aplikasi terbuka), buka lagi: **tetap masuk** (tanpa layar Masuk).
- [x] Ketuk **Keluar**: kembali ke layar Masuk. Tutup paksa lalu buka lagi: tetap di layar Masuk.
- [x] Nyalakan mode pesawat, ketuk **Masuk**: "Tidak bisa terhubung ke server...". Matikan mode pesawat, ketuk lagi: berhasil.
- [x] Masuk dengan **akun adminmu**: tampil label **Admin** dan tombol **Buka panel admin**; tombol itu membuka layar Panel admin.
- [x] Masuk dengan **akun biasa**: tidak ada tombol panel admin.
- [x] Uji akun nonaktif (10.3): setelah dinonaktifkan, aplikasi ditutup lalu dibuka lagi, kamu keluar dengan pesan "Akunmu dinonaktifkan..."; mencoba masuk lagi ditolak dengan pesan yang sama.
- [x] Layar Masuk dan Dashboard tidak tertutup status bar atau tombol navigasi sistem.

### 10.3 Uji akun nonaktif

Pakai akun uji **biasa** (bukan akun adminmu). Di Supabase **SQL Editor**, ganti emailnya, jalankan:

```sql
update public.profiles
set is_aktif = false
where id = (select id from auth.users where email = 'EMAIL_AKUN_UJI');
```

Saat aplikasi sedang terbuka dengan akun itu: tekan tombol Home, tunggu sebentar, buka aplikasi lagi. Kamu seharusnya dikeluarkan dengan pesan. Setelah selesai, aktifkan kembali:

```sql
update public.profiles
set is_aktif = true
where id = (select id from auth.users where email = 'EMAIL_AKUN_UJI');
```

Email ini hanya dipakai di SQL Editor; **jangan** menulisnya di berkas repo.

### 10.4 Commit dan pull request

```bash
git status
git add .
git status
```

Baca daftar berkas: yang berubah harus berada di `src/`, `app/`, `scripts/`, `package.json`, dan `package-lock.json`; `src/components/DevShortcuts.tsx` tercatat **dihapus**; **tidak ada** `.env` dan tidak ada berkas bernama aneh. Lalu:

```bash
git commit -m "feat(auth): daftar, masuk, keluar, sesi tersimpan, dan pembatas rute"
git push -u origin fase-3-auth
```

Buka pull request, tunggu **CI hijau**, **Merge**, lalu `git switch main` dan `git pull`. Centang tugas 3.0 sampai 3.9 di `ROADMAP.md` pada commit berikutnya.

---

## 11. Yang perlu diingat saat coding nanti

1. **Mengambil pengguna aktif di layar mana pun:** `const { session, profile, isAdmin } = useAuth();` dari `@/features/auth`. Permintaan ke database lewat `supabase` otomatis membawa sesi, dan RLS yang menyaring datanya.
2. **Pembatas rute bukan keamanan.** Jangan menyimpan rahasia di balik "layar admin"; data admin dijaga RLS dan Edge Function (Fase 8).
3. **Jangan** memanggil fungsi Supabase dengan `await` di dalam callback `onAuthStateChange` (risiko deadlock).
4. **`.env` berubah, restart dengan `npx expo start --clear`.** Semua `EXPO_PUBLIC_*` terbaca dari APK; jangan taruh secret.
5. **Peran berubah saat aplikasi berjalan** (misalnya kamu menjadikan akun lain admin): profil dimuat ulang saat aplikasi kembali ke layar depan atau saat masuk ulang.
6. **Konfirmasi email dan "Lupa kata sandi"** belum ada. Tautan di email belum bisa membuka aplikasi karena itu butuh deep link `scannest://`; dicatat sebagai backlog **B9** (P2, Fase 9). Sebelum rilis, nyalakan kembali *Confirm email* (panduan Supabase A5).
7. **Sesi tersimpan tanpa enkripsi** (K19); peningkatan ke SecureStore ada di backlog **B10**.
8. **Jangan mencetak token atau sesi** ke `console.log`.
9. Tombol panel admin hanya tampil untuk admin, tetapi isi panelnya baru dibangun di Fase 8.

---

## 12. Pemecahan masalah

| Gejala | Kemungkinan penyebab dan solusi |
|---|---|
| Layar merah: "EXPO_PUBLIC_SUPABASE_URL dan ... belum diisi" | Aplikasi tidak menemukan isi `.env`. Tiga penyebab yang saya uji: (1) nilainya **kosong** (`EXPO_PUBLIC_SUPABASE_URL=` tanpa isi, atau yang kamu isi justru `.env.example`); (2) berkasnya bernama `.env.txt` atau berada di folder lain (Windows menyembunyikan ekstensi; cek dengan `dir /a .env*` di `C:\scannest`, harus tampil `.env` persis); (3) Metro dijalankan sebelum `.env` diisi dan masih menyimpan cache lama. Perbaikan: isi dua baris tanpa spasi tambahan, simpan, hentikan Metro (`Ctrl+C`), jalankan `npx expo start --clear`, dan pastikan di awal log muncul `env: load .env` dan `env: export EXPO_PUBLIC_SUPABASE_URL EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Lalu muat ulang aplikasi di Expo Go (tekan `r` di terminal). Spasi di sekitar `=`, tanda kutip, dan BOM tidak menjadi masalah. |
| Nilai `.env` baru tidak terbaca | Metro menyimpan cache. Hentikan, lalu `npx expo start --clear`. |
| "Network request failed" atau "Tidak bisa terhubung ke server" padahal internet ada | URL di `.env` salah ketik (harus `https://REF.supabase.co`), atau proyek Free sedang di-pause: **Restore project** di Dashboard. |
| "Invalid API key" | Publishable key salah salin atau terpotong. Ambil ulang dari **Settings > API Keys**. |
| Daftar berhasil tetapi muncul "Cek emailmu" | *Confirm email* masih aktif. Matikan (panduan Supabase A5) atau konfirmasi lewat email. |
| "Email ini sudah terdaftar" untuk email baru | Akun sudah dibuat sebelumnya (cek **Authentication > Users**). |
| "Alamat email ini tidak diterima" | Domain contoh (`example.com`) ditolak Supabase. Pakai alamat yang tampak asli. |
| "Terlalu banyak percobaan" | Batas kirim email bawaan Supabase terlampaui. Tunggu beberapa menit, atau matikan *Confirm email*. |
| Masuk berhasil tetapi kembali ke layar Masuk dengan "Profil akunmu tidak ditemukan" | Akun dibuat sebelum trigger Fase 2 ada, atau baris `profiles` terhapus. Hapus akunnya di **Authentication > Users** dan daftar ulang. |
| Layar "Akunmu belum bisa dimuat" | Profil gagal dibaca. Periksa internet lalu **Coba lagi**; bila terus terjadi, cek `rls_smoke.sql` (Fase 2) dan pastikan tabel `profiles` ada. |
| Dashboard muncul tanpa kartu akun | Profil belum termuat; seharusnya mustahil karena kartu hanya dirender setelah `signedIn`. Kirim tangkapan layar kepada saya. |
| Kolom masih tertutup keyboard | Catat tipe HP dan versi Android; lihat catatan 7.2. |
| `typecheck`: `Cannot find module '@/features/auth'` | Berkas `src/features/auth/index.ts` belum dibuat atau namanya salah. |
| `typecheck`: `Cannot find module './DevShortcuts'` | Berkas dihapus sebelum `src/components/index.ts` diganti (9.2). Ganti `index.ts` dengan versi akhir. |
| Nama berkas aneh muncul di `git status` | Kode tertempel ke terminal, bukan ke berkas. Hapus dengan `git rm` atau `del`; lihat `panduan-fase-1.md` bagian 3.0. |

---

## 13. Checklist akhir Fase 3

*Status 16 Oktober 2026: dicentang berdasarkan laporan pengguna bahwa Fase 3 selesai 100%.*

Sama dengan "Selesai bila" Fase 3 di `ROADMAP.md`.

- [x] Dokumen roadmap dan panduan sudah di repo; berkas nyasar terhapus; PR Fase 2 digabung (3.0)
- [x] Daftar, masuk, keluar bekerja di HP dengan validasi dan pesan galat yang jelas (3.3, 3.7)
- [x] Login bertahan setelah aplikasi ditutup paksa (3.2, 3.4)
- [x] Pengguna biasa tidak bisa membuka rute admin; admin bisa (3.5)
- [x] Akun nonaktif dikeluarkan dan tidak bisa masuk (3.6)
- [x] `DevShortcuts` terhapus; keyboard tidak menutupi kolom, atau kendalanya tercatat (3.8)
- [x] `typecheck`, `lint`, `format:check`, `cek:kontras` bersih; PR digabung dan CI hijau (3.9)

---

## 14. Daftar berkas Fase 3

| Berkas | Tugas | Status |
|---|---|---|
| `ROADMAP.md`, `docs/*.md` | 3.0 | baru di repo |
| `package.json`, `package-lock.json` | 3.1 | diubah (4 paket) |
| `src/lib/env.ts` | 3.2 | baru |
| `src/lib/supabase.ts` | 3.2 | baru |
| `src/features/auth/schemas.ts` | 3.3 | baru |
| `src/features/auth/errors.ts` | 3.3, 3.7 | baru |
| `src/features/auth/AuthProvider.tsx` | 3.4, 3.6, 3.7 | baru |
| `src/features/auth/ProfileErrorScreen.tsx` | 3.7 | baru |
| `src/features/auth/AccountCard.tsx` | 3.7 | baru |
| `src/features/auth/index.ts` | 3.3 | baru |
| `src/components/Banner.tsx` | 3.3, 3.7 | baru |
| `src/components/LoadingScreen.tsx` | 3.5 | baru |
| `src/components/Screen.tsx` | 3.8 | diubah (`avoidKeyboard`) |
| `src/components/index.ts` | 3.3, 3.8 | diubah |
| `src/components/DevShortcuts.tsx` | 3.8 | **dihapus** |
| `app/_layout.tsx` | 3.5 | diubah |
| `app/(auth)/login.tsx`, `register.tsx` | 3.3 | diubah |
| `app/(tabs)/index.tsx` | 3.8 | diubah |
| `app/admin/_layout.tsx` | 3.5 | diubah (komentar) |
| `scripts/cek-kontras.mjs` | 3.3 | diubah (15 pasangan) |

---

## 15. Sumber (diakses 14 Oktober 2026)

- Supabase, Use Supabase Auth with React Native (klien, AsyncStorage, `processLock`, AppState): https://supabase.com/docs/guides/auth/quickstarts/react-native
- Supabase, Build a User Management App with Expo React Native (opsi penyimpanan sesi, SecureStore): https://supabase.com/docs/guides/getting-started/tutorials/with-expo-react-native
- Supabase, kode galat Auth (`invalid_credentials`, `user_already_exists`, dan lainnya): https://supabase.com/docs/guides/auth/debugging/error-codes
- Supabase, Password security (anjuran panjang minimal): https://supabase.com/docs/guides/auth/password-security
- Expo Router, Protected routes: https://docs.expo.dev/router/advanced/protected/
- Expo, konfigurasi `app.json` dan edge-to-edge: https://docs.expo.dev/versions/v54.0.0/config/app/ dan https://expo.dev/blog/edge-to-edge-display-now-streamlined-for-android
