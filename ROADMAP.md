# Scannest — Roadmap Pembangunan

Aplikasi Android untuk memindai dokumen, merapikan hasilnya, dan menyimpannya di cloud.
Stack: Expo SDK 54 (React Native), Supabase, Cloudinary.

- Versi dokumen: 0.11
- Terakhir diperbarui: 2026-10-21
- Fase berjalan: **Fase 7 (Dashboard dan manajemen dokumen)**, panduan `docs/panduan-fase-7.md`. Fase 0 sampai 6 selesai (centang berdasarkan laporan pengguna; Fase 6 dilaporkan selesai pada 2026-10-20 tanpa rincian hasil uji HP dan pemantauan kuota Cloudinary 6.11; hasil uji orientasi foto Fase 4 juga belum dirinci). Panduan lain: `docs/panduan-fase-0.md`, `docs/panduan-fase-1.md`, `docs/panduan-fase-2.md`, `docs/panduan-fase-3.md`, `docs/panduan-fase-4.md`, `docs/panduan-fase-5.md`, `docs/panduan-fase-6.md`, `docs/panduan-supabase.md`

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
| K7 | Percantik foto | URL transformation Cloudinary, bukan di perangkat | `expo-image-manipulator` hanya punya crop, resize, rotate, flip. **Tidak ada kecerahan, kontras, atau filter** | Preview butuh internet. Setiap kombinasi transformasi unik dihitung sebagai satu transformasi (1.000 transformasi = 1 kredit; diperjelas di v0.10) |
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
| K23 | Penyimpanan sesi scan | State di memori (React context), bukan AsyncStorage | Android boleh membersihkan cache kapan saja, jadi URI tersimpan bisa menunjuk berkas hilang; mitigasinya diubah di v0.9 menjadi K27 (unggah saat **Simpan dokumen**, bukan per halaman) | Sesi hilang bila aplikasi ditutup paksa atau dimatikan Android sebelum disimpan |
| K24 | Batas halaman per sesi | 30 halaman (`HALAMAN_MAKS` di `ukuran.ts`) | Membatasi memori dan kuota Cloudinary Free | Dokumen yang lebih panjang harus dibagi; angka mudah diubah |
| K25 | Urut ulang halaman | Tombol naik dan turun, bukan seret-lepas | Tanpa paket gestur, jalan di Expo Go, mudah diakses pembaca layar | Kurang luwes untuk puluhan halaman; seret-lepas di backlog B11 |
| K26 | Normalisasi foto | `takePictureAsync({ quality: 1 })` tanpa `skipProcessing`; lalu perkecil bila lebar > 2000 dan simpan JPEG 0,85 | Kamera memutar piksel sesuai orientasi (kode sumber `expo-camera` Android); manipulator menyimpan ulang tanpa bergantung pada EXIF | Dua kali penyimpanan JPEG sedikit menurunkan mutu; perilaku Android asli belum terbukti sampai uji HP |
| K27 | Kapan foto diunggah | Saat menekan **Simpan dokumen**, bukan langsung setelah **Pakai foto** | Pengguna bebas mengurutkan, menghapus, dan memberi judul dulu; tidak ada unggahan terbuang; urutan di database langsung final; unggahan tanpa tanda tangan tidak bisa menghapus aset | Foto yang belum disimpan ikut hilang bila aplikasi ditutup paksa. Mengoreksi harapan K23 v0.8 |
| K28 | Urutan unggah | Berurutan per halaman, berhenti di kegagalan pertama; ulang hanya halaman yang gagal | Kegagalan jaringan atau preset hampir selalu berlaku untuk semua halaman; halaman sebelumnya pasti tersimpan | Satu halaman bermasalah menahan halaman sesudahnya sampai diulang atau dihapus |
| K29 | Hasil unggahan disimpan di sesi | Balasan Cloudinary (`hasil`) ikut disimpan per halaman; bila database gagal, ulang hanya penulisan database | Tidak ada unggahan ganda dan kuota tidak terbuang | Logika tambahan (status `diunggah`) |
| K30 | `.env` Cloudinary opsional saat aplikasi dibuka | `cloudinaryCloudName` dan `cloudinaryUploadPreset` bernilai `null` bila kosong; pesan jelas muncul saat Simpan | Login dan kamera tetap bisa diuji sebelum 5.1 selesai | Salah ketik nama variabel baru ketahuan saat menyimpan |
| K31 | Gestur crop dan slider | `PanResponder` bawaan React Native (menggantikan rencana Gesture Handler + Reanimated) | Tanpa paket baru dan konfigurasi worklet, jalan di Expo Go, cukup untuk 4 titik tarik dan 2 slider, bisa diuji di web | Berjalan di jalur JS; pada perangkat lambat bisa kurang mulus. Pindah ke Reanimated bila uji HP menunjukkan patah-patah |
| K32 | Slider kecerahan dan kontras | Komponen buatan sendiri `src/components/Slider.tsx` | Tanpa dependensi, area sentuh 48 dp, aksi tambah/kurang untuk pembaca layar | Kode yang dirawat sendiri |
| K33 | Sumber URL transformasi | `buildCloudinaryUrl(urlAsli, efek, opsi)` menyisipkan resep setelah `/image/upload/` pada `url_asli` (menggantikan `buildCloudinaryUrl(publicId, efek)` di v0.9) | Versi, folder, dan ekstensi terbawa persis; tidak bergantung `.env` | Bergantung pada bentuk URL Cloudinary; bila tidak dikenali mengembalikan `null` dan layar menampilkan galat |
| K34 | Pelari uji unit | `node --test` dengan type stripping Node (Node 22.18 ke atas) dan hook resolve `tests/resolve-ts.mjs` (menggantikan Jest di v0.9, tugas 6.2) | Tanpa paket baru; modul yang diuji murni | Tidak cocok untuk uji komponen layar; Jest ditambahkan di Fase 9 bila perlu (B20) |
| K35 | Pratinjau | `c_limit,h_1200,w_1200` + `q_auto` setelah resep; ditunda 300 ms; dimuat lewat `Image.prefetch`; slider berlangkah 5; efek bawaan tanpa URL transformasi; `url_hasil` tanpa pengecilan | Respons cepat, hemat kuota data, sedikit URL unik | Pratinjau bukan resolusi penuh |
| K36 | Batas kecerahan di URL | Dipotong minimal -99 (slider tetap -100 sampai 100) | Cloudinary menolak `e_brightness:-100` (diuji 2026-10-18) | Nilai -100 dan -99 menghasilkan gambar yang sama |
| K37 | Urutan dan sumber crop | Crop dikerjakan pada foto asli, sebelum rotasi; koordinat piksel foto asli di `data_crop`; `c_crop,g_north_west` | Sesuai urutan rantai crop → rotasi → efek; sintaks diuji | Tidak bisa crop pada tampilan yang sudah diputar (B16) |
| K38 | Status dokumen `selesai` | Bila setiap halaman punya baris `efek_foto` (termasuk **Simpan tanpa efek**); pembaruan status bersifat pelengkap | Satu ketukan per halaman, tanpa tombol "selesai" | "Selesai" berarti "sudah ditinjau". Tiga langkah simpan bukan satu transaksi (B19) |
| K39 | Bandingkan sebelum/sesudah | Tombol sakelar (bukan tahan-tekan) | Mudah untuk pembaca layar dan satu tangan | Satu ketukan tambahan |
| K40 | Nama dan tugas Edge Function hapus | `delete-document` (menggantikan `delete-asset` di v0.10): menghapus SEMUA file halaman di Cloudinary lalu baris `dokumen` | Satu pemanggilan menyelesaikan dua hal yang harus berurutan; nama menggambarkan hasilnya. `admin-delete-document` (Fase 8) tetap fungsi terpisah | Dua fungsi hapus dokumen yang mirip (pengguna dan admin) |
| K41 | Hak akses function | Memakai JWT pemanggil dan RLS, **bukan** service role; API secret Cloudinary hanya sebagai secret function (`supabase secrets set`) | Tidak ada kunci yang melewati RLS di function ini; pemilik dokumen diperiksa dua kali (kode dan RLS); `verify_jwt` bawaan menolak pemanggil tanpa JWT | Akun nonaktif dan admin tidak bisa memakainya (admin punya fungsi Fase 8). Hak `delete` langsung pada tabel masih ada, jadi klien nakal bisa menghapus baris tanpa file (B21) |
| K42 | Urutan dan keamanan penghapusan | File Cloudinary lebih dulu (paling banyak 4 bersamaan), baru baris database; gagal sebagian = baris tidak disentuh dan pengguna mengulang; "not found" dianggap berhasil | Tidak ada file yatim yang kehilangan jejak; aman diulang | Bila baris gagal dihapus setelah file hilang, dokumen tampil dengan gambar rusak sampai hapus diulang (pesan khusus `gagal_hapus_baris`) |
| K43 | URL gambar mini dan detail | Mini: `c_fill,g_north,h_300,w_300,f_auto,q_auto`; detail: `c_limit,h_1200,w_1200,f_auto,q_auto`; keduanya ditambahkan di AKHIR rantai efek pada `url_hasil` (menggantikan `c_fill,w_300` di v0.10) | Persegi dengan bagian atas halaman (kop surat) terlihat, bukan potongan tengah; diuji lewat konektor Cloudinary (hasil 300×300 setelah rantai crop, putar, dan efek) | Dokumen yang isinya di tengah bawah terpotong di gambar mini; satu URL unik per ukuran |
| K44 | Data di aplikasi | TanStack Query v5: kunci cache diawali id pengguna; `staleTime` 30 detik; disegarkan saat layar kembali terlihat (`useFocusEffect`); cache dibuang saat keluar; ulang sekali kecuali galat izin dan tidak ada; pembacaan Supabase memakai `.retry(false)` | Cache dan paginasi siap pakai; data akun lain tidak pernah tercampur. Temuan uji: `postgrest-js` 2.117.3 mengulang GET sendiri 3 kali (1, 2, 4 detik), sehingga ditambah ulang TanStack galat baru tampil setelah ±16 detik; kini satu lapis | Satu dependensi lagi (`@tanstack/react-query`); layar Fase 6 masih memakai pembacaan lama dengan ulang bawaan (B23) |
| K45 | Dialog konfirmasi | Komponen `Dialog` buatan sendiri di atas `Modal` React Native (bukan `Alert`) | Bisa memuat kolom isian dan pesan galat di dalam dialog; tombol terkunci saat proses; tampilan seragam | Kode yang dirawat sendiri; fokus keyboard dan pembaca layar di Android belum teruji di HP |
| K46 | Paginasi, pencarian, filter | Offset 20 baris (`range`), urut `dibuat_pada` lalu `id` menurun; pencarian `ilike %kata%` ditunda 400 ms, maksimal 100 karakter, karakter `%`, `_`, `\` di-escape; filter status; semuanya di server | Cepat untuk ratusan dokumen; tidak ada duplikat meski dokumen baru menggeser baris (`gabungTanpaGanda`) | `ilike '%...%'` tidak memakai indeks biasa (cukup untuk ratusan baris; B22); satu permintaan tambahan bila total persis kelipatan 20 |
| K47 | Dashboard hanya dokumen sendiri | Kueri daftar dan detail memfilter `user_id` secara eksplisit | RLS mengizinkan admin membaca semua dokumen; tanpa filter, Dashboard admin menampilkan dokumen semua orang | Dokumen orang lain baru terlihat lewat panel admin (Fase 8) |
| K48 | Detail dokumen | `FlatList` mendatar dengan `pagingEnabled`, plus tombol panah dan penanda "Halaman n dari m"; tombol **Percantik halaman ini** membuka editor | Bisa digeser dan bisa dioperasikan tanpa gestur (aksesibilitas) | Zoom cubit belum ada (B24) |

### Dampak ke diagram yang sudah dibuat

- **Flowchart dan activity diagram:** urutannya berubah. Foto diunggah dulu setelah **Simpan dokumen** (K27; sebelum v0.9 tertulis setelah "Pakai foto"), baru dipercantik, karena efek dihitung Cloudinary dari foto yang sudah diunggah. Kotak "Auto-crop tepi dokumen" menjadi "Crop tepi dokumen (manual)".
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
│  ├─ features/               # auth, scan, editor, dokumen, admin
│  ├─ lib/                    # supabase.ts, cloudinary.ts, env.ts
│  └─ theme/                  # warna, spasi, tipografi
├─ supabase/
│  ├─ migrations/             # SQL skema + RLS
│  └─ functions/              # Edge Functions (delete-document: Fase 7, logic.ts diuji `npm test`)
├─ scripts/cek-kontras.mjs    # cek kontras warna (Fase 1, tugas 1.2)
├─ docs/                      # panduan-fase-0.md sampai panduan-fase-7.md, panduan-supabase.md; ERD dan diagram di Fase 10
├─ tests/                     # uji unit `node --test` (Fase 6 dan 7)
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

Panduan rinci: `docs/panduan-fase-2.md`. Status 2026-10-14: tugas 2.1 sampai 2.8 selesai (dilaporkan pengguna, termasuk uji RLS 34 lulus 0 gagal); 2.0 dan 2.9 ditutup di tugas 3.0 (laporan pengguna 2026-10-16). Nomor tugas di sini sama dengan nomor tugas di panduan. Kerjakan di cabang `fase-2-database`. Migrasi dan tes RLS **sudah ditulis dan diuji** di PostgreSQL 16 tiruan Supabase (34 lulus, 0 gagal); pekerjaanmu menerapkannya ke proyek online lewat jalur CLI (K18), memahaminya, dan mengujinya dengan dua akun. Belum diuji oleh Claude: proyek Supabase sungguhan dan Postgres 17.

- [x] 2.0 Persiapan. Sempat tertunda (cek repo 2026-10-14: `main` masih memuat empat berkas nyasar); ditutup di tugas 3.0 (laporan pengguna 2026-10-16). Cabang `fase-2-database`; hapus empat berkas nyasar yang masih ter-track di akar repo (`tatus`, `h -u origin main`, `(`, `router.push(item.href)}`) dengan `git rm`; cek `npx supabase --version`. Siapkan database password dan Project Ref.
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
- [x] 2.9 Sempat tertunda: commit dan PR penutup tidak dijalankan karena `ROADMAP.md` dan `docs/` belum pernah dimasukkan ke folder proyek; ditutup di tugas 3.0 (laporan pengguna 2026-10-16). Uji dari luar dengan `curl` memakai publishable key (opsional), commit dokumen, pull request, CI hijau, merge.

**Selesai bila:** lima tabel ada di proyek online, `migration list` menunjukkan LOCAL dan REMOTE sama, pengujian dua akun menunjukkan 34 lulus 0 gagal, migrasi tersimpan di repo, berkas nyasar terhapus, PR digabung dengan CI hijau.

### Fase 3 — Autentikasi dan peran

Panduan rinci: `docs/panduan-fase-3.md`. Nomor tugas di sini sama dengan nomor tugas di panduan (bagian panduan disusun menurut urutan pengerjaan, jadi tugas 3.3, 3.4, dan 3.7 muncul di dua bagian). Kerjakan di cabang `fase-3-auth`. Kodenya sudah teruji sebagai aplikasi web melawan server Supabase tiruan (39 skenario lulus) dan urutan langkahnya diputar ulang dengan 0 galat typecheck di tiap tahap; status 2026-10-16: **selesai 100% menurut laporan pengguna** (uji HP tugas 3.9 dilakukan pengguna).

- [x] 3.0 Tutup Fase 2 dan persiapan. Salin `ROADMAP.md` dan folder `docs/` ke repo, `git rm` empat berkas nyasar (`tatus`, `h -u origin main`, `(`, `router.push(item.href)}`), commit di cabang `fase-2-database`, PR, CI hijau, merge (menutup 2.0 dan 2.9). Lalu cabang `fase-3-auth`. Cek *Confirm email* di Supabase (dimatikan selama pengembangan).
- [x] 3.1 Pasang paket: `npx expo install @supabase/supabase-js @react-native-async-storage/async-storage react-native-url-polyfill`, lalu `npm install zod`. **Koreksi dari v0.6:** `expo-sqlite` diganti AsyncStorage karena dokumentasi Supabase 2026-10-14 memakai AsyncStorage (K19).
- [x] 3.2 `src/lib/env.ts` (membaca `.env`, gagal cepat bila kosong) dan `src/lib/supabase.ts` (klien dengan sesi di AsyncStorage, `autoRefreshToken`, `persistSession`, `processLock`, pembaruan token mengikuti `AppState`).
- [x] 3.3 Validasi zod (`src/features/auth/schemas.ts`: email, sandi minimal 8, nama maksimal 80) dan layar daftar serta masuk sungguhan, dengan `Banner` untuk galat formulir.
- [x] 3.4 Context sesi `AuthProvider` dan `useAuth()`: sesi, `profiles.role`, status `loading`/`signedOut`/`signedIn`/`error`; profil dimuat lewat effect (bukan di dalam callback `onAuthStateChange`).
- [x] 3.5 Route guard dengan `Stack.Protected` di `app/_layout.tsx`: belum masuk hanya ke `(auth)`; `admin/` hanya untuk `role = admin`; splash ditahan sampai status jelas (K20).
- [x] 3.6 Akun `is_aktif = false` (atau profil tidak ada) otomatis dikeluarkan dengan pesan jelas; profil dicek ulang saat aplikasi kembali ke layar depan.
- [x] 3.7 Keluar (`AccountCard` di Dashboard, `scope: 'local'`, K22) dan penanganan galat: pesan Indonesia untuk sandi salah, email terdaftar, jaringan putus, batas kirim; layar `ProfileErrorScreen` dengan Coba lagi.
- [x] 3.8 `[dari Fase 1]` Hapus `DevShortcuts` dan berkasnya; Dashboard memakai `AccountCard`; `Screen` mendapat prop `avoidKeyboard` (`KeyboardAvoidingView`) agar keyboard tidak menutupi kolom (belum teruji di Android asli); `cek-kontras` bertambah menjadi 15 pasangan.
- [x] 3.9 Uji di HP memakai daftar di panduan 10.2 (termasuk uji akun nonaktif lewat SQL Editor), lalu commit, pull request, CI hijau, merge.

**Selesai bila:** daftar, masuk, dan keluar bekerja di HP; login bertahan setelah aplikasi ditutup paksa; user biasa tidak bisa membuka rute admin; akun nonaktif dikeluarkan dan tidak bisa masuk; `DevShortcuts` terhapus; `typecheck`, `lint`, `format:check`, `cek:kontras` bersih; PR digabung dan CI hijau.

### Fase 4 — Kamera dan sesi scan

Panduan rinci: `docs/panduan-fase-4.md`. Nomor tugas di sini sama dengan nomor tugas di panduan. Kerjakan di cabang `fase-4-kamera`. Kodenya sudah teruji sebagai aplikasi web dengan kamera tiruan Chromium (39 skenario lulus) dan 11 uji unit untuk aturan ukuran foto; urutan langkahnya diputar ulang dengan 0 galat typecheck di tiap tahap. Status 2026-10-17: **selesai menurut laporan pengguna** (seluruh panduan Fase 4 dikerjakan). Pengguna belum merinci hasil uji HP untuk **orientasi foto portrait dan landscape** (12.2 nomor 7 sampai 9); panduan Fase 5 bagian 2 menanyakannya dan cacat orientasi, bila ada, diperbaiki sebelum Fase 6 (crop dan rotasi bergantung padanya).

**Pemetaan dari v0.7:** 4.1 tetap; izin kamera (4.2 lama) dikerjakan di 4.2 dan 4.6; kamera (4.3 lama) menjadi 4.6; tinjau (4.4 lama) menjadi 4.7; normalisasi (4.5 lama) menjadi 4.3; sesi (4.6 lama) menjadi 4.4; aturan memori (4.7 lama) dipenuhi 4.3 dan 4.4. Urutannya kini mengikuti urutan pengerjaan.

- [x] 4.0 Tutup Fase 3 dan persiapan: pastikan `main` bersih dan Fase 3 sudah digabung, salin `ROADMAP.md` dan `docs/` terbaru, cabang `fase-4-kamera`.
- [x] 4.1 Pasang `expo-camera` dan `expo-image-manipulator` (`npx expo install expo-camera expo-image-manipulator`). Tipe SDK 54 diperiksa langsung di `node_modules` (dokumentasi daring untuk manipulator memuat API SDK 58).
- [x] 4.2 Izin kamera: plugin `expo-camera` di `app.json` (teks izin Indonesia, `microphonePermission: false`, `recordAudioAndroid: false`); layar penjelasan sebelum dialog sistem; bila ditolak permanen, tombol **Buka pengaturan** (`Linking.openSettings()`); izin dicek ulang saat aplikasi kembali aktif.
- [x] 4.3 Aturan ukuran dan normalisasi (`ukuran.ts`, `normalisasi.ts`): perkecil hanya bila lebar > 2000 (tidak pernah memperbesar), simpan ulang JPEG 0,85 lewat `ImageManipulator.manipulate(uri)` → `renderAsync()` → `saveAsync()`; foto diambil tanpa `skipProcessing` agar orientasi menyatu di piksel (K26).
- [x] 4.4 Sesi scan di context (`ScanSessionProvider`, `useScanSession`): daftar halaman berisi URI saja, tambah, hapus, urutkan ulang; batas 30 halaman (K24); sesi dibuang saat pengguna keluar atau berganti (K23).
- [x] 4.5 Warna `scrim` dan `onScrim` serta komponen `IconButton` (48 dp, berlabel); `cek-kontras` bertambah menjadi 16 pasangan.
- [x] 4.6 `CameraView` dengan tombol jepret, flash tiga mode (mati, hidup, otomatis), grid sepertiga yang bisa disembunyikan; kamera dilepas saat layar kehilangan fokus (hanya satu pratinjau aktif).
- [x] 4.7 Layar tinjau (**Pakai foto** atau **Ulang**) dan daftar halaman (**Tambah halaman**, naik, turun, hapus dengan konfirmasi inline, **Mulai sesi baru**); urut ulang dengan tombol (K25).
- [x] 4.8 Layar Kamera merakit tiga tahap (kamera, tinjau, daftar); kartu "Sesi scan berjalan" di Dashboard; `ScanSessionProvider` dipasang di `app/_layout.tsx`.
- [x] 4.9 Uji di HP memakai daftar di panduan 12.2 (**laporkan hasil orientasi nomor 7 sampai 9**), lalu commit, pull request, CI hijau, merge.

**Selesai bila:** bisa memotret beberapa halaman dalam satu sesi, hasilnya dinormalisasi (lebar maksimum 2000, JPEG) dan tegak untuk portrait dan landscape di HP; izin kamera ditangani (penjelasan, tolak, tolak permanen, kembali dari pengaturan); sesi bisa ditambah, diurutkan, dan dihapus; hanya URI yang disimpan; `typecheck`, `lint`, `format:check`, `cek:kontras` bersih; PR digabung dan CI hijau.

### Fase 5 — Upload ke Cloudinary

Panduan rinci: `docs/panduan-fase-5.md`. Nomor 5.1 sampai 5.7 sama dengan v0.8 (isinya diperinci); 5.0, 5.8, dan 5.9 ditambahkan di v0.9. Kerjakan di cabang `fase-5-cloudinary`. Kodenya sudah teruji sebagai aplikasi web dengan kamera tiruan Chromium melawan **Cloudinary dan tabel database tiruan** (46 skenario) dan 45 uji unit; urutan langkahnya diputar ulang dengan 0 galat typecheck setelah tiap berkas, kecuali satu galat sementara di antara 8.1 dan 8.3 yang dijelaskan di panduan. Status 2026-10-18: **selesai menurut laporan pengguna** (seluruh panduan Fase 5 dikerjakan; contoh `curl` di 3.3 dikoreksi lebih dulu karena memicu galat `curl: (26)` akibat jalur berkas literal). Sebelumnya **belum terbukti** (hanya bisa dibuktikan pengguna): Cloudinary dan Supabase sungguhan, pengiriman `FormData` berisi `{uri,name,type}` di Android, nama bidang balasan dan kalimat galat Cloudinary, serta orientasi foto di HP.

- [x] 5.0 Tutup Fase 4 dan persiapan: `main` bersih dan Fase 4 sudah digabung, salin `ROADMAP.md` dan `docs/` terbaru, cabang `fase-5-cloudinary`; laporkan hasil uji orientasi Fase 4 (12.2 nomor 7 sampai 9).
- [x] 5.1 Di dashboard Cloudinary buat **unsigned upload preset**: Signing mode *Unsigned*, folder `scannest`, `allowed_formats` = `jpg,png`, `disallow_public_id` = true, incoming transformation `c_limit,w_2000,h_2000`. Buktikan dengan `curl` (unggah berhasil, lalu dua uji penolakan: format salah dan `public_id` buatan sendiri) dan kirim JSON hasilnya; rincian parameter metode `upload` tidak terbaca utuh dari dokumentasi, jadi buktinya `curl`, bukan asumsi.
- [x] 5.2 `.env` (`EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME`, `EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET`; keduanya publik, **tanpa API secret**) dan `src/lib/cloudinary.ts`: `uploadImage(uri)` mengirim `multipart/form-data` (hanya `file` dan `upload_preset`) ke `https://api.cloudinary.com/v1_1/<cloud_name>/image/upload`; balasan dicek dengan zod (`public_id`, `secure_url`, `bytes`, `width`, `height`).
- [x] 5.3 `XMLHttpRequest` (bukan `fetch`) agar kemajuan unggahan tampil lewat `upload.onprogress`; batas waktu 60 detik per percobaan; bisa dibatalkan (`AbortController`).
- [x] 5.4 Tolak foto lebih dari 8 MB sebelum diunggah (Free plan Cloudinary 10 MB per gambar dan 25 megapiksel; preset tidak membatasi ukuran).
- [x] 5.5 Ulang 2 kali dengan jeda 1 dan 3 detik hanya untuk galat jaringan, batas waktu, dan server (5xx, 429); galat preset atau format tidak diulang; pesan Bahasa Indonesia per jenis galat.
- [x] 5.6 Simpan ke Supabase (`src/features/dokumen/api.ts`, `useSimpanDokumen`): buat `dokumen` (status `draft`, judul bawaan "Dokumen <tanggal jam>" atau isian pengguna) sekali, lalu isi `halaman_dokumen` (`url_asli`, `url_hasil` awal = `url_asli`, `public_id`, `ukuran_byte`, `urutan`); kode galat `23505` dianggap sudah tersimpan bila barisnya sama.
- [x] 5.7 Jika halaman ke-N gagal, halaman sebelumnya tetap aman dan pengguna bisa mengulang hanya halaman yang gagal (K28, K29); urutan dan urut ulang dikunci setelah dokumen dibuat.
- [x] 5.8 Rakit layar Kamera dan Dashboard: kolom judul, tombol **Simpan dokumen** / **Coba lagi (N halaman)** / **Mulai sesi baru**, status dan progress per halaman, kartu "Sesi scan berjalan" di Dashboard menampilkan sisa yang belum disimpan.
- [x] 5.9 Uji di HP memakai daftar di panduan 10.2 dan cek baris di tabel (`select` di SQL Editor), lalu commit, pull request, CI hijau, merge.

**Selesai bila:** foto dari kamera muncul di Cloudinary (folder `scannest`) dan tercatat di tabel `halaman_dokumen` dengan `public_id` yang benar dan `urutan` sesuai tampilan; kegagalan di tengah tidak menghilangkan halaman yang sudah tersimpan dan tidak membuat unggahan ganda; tidak ada rahasia (API secret, `sb_secret_`, `service_role`) di aplikasi atau repo; `typecheck`, `lint`, `format:check`, `cek:kontras` bersih; PR digabung dan CI hijau.

### Fase 6 — Percantik foto (non-destruktif)

Panduan rinci: `docs/panduan-fase-6.md`. Nomor 6.1 sampai 6.11 sama dengan v0.9 (isinya diperinci dan beberapa alat diganti: K31, K33, K34); 6.0 dan 6.12 ditambahkan di v0.10. Kerjakan di cabang `fase-6-percantik`. Semua efek disimpan sebagai parameter di `efek_foto`; foto asli tidak berubah; `url_hasil` berisi URL beresep. Urutan rantai transformasi: **crop → rotasi → filter → kecerahan → kontras**.

Status 2026-10-20: **selesai menurut laporan pengguna** ("untuk fase 6 sudah selesai semua"; rincian hasil uji HP dan angka pemakaian Cloudinary di 6.11 belum dilaporkan). Sebelumnya: kodenya sudah teruji sebagai aplikasi web melawan **Cloudinary (tiruan gambar PIL) dan tabel database tiruan** (101 pemeriksaan e2e di 9 kelompok skenario; regresi Fase 5: 48 skenario) dan 34 uji unit (`npm test`); sintaks transformasi diuji langsung ke akun Cloudinary lewat konektor pada 2026-10-18; urutan langkah panduan diputar ulang dengan 0 galat typecheck setelah tiap berkas kecuali satu galat sementara di antara `DaftarHalaman.tsx` dan `kamera.tsx` (panduan bagian 7). **Belum terbukti** (hanya bisa dibuktikan pengguna): Supabase sungguhan (`upsert` dan `update` terhadap RLS, bentuk embed `efek_foto`), gestur crop dan slider di layar sentuh Android, `Image.prefetch` di Android, dan tampilan visual efek dari Cloudinary asli.

- [x] 6.0 Tutup Fase 5 dan persiapan: `main` bersih dan Fase 5 sudah digabung, salin `ROADMAP.md` dan `docs/` terbaru, cabang `fase-6-percantik`; laporkan foto uji yang miring di Cloudinary, bila ada.
- [x] 6.1 **Verifikasi sintaks** transformasi: crop berkoordinat (`c_crop,g_north_west,...`), rotasi (`a_90`), `e_improve`, `e_blackwhite`, `e_grayscale`, `e_sharpen`, `e_brightness` (-99 sampai 100), `e_contrast` (-100 sampai 100), `c_limit` + `q_auto`. Saya sudah menguji lewat konektor (2026-10-18); pengguna membuktikan empat URL di browser (panduan 3.2).
- [x] 6.2 Fungsi murni `buildCloudinaryUrl(urlAsli, efek, opsi)` (K33) dan model `efek.ts`, dengan uji unit `node --test` (K34) untuk semua kombinasi (asli, dokumen, hitam-putih, abu-abu, tajam, kecerahan, kontras, rotasi, crop, pengecilan pratinjau).
- [x] 6.3 Layar editor `editor/[halamanId]`: memuat halaman dan `efek_foto` yang tersimpan (`muatHalaman`, pembacaan dengan zod), galat dengan **Coba lagi**; geometri crop murni (`crop.ts`) dengan uji unit.
- [x] 6.4 Overlay crop 4 sudut dan badan yang bisa digeser, koordinat dalam piksel foto asli, ukuran minimum, area sentuh 48 dp (K31, K37).
- [x] 6.5 Tombol putar 90°.
- [x] 6.6 Chip filter: Asli, Dokumen (`e_improve`), Hitam-putih, Abu-abu, Tajam.
- [x] 6.7 Slider kecerahan dan kontras (K32, langkah 5), pratinjau ditunda 300 ms dengan indikator "Memuat pratinjau..." dan tombol **Muat ulang pratinjau** saat gagal (K35, K36).
- [x] 6.8 Tombol **Bandingkan** (K39) dan **Reset**.
- [x] 6.9 **Simpan**: upsert `efek_foto`, perbarui `halaman_dokumen.url_hasil`, ubah status dokumen menjadi `selesai` bila semua halaman punya efek (K38); galat jaringan, izin, dan nol baris ditangani.
- [x] 6.10 Tab **Percantik**: daftar dokumen dan halaman (Belum/Selesai, gambar mini), ketuk untuk membuka editor; tombol **Percantik foto** setelah dokumen tersimpan di tab Kamera.
- [x] 6.11 Pantau pemakaian transformasi di dashboard Cloudinary selama pengujian (1.000 transformasi = 1 kredit; per 2026-10-18 akun tercatat 47 transformasi dan 0,22 dari 25 kredit).
- [x] 6.12 Uji di HP memakai daftar di panduan 9.2 dan cek baris di tabel (`select` di SQL Editor), lalu commit, pull request, CI hijau, merge.

**Selesai bila:** efek terlihat di pratinjau, tersimpan di `efek_foto`, `url_hasil` membuka hasil yang sama, dan efek kembali persis saat editor dibuka ulang; status dokumen menjadi `selesai` setelah semua halaman diproses; foto asli di Cloudinary tidak berubah; tidak ada rahasia di aplikasi atau repo; `typecheck`, `lint`, `format:check`, `cek:kontras`, `test` bersih; PR digabung dan CI hijau.

### Fase 7 — Dashboard dan manajemen dokumen

Panduan rinci: `docs/panduan-fase-7.md`. Nomor 7.1 sampai 7.7 sama dengan v0.10 (isinya diperinci; beberapa alat berubah: K40, K43, K44); 7.0 dan 7.8 ditambahkan di v0.11. Kerjakan di cabang `fase-7-dashboard`. Dashboard menampilkan dokumen milik sendiri (K47); hapus berjalan lewat Edge Function `delete-document` (K40 sampai K42).

Kodenya sudah teruji sebagai aplikasi web (React Native Web, Chromium) melawan **database, Cloudinary, dan Edge Function tiruan**: 75 pemeriksaan e2e (daftar 60 dokumen dengan skeleton dan paginasi, pencarian dan filter, empty state dan galat, detail dan pager, ganti nama, hapus dengan skenario batal, 502, 404, 403, jaringan putus, dan sukses; layar 360 px), regresi Fase 6 (101) dan Fase 5 (48) lulus, **81 uji unit** (`npm test`: 34 lama + 47 baru, termasuk vektor tanda tangan Cloudinary dari dokumentasi). Edge Function lolos `deno check` dan **dijalankan di Deno 2.9.6** melawan server Supabase dan Cloudinary tiruan (15 skenario: urutan hapus file lalu baris, tanda tangan dihitung ulang oleh penerima, 401, 403, 404, 502). Skrip seed 55 dokumen diuji di PostgreSQL 16 dengan migrasi Fase 2. **Belum terbukti** (hanya bisa dibuktikan pengguna): function terpasang di proyekmu (secret terbaca, `verify_jwt`), balasan `destroy` asli dari Cloudinary dan apakah gambar turunan ikut terhapus, perilaku PostgREST asli untuk `halaman_dokumen.limit=1` dan `ilike`, gestur geser pager dan pull-to-refresh di Android, serta kelancaran 55 dokumen di HP.

- [ ] 7.0 Tutup Fase 6 dan persiapan: `main` bersih dan Fase 6 sudah digabung, salin `ROADMAP.md` dan `docs/` terbaru, cabang `fase-7-dashboard`, `npm install @tanstack/react-query`; laporkan hasil uji HP Fase 6 dan angka pemakaian Cloudinary (6.11) bila ada.
- [ ] 7.1 Daftar dokumen di Dashboard: `FlatList`, pull-to-refresh, paginasi 20 baris, TanStack Query (K44, K46, K47); disegarkan saat layar kembali terlihat.
- [ ] 7.2 Gambar mini dari `url_hasil` dengan `c_fill,g_north,h_300,w_300,f_auto,q_auto` di akhir rantai efek (K43), ditampilkan dengan `expo-image` (cache disk).
- [ ] 7.3 Detail dokumen: geser antar halaman, tombol panah, penanda "Halaman n dari m", tampil `url_hasil` dengan `c_limit,h_1200` (K43, K48), tombol **Percantik halaman ini**.
- [ ] 7.4 Ganti nama dokumen (dialog, validasi 1 sampai 120 karakter, galat di dalam dialog).
- [ ] 7.5 Hapus dokumen lewat Edge Function `delete-document` (K40 sampai K42): deploy, atur secret Cloudinary, uji `curl`; hapus file di Cloudinary lebih dulu, baru baris (halaman dan efek ikut terhapus lewat cascade); dialog konfirmasi dan pesan galat per kasus.
- [ ] 7.6 Pencarian judul (ditunda 400 ms) dan filter status Semua, Draft, Selesai, dapat digabung (K46).
- [ ] 7.7 Empty state (belum ada dokumen, tidak ada hasil) dan skeleton loading di daftar dan detail.
- [ ] 7.8 Uji di HP memakai daftar di panduan 9.2, termasuk 55 dokumen uji lewat skrip seed (9.1), hapus nyata yang dicek di Media Library Cloudinary, pemantauan kuota, lalu commit, pull request, CI hijau, merge.

**Selesai bila:** CRUD dokumen lengkap (daftar, detail, ganti nama, hapus); hapus benar-benar menghilangkan file di Cloudinary dan baris di database; daftar tetap lancar dengan 50+ dokumen uji; Dashboard hanya menampilkan dokumen milik sendiri; tidak ada rahasia di aplikasi atau repo (API secret Cloudinary hanya di secret function); `typecheck`, `lint`, `format:check`, `cek:kontras`, `test` bersih; PR digabung dan CI hijau.

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
| B11 | Urut ulang halaman dengan seret-lepas (butuh paket gestur) | P3 | Setelah Fase 9 | Usulan |
| B12 | Bersihkan berkas foto sementara di cache saat halaman dihapus atau sesi dibuang | P2 | Fase 9 | Usulan |
| B13 | Peringatan konsol `@supabase/supabase-js` 2.117.3: opsi `lock` (`processLock`) sudah *deprecated* dan akan dihapus di v3, klien kini mengoordinasikan pembaruan sesi tanpa kunci; evaluasi menghapus opsinya (terlihat di peramban uji, belum dicek di HP) | P2 | Fase 9 | Usulan |
| B14 | Unggahan **bertanda tangan** lewat Edge Function (API secret hanya di server) menggantikan unsigned preset, agar preset yang terbaca dari APK tidak bisa dipakai orang lain menghabiskan kuota | P2 | Fase 9 | Usulan |
| B15 | Aset yatim di Cloudinary (terunggah tetapi tidak tercatat, misalnya aplikasi ditutup di tengah penyimpanan) dan berkas foto sementara; pembersihan lewat Edge Function (penghapusan butuh permintaan bertanda tangan, K6) | P2 | Fase 8 sampai 9 | Usulan |
| B16 | Crop pada tampilan yang sudah diputar (sekarang crop dikerjakan pada foto asli sebelum rotasi, K37) | P3 | Setelah Fase 9 | Usulan |
| B17 | Padanan aksesibel untuk crop (gestur seret belum bisa dioperasikan pembaca layar): preset rasio atau isian angka | P2 | Fase 9 | Usulan |
| B18 | Peringatan "perubahan belum disimpan" saat menutup editor | P2 | Fase 9 | Usulan |
| B19 | Simpan efek sebagai satu transaksi (fungsi RPC di database) agar `efek_foto`, `url_hasil`, dan status dokumen tidak pernah setengah jalan | P2 | Fase 9 | Usulan |
| B20 | Pindahkan uji unit Fase 4 dan 5 ke `tests/` dan evaluasi Jest untuk uji komponen | P2 | Fase 9 | Usulan |
| B21 | Cabut hak `delete` langsung pada `dokumen` dan `halaman_dokumen` dari `authenticated` agar penghapusan hanya lewat Edge Function (K41); kerjakan setelah Fase 8 supaya admin tetap punya jalur hapus | P1 | Fase 9 | Usulan |
| B22 | Pencarian berskala besar: indeks `pg_trgm` untuk `ilike '%kata%'` atau pencarian teks penuh (K46) | P3 | Setelah v1.0.0 | Usulan |
| B23 | Samakan pembacaan Fase 6 (editor, tab Percantik) dengan K44: `.retry(false)` atau TanStack Query, agar galat jaringan tampil dalam hitungan detik, bukan ±7 detik | P2 | Fase 9 | Usulan |
| B24 | Zoom cubit dan geser di detail halaman | P3 | Setelah Fase 9 | Usulan |
| B25 | Pilih banyak dokumen lalu hapus sekaligus (antrean dan kemajuan di function) | P3 | Setelah v1.0.0 | Usulan |

---

## 6. Risiko dan mitigasi

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Kuota Cloudinary (25 kredit) habis | Akun bisa dinonaktifkan | Pantau dashboard tiap fase 5–7. Transformasi murah (1.000 = 1 kredit, tiap kombinasi unik dihitung sekali); penyimpanan dan bandwidth lebih menentukan, jadi hapus foto uji dan kecilkan gambar mini |
| Proyek Supabase di-pause | Aplikasi tidak bisa login | Aktifkan B4, atau buka proyek tiap minggu |
| Sintaks transformasi Cloudinary berbeda dari dugaan | Fase 6 tertunda | Diuji 2026-10-18 (temuan: kecerahan -100 ditolak, K36); pengguna membuktikan di browser (6.1) |
| Gestur crop dan slider (`PanResponder`) patah-patah di HP | Pengalaman editor buruk | Uji HP di 6.12; bila perlu pindah ke Reanimated (K31) |
| Orientasi EXIF membuat crop meleset | Hasil crop salah | Normalisasi di 4.3 dan uji foto portrait/landscape (laporan hasil 12.2 nomor 7 sampai 9 ditunggu di 5.0) |
| Unsigned preset terbaca dari APK (K5) | Orang lain mengunggah ke akunmu dan menghabiskan kuota | Batasan preset (`allowed_formats`, `disallow_public_id`, transformasi masuk), pantau dashboard, B14 (unggahan bertanda tangan) |
| Secret ikut ter-commit | Akun disalahgunakan | `.env` di `.gitignore`, hanya kunci publik di aplikasi, tinjau di 9.2 |
| Hapus dokumen meninggalkan file yatim atau baris tanpa file | Kuota Cloudinary terbuang atau gambar rusak di daftar | Urutan hapus file lalu baris, aman diulang (K42); pantau Media Library; B15 dan B21 |
| Balasan atau perilaku `destroy` Cloudinary berbeda dari dugaan (termasuk penghapusan gambar turunan) | Hapus gagal atau file turunan tersisa | Diuji di HP pada 7.8 (hapus nyata, cek Media Library dan URL lama); log function mencatat penyebabnya |
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
| 2026-10-21 | 0.11 | Fase 6 dicentang (6.0 sampai 6.12) berdasarkan laporan pengguna (2026-10-20, tanpa rincian uji HP dan pemantauan Cloudinary); fase berjalan menjadi Fase 7. Fase 7 diperinci menjadi tugas 7.0 sampai 7.8 dan panduan Fase 7 ditulis. Ditambah K40 sampai K48 (nama fungsi hapus menjadi `delete-document` bukan `delete-asset`; gambar mini `c_fill,g_north` bukan `c_fill,w_300`; TanStack Query dengan cache per pengguna; dialog buatan sendiri), backlog B21 sampai B25, dan dua baris risiko. **Temuan dan koreksi:** (1) gambar mini `c_fill,w_300` memotong bagian tengah dan membuang kop surat; diganti `c_fill,g_north,h_300,w_300` yang diuji ke akun Cloudinary lewat konektor (hasil 300×300 setelah rantai crop, putar, dan efek; gambar turunan uji dibersihkan); (2) RLS mengizinkan admin membaca semua dokumen, jadi daftar harus memfilter `user_id` (K47); (3) uji jaringan putus menemukan `postgrest-js` 2.117.3 mengulang GET 3 kali dengan jeda 1, 2, 4 detik, sehingga bersama ulang TanStack galat baru tampil ±16 detik; diperbaiki dengan `.retry(false)` dan satu lapis ulang (K44); layar Fase 6 masih punya perilaku lama (B23); (4) penanda halaman di detail sempat berkedip mundur saat tombol panah ditekan karena peristiwa gulir di tengah animasi menimpa nilai; diperbaiki; (5) Edge Function dan tsc: berkas `supabase/functions/*/index.ts` memakai API Deno, jadi dikecualikan dari `tsconfig.json` dan ESLint, sedangkan `logic.ts` (logika murni) tetap diperiksa dan diuji `npm test`; `index.ts` diperiksa dengan `deno check` di sandbox; (6) harness e2e Fase 5 disesuaikan karena Dashboard kini membaca tabel `dokumen` (bukan regresi aplikasi); (7) struktur proyek: `features/documents` menjadi `features/dokumen` sesuai kode. **Belum terbukti:** deploy dan secret di proyekmu, balasan `destroy` asli, PostgREST asli, gestur Android |
| 2026-10-19 | 0.10 | Fase 5 dicentang (5.0 sampai 5.9) berdasarkan laporan pengguna (selesai 2026-10-18, setelah koreksi `curl`); fase berjalan menjadi Fase 6. Fase 6 diperinci menjadi tugas 6.0 sampai 6.12 dan panduan Fase 6 ditulis. Ditambah K31 sampai K39 (alat diganti dari rencana awal: `PanResponder` bukan Gesture Handler + Reanimated, `node --test` bukan Jest, `buildCloudinaryUrl(urlAsli, ...)` bukan `publicId`), backlog B16 sampai B20, dan baris risiko gestur. **Koreksi dan temuan:** (1) sintaks transformasi diuji ke akun Cloudinary: `e_brightness:-100` ditolak ("Brightness must be > -100"), jadi kode memotong ke -99; (2) catatan lama "tiap URL unik = 1 kredit" keliru: 1.000 transformasi = 1 kredit dan transformasi unik dihitung sekali, sehingga risiko kuota dari pratinjau kecil (akun per 2026-10-18: 47 transformasi, 0,22 dari 25 kredit, mayoritas penyimpanan); gambar turunan hasil uji saya dibersihkan; (3) uji web menemukan titik tarik crop di sudut yang menempel tepi tidak bisa disentuh (area sentuh 48 dp berpusat di sudut foto, separuhnya terpotong); diperbaiki dengan inset area foto dan overlay yang lebih besar setengah area sentuh; (4) chip filter memanjang ke bawah (`flexGrow: 0`); (5) label aksesibilitas tombol putar kini memuat derajat; `Slider` mendapat padanan `aria-*` untuk web; (6) hasil putar ulang panduan: 0 galat typecheck setelah tiap berkas, kecuali satu galat sementara di `kamera.tsx` setelah `DaftarHalaman.tsx` diganti. Rujukan `docs/` dan `tests/` pada struktur proyek diperbarui |
| 2026-10-17 | 0.9 | Fase 4 dicentang (4.0 sampai 4.9) berdasarkan laporan pengguna (hasil uji orientasi foto belum dirinci); fase berjalan menjadi Fase 5. Fase 5 diperinci menjadi tugas 5.0 sampai 5.9 dan panduan Fase 5 ditulis. Ditambah K27 sampai K30, backlog B14 dan B15, dan baris risiko unsigned preset. **Koreksi dan temuan:** (1) K23 v0.8 berharap Fase 5 mengunggah per halaman segera setelah "Pakai foto"; diganti K27 (unggah saat Simpan dokumen) karena unggahan tanpa tanda tangan tidak bisa dihapus dan urut ulang akan meninggalkan unggahan terbuang; catatan diagram ikut diubah. (2) Rincian parameter metode `upload` pada dokumentasi Cloudinary tidak terbaca utuh (halaman referensi memuat navigasi saja), jadi tugas 5.1 mewajibkan bukti `curl` oleh pengguna. (3) Klaim "0 galat typecheck di tiap tahap" ternyata keliru saat diputar ulang: ada satu galat sementara di `kamera.tsx` antara langkah 8.1 dan 8.3; panduan menjelaskannya. (4) Rujukan "normalisasi di 4.5" pada tabel risiko diperbaiki menjadi 4.3 |
| 2026-10-16 | 0.8 | Fase 3 dicentang (3.0 sampai 3.9) berdasarkan laporan pengguna; 2.0 dan 2.9 ikut dicentang karena ditutup di tugas 3.0; fase berjalan menjadi Fase 4. Fase 4 diperinci menjadi tugas 4.0 sampai 4.9 (urutan mengikuti urutan pengerjaan; pemetaan dari v0.7 dicatat di bagian Fase 4) dan panduan Fase 4 ditulis. Ditambah K23 sampai K26 dan backlog B11 sampai B13. **Koreksi dan temuan:** dokumentasi daring `expo-image-manipulator` memuat API SDK 58, jadi tipe SDK 54 diperiksa langsung di `node_modules` (`manipulate`, `renderAsync`, `saveAsync`, `release` tersedia di versi 14.0.8); uji menemukan cacat sesi scan yang muncul lagi setelah keluar lalu masuk dengan akun yang sama dan sudah diperbaiki (state sesi diatur ulang saat pemilik berubah); `cek-kontras` menjadi 16 pasangan |
| 2026-10-14 | 0.7 | Fase 2 dicentang (2.1 sampai 2.8, laporan pengguna) kecuali 2.0 dan 2.9: pengguna menyampaikan `ROADMAP.md` dan panduan fase 0 sampai 2 tidak pernah dimasukkan ke folder proyek, dan cek repo memastikan `main` berhenti di PR #1 dengan empat berkas nyasar masih ada; penutupnya dipindah ke tugas 3.0. Fase 3 diperinci menjadi 3.0 sampai 3.9 dan panduan Fase 3 ditulis. **Koreksi:** tugas 3.1 lama menyebut `expo-sqlite`, dokumentasi Supabase terbaru memakai AsyncStorage (K19). Ditambah K19 sampai K22, backlog B9 (konfirmasi email dan reset sandi via deep link) dan B10 (enkripsi sesi). `cek-kontras` menangkap cacat pada kotak pesan galat rancangan awal (teks merah di latar merah muda 4,37:1) sehingga teks kotak pesan memakai warna teks utama; pasangan menjadi 15 |
| 2026-10-14 | 0.6 | Fase 0 (0.0 sampai 0.9) dan Fase 1 (1.0 sampai 1.9) dicentang berdasarkan laporan pengguna; fase berjalan menjadi Fase 2. **Koreksi panduan Fase 1:** bagian 4.6 dan 7.10 keliru menyatakan galat `tsc` yang tersisa hanya di `app/`; sebenarnya `DevShortcuts` (typedRoutes) ikut galat sampai berkas rute dibuat dan `npx expo start` menyegarkan tipe. Tabel galat per tahap hasil replay (9, 16, 9, 11, 0) ditambahkan di bagian 13.1; setiap blok kode kini berlabel `Berkas:` dengan status berkas baru atau lama (jawaban atas pertanyaan 10.2: blok itu untuk `app/dokumen/[id].tsx` dan `app/editor/[halamanId].tsx`). Pengecekan repo 2026-10-14: empat berkas nyasar (`tatus`, `h -u origin main`, `(`, `router.push(item.href)}`, akibat kode ditempel ke terminal) masih ter-track dan dihapus di tugas 2.0. Fase 2 diperinci menjadi tugas 2.0 sampai 2.9 dan panduan Fase 2 ditulis; ditambah K18 (jalur CLI) dan B8 (fungsi `security definer`). Sumber Supabase ditambahkan |
| 2026-10-13 | 0.5 | Run CI pertama gagal: `ci.yml` ter-commit kosong (0 byte; galat "No event triggers defined in `on`"), ditemukan dengan membaca repo publik dan halaman run. Tugas 0.7 dikembalikan ke belum selesai; panduan Fase 0 diperbarui (Langkah 2b cek berkas, 6.1 pembacaan run merah, 6.2 berkas nyasar `tatus` dan `h -u origin main`, bagian 7 Expo Go SDK 54 dengan sumber). `app.json` `name` ternyata masih `scannest`. Panduan Fase 1 ditulis dan Fase 1 di roadmap diperinci jadi tugas 1.0 sampai 1.9. Koreksi dari verifikasi: palet usulan gagal kontras 4,5:1 (K16), rute `(admin)` bentrok dengan Dashboard di `/` (K14), alias `@/` ke `src/` (K17), tema terang saja untuk v1 (K15); tugas 3.8 ditambah untuk menghapus `DevShortcuts` |
| 2026-10-12 | 0.4 | Sinkronisasi roadmap dan Panduan Fase 0 (hanya Fase 0). Ditambah tugas 0.0 (identitas Git); tugas 0.2 sampai 0.9 diperinci sama dengan panduan (berkas, perintah, versi); 0.7 kini memuat folder `.github/workflows/` dan `ci.yml`; tugas 0.0 sampai 0.7 dicentang; ditambah daftar berkas Fase 0, "Selesai bila" disamakan dengan checklist panduan, pohon proyek bagian 3 memuat berkas dari Fase 0, dan sumber GitHub di bagian 10 |
| 2026-10-12 | 0.3 | Push pertama ditolak GH007 (commit memakai email asli, perlindungan privasi email GitHub aktif). Perbaikan: ganti identitas ke email noreply lalu tulis ulang riwayat dengan `git rebase -r --root --exec "git commit --amend --no-edit --reset-author"`. Panduan Fase 0 diperbaiki: pengaturan identitas dipindah ke bagian 0 (sebelum commit pertama) dan ditambah pemecahan masalah GH007 |
| 2026-10-10 | 0.2 | Fase 0 dimulai. Hasil verifikasi: tag `latest` Expo sudah SDK 57 (wajib `--template default@sdk-54`); TypeScript strict dan ESLint sudah aktif di template; `.env` belum di-ignore template; cabang awal `master`; kunci Supabase memakai publishable key (K12, K13). Permintaan: tutorial Supabase dari nol, ditambahkan sebagai tugas 0.9 `[IMPROVISASI, P1]` dan migrasi serta uji RLS Fase 2 disiapkan lebih awal. Panduan baru di `docs/` |
| 2026-10-10 | 0.1 | Roadmap pertama. Hasil verifikasi mengubah rancangan awal: percantik lewat Cloudinary (K7), crop manual (K8), `USERS` jadi `profiles` (K10), urutan alur unggah sebelum percantik |

## 10. Sumber verifikasi (diakses 2026-10-10; tambahan Cloudinary diakses 2026-10-17 dan 2026-10-18)

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
- Expo, Camera SDK 54 (diakses 2026-10-16): https://docs.expo.dev/versions/v54.0.0/sdk/camera/
- Expo, ImageManipulator (halaman terbaru memuat API kontekstual; tipe SDK 54 diperiksa di `node_modules`, diakses 2026-10-16): https://docs.expo.dev/versions/latest/sdk/imagemanipulator/
- Expo Router, hook `useFocusEffect` (diakses 2026-10-16): https://docs.expo.dev/router/reference/hooks/
- Cloudinary, Upload presets (diakses 2026-10-17): https://cloudinary.com/documentation/upload_presets
- Cloudinary, Client-side uploading, keamanan unggahan tanpa tanda tangan (diakses 2026-10-17): https://cloudinary.com/documentation/client_side_uploading
- Cloudinary, Upload API reference (diakses 2026-10-17; rincian metode `upload` tidak terbaca utuh): https://cloudinary.com/documentation/image_upload_api_reference
- Cloudinary, perbandingan paket: Free 10 MB per gambar dan 25 megapiksel (diakses 2026-10-17): https://cloudinary.com/pricing/compare-plans
- Cloudinary, Transformation URL API reference dan Image transformations (diakses 2026-10-18; sintaks juga diuji langsung lewat konektor): https://cloudinary.com/documentation/transformation_reference dan https://cloudinary.com/documentation/image_transformations
- Cloudinary, perbandingan paket: 1 kredit = 1.000 transformasi, 1 GB penyimpanan, atau 1 GB bandwidth; transformasi unik dihitung sekali (diakses 2026-10-18): https://cloudinary.com/pricing/compare-plans
- Expo, `expo-image` SDK 54 (diakses 2026-10-18): https://docs.expo.dev/versions/v54.0.0/sdk/image/
- React Native, PanResponder (diakses 2026-10-18): https://reactnative.dev/docs/panresponder
- Node.js, `node --test` (diakses 2026-10-18): https://nodejs.org/api/test.html
- Supabase, secret Edge Functions (`supabase secrets set`, `--env-file`, awalan `SUPABASE_` dicadangkan, variabel bawaan termasuk `SUPABASE_PUBLISHABLE_KEYS`; diakses 2026-10-21): https://supabase.com/docs/guides/functions/secrets
- Supabase CLI, `functions deploy` (flag `--use-api`, `--no-verify-jwt`; diakses 2026-10-21): https://supabase.com/docs/reference/cli/supabase-functions-deploy
- Supabase, deploy Edge Functions (diakses 2026-10-21): https://supabase.com/docs/guides/functions/deploy
- Cloudinary, menghapus aset (`destroy`, `invalidate`, tanda tangan dibuat di sisi server; diakses 2026-10-21): https://cloudinary.com/documentation/delete_assets
- Cloudinary, tanda tangan otentikasi (contoh resmi dipakai sebagai vektor uji): https://cloudinary.com/documentation/authentication_signatures
- Cloudinary Support, `destroy` mengembalikan `{ result: 'not found' }` bila `resource_type` salah atau aset tidak ada (diakses 2026-10-21): https://support.cloudinary.com/hc/en-us/community/posts/6263540034450-Destroy-returning-not-found-
- TanStack Query v5, infinite queries dan `useInfiniteQuery`: https://tanstack.com/query/v5/docs/framework/react/guides/infinite-queries
- Perilaku ulang bawaan `postgrest-js` 2.117.3 (GET diulang 3 kali dengan jeda 1, 2, 4 detik; dimatikan dengan `.retry(false)`): dibaca langsung dari kode paket di `node_modules/@supabase/postgrest-js/src/PostgrestBuilder.ts` (2026-10-21)
