# Panduan Supabase untuk Scannest (dari nol)

Panduan untuk pemula yang baru pertama kali memakai Supabase. Bagian A (membuat proyek dan mengambil kunci) adalah **tugas 0.9** dan bisa dikerjakan sekarang. Bagian B dan seterusnya adalah **Fase 2** (membuat tabel dan aturan keamanan); boleh dikerjakan setelah Fase 1, atau sekarang bila kamu ingin.

**Apa yang sudah saya uji dan apa yang belum:**

- Teruji: seluruh SQL (`supabase/migrations/..._init_schema.sql`) dijalankan di PostgreSQL 16 dengan tiruan lingkungan Supabase. Skrip uji keamanan (`supabase/tests/rls_smoke.sql`) memberi 34 lulus dan 0 gagal. Saya juga sengaja merusak aturan keamanan lima kali dan skrip uji mendeteksi semuanya. Perintah `supabase init` dan pemasangan CLI juga saya jalankan.
- Belum teruji: tampilan Dashboard Supabase (nama menu bisa sedikit berbeda dari yang saya tulis) dan perintah `link` serta `db push` ke proyek Supabase sungguhan, karena saya tidak punya akunmu. Untuk bagian itu saya mengikuti dokumentasi resmi.

---

## 0. Konsep dalam 5 menit

| Istilah | Artinya | Dipakai di Scannest untuk |
|---|---|---|
| **Supabase** | Layanan backend: database PostgreSQL, login pengguna, dan fungsi server dalam satu paket. | Menyimpan data akun, dokumen, halaman, efek, dan log. |
| **Auth** | Sistem login bawaan. Email dan password disimpan aman di tabel `auth.users`. | Daftar dan masuk. Kita tidak menyimpan password sendiri. |
| **Tabel** | Seperti lembar Excel: baris adalah data, kolom adalah atribut. | Lima tabel dari ERD. |
| **Migrasi** | File SQL bertanggal yang membuat atau mengubah tabel. Disimpan di repo agar riwayat perubahan database tercatat. | `supabase/migrations/`. |
| **RLS** (Row Level Security) | Aturan per baris: siapa boleh membaca atau mengubah baris yang mana. Tanpa aturan, tidak ada akses. | Pengguna hanya melihat dokumennya sendiri. |
| **Publishable key** | Kunci publik yang boleh ada di aplikasi. Kekuatannya dibatasi RLS. | `.env` aplikasi. |
| **Secret key** | Kunci super yang **melewati RLS**. Hanya untuk server. | **Tidak boleh** ada di aplikasi atau repo. |
| **Edge Function** | Kode kecil yang berjalan di server Supabase. | Admin menghapus file Cloudinary dan mencatat log (Fase 8). |

---

# Bagian A. Tugas 0.9: buat proyek dan ambil kunci

## A1. Daftar akun

1. Buka **https://supabase.com** dan klik **Start your project** atau **Sign in**.
2. Masuk memakai akun GitHub (paling mudah).

## A2. Buat proyek

1. Di Dashboard, klik **New project**.
2. Isi:

| Isian | Nilai |
|---|---|
| Organization | Organisasi pribadimu (otomatis ada). |
| Project name | `scannest` |
| Database password | Klik **Generate a password**, lalu **simpan di password manager**. Dibutuhkan nanti saat `supabase link` dan `db push`. Jangan masukkan ke repo. |
| Region | Pilih yang terdekat dengan Indonesia: **Southeast Asia (Singapore)**. |
| Plan | **Free**. |

3. Klik **Create new project** dan tunggu beberapa menit sampai status siap.

Batas paket Free (dicek 10 Oktober 2026): database 500 MB per proyek, 50.000 pengguna aktif bulanan, maksimal 2 proyek aktif, dan **proyek di-pause setelah 1 minggu tanpa aktivitas**. Jika di-pause, buka Dashboard dan klik **Restore project**.

## A3. Ambil URL dan publishable key

1. Di Dashboard proyekmu, klik tombol **Connect** di bagian atas, atau buka **Settings > API Keys**.
2. Salin dua nilai:
   - **Project URL**: bentuknya `https://abcdefghijkl.supabase.co`.
   - **Publishable key**: diawali `sb_publishable_`.
3. **Jangan** salin *secret key* (`sb_secret_...`) atau *service_role* ke aplikasi.

Bagian depan URL (`abcdefghijkl`) adalah **Project Ref**. Catat, karena dipakai di `supabase link`.

## A4. Isi `.env`

Di file `.env` (bukan `.env.example`):

```
EXPO_PUBLIC_SUPABASE_URL=https://abcdefghijkl.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxxxxxx
```

Pastikan `.env` sudah ada di `.gitignore` (tugas 0.5). Restart `npm start` setelah mengubahnya.

## A5. Pengaturan email saat pengembangan

Secara bawaan, akun baru harus mengonfirmasi email dulu, dan pengiriman email bawaan Supabase dibatasi jumlahnya. Itu merepotkan saat menguji. Untuk fase pengembangan:

- Buka **Authentication** dan cari pengaturan provider **Email**; matikan **Confirm email**. (Letak menu bisa berbeda sedikit; cari kata "Confirm email".)
- Aktifkan kembali sebelum rilis.

Alternatif tanpa mengubah pengaturan: buat akun uji lewat **Authentication > Users > Add user** dan centang opsi konfirmasi otomatis.

**Selesai bila:** URL dan publishable key tersimpan di `.env`, dan secret key tidak tersalin ke mana pun.

---

# Bagian B. Fase 2: buat tabel dan keamanan

Ada dua jalur. **Jalur 1 (CLI) adalah yang direkomendasikan** karena riwayat database tersimpan di repo dan bisa diulang. **Jalur 2 (SQL Editor)** lebih sederhana untuk sekali coba. Pilih satu dan jangan campur keduanya.

## B1. Jalur 1: lewat Supabase CLI

### 1. Pasang CLI di dalam proyek

```bash
npm install supabase --save-dev
npx supabase --version
```

CLI dipasang per proyek dan dipanggil dengan `npx supabase ...`. Pada uji saya, versinya 2.120.0.

### 2. Inisialisasi folder `supabase`

```bash
npx supabase init
```

Perintah ini membuat `supabase/config.toml` dan beberapa file pendukung, dan hanya membuat file lokal (tidak menyentuh proyek di internet). Pada uji saya, ia **tidak menanyakan apa pun** dan **tidak menimpa** folder `supabase/migrations` yang sudah berisi. Jika kamu kelak ditanya soal pengaturan VS Code atau Deno, jawab `N`.

### 3. Taruh file migrasi dan uji

Dari paket starter, salin ke proyekmu:

```
supabase/migrations/20261010120000_init_schema.sql
supabase/tests/rls_smoke.sql
```

Nama file migrasi berawalan cap waktu (`20261010120000`). Supabase menjalankan migrasi berurutan menurut angka itu. **Jangan** menjalankan `supabase migration new` untuk migrasi pertama; file ini sudah migrasi pertama.

### 4. Login ke Supabase

```bash
npx supabase login
```

Browser terbuka untuk memberi izin, lalu CLI menyimpan token.

### 5. Hubungkan folder ini ke proyekmu

```bash
npx supabase link --project-ref abcdefghijkl
```

Ganti `abcdefghijkl` dengan Project Ref dari langkah A3. CLI meminta *database password* (yang kamu simpan di A2).

### 6. Lihat dulu, lalu terapkan

```bash
npx supabase db push --dry-run
npx supabase db push
```

- `--dry-run` hanya mencetak migrasi yang akan dijalankan, tanpa mengubah apa pun.
- `db push` menerapkan migrasi ke database online, dan mencatatnya di tabel riwayat sehingga tidak dijalankan dua kali.

Jika berhasil, CLI menampilkan bahwa migrasi `20261010120000_init_schema.sql` diterapkan.

## B2. Jalur 2: lewat SQL Editor (tanpa CLI)

1. Di Dashboard buka **SQL Editor** dan buat query baru.
2. Buka file `supabase/migrations/20261010120000_init_schema.sql`, salin seluruh isinya, tempel, lalu klik **Run**.
3. Riwayat migrasi tidak tercatat di jalur ini. Jika nanti ingin pindah ke jalur CLI, minta bantuan saya untuk menyelaraskannya.

## B3. Cek hasilnya di Dashboard

Buka **Table Editor**. Harus ada lima tabel di skema `public`: `profiles`, `dokumen`, `halaman_dokumen`, `efek_foto`, `log_aktivitas`. Setiap tabel seharusnya berlabel RLS aktif.

## B4. Jadikan akunmu admin

1. Daftarkan akunmu sendiri lewat aplikasi (setelah Fase 3) atau **Authentication > Users > Add user**.
2. Di **SQL Editor** jalankan (ganti emailnya):

```sql
update public.profiles
set role = 'admin'
where id = (select id from auth.users where email = 'EMAILMU@contoh.com');
```

Ini sengaja dilakukan lewat SQL Editor, bukan lewat aplikasi: pengguna biasa tidak punya hak mengubah kolom `role` (lihat bagian D).

## B5. Uji keamanan (tugas 2.8)

1. Buat **dua akun biasa** (bukan admin), misalnya `uji-a@contoh.com` dan `uji-b@contoh.com`.
2. Buka `supabase/tests/rls_smoke.sql`, ganti `GANTI_EMAIL_A` dan `GANTI_EMAIL_B` dengan email keduanya.
3. Tempel seluruh isi file ke **SQL Editor**, klik **Run**.

**Cara membaca hasilnya:** skrip ini sengaja berakhir dengan *error* yang berisi laporan. Itu bukan kegagalan; cara itu membuat seluruh perubahan uji dibatalkan otomatis sehingga akunmu tidak berubah. Cari baris:

```
Ringkasan: 34 lulus, 0 gagal
SEMUA UJI LULUS.
```

**Jika ada baris `GAGAL`:** jangan lanjut ke Fase 3. Kirim laporan lengkapnya kepada saya.

Satu catatan jujur: uji terakhir (menghapus akun A untuk memeriksa penghapusan berantai) menyentuh `auth.users`. Di Supabase online, ada kemungkinan baris itu menampilkan pesan *permission denied* karena kepemilikan tabel `auth`. Bila **hanya** baris itu yang GAGAL dengan pesan semacam itu, bukan masalah keamanan data; laporkan kepadaku dan akan kusesuaikan.

---

# Bagian C. Penjelasan isi migrasi

Berikut apa yang dilakukan tiap blok di `20261010120000_init_schema.sql`.

| Blok | Isi | Alasannya |
|---|---|---|
| 1. Tipe enum | `user_role`, `dokumen_status`, `filter_foto` | Nilai kolom dibatasi ke daftar tetap; typo seperti `admn` ditolak database. |
| 2. Tabel | `profiles`, `dokumen`, `halaman_dokumen`, `efek_foto`, `log_aktivitas` | Implementasi ERD. Ada batas panjang teks, rentang angka, dan syarat rotasi hanya 0/90/180/270. |
| 2. `unique ... deferrable initially deferred` | Pada `(dokumen_id, urutan)` | Aturan "urutan tidak boleh kembar" dicek di akhir transaksi, sehingga dua halaman bisa bertukar urutan sekaligus. |
| 3. Fungsi bantu | `is_admin()`, `is_aktif_user()`, `owns_dokumen()`, `owns_halaman()` | Dipakai ulang oleh aturan RLS. Bertanda `security definer` agar bisa membaca `profiles` tanpa terhalang RLS-nya sendiri, dan `set search_path = ''` untuk mencegah pembajakan nama tabel. |
| 4a. Trigger `handle_new_user` | Membuat baris `profiles` otomatis saat akun baru terdaftar | Nama diambil dari data pendaftaran (`options.data.nama`). |
| 4b. Trigger `sync_jumlah_halaman` | Menjaga `dokumen.jumlah_halaman` | Angka tidak bisa diisi atau dipalsukan klien. |
| 5. RLS dan policy | Aturan per tabel | Pemilik penuh atas datanya; admin hanya baca; log hanya admin yang baca dan hanya server yang tulis. |
| 6. Grant | Hak akses per **kolom** | Lapisan kedua di luar RLS: pengguna tidak bisa mengubah `role`, `is_aktif`, atau `jumlah_halaman`, walaupun mengirim permintaan langsung ke API. |

### Aturan akses ringkas

| Tabel | Pengguna biasa | Admin | Server (Edge Function) |
|---|---|---|---|
| `profiles` | Baca profil sendiri, ubah `nama` sendiri | Baca semua | Semua |
| `dokumen` | CRUD miliknya (hanya `judul` dan `status` yang boleh diubah) | Baca semua | Semua |
| `halaman_dokumen` | CRUD pada dokumen miliknya | Baca semua | Semua |
| `efek_foto` | CRUD pada halaman miliknya | Baca semua | Semua |
| `log_aktivitas` | Tidak ada akses | Baca | Tulis |

Akun dengan `is_aktif = false` kehilangan akses ke datanya sendiri, jadi pemblokiran berlaku di sisi server, bukan hanya di tampilan aplikasi.

---

# Bagian D. Hal yang perlu kamu ingat saat coding nanti

1. **Jangan kirim kolom yang tidak diizinkan.** Karena hak tulis dibatasi per kolom, memasukkan data dengan `id`, `dibuat_pada`, atau `jumlah_halaman` dari aplikasi akan ditolak dengan error `permission denied`. Biarkan database mengisinya otomatis.
2. **Upsert efek foto** (`insert ... on conflict (halaman_id)`) sudah diuji dan berfungsi. Kolom `halaman_id` sengaja diberi hak update karena upsert mengisi ulang semua kolom yang dikirim.
3. **Mengubah skema di kemudian hari:** jangan edit file migrasi yang sudah di-push. Buat migrasi baru dengan `npx supabase migration new nama_perubahan`, tulis SQL-nya, lalu `npx supabase db push`.
4. **Jangan pernah** menaruh secret key atau service_role di aplikasi atau repo.
5. **Proyek Free di-pause** setelah seminggu tanpa aktivitas. Ada backlog B4 untuk membuat pengingat otomatis.

---

# Bagian E. Pemecahan masalah

| Gejala | Kemungkinan penyebab dan solusi |
|---|---|
| `supabase link` menolak password | Salah password database. Reset di **Settings > Database** lalu coba lagi. |
| `db push` berkata tidak ada migrasi baru | Migrasi sudah pernah diterapkan, atau file tidak berada di `supabase/migrations/`. |
| `db push` gagal pada `create type ... already exists` | Kamu sebelumnya menjalankan SQL lewat SQL Editor (jalur 2). Pilih satu jalur. Bila perlu, minta bantuan saya untuk membersihkan. |
| Tabel muncul tetapi data kosong saat dibaca dari aplikasi | Normal bila belum login: RLS menolak akses anonim. |
| Aplikasi `permission denied for table ...` saat insert | Kamu mengirim kolom di luar yang diizinkan (lihat bagian D poin 1). |
| Proyek tidak merespons setelah lama tidak dipakai | Proyek Free di-pause. Klik **Restore project** di Dashboard. |

---

## Ringkasan tugas

Status 14 Oktober 2026: semua dicentang berdasarkan laporanmu bahwa Fase 0, 1, dan 2 sudah selesai.

- [x] 0.9 Proyek Supabase dibuat, URL dan publishable key masuk `.env`
- [x] 2.1 `npm install supabase --save-dev`, `npx supabase init`, `login`, `link`
- [x] 2.2 sampai 2.6 `npx supabase db push` berhasil (skema, trigger, RLS, pembatasan kolom sudah ada di file migrasi)
- [x] 2.7 Akunmu dijadikan admin lewat SQL Editor
- [x] 2.8 `rls_smoke.sql` menunjukkan 34 lulus, 0 gagal
