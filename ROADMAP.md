# Scannest — Roadmap Pembangunan

Aplikasi Android untuk memindai dokumen, merapikan hasilnya, dan menyimpannya di cloud.
Stack: Expo SDK 54 (React Native), Supabase, Cloudinary.

- Versi dokumen: 0.7
- Terakhir diperbarui: 2026-10-14
- Fase berjalan: **Fase 3 (Autentikasi dan peran)**, panduan `docs/panduan-fase-3.md`. Fase 0, 1 selesai; Fase 2 selesai kecuali penutupnya (tugas 2.0 dan 2.9: dokumen roadmap/panduan belum masuk repo dan empat berkas nyasar masih ada, diselesaikan di tugas 3.0). Centang berdasarkan laporan pengguna. Panduan lain: `docs/panduan-fase-0.md`, `docs/panduan-fase-1.md`, `docs/panduan-fase-2.md`, `docs/panduan-supabase.md`

---

## 0. Cara memakai dokumen ini

Dokumen ini satu-satunya sumber kebenaran untuk urutan kerja. Setiap tugas berbentuk checklist. Saat tugas selesai, centang `[x]` di commit yang sama dengan kodenya.

### Definisi "100% selesai" (v1.0.0)

1. Daftar, login, logout, dengan dua peran: `user` dan `admin`.
2. Kamera → ambil foto → unggah ke Cloudinary, mendukung dokumen multi-halaman.
3. Percantik foto non-destruktif: crop, rotasi, filter, kecerahan, kontras.
4. Dashboard: daftar dokumen, detail, ganti nama, hapus.
5. Admin: statistik, kelola pengguna, tinjau dan hapus dokumen, log aktivitas.
6. APK rilis di GitHub Releases dan README lengkap (screenshot, arsitektur, cara menjalankan).

Aplikasi dianggap 100% bila keenam poin tercapai dan setiap fase memenuhi kriteria "Selesai bila"-nya.

### Aturan improvisasi

Setiap permintaan perubahan di tengah jalan melewati alur yang sama: kamu sampaikan, Claude menentukan prioritas dan dampaknya, lalu dimasukkan ke roadmap ini dan dicatat di Log perubahan (bagian 9). Kamu boleh mengubah prioritas yang ditentukan.

| Prioritas | Arti | Kapan dikerjakan |
|---|---|---|
| P0 | Bug, celah keamanan, atau penghalang fase berjalan | Langsung, menyela fase berjalan |
| P1 | Perubahan yang kamu minta dan menyentuh fitur inti | Awal fase berikutnya (di fase berjalan bila kurang dari 1 sesi) |
| P2 | Peningkatan yang bagus dimiliki | Fase 9, sebelum rilis, sejauh kapasitas |
| P3 | Ide bagus tetapi tidak perlu untuk v1.0 | Setelah v1.0.0 |

Tugas hasil improvisasi diberi tanda `[IMPROVISASI]` di dalam fase tujuannya.

Satuan waktu: 1 sesi = satu blok coding sekitar 2–3 jam. Semua perkiraan sesi bersifat kasar.

---

## 1. Keputusan arsitektur

Fakta teknis di bawah diverifikasi pada 2026-10-10 (sumber di bagian 10). Item bertanda **(uji)** belum terkonfirmasi penuh dan harus dites sebelum dipakai.

| # | Keputusan | Pilihan | Alasan | Kontra / konsekuensi |
|---|---|---|---|---|
| K1 | Versi framework | Expo SDK 54: React Native 0.81, React 19.1, Node minimal 20.19.4 | Sesuai permintaan | New Architecture opsional di SDK 54 (SDK 55 hanya New Architecture). Edge-to-edge selalu aktif di Android, jadi wajib pakai safe area |
| K2 | Mode pengembangan | Expo Go dulu, pindah ke development build bila butuh modul native | Mulai cepat | Expo menyarankan development build untuk aplikasi produksi |
| K3 | Backend | Supabase: Auth, Postgres, Edge Functions | Role admin, relasi ERD, dan RLS tersedia dalam satu layanan | Free: 500 MB database, 50.000 MAU, 2 proyek aktif. **Proyek di-pause setelah 1 minggu tanpa aktivitas** |
| K4 | Penyimpanan gambar | Cloudinary | Sesuai permintaan | Free: 25 kredit/bulan. 1 kredit = 1.000 transformasi **atau** 1 GB storage **atau** 1 GB bandwidth, dibagi bersama. Melebihi kuota tanpa upgrade berujung akun dinonaktifkan |
| K5 | Upload | Unsigned upload preset dari aplikasi | Tanpa server untuk fase awal | Nama preset terlihat publik. Pengaman: `allowed_formats`, `disallow_public_id`, incoming transformation. Preset tidak punya batas ukuran file, jadi validasi di aplikasi |
| K6 | Hapus file Cloudinary | Supabase Edge Function | Penghapusan butuh API secret yang tidak boleh ada di aplikasi | Perlu belajar Edge Functions (Deno) |
| K7 | Percantik foto | URL transformation Cloudinary, bukan di perangkat | `expo-image-manipulator` hanya punya crop, resize, rotate, flip. **Tidak ada kecerahan, kontras, atau filter** | Preview butuh internet. Setiap kombinasi transformasi unik memakai kredit transformasi |
| K8 | Crop | Crop 4 sudut manual, juga lewat URL Cloudinary | Tanpa library native, jalan di Expo Go, bisa diedit ulang | Tidak ada deteksi tepi otomatis di v1.0 |
| K9 | Deteksi tepi otomatis | Ditunda ke backlog (B1) memakai `react-native-document-scanner-plugin` v1.0.1 | Pakai native scanner | **Tidak jalan di Expo Go**, butuh prebuild atau EAS build. README tidak menjelaskan algoritma deteksinya **(uji)** |
| K10 | Tabel `USERS` | Diimplementasikan sebagai `profiles` yang tertaut ke Supabase Auth | Email dan password dikelola Auth | Kolom `password_hash` dan `email` pada ERD tidak dibuat di tabel sendiri |
| K11 | Data di aplikasi | TypeScript strict, TanStack Query, zod, `expo-image` | Cache, validasi, dan tipe yang aman | Tambahan 3 dependensi |
| K12 | Kunci Supabase di aplikasi | **Publishable key** (`sb_publishable_...`), variabel `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Kunci `anon` lama dijadwalkan dihentikan akhir 2026 | Secret key dan `service_role` tidak boleh pernah ada di aplikasi |
| K13 | Posisi SDK 54 | Tetap SDK 54 sesuai permintaan | Seluruh roadmap diverifikasi untuk SDK 54 | Per 2026-10-10 versi terbaru Expo sudah SDK 57. Pakai dokumen `docs.expo.dev/versions/v54.0.0/`, pasang paket dengan `npx expo install`, dan pasang Expo Go yang sesuai SDK 54 dari expo.dev/go |
| K14 | Rute admin | Folder biasa `app/admin/` (URL `/admin`, `/admin/pengguna`, `/admin/dokumen`, `/admin/log`), bukan grup `(admin)` | Nama grup tidak masuk URL. `(admin)/index.tsx` dan `(tabs)/index.tsx` sama-sama menjadi `/`, dan Expo Router memilih di antara rute bersama berdasarkan grup aktif atau urutan abjad | Pembatasan peran tetap dipasang di Fase 3, keamanan sebenarnya di RLS dan Edge Function |
| K15 | Tema tampilan | Tema terang saja untuk v1 (`userInterfaceStyle: "light"`); mode gelap tetap B5 | Satu palet dan satu uji kontras | HP dengan mode gelap tetap menampilkan tema terang |
| K16 | Palet warna | Sage `#4F7356`, sage lembut `#EBF2EC`, teks redup `#6F645D`, bahaya `#B04A35` (latar `#FAF6F0`, teks `#3B2F2A`) | Palet usulan awal gagal 4,5:1: teks redup 3,62, putih di sage 3,63, sage di krem 3,37 | Hijau sedikit lebih tua. Dijaga skrip `npm run cek:kontras` |
| K17 | Alias impor | `@/*` menunjuk ke `./src/*` (bukan akar proyek) | Kode aplikasi berada di `src/` sesuai bagian 3 | Berkas demo template yang memakai alias lama dihapus di tugas 1.0 |
| K18 | Cara menerapkan skema | Jalur CLI: `npx supabase link` lalu `npx supabase db push` | Riwayat migrasi tersimpan di Git dan di database, bisa diulang, sesuai kebiasaan proyek portofolio | Perlu login CLI, `link`, dan database password. Tidak boleh dicampur dengan SQL Editor pada database yang sama (galat `already exists`) |
| K19 | Penyimpanan sesi | `@react-native-async-storage/async-storage` (bukan `expo-sqlite/localStorage`) | Dokumentasi Supabase 2026-10-14 (quickstart React Native dan tutorial Expo) memakainya; jalan di Expo Go | Sesi tersimpan tanpa enkripsi. Peningkatan ke SecureStore + AES di backlog B10 |
| K20 | Pembatas rute | `Stack.Protected` bawaan Expo Router | Pengalihan otomatis saat status masuk berubah | Hanya di klien; `redirectTo` baru ada di SDK 58, jadi tujuan pengalihan ditentukan anchor `(tabs)` dan layar pertama yang diizinkan. Keamanan data tetap di RLS |
| K21 | Sumber peran | Kolom `profiles.role`, dimuat sekali per masuk dan saat aplikasi kembali aktif | Satu sumber kebenaran; kolom dikunci hak tulis di Fase 2 | Satu permintaan tambahan per masuk |
| K22 | Cara keluar | `signOut({ scope: 'local' })` | Tidak mengeluarkan perangkat lain; tetap membuang sesi lokal saat offline (diuji) | Sesi di server baru berakhir saat kedaluwarsa |

### Dampak ke diagram yang sudah dibuat

- **Flowchart dan activity diagram:** urutannya berubah. Foto diunggah dulu setelah "Pakai foto", baru dipercantik, karena efek dihitung Cloudinary dari foto yang sudah diunggah. Kotak "Auto-crop tepi dokumen" menjadi "Crop tepi dokumen (manual)".
- **ERD:** `USERS` → `profiles`, dan kolom `password_hash` serta `email` pindah ke Supabase Auth. Entitas lain tetap.
- Diagram di folder `docs/` diperbarui di Fase 10.

---

## 2. Pemetaan ERD ke implementasi

| Entitas ERD | Tabel Postgres | Kolom (tipe) | Catatan |
|---|---|---|---|
| USERS | `profiles` | `id` uuid PK, FK ke `auth.users`; `nama` text; `role` enum(`user`,`admin`) default `user`; `is_aktif` bool default true; `dibuat_pada` timestamptz | Dibuat otomatis saat daftar lewat trigger. Pengguna tidak boleh mengubah `role` dan `is_aktif` sendiri |
| DOKUMEN | `dokumen` | `id` uuid PK; `user_id` FK `profiles`; `judul` text; `status` enum(`draft`,`selesai`); `jumlah_halaman` int default 0; `dibuat_pada` timestamptz | `jumlah_halaman` dijaga trigger dari `halaman_dokumen` |
| HALAMAN_DOKUMEN | `halaman_dokumen` | `id` uuid PK; `dokumen_id` FK cascade; `urutan` int; `url_asli` text; `url_hasil` text; `public_id` text; `ukuran_byte` int | `UNIQUE (dokumen_id, urutan)` |
| EFEK_FOTO | `efek_foto` | `id` uuid PK; `halaman_id` FK unik cascade; `jenis_filter` enum(`asli`,`dokumen`,`hitam_putih`,`abu_abu`,`tajam`); `kecerahan` int; `kontras` int; `rotasi` int (0/90/180/270); `data_crop` jsonb `{x,y,w,h}` | `data_crop` jsonb menggantikan string di ERD agar bisa divalidasi |
| LOG_AKTIVITAS | `log_aktivitas` | `id` uuid PK; `admin_id` FK `profiles`; `target_user_id` uuid (tanpa FK); `aksi` text; `keterangan` text; `waktu` timestamptz default now() | Hanya diisi oleh Edge Function, bukan klien. `target_user_id` tanpa FK agar log tetap ada saat akun dihapus |

---

## 3. Struktur proyek target

```
scannest/
├─ .github/workflows/ci.yml   # CI: typecheck, lint, format:check (Fase 0, tugas 0.7)
├─ app/                       # expo-router (rute = file)
│  ├─ (auth)/                 # login.tsx, register.tsx
│  ├─ (tabs)/                 # index.tsx (Dashboard), kamera.tsx, percantik.tsx
│  ├─ dokumen/[id].tsx
│  ├─ editor/[halamanId].tsx
│  ├─ admin/                  # index.tsx, pengguna.tsx, dokumen.tsx, log.tsx (folder biasa, K14)
│  └─ +not-found.tsx          # halaman 404
├─ src/
│  ├─ components/             # Button, Card, EmptyState, ...
│  ├─ features/               # auth, scan, editor, documents, admin
│  ├─ lib/                    # supabase.ts, cloudinary.ts, env.ts
│  └─ theme/                  # warna, spasi, tipografi
├─ supabase/
│  ├─ migrations/             # SQL skema + RLS
│  └─ functions/              # Edge Functions
├─ scripts/cek-kontras.mjs    # cek kontras warna (Fase 1, tugas 1.2)
├─ docs/                      # panduan-fase-0.md, panduan-fase-1.md, panduan-fase-2.md, panduan-supabase.md; ERD dan diagram di Fase 10
├─ ROADMAP.md  README.md
├─ .env.example  .env (lokal, tidak di-commit)
├─ .prettierrc  .prettierignore  eslint.config.js   # Fase 0, tugas 0.4
```

---

## 4. Fase pengerjaan

Ringkasan: 11 fase, sekitar 22–27 sesi. Dengan 3–4 sesi per minggu, kira-kira 6–8 minggu.

| Fase | Fokus | Sesi |
|---|---|---|
| 0 | Setup proyek dan repo GitHub | 1 |
| 1 | Desain UI dan kerangka navigasi | 2 |
| 2 | Database Supabase dan keamanan (RLS) | 2 |
| 3 | Autentikasi dan peran | 2 |
| 4 | Kamera dan sesi scan | 2–3 |
| 5 | Upload ke Cloudinary | 2 |
| 6 | Percantik foto | 3–4 |
| 7 | Dashboard dan manajemen dokumen | 2–3 |
| 8 | Panel admin | 3 |
| 9 | Kualitas, keamanan, dan polish | 2–3 |
| 10 | Rilis dan GitHub | 1–2 |

### Fase 0 — Setup proyek dan repo GitHub

Panduan rinci: `docs/panduan-fase-0.md`. Nomor tugas di sini sama dengan nomor tugas di panduan, jadi "tugas 0.7" selalu berarti hal yang sama di kedua dokumen. Status per 2026-10-14: seluruh tugas 0.0 sampai 0.9 selesai (dilaporkan pengguna; riwayat perbaikan CI di catatan tugas 0.7).

- [x] 0.0 **Identitas Git** (panduan bagian 0). Di `https://github.com/settings/emails` centang **Keep my email addresses private** dan **Block command line pushes that expose my email**. Susun alamat noreply `ANGKA+USERNAME@users.noreply.github.com` (ANGKA dari baris `"id"` di `https://api.github.com/users/USERNAME`), lalu `git config --global user.name` dan `git config --global user.email`. Cek dengan `git config --show-origin --get-all user.email` (baris paling bawah yang dipakai). Idealnya dikerjakan **sebelum** 0.2, karena commit awal `create-expo-app` memakai identitas yang aktif saat itu.
- [x] 0.1 Cek `node -v` minimal 20.19.4 (hasil: 24.11.1). Panduan bagian 1.
- [x] 0.2 Buat proyek: `npx create-expo-app@latest scannest --template default@sdk-54`. Tag `sdk-54` sudah dicek ada di npm; tanpa tag ini hasilnya SDK 57. Pastikan `package.json` memuat `"expo": "~54.x"`. Template otomatis menjalankan `git init`, membuat commit awal di cabang `master`, dan menambah `AGENTS.md`, `.claude/`, `.vscode/` (boleh dibiarkan). Panduan bagian 1.
- [x] 0.3 Jalankan `npx expo install --check` dan `npx expo-doctor@latest`. Rapikan `app.json`: `name` = `Scannest` dan `android.package` (ID permanen aplikasi, contoh `com.namamu.scannest`). Panduan bagian 2. Catatan 2026-10-13: di repo `android.package` sudah terisi, tetapi `name` masih `scannest` (huruf kecil); dikoreksi di tugas 1.8.
- [x] 0.4 TypeScript `strict` (sudah `true` di `tsconfig.json`) dan ESLint ternyata **sudah aktif** di template SDK 54 (cukup diverifikasi). Yang dikerjakan (panduan bagian 3): `npm install --save-dev prettier eslint-config-prettier eslint-plugin-prettier`; buat `.prettierrc` dan `.prettierignore`; ganti isi `eslint.config.js`; tambah skrip `typecheck`, `format`, `format:check` (`npm pkg set ...`); jalankan `npm run format` sekali; pastikan `npm run typecheck`, `npm run lint`, `npm run format:check` bersih; commit.
- [x] 0.5 `.env` dan `.gitignore` (panduan bagian 4). Template hanya mengabaikan `.env*.local`, jadi tambahkan baris `.env` ke `.gitignore` sendiri dan cek dengan `git check-ignore -v .env`. Buat `.env.example` berisi `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME`, `EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET`, lalu salin menjadi `.env` (`copy .env.example .env` di Windows). Semua variabel `EXPO_PUBLIC_*` ikut terbundel ke aplikasi, jadi **jangan** menaruh secret di sini. Commit `.env.example`, bukan `.env`.
- [x] 0.6 Repo GitHub (panduan bagian 5). Pastikan `git log --format="%h  author=%ae  committer=%ce  %s"` hanya menampilkan email `noreply`; `git branch -M main`; buat repo **kosong** `scannest` di GitHub (Public, tanpa README, tanpa `.gitignore`, tanpa lisensi); `git remote add origin ...`; `git push -u origin main`. Bila push ditolak **GH007**, tulis ulang riwayat: `git rebase -r --root --exec "git commit --amend --no-edit --reset-author"`, lalu push ulang (rincian di panduan bagian 5).
- [x] 0.7 **GitHub Actions** (panduan bagian 6). Prasyarat: skrip dari 0.4 ada di `package.json` dan `package-lock.json` sudah ter-push di 0.6. Buat folder `.github/workflows/` (CMD atau PowerShell: `mkdir .github\workflows`; macOS/Linux: `mkdir -p .github/workflows`) dan berkas `.github/workflows/ci.yml` dengan nama workflow `CI`. Pemicu: push ke `main` dan setiap pull request. Satu job `check` di `ubuntu-latest` dengan langkah berurutan: `actions/checkout@v7`, `actions/setup-node@v7` (Node 24, `cache: npm`), `npm ci`, `npm run typecheck`, `npm run lint`, `npm run format:check`. Commit, push, lalu pastikan tab **Actions** di repo berstatus hijau. Versi `v7` adalah rilis terbaru pada 2026-10-10; naikkan bila GitHub memberi peringatan versi usang. **Riwayat 2026-10-13:** run pertama (commit `5d62b60`) gagal dengan galat "No event triggers defined in `on`" karena `ci.yml` ter-commit **kosong (0 byte)**. Isi ulang, simpan, cek ukuran, commit, push (panduan Langkah 2b dan bagian 6.1). Dua berkas nyasar di akar repo, `tatus` dan `h -u origin main`, dihapus dengan `git rm` (panduan 6.2). Tiga cek (`typecheck`, `lint`, `format:check`) sudah dicoba pada salinan repo dan lulus.
- [x] 0.8 Jalankan di Android (panduan bagian 7). Satu build Expo Go hanya berisi satu SDK (dokumentasi Expo), dan per 2026-10-13 `expo.dev/go` menawarkan SDK 57 sebagai terbaru, jadi pasang build **SDK 54** dari `https://expo.dev/go` (versi Play Store bisa berbeda). Sama jaringan Wi-Fi, `npm start`, pindai QR dari dalam Expo Go; bila jaringan memblokir, `npx expo start --tunnel`. Alternatif: emulator Android Studio dan `npm run android`.
- [x] 0.9 `[IMPROVISASI, P1]` Buat akun dan proyek Supabase, lalu isi `.env`. Panduan: `docs/panduan-supabase.md` bagian A (A1 daftar akun, A2 buat proyek di region Singapore dan simpan database password, A3 ambil Project URL dan publishable key, A4 isi `.env`, A5 pengaturan konfirmasi email untuk pengembangan).

**Berkas yang dibuat atau diubah di Fase 0** (daftar yang sama ada di panduan bagian 9):

| Berkas atau folder | Tugas | Status | Keterangan |
|---|---|---|---|
| `package.json` | 0.2, 0.4 | diubah | Tambah devDependencies `prettier`, `eslint-config-prettier`, `eslint-plugin-prettier` dan skrip `typecheck`, `format`, `format:check` |
| `package-lock.json` | 0.2, 0.4 | dibuat otomatis | Wajib ikut di-commit: CI memakai `npm ci` |
| `app.json` | 0.3 | diubah | `name` = `Scannest` dan `android.package` |
| `tsconfig.json` | 0.4 | diverifikasi | `strict: true` sudah aktif dari template |
| `eslint.config.js` | 0.4 | isi diganti | ESLint ditambah aturan Prettier |
| `.prettierrc` | 0.4 | baru | Gaya format kode |
| `.prettierignore` | 0.4 | baru | Berkas yang tidak diformat |
| `.gitignore` | 0.5 | diubah | Tambah baris `.env` |
| `.env.example` | 0.5 | baru | Daftar nama variabel, di-commit |
| `.env` | 0.5 (diisi di 0.9) | baru, hanya lokal | **Tidak** di-commit |
| `.github/workflows/ci.yml` | 0.7 | baru | CI: `typecheck`, `lint`, `format:check` (folder `.github` dan `workflows` ikut dibuat) |
| Berkas contoh template (`app/`, `components/`, `hooks/`, `scripts/`) | 0.4 | diformat ulang | Hasil `npm run format` |
| `ROADMAP.md`, `docs/panduan-fase-0.md`, `docs/panduan-supabase.md` | dokumen | simpan di repo | Rencana kerja dan panduan |

**Selesai bila** (sama dengan checklist akhir panduan bagian 8):

- [x] `package.json` menunjukkan `expo` berawalan `~54` (0.2)
- [x] `npx expo install --check` melaporkan dependensi sesuai (0.3)
- [x] `app.json`: `name` = `Scannest` (huruf S besar), `android.package` sudah diisi (0.3; `name` dikoreksi di 1.8)
- [x] `npm run typecheck`, `npm run lint`, `npm run format:check` bersih (0.4)
- [x] `.env` ada di `.gitignore`, `.env.example` sudah di-commit (0.5)
- [x] Repo ada di GitHub (cabang `main`), tanpa berkas `.env` (0.6)
- [x] `git log` hanya menampilkan email `noreply` (0.0, 0.6)
- [x] Tab Actions menunjukkan CI hijau dan `ci.yml` tidak kosong (0.7)
- [x] Aplikasi tampil di HP lewat Expo Go SDK 54, atau di emulator (0.8)
- [x] Proyek Supabase dibuat, URL dan publishable key masuk `.env` (0.9)

### Fase 1 — Desain UI dan kerangka navigasi

Panduan rinci: `docs/panduan-fase-1.md`. Nomor tugas di sini sama dengan nomor tugas di panduan. Tema clean, simple, cozy. **Palet final** (lolos kontras 4,5:1, K16): latar krem `#FAF6F0`, permukaan `#FFFFFF`, aksen sage `#4F7356`, sage lembut `#EBF2EC`, teks cokelat tua `#3B2F2A`, teks redup `#6F645D`, bahaya `#B04A35`. Palet usulan awal (`#6B8F71`, `#8A7F78`, `#C0553F`) diganti karena gagal kontras. Kerjakan di cabang `fase-1-ui` dan gabungkan lewat pull request setelah CI hijau. Status per 2026-10-14: seluruh tugas 1.0 sampai 1.9 selesai (dilaporkan pengguna). Catatan: tugas 1.0 dan 1.7 menghasilkan galat `tsc` sementara selama berkas belum lengkap (9, 16, 9, 11, lalu 0 galat; tabel di panduan Fase 1 bagian 13.1), dan itu wajar.

- [x] 1.0 Persiapan. Cabang `fase-1-ui`. Hapus berkas demo template (`components/`, `hooks/`, `constants/`, `scripts/`, `app/modal.tsx`, `app/(tabs)/explore.tsx`) dan skrip `reset-project`. Ubah alias `@/*` menjadi `./src/*` di `tsconfig.json` (K17). Buat folder `src/theme`, `src/components`, `scripts`, `app/(auth)`, `app/admin`, `app/dokumen`, `app/editor`.
- [x] 1.1 Design tokens di `src/theme`: `colors.ts`, `spacing.ts` (jarak 4/8/12/16/24/32, radius, `minTouchSize` 48), `typography.ts`, `navigation.ts` (opsi header seragam), `index.ts`.
- [x] 1.2 Cek rasio kontras: `scripts/cek-kontras.mjs` membaca `colors.ts` dan menguji 12 pasangan (teks minimal 4,5:1, komponen UI minimal 3:1); skrip npm `cek:kontras`.
- [x] 1.3 Font Nunito: `npx expo install @expo-google-fonts/nunito expo-font`; `app/_layout.tsx` memuat Regular, SemiBold, Bold dan menahan splash sampai font siap (atau gagal).
- [x] 1.4 Komponen dasar di `src/components`: `Button` (4 varian), `Card`, `TextField`, `EmptyState`, `ScreenHeader`, ditambah pendukung `Screen`, `PlaceholderScreen`, `DevShortcuts`. Ikon memakai Ionicons (keputusan D7 di panduan Fase 1).
- [x] 1.5 Navigasi tab bawah dengan expo-router: **Dashboard | Kamera | Percantik**.
- [x] 1.6 Safe area (edge-to-edge selalu aktif di SDK 54): komponen `Screen` dengan `edges`; `SafeAreaProvider` sudah dipasang expo-router.
- [x] 1.7 Layar kerangka untuk semua rute di bagian 3: `(auth)/login`, `(auth)/register`, `dokumen/[id]`, `editor/[halamanId]`, `admin/*`, `+not-found`. `[IMPROVISASI, P0]` `DevShortcuts` di Dashboard (hanya tampil saat `__DEV__`) agar semua rute bisa dibuka dan diuji; **dihapus di Fase 3 (tugas 3.8)**.
- [x] 1.8 `app.json`: `name` = `Scannest`, `userInterfaceStyle` = `light` (K15), warna splash `#FAF6F0`.
- [x] 1.9 Uji di HP (Expo Go SDK 54) memakai daftar uji di panduan 12.2, lalu commit, pull request, CI hijau, merge.

**Selesai bila** (sama dengan checklist akhir panduan bagian 14):

- [x] Tab Actions pada PR hijau dan PR sudah digabung ke `main` (1.9)
- [x] `npm run typecheck`, `lint`, `format:check`, dan `cek:kontras` bersih (1.1 sampai 1.7)
- [x] Tiga tab bisa dibuka dan berfungsi di HP (1.5, 1.9)
- [x] Tampilan konsisten memakai tokens, tidak ada kode warna atau angka jarak mentah di `app/` dan `src/components/` (1.1)
- [x] Tidak ada teks tertutup status bar atau tombol navigasi (1.6, 1.9)
- [x] Semua rute di bagian 3 bisa dibuka lewat pintasan (1.7)
- [x] `app.json`: `name` = `Scannest`, `userInterfaceStyle` = `light` (1.8)

### Fase 2 — Database Supabase dan keamanan

Panduan rinci: `docs/panduan-fase-2.md`. Status 2026-10-14: tugas 2.1 sampai 2.8 selesai (dilaporkan pengguna, termasuk uji RLS 34 lulus 0 gagal); 2.0 dan 2.9 menunggu penutup di tugas 3.0. Nomor tugas di sini sama dengan nomor tugas di panduan. Kerjakan di cabang `fase-2-database`. Migrasi dan tes RLS **sudah ditulis dan diuji** di PostgreSQL 16 tiruan Supabase (34 lulus, 0 gagal); pekerjaanmu menerapkannya ke proyek online lewat jalur CLI (K18), memahaminya, dan mengujinya dengan dua akun. Belum diuji oleh Claude: proyek Supabase sungguhan dan Postgres 17.

- [ ] 2.0 Persiapan. **Belum tuntas (cek repo 2026-10-14):** `main` masih memuat empat berkas nyasar dan tidak ada cabang `fase-2-database`; dikerjakan di tugas 3.0. Cabang `fase-2-database`; hapus empat berkas nyasar yang masih ter-track di akar repo (`tatus`, `h -u origin main`, `(`, `router.push(item.href)}`) dengan `git rm`; cek `npx supabase --version`. Siapkan database password dan Project Ref.
- [x] 2.1 CLI Supabase: `npx supabase login`, lalu `npx supabase link --project-ref REF`. (Status 2026-10-14: folder `supabase/` dan paket `supabase` sudah ada di repo, jadi `install` dan `init` **tidak** diulang.)
- [x] 2.2 `npx supabase db push --dry-run`, lalu `npx supabase db push`: migrasi 1 (`supabase/migrations/20261010120000_init_schema.sql`) membuat enum dan lima tabel sesuai bagian 2. Cek dengan `npx supabase migration list` dan Table Editor. Indeks `halaman_dokumen.dokumen_id` sudah tercakup constraint unik `(dokumen_id, urutan)`.
- [x] 2.3 Trigger `handle_new_user` (sudah ada di migrasi 1). Uji: tambah pengguna di Dashboard, baris `profiles` muncul otomatis.
- [x] 2.4 Trigger `sync_jumlah_halaman` (sudah ada di migrasi 1).
- [x] 2.5 RLS aktif di semua tabel (sudah ada di migrasi 1):
  - `profiles`: pengguna membaca dan mengubah `nama` miliknya; admin membaca semua.
  - `dokumen`, `halaman_dokumen`, `efek_foto`: pemilik penuh, admin hanya baca.
  - `log_aktivitas`: hanya admin yang boleh baca; **tidak ada** insert, update, delete dari klien.
- [x] 2.6 Cegah eskalasi lewat hak akses per kolom (sudah ada di migrasi 1): pengguna tidak bisa mengubah `role`, `is_aktif`, atau `jumlah_halaman`.
- [x] 2.7 Jadikan akunmu admin lewat SQL Editor Supabase (`update public.profiles set role = 'admin' where ...`), bukan lewat aplikasi. Email asli tidak ditulis di repo.
- [x] 2.8 Uji RLS dengan `supabase/tests/rls_smoke.sql` (dua akun uji, email diganti hanya di salinan SQL Editor). Target: **34 lulus, 0 gagal**. Skrip sengaja berakhir dengan pesan galat berisi laporan; datamu tidak berubah.
- [ ] 2.9 **Belum tuntas:** pengguna melaporkan commit dan PR penutup tidak dijalankan karena `ROADMAP.md` dan `docs/` belum pernah dimasukkan ke folder proyek; dikerjakan di tugas 3.0. Uji dari luar dengan `curl` memakai publishable key (opsional), commit dokumen, pull request, CI hijau, merge.

**Selesai bila:** lima tabel ada di proyek online, `migration list` menunjukkan LOCAL dan REMOTE sama, pengujian dua akun menunjukkan 34 lulus 0 gagal, migrasi tersimpan di repo, berkas nyasar terhapus, PR digabung dengan CI hijau.

### Fase 3 — Autentikasi dan peran

Panduan rinci: `docs/panduan-fase-3.md`. Nomor tugas di sini sama dengan nomor tugas di panduan (bagian panduan disusun menurut urutan pengerjaan, jadi tugas 3.3, 3.4, dan 3.7 muncul di dua bagian). Kerjakan di cabang `fase-3-auth`. Kodenya sudah teruji sebagai aplikasi web melawan server Supabase tiruan (39 skenario lulus) dan urutan langkahnya diputar ulang dengan 0 galat typecheck di tiap tahap; belum diuji di HP dan di proyek Supabase sungguhan.

- [ ] 3.0 Tutup Fase 2 dan persiapan. Salin `ROADMAP.md` dan folder `docs/` ke repo, `git rm` empat berkas nyasar (`tatus`, `h -u origin main`, `(`, `router.push(item.href)}`), commit di cabang `fase-2-database`, PR, CI hijau, merge (menutup 2.0 dan 2.9). Lalu cabang `fase-3-auth`. Cek *Confirm email* di Supabase (dimatikan selama pengembangan).
- [ ] 3.1 Pasang paket: `npx expo install @supabase/supabase-js @react-native-async-storage/async-storage react-native-url-polyfill`, lalu `npm install zod`. **Koreksi dari v0.6:** `expo-sqlite` diganti AsyncStorage karena dokumentasi Supabase 2026-10-14 memakai AsyncStorage (K19).
- [ ] 3.2 `src/lib/env.ts` (membaca `.env`, gagal cepat bila kosong) dan `src/lib/supabase.ts` (klien dengan sesi di AsyncStorage, `autoRefreshToken`, `persistSession`, `processLock`, pembaruan token mengikuti `AppState`).
- [ ] 3.3 Validasi zod (`src/features/auth/schemas.ts`: email, sandi minimal 8, nama maksimal 80) dan layar daftar serta masuk sungguhan, dengan `Banner` untuk galat formulir.
- [ ] 3.4 Context sesi `AuthProvider` dan `useAuth()`: sesi, `profiles.role`, status `loading`/`signedOut`/`signedIn`/`error`; profil dimuat lewat effect (bukan di dalam callback `onAuthStateChange`).
- [ ] 3.5 Route guard dengan `Stack.Protected` di `app/_layout.tsx`: belum masuk hanya ke `(auth)`; `admin/` hanya untuk `role = admin`; splash ditahan sampai status jelas (K20).
- [ ] 3.6 Akun `is_aktif = false` (atau profil tidak ada) otomatis dikeluarkan dengan pesan jelas; profil dicek ulang saat aplikasi kembali ke layar depan.
- [ ] 3.7 Keluar (`AccountCard` di Dashboard, `scope: 'local'`, K22) dan penanganan galat: pesan Indonesia untuk sandi salah, email terdaftar, jaringan putus, batas kirim; layar `ProfileErrorScreen` dengan Coba lagi.
- [ ] 3.8 `[dari Fase 1]` Hapus `DevShortcuts` dan berkasnya; Dashboard memakai `AccountCard`; `Screen` mendapat prop `avoidKeyboard` (`KeyboardAvoidingView`) agar keyboard tidak menutupi kolom (belum teruji di Android asli); `cek-kontras` bertambah menjadi 15 pasangan.
- [ ] 3.9 Uji di HP memakai daftar di panduan 10.2 (termasuk uji akun nonaktif lewat SQL Editor), lalu commit, pull request, CI hijau, merge.

**Selesai bila:** daftar, masuk, dan keluar bekerja di HP; login bertahan setelah aplikasi ditutup paksa; user biasa tidak bisa membuka rute admin; akun nonaktif dikeluarkan dan tidak bisa masuk; `DevShortcuts` terhapus; `typecheck`, `lint`, `format:check`, `cek:kontras` bersih; PR digabung dan CI hijau.

### Fase 4 — Kamera dan sesi scan

- [ ] 4.1 Pasang `expo-camera` dan `expo-image-manipulator` (`npx expo install`).
- [ ] 4.2 Izin kamera: jelaskan alasannya; jika ditolak, tombol menuju `Linking.openSettings()`.
- [ ] 4.3 `CameraView` dengan tombol jepret, flash (off/on/auto), dan grid panduan.
- [ ] 4.4 Layar tinjau: **Pakai foto** atau **Ulang**.
- [ ] 4.5 Normalisasi sebelum unggah memakai API manipulator SDK 54 (`ImageManipulator.manipulate(uri).resize({ width: 2000 })` → `renderAsync()` → `saveAsync({ format: JPEG, compress: 0.85 })`). Langkah ini juga memastikan orientasi EXIF sudah menyatu di piksel **(uji dengan beberapa foto portrait dan landscape)**.
- [ ] 4.6 Sesi scan di context: daftar halaman sementara, tombol **Tambah halaman**, hapus atau urutkan ulang halaman.
- [ ] 4.7 Aturan memori: simpan hanya URI file, bukan base64.

**Selesai bila:** bisa memotret beberapa halaman dalam satu sesi, hasilnya dinormalisasi dan siap diunggah.

### Fase 5 — Upload ke Cloudinary

- [ ] 5.1 Di dashboard Cloudinary buat **unsigned upload preset**: folder `scannest`, `allowed_formats` = `jpg,png`, `disallow_public_id` = true, incoming transformation `c_limit,w_2000,h_2000`.
- [ ] 5.2 `src/lib/cloudinary.ts`: fungsi `uploadImage(uri)` mengirim `multipart/form-data` (`file` + `upload_preset`) ke endpoint upload Cloudinary milik akunmu **(verifikasi endpoint di dokumentasi Upload API)**.
- [ ] 5.3 Pakai `XMLHttpRequest` agar progress bisa ditampilkan.
- [ ] 5.4 Validasi ukuran di aplikasi (usulan: tolak lebih dari 8 MB) karena preset tidak membatasi ukuran.
- [ ] 5.5 Retry 2 kali dengan jeda bertahap, lalu pesan error yang jelas.
- [ ] 5.6 Simpan hasil ke Supabase: buat `dokumen` (status `draft`), isi `halaman_dokumen` (`url_asli`, `url_hasil` awal = `url_asli`, `public_id`, `ukuran_byte`, `urutan`).
- [ ] 5.7 Jika unggah halaman ke-N gagal, halaman sebelumnya tetap aman dan pengguna bisa mengulang hanya halaman yang gagal.

**Selesai bila:** foto dari kamera muncul di Cloudinary dan tercatat di tabel `halaman_dokumen` dengan `public_id` yang benar.

### Fase 6 — Percantik foto (non-destruktif)

Semua efek disimpan sebagai parameter di `efek_foto`. Foto asli tidak berubah. Urutan rantai transformasi: **crop → rotasi → efek**.

- [ ] 6.1 **Verifikasi sintaks** di Transformation Reference Cloudinary untuk crop berkoordinat, rotasi, `e_grayscale`, `e_blackwhite`, `e_brightness`, `e_contrast`, `e_sharpen`. Hanya `e_improve` yang sudah terverifikasi (`.../upload/e_improve/<public_id>`). Uji tiap URL di browser sebelum menulis kode.
- [ ] 6.2 Fungsi murni `buildCloudinaryUrl(publicId, efek)` dan unit test Jest untuk semua kombinasi (asli, dokumen, hitam-putih, abu-abu, tajam, kecerahan, kontras, rotasi, crop).
- [ ] 6.3 Layar editor `editor/[halamanId]`: tampilkan foto, muat `efek_foto` jika sudah ada.
- [ ] 6.4 Overlay crop 4 sudut (Gesture Handler + Reanimated) dengan koordinat dalam piksel gambar yang sudah dinormalisasi.
- [ ] 6.5 Tombol rotasi 90 derajat.
- [ ] 6.6 Chip filter: Asli, Dokumen (`e_improve`), Hitam-putih, Abu-abu, Tajam.
- [ ] 6.7 Slider kecerahan dan kontras, preview di-debounce sekitar 300 ms dengan indikator loading.
- [ ] 6.8 Tombol bandingkan sebelum/sesudah dan **Reset**.
- [ ] 6.9 **Simpan**: upsert `efek_foto`, perbarui `halaman_dokumen.url_hasil`, ubah status dokumen menjadi `selesai` bila semua halaman sudah diproses.
- [ ] 6.10 Tab **Percantik**: daftar halaman yang belum dipercantik, ketuk untuk membuka editor.
- [ ] 6.11 Pantau pemakaian transformasi di dashboard Cloudinary selama pengujian.

**Selesai bila:** efek terlihat di preview, tersimpan, dan tetap sama saat editor dibuka ulang.

### Fase 7 — Dashboard dan manajemen dokumen

- [ ] 7.1 Daftar dokumen (`FlatList`, pull-to-refresh, paginasi) dengan TanStack Query.
- [ ] 7.2 Thumbnail memakai URL Cloudinary berukuran kecil (misalnya `c_fill,w_300,f_auto,q_auto`) dan `expo-image` untuk cache.
- [ ] 7.3 Detail dokumen: geser antar halaman, tampilkan `url_hasil`.
- [ ] 7.4 Ganti nama dokumen.
- [ ] 7.5 Hapus dokumen: pemanggilan Edge Function `delete-asset` yang menghapus file di Cloudinary lebih dulu, baru baris database (halaman dan efek ikut terhapus lewat cascade).
- [ ] 7.6 Pencarian judul dan filter status.
- [ ] 7.7 Empty state dan skeleton loading.

**Selesai bila:** CRUD dokumen lengkap, hapus benar-benar menghapus file di Cloudinary, daftar tetap lancar dengan 50+ dokumen uji.

### Fase 8 — Panel admin

Semua aksi yang mengubah data berjalan lewat Edge Function yang memverifikasi JWT dan `role = admin`, lalu menulis `log_aktivitas` di sisi server.

- [ ] 8.1 Edge Functions: `admin-set-user-active`, `admin-delete-user`, `admin-delete-document`, memakai service role key yang hanya ada di sisi Supabase.
- [ ] 8.2 Setiap function menolak pemanggil non-admin dan menulis baris `log_aktivitas`.
- [ ] 8.3 Layar statistik: jumlah pengguna, dokumen, halaman, dan total `ukuran_byte`.
- [ ] 8.4 Kelola pengguna: daftar, cari, aktifkan atau nonaktifkan, hapus akun (dengan konfirmasi dan pembersihan file Cloudinary miliknya).
- [ ] 8.5 Tinjau dokumen: daftar semua dokumen, lihat, hapus.
- [ ] 8.6 Log aktivitas: daftar terbaru dengan filter aksi dan admin.
- [ ] 8.7 Uji penolakan: akun user biasa memanggil function admin dan harus ditolak.

**Selesai bila:** keempat layar admin berfungsi, setiap aksi tercatat di log, dan user biasa tidak bisa menembus function admin.

### Fase 9 — Kualitas, keamanan, dan polish

- [ ] 9.1 Error state dan pesan ramah di semua alur (jaringan putus, izin ditolak, kuota habis).
- [ ] 9.2 Checklist keamanan: tidak ada secret di repo (cek riwayat git), RLS ditinjau ulang (termasuk B8), preset Cloudinary sudah dibatasi.
- [ ] 9.3 Aksesibilitas dasar: label tombol, ukuran sentuh minimal 44 px, kontras.
- [ ] 9.4 Ikon aplikasi, splash screen, nama aplikasi **Scannest**.
- [ ] 9.5 Uji manual di minimal dua perangkat atau ukuran layar, termasuk Android dengan navigasi gestur dan tombol.
- [ ] 9.6 Kerjakan item backlog P2 sejauh kapasitas.

**Selesai bila:** checklist uji manual lulus tanpa bug P0 atau P1 yang terbuka.

### Fase 10 — Rilis dan GitHub

- [ ] 10.1 Perbarui diagram di `docs/` sesuai keputusan di bagian 1.
- [ ] 10.2 `README.md`: deskripsi, screenshot, GIF demo, arsitektur, cara menjalankan, cara membuat akun Supabase dan Cloudinary sendiri.
- [ ] 10.3 `LICENSE` (usulan MIT), `.env.example` final, `CHANGELOG.md`.
- [ ] 10.4 Build APK (EAS Build atau build lokal lewat `npx expo run:android --variant release`); cek kuota build EAS di akunmu sebelum memilih.
- [ ] 10.5 Tag `v1.0.0` dan buat GitHub Release dengan APK terlampir.
- [ ] 10.6 Rapikan repo: topik GitHub, issue template, pin ke profil.
- [ ] 10.7 Bahan konten: rekam proses build per fase sebagai materi konten Apps Developer.

**Selesai bila:** orang lain bisa clone repo, mengikuti README, dan menjalankan aplikasi; APK terunduh dari Releases.

---

## 5. Backlog improvisasi

Baris dengan status **Usulan** berasal dari Claude dan belum disetujui. Permintaanmu akan ditambahkan di tabel ini.

| ID | Item | Prioritas | Fase tujuan | Status |
|---|---|---|---|---|
| B1 | Deteksi tepi dokumen otomatis (`react-native-document-scanner-plugin`), uji dulu di perangkat | P1 | Setelah Fase 8 bila lolos uji | Usulan |
| B2 | Ekspor dokumen multi-halaman ke PDF | P2 | Fase 9 | Usulan |
| B3 | Antrean upload saat offline | P2 | Fase 9 | Usulan |
| B4 | GitHub Action ping mingguan agar proyek Supabase tidak di-pause | P2 | Fase 9 | Usulan |
| B5 | Mode gelap | P3 | Setelah v1.0.0 | Usulan |
| B6 | OCR dan pencarian isi teks dokumen | P3 | Setelah v1.0.0 | Usulan |
| B7 | Naik ke SDK Expo yang lebih baru (SDK 54 sudah bukan yang terbaru) | P3 | Setelah v1.0.0 | Usulan |
| B8 | Pindahkan fungsi bantu `security definer` (`is_admin` dan kawan-kawan) dari skema `public` ke skema privat; dokumentasi Supabase menyarankan fungsi seperti ini tidak berada di skema yang terekspos. Risiko sekarang kecil (hanya pengguna login yang boleh memanggil, dan hanya mengungkap status dirinya sendiri), jadi migrasi yang sudah diuji tidak diubah dulu | P2 | Fase 9 (tugas 9.2) | Usulan |
| B9 | Konfirmasi email dan "Lupa kata sandi" lewat deep link `scannest://` (tautan email membuka aplikasi); nyalakan lagi *Confirm email* sebelum rilis | P2 | Fase 9 | Usulan |
| B10 | Enkripsi sesi: SecureStore menyimpan kunci AES, sesi terenkripsi di AsyncStorage (pola dokumentasi Supabase) | P2 | Fase 9 | Usulan |

---

## 6. Risiko dan mitigasi

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Kuota Cloudinary (25 kredit) habis | Akun bisa dinonaktifkan | Pantau dashboard tiap fase 5–7, kecilkan thumbnail, batasi jumlah kombinasi efek |
| Proyek Supabase di-pause | Aplikasi tidak bisa login | Aktifkan B4, atau buka proyek tiap minggu |
| Sintaks transformasi Cloudinary berbeda dari dugaan | Fase 6 tertunda | Tugas 6.1 memverifikasi lewat browser sebelum coding |
| Orientasi EXIF membuat crop meleset | Hasil crop salah | Normalisasi di 4.5 dan uji foto portrait/landscape |
| Secret ikut ter-commit | Akun disalahgunakan | `.env` di `.gitignore`, hanya kunci publik di aplikasi, tinjau di 9.2 |
| Scope membengkak | Rilis molor | Aturan prioritas bagian 0; improvisasi non-P0 masuk antrean |

---

## 7. Cara kerja per sesi

1. Buka bagian **Fase berjalan** dan pilih tugas centang berikutnya.
2. Minta Claude mengerjakan tugas itu: kode lengkap dengan penjelasan per baris, perintah yang harus dijalankan, dan cara mengujinya.
3. Jalankan dan uji di Android. Laporkan hasil atau error persisnya.
4. Commit dengan pesan jelas (contoh: `feat(auth): add login screen`), lalu centang tugas.
5. Akhiri sesi dengan memperbarui baris "Fase berjalan" di bagian atas.

## 8. Konvensi commit

`feat`, `fix`, `docs`, `chore`, `refactor`, `test`. Satu tugas roadmap sebaiknya menghasilkan satu atau beberapa commit kecil.

## 9. Log perubahan

| Tanggal | Versi | Perubahan |
|---|---|---|
| 2026-10-14 | 0.7 | Fase 2 dicentang (2.1 sampai 2.8, laporan pengguna) kecuali 2.0 dan 2.9: pengguna menyampaikan `ROADMAP.md` dan panduan fase 0 sampai 2 tidak pernah dimasukkan ke folder proyek, dan cek repo memastikan `main` berhenti di PR #1 dengan empat berkas nyasar masih ada; penutupnya dipindah ke tugas 3.0. Fase 3 diperinci menjadi 3.0 sampai 3.9 dan panduan Fase 3 ditulis. **Koreksi:** tugas 3.1 lama menyebut `expo-sqlite`, dokumentasi Supabase terbaru memakai AsyncStorage (K19). Ditambah K19 sampai K22, backlog B9 (konfirmasi email dan reset sandi via deep link) dan B10 (enkripsi sesi). `cek-kontras` menangkap cacat pada kotak pesan galat rancangan awal (teks merah di latar merah muda 4,37:1) sehingga teks kotak pesan memakai warna teks utama; pasangan menjadi 15 |
| 2026-10-14 | 0.6 | Fase 0 (0.0 sampai 0.9) dan Fase 1 (1.0 sampai 1.9) dicentang berdasarkan laporan pengguna; fase berjalan menjadi Fase 2. **Koreksi panduan Fase 1:** bagian 4.6 dan 7.10 keliru menyatakan galat `tsc` yang tersisa hanya di `app/`; sebenarnya `DevShortcuts` (typedRoutes) ikut galat sampai berkas rute dibuat dan `npx expo start` menyegarkan tipe. Tabel galat per tahap hasil replay (9, 16, 9, 11, 0) ditambahkan di bagian 13.1; setiap blok kode kini berlabel `Berkas:` dengan status berkas baru atau lama (jawaban atas pertanyaan 10.2: blok itu untuk `app/dokumen/[id].tsx` dan `app/editor/[halamanId].tsx`). Pengecekan repo 2026-10-14: empat berkas nyasar (`tatus`, `h -u origin main`, `(`, `router.push(item.href)}`, akibat kode ditempel ke terminal) masih ter-track dan dihapus di tugas 2.0. Fase 2 diperinci menjadi tugas 2.0 sampai 2.9 dan panduan Fase 2 ditulis; ditambah K18 (jalur CLI) dan B8 (fungsi `security definer`). Sumber Supabase ditambahkan |
| 2026-10-13 | 0.5 | Run CI pertama gagal: `ci.yml` ter-commit kosong (0 byte; galat "No event triggers defined in `on`"), ditemukan dengan membaca repo publik dan halaman run. Tugas 0.7 dikembalikan ke belum selesai; panduan Fase 0 diperbarui (Langkah 2b cek berkas, 6.1 pembacaan run merah, 6.2 berkas nyasar `tatus` dan `h -u origin main`, bagian 7 Expo Go SDK 54 dengan sumber). `app.json` `name` ternyata masih `scannest`. Panduan Fase 1 ditulis dan Fase 1 di roadmap diperinci jadi tugas 1.0 sampai 1.9. Koreksi dari verifikasi: palet usulan gagal kontras 4,5:1 (K16), rute `(admin)` bentrok dengan Dashboard di `/` (K14), alias `@/` ke `src/` (K17), tema terang saja untuk v1 (K15); tugas 3.8 ditambah untuk menghapus `DevShortcuts` |
| 2026-10-12 | 0.4 | Sinkronisasi roadmap dan Panduan Fase 0 (hanya Fase 0). Ditambah tugas 0.0 (identitas Git); tugas 0.2 sampai 0.9 diperinci sama dengan panduan (berkas, perintah, versi); 0.7 kini memuat folder `.github/workflows/` dan `ci.yml`; tugas 0.0 sampai 0.7 dicentang; ditambah daftar berkas Fase 0, "Selesai bila" disamakan dengan checklist panduan, pohon proyek bagian 3 memuat berkas dari Fase 0, dan sumber GitHub di bagian 10 |
| 2026-10-12 | 0.3 | Push pertama ditolak GH007 (commit memakai email asli, perlindungan privasi email GitHub aktif). Perbaikan: ganti identitas ke email noreply lalu tulis ulang riwayat dengan `git rebase -r --root --exec "git commit --amend --no-edit --reset-author"`. Panduan Fase 0 diperbaiki: pengaturan identitas dipindah ke bagian 0 (sebelum commit pertama) dan ditambah pemecahan masalah GH007 |
| 2026-10-10 | 0.2 | Fase 0 dimulai. Hasil verifikasi: tag `latest` Expo sudah SDK 57 (wajib `--template default@sdk-54`); TypeScript strict dan ESLint sudah aktif di template; `.env` belum di-ignore template; cabang awal `master`; kunci Supabase memakai publishable key (K12, K13). Permintaan: tutorial Supabase dari nol, ditambahkan sebagai tugas 0.9 `[IMPROVISASI, P1]` dan migrasi serta uji RLS Fase 2 disiapkan lebih awal. Panduan baru di `docs/` |
| 2026-10-10 | 0.1 | Roadmap pertama. Hasil verifikasi mengubah rancangan awal: percantik lewat Cloudinary (K7), crop manual (K8), `USERS` jadi `profiles` (K10), urutan alur unggah sebelum percantik |

## 10. Sumber verifikasi (diakses 2026-10-10)

- Expo SDK 54: https://expo.dev/changelog/sdk-54
- expo-image-manipulator (SDK 54): https://docs.expo.dev/versions/v54.0.0/sdk/imagemanipulator/
- Cloudinary plan dan kredit: https://cloudinary.com/documentation/billing_and_plans
- Cloudinary upload preset: https://cloudinary.com/documentation/upload_presets
- Cloudinary `e_improve`: https://cloudinary.com/documentation/image_enhancement
- Supabase pricing: https://supabase.com/pricing
- react-native-document-scanner-plugin: https://github.com/websitebeaver/react-native-document-scanner-plugin
- GitHub, memblokir push dengan email pribadi (diakses 2026-10-12): https://docs.github.com/en/account-and-profile/how-tos/email-preferences/blocking-command-line-pushes-that-expose-your-personal-email-address
- GitHub, mengatur email commit (diakses 2026-10-12): https://docs.github.com/en/account-and-profile/how-tos/email-preferences/setting-your-commit-email-address
- GitHub, format alamat noreply (diakses 2026-10-12): https://docs.github.com/en/account-and-profile/reference/email-addresses-reference
- GitHub Actions, rilis terbaru `actions/checkout` dan `actions/setup-node` (diakses 2026-10-10): https://github.com/actions/checkout/releases/latest dan https://github.com/actions/setup-node/releases/latest
- Expo Go dan ketidakcocokan versi SDK (diakses 2026-10-13): https://docs.expo.dev/troubleshooting/expo-go-version-mismatch/
- Expo, membuka proyek di perangkat dan mode tunnel (diakses 2026-10-13): https://docs.expo.dev/get-started/start-developing/
- Expo Go di App Store dan Play Store, Mei 2026 (diakses 2026-10-13): https://expo.dev/changelog/expo-go-and-app-store-may-2026
- Expo Router, rute bersama antar grup (diakses 2026-10-13): https://docs.expo.dev/router/advanced/shared-routes/
- `react-native-safe-area-context` SDK 54 (diakses 2026-10-13): https://docs.expo.dev/versions/v54.0.0/sdk/safe-area-context/
- WCAG 2.2, kontras (diakses 2026-10-13): https://www.w3.org/TR/WCAG22/#contrast-minimum dan https://www.w3.org/TR/WCAG22/#non-text-contrast
- Supabase CLI, `db push` dan `migration list` (diakses 2026-10-14): https://supabase.com/docs/reference/cli/supabase-db-push
- Supabase CLI, `link` (diakses 2026-10-14): https://supabase.com/docs/reference/cli/supabase-link
- Supabase, API keys: publishable, secret, dan jadwal penghentian kunci lama (diakses 2026-10-14): https://supabase.com/docs/guides/api/api-keys
- Supabase, Row Level Security (diakses 2026-10-14): https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase, Auth dengan React Native (diakses 2026-10-14): https://supabase.com/docs/guides/auth/quickstarts/react-native
- Supabase, tutorial Expo React Native dan opsi SecureStore (diakses 2026-10-14): https://supabase.com/docs/guides/getting-started/tutorials/with-expo-react-native
- Supabase, kode galat Auth (diakses 2026-10-14): https://supabase.com/docs/guides/auth/debugging/error-codes
- Supabase, Password security (diakses 2026-10-14): https://supabase.com/docs/guides/auth/password-security
- Expo Router, Protected routes (diakses 2026-10-14): https://docs.expo.dev/router/advanced/protected/
- Expo, konfigurasi app.json dan edge-to-edge (diakses 2026-10-14): https://docs.expo.dev/versions/v54.0.0/config/app/ dan https://expo.dev/blog/edge-to-edge-display-now-streamlined-for-android
