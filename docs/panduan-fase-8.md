# Panduan Fase 8: Panel Admin (Scannest)

**Untuk:** Nabil Fakhri Al Muiz · **Terakhir diperbarui:** 30 Oktober 2026 · **Sinkron dengan:** `ROADMAP.md` v0.12 (Fase 8, tugas 8.0 sampai 8.8)

Setelah Fase 8 selesai, akun admin punya **panel admin** dengan empat layar: **Statistik** (jumlah pengguna, dokumen, halaman, dan ukuran penyimpanan), **Pengguna** (cari, saring, nonaktifkan, aktifkan, hapus akun), **Dokumen** (tinjau dokumen semua orang, lihat detail, hapus), dan **Log aktivitas** (riwayat aksi admin, bisa disaring per jenis aksi dan per admin). Semua aksi yang mengubah data berjalan lewat **tiga Edge Function** Supabase yang memeriksa bahwa pemanggilnya admin **sebelum** memakai kunci rahasia, lalu menulis satu baris `log_aktivitas`. Pembacaan data admin lewat **fungsi database** yang juga menolak non-admin.

**Apa yang sudah dan belum saya uji:**

- Sudah: seluruh kode saya jalankan sebagai aplikasi web (React Native Web, Expo SDK 54) dengan Chromium melawan **database dan Edge Function tiruan** buatan saya. **88 pemeriksaan e2e lulus**: akses panel (user biasa tidak melihat tombol dan tidak bisa membuka rute, admin bisa), statistik (skeleton, galat, **Coba lagi**), pengguna (paginasi 47 baris, pencarian, filter aktif atau nonaktif, nonaktifkan dan aktifkan, hapus akun dengan konfirmasi ketik email dan semua jalur galat), dokumen (daftar, pencarian judul dan pemilik, detail dengan pager, hapus), log (filter aksi dan admin, admin yang sudah dihapus), serta satu alur utuh "aksi lalu muncul di log". Regresi **Fase 7 (74 dari 75)**, **Fase 6 (101)**, dan **Fase 5 (48)** tetap lulus; satu pemeriksaan roda mouse pada pager Fase 7 gagal juga pada build Fase 7 asli di mesin ujiku, jadi bukan akibat Fase 8 (replika manual langkah yang sama lulus; penyebab pasti belum kuketahui). **127 uji unit** (`npm test`): 81 dari Fase 7, 30 untuk function admin, 16 untuk modul aplikasi admin. Migrasi dan fungsi database saya jalankan di **PostgreSQL 16** (10 uji akses dan penolakan, pengisian dan sinkron email, `service_role` tanpa hak lain). Ketiga Edge Function saya **jalankan sungguhan di Deno 2.9.6** melawan server Supabase dan Cloudinary tiruan: **52 skenario** (user biasa dan token palsu ditolak di ketiganya **tanpa secret key dipakai dan tanpa data disentuh**, tanda tangan Cloudinary dihitung ulang dan benar, 1.203 file dibaca lewat tiga halaman, file dihapus **sebelum** baris atau akun, log tertulis, sasaran terlarang, dan semua jalur galat), dan `delete-document` lolos regresi 15 skenario setelah dialihkan ke kode bersama. `typecheck`, `lint`, `format:check`, `cek:kontras` bersih, dan urutan langkah panduan ini saya putar ulang pada salinan bersih Fase 7.
- Belum: **Supabase milikmu yang sungguhan**, **Cloudinary asli untuk penghapusan banyak file**, dan **HP / Expo Go**. Khususnya belum terbukti: (1) `deploy --use-api` membundel impor `../_shared/*.ts` di proyekmu (itu sebabnya `delete-document` dideploy **lebih dulu**, 7.3); (2) `SUPABASE_SECRET_KEYS` tersedia di function dan `auth.admin.deleteUser` menghapus akun di proyekmu; (3) balasan asli `destroy` Cloudinary untuk puluhan file; (4) PostgREST asli menerima argumen opsional fungsi database dan `.range` pada hasilnya; (5) gestur, keyboard, dan tampilan di Android; (6) kelancaran dengan data nyata. Daftar uji di bagian 12 adalah buktinya.

---

## Daftar isi

1. Peta tugas dan keputusan
2. Tugas 8.0: tutup Fase 7 dan siapkan cabang
3. Migrasi database dan uji fungsi admin
4. Kode bersama Edge Function (`_shared`) dan pengaturan `tsc`/ESLint
5. Tugas 8.1 dan 8.2: tiga Edge Function admin
6. Modul murni aplikasi dan uji unit
7. Tugas 8.7: deploy dan uji penolakan
8. Akses data dan TanStack Query
9. Komponen bersama
10. Tugas 8.3 sampai 8.6: layar admin
11. Cek akhir kode
12. Tugas 8.8: uji di HP, commit, pull request
13. Yang perlu diingat saat coding nanti
14. Pemecahan masalah
15. Checklist akhir Fase 8
16. Daftar berkas Fase 8
17. Sumber

---

## 1. Peta tugas dan keputusan

| Tugas | Isi | Bagian |
|---|---|---|
| 8.0 | Tutup Fase 7, cabang `fase-8-admin` | 2 |
| 8.1 | Tiga Edge Function admin dengan secret key dan kode bersama `_shared` | 3, 4, 5, 7 |
| 8.2 | Tiap function menolak non-admin (403) dan menulis `log_aktivitas`; sasaran terlarang ditolak | 4, 5 |
| 8.3 | Layar statistik | 3, 8, 10 |
| 8.4 | Kelola pengguna: cari, saring, nonaktifkan, aktifkan, hapus akun | 3, 8, 10 |
| 8.5 | Tinjau dokumen: daftar, detail, hapus | 3, 8, 10 |
| 8.6 | Log aktivitas dengan filter aksi dan admin | 3, 8, 10 |
| 8.7 | Uji penolakan: user biasa dan token palsu tidak bisa menembus function | 3, 7 |
| 8.8 | Uji di HP, commit, PR, CI hijau, merge | 12 |

Nomor 8.1 sampai 8.7 sama dengan roadmap v0.11; 8.0 dan 8.8 ditambahkan pada v0.12.

**Pintasan (opsional):** `scannest-fase8-kode.zip` berisi 35 berkas kode Fase 8 dengan susunan folder yang sama dengan repomu. Pengecualian: `package.json`, `tsconfig.json`, dan `eslint.config.js` **tidak** ada di zip (isinya milikmu); kamu mengubah dua yang terakhir sendiri di **4.1**. Berkas `app/admin/dokumen.tsx` yang lama **harus kamu hapus sendiri** (10.8). Kamu boleh mengekstrak zip ke `C:\scannest` (timpa berkas yang ada) alih-alih mengetik satu per satu, tetapi baca bagian 3 sampai 10 agar paham isinya. **Migrasi database (3.2) dan deploy function (7.3) tetap kamu kerjakan sendiri**, karena butuh login Supabase milikmu.

### Alur satu aksi admin, dalam satu gambar

```
Aplikasi (akun admin) ──▶ supabase.functions.invoke('admin-delete-user', { userId })
                                   │  JWT-mu ikut terkirim
                                   ▼
 1. Gerbang Supabase: JWT sah? ─ tidak ─▶ 401 (function tidak dijalankan)
 2. Function: kenali pemanggil dari JWT ─ gagal ─▶ 401
 3. Function: rpc('is_admin') dengan JWT PEMANGGIL ─ bukan admin ─▶ 403 bukan_admin
        │   (sampai di sini: belum ada secret key, belum ada data yang disentuh)
        ▼ admin
 4. Periksa isi permintaan ─ salah ─▶ 400
 5. Buat klien SECRET KEY ─▶ cari sasaran ─ tidak ada ─▶ 404
        │                       diri sendiri atau admin lain ─▶ 403 target_dilarang
        ▼
 6. Hapus file Cloudinary (≤ 4 sekaligus) ─ ada yang gagal ─▶ 502, akun UTUH (bisa diulang)
        ▼
 7. auth.admin.deleteUser (profil, dokumen, halaman ikut lewat cascade)
        ▼
 8. Tulis log_aktivitas ─ gagal ─▶ 500 log_gagal (aksi SUDAH terjadi)
        ▼
 200 { ok: true, dokumen: n, file: m }
```

### Alur membaca data admin

```
Layar admin ──▶ supabase.rpc('admin_daftar_pengguna', { p_pola, p_aktif, p_limit, p_offset })
                     │  fungsi database `security definer`, BARIS PERTAMA: if not is_admin() → galat 42501
                     ▼
        user biasa ─▶ galat izin ("Akunmu tidak punya izin admin ...")
        admin      ─▶ halaman 20 baris, urut terbaru; gulir ke bawah memuat 20 berikutnya
```

### Keputusan teknis (dicek 30 Oktober 2026)

**K49: email disalin ke `profiles.email`.** Panel admin perlu menampilkan dan mencari email, sedangkan skema `auth` tidak bisa dibaca klien. Kolom baru diisi untuk akun lama oleh migrasi dan dijaga trigger (akun baru dan ganti email). Pro: satu tabel, pencarian sederhana. Kontra: data email ada di dua tempat (disinkronkan trigger); pengguna bisa membaca emailnya sendiri di barisnya, yang memang miliknya.

**K50: admin membaca lewat fungsi database (RPC), bukan membuka hak tabel.** `admin_statistik`, `admin_daftar_pengguna`, `admin_daftar_dokumen`, `admin_daftar_log` berjenis `security definer` dan **baris pertamanya memeriksa `is_admin()`**. Pro: hitungan, gabungan tabel, dan pencarian email dalam satu panggilan yang bisa diuji di PostgreSQL; hak admin pada tabel tidak diperluas. Kontra: empat fungsi baru di skema `public` (sama seperti `is_admin`, lihat B8); tiap fungsi **wajib** menjaga pemeriksaan di awal (uji 3.3 membuktikannya).

**K51: urutan pemeriksaan dan hak function.** Kenali pemanggil, panggil `is_admin()` dengan JWT pemanggil, **baru** buat klien dengan **secret key** (`SUPABASE_SECRET_KEYS`, cadangan `SUPABASE_SERVICE_ROLE_KEY`). Non-admin selalu 403 sebelum isi permintaannya diperiksa, jadi tidak bisa menebak bentuk permintaan. Log ditulis **setelah** aksi; bila log gagal, jawabannya 500 `log_gagal` (aksi sudah terjadi). Catatan penting dari dokumentasi Supabase: kunci baru (`sb_secret_...`) **bukan JWT** dan tidak boleh dikirim lewat header `Authorization`; kode ini hanya memakainya lewat `createClient`, yang mengirimnya dengan benar.

**K52: sasaran terlarang.** Function menolak (403 `target_dilarang`) bila sasarannya **diri sendiri** atau **akun admin lain**. Mengubah status ke nilai yang sudah berlaku tidak mengubah apa pun dan **tidak ditulis ke log** (log hanya berisi kejadian nyata). Kontra: akun admin hanya bisa dinaikkan atau diturunkan lewat SQL (B28).

**K53: hapus akun.** Urutannya: semua file Cloudinary milik pengguna dihapus dulu (paling banyak 4 bersamaan), baru `auth.admin.deleteUser` (profil, dokumen, halaman, dan efek ikut terhapus lewat cascade), lalu log. Konfirmasi di aplikasi dengan **mengetik email akun** (atau kata `HAPUS` bila akun tanpa email). Pro: gagal di Cloudinary berarti akun utuh dan bisa diulang. Kontra: selama beberapa detik pengguna sasaran masih bisa menambah halaman yang lolos dari daftar file (B29); bila gagal hapus akun setelah file hilang, gambar rusak sampai hapus diulang.

**K54: kode bersama di `supabase/functions/_shared/`.** `cloudinary.ts` (tanda tangan, `destroy`, penghapusan paralel terbatas), `admin.ts` (kode galat, pemeriksaan admin, ringkasan log; murni dan diuji `npm test`), `server.ts` (perekat Deno). `delete-document` ikut dialihkan ke `_shared` dan **harus dideploy ulang**. Folder `_shared` adalah anjuran dokumentasi Supabase. **Belum terbukti** bahwa `--use-api` membundelnya di proyekmu; karena itu urutan deploy di 7.3 menguji `delete-document` dulu (deploy yang gagal tidak mengganti versi lama yang masih berjalan).

**K55: arti "nonaktif".** `profiles.is_aktif = false`: RLS dan `is_admin()` memblokir akses data; dokumen **tidak** dihapus. **Sesi yang sedang berjalan tidak dicabut** (token tetap sah sampai kedaluwarsa, tetapi datanya kosong atau ditolak). Pro: reversibel dan sederhana. Kontra: pengguna nonaktif masih bisa membuka aplikasi sampai keluar (B26).

**K56: komponen bersama.** `ListaBerhalaman` (daftar berhalaman: skeleton, galat, tarik-untuk-segarkan, muat otomatis) dipakai tiga daftar admin; `PagerHalaman` diambil dari detail dokumen Fase 7 dan dipakai juga di detail admin; `Card` diberi prop `accessible`. Kontra: `DetailDokumen` (Fase 7) berubah karena refaktor; sudah diuji ulang lewat regresi Fase 7.

---

## 2. Tugas 8.0: tutup Fase 7 dan siapkan cabang

### 2.1 Cek keadaan Fase 7

Di Command Prompt, folder `C:\scannest`:

```bash
git status
git branch --show-current
git log --oneline -5
```

Yang diharapkan: cabang `main`, tidak ada perubahan tertunda, dan commit terbaru memuat Fase 7 (`feat(dokumen): daftar, detail, ...`). Bila PR Fase 7 belum digabung, selesaikan dulu (`docs/panduan-fase-7.md` bagian 9.3).

Kamu sudah melaporkan bahwa Fase 7 selesai; dua hal yang belum kamu rinci dan kuminta bila ada: hasil uji HP Fase 7 (terutama hapus dokumen nyata dan pengecekan Media Library) dan angka pemakaian Cloudinary di Dashboard-nya. Bila 7.8 nomor 10 (hapus dokumen nyata) belum pernah kamu lakukan, kerjakan dulu: ia membuktikan `delete-document` bekerja, dan Fase 8 memakai ulang kodenya.

### 2.2 Salin dokumen terbaru

Ekstrak `scannest-dokumen.zip` ke `C:\scannest` (timpa `ROADMAP.md` dan isi `docs/`). Pastikan `docs/panduan-fase-8.md` ada.

### 2.3 Cabang

```bash
git switch -c fase-8-admin
```

Fase 8 **tidak** menambah paket npm, jadi tidak ada `npm install` kali ini.

---

## 3. Migrasi database dan uji fungsi admin

### 3.1 Apa yang dilakukan migrasi

Satu berkas migrasi baru melakukan lima hal: (1) menambah dan mengisi `profiles.email` beserta trigger penjaganya; (2) membuat empat fungsi baca untuk admin; (3) membuat `admin_public_id`, fungsi **khusus Edge Function** yang menghasilkan daftar `public_id` Cloudinary milik satu pengguna atau satu dokumen, per halaman 500 karena API membatasi 1.000 baris per permintaan; (4) memberi `service_role` hak tabel yang tepat (proyek baru bisa mewajibkan `GRANT` eksplisit); (5) membuat indeks untuk filter log.

### 3.2 `supabase/migrations/20261025120000_admin_panel.sql`

Buat berkas ini di folder `supabase\migrations` (di sebelah migrasi Fase 2).

**Berkas:** `supabase/migrations/20261025120000_admin_panel.sql` (berkas baru: buat)

```sql
-- =====================================================================
-- Scannest | Migrasi 2: dukungan panel admin (Fase 8)
-- Jalankan lewat: npx supabase db push
--
-- Isi:
--   1. profiles.email  : email disalin dari auth.users agar admin bisa melihat dan mencarinya
--                        tanpa membuka skema `auth` (yang memang tidak bisa dibaca klien).
--   2. Fungsi RPC admin: statistik, daftar pengguna, daftar dokumen, daftar log. Semuanya
--                        "security definer" TETAPI membuka dengan pemeriksaan is_admin(), jadi
--                        pengguna biasa yang memanggilnya ditolak (kode 42501).
--   3. admin_public_id : daftar public_id Cloudinary milik satu pengguna atau satu dokumen.
--                        Hanya service_role (Edge Function) yang boleh memanggilnya.
--   4. GRANT eksplisit untuk service_role (dipakai Edge Function admin).
--   5. Indeks untuk filter log.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. EMAIL DI PROFIL
-- ---------------------------------------------------------------------
alter table public.profiles add column email text;

-- Isi untuk akun yang sudah ada.
update public.profiles p
set email = u.email
from auth.users u
where u.id = p.id;

-- Akun baru: salin email saat profil dibuat (menggantikan fungsi dari migrasi 1).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, nama, email)
  values (new.id, left(coalesce(new.raw_user_meta_data ->> 'nama', ''), 80), new.email);
  return new;
end;
$$;

-- Email yang diganti di Supabase Auth ikut diperbarui di profil.
create function public.sync_email_profil()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return null;
end;
$$;

create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row
  when (old.email is distinct from new.email)
  execute function public.sync_email_profil();

revoke execute on function public.sync_email_profil() from public, anon, authenticated;


-- ---------------------------------------------------------------------
-- 2. FUNGSI RPC UNTUK ADMIN
-- Pola yang sama di semua fungsi:
--   * security definer  : membaca semua baris tanpa terhalang RLS,
--   * is_admin() di awal: pengguna biasa langsung ditolak,
--   * batas limit/offset: halaman paling banyak 100 baris,
--   * revoke dari public/anon, grant hanya ke authenticated.
-- ---------------------------------------------------------------------

-- Angka ringkasan untuk layar statistik.
create function public.admin_statistik()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Hanya admin yang boleh membaca statistik.' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'pengguna_total',  (select count(*) from public.profiles),
    'pengguna_aktif',  (select count(*) from public.profiles where is_aktif),
    'dokumen_total',   (select count(*) from public.dokumen),
    'halaman_total',   (select count(*) from public.halaman_dokumen),
    'ukuran_byte',     (select coalesce(sum(ukuran_byte), 0) from public.halaman_dokumen)
  );
end;
$$;

-- Daftar pengguna. p_pola = pola ILIKE (sudah memuat % dan escape), p_aktif null = semua.
create function public.admin_daftar_pengguna(
  p_pola   text    default null,
  p_aktif  boolean default null,
  p_limit  integer default 20,
  p_offset integer default 0
)
returns table (
  id             uuid,
  nama           text,
  email          text,
  role           public.user_role,
  is_aktif       boolean,
  dibuat_pada    timestamptz,
  jumlah_dokumen bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Hanya admin yang boleh membaca daftar pengguna.' using errcode = '42501';
  end if;

  return query
  select
    p.id,
    p.nama,
    p.email,
    p.role,
    p.is_aktif,
    p.dibuat_pada,
    (select count(*) from public.dokumen d where d.user_id = p.id) as jumlah_dokumen
  from public.profiles p
  where (p_pola is null or p.nama ilike p_pola or p.email ilike p_pola)
    and (p_aktif is null or p.is_aktif = p_aktif)
  order by p.dibuat_pada desc, p.id desc
  limit least(greatest(p_limit, 1), 100)
  offset greatest(p_offset, 0);
end;
$$;

-- Daftar semua dokumen dari semua pengguna, lengkap dengan pemilik dan sampul.
create function public.admin_daftar_dokumen(
  p_pola    text                    default null,
  p_status  public.dokumen_status   default null,
  p_user_id uuid                    default null,
  p_limit   integer                 default 20,
  p_offset  integer                 default 0
)
returns table (
  id             uuid,
  judul          text,
  status         public.dokumen_status,
  jumlah_halaman integer,
  dibuat_pada    timestamptz,
  user_id        uuid,
  nama_pemilik   text,
  email_pemilik  text,
  url_sampul     text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Hanya admin yang boleh membaca daftar dokumen.' using errcode = '42501';
  end if;

  return query
  select
    d.id,
    d.judul,
    d.status,
    d.jumlah_halaman,
    d.dibuat_pada,
    d.user_id,
    pr.nama,
    pr.email,
    s.url_hasil
  from public.dokumen d
  join public.profiles pr on pr.id = d.user_id
  left join lateral (
    select h.url_hasil
    from public.halaman_dokumen h
    where h.dokumen_id = d.id
    order by h.urutan
    limit 1
  ) s on true
  where (p_pola is null or d.judul ilike p_pola or pr.nama ilike p_pola or pr.email ilike p_pola)
    and (p_status is null or d.status = p_status)
    and (p_user_id is null or d.user_id = p_user_id)
  order by d.dibuat_pada desc, d.id desc
  limit least(greatest(p_limit, 1), 100)
  offset greatest(p_offset, 0);
end;
$$;

-- Log aktivitas terbaru. Filter opsional per aksi dan per admin.
create function public.admin_daftar_log(
  p_aksi     text    default null,
  p_admin_id uuid    default null,
  p_limit    integer default 20,
  p_offset   integer default 0
)
returns table (
  id             uuid,
  admin_id       uuid,
  nama_admin     text,
  email_admin    text,
  target_user_id uuid,
  aksi           text,
  keterangan     text,
  waktu          timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Hanya admin yang boleh membaca log aktivitas.' using errcode = '42501';
  end if;

  return query
  select
    l.id,
    l.admin_id,
    pr.nama,
    pr.email,
    l.target_user_id,
    l.aksi,
    l.keterangan,
    l.waktu
  from public.log_aktivitas l
  left join public.profiles pr on pr.id = l.admin_id
  where (p_aksi is null or l.aksi = p_aksi)
    and (p_admin_id is null or l.admin_id = p_admin_id)
  order by l.waktu desc, l.id desc
  limit least(greatest(p_limit, 1), 100)
  offset greatest(p_offset, 0);
end;
$$;

revoke execute on function public.admin_statistik()                              from public, anon;
revoke execute on function public.admin_daftar_pengguna(text, boolean, integer, integer)
  from public, anon;
revoke execute on function public.admin_daftar_dokumen(text, public.dokumen_status, uuid, integer, integer)
  from public, anon;
revoke execute on function public.admin_daftar_log(text, uuid, integer, integer)
  from public, anon;

grant execute on function public.admin_statistik()                               to authenticated;
grant execute on function public.admin_daftar_pengguna(text, boolean, integer, integer)
  to authenticated;
grant execute on function public.admin_daftar_dokumen(text, public.dokumen_status, uuid, integer, integer)
  to authenticated;
grant execute on function public.admin_daftar_log(text, uuid, integer, integer)
  to authenticated;


-- ---------------------------------------------------------------------
-- 3. DAFTAR PUBLIC_ID UNTUK PEMBERSIHAN CLOUDINARY
-- Dipanggil Edge Function dengan secret key (role service_role). Isi tepat SATU dari
-- p_user_id atau p_dokumen_id. Dibagi per halaman karena API membatasi jumlah baris per
-- permintaan (max_rows = 1000), sedangkan satu pengguna bisa punya lebih dari itu.
-- ---------------------------------------------------------------------
create function public.admin_public_id(
  p_user_id    uuid    default null,
  p_dokumen_id uuid    default null,
  p_limit      integer default 500,
  p_offset     integer default 0
)
returns setof text
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if (p_user_id is null) = (p_dokumen_id is null) then
    raise exception 'Isi tepat satu dari p_user_id atau p_dokumen_id.' using errcode = '22023';
  end if;

  return query
  select h.public_id
  from public.halaman_dokumen h
  join public.dokumen d on d.id = h.dokumen_id
  where (p_user_id is null or d.user_id = p_user_id)
    and (p_dokumen_id is null or d.id = p_dokumen_id)
  order by h.id
  limit least(greatest(p_limit, 1), 1000)
  offset greatest(p_offset, 0);
end;
$$;

revoke execute on function public.admin_public_id(uuid, uuid, integer, integer)
  from public, anon, authenticated;
grant execute on function public.admin_public_id(uuid, uuid, integer, integer) to service_role;


-- ---------------------------------------------------------------------
-- 4. HAK AKSES EXPLISIT UNTUK service_role
-- Edge Function admin memakai secret key (role service_role). Role ini melewati RLS, tetapi
-- tetap butuh GRANT tabel. Proyek lama sudah memberinya otomatis; proyek baru bisa mewajibkan
-- GRANT eksplisit (lihat auto_expose_new_tables di config.toml). Memberikannya di sini aman
-- dan membuat migrasi tidak bergantung pada pengaturan itu.
-- ---------------------------------------------------------------------
grant select, update on public.profiles        to service_role;
grant select, delete on public.dokumen         to service_role;
grant select, delete on public.halaman_dokumen to service_role;
grant select, insert on public.log_aktivitas   to service_role;


-- ---------------------------------------------------------------------
-- 5. INDEKS FILTER LOG
-- ---------------------------------------------------------------------
create index log_aktivitas_aksi_waktu_idx  on public.log_aktivitas (aksi, waktu desc);
create index log_aktivitas_admin_waktu_idx on public.log_aktivitas (admin_id, waktu desc);
```

Penjelasan bagian penting:

- `handle_new_user()` diganti agar ikut menyalin email; `sync_email_profil` + trigger `on_auth_user_email_changed` menyalin email baru bila diganti. Fungsi trigger dicabut dari `public`, `anon`, dan `authenticated` agar tidak bisa dipanggil langsung.
- Pola empat fungsi baca: `security definer` (membaca semua baris tanpa terhalang RLS), `set search_path = ''` (tak bisa dibajak), **`if not public.is_admin() then raise exception ... errcode '42501'`** di awal, batas halaman 1 sampai 100 baris, `revoke ... from public, anon`, `grant ... to authenticated`. Jadi pengguna biasa yang memanggilnya mendapat galat izin, dan tamu tanpa login ditolak sebelum fungsinya berjalan.
- `p_pola` adalah pola `ILIKE` yang **sudah memuat `%` dan escape** (aplikasi membuatnya lewat `polaPencarian`, sama seperti pencarian judul di Fase 7).
- `admin_public_id` hanya untuk `service_role`; **admin dari aplikasi pun ditolak** (dibuktikan uji 3.3).

### 3.3 Terapkan dan uji

Di `C:\scannest`:

```bash
npx supabase db push
```

Perintah menampilkan migrasi yang akan diterapkan (hanya `20261025120000_admin_panel.sql`); jawab `Y`. Bila diminta kata sandi database, gunakan yang kamu pakai di Fase 2. Lalu periksa:

```bash
npx supabase migration list
```

Kedua migrasi harus muncul di kolom **Local** dan **Remote**.

**Cek email terisi.** Dashboard Supabase > **SQL Editor** > **New query**:

```sql
select email, nama, role from public.profiles order by dibuat_pada;
```

Kolom `email` harus terisi untuk semua akunmu.

**Siapkan satu akun uji.** Dashboard Supabase > **Authentication** > **Users** > **Add user** > **Create new user**: isi email `uji8@contoh.com` (bukan email asli; konfirmasi email sudah mati sejak Fase 3) dan sandi sembarang yang kamu catat, aktifkan **Auto Confirm User**. Akun ini dipakai di seluruh uji Fase 8 dan akan **dihapus lewat panel admin** di 12.2.

**Jalankan uji fungsi.** Berkas berikut menguji bahwa pengguna biasa ditolak dan admin diizinkan. Salin isinya ke SQL Editor, ganti `GANTI_EMAIL_A` dengan `uji8@contoh.com` dan `GANTI_EMAIL_B` dengan **emailmu (akun admin)**, lalu **Run**:

**Berkas:** `supabase/tests/admin_smoke.sql` (berkas baru: buat)

```sql
-- =====================================================================
-- Scannest | Uji fungsi RPC admin (tugas 8.7 di ROADMAP.md)
--
-- CARA PAKAI
-- 1. Siapkan dua akun yang SUDAH ADA: satu akun biasa (A) dan satu akun lain (B) yang
--    akan dijadikan admin sementara. Keduanya boleh akun uji.
-- 2. Ganti GANTI_EMAIL_A dan GANTI_EMAIL_B di bawah dengan email keduanya.
-- 3. Tempel seluruh isi file ini di SQL Editor Supabase, lalu klik Run.
--
-- CARA MEMBACA HASIL
-- Sama dengan rls_smoke.sql: seluruh uji berjalan dalam SATU blok DO yang di akhir sengaja
-- memunculkan error berisi laporan, sehingga semua perubahan uji dibatalkan otomatis.
-- Cari baris "Ringkasan". Yang diharapkan: 0 gagal.
-- =====================================================================

do $uji$
declare
  v_a      uuid;
  v_b      uuid;
  v_doc    uuid;
  j        jsonb;
  n        integer;
  v_log    text := '';
  v_lulus  integer;
  v_gagal  integer;
begin
  -- ---------- Persiapan (berjalan sebagai pemilik database) ----------
  select id into v_a from auth.users where email = 'GANTI_EMAIL_A';
  select id into v_b from auth.users where email = 'GANTI_EMAIL_B';
  if v_a is null or v_b is null then
    raise exception 'Akun uji tidak ditemukan. Periksa email A dan B di bagian atas file.';
  end if;

  insert into public.dokumen (user_id, judul) values (v_a, 'Dokumen uji admin') returning id into v_doc;
  insert into public.halaman_dokumen (dokumen_id, urutan, url_asli, url_hasil, public_id, ukuran_byte)
  values (v_doc, 1, 'https://x/a.jpg', 'https://x/a.jpg', 'uji/a', 1000);
  insert into public.log_aktivitas (admin_id, aksi, keterangan)
  values (null, 'hapus_dokumen', 'baris contoh uji admin');

  -- ================= BAGIAN 1: A (pengguna biasa) ditolak =================
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_a, 'role', 'authenticated')::text, true);
  set local role authenticated;

  begin
    perform public.admin_statistik();
    v_log := v_log || E'GAGAL  Pengguna biasa TIDAK boleh memanggil admin_statistik\n';
  exception when insufficient_privilege then
    v_log := v_log || E'LULUS  admin_statistik menolak pengguna biasa\n';
  end;

  begin
    perform * from public.admin_daftar_pengguna();
    v_log := v_log || E'GAGAL  Pengguna biasa TIDAK boleh memanggil admin_daftar_pengguna\n';
  exception when insufficient_privilege then
    v_log := v_log || E'LULUS  admin_daftar_pengguna menolak pengguna biasa\n';
  end;

  begin
    perform * from public.admin_daftar_dokumen();
    v_log := v_log || E'GAGAL  Pengguna biasa TIDAK boleh memanggil admin_daftar_dokumen\n';
  exception when insufficient_privilege then
    v_log := v_log || E'LULUS  admin_daftar_dokumen menolak pengguna biasa\n';
  end;

  begin
    perform * from public.admin_daftar_log();
    v_log := v_log || E'GAGAL  Pengguna biasa TIDAK boleh memanggil admin_daftar_log\n';
  exception when insufficient_privilege then
    v_log := v_log || E'LULUS  admin_daftar_log menolak pengguna biasa\n';
  end;

  begin
    perform * from public.admin_public_id(p_user_id => v_a);
    v_log := v_log || E'GAGAL  Pengguna biasa TIDAK boleh memanggil admin_public_id\n';
  exception when insufficient_privilege then
    v_log := v_log || E'LULUS  admin_public_id tidak bisa dipanggil pengguna biasa\n';
  end;

  -- ================= BAGIAN 2: B dijadikan admin sementara =================
  reset role;
  update public.profiles set role = 'admin' where id = v_b;
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_b, 'role', 'authenticated')::text, true);
  set local role authenticated;

  j := public.admin_statistik();
  v_log := v_log || case when (j ->> 'pengguna_total')::int >= 2 and (j ->> 'ukuran_byte')::bigint >= 1000
    then 'LULUS  ' else 'GAGAL  ' end || E'Admin membaca statistik (pengguna dan ukuran terhitung)\n';

  select count(*) into n from public.admin_daftar_pengguna();
  v_log := v_log || case when n >= 2 then 'LULUS  ' else 'GAGAL  ' end
    || E'Admin melihat banyak pengguna lewat admin_daftar_pengguna\n';

  select count(*) into n from public.admin_daftar_dokumen(p_pola => '%uji admin%');
  v_log := v_log || case when n = 1 then 'LULUS  ' else 'GAGAL  ' end
    || E'Admin menemukan dokumen milik A lewat pencarian judul\n';

  select count(*) into n from public.admin_daftar_log(p_aksi => 'hapus_dokumen');
  v_log := v_log || case when n >= 1 then 'LULUS  ' else 'GAGAL  ' end
    || E'Admin membaca log dengan filter aksi\n';

  begin
    perform * from public.admin_public_id(p_user_id => v_a);
    v_log := v_log || E'GAGAL  Admin dari aplikasi TIDAK boleh memanggil admin_public_id\n';
  exception when insufficient_privilege then
    v_log := v_log || E'LULUS  admin_public_id hanya untuk Edge Function, admin pun ditolak\n';
  end;

  -- ---------- Laporan ----------
  reset role;
  v_lulus := (length(v_log) - length(replace(v_log, 'LULUS', ''))) / 5;
  v_gagal := (length(v_log) - length(replace(v_log, 'GAGAL', ''))) / 5;

  raise exception E'\n\n===== HASIL UJI RPC ADMIN SCANNEST =====\n%\nRingkasan: % lulus, % gagal\n%\n(Pesan ini sengaja berbentuk error agar semua perubahan uji dibatalkan otomatis.)\n',
    v_log, v_lulus, v_gagal,
    case when v_gagal = 0 then 'SEMUA UJI LULUS.' else 'ADA UJI GAGAL: periksa baris GAGAL di atas.' end;
end
$uji$;
```

Seluruh uji berjalan dalam satu blok yang di akhir **sengaja memunculkan error berisi laporan** supaya semua perubahan uji dibatalkan otomatis (cara yang sama dengan `rls_smoke.sql` di Fase 2). Cari baris `Ringkasan`: yang diharapkan **10 lulus, 0 gagal**. Bila ada baris `GAGAL`, kirim seluruh laporannya kepadaku.

---

## 4. Kode bersama Edge Function (`_shared`) dan pengaturan `tsc`/ESLint

### 4.1 Pengaturan `tsconfig.json` dan `eslint.config.js`

Kode function sekarang memakai impor gaya Deno (`../_shared/admin.ts`, berakhiran `.ts`) dan satu berkas perekat Deno (`_shared/server.ts`). Dua perubahan diperlukan agar `typecheck` dan `lint` tetap bersih.

Di `tsconfig.json`, ganti seluruh isinya menjadi berikut (perubahannya: dua baris di `compilerOptions` dan satu entri di `exclude`; jangan lupa koma):

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "noEmit": true,
    "allowImportingTsExtensions": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["**/*.ts", "**/*.tsx", ".expo/types/**/*.ts", "expo-env.d.ts"],
  "exclude": [
    "node_modules",
    "supabase/functions/*/index.ts",
    "supabase/functions/_shared/server.ts"
  ]
}
```

Bila `tsconfig.json`-mu punya isi lain di luar yang tampak di sini, **pertahankan milikmu** dan hanya tambahkan `"noEmit": true`, `"allowImportingTsExtensions": true`, serta entri `supabase/functions/_shared/server.ts` di `exclude`. (`allowImportingTsExtensions` mengharuskan `noEmit`; keduanya aman karena Expo tidak memakai keluaran `tsc`.)

Di `eslint.config.js`, ubah blok `ignores` menjadi:

```js
    ignores: [
      'dist/*',
      'app-example/*',
      'supabase/functions/*/index.ts',
      'supabase/functions/_shared/server.ts',
    ], // 6
```

### 4.2 `supabase/functions/_shared/cloudinary.ts`

Buat folder `supabase\functions\_shared`. Berkas ini adalah isi `delete-document/logic.ts` dari Fase 7 (tanda tangan dan `destroy`) yang dipindahkan, **ditambah** `hapusBanyakAset`.

**Berkas:** `supabase/functions/_shared/cloudinary.ts` (berkas baru: buat)

```ts
// Penghapusan file di Cloudinary, dipakai bersama oleh `delete-document` (pengguna menghapus
// dokumennya) dan fungsi admin (hapus dokumen atau akun orang lain). Berkas ini tidak memakai
// API Deno maupun paket npm, jadi bisa diuji dengan `npm test` di Node.
//
// Urutan yang selalu dijaga pemanggilnya: (1) hapus SEMUA file di Cloudinary, (2) baru hapus
// baris database. Bila langkah 1 gagal sebagian, database tidak disentuh, sehingga aksi bisa
// diulang tanpa kehilangan jejak file yang tersisa.

export type KonfigCloudinary = { cloudName: string; apiKey: string; apiSecret: string };

async function sha1Hex(teks: string): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(teks));
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Tanda tangan Cloudinary: pasangan `nama=nilai` diurutkan menurut nama, digabung dengan `&`,
 * API secret ditambahkan di akhir tanpa pemisah, lalu di-hash SHA-1 (heksadesimal).
 * `file`, `cloud_name`, `resource_type`, dan `api_key` tidak ikut ditandatangani.
 */
export async function tandatangani(
  parameter: Record<string, string | number>,
  apiSecret: string,
): Promise<string> {
  const teks = Object.keys(parameter)
    .sort()
    .map((nama) => `${nama}=${parameter[nama]}`)
    .join('&');
  return sha1Hex(teks + apiSecret);
}

export type HasilHapusAset = 'ok' | 'tidak_ada';

export class GalatCloudinary extends Error {}

export type FetchFn = (
  input: string,
  init: { method: string; body: string; headers: Record<string, string> },
) => Promise<{
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
}>;

/**
 * Menghapus satu gambar (beserta turunannya) lewat Upload API `destroy`. Aset yang sudah tidak
 * ada dianggap berhasil (`tidak_ada`), sehingga menghapus ulang aman. Galat lain dilempar.
 */
export async function hapusAsetCloudinary(
  publicId: string,
  konfig: KonfigCloudinary,
  panggil: FetchFn,
  sekarang: () => number = () => Date.now(),
): Promise<HasilHapusAset> {
  const timestamp = Math.floor(sekarang() / 1000);
  const bertanda = { invalidate: 'true', public_id: publicId, timestamp };
  const signature = await tandatangani(bertanda, konfig.apiSecret);
  const body = new URLSearchParams({
    public_id: publicId,
    invalidate: 'true',
    timestamp: String(timestamp),
    api_key: konfig.apiKey,
    signature,
  }).toString();

  let jawaban;
  try {
    jawaban = await panggil(`https://api.cloudinary.com/v1_1/${konfig.cloudName}/image/destroy`, {
      method: 'POST',
      body,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  } catch {
    throw new GalatCloudinary('Cloudinary tidak terjangkau');
  }

  let isi: unknown = null;
  try {
    isi = await jawaban.json();
  } catch {
    // isi bukan JSON; ditangani di bawah lewat status
  }
  const hasil = (isi as { result?: unknown } | null)?.result;
  if (hasil === 'ok') return 'ok';
  if (hasil === 'not found') return 'tidak_ada';
  throw new GalatCloudinary(`Cloudinary menolak penghapusan (status ${jawaban.status})`);
}

export const BATAS_BERSAMAAN = 4;

/** Menjalankan `kerja` untuk tiap item dengan paling banyak `batas` panggilan bersamaan. */
export async function berbatas<T, R>(
  item: T[],
  batas: number,
  kerja: (x: T) => Promise<R>,
): Promise<PromiseSettledResult<R>[]> {
  const hasil: PromiseSettledResult<R>[] = new Array(item.length);
  let berikut = 0;
  async function pekerja() {
    while (berikut < item.length) {
      const i = berikut++;
      try {
        hasil[i] = { status: 'fulfilled', value: await kerja(item[i] as T) };
      } catch (alasan) {
        hasil[i] = { status: 'rejected', reason: alasan };
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(batas, item.length) }, pekerja));
  return hasil;
}

/**
 * Menghapus banyak aset (paling banyak BATAS_BERSAMAAN sekaligus) dan mengembalikan jumlah
 * yang GAGAL. Id kosong dilewati. Tiap kegagalan dicatat lewat `catat`.
 */
export async function hapusBanyakAset(
  daftarId: string[],
  hapusAset: (publicId: string) => Promise<HasilHapusAset>,
  catat?: (pesan: string, galat: unknown) => void,
): Promise<{ total: number; gagal: number }> {
  const idCloud = daftarId.filter((id) => id.trim() !== '');
  const hasil = await berbatas(idCloud, BATAS_BERSAMAAN, (id) => hapusAset(id));
  let gagal = 0;
  hasil.forEach((h, i) => {
    if (h.status === 'rejected') {
      gagal += 1;
      catat?.(`Gagal menghapus aset ${idCloud[i]}`, h.reason);
    }
  });
  return { total: idCloud.length, gagal };
}
```

Penjelasan: `tandatangani` dan `hapusAsetCloudinary` tidak berubah dari Fase 7 (vektor uji resmi Cloudinary tetap berlaku). `hapusBanyakAset(daftarId, hapusAset, catat)` menghapus **paling banyak 4 file sekaligus** lewat `berbatas` dan mengembalikan `{ total, gagal }`: pemanggil memutuskan 502 bila `gagal > 0`. Satu kegagalan **tidak** menghentikan yang lain (semua dicoba), supaya ulangan berikutnya tinggal sedikit.

### 4.3 `supabase/functions/_shared/admin.ts`

**Berkas:** `supabase/functions/_shared/admin.ts` (berkas baru: buat)

```ts
// Aturan bersama fungsi admin (Fase 8). Murni: tanpa API Deno atau paket npm, jadi bisa diuji
// dengan `npm test`. Berisi tipe jawaban, pemeriksaan "pemanggil adalah admin", dan pencatatan log.

export type KodeGalat =
  | 'belum_masuk'
  | 'bukan_admin'
  | 'permintaan_salah'
  | 'tidak_ada'
  | 'target_dilarang'
  | 'cloudinary_gagal'
  | 'gagal_ubah'
  | 'gagal_hapus'
  | 'log_gagal'
  | 'galat_server';

export type Jawaban<T extends object = Record<string, never>> =
  | { status: 200; body: { ok: true } & T }
  | { status: number; body: { ok: false; kode: KodeGalat; pesan: string } };

export const PESAN: Record<KodeGalat, string> = {
  belum_masuk: 'Kamu belum masuk.',
  bukan_admin: 'Hanya admin yang boleh melakukan ini.',
  permintaan_salah: 'Permintaan tidak sah.',
  tidak_ada: 'Data yang dituju tidak ditemukan.',
  target_dilarang: 'Aksi ini tidak boleh dilakukan pada akun tersebut.',
  cloudinary_gagal: 'Sebagian file belum bisa dihapus dari Cloudinary. Coba lagi.',
  gagal_ubah: 'Perubahan belum bisa disimpan. Coba lagi.',
  gagal_hapus: 'File sudah dihapus, tetapi datanya belum. Coba lagi.',
  log_gagal: 'Aksi sudah dijalankan, tetapi catatan log gagal ditulis. Beri tahu pengembang.',
  galat_server: 'Terjadi masalah di server. Coba lagi sebentar lagi.',
};

export const STATUS: Record<KodeGalat, number> = {
  belum_masuk: 401,
  bukan_admin: 403,
  permintaan_salah: 400,
  tidak_ada: 404,
  target_dilarang: 403,
  cloudinary_gagal: 502,
  gagal_ubah: 500,
  gagal_hapus: 500,
  log_gagal: 500,
  galat_server: 500,
};

export function galat(kode: KodeGalat): {
  status: number;
  body: { ok: false; kode: KodeGalat; pesan: string };
} {
  return { status: STATUS[kode], body: { ok: false, kode, pesan: PESAN[kode] } };
}

export const FORMAT_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function adalahUuid(nilai: unknown): nilai is string {
  return typeof nilai === 'string' && FORMAT_UUID.test(nilai);
}

export type AksiLog = 'nonaktifkan_akun' | 'aktifkan_akun' | 'hapus_akun' | 'hapus_dokumen';

export type EntriLog = {
  adminId: string;
  targetUserId: string | null;
  aksi: AksiLog;
  keterangan: string;
};

export type DepsPemanggil = {
  /** true bila pemanggil admin yang aktif (memanggil `is_admin()` dengan JWT pemanggil). */
  adalahAdmin(): Promise<boolean>;
  /** Menulis satu baris `log_aktivitas`; melempar galat bila gagal. */
  tulisLog(entri: EntriLog): Promise<void>;
  /** Mencatat penyebab kegagalan ke log fungsi (jangan pernah mengisinya dengan secret). */
  catat?(pesan: string, galat: unknown): void;
};

/**
 * Pintu masuk semua fungsi admin. Mengembalikan jawaban galat bila pemanggil belum masuk atau
 * bukan admin; `null` berarti lolos. Dijalankan SEBELUM memeriksa isi permintaan, sehingga
 * pengguna biasa selalu menerima 403 dan tidak bisa menebak bentuk permintaan yang sah.
 */
export async function periksaAdmin(
  pemanggilId: string | null,
  deps: Pick<DepsPemanggil, 'adalahAdmin' | 'catat'>,
): Promise<ReturnType<typeof galat> | null> {
  if (!pemanggilId) return galat('belum_masuk');
  try {
    if (!(await deps.adalahAdmin())) return galat('bukan_admin');
  } catch (alasan) {
    deps.catat?.('Gagal memeriksa peran admin', alasan);
    return galat('galat_server');
  }
  return null;
}

/** Merapikan teks untuk keterangan log: spasi ganda dibuang, dipotong dengan "…" bila terlalu panjang. */
export function ringkas(teks: string, maks = 80): string {
  const rapi = teks.replace(/\s+/g, ' ').trim();
  return rapi.length > maks ? `${rapi.slice(0, maks - 1)}…` : rapi;
}

/** Nama yang enak dibaca untuk satu akun di log: email dulu, lalu nama, lalu id. */
export function labelAkun(akun: { id: string; nama: string; email: string | null }): string {
  const email = akun.email?.trim();
  const nama = ringkas(akun.nama, 40);
  if (email && nama) return `${email} (${nama})`;
  return email || nama || akun.id;
}
```

Penjelasan:

- `KodeGalat`, `PESAN`, dan `STATUS` adalah **satu-satunya** tempat kode galat didefinisikan; tiga function dan aplikasi (`galat.ts`, 6.2) memakai kode yang sama.
- `periksaAdmin(pemanggilId, deps)` adalah **pintu masuk** semua function: tanpa pemanggil → 401; `deps.adalahAdmin` gagal atau bernilai salah → 403 `bukan_admin`. Galat tak terduga dari pemeriksaan dihitung 403 (**gagal tertutup**), bukan lolos.
- `ringkas` memotong teks untuk kolom `keterangan` log; `labelAkun` menyusun "Nama (email)" yang tidak pernah memuat rahasia.

### 4.4 `supabase/functions/_shared/server.ts`

**Berkas:** `supabase/functions/_shared/server.ts` (berkas baru: buat)

```ts
// Perekat Deno untuk fungsi admin (Fase 8): CORS, pembacaan kunci, klien Supabase, dan
// implementasi `DepsPemanggil`. Berkas ini memakai API Deno dan paket npm, jadi TIDAK diuji
// dengan `npm test`; logika yang bisa diuji ada di `logic.ts` masing-masing fungsi.
//
// Dua klien dengan peran berbeda:
//   * klienPemanggil : memakai kunci publishable + JWT pemanggil. Dipakai untuk menanyakan
//                      siapa pemanggil dan apakah ia admin (is_admin()). RLS tetap berlaku.
//   * klienAdmin     : memakai SECRET KEY. Melewati RLS dan hanya dibuat SETELAH pemanggil
//                      terbukti admin. Kunci ini hanya ada di lingkungan fungsi.
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';

import type { DepsPemanggil, EntriLog, Jawaban } from './admin.ts';
import { hapusAsetCloudinary, type KonfigCloudinary } from './cloudinary.ts';

export const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export function balas(jawaban: Pick<Jawaban, 'status' | 'body'>): Response {
  return new Response(JSON.stringify(jawaban.body), {
    status: jawaban.status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

/** Kunci baru berbentuk JSON {"default": "..."}; `cadangan` adalah nama variabel kunci lama. */
function bacaKunci(nama: string, cadangan: string): string {
  try {
    const kunci = JSON.parse(Deno.env.get(nama) ?? '{}');
    if (typeof kunci.default === 'string') return kunci.default;
  } catch {
    // lanjut ke cadangan
  }
  return Deno.env.get(cadangan) ?? '';
}

export function bacaCloudinary(): KonfigCloudinary | null {
  const cloudName = Deno.env.get('CLOUDINARY_CLOUD_NAME');
  const apiKey = Deno.env.get('CLOUDINARY_API_KEY');
  const apiSecret = Deno.env.get('CLOUDINARY_API_SECRET');
  return cloudName && apiKey && apiSecret ? { cloudName, apiKey, apiSecret } : null;
}

export const hapusAsetDari = (konfig: KonfigCloudinary) => (publicId: string) =>
  hapusAsetCloudinary(publicId, konfig, (url, init) => fetch(url, init));

export const catatKeLog = (pesan: string, galat: unknown) =>
  console.error(pesan, galat instanceof Error ? galat.message : galat);

export type Pemanggil = {
  id: string | null;
  deps: Pick<DepsPemanggil, 'adalahAdmin' | 'catat'>;
};

/** Mengenali pemanggil dari JWT-nya. `id` null bila tidak ada JWT yang sah. */
export async function kenaliPemanggil(req: Request): Promise<Pemanggil> {
  const authorization = req.headers.get('Authorization') ?? '';
  const klien = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    bacaKunci('SUPABASE_PUBLISHABLE_KEYS', 'SUPABASE_ANON_KEY'),
    { global: { headers: { Authorization: authorization } }, auth: { persistSession: false } },
  );
  const token = authorization.replace(/^Bearer\s+/i, '');
  const { data } = token ? await klien.auth.getUser(token) : { data: { user: null } };
  return {
    id: data.user?.id ?? null,
    deps: {
      async adalahAdmin() {
        const { data: ya, error } = await klien.rpc('is_admin');
        if (error) throw error;
        return ya === true;
      },
      catat: catatKeLog,
    },
  };
}

/** Klien dengan secret key. Panggil hanya setelah `periksaAdmin` meloloskan pemanggil. */
export function buatKlienAdmin(): SupabaseClient | null {
  const kunci = bacaKunci('SUPABASE_SECRET_KEYS', 'SUPABASE_SERVICE_ROLE_KEY');
  if (!kunci) return null;
  return createClient(Deno.env.get('SUPABASE_URL') ?? '', kunci, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function tulisLogDb(klien: SupabaseClient) {
  return async (entri: EntriLog): Promise<void> => {
    const { error } = await klien.from('log_aktivitas').insert({
      admin_id: entri.adminId,
      target_user_id: entri.targetUserId,
      aksi: entri.aksi,
      keterangan: entri.keterangan,
    });
    if (error) throw error;
  };
}

/** Membaca semua public_id lewat RPC `admin_public_id`, halaman demi halaman. */
export async function bacaSemuaPublicId(
  klien: SupabaseClient,
  filter: { p_user_id?: string; p_dokumen_id?: string },
): Promise<string[]> {
  const UKURAN = 500;
  const hasil: string[] = [];
  for (let offset = 0; ; offset += UKURAN) {
    const { data, error } = await klien.rpc('admin_public_id', {
      ...filter,
      p_limit: UKURAN,
      p_offset: offset,
    });
    if (error) throw error;
    const baris = Array.isArray(data) ? (data as string[]) : [];
    hasil.push(...baris);
    if (baris.length < UKURAN) return hasil;
  }
}

const GALAT_BELUM_DIKONFIGURASI = {
  status: 500,
  body: { ok: false as const, kode: 'galat_server' as const, pesan: 'Server belum dikonfigurasi.' },
};

/**
 * Kerangka bersama semua fungsi admin: OPTIONS, hanya POST, badan JSON, lalu `tangani`.
 * `perluCloudinary` memeriksa secret Cloudinary di awal supaya salah konfigurasi ketahuan jelas.
 */
export function layani(
  tangani: (
    req: Request,
    badan: Record<string, unknown> | null,
    cloudinary: KonfigCloudinary | null,
  ) => Promise<Pick<Jawaban, 'status' | 'body'>>,
  opsi: { perluCloudinary: boolean },
) {
  Deno.serve(async (req: Request) => {
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    if (req.method !== 'POST') {
      return balas({
        status: 405,
        body: { ok: false, kode: 'permintaan_salah', pesan: 'Gunakan metode POST.' },
      });
    }
    const cloudinary = bacaCloudinary();
    if (opsi.perluCloudinary && !cloudinary) {
      console.error('Secret Cloudinary belum diatur di fungsi ini.');
      return balas(GALAT_BELUM_DIKONFIGURASI);
    }
    const mentah: unknown = await req.json().catch(() => null);
    const badan =
      mentah && typeof mentah === 'object' && !Array.isArray(mentah)
        ? (mentah as Record<string, unknown>)
        : null;
    return balas(await tangani(req, badan, cloudinary));
  });
}

export { GALAT_BELUM_DIKONFIGURASI };
```

Penjelasan: berkas ini satu-satunya yang menyentuh `Deno` dan `npm:` untuk function admin, dan dikecualikan dari `tsc` dan ESLint (4.1).

- `bacaKunci` membaca kunci baru berbentuk JSON `{"default": "..."}` dari `SUPABASE_PUBLISHABLE_KEYS` atau `SUPABASE_SECRET_KEYS`, dengan cadangan variabel lama (`SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`).
- `kenaliPemanggil(req)` membuat klien dengan **kunci publishable + JWT pemanggil**, memanggil `auth.getUser(token)`, lalu `rpc('is_admin')` **dengan JWT pemanggil**. Sampai di sini belum ada secret key.
- `buatKlienAdmin()` membuat klien **secret key**. Fungsi ini hanya dipanggil dari dalam `logic.ts` setelah `periksaAdmin` lolos.
- `bacaSemuaPublicId` membaca `admin_public_id` per halaman 500 sampai habis.
- `layani(tangani, { perluCloudinary })` adalah kerangka: `OPTIONS` (CORS), hanya `POST`, badan JSON, lalu `tangani`; semua galat tak terduga menjadi 500 tanpa membocorkan isi galat.

### 4.5 `supabase/functions/delete-document/logic.ts` (berkas lama)

**Ganti seluruh isinya.** Perilakunya sama persis dengan Fase 7; bedanya ia kini mengimpor dari `_shared/cloudinary.ts` dan memakai `hapusBanyakAset`. Ekspornya tetap (`BATAS_BERSAMAAN`, `tandatangani`, dan lain-lain diekspor ulang), sehingga `tests/hapus.test.mjs` Fase 7 tetap lulus **tanpa diubah**.

**Berkas:** `supabase/functions/delete-document/logic.ts` (berkas lama: ganti seluruh isinya)

```ts
// Logika murni Edge Function `delete-document` (tugas 7.5). Berkas ini tidak memakai API Deno
// maupun paket npm, jadi bisa diuji dengan `npm test` di Node dan dipakai `index.ts` di Deno.
//
// Urutan yang dijaga: (1) pastikan pemanggil pemilik dokumen, (2) hapus SEMUA file di
// Cloudinary, (3) baru hapus baris database. Bila langkah 2 gagal sebagian, baris database
// tidak disentuh, sehingga pengguna bisa mengulang tanpa kehilangan jejak file yang tersisa.

import {
  BATAS_BERSAMAAN,
  GalatCloudinary,
  hapusAsetCloudinary,
  hapusBanyakAset,
  tandatangani,
  type HasilHapusAset,
  type KonfigCloudinary,
} from '../_shared/cloudinary.ts';

// Pembantu Cloudinary dipindahkan ke `_shared/cloudinary.ts` (Fase 8) agar dipakai bersama fungsi
// admin. Diekspor ulang di sini supaya impor lama (dan tes) tetap bekerja.
export { BATAS_BERSAMAAN, GalatCloudinary, hapusAsetCloudinary, tandatangani };
export type { HasilHapusAset, KonfigCloudinary };

export const FORMAT_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type Deps = {
  /** null bila dokumen tidak ada atau tidak terlihat oleh pemanggil (RLS). */
  cariDokumen(id: string): Promise<{ userId: string } | null>;
  daftarPublicId(dokumenId: string): Promise<string[]>;
  hapusAset(publicId: string): Promise<HasilHapusAset>;
  /** true bila tepat satu baris terhapus. */
  hapusBaris(dokumenId: string): Promise<boolean>;
  /** Mencatat penyebab kegagalan ke log fungsi (jangan pernah mengisinya dengan secret). */
  catat?(pesan: string, galat: unknown): void;
};

export type KodeGalat =
  | 'belum_masuk'
  | 'permintaan_salah'
  | 'tidak_ada'
  | 'bukan_pemilik'
  | 'cloudinary_gagal'
  | 'gagal_hapus_baris'
  | 'galat_server';

export type Jawaban =
  | { status: 200; body: { ok: true; dihapus: number } }
  | { status: number; body: { ok: false; kode: KodeGalat; pesan: string } };

const PESAN: Record<KodeGalat, string> = {
  belum_masuk: 'Kamu belum masuk.',
  permintaan_salah: 'Permintaan tidak sah.',
  tidak_ada: 'Dokumen tidak ditemukan.',
  bukan_pemilik: 'Dokumen ini bukan milikmu.',
  cloudinary_gagal: 'Sebagian file belum bisa dihapus dari Cloudinary. Coba lagi.',
  gagal_hapus_baris: 'File sudah dihapus, tetapi catatan dokumen belum. Coba lagi.',
  galat_server: 'Terjadi masalah di server. Coba lagi sebentar lagi.',
};

const STATUS: Record<KodeGalat, number> = {
  belum_masuk: 401,
  permintaan_salah: 400,
  tidak_ada: 404,
  bukan_pemilik: 403,
  cloudinary_gagal: 502,
  gagal_hapus_baris: 500,
  galat_server: 500,
};

function galat(kode: KodeGalat): Jawaban {
  return { status: STATUS[kode], body: { ok: false, kode, pesan: PESAN[kode] } };
}

export async function prosesHapus(
  masukan: { userId: string | null; dokumenId: unknown },
  deps: Deps,
): Promise<Jawaban> {
  if (!masukan.userId) return galat('belum_masuk');
  if (typeof masukan.dokumenId !== 'string' || !FORMAT_UUID.test(masukan.dokumenId)) {
    return galat('permintaan_salah');
  }
  const dokumenId = masukan.dokumenId;
  try {
    const dokumen = await deps.cariDokumen(dokumenId);
    if (!dokumen) return galat('tidak_ada');
    if (dokumen.userId !== masukan.userId) return galat('bukan_pemilik');

    const idCloud = await deps.daftarPublicId(dokumenId);
    const { total, gagal } = await hapusBanyakAset(idCloud, (id) => deps.hapusAset(id), deps.catat);
    if (gagal > 0) return galat('cloudinary_gagal');

    if (!(await deps.hapusBaris(dokumenId))) return galat('gagal_hapus_baris');
    return { status: 200, body: { ok: true, dihapus: total } };
  } catch (alasan) {
    deps.catat?.(`Galat tak terduga saat menghapus dokumen ${dokumenId}`, alasan);
    return galat('galat_server');
  }
}
```

### 4.6 Cek

```bash
npm run typecheck
npm test
```

`typecheck` harus bersih. `npm test` harus tetap **81 lulus** (uji Fase 7 membuktikan refaktor tidak mengubah perilaku `delete-document`).

---

## 5. Tugas 8.1 dan 8.2: tiga Edge Function admin

Ketiganya punya struktur yang sama: `logic.ts` (aturan main, murni, diuji `npm test`) dan `index.ts` (perekat Deno, sangat tipis). Semua dependensi (database, Cloudinary, log) disuntikkan lewat `Deps`.

### 5.1 `admin-set-user-active`: nonaktifkan dan aktifkan

Buat folder `supabase\functions\admin-set-user-active`.

**Berkas:** `supabase/functions/admin-set-user-active/logic.ts` (berkas baru: buat)

```ts
// Logika murni `admin-set-user-active` (tugas 8.1, 8.2): mengaktifkan atau menonaktifkan akun.
// Aturan: hanya admin; tidak boleh menarget diri sendiri atau akun admin lain; bila status
// sudah sama, tidak ada yang diubah dan tidak ada log (tidak ada aksi yang terjadi).
import {
  adalahUuid,
  galat,
  labelAkun,
  periksaAdmin,
  type DepsPemanggil,
  type Jawaban,
} from '../_shared/admin.ts';

export type PenggunaTarget = {
  id: string;
  nama: string;
  email: string | null;
  role: 'user' | 'admin';
  isAktif: boolean;
};

export type Deps = DepsPemanggil & {
  cariPengguna(id: string): Promise<PenggunaTarget | null>;
  /** true bila tepat satu baris berubah. */
  ubahAktif(id: string, aktif: boolean): Promise<boolean>;
};

export type Hasil = { aktif: boolean; berubah: boolean };

export async function prosesUbahAktif(
  masukan: { pemanggilId: string | null; userId: unknown; aktif: unknown },
  deps: Deps,
): Promise<Jawaban<Hasil>> {
  const ditolak = await periksaAdmin(masukan.pemanggilId, deps);
  if (ditolak) return ditolak;
  const pemanggilId = masukan.pemanggilId as string;

  if (!adalahUuid(masukan.userId) || typeof masukan.aktif !== 'boolean') {
    return galat('permintaan_salah');
  }
  const { userId, aktif } = { userId: masukan.userId, aktif: masukan.aktif };
  if (userId === pemanggilId) return galat('target_dilarang');

  try {
    const target = await deps.cariPengguna(userId);
    if (!target) return galat('tidak_ada');
    if (target.role === 'admin') return galat('target_dilarang');
    if (target.isAktif === aktif) return { status: 200, body: { ok: true, aktif, berubah: false } };

    let berhasil = false;
    try {
      berhasil = await deps.ubahAktif(userId, aktif);
    } catch (alasan) {
      deps.catat?.(`Gagal mengubah status akun ${userId}`, alasan);
    }
    if (!berhasil) return galat('gagal_ubah');

    try {
      await deps.tulisLog({
        adminId: pemanggilId,
        targetUserId: userId,
        aksi: aktif ? 'aktifkan_akun' : 'nonaktifkan_akun',
        keterangan: `Akun ${labelAkun(target)} ${aktif ? 'diaktifkan' : 'dinonaktifkan'}`,
      });
    } catch (alasan) {
      deps.catat?.(`Gagal menulis log untuk akun ${userId}`, alasan);
      return galat('log_gagal');
    }
    return { status: 200, body: { ok: true, aktif, berubah: true } };
  } catch (alasan) {
    deps.catat?.(`Galat tak terduga saat mengubah status akun ${userId}`, alasan);
    return galat('galat_server');
  }
}
```

Penjelasan, per bagian:

- Urutan: `periksaAdmin` **paling awal** (non-admin → 403 sebelum isi dilihat), lalu validasi isi (`userId` UUID dan `aktif` boolean, 400), lalu **diri sendiri → 403 `target_dilarang`**, lalu cari sasaran (404), **admin lain → 403**.
- Bila status sudah sama, jawabannya `{ ok: true, aktif, berubah: false }` dan **tidak ada log**: tidak ada kejadian yang perlu dicatat.
- Log ditulis setelah `ubahAktif` berhasil. Bila penulisan log gagal → 500 `log_gagal` (data sudah berubah; aplikasi menyegarkan daftar dan menampilkan pesan khusus).

**Berkas:** `supabase/functions/admin-set-user-active/index.ts` (berkas baru: buat)

```ts
// Edge Function `admin-set-user-active` (tugas 8.1): mengaktifkan/menonaktifkan akun.
// Body: { "userId": "<uuid>", "aktif": true | false }
// Alur: kenali pemanggil -> pastikan admin (is_admin) -> baru pakai secret key -> catat log.
import {
  buatKlienAdmin,
  GALAT_BELUM_DIKONFIGURASI,
  kenaliPemanggil,
  layani,
  tulisLogDb,
} from '../_shared/server.ts';
import { prosesUbahAktif, type Deps } from './logic.ts';

layani(
  async (req, badan) => {
    const pemanggil = await kenaliPemanggil(req);
    const admin = pemanggil.id ? buatKlienAdmin() : null;
    if (pemanggil.id && !admin) {
      console.error('Secret key Supabase tidak tersedia di fungsi ini.');
      return GALAT_BELUM_DIKONFIGURASI;
    }
    const deps: Deps = {
      ...pemanggil.deps,
      tulisLog: admin ? tulisLogDb(admin) : () => Promise.reject(new Error('tanpa klien')),
      async cariPengguna(id) {
        const { data, error } = await admin!
          .from('profiles')
          .select('id, nama, email, role, is_aktif')
          .eq('id', id)
          .maybeSingle();
        if (error) throw error;
        return data
          ? {
              id: data.id as string,
              nama: (data.nama as string) ?? '',
              email: (data.email as string | null) ?? null,
              role: data.role === 'admin' ? 'admin' : 'user',
              isAktif: data.is_aktif === true,
            }
          : null;
      },
      async ubahAktif(id, aktif) {
        const { data, error } = await admin!
          .from('profiles')
          .update({ is_aktif: aktif })
          .eq('id', id)
          .select('id');
        if (error) throw error;
        return (data?.length ?? 0) === 1;
      },
    };
    return prosesUbahAktif(
      { pemanggilId: pemanggil.id, userId: badan?.userId, aktif: badan?.aktif },
      deps,
    );
  },
  { perluCloudinary: false },
);
```

Penjelasan: `index.ts` hanya merangkai: `layani(...)` memanggil `kenaliPemanggil`, lalu `prosesUbahAktif` dengan `Deps` yang membaca dan mengubah `profiles` lewat klien secret key (dibuat **setelah** pemeriksaan admin) dan menulis log lewat `tulisLogDb`.

### 5.2 `admin-delete-document`: hapus dokumen siapa pun

Buat folder `supabase\functions\admin-delete-document`.

**Berkas:** `supabase/functions/admin-delete-document/logic.ts` (berkas baru: buat)

```ts
// Logika murni `admin-delete-document` (tugas 8.1, 8.2): admin menghapus dokumen milik siapa
// pun. Urutan sama dengan `delete-document`: semua file Cloudinary dulu, baru baris database,
// terakhir log. Bila file gagal terhapus, database dan log tidak disentuh.
import { hapusBanyakAset, type HasilHapusAset } from '../_shared/cloudinary.ts';
import {
  adalahUuid,
  galat,
  periksaAdmin,
  ringkas,
  type DepsPemanggil,
  type Jawaban,
} from '../_shared/admin.ts';

export type DokumenTarget = {
  id: string;
  judul: string;
  userId: string;
  /** Teks pemilik untuk log (email dan nama), boleh kosong bila profil tidak terbaca. */
  labelPemilik: string;
};

export type Deps = DepsPemanggil & {
  cariDokumen(id: string): Promise<DokumenTarget | null>;
  daftarPublicId(dokumenId: string): Promise<string[]>;
  hapusAset(publicId: string): Promise<HasilHapusAset>;
  /** true bila tepat satu baris terhapus. */
  hapusBaris(dokumenId: string): Promise<boolean>;
};

export type Hasil = { dihapus: number };

export async function prosesAdminHapusDokumen(
  masukan: { pemanggilId: string | null; dokumenId: unknown },
  deps: Deps,
): Promise<Jawaban<Hasil>> {
  const ditolak = await periksaAdmin(masukan.pemanggilId, deps);
  if (ditolak) return ditolak;
  const pemanggilId = masukan.pemanggilId as string;

  if (!adalahUuid(masukan.dokumenId)) return galat('permintaan_salah');
  const dokumenId = masukan.dokumenId;

  try {
    const dokumen = await deps.cariDokumen(dokumenId);
    if (!dokumen) return galat('tidak_ada');

    const idCloud = await deps.daftarPublicId(dokumenId);
    const { total, gagal } = await hapusBanyakAset(idCloud, (id) => deps.hapusAset(id), deps.catat);
    if (gagal > 0) return galat('cloudinary_gagal');

    let terhapus = false;
    try {
      terhapus = await deps.hapusBaris(dokumenId);
    } catch (alasan) {
      deps.catat?.(`Gagal menghapus baris dokumen ${dokumenId}`, alasan);
    }
    if (!terhapus) return galat('gagal_hapus');

    try {
      await deps.tulisLog({
        adminId: pemanggilId,
        targetUserId: dokumen.userId,
        aksi: 'hapus_dokumen',
        keterangan:
          `Dokumen "${ringkas(dokumen.judul)}" (${total} file)` +
          (dokumen.labelPemilik ? ` milik ${dokumen.labelPemilik}` : '') +
          ' dihapus',
      });
    } catch (alasan) {
      deps.catat?.(`Gagal menulis log untuk dokumen ${dokumenId}`, alasan);
      return galat('log_gagal');
    }
    return { status: 200, body: { ok: true, dihapus: total } };
  } catch (alasan) {
    deps.catat?.(`Galat tak terduga saat admin menghapus dokumen ${dokumenId}`, alasan);
    return galat('galat_server');
  }
}
```

Penjelasan: sama polanya dengan `delete-document` Fase 7 (file dulu, baris belakangan, 502 bila ada file gagal), tetapi pemanggilnya admin, dokumen boleh milik siapa saja, dan hasilnya dicatat sebagai `hapus_dokumen` dengan judul dan pemilik di `keterangan`.

**Berkas:** `supabase/functions/admin-delete-document/index.ts` (berkas baru: buat)

```ts
// Edge Function `admin-delete-document` (tugas 8.1): admin menghapus dokumen siapa pun,
// termasuk semua file halamannya di Cloudinary.
// Body: { "dokumenId": "<uuid>" }
import {
  bacaSemuaPublicId,
  buatKlienAdmin,
  GALAT_BELUM_DIKONFIGURASI,
  hapusAsetDari,
  kenaliPemanggil,
  layani,
  tulisLogDb,
} from '../_shared/server.ts';
import { labelAkun } from '../_shared/admin.ts';
import { prosesAdminHapusDokumen, type Deps } from './logic.ts';

layani(
  async (req, badan, cloudinary) => {
    const pemanggil = await kenaliPemanggil(req);
    const admin = pemanggil.id ? buatKlienAdmin() : null;
    if (pemanggil.id && (!admin || !cloudinary)) {
      console.error('Secret key Supabase atau secret Cloudinary tidak tersedia.');
      return GALAT_BELUM_DIKONFIGURASI;
    }
    const deps: Deps = {
      ...pemanggil.deps,
      tulisLog: admin ? tulisLogDb(admin) : () => Promise.reject(new Error('tanpa klien')),
      hapusAset: cloudinary
        ? hapusAsetDari(cloudinary)
        : () => Promise.reject(new Error('tanpa cloudinary')),
      async cariDokumen(id) {
        const { data, error } = await admin!
          .from('dokumen')
          .select('id, judul, user_id')
          .eq('id', id)
          .maybeSingle();
        if (error) throw error;
        if (!data) return null;
        const { data: pemilik } = await admin!
          .from('profiles')
          .select('id, nama, email')
          .eq('id', data.user_id as string)
          .maybeSingle();
        return {
          id: data.id as string,
          judul: data.judul as string,
          userId: data.user_id as string,
          labelPemilik: pemilik
            ? labelAkun({
                id: pemilik.id as string,
                nama: (pemilik.nama as string) ?? '',
                email: (pemilik.email as string | null) ?? null,
              })
            : '',
        };
      },
      daftarPublicId: (dokumenId) => bacaSemuaPublicId(admin!, { p_dokumen_id: dokumenId }),
      async hapusBaris(dokumenId) {
        const { data, error } = await admin!
          .from('dokumen')
          .delete()
          .eq('id', dokumenId)
          .select('id');
        if (error) throw error;
        return (data?.length ?? 0) === 1;
      },
    };
    return prosesAdminHapusDokumen(
      { pemanggilId: pemanggil.id, dokumenId: badan?.dokumenId },
      deps,
    );
  },
  { perluCloudinary: true },
);
```

### 5.3 `admin-delete-user`: hapus akun beserta semua datanya

Buat folder `supabase\functions\admin-delete-user`.

**Berkas:** `supabase/functions/admin-delete-user/logic.ts` (berkas baru: buat)

```ts
// Logika murni `admin-delete-user` (tugas 8.1, 8.2): admin menghapus akun pengguna beserta
// seluruh isinya. Urutan: (1) semua file Cloudinary milik pengguna, (2) akun di Supabase Auth
// (baris profil, dokumen, halaman, dan efek ikut terhapus lewat cascade), (3) log.
// Bila langkah 1 gagal sebagian, akun TIDAK disentuh sehingga admin bisa mengulang.
// Tidak boleh menarget diri sendiri atau akun admin.
import { hapusBanyakAset, type HasilHapusAset } from '../_shared/cloudinary.ts';
import {
  adalahUuid,
  galat,
  labelAkun,
  periksaAdmin,
  type DepsPemanggil,
  type Jawaban,
} from '../_shared/admin.ts';

export type PenggunaTarget = {
  id: string;
  nama: string;
  email: string | null;
  role: 'user' | 'admin';
};

export type Deps = DepsPemanggil & {
  cariPengguna(id: string): Promise<PenggunaTarget | null>;
  hitungDokumen(userId: string): Promise<number>;
  /** Semua public_id Cloudinary milik pengguna (semua halaman hasil dibaca habis). */
  daftarPublicId(userId: string): Promise<string[]>;
  hapusAset(publicId: string): Promise<HasilHapusAset>;
  /** Menghapus akun di Supabase Auth; true bila berhasil. */
  hapusAkun(userId: string): Promise<boolean>;
};

export type Hasil = { dokumen: number; file: number };

export async function prosesHapusPengguna(
  masukan: { pemanggilId: string | null; userId: unknown },
  deps: Deps,
): Promise<Jawaban<Hasil>> {
  const ditolak = await periksaAdmin(masukan.pemanggilId, deps);
  if (ditolak) return ditolak;
  const pemanggilId = masukan.pemanggilId as string;

  if (!adalahUuid(masukan.userId)) return galat('permintaan_salah');
  const userId = masukan.userId;
  if (userId === pemanggilId) return galat('target_dilarang');

  try {
    const target = await deps.cariPengguna(userId);
    if (!target) return galat('tidak_ada');
    if (target.role === 'admin') return galat('target_dilarang');

    const jumlahDokumen = await deps.hitungDokumen(userId);
    const idCloud = await deps.daftarPublicId(userId);
    const { total, gagal } = await hapusBanyakAset(idCloud, (id) => deps.hapusAset(id), deps.catat);
    if (gagal > 0) return galat('cloudinary_gagal');

    let terhapus = false;
    try {
      terhapus = await deps.hapusAkun(userId);
    } catch (alasan) {
      deps.catat?.(`Gagal menghapus akun ${userId}`, alasan);
    }
    if (!terhapus) return galat('gagal_hapus');

    try {
      await deps.tulisLog({
        adminId: pemanggilId,
        targetUserId: userId,
        aksi: 'hapus_akun',
        keterangan: `Akun ${labelAkun(target)} dihapus (${jumlahDokumen} dokumen, ${total} file)`,
      });
    } catch (alasan) {
      deps.catat?.(`Gagal menulis log untuk akun ${userId}`, alasan);
      return galat('log_gagal');
    }
    return { status: 200, body: { ok: true, dokumen: jumlahDokumen, file: total } };
  } catch (alasan) {
    deps.catat?.(`Galat tak terduga saat menghapus akun ${userId}`, alasan);
    return galat('galat_server');
  }
}
```

Penjelasan: setelah pemeriksaan admin, validasi, dan sasaran terlarang, urutannya **daftar file milik pengguna → hapus semua di Cloudinary (gagal sebagian = 502, akun utuh) → `hapusAkun` → log `hapus_akun`**. `hapusAkun` memanggil `auth.admin.deleteUser`; baris `profiles`, `dokumen`, `halaman_dokumen`, dan `efek_foto` ikut terhapus lewat `on delete cascade` (dari Fase 2). Hasilnya `{ dokumen, file }`: jumlah dokumen dan file yang dihapus, ditampilkan sebagai ringkasan di log.

**Berkas:** `supabase/functions/admin-delete-user/index.ts` (berkas baru: buat)

```ts
// Edge Function `admin-delete-user` (tugas 8.1): admin menghapus akun pengguna beserta seluruh
// dokumennya (file Cloudinary dibersihkan dulu, lalu akun Auth dihapus; sisanya cascade).
// Body: { "userId": "<uuid>" }
import {
  bacaSemuaPublicId,
  buatKlienAdmin,
  GALAT_BELUM_DIKONFIGURASI,
  hapusAsetDari,
  kenaliPemanggil,
  layani,
  tulisLogDb,
} from '../_shared/server.ts';
import { prosesHapusPengguna, type Deps } from './logic.ts';

layani(
  async (req, badan, cloudinary) => {
    const pemanggil = await kenaliPemanggil(req);
    const admin = pemanggil.id ? buatKlienAdmin() : null;
    if (pemanggil.id && (!admin || !cloudinary)) {
      console.error('Secret key Supabase atau secret Cloudinary tidak tersedia.');
      return GALAT_BELUM_DIKONFIGURASI;
    }
    const deps: Deps = {
      ...pemanggil.deps,
      tulisLog: admin ? tulisLogDb(admin) : () => Promise.reject(new Error('tanpa klien')),
      hapusAset: cloudinary
        ? hapusAsetDari(cloudinary)
        : () => Promise.reject(new Error('tanpa cloudinary')),
      async cariPengguna(id) {
        const { data, error } = await admin!
          .from('profiles')
          .select('id, nama, email, role')
          .eq('id', id)
          .maybeSingle();
        if (error) throw error;
        return data
          ? {
              id: data.id as string,
              nama: (data.nama as string) ?? '',
              email: (data.email as string | null) ?? null,
              role: data.role === 'admin' ? 'admin' : 'user',
            }
          : null;
      },
      async hitungDokumen(userId) {
        const { count, error } = await admin!
          .from('dokumen')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId);
        if (error) throw error;
        return count ?? 0;
      },
      daftarPublicId: (userId) => bacaSemuaPublicId(admin!, { p_user_id: userId }),
      async hapusAkun(userId) {
        const { error } = await admin!.auth.admin.deleteUser(userId);
        if (error) throw error;
        return true;
      },
    };
    return prosesHapusPengguna({ pemanggilId: pemanggil.id, userId: badan?.userId }, deps);
  },
  { perluCloudinary: true },
);
```

### 5.4 Uji unit function admin

**Berkas:** `tests/admin.test.mjs` (berkas baru: buat)

```js
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { labelAkun, periksaAdmin, ringkas, STATUS } from '../supabase/functions/_shared/admin.ts';
import { hapusBanyakAset } from '../supabase/functions/_shared/cloudinary.ts';
import { prosesAdminHapusDokumen } from '../supabase/functions/admin-delete-document/logic.ts';
import { prosesHapusPengguna } from '../supabase/functions/admin-delete-user/logic.ts';
import { prosesUbahAktif } from '../supabase/functions/admin-set-user-active/logic.ts';

const ADMIN = '11111111-1111-4111-8111-111111111111';
const BIASA = '22222222-2222-4222-8222-222222222222';
const TARGET = '33333333-3333-4333-8333-333333333333';
const ADMIN2 = '44444444-4444-4444-8444-444444444444';
const DOK = '55555555-5555-4555-8555-555555555555';

/** Dasar `Deps` palsu: mencatat semua efek ke `jejak` agar urutan bisa diperiksa. */
function dasar(opsi = {}) {
  const jejak = [];
  return {
    jejak,
    deps: {
      adalahAdmin: async () => opsi.admin ?? true,
      tulisLog: async (e) => {
        if (opsi.logGagal) throw new Error('log gagal');
        jejak.push(['log', e]);
      },
      catat: () => {},
      ...opsi.tambahan,
    },
  };
}

describe('periksaAdmin', () => {
  it('menolak tanpa pemanggil (401) dan non-admin (403)', async () => {
    const a = await periksaAdmin(null, { adalahAdmin: async () => true });
    assert.equal(a.status, 401);
    assert.equal(a.body.kode, 'belum_masuk');
    const b = await periksaAdmin(BIASA, { adalahAdmin: async () => false });
    assert.equal(b.status, 403);
    assert.equal(b.body.kode, 'bukan_admin');
  });
  it('galat saat memeriksa peran = 500, bukan lolos', async () => {
    const r = await periksaAdmin(ADMIN, {
      adalahAdmin: async () => {
        throw new Error('db mati');
      },
    });
    assert.equal(r.status, 500);
  });
  it('lolos (null) untuk admin', async () => {
    assert.equal(await periksaAdmin(ADMIN, { adalahAdmin: async () => true }), null);
  });
  it('setiap kode galat punya status HTTP', () => {
    for (const kode of Object.keys(STATUS)) assert.ok(STATUS[kode] >= 400);
  });
});

describe('ringkas dan labelAkun', () => {
  it('merapikan spasi dan memotong dengan elipsis', () => {
    assert.equal(ringkas('  a   b \n c '), 'a b c');
    assert.equal(ringkas('x'.repeat(100), 10), 'xxxxxxxxx…');
  });
  it('label: email + nama, atau cadangan', () => {
    assert.equal(labelAkun({ id: 'i', nama: 'Ani', email: 'a@x.id' }), 'a@x.id (Ani)');
    assert.equal(labelAkun({ id: 'i', nama: '', email: 'a@x.id' }), 'a@x.id');
    assert.equal(labelAkun({ id: 'i', nama: 'Ani', email: null }), 'Ani');
    assert.equal(labelAkun({ id: 'i', nama: '', email: null }), 'i');
  });
});

describe('hapusBanyakAset', () => {
  it('menghitung gagal, melewati id kosong, dan mencatat galat', async () => {
    const dicatat = [];
    const r = await hapusBanyakAset(
      ['a', ' ', 'b', 'c'],
      async (id) => {
        if (id === 'b') throw new Error('x');
        return 'ok';
      },
      (pesan) => dicatat.push(pesan),
    );
    assert.deepEqual(r, { total: 3, gagal: 1 });
    assert.equal(dicatat.length, 1);
  });
});

describe('admin-set-user-active', () => {
  const target = (o = {}) => ({
    id: TARGET,
    nama: 'Ani',
    email: 'ani@x.id',
    role: 'user',
    isAktif: true,
    ...o,
  });
  function pasang(opsi = {}) {
    const d = dasar(opsi);
    d.deps.cariPengguna = async (id) => (opsi.tanpaTarget ? null : { ...target(opsi.target), id });
    d.deps.ubahAktif = async (id, aktif) => {
      if (opsi.ubahGagal) return false;
      d.jejak.push(['ubah', id, aktif]);
      return true;
    };
    return d;
  }

  it('non-admin ditolak 403 TANPA menyentuh data, bahkan dengan isi permintaan salah', async () => {
    const d = pasang({ admin: false });
    const r = await prosesUbahAktif({ pemanggilId: BIASA, userId: 'ngawur', aktif: 'x' }, d.deps);
    assert.equal(r.status, 403);
    assert.deepEqual(d.jejak, []);
  });
  it('tanpa pemanggil: 401', async () => {
    const r = await prosesUbahAktif(
      { pemanggilId: null, userId: TARGET, aktif: false },
      pasang().deps,
    );
    assert.equal(r.status, 401);
  });
  it('isi permintaan salah: 400', async () => {
    for (const m of [
      { userId: 'bukan-uuid', aktif: false },
      { userId: TARGET, aktif: 'false' },
      { userId: TARGET },
      { aktif: true },
    ]) {
      const r = await prosesUbahAktif({ pemanggilId: ADMIN, ...m }, pasang().deps);
      assert.equal(r.status, 400, JSON.stringify(m));
    }
  });
  it('tidak boleh menarget diri sendiri atau admin lain', async () => {
    const d = pasang();
    assert.equal(
      (await prosesUbahAktif({ pemanggilId: ADMIN, userId: ADMIN, aktif: false }, d.deps)).status,
      403,
    );
    const d2 = pasang({ target: { role: 'admin' } });
    const r = await prosesUbahAktif({ pemanggilId: ADMIN, userId: ADMIN2, aktif: false }, d2.deps);
    assert.equal(r.body.kode, 'target_dilarang');
    assert.deepEqual(d.jejak, []);
    assert.deepEqual(d2.jejak, []);
  });
  it('target tidak ada: 404', async () => {
    const r = await prosesUbahAktif(
      { pemanggilId: ADMIN, userId: TARGET, aktif: false },
      pasang({ tanpaTarget: true }).deps,
    );
    assert.equal(r.status, 404);
  });
  it('menonaktifkan: mengubah lalu mencatat log nonaktifkan_akun', async () => {
    const d = pasang();
    const r = await prosesUbahAktif({ pemanggilId: ADMIN, userId: TARGET, aktif: false }, d.deps);
    assert.deepEqual(r, { status: 200, body: { ok: true, aktif: false, berubah: true } });
    assert.equal(d.jejak[0][0], 'ubah');
    assert.equal(d.jejak[1][0], 'log');
    assert.equal(d.jejak[1][1].aksi, 'nonaktifkan_akun');
    assert.equal(d.jejak[1][1].adminId, ADMIN);
    assert.equal(d.jejak[1][1].targetUserId, TARGET);
    assert.match(d.jejak[1][1].keterangan, /ani@x\.id.*dinonaktifkan/);
  });
  it('mengaktifkan: log aktifkan_akun', async () => {
    const d = pasang({ target: { isAktif: false } });
    const r = await prosesUbahAktif({ pemanggilId: ADMIN, userId: TARGET, aktif: true }, d.deps);
    assert.equal(r.body.berubah, true);
    assert.equal(d.jejak[1][1].aksi, 'aktifkan_akun');
  });
  it('status sudah sama: tidak ada perubahan dan tidak ada log', async () => {
    const d = pasang();
    const r = await prosesUbahAktif({ pemanggilId: ADMIN, userId: TARGET, aktif: true }, d.deps);
    assert.deepEqual(r, { status: 200, body: { ok: true, aktif: true, berubah: false } });
    assert.deepEqual(d.jejak, []);
  });
  it('gagal menyimpan: 500 gagal_ubah dan tanpa log', async () => {
    const d = pasang({ ubahGagal: true });
    const r = await prosesUbahAktif({ pemanggilId: ADMIN, userId: TARGET, aktif: false }, d.deps);
    assert.equal(r.body.kode, 'gagal_ubah');
    assert.deepEqual(d.jejak, []);
  });
  it('log gagal ditulis: 500 log_gagal (aksi sudah terjadi)', async () => {
    const d = pasang({ logGagal: true });
    const r = await prosesUbahAktif({ pemanggilId: ADMIN, userId: TARGET, aktif: false }, d.deps);
    assert.equal(r.body.kode, 'log_gagal');
    assert.equal(d.jejak[0][0], 'ubah');
  });
});

describe('admin-delete-document', () => {
  function pasang(opsi = {}) {
    const d = dasar(opsi);
    d.deps.cariDokumen = async (id) =>
      opsi.tanpaDok
        ? null
        : { id, judul: 'KTP\n Ani', userId: TARGET, labelPemilik: 'ani@x.id (Ani)' };
    d.deps.daftarPublicId = async () => opsi.ids ?? ['p/1', 'p/2', 'p/3'];
    d.deps.hapusAset = async (id) => {
      d.jejak.push(['aset', id]);
      if (opsi.gagalAset === id) throw new Error('cloud');
      return 'ok';
    };
    d.deps.hapusBaris = async (id) => {
      d.jejak.push(['baris', id]);
      return opsi.barisGagal ? false : true;
    };
    return d;
  }
  it('non-admin ditolak tanpa menyentuh apa pun', async () => {
    const d = pasang({ admin: false });
    const r = await prosesAdminHapusDokumen({ pemanggilId: BIASA, dokumenId: DOK }, d.deps);
    assert.equal(r.status, 403);
    assert.deepEqual(d.jejak, []);
  });
  it('id salah: 400; dokumen tidak ada: 404', async () => {
    assert.equal(
      (await prosesAdminHapusDokumen({ pemanggilId: ADMIN, dokumenId: 'x' }, pasang().deps)).status,
      400,
    );
    assert.equal(
      (
        await prosesAdminHapusDokumen(
          { pemanggilId: ADMIN, dokumenId: DOK },
          pasang({ tanpaDok: true }).deps,
        )
      ).status,
      404,
    );
  });
  it('sukses: semua aset, lalu baris, lalu log (urutan terjaga)', async () => {
    const d = pasang();
    const r = await prosesAdminHapusDokumen({ pemanggilId: ADMIN, dokumenId: DOK }, d.deps);
    assert.deepEqual(r, { status: 200, body: { ok: true, dihapus: 3 } });
    const urutan = d.jejak.map((j) => j[0]);
    assert.deepEqual(urutan.slice(0, 3), ['aset', 'aset', 'aset'].sort());
    assert.deepEqual(urutan.slice(3), ['baris', 'log']);
    const log = d.jejak.at(-1)[1];
    assert.equal(log.aksi, 'hapus_dokumen');
    assert.equal(log.targetUserId, TARGET);
    assert.equal(log.adminId, ADMIN);
    assert.match(log.keterangan, /"KTP Ani".*3 file.*ani@x\.id/);
  });
  it('Cloudinary gagal: 502, baris dan log TIDAK ditulis', async () => {
    const d = pasang({ gagalAset: 'p/2' });
    const r = await prosesAdminHapusDokumen({ pemanggilId: ADMIN, dokumenId: DOK }, d.deps);
    assert.equal(r.status, 502);
    assert.ok(!d.jejak.some((j) => j[0] === 'baris' || j[0] === 'log'));
  });
  it('hapus baris gagal: 500 gagal_hapus tanpa log', async () => {
    const d = pasang({ barisGagal: true });
    const r = await prosesAdminHapusDokumen({ pemanggilId: ADMIN, dokumenId: DOK }, d.deps);
    assert.equal(r.body.kode, 'gagal_hapus');
    assert.ok(!d.jejak.some((j) => j[0] === 'log'));
  });
  it('log gagal: 500 log_gagal', async () => {
    const d = pasang({ logGagal: true });
    const r = await prosesAdminHapusDokumen({ pemanggilId: ADMIN, dokumenId: DOK }, d.deps);
    assert.equal(r.body.kode, 'log_gagal');
  });
  it('dokumen tanpa halaman: sukses 0 file', async () => {
    const r = await prosesAdminHapusDokumen(
      { pemanggilId: ADMIN, dokumenId: DOK },
      pasang({ ids: [] }).deps,
    );
    assert.deepEqual(r.body, { ok: true, dihapus: 0 });
  });
});

describe('admin-delete-user', () => {
  function pasang(opsi = {}) {
    const d = dasar(opsi);
    d.deps.cariPengguna = async (id) =>
      opsi.tanpaTarget ? null : { id, nama: 'Ani', email: 'ani@x.id', role: opsi.role ?? 'user' };
    d.deps.hitungDokumen = async () => 2;
    d.deps.daftarPublicId = async () => ['p/1', 'p/2', 'p/3'];
    d.deps.hapusAset = async (id) => {
      d.jejak.push(['aset', id]);
      if (opsi.gagalAset === id) throw new Error('cloud');
      return 'ok';
    };
    d.deps.hapusAkun = async (id) => {
      d.jejak.push(['akun', id]);
      if (opsi.akunMelempar) throw new Error('auth');
      return !opsi.akunGagal;
    };
    return d;
  }
  it('non-admin ditolak, diri sendiri dan admin lain dilarang', async () => {
    const a = pasang({ admin: false });
    assert.equal(
      (await prosesHapusPengguna({ pemanggilId: BIASA, userId: TARGET }, a.deps)).status,
      403,
    );
    const b = pasang();
    assert.equal(
      (await prosesHapusPengguna({ pemanggilId: ADMIN, userId: ADMIN }, b.deps)).body.kode,
      'target_dilarang',
    );
    const c = pasang({ role: 'admin' });
    assert.equal(
      (await prosesHapusPengguna({ pemanggilId: ADMIN, userId: ADMIN2 }, c.deps)).body.kode,
      'target_dilarang',
    );
    assert.deepEqual([...a.jejak, ...b.jejak, ...c.jejak], []);
  });
  it('id salah 400, target tidak ada 404', async () => {
    assert.equal(
      (await prosesHapusPengguna({ pemanggilId: ADMIN, userId: 'x' }, pasang().deps)).status,
      400,
    );
    assert.equal(
      (
        await prosesHapusPengguna(
          { pemanggilId: ADMIN, userId: TARGET },
          pasang({ tanpaTarget: true }).deps,
        )
      ).status,
      404,
    );
  });
  it('sukses: aset dulu, lalu akun, lalu log hapus_akun dengan ringkasan', async () => {
    const d = pasang();
    const r = await prosesHapusPengguna({ pemanggilId: ADMIN, userId: TARGET }, d.deps);
    assert.deepEqual(r, { status: 200, body: { ok: true, dokumen: 2, file: 3 } });
    assert.deepEqual(d.jejak.map((j) => j[0]).slice(3), ['akun', 'log']);
    const log = d.jejak.at(-1)[1];
    assert.equal(log.aksi, 'hapus_akun');
    assert.equal(log.targetUserId, TARGET);
    assert.match(log.keterangan, /ani@x\.id.*2 dokumen, 3 file/);
  });
  it('Cloudinary gagal: akun TIDAK dihapus dan tanpa log', async () => {
    const d = pasang({ gagalAset: 'p/1' });
    const r = await prosesHapusPengguna({ pemanggilId: ADMIN, userId: TARGET }, d.deps);
    assert.equal(r.status, 502);
    assert.ok(!d.jejak.some((j) => j[0] === 'akun' || j[0] === 'log'));
  });
  it('hapus akun gagal atau melempar: gagal_hapus tanpa log', async () => {
    for (const o of [{ akunGagal: true }, { akunMelempar: true }]) {
      const d = pasang(o);
      const r = await prosesHapusPengguna({ pemanggilId: ADMIN, userId: TARGET }, d.deps);
      assert.equal(r.body.kode, 'gagal_hapus');
      assert.ok(!d.jejak.some((j) => j[0] === 'log'));
    }
  });
  it('log gagal: log_gagal', async () => {
    const r = await prosesHapusPengguna(
      { pemanggilId: ADMIN, userId: TARGET },
      pasang({ logGagal: true }).deps,
    );
    assert.equal(r.body.kode, 'log_gagal');
  });
});
```

```bash
npm test
```

Seharusnya **111 lulus** (81 + 30). Di dalamnya: non-admin selalu 403 **dan tidak ada dependensi data yang dipanggil**, sasaran terlarang, no-op tanpa log, urutan "file dulu, akun belakangan, log paling akhir", 502 membiarkan akun utuh, dan ringkasan log yang tidak memuat rahasia.

---

## 6. Modul murni aplikasi dan uji unit

Tiga berkas ini murni (tanpa React Native, Expo, atau Supabase), sehingga diuji `npm test`. Buat folder `src\features\admin`.

### 6.1 `src/features/admin/daftar.ts`

**Berkas:** `src/features/admin/daftar.ts` (berkas baru: buat)

```ts
// Aturan murni untuk panel admin (Fase 8): label, filter, dan format tampilan. Tanpa supabase
// atau React Native supaya bisa diuji dengan `npm test`.

export type AksiLog = 'nonaktifkan_akun' | 'aktifkan_akun' | 'hapus_akun' | 'hapus_dokumen';

export const URUTAN_AKSI: AksiLog[] = [
  'nonaktifkan_akun',
  'aktifkan_akun',
  'hapus_akun',
  'hapus_dokumen',
];

export const LABEL_AKSI: Record<AksiLog, string> = {
  nonaktifkan_akun: 'Nonaktifkan akun',
  aktifkan_akun: 'Aktifkan akun',
  hapus_akun: 'Hapus akun',
  hapus_dokumen: 'Hapus dokumen',
};

export const FILTER_AKTIF = ['semua', 'aktif', 'nonaktif'] as const;
export type FilterAktif = (typeof FILTER_AKTIF)[number];

export const LABEL_FILTER_AKTIF: Record<FilterAktif, string> = {
  semua: 'Semua',
  aktif: 'Aktif',
  nonaktif: 'Nonaktif',
};

/** Nilai `p_aktif` untuk RPC: null berarti semua. */
export function nilaiAktif(filter: FilterAktif): boolean | null {
  return filter === 'semua' ? null : filter === 'aktif';
}

/** Angka dengan pemisah ribuan titik gaya Indonesia: 1234567 -> "1.234.567". */
export function formatAngka(n: number): string {
  const bulat = Math.round(n);
  return String(Math.abs(bulat))
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.')
    .replace(/^/, bulat < 0 ? '-' : '');
}

/** Ukuran berkas: "512 B", "1,5 KB", "2 MB", "1,25 GB" (maksimal dua desimal, koma desimal). */
export function formatUkuran(byte: number): string {
  if (!Number.isFinite(byte) || byte < 0) return '-';
  if (byte < 1024) return `${Math.round(byte)} B`;
  const satuan = ['KB', 'MB', 'GB', 'TB'];
  let nilai = byte / 1024;
  let i = 0;
  while (nilai >= 1024 && i < satuan.length - 1) {
    nilai /= 1024;
    i += 1;
  }
  const teks = (Math.round(nilai * 100) / 100).toString().replace('.', ',');
  return `${teks} ${satuan[i]}`;
}

const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const dua = (n: number) => String(n).padStart(2, '0');

/** "25 Okt 2026, 14.05" (zona waktu perangkat). Teks yang tidak terbaca dikembalikan "-". */
export function formatWaktu(iso: string): string {
  const w = new Date(iso);
  if (Number.isNaN(w.getTime())) return '-';
  return `${w.getDate()} ${BULAN[w.getMonth()]} ${w.getFullYear()}, ${dua(w.getHours())}.${dua(w.getMinutes())}`;
}

type Orang = { nama: string | null; email: string | null };

/** Nama utama untuk satu akun di daftar: nama, lalu email, lalu teks cadangan. */
export function namaTampil(orang: Orang, cadangan = 'Tanpa nama'): string {
  return orang.nama?.trim() || orang.email?.trim() || cadangan;
}

/** Huruf awal untuk avatar. */
export function inisial(orang: Orang): string {
  return (namaTampil(orang, '?')[0] ?? '?').toUpperCase();
}

/**
 * Kata yang harus diketik admin untuk mengonfirmasi penghapusan akun: email akun itu (paling
 * sulit diketik tanpa sengaja), atau "HAPUS" bila akun tidak punya email.
 */
export function kataKonfirmasi(pengguna: { email: string | null }): string {
  return pengguna.email?.trim() || 'HAPUS';
}

export function cocokKonfirmasi(masukan: string, pengguna: { email: string | null }): boolean {
  return masukan.trim().toLowerCase() === kataKonfirmasi(pengguna).toLowerCase();
}

/** Ringkasan satu baris untuk daftar pengguna: "3 dokumen · bergabung 17 Okt 2026". */
export function labelDokumen(jumlah: number): string {
  return `${formatAngka(jumlah)} dokumen`;
}
```

Penjelasan: `LABEL_AKSI` dan `URUTAN_AKSI` menamai empat jenis aksi untuk filter dan daftar log; `FILTER_AKTIF` dan `nilaiAktif` menerjemahkan chip (Semua, Aktif, Nonaktif) menjadi `null`, `true`, atau `false` untuk RPC; `formatUkuran` mengubah byte menjadi KB, MB, atau GB; `kataKonfirmasi` dan `cocokKonfirmasi` menentukan kata yang harus diketik untuk menghapus akun (email, atau `HAPUS`), dengan pencocokan **tanpa membedakan huruf besar kecil** dan spasi di tepi diabaikan; `labelDokumen` menghasilkan "1 dokumen", "3 dokumen", atau "belum punya dokumen".

### 6.2 `src/features/admin/galat.ts`

**Berkas:** `src/features/admin/galat.ts` (berkas baru: buat)

```ts
// Galat untuk layar admin (Fase 8). Murni, supaya pemetaan kode bisa diuji dengan `npm test`.

export type JenisGalatAdmin =
  'jaringan' | 'izin' | 'tidakada' | 'dilarang' | 'cloudinary' | 'log' | 'lain';

const PESAN: Record<JenisGalatAdmin, string> = {
  jaringan: 'Tidak bisa terhubung ke server. Periksa internetmu, lalu coba lagi.',
  izin: 'Akunmu tidak punya izin admin untuk melakukan ini.',
  tidakada: 'Data tidak ditemukan. Mungkin sudah dihapus.',
  dilarang: 'Aksi ini tidak boleh dilakukan pada akun tersebut.',
  cloudinary: 'Sebagian file belum bisa dihapus. Coba lagi; datanya tidak hilang.',
  log: 'Aksi sudah dijalankan, tetapi catatan log gagal ditulis. Beri tahu pengembang.',
  lain: 'Terjadi masalah saat memproses data. Coba lagi sebentar lagi.',
};

export class GalatAdmin extends Error {
  readonly kind: JenisGalatAdmin;
  constructor(kind: JenisGalatAdmin) {
    super(PESAN[kind]);
    this.name = 'GalatAdmin';
    this.kind = kind;
  }
}

type GalatPostgrest = { code?: string; message?: string };

export function galatDariPostgrest(error: GalatPostgrest): GalatAdmin {
  // 42501 = insufficient_privilege: pemeriksaan is_admin() di fungsi RPC atau RLS menolak.
  if (error.code === '42501') return new GalatAdmin('izin');
  if (!error.code && /fetch|network|failed/i.test(error.message ?? '')) {
    return new GalatAdmin('jaringan');
  }
  return new GalatAdmin('lain');
}

/** Memetakan `kode` dari balasan galat Edge Function admin. */
export function galatDariKodeFungsi(kode: unknown): GalatAdmin {
  switch (kode) {
    case 'belum_masuk':
    case 'bukan_admin':
      return new GalatAdmin('izin');
    case 'tidak_ada':
      return new GalatAdmin('tidakada');
    case 'target_dilarang':
      return new GalatAdmin('dilarang');
    case 'cloudinary_gagal':
      return new GalatAdmin('cloudinary');
    case 'log_gagal':
      return new GalatAdmin('log');
    default:
      return new GalatAdmin('lain');
  }
}

export function pesanGalat(galat: unknown, cadangan = PESAN.lain): string {
  return galat instanceof GalatAdmin ? galat.message : cadangan;
}
```

Penjelasan: satu kelas `GalatAdmin` dengan tujuh jenis dan pesan Indonesia. `galatDariPostgrest` memetakan kode `42501` (ditolak `is_admin()` atau RLS) ke jenis `izin`; `galatDariKodeFungsi` memetakan `kode` dari balasan galat Edge Function ke jenis galat aplikasi (`target_dilarang` → `dilarang`, `cloudinary_gagal` → `cloudinary`, `log_gagal` → `log`, dan seterusnya).

### 6.3 `src/features/admin/skema.ts`

**Berkas:** `src/features/admin/skema.ts` (berkas baru: buat)

```ts
import { z } from 'zod';

import type { StatusDokumen } from '@/features/dokumen/skema';

import type { AksiLog } from './daftar';

// Membaca jawaban RPC admin menjadi tipe aplikasi (zod). Baris yang bentuknya salah dilewati.

export type StatistikAdmin = {
  penggunaTotal: number;
  penggunaAktif: number;
  dokumenTotal: number;
  halamanTotal: number;
  ukuranByte: number;
};

const statistikSchema = z.object({
  pengguna_total: z.number(),
  pengguna_aktif: z.number(),
  dokumen_total: z.number(),
  halaman_total: z.number(),
  ukuran_byte: z.number(),
});

export function statistikDariJson(data: unknown): StatistikAdmin | null {
  const cek = statistikSchema.safeParse(data);
  if (!cek.success) return null;
  const d = cek.data;
  return {
    penggunaTotal: d.pengguna_total,
    penggunaAktif: d.pengguna_aktif,
    dokumenTotal: d.dokumen_total,
    halamanTotal: d.halaman_total,
    ukuranByte: d.ukuran_byte,
  };
}

export type PenggunaAdmin = {
  id: string;
  nama: string;
  email: string | null;
  role: 'user' | 'admin';
  isAktif: boolean;
  dibuatPada: string;
  jumlahDokumen: number;
};

const penggunaSchema = z.object({
  id: z.string(),
  nama: z.string(),
  email: z.string().nullable(),
  role: z.enum(['user', 'admin']),
  is_aktif: z.boolean(),
  dibuat_pada: z.string(),
  jumlah_dokumen: z.number(),
});

export function daftarPenggunaDariBaris(data: unknown): PenggunaAdmin[] {
  if (!Array.isArray(data)) return [];
  const hasil: PenggunaAdmin[] = [];
  for (const baris of data) {
    const cek = penggunaSchema.safeParse(baris);
    if (!cek.success) continue;
    const d = cek.data;
    hasil.push({
      id: d.id,
      nama: d.nama,
      email: d.email,
      role: d.role,
      isAktif: d.is_aktif,
      dibuatPada: d.dibuat_pada,
      jumlahDokumen: d.jumlah_dokumen,
    });
  }
  return hasil;
}

export type DokumenAdmin = {
  id: string;
  judul: string;
  status: StatusDokumen;
  jumlahHalaman: number;
  dibuatPada: string;
  userId: string;
  namaPemilik: string;
  emailPemilik: string | null;
  urlSampul: string | null;
};

const dokumenSchema = z.object({
  id: z.string(),
  judul: z.string(),
  status: z.enum(['draft', 'selesai']),
  jumlah_halaman: z.number().int(),
  dibuat_pada: z.string(),
  user_id: z.string(),
  nama_pemilik: z.string(),
  email_pemilik: z.string().nullable(),
  url_sampul: z.string().nullable(),
});

export function daftarDokumenAdminDariBaris(data: unknown): DokumenAdmin[] {
  if (!Array.isArray(data)) return [];
  const hasil: DokumenAdmin[] = [];
  for (const baris of data) {
    const cek = dokumenSchema.safeParse(baris);
    if (!cek.success) continue;
    const d = cek.data;
    hasil.push({
      id: d.id,
      judul: d.judul,
      status: d.status,
      jumlahHalaman: d.jumlah_halaman,
      dibuatPada: d.dibuat_pada,
      userId: d.user_id,
      namaPemilik: d.nama_pemilik,
      emailPemilik: d.email_pemilik,
      urlSampul: d.url_sampul,
    });
  }
  return hasil;
}

export type LogAdmin = {
  id: string;
  adminId: string | null;
  namaAdmin: string | null;
  emailAdmin: string | null;
  targetUserId: string | null;
  aksi: AksiLog;
  keterangan: string;
  waktu: string;
};

const logSchema = z.object({
  id: z.string(),
  admin_id: z.string().nullable(),
  nama_admin: z.string().nullable(),
  email_admin: z.string().nullable(),
  target_user_id: z.string().nullable(),
  aksi: z.enum(['nonaktifkan_akun', 'aktifkan_akun', 'hapus_akun', 'hapus_dokumen']),
  keterangan: z.string().nullable(),
  waktu: z.string(),
});

export function daftarLogDariBaris(data: unknown): LogAdmin[] {
  if (!Array.isArray(data)) return [];
  const hasil: LogAdmin[] = [];
  for (const baris of data) {
    const cek = logSchema.safeParse(baris);
    if (!cek.success) continue;
    const d = cek.data;
    hasil.push({
      id: d.id,
      adminId: d.admin_id,
      namaAdmin: d.nama_admin,
      emailAdmin: d.email_admin,
      targetUserId: d.target_user_id,
      aksi: d.aksi,
      keterangan: d.keterangan ?? '',
      waktu: d.waktu,
    });
  }
  return hasil;
}

export type AdminRingkas = { id: string; nama: string; email: string | null };

const adminSchema = z.object({ id: z.string(), nama: z.string(), email: z.string().nullable() });

export function daftarAdminDariBaris(data: unknown): AdminRingkas[] {
  if (!Array.isArray(data)) return [];
  return data.flatMap((baris) => {
    const cek = adminSchema.safeParse(baris);
    return cek.success ? [cek.data] : [];
  });
}

export type DetailDokumenAdminData = {
  id: string;
  judul: string;
  status: StatusDokumen;
  dibuatPada: string;
  userId: string;
  halaman: { id: string; urutan: number; urlHasil: string }[];
};

const detailSchema = z.object({
  id: z.string(),
  judul: z.string(),
  status: z.enum(['draft', 'selesai']),
  dibuat_pada: z.string(),
  user_id: z.string(),
  halaman_dokumen: z.array(
    z.object({ id: z.string(), urutan: z.number().int(), url_hasil: z.string() }),
  ),
});

export function detailDokumenAdminDariBaris(data: unknown): DetailDokumenAdminData | null {
  const cek = detailSchema.safeParse(data);
  if (!cek.success) return null;
  const d = cek.data;
  return {
    id: d.id,
    judul: d.judul,
    status: d.status,
    dibuatPada: d.dibuat_pada,
    userId: d.user_id,
    halaman: d.halaman_dokumen
      .map((h) => ({ id: h.id, urutan: h.urutan, urlHasil: h.url_hasil }))
      .sort((a, b) => a.urutan - b.urutan),
  };
}
```

Penjelasan: jawaban database dibaca dengan zod. Baris yang bentuknya salah **dilewati** (satu baris rusak tidak menutup layar). Nama kolom `snake_case` dari database dipetakan ke `camelCase` di aplikasi.

### 6.4 Uji unit

**Berkas:** `tests/admin-app.test.mjs` (berkas baru: buat)

```js
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  cocokKonfirmasi,
  formatAngka,
  formatUkuran,
  formatWaktu,
  inisial,
  kataKonfirmasi,
  LABEL_AKSI,
  namaTampil,
  nilaiAktif,
  URUTAN_AKSI,
} from '../src/features/admin/daftar.ts';
import {
  GalatAdmin,
  galatDariKodeFungsi,
  galatDariPostgrest,
  pesanGalat,
} from '../src/features/admin/galat.ts';
import {
  daftarAdminDariBaris,
  daftarDokumenAdminDariBaris,
  daftarLogDariBaris,
  daftarPenggunaDariBaris,
  detailDokumenAdminDariBaris,
  statistikDariJson,
} from '../src/features/admin/skema.ts';

describe('format angka dan ukuran', () => {
  it('formatAngka memakai titik ribuan', () => {
    assert.equal(formatAngka(0), '0');
    assert.equal(formatAngka(999), '999');
    assert.equal(formatAngka(1000), '1.000');
    assert.equal(formatAngka(1234567), '1.234.567');
    assert.equal(formatAngka(-1500), '-1.500');
  });
  it('formatUkuran memakai koma desimal dan satuan yang pas', () => {
    assert.equal(formatUkuran(0), '0 B');
    assert.equal(formatUkuran(512), '512 B');
    assert.equal(formatUkuran(1024), '1 KB');
    assert.equal(formatUkuran(1536), '1,5 KB');
    assert.equal(formatUkuran(5 * 1024 * 1024), '5 MB');
    assert.equal(formatUkuran(1.25 * 1024 ** 3), '1,25 GB');
    assert.equal(formatUkuran(-1), '-');
    assert.equal(formatUkuran(Number.NaN), '-');
  });
  it('formatWaktu memuat tanggal dan jam (waktu perangkat)', () => {
    assert.equal(formatWaktu(new Date(2026, 9, 25, 14, 5).toISOString()), '25 Okt 2026, 14.05');
    assert.equal(formatWaktu(new Date(2026, 0, 3, 0, 0).toISOString()), '3 Jan 2026, 00.00');
    assert.equal(formatWaktu('bukan tanggal'), '-');
  });
});

describe('nama, inisial, konfirmasi', () => {
  it('namaTampil: nama, lalu email, lalu cadangan', () => {
    assert.equal(namaTampil({ nama: 'Ani', email: 'a@x.id' }), 'Ani');
    assert.equal(namaTampil({ nama: ' ', email: 'a@x.id' }), 'a@x.id');
    assert.equal(namaTampil({ nama: '', email: null }), 'Tanpa nama');
    assert.equal(inisial({ nama: 'budi', email: null }), 'B');
    assert.equal(inisial({ nama: '', email: null }), '?');
  });
  it('konfirmasi hapus akun: ketik email (tidak peka huruf besar, spasi diabaikan)', () => {
    const p = { email: 'Ani@X.id' };
    assert.equal(kataKonfirmasi(p), 'Ani@X.id');
    assert.ok(cocokKonfirmasi('  ani@x.ID ', p));
    assert.ok(!cocokKonfirmasi('ani@x', p));
    assert.ok(!cocokKonfirmasi('', p));
  });
  it('tanpa email: ketik HAPUS', () => {
    const p = { email: null };
    assert.equal(kataKonfirmasi(p), 'HAPUS');
    assert.ok(cocokKonfirmasi('hapus', p));
    assert.ok(!cocokKonfirmasi('', p));
  });
  it('nilaiAktif memetakan filter ke parameter RPC', () => {
    assert.equal(nilaiAktif('semua'), null);
    assert.equal(nilaiAktif('aktif'), true);
    assert.equal(nilaiAktif('nonaktif'), false);
  });
  it('semua aksi log punya label', () => {
    for (const a of URUTAN_AKSI) assert.ok(LABEL_AKSI[a]);
    assert.equal(URUTAN_AKSI.length, 4);
  });
});

describe('galat admin', () => {
  it('memetakan galat PostgREST', () => {
    assert.equal(galatDariPostgrest({ code: '42501' }).kind, 'izin');
    assert.equal(
      galatDariPostgrest({ message: 'TypeError: Network request failed' }).kind,
      'jaringan',
    );
    assert.equal(galatDariPostgrest({ code: 'XX000', message: 'failed' }).kind, 'lain');
  });
  it('memetakan kode fungsi', () => {
    const peta = {
      belum_masuk: 'izin',
      bukan_admin: 'izin',
      tidak_ada: 'tidakada',
      target_dilarang: 'dilarang',
      cloudinary_gagal: 'cloudinary',
      log_gagal: 'log',
      galat_server: 'lain',
      apa_saja: 'lain',
    };
    for (const [kode, jenis] of Object.entries(peta)) {
      assert.equal(galatDariKodeFungsi(kode).kind, jenis, kode);
    }
    assert.equal(galatDariKodeFungsi(undefined).kind, 'lain');
  });
  it('pesanGalat memakai pesan GalatAdmin atau cadangan', () => {
    assert.equal(pesanGalat(new GalatAdmin('dilarang')), new GalatAdmin('dilarang').message);
    assert.equal(pesanGalat(new Error('x'), 'cadangan'), 'cadangan');
  });
});

describe('skema jawaban admin', () => {
  it('statistik', () => {
    const s = statistikDariJson({
      pengguna_total: 5,
      pengguna_aktif: 4,
      dokumen_total: 10,
      halaman_total: 33,
      ukuran_byte: 123456,
    });
    assert.deepEqual(s, {
      penggunaTotal: 5,
      penggunaAktif: 4,
      dokumenTotal: 10,
      halamanTotal: 33,
      ukuranByte: 123456,
    });
    assert.equal(statistikDariJson({ pengguna_total: 'lima' }), null);
    assert.equal(statistikDariJson(null), null);
  });
  it('pengguna: baris rusak dilewati', () => {
    const baik = {
      id: 'u1',
      nama: 'Ani',
      email: null,
      role: 'user',
      is_aktif: true,
      dibuat_pada: '2026-10-01T00:00:00Z',
      jumlah_dokumen: 3,
    };
    const hasil = daftarPenggunaDariBaris([baik, { ...baik, role: 'superuser' }, null]);
    assert.equal(hasil.length, 1);
    assert.equal(hasil[0].jumlahDokumen, 3);
    assert.equal(hasil[0].isAktif, true);
    assert.deepEqual(daftarPenggunaDariBaris({}), []);
  });
  it('dokumen admin', () => {
    const baik = {
      id: 'd1',
      judul: 'KTP',
      status: 'draft',
      jumlah_halaman: 2,
      dibuat_pada: '2026-10-01T00:00:00Z',
      user_id: 'u1',
      nama_pemilik: 'Ani',
      email_pemilik: 'a@x.id',
      url_sampul: null,
    };
    const hasil = daftarDokumenAdminDariBaris([baik, { ...baik, status: 'x' }]);
    assert.equal(hasil.length, 1);
    assert.equal(hasil[0].emailPemilik, 'a@x.id');
    assert.equal(hasil[0].urlSampul, null);
  });
  it('log: admin terhapus (null) dan keterangan kosong tetap terbaca', () => {
    const hasil = daftarLogDariBaris([
      {
        id: 'l1',
        admin_id: null,
        nama_admin: null,
        email_admin: null,
        target_user_id: 'u1',
        aksi: 'hapus_akun',
        keterangan: null,
        waktu: '2026-10-25T07:00:00Z',
      },
      { id: 'l2', aksi: 'tidak dikenal' },
    ]);
    assert.equal(hasil.length, 1);
    assert.equal(hasil[0].adminId, null);
    assert.equal(hasil[0].keterangan, '');
  });
  it('daftar admin dan detail dokumen', () => {
    assert.deepEqual(daftarAdminDariBaris([{ id: 'a', nama: 'Admin', email: null }, { id: 'b' }]), [
      { id: 'a', nama: 'Admin', email: null },
    ]);
    const d = detailDokumenAdminDariBaris({
      id: 'd1',
      judul: 'KTP',
      status: 'selesai',
      dibuat_pada: '2026-10-01T00:00:00Z',
      user_id: 'u1',
      halaman_dokumen: [
        { id: 'h2', urutan: 2, url_hasil: 'b' },
        { id: 'h1', urutan: 1, url_hasil: 'a' },
      ],
    });
    assert.deepEqual(
      d.halaman.map((h) => h.id),
      ['h1', 'h2'],
    );
    assert.equal(d.userId, 'u1');
    assert.equal(detailDokumenAdminDariBaris({ id: 1 }), null);
  });
});
```

```bash
npm test
```

Seharusnya **127 lulus** (81 + 30 + 16).

---

## 7. Tugas 8.7: deploy dan uji penolakan

### 7.1 Persiapan

Kamu **tidak perlu** menambah secret: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, dan `CLOUDINARY_API_SECRET` sudah terpasang sejak Fase 7. Pastikan:

```bash
npx supabase secrets list
```

Ketiga nama harus ada. Kunci Supabase tersedia otomatis di setiap function lewat variabel bawaan; untuk melihat daftarnya buka Dashboard Supabase > **Edge Functions** > **Secrets**. Function ini membaca `SUPABASE_SECRET_KEYS` (kunci `sb_secret_...`) dan, bila tidak ada, `SUPABASE_SERVICE_ROLE_KEY`. **Kunci itu tidak pernah kamu salin ke mana pun.**

### 7.2 Bila `deploy` meminta Docker

Semua perintah deploy memakai `--use-api` (dibundel di server, tanpa Docker), sama seperti Fase 7.

### 7.3 Deploy, berurutan

**Urutan penting.** Mulai dari `delete-document` karena ia sudah punya uji nyata dari Fase 7 dan sekarang mengimpor `_shared`. Bila langkah ini gagal, function lama tetap berjalan dan **tidak ada yang rusak**:

```bash
npx supabase functions deploy delete-document --use-api
```

Bila berhasil, **uji ulang hapus dokumen dari aplikasi** (Fase 7, 9.2 nomor 9) sebelum lanjut. Bila gagal dengan pesan bahwa berkas `../_shared/...` tidak ditemukan, **berhenti dan kirim keluarannya kepadaku**: artinya bundel `--use-api` tidak mengikuti impor relatif di proyekmu, dan saya akan menyiapkan jalur cadangan (menyalin `_shared` ke tiap folder function) sebelum kita lanjut.

Bila `delete-document` baik-baik saja, deploy tiga function admin:

```bash
npx supabase functions deploy admin-set-user-active --use-api
npx supabase functions deploy admin-delete-user --use-api
npx supabase functions deploy admin-delete-document --use-api
```

Lalu buka Dashboard Supabase > **Edge Functions**: keempat function aktif dan **Verify JWT** menyala untuk semuanya.

### 7.4 Uji penolakan dengan `curl` (tugas 8.7)

Semua uji di bagian ini **tidak mengubah data apa pun** (tidak ada yang berhasil menghapus atau mengubah). Ambil nilai dari `.env`: `EXPO_PUBLIC_SUPABASE_URL` (bentuk `https://abcdefghijkl.supabase.co`) dan `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (bentuk `sb_publishable_xxxxx`).

**Uji 1: tanpa login, ketiganya harus 401.**

```bash
curl -i -X POST "https://abcdefghijkl.supabase.co/functions/v1/admin-set-user-active" -H "Content-Type: application/json" -d "{}"
curl -i -X POST "https://abcdefghijkl.supabase.co/functions/v1/admin-delete-user" -H "Content-Type: application/json" -d "{}"
curl -i -X POST "https://abcdefghijkl.supabase.co/functions/v1/admin-delete-document" -H "Content-Type: application/json" -d "{}"
```

Diharapkan: `HTTP/2 401` ketiganya (ditolak gerbang karena tidak ada JWT).

**Uji 2: token palsu, ketiganya harus 401.**

```bash
curl -i -X POST "https://abcdefghijkl.supabase.co/functions/v1/admin-delete-user" -H "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.palsu.palsu" -H "Content-Type: application/json" -d "{}"
```

Diharapkan `401`. (Ulangi untuk dua function lainnya bila ingin teliti.)

**Uji 3: token USER BIASA, ketiganya harus 403 `bukan_admin`.** Ambil token akun uji (`uji8@contoh.com`; ganti sandinya dengan yang kamu catat di 3.3; bila sandi memuat `%`, buat sandi baru yang sederhana lewat Dashboard):

```bash
curl -s -X POST "https://abcdefghijkl.supabase.co/auth/v1/token?grant_type=password" -H "apikey: sb_publishable_xxxxx" -H "Content-Type: application/json" -d "{\"email\":\"uji8@contoh.com\",\"password\":\"sandi-akun-uji\"}"
```

Salin nilai `access_token` (teks panjang berawalan `eyJ`; berlaku sekitar satu jam; **jangan ditempel di chat atau issue**). Lalu, memakai id sembarang yang berbentuk UUID:

```bash
set TOKEN=eyJ...tempel-token-akun-uji-di-sini
curl -i -X POST "https://abcdefghijkl.supabase.co/functions/v1/admin-set-user-active" -H "Authorization: Bearer %TOKEN%" -H "apikey: sb_publishable_xxxxx" -H "Content-Type: application/json" -d "{\"userId\":\"00000000-0000-4000-8000-000000000000\",\"aktif\":false}"
curl -i -X POST "https://abcdefghijkl.supabase.co/functions/v1/admin-delete-user" -H "Authorization: Bearer %TOKEN%" -H "apikey: sb_publishable_xxxxx" -H "Content-Type: application/json" -d "{\"userId\":\"00000000-0000-4000-8000-000000000000\"}"
curl -i -X POST "https://abcdefghijkl.supabase.co/functions/v1/admin-delete-document" -H "Authorization: Bearer %TOKEN%" -H "apikey: sb_publishable_xxxxx" -H "Content-Type: application/json" -d "{\"dokumenId\":\"00000000-0000-4000-8000-000000000000\"}"
set TOKEN=
```

Diharapkan: `HTTP/2 403` dengan badan `{"ok":false,"kode":"bukan_admin","pesan":"Hanya admin yang boleh melakukan ini."}` untuk **ketiganya**. Ini bukti utama tugas 8.7: pengguna biasa yang sah (punya JWT) tetap tidak bisa menembus function admin.

**Uji 4: token ADMIN dengan sasaran yang tidak ada → 404.** Ambil token akun admin-mu dengan perintah yang sama seperti uji 3 (email dan sandi adminmu), lalu:

```bash
set TOKEN=eyJ...tempel-token-admin-di-sini
curl -i -X POST "https://abcdefghijkl.supabase.co/functions/v1/admin-delete-user" -H "Authorization: Bearer %TOKEN%" -H "apikey: sb_publishable_xxxxx" -H "Content-Type: application/json" -d "{\"userId\":\"00000000-0000-4000-8000-000000000000\"}"
```

Diharapkan: `HTTP/2 404` dengan `"kode":"tidak_ada"`. Itu membuktikan function hidup, `is_admin` lolos, dan klien secret key bekerja (ia berhasil menanyakan data).

**Uji 5: sasaran diri sendiri → 403 `target_dilarang`.** Ambil id akun adminmu: di SQL Editor jalankan `select id from public.profiles where email = 'EMAILMU@contoh.com';` (ganti dengan emailmu), lalu:

```bash
curl -i -X POST "https://abcdefghijkl.supabase.co/functions/v1/admin-set-user-active" -H "Authorization: Bearer %TOKEN%" -H "apikey: sb_publishable_xxxxx" -H "Content-Type: application/json" -d "{\"userId\":\"ID-ADMINMU\",\"aktif\":false}"
set TOKEN=
```

Diharapkan: `HTTP/2 403` dengan `"kode":"target_dilarang"`, dan akunmu tetap aktif.

**Uji 6 (opsional, aman): status sama = tidak ada perubahan.** Ganti `ID-AKUN-UJI` dengan id akun `uji8@contoh.com` (`select id from public.profiles where email = 'uji8@contoh.com';`) dan kirim `"aktif":true` dengan token admin. Diharapkan `200` dan `"berubah":false`, serta **tidak ada** baris log baru.

Bila hasil apa pun berbeda dari yang diharapkan, **jangan lanjut**: kirim keluaran `curl`-nya (tanpa token) kepadaku.

---

## 8. Akses data dan TanStack Query

### 8.1 `src/features/admin/api.ts`

**Berkas:** `src/features/admin/api.ts` (berkas baru: buat)

```ts
import { FunctionsFetchError, FunctionsHttpError } from '@supabase/supabase-js';

import { UKURAN_HALAMAN, polaPencarian } from '@/features/dokumen/daftar';
import type { FilterStatus } from '@/features/dokumen/daftar';
import { supabase } from '@/lib/supabase';

import { nilaiAktif, type AksiLog, type FilterAktif } from './daftar';
import { GalatAdmin, galatDariKodeFungsi, galatDariPostgrest } from './galat';
import {
  daftarAdminDariBaris,
  daftarDokumenAdminDariBaris,
  daftarLogDariBaris,
  daftarPenggunaDariBaris,
  detailDokumenAdminDariBaris,
  statistikDariJson,
  type AdminRingkas,
  type DetailDokumenAdminData,
  type DokumenAdmin,
  type LogAdmin,
  type PenggunaAdmin,
  type StatistikAdmin,
} from './skema';

// Akses data panel admin (Fase 8). Pembacaan lewat fungsi RPC `admin_*` (tiap fungsi menolak
// non-admin dengan kode 42501); aksi yang mengubah data lewat Edge Function admin, karena
// menghapus file Cloudinary, menghapus akun, dan menulis log butuh secret key yang hanya ada di server.
//
// `.retry(false)`: postgrest-js mengulang GET sendiri sampai 3 kali saat jaringan putus; ulang
// diatur satu kali di TanStack Query (lihat QueryProvider).

export type HalamanAdmin<T> = { item: T[]; adaLagi: boolean };

/** Menyusun argumen RPC tanpa kunci bernilai null/undefined (supaya default di SQL yang dipakai). */
function argumen(nilai: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(nilai).filter(([, v]) => v !== null && v !== undefined));
}

function dariOffset(halamanKe: number) {
  return halamanKe * UKURAN_HALAMAN;
}

export async function muatStatistik(): Promise<StatistikAdmin> {
  const { data, error } = await supabase.rpc('admin_statistik').retry(false);
  if (error) throw galatDariPostgrest(error);
  const statistik = statistikDariJson(data);
  if (!statistik) throw new GalatAdmin('lain');
  return statistik;
}

export async function muatPengguna(params: {
  halamanKe: number;
  filter: FilterAktif;
  kata: string;
}): Promise<HalamanAdmin<PenggunaAdmin>> {
  const { data, error } = await supabase
    .rpc(
      'admin_daftar_pengguna',
      argumen({
        p_pola: polaPencarian(params.kata),
        p_aktif: nilaiAktif(params.filter),
        p_limit: UKURAN_HALAMAN,
        p_offset: dariOffset(params.halamanKe),
      }),
    )
    .retry(false);
  if (error) throw galatDariPostgrest(error);
  const baris = Array.isArray(data) ? data : [];
  return { item: daftarPenggunaDariBaris(baris), adaLagi: baris.length >= UKURAN_HALAMAN };
}

export async function muatDokumenAdmin(params: {
  halamanKe: number;
  status: FilterStatus;
  kata: string;
}): Promise<HalamanAdmin<DokumenAdmin>> {
  const { data, error } = await supabase
    .rpc(
      'admin_daftar_dokumen',
      argumen({
        p_pola: polaPencarian(params.kata),
        p_status: params.status === 'semua' ? null : params.status,
        p_limit: UKURAN_HALAMAN,
        p_offset: dariOffset(params.halamanKe),
      }),
    )
    .retry(false);
  if (error) throw galatDariPostgrest(error);
  const baris = Array.isArray(data) ? data : [];
  return { item: daftarDokumenAdminDariBaris(baris), adaLagi: baris.length >= UKURAN_HALAMAN };
}

export type DetailDokumenAdmin = DetailDokumenAdminData & {
  pemilik: { nama: string; email: string | null } | null;
};

/** Satu dokumen (siapa pun pemiliknya) beserta halaman dan identitas pemilik. RLS: admin boleh baca. */
export async function muatDetailDokumenAdmin(dokumenId: string): Promise<DetailDokumenAdmin> {
  const { data, error } = await supabase
    .from('dokumen')
    .select('id, judul, status, dibuat_pada, user_id, halaman_dokumen(id, urutan, url_hasil)')
    .eq('id', dokumenId)
    .retry(false)
    .maybeSingle();
  if (error) throw galatDariPostgrest(error);
  if (!data) throw new GalatAdmin('tidakada');
  const detail = detailDokumenAdminDariBaris(data);
  if (!detail) throw new GalatAdmin('lain');

  const { data: pemilik } = await supabase
    .from('profiles')
    .select('nama, email')
    .eq('id', detail.userId)
    .retry(false)
    .maybeSingle();
  const p = pemilik as { nama?: unknown; email?: unknown } | null;
  return {
    ...detail,
    pemilik: p
      ? {
          nama: typeof p.nama === 'string' ? p.nama : '',
          email: typeof p.email === 'string' ? p.email : null,
        }
      : null,
  };
}

export async function muatLog(params: {
  halamanKe: number;
  aksi: AksiLog | null;
  adminId: string | null;
}): Promise<HalamanAdmin<LogAdmin>> {
  const { data, error } = await supabase
    .rpc(
      'admin_daftar_log',
      argumen({
        p_aksi: params.aksi,
        p_admin_id: params.adminId,
        p_limit: UKURAN_HALAMAN,
        p_offset: dariOffset(params.halamanKe),
      }),
    )
    .retry(false);
  if (error) throw galatDariPostgrest(error);
  const baris = Array.isArray(data) ? data : [];
  return { item: daftarLogDariBaris(baris), adaLagi: baris.length >= UKURAN_HALAMAN };
}

/** Daftar akun admin untuk chip filter log. Jumlahnya kecil, jadi tanpa paginasi. */
export async function muatDaftarAdmin(): Promise<AdminRingkas[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, nama, email')
    .eq('role', 'admin')
    .order('nama', { ascending: true })
    .limit(50)
    .retry(false);
  if (error) throw galatDariPostgrest(error);
  return daftarAdminDariBaris(data);
}

/** Memanggil Edge Function admin dan memetakan semua jenis galat ke GalatAdmin. */
async function panggilFungsi<T>(nama: string, body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke(nama, { body });
  if (!error) return data as T;

  if (error instanceof FunctionsFetchError) throw new GalatAdmin('jaringan');
  if (error instanceof FunctionsHttpError) {
    const isi: unknown = await error.context.json().catch(() => null);
    throw galatDariKodeFungsi((isi as { kode?: unknown } | null)?.kode);
  }
  throw new GalatAdmin('lain');
}

export async function ubahStatusPengguna(params: {
  userId: string;
  aktif: boolean;
}): Promise<{ aktif: boolean; berubah: boolean }> {
  return panggilFungsi('admin-set-user-active', params);
}

export async function hapusPengguna(userId: string): Promise<{ dokumen: number; file: number }> {
  return panggilFungsi('admin-delete-user', { userId });
}

export async function hapusDokumenAdmin(dokumenId: string): Promise<{ dihapus: number }> {
  return panggilFungsi('admin-delete-document', { dokumenId });
}
```

Penjelasan, bagian yang penting:

- Setiap pembacaan memanggil `supabase.rpc(...).retry(false)` (K44 dari Fase 7): `postgrest-js` tidak mengulang sendiri, TanStack mengulang **satu kali**. Argumen bernilai `null` atau `undefined` **dibuang** oleh `argumen()` supaya PostgREST memakai nilai bawaan fungsi (kita tidak mengirim `null` eksplisit ke fungsi RPC).
- `muatDaftarAdmin` mengambil akun berperan admin (paling banyak 50), untuk chip filter admin di layar log.
- `panggilFungsi` membungkus `supabase.functions.invoke`: `FunctionsFetchError` menjadi galat jaringan, `FunctionsHttpError` dibaca badannya lalu `kode` dipetakan ke `GalatAdmin`, dan balasan sukses diperiksa bentuknya.
- Ketiga aksi (`ubahStatusPengguna`, `hapusPengguna`, `hapusDokumenAdmin`) hanya memanggil function; **tidak ada** satu pun yang menulis langsung ke tabel dari aplikasi.

### 8.2 `src/features/admin/hooks.ts`

**Berkas:** `src/features/admin/hooks.ts` (berkas baru: buat)

```ts
import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import { gabungTanpaGanda, type FilterStatus } from '@/features/dokumen/daftar';

import {
  hapusDokumenAdmin,
  hapusPengguna,
  muatDaftarAdmin,
  muatDetailDokumenAdmin,
  muatDokumenAdmin,
  muatLog,
  muatPengguna,
  muatStatistik,
  ubahStatusPengguna,
} from './api';
import type { AksiLog, FilterAktif } from './daftar';

// Semua kunci cache diawali "admin" + id admin, sehingga `invalidateQueries(kunciAdmin.semua(id))`
// menyegarkan statistik, semua daftar, dan log sekaligus setelah sebuah aksi.
export const kunciAdmin = {
  semua: (adminId: string) => ['admin', adminId] as const,
  statistik: (adminId: string) => ['admin', adminId, 'statistik'] as const,
  pengguna: (adminId: string, filter: FilterAktif, kata: string) =>
    ['admin', adminId, 'pengguna', filter, kata] as const,
  dokumen: (adminId: string, status: FilterStatus, kata: string) =>
    ['admin', adminId, 'dokumen', status, kata] as const,
  detailDokumen: (adminId: string, dokumenId: string) =>
    ['admin', adminId, 'detail-dokumen', dokumenId] as const,
  log: (adminId: string, aksi: AksiLog | null, filterAdmin: string | null) =>
    ['admin', adminId, 'log', aksi, filterAdmin] as const,
  daftarAdmin: (adminId: string) => ['admin', adminId, 'daftar-admin'] as const,
};

export function useStatistik(adminId: string) {
  return useQuery({ queryKey: kunciAdmin.statistik(adminId), queryFn: muatStatistik });
}

export function useDaftarPengguna(adminId: string, filter: FilterAktif, kata: string) {
  return useInfiniteQuery({
    queryKey: kunciAdmin.pengguna(adminId, filter, kata),
    queryFn: ({ pageParam }) => muatPengguna({ halamanKe: pageParam, filter, kata }),
    initialPageParam: 0,
    getNextPageParam: (terakhir, semua) => (terakhir.adaLagi ? semua.length : undefined),
    select: (data) => gabungTanpaGanda(data.pages.map((h) => h.item)),
    placeholderData: keepPreviousData,
  });
}

export function useDaftarDokumenAdmin(adminId: string, status: FilterStatus, kata: string) {
  return useInfiniteQuery({
    queryKey: kunciAdmin.dokumen(adminId, status, kata),
    queryFn: ({ pageParam }) => muatDokumenAdmin({ halamanKe: pageParam, status, kata }),
    initialPageParam: 0,
    getNextPageParam: (terakhir, semua) => (terakhir.adaLagi ? semua.length : undefined),
    select: (data) => gabungTanpaGanda(data.pages.map((h) => h.item)),
    placeholderData: keepPreviousData,
  });
}

export function useDetailDokumenAdmin(adminId: string, dokumenId: string) {
  return useQuery({
    queryKey: kunciAdmin.detailDokumen(adminId, dokumenId),
    queryFn: () => muatDetailDokumenAdmin(dokumenId),
  });
}

export function useDaftarLog(adminId: string, aksi: AksiLog | null, filterAdmin: string | null) {
  return useInfiniteQuery({
    queryKey: kunciAdmin.log(adminId, aksi, filterAdmin),
    queryFn: ({ pageParam }) => muatLog({ halamanKe: pageParam, aksi, adminId: filterAdmin }),
    initialPageParam: 0,
    getNextPageParam: (terakhir, semua) => (terakhir.adaLagi ? semua.length : undefined),
    select: (data) => gabungTanpaGanda(data.pages.map((h) => h.item)),
    placeholderData: keepPreviousData,
  });
}

export function useDaftarAdmin(adminId: string) {
  return useQuery({ queryKey: kunciAdmin.daftarAdmin(adminId), queryFn: muatDaftarAdmin });
}

// Setelah aksi apa pun (berhasil ATAU gagal) cache admin disegarkan: aksi yang gagal di tengah
// jalan (mis. log gagal ditulis) tetap bisa mengubah data, dan layar harus menampilkan keadaan terbaru.
export function useUbahStatusPengguna(adminId: string) {
  const klien = useQueryClient();
  return useMutation({
    mutationFn: ubahStatusPengguna,
    onSettled: () => klien.invalidateQueries({ queryKey: kunciAdmin.semua(adminId) }),
  });
}

export function useHapusPengguna(adminId: string) {
  const klien = useQueryClient();
  return useMutation({
    mutationFn: hapusPengguna,
    onSettled: () => klien.invalidateQueries({ queryKey: kunciAdmin.semua(adminId) }),
  });
}

export function useHapusDokumenAdmin(adminId: string) {
  const klien = useQueryClient();
  return useMutation({
    mutationFn: hapusDokumenAdmin,
    onSuccess: (_h, dokumenId) => {
      klien.removeQueries({ queryKey: kunciAdmin.detailDokumen(adminId, dokumenId) });
    },
    onSettled: () => {
      void klien.invalidateQueries({ queryKey: kunciAdmin.semua(adminId) });
      // Dokumen yang dihapus bisa saja milik admin sendiri: segarkan juga daftar Dashboard-nya.
      return klien.invalidateQueries({ queryKey: ['dokumen', adminId] });
    },
  });
}
```

Penjelasan: kunci cache selalu `['admin', adminId, ...]` (`kunciAdmin`), sehingga cache admin terpisah dari cache dokumen pribadi. Daftar memakai `useInfiniteQuery` (sama polanya dengan Fase 7) dan `placeholderData: keepPreviousData`. Setiap mutasi memanggil `invalidateQueries` pada **seluruh** kunci admin di `onSettled` (berhasil **maupun** gagal), karena aksi yang gagal sebagian (mis. `log_gagal`) tetap mengubah data.

---

## 9. Komponen bersama

### 9.1 `src/components/Card.tsx` (berkas lama)

**Ganti seluruh isinya.** Perubahannya hanya prop `accessible`: bila `true` dan kartu tidak bisa diketuk, kartu dibaca pembaca layar sebagai satu elemen dengan `accessibilityLabel`.

**Berkas:** `src/components/Card.tsx` (berkas lama: ganti seluruh isinya)

```tsx
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius, spacing } from '@/theme';

type CardProps = {
  children: ReactNode;
  /** Bila diisi, kartu bisa disentuh. */
  onPress?: () => void;
  accessibilityLabel?: string;
  /** true: kartu (tanpa onPress) dibacakan sebagai satu kelompok dengan accessibilityLabel-nya. */
  accessible?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Card({ children, onPress, accessibilityLabel, accessible, style }: CardProps) {
  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPress={onPress}
        android_ripple={{ color: colors.primarySoft }}
        style={({ pressed }) => [styles.card, pressed && styles.pressed, style]}
      >
        {children}
      </Pressable>
    );
  }
  return (
    <View
      accessible={accessible}
      accessibilityLabel={accessible ? accessibilityLabel : undefined}
      style={[styles.card, style]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
    shadowColor: colors.text,
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
    overflow: 'hidden',
  },
  pressed: { opacity: 0.85 },
});
```

### 9.2 `src/features/dokumen/PagerHalaman.tsx`

Pager halaman yang tadinya ada di dalam `DetailDokumen`, diambil menjadi komponen sendiri agar dipakai juga oleh detail dokumen admin (K56).

**Berkas:** `src/features/dokumen/PagerHalaman.tsx` (berkas baru: buat)

```tsx
import { Image } from 'expo-image';
import { useRef, useState } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

import { IconButton } from '@/components';
import { colors, radius, typography } from '@/theme';

import { urlTampil } from './gambar';
import type { HalamanDetail } from './skema';

const RASIO_HALAMAN = 4 / 3;

type PagerHalamanProps = {
  halaman: HalamanDetail[];
  /** Dipakai untuk label aksesibilitas gambar: "Halaman 2 dari <judul>". */
  judul: string;
  /** Dipanggil tiap halaman aktif berganti (geser atau tombol panah). */
  onIndeksBerubah?: (indeks: number) => void;
};

// Pager halaman dokumen: digeser mendatar atau lewat tombol panah, dengan penanda "Halaman n dari m".
// Dipakai bersama oleh detail dokumen pengguna (Fase 7) dan detail dokumen admin (Fase 8).
export function PagerHalaman({ halaman, judul, onIndeksBerubah }: PagerHalamanProps) {
  const [lebar, setLebar] = useState(0);
  const [indeks, setIndeksState] = useState(0);
  const daftar = useRef<FlatList<HalamanDetail>>(null);
  const tujuan = useRef<number | null>(null);
  const jumlah = halaman.length;
  const tinggi = lebar > 0 ? Math.round(lebar * RASIO_HALAMAN) : 0;

  const setIndeks = (ke: number) => {
    setIndeksState(ke);
    onIndeksBerubah?.(ke);
  };

  const geser = (ke: number) => {
    const sasaran = Math.max(0, Math.min(jumlah - 1, ke));
    if (sasaran === indeks) return;
    setIndeks(sasaran);
    // Selama animasi menuju `sasaran`, peristiwa gulir di tengah jalan diabaikan supaya penanda
    // "Halaman n dari m" tidak berkedip mundur lalu maju.
    tujuan.current = sasaran;
    daftar.current?.scrollToOffset({ offset: sasaran * lebar, animated: true });
  };

  const saatGulir = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (lebar <= 0) return;
    const ke = Math.round(e.nativeEvent.contentOffset.x / lebar);
    if (tujuan.current !== null) {
      if (ke !== tujuan.current) return;
      tujuan.current = null;
    }
    if (ke !== indeks) setIndeks(ke);
  };

  if (jumlah === 0) return null;
  const aktif = Math.min(indeks, jumlah - 1);

  return (
    <>
      <View
        onLayout={(e: LayoutChangeEvent) => setLebar(Math.round(e.nativeEvent.layout.width))}
        style={styles.pager}
      >
        {lebar > 0 ? (
          <FlatList
            ref={daftar}
            data={halaman}
            keyExtractor={(h) => h.id}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={saatGulir}
            onScrollBeginDrag={() => {
              tujuan.current = null;
            }}
            scrollEventThrottle={16}
            getItemLayout={(_, i) => ({ length: lebar, offset: lebar * i, index: i })}
            initialNumToRender={2}
            windowSize={3}
            renderItem={({ item }) => (
              <View style={{ width: lebar, height: tinggi }}>
                <Image
                  source={{ uri: urlTampil(item.urlHasil) ?? item.urlHasil }}
                  contentFit="contain"
                  transition={150}
                  accessibilityLabel={`Halaman ${item.urutan} dari ${judul}`}
                  style={styles.halaman}
                />
              </View>
            )}
          />
        ) : null}
      </View>
      <View style={styles.navigasi}>
        <IconButton
          icon="chevron-back"
          label="Halaman sebelumnya"
          onPress={() => geser(indeks - 1)}
          disabled={indeks <= 0}
        />
        <Text accessibilityLiveRegion="polite" style={styles.penanda}>
          Halaman {aktif + 1} dari {jumlah}
        </Text>
        <IconButton
          icon="chevron-forward"
          label="Halaman berikutnya"
          onPress={() => geser(indeks + 1)}
          disabled={indeks >= jumlah - 1}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  pager: {
    width: '100%',
    overflow: 'hidden',
    borderRadius: radius.lg,
    backgroundColor: colors.border,
  },
  halaman: { width: '100%', height: '100%' },
  navigasi: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  penanda: { ...typography.bodyStrong, color: colors.text },
});
```

### 9.3 `src/features/dokumen/DetailDokumen.tsx` (berkas lama)

**Ganti seluruh isinya.** Perilaku sama dengan Fase 7; bagian pager diganti pemakaian `PagerHalaman`, dan indeks halaman diterima lewat `onIndeksBerubah`.

**Berkas:** `src/features/dokumen/DetailDokumen.tsx` (berkas lama: ganti seluruh isinya)

```tsx
import { useFocusEffect, useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Banner, Button, Dialog, EmptyState, Screen, Skeleton, TextField } from '@/components';
import { colors, radius, spacing, typography } from '@/theme';

import { formatTanggal, labelHalaman } from './daftar';
import { pesanGalat } from './galat';
import { kunciDokumen, useDetailDokumen, useHapusDokumen, useUbahJudul } from './hooks';
import { LabelStatus } from './KartuDokumen';
import { judulSchema } from './judul';
import { PagerHalaman } from './PagerHalaman';

// Detail dokumen (tugas 7.3-7.5): halaman digeser mendatar (atau lewat tombol panah), judul bisa
// diganti, dan dokumen bisa dihapus setelah konfirmasi.
export function DetailDokumen({ userId, dokumenId }: { userId: string; dokumenId: string }) {
  const router = useRouter();
  const klien = useQueryClient();
  const q = useDetailDokumen(userId, dokumenId);
  const ubah = useUbahJudul(userId);
  const hapus = useHapusDokumen(userId);

  const [dialog, setDialog] = useState<'nama' | 'hapus' | null>(null);
  const [judulBaru, setJudulBaru] = useState('');
  const [galatJudul, setGalatJudul] = useState<string | null>(null);
  const [indeks, setIndeks] = useState(0);

  // Segarkan tiap layar ini kembali terlihat (mis. setelah menyimpan efek di editor).
  const pertama = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (pertama.current) {
        pertama.current = false;
        return;
      }
      void klien.invalidateQueries({ queryKey: kunciDokumen.detail(userId, dokumenId) });
    }, [klien, userId, dokumenId]),
  );

  if (q.isPending) {
    return (
      <Screen edges={['bottom']}>
        <View
          accessibilityLabel="Memuat dokumen"
          accessibilityLiveRegion="polite"
          style={styles.gap}
        >
          <Skeleton style={styles.kerangkaJudul} />
          <Skeleton style={styles.kerangkaInfo} />
          <Skeleton style={styles.kerangkaHalaman} />
        </View>
      </Screen>
    );
  }
  if (q.isError) {
    const hilang = (q.error as { kind?: string }).kind === 'tidakada';
    return (
      <Screen edges={['bottom']}>
        {hilang ? (
          <EmptyState
            icon="document-outline"
            title="Dokumen tidak ditemukan"
            description="Dokumen ini mungkin sudah dihapus."
            actionLabel="Kembali"
            onAction={keluar}
          />
        ) : (
          <View style={styles.gap}>
            <Banner message={pesanGalat(q.error, 'Dokumen belum bisa dimuat.')} />
            <Button title="Coba lagi" variant="secondary" onPress={() => void q.refetch()} />
          </View>
        )}
      </Screen>
    );
  }

  const dokumen = q.data;
  const halaman = dokumen.halaman;
  const jumlah = halaman.length;

  function keluar() {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }

  const bukaGantiNama = () => {
    ubah.reset();
    setGalatJudul(null);
    setJudulBaru(dokumen.judul);
    setDialog('nama');
  };

  const simpanNama = () => {
    const cek = judulSchema.safeParse(judulBaru);
    if (!cek.success) {
      setGalatJudul(cek.error.issues[0]?.message ?? 'Judul tidak valid');
      return;
    }
    if (cek.data === dokumen.judul) {
      setDialog(null);
      return;
    }
    ubah.mutate({ dokumenId, judul: cek.data }, { onSuccess: () => setDialog(null) });
  };

  const bukaHapus = () => {
    hapus.reset();
    setDialog('hapus');
  };

  const konfirmasiHapus = () => {
    hapus.mutate(dokumenId, {
      onSuccess: () => {
        setDialog(null);
        keluar();
      },
    });
  };

  const halamanAktif = halaman[Math.min(indeks, Math.max(0, jumlah - 1))];

  return (
    <Screen scroll edges={['bottom']}>
      <View style={styles.atas}>
        <Text accessibilityRole="header" style={styles.judul}>
          {dokumen.judul}
        </Text>
        <Text style={styles.info}>
          {labelHalaman(jumlah)} · {formatTanggal(dokumen.dibuatPada)}
        </Text>
        <LabelStatus status={dokumen.status} />
      </View>

      {jumlah === 0 ? (
        <EmptyState
          icon="images-outline"
          title="Belum ada halaman"
          description="Dokumen ini belum punya halaman tersimpan."
        />
      ) : (
        <PagerHalaman halaman={halaman} judul={dokumen.judul} onIndeksBerubah={setIndeks} />
      )}

      {halamanAktif ? (
        <Button
          title="Percantik halaman ini"
          variant="secondary"
          fullWidth
          onPress={() =>
            router.push({ pathname: '/editor/[halamanId]', params: { halamanId: halamanAktif.id } })
          }
        />
      ) : null}

      <View style={styles.aksi}>
        <Button title="Ganti nama" variant="secondary" onPress={bukaGantiNama} />
        <Button title="Hapus dokumen" variant="danger" onPress={bukaHapus} />
      </View>

      <Dialog
        visible={dialog === 'nama'}
        title="Ganti nama dokumen"
        confirmLabel="Simpan"
        onConfirm={simpanNama}
        onCancel={() => setDialog(null)}
        busy={ubah.isPending}
        error={ubah.isError ? pesanGalat(ubah.error) : null}
      >
        <TextField
          label="Judul dokumen"
          value={judulBaru}
          onChangeText={(t) => {
            setJudulBaru(t);
            setGalatJudul(null);
          }}
          error={galatJudul ?? undefined}
          maxLength={120}
          autoFocus
          returnKeyType="done"
          onSubmitEditing={simpanNama}
        />
      </Dialog>

      <Dialog
        visible={dialog === 'hapus'}
        title="Hapus dokumen ini?"
        message={`"${dokumen.judul}" beserta ${labelHalaman(jumlah)}-nya akan dihapus permanen, termasuk file di penyimpanan. Tindakan ini tidak bisa dibatalkan.`}
        confirmLabel="Hapus"
        destructive
        onConfirm={konfirmasiHapus}
        onCancel={() => setDialog(null)}
        busy={hapus.isPending}
        error={hapus.isError ? pesanGalat(hapus.error) : null}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  gap: { gap: spacing.md },
  atas: { gap: spacing.xs, alignItems: 'flex-start' },
  judul: { ...typography.heading, color: colors.text },
  info: { ...typography.caption, color: colors.textMuted },
  aksi: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'center' },
  kerangkaJudul: { height: 24, width: '60%' },
  kerangkaInfo: { height: 16, width: '40%' },
  kerangkaHalaman: { height: 360, borderRadius: radius.lg },
});
```

### 9.4 `src/features/admin/ListaBerhalaman.tsx`

**Berkas:** `src/features/admin/ListaBerhalaman.tsx` (berkas baru: buat)

```tsx
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useQueryClient, type UseInfiniteQueryResult } from '@tanstack/react-query';
import { useCallback, useRef, useState, type ReactElement } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { Banner, Button, Card, Skeleton } from '@/components';
import { colors, spacing, typography } from '@/theme';

import { pesanGalat } from './galat';

type ListaBerhalamanProps<T extends { id: string }> = {
  /** Hasil useInfiniteQuery yang `select`-nya sudah menggabungkan halaman menjadi satu larik. */
  q: UseInfiniteQueryResult<T[], Error>;
  renderItem: (item: T) => ReactElement;
  /** Bagian atas daftar (kolom cari, chip filter, pemberitahuan) yang ikut tergulir. */
  kepala: ReactElement;
  /** Isi daftar saat tidak ada baris (empty state); pemanggil yang tahu apakah filter aktif. */
  kosong: ReactElement;
  /** Label aksesibilitas untuk blok kerangka. */
  labelMemuat: string;
  /** Kunci cache yang disegarkan setiap layar ini kembali terlihat (mis. setelah detail dihapus). */
  kunciSegar: readonly unknown[];
  pesanGagalMuat: string;
};

// Daftar berhalaman bersama untuk layar admin: skeleton, pesan galat dengan "Coba lagi",
// pull-to-refresh, muat otomatis saat mencapai ujung, dan penanda "semua sudah tampil".
export function ListaBerhalaman<T extends { id: string }>({
  q,
  renderItem,
  kepala,
  kosong,
  labelMemuat,
  kunciSegar,
  pesanGagalMuat,
}: ListaBerhalamanProps<T>) {
  const klien = useQueryClient();
  const [menyegarkan, setMenyegarkan] = useState(false);

  // Fokus pertama dilewati karena kueri sudah berjalan sendiri saat layar dibuka.
  const pertama = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (pertama.current) {
        pertama.current = false;
        return;
      }
      void klien.invalidateQueries({ queryKey: kunciSegar });
    }, [klien, kunciSegar]),
  );

  const tarikSegar = async () => {
    setMenyegarkan(true);
    try {
      await q.refetch();
    } finally {
      setMenyegarkan(false);
    }
  };

  let isiKosong: ReactElement;
  if (q.isPending) {
    isiKosong = (
      <View accessibilityLabel={labelMemuat} accessibilityLiveRegion="polite" style={styles.gap}>
        {[0, 1, 2, 3].map((i) => (
          <Card key={i} style={styles.kerangka}>
            <Skeleton style={styles.kerangkaJudul} />
            <Skeleton style={styles.kerangkaInfo} />
          </Card>
        ))}
      </View>
    );
  } else if (q.isError && !q.data) {
    isiKosong = (
      <View style={styles.gap}>
        <Banner message={pesanGalat(q.error, pesanGagalMuat)} />
        <Button title="Coba lagi" variant="secondary" onPress={() => void q.refetch()} />
      </View>
    );
  } else {
    isiKosong = kosong;
  }

  const kaki = q.isFetchNextPageError ? (
    <View style={styles.gap}>
      <Banner message="Data berikutnya belum bisa dimuat." />
      <Button title="Muat lagi" variant="secondary" onPress={() => void q.fetchNextPage()} />
    </View>
  ) : q.isFetchingNextPage ? (
    <View accessibilityLabel="Memuat data berikutnya" style={styles.kaki}>
      <ActivityIndicator color={colors.primary} />
    </View>
  ) : q.hasNextPage ? null : (q.data?.length ?? 0) > 0 ? (
    <Text style={styles.akhir}>
      <Ionicons name="checkmark-circle-outline" size={14} color={colors.textMuted} /> Semua data
      sudah tampil
    </Text>
  ) : null;

  return (
    <FlatList
      data={q.isPending ? [] : (q.data ?? [])}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => renderItem(item)}
      ListHeaderComponent={kepala}
      ListEmptyComponent={isiKosong}
      ListFooterComponent={kaki}
      contentContainerStyle={styles.isi}
      ItemSeparatorComponent={Pemisah}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      onEndReachedThreshold={0.5}
      onEndReached={() => {
        if (q.hasNextPage && !q.isFetchingNextPage && !q.isFetchNextPageError) {
          void q.fetchNextPage();
        }
      }}
      refreshControl={
        <RefreshControl
          refreshing={menyegarkan}
          onRefresh={() => void tarikSegar()}
          colors={[colors.primary]}
          tintColor={colors.primary}
        />
      }
      style={q.isPlaceholderData ? styles.menunggu : undefined}
    />
  );
}

function Pemisah() {
  return <View style={styles.pemisah} />;
}

const styles = StyleSheet.create({
  isi: { padding: spacing.lg, flexGrow: 1 },
  gap: { gap: spacing.md },
  pemisah: { height: spacing.md },
  kaki: { paddingVertical: spacing.lg },
  akhir: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
  menunggu: { opacity: 0.6 },
  kerangka: { gap: spacing.sm },
  kerangkaJudul: { height: 18, width: '60%' },
  kerangkaInfo: { height: 14, width: '40%' },
});
```

Penjelasan: komponen daftar berhalaman generik untuk tiga layar admin. Ia menerima hasil `useInfiniteQuery` dan merender: skeleton saat memuat, banner galat dengan **Coba lagi**, keadaan kosong, tarik-untuk-segarkan, muat 20 baris berikutnya saat mendekati ujung (dengan **Muat lagi** bila halaman berikutnya gagal), dan penanda "Semua data sudah tampil". Prop `kepala` (kolom cari dan chip) dan `kosong` bertipe elemen, **bukan** fungsi komponen, supaya kolom cari tidak dibuat ulang tiap daftar berubah (keyboard tidak menutup).

---

## 10. Tugas 8.3 sampai 8.6: layar admin

### 10.1 `src/features/admin/StatistikAdmin.tsx` (tugas 8.3)

**Berkas:** `src/features/admin/StatistikAdmin.tsx` (berkas baru: buat)

```tsx
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState, type ComponentProps } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Banner, Button, Card, Skeleton } from '@/components';
import { colors, radius, spacing, typography } from '@/theme';

import { formatAngka, formatUkuran } from './daftar';
import { pesanGalat } from './galat';
import { useStatistik } from './hooks';

type NamaIkon = ComponentProps<typeof Ionicons>['name'];

function KartuAngka({
  ikon,
  label,
  nilai,
  catatan,
}: {
  ikon: NamaIkon;
  label: string;
  nilai: string;
  catatan?: string;
}) {
  return (
    <Card accessible style={styles.kartuAngka} accessibilityLabel={`${label}: ${nilai}`}>
      <View style={styles.ikon}>
        <Ionicons name={ikon} size={20} color={colors.primary} />
      </View>
      <Text style={styles.nilai}>{nilai}</Text>
      <Text style={styles.label}>{label}</Text>
      {catatan ? <Text style={styles.catatan}>{catatan}</Text> : null}
    </Card>
  );
}

function PintasanAdmin({
  ikon,
  judul,
  deskripsi,
  onPress,
}: {
  ikon: NamaIkon;
  judul: string;
  deskripsi: string;
  onPress: () => void;
}) {
  return (
    <Card onPress={onPress} accessibilityLabel={judul} style={styles.pintasan}>
      <View style={styles.ikon}>
        <Ionicons name={ikon} size={20} color={colors.primary} />
      </View>
      <View style={styles.teksPintasan}>
        <Text style={styles.judulPintasan}>{judul}</Text>
        <Text style={styles.deskripsi}>{deskripsi}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
    </Card>
  );
}

// Layar utama panel admin (tugas 8.3): angka ringkasan dan pintasan ke tiga layar kelola.
export function StatistikAdmin({ adminId }: { adminId: string }) {
  const router = useRouter();
  const q = useStatistik(adminId);
  const [menyegarkan, setMenyegarkan] = useState(false);

  const tarikSegar = async () => {
    setMenyegarkan(true);
    try {
      await q.refetch();
    } finally {
      setMenyegarkan(false);
    }
  };

  let ringkasan;
  if (q.isPending) {
    ringkasan = (
      <View
        accessibilityLabel="Memuat statistik"
        accessibilityLiveRegion="polite"
        style={styles.grid}
      >
        {[0, 1, 2, 3].map((i) => (
          <Card key={i} style={styles.kartuAngka}>
            <Skeleton style={styles.kerangkaNilai} />
            <Skeleton style={styles.kerangkaLabel} />
          </Card>
        ))}
      </View>
    );
  } else if (q.isError) {
    ringkasan = (
      <View style={styles.gap}>
        <Banner message={pesanGalat(q.error, 'Statistik belum bisa dimuat.')} />
        <Button title="Coba lagi" variant="secondary" onPress={() => void q.refetch()} />
      </View>
    );
  } else {
    const s = q.data;
    ringkasan = (
      <View style={styles.grid}>
        <KartuAngka
          ikon="people-outline"
          label="Pengguna"
          nilai={formatAngka(s.penggunaTotal)}
          catatan={`${formatAngka(s.penggunaAktif)} aktif`}
        />
        <KartuAngka
          ikon="document-text-outline"
          label="Dokumen"
          nilai={formatAngka(s.dokumenTotal)}
        />
        <KartuAngka ikon="images-outline" label="Halaman" nilai={formatAngka(s.halamanTotal)} />
        <KartuAngka
          ikon="cloud-outline"
          label="Penyimpanan"
          nilai={formatUkuran(s.ukuranByte)}
          catatan="Total ukuran semua halaman"
        />
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.isi}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={menyegarkan}
          onRefresh={() => void tarikSegar()}
          colors={[colors.primary]}
          tintColor={colors.primary}
        />
      }
    >
      <Text accessibilityRole="header" style={styles.bagian}>
        Ringkasan
      </Text>
      {ringkasan}

      <Text accessibilityRole="header" style={styles.bagian}>
        Kelola
      </Text>
      <PintasanAdmin
        ikon="people-outline"
        judul="Pengguna"
        deskripsi="Cari, nonaktifkan, aktifkan, atau hapus akun."
        onPress={() => router.push('/admin/pengguna')}
      />
      <PintasanAdmin
        ikon="folder-open-outline"
        judul="Dokumen"
        deskripsi="Tinjau semua dokumen dari seluruh pengguna."
        onPress={() => router.push('/admin/dokumen')}
      />
      <PintasanAdmin
        ikon="time-outline"
        judul="Log aktivitas"
        deskripsi="Riwayat aksi admin, bisa disaring."
        onPress={() => router.push('/admin/log')}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  isi: { padding: spacing.lg, gap: spacing.md },
  gap: { gap: spacing.md },
  bagian: { ...typography.heading, color: colors.text, marginTop: spacing.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  kartuAngka: { flexGrow: 1, flexBasis: '45%', minWidth: 140 },
  ikon: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nilai: { ...typography.title, color: colors.text },
  label: { ...typography.bodyStrong, color: colors.text },
  catatan: { ...typography.caption, color: colors.textMuted },
  pintasan: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  teksPintasan: { flex: 1, gap: 2 },
  judulPintasan: { ...typography.bodyStrong, color: colors.text },
  deskripsi: { ...typography.caption, color: colors.textMuted },
  kerangkaNilai: { height: 30, width: '50%' },
  kerangkaLabel: { height: 14, width: '60%' },
});
```

Penjelasan: empat kartu angka (pengguna dengan jumlah yang aktif, dokumen, halaman, ukuran penyimpanan), skeleton saat memuat, banner galat dengan **Coba lagi**, dan tiga pintasan ke layar kelola. Angkanya dari `admin_statistik` (satu panggilan).

### 10.2 `src/features/admin/DaftarPengguna.tsx` (tugas 8.4)

**Berkas:** `src/features/admin/DaftarPengguna.tsx` (berkas baru: buat)

```tsx
import { StyleSheet, Text, View } from 'react-native';
import { useState } from 'react';

import { Banner, Button, Card, Chip, Dialog, EmptyState, TextField } from '@/components';
import { formatTanggal } from '@/features/dokumen/daftar';
import { useDebouncedValue } from '@/features/editor';
import { colors, minTouchSize, radius, spacing, typography } from '@/theme';

import {
  FILTER_AKTIF,
  LABEL_FILTER_AKTIF,
  cocokKonfirmasi,
  inisial,
  kataKonfirmasi,
  labelDokumen,
  namaTampil,
  type FilterAktif,
} from './daftar';
import { pesanGalat } from './galat';
import { kunciAdmin, useDaftarPengguna, useHapusPengguna, useUbahStatusPengguna } from './hooks';
import { ListaBerhalaman } from './ListaBerhalaman';
import type { PenggunaAdmin } from './skema';

const JEDA_CARI_MS = 400;

type Tindakan = { jenis: 'status' | 'hapus'; pengguna: PenggunaAdmin };

function Lencana({ teks, tone }: { teks: string; tone: 'netral' | 'bahaya' }) {
  return (
    <View style={[styles.lencana, tone === 'bahaya' ? styles.lencanaBahaya : styles.lencanaNetral]}>
      <Text
        style={[styles.lencanaTeks, { color: tone === 'bahaya' ? colors.danger : colors.primary }]}
      >
        {teks}
      </Text>
    </View>
  );
}

function KartuPengguna({
  pengguna,
  diriSendiri,
  onStatus,
  onHapus,
}: {
  pengguna: PenggunaAdmin;
  diriSendiri: boolean;
  onStatus: () => void;
  onHapus: () => void;
}) {
  const admin = pengguna.role === 'admin';
  return (
    <Card>
      <View role="group" aria-label={`Pengguna ${namaTampil(pengguna)}`} style={styles.kelompok}>
        <View style={styles.baris}>
          <View style={styles.avatar}>
            <Text style={styles.avatarTeks}>{inisial(pengguna)}</Text>
          </View>
          <View style={styles.identitas}>
            <Text numberOfLines={1} style={styles.nama}>
              {namaTampil(pengguna)}
            </Text>
            {pengguna.email ? (
              <Text numberOfLines={1} style={styles.info}>
                {pengguna.email}
              </Text>
            ) : null}
            <Text style={styles.info}>
              {labelDokumen(pengguna.jumlahDokumen)} · bergabung{' '}
              {formatTanggal(pengguna.dibuatPada)}
            </Text>
          </View>
        </View>
        <View style={styles.lencanaBaris}>
          {admin ? <Lencana teks="Admin" tone="netral" /> : null}
          {diriSendiri ? <Lencana teks="Akunmu" tone="netral" /> : null}
          {!pengguna.isAktif ? <Lencana teks="Nonaktif" tone="bahaya" /> : null}
        </View>
        {admin ? (
          <Text style={styles.info}>Akun admin tidak bisa diubah dari aplikasi.</Text>
        ) : (
          <View style={styles.aksi}>
            <Button
              title={pengguna.isAktif ? 'Nonaktifkan' : 'Aktifkan'}
              variant="secondary"
              onPress={onStatus}
            />
            <Button title="Hapus akun" variant="danger" onPress={onHapus} />
          </View>
        )}
      </View>
    </Card>
  );
}

// Kelola pengguna (tugas 8.4): daftar, pencarian nama/email, filter aktif/nonaktif, nonaktifkan
// atau aktifkan akun, dan hapus akun dengan konfirmasi mengetik email.
export function DaftarPengguna({ adminId }: { adminId: string }) {
  const [input, setInput] = useState('');
  const [filter, setFilter] = useState<FilterAktif>('semua');
  const kata = useDebouncedValue(input, JEDA_CARI_MS).trim();
  const q = useDaftarPengguna(adminId, filter, kata);
  const ubah = useUbahStatusPengguna(adminId);
  const hapus = useHapusPengguna(adminId);

  const [tindakan, setTindakan] = useState<Tindakan | null>(null);
  const [ketik, setKetik] = useState('');
  const [kabar, setKabar] = useState<string | null>(null);

  const adaPenyaring = filter !== 'semua' || kata !== '';

  const buka = (jenis: Tindakan['jenis'], pengguna: PenggunaAdmin) => {
    ubah.reset();
    hapus.reset();
    setKetik('');
    setTindakan({ jenis, pengguna });
  };
  const tutup = () => setTindakan(null);

  const konfirmasi = () => {
    if (!tindakan) return;
    const { jenis, pengguna } = tindakan;
    const nama = namaTampil(pengguna);
    if (jenis === 'status') {
      const aktif = !pengguna.isAktif;
      ubah.mutate(
        { userId: pengguna.id, aktif },
        {
          onSuccess: () => {
            setKabar(`Akun ${nama} ${aktif ? 'diaktifkan' : 'dinonaktifkan'}.`);
            tutup();
          },
        },
      );
    } else {
      hapus.mutate(pengguna.id, {
        onSuccess: (hasil) => {
          setKabar(`Akun ${nama} dihapus (${hasil.dokumen} dokumen, ${hasil.file} file).`);
          tutup();
        },
      });
    }
  };

  const kepala = (
    <View style={styles.kepala}>
      {kabar ? <Banner variant="info" message={kabar} /> : null}
      <TextField
        label="Cari pengguna"
        placeholder="Nama atau email"
        value={input}
        onChangeText={setInput}
        returnKeyType="search"
        autoCorrect={false}
        autoCapitalize="none"
        maxLength={100}
      />
      <View style={styles.chip}>
        {FILTER_AKTIF.map((nilai) => (
          <Chip
            key={nilai}
            label={LABEL_FILTER_AKTIF[nilai]}
            selected={filter === nilai}
            onPress={() => setFilter(nilai)}
          />
        ))}
      </View>
    </View>
  );

  const kosong = adaPenyaring ? (
    <EmptyState
      icon="search-outline"
      title="Tidak ada pengguna yang cocok"
      description="Coba kata kunci lain atau ubah filternya."
      actionLabel="Hapus pencarian dan filter"
      onAction={() => {
        setInput('');
        setFilter('semua');
      }}
    />
  ) : (
    <EmptyState
      icon="people-outline"
      title="Belum ada pengguna"
      description="Akun yang mendaftar akan muncul di sini."
    />
  );

  const sasaran = tindakan?.pengguna;
  const statusDialog = tindakan?.jenis === 'status' && sasaran;
  const hapusDialog = tindakan?.jenis === 'hapus' && sasaran;
  const nonaktifkan = statusDialog ? sasaran.isAktif : false;

  return (
    <>
      <ListaBerhalaman
        q={q}
        kepala={kepala}
        kosong={kosong}
        labelMemuat="Memuat pengguna"
        pesanGagalMuat="Daftar pengguna belum bisa dimuat."
        kunciSegar={kunciAdmin.semua(adminId)}
        renderItem={(p) => (
          <KartuPengguna
            pengguna={p}
            diriSendiri={p.id === adminId}
            onStatus={() => buka('status', p)}
            onHapus={() => buka('hapus', p)}
          />
        )}
      />

      <Dialog
        visible={Boolean(statusDialog)}
        title={nonaktifkan ? 'Nonaktifkan akun ini?' : 'Aktifkan akun ini?'}
        message={
          sasaran
            ? nonaktifkan
              ? `${namaTampil(sasaran)} tidak akan bisa membuka atau mengubah dokumennya sampai kamu mengaktifkannya lagi. Dokumennya tidak dihapus.`
              : `${namaTampil(sasaran)} akan bisa memakai aplikasinya lagi.`
            : undefined
        }
        confirmLabel={nonaktifkan ? 'Nonaktifkan' : 'Aktifkan'}
        destructive={nonaktifkan}
        onConfirm={konfirmasi}
        onCancel={tutup}
        busy={ubah.isPending}
        error={ubah.isError ? pesanGalat(ubah.error) : null}
      />

      <Dialog
        visible={Boolean(hapusDialog)}
        title="Hapus akun ini?"
        message={
          sasaran
            ? `Akun ${namaTampil(sasaran)} beserta ${labelDokumen(sasaran.jumlahDokumen)} dan semua filenya di penyimpanan akan dihapus permanen. Tindakan ini tidak bisa dibatalkan.`
            : undefined
        }
        confirmLabel="Hapus akun"
        destructive
        onConfirm={konfirmasi}
        onCancel={tutup}
        busy={hapus.isPending}
        confirmDisabled={!sasaran || !cocokKonfirmasi(ketik, sasaran)}
        error={hapus.isError ? pesanGalat(hapus.error) : null}
      >
        {sasaran ? (
          <TextField
            label={`Ketik ${kataKonfirmasi(sasaran)} untuk mengonfirmasi`}
            value={ketik}
            onChangeText={setKetik}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="done"
          />
        ) : null}
      </Dialog>
    </>
  );
}

const styles = StyleSheet.create({
  kepala: { gap: spacing.lg, marginBottom: spacing.lg },
  chip: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  kelompok: { gap: spacing.sm },
  baris: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: {
    width: minTouchSize,
    height: minTouchSize,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarTeks: { ...typography.heading, color: colors.primary },
  identitas: { flex: 1 },
  nama: { ...typography.bodyStrong, color: colors.text },
  info: { ...typography.caption, color: colors.textMuted },
  lencanaBaris: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  lencana: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.pill },
  lencanaNetral: { backgroundColor: colors.primarySoft },
  lencanaBahaya: { backgroundColor: colors.dangerSoft },
  lencanaTeks: { ...typography.caption },
  aksi: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
```

Penjelasan, bagian yang penting:

- Kartu pengguna menampilkan nama, email, jumlah dokumen, tanggal bergabung, dan lencana **Admin**, **Akunmu**, **Nonaktif**. Akun admin **tidak** menampilkan tombol aksi ("Akun admin tidak bisa diubah dari aplikasi"; function juga menolak, jadi dua lapis, K52).
- Pencarian ditunda 400 ms; chip **Semua / Aktif / Nonaktif**.
- **Nonaktifkan** meminta konfirmasi dengan teks yang menjelaskan akibatnya; **Aktifkan** juga.
- **Hapus akun** membuka dialog dengan kolom ketik: tombol **Hapus akun** baru menyala bila yang diketik cocok dengan email akun (K53). Galat apa pun tampil **di dalam dialog** sehingga bisa diulang.

### 10.3 `src/features/admin/DaftarDokumenAdmin.tsx` (tugas 8.5)

**Berkas:** `src/features/admin/DaftarDokumenAdmin.tsx` (berkas baru: buat)

```tsx
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Card, Chip, EmptyState, TextField } from '@/components';
import {
  FILTER_STATUS,
  LABEL_FILTER,
  LABEL_STATUS,
  formatTanggal,
  labelHalaman,
  type FilterStatus,
} from '@/features/dokumen/daftar';
import { urlMini } from '@/features/dokumen/gambar';
import { LabelStatus } from '@/features/dokumen/KartuDokumen';
import { useDebouncedValue } from '@/features/editor';
import { colors, radius, spacing, typography } from '@/theme';

import { namaTampil } from './daftar';
import { kunciAdmin, useDaftarDokumenAdmin } from './hooks';
import { ListaBerhalaman } from './ListaBerhalaman';
import type { DokumenAdmin } from './skema';

const SISI_MINI = 72;
const JEDA_CARI_MS = 400;

function KartuDokumenAdmin({ dokumen, onPress }: { dokumen: DokumenAdmin; onPress: () => void }) {
  const mini = dokumen.urlSampul ? (urlMini(dokumen.urlSampul) ?? dokumen.urlSampul) : null;
  const pemilik = namaTampil({ nama: dokumen.namaPemilik, email: dokumen.emailPemilik });
  return (
    <Card
      onPress={onPress}
      accessibilityLabel={`${dokumen.judul}, milik ${pemilik}, ${LABEL_STATUS[dokumen.status]}, ${labelHalaman(dokumen.jumlahHalaman)}`}
      style={styles.kartu}
    >
      {mini ? (
        <Image
          source={{ uri: mini }}
          contentFit="cover"
          transition={150}
          accessibilityLabel={`Sampul ${dokumen.judul}`}
          style={styles.mini}
        />
      ) : (
        <View style={[styles.mini, styles.miniKosong]}>
          <Ionicons name="document-outline" size={28} color={colors.textMuted} />
        </View>
      )}
      <View style={styles.teks}>
        <Text numberOfLines={2} style={styles.judul}>
          {dokumen.judul}
        </Text>
        <Text numberOfLines={1} style={styles.info}>
          Milik {pemilik}
        </Text>
        <Text style={styles.info}>
          {labelHalaman(dokumen.jumlahHalaman)} · {formatTanggal(dokumen.dibuatPada)}
        </Text>
        <LabelStatus status={dokumen.status} />
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
    </Card>
  );
}

// Tinjau dokumen (tugas 8.5): semua dokumen dari semua pengguna, dicari berdasarkan judul atau
// pemilik, disaring menurut status. Menyentuh kartu membuka layar detail (lihat dan hapus).
export function DaftarDokumenAdmin({ adminId }: { adminId: string }) {
  const router = useRouter();
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<FilterStatus>('semua');
  const kata = useDebouncedValue(input, JEDA_CARI_MS).trim();
  const q = useDaftarDokumenAdmin(adminId, status, kata);
  const adaPenyaring = status !== 'semua' || kata !== '';

  const kepala = (
    <View style={styles.kepala}>
      <TextField
        label="Cari dokumen"
        placeholder="Judul, nama, atau email pemilik"
        value={input}
        onChangeText={setInput}
        returnKeyType="search"
        autoCorrect={false}
        autoCapitalize="none"
        maxLength={100}
      />
      <View style={styles.chip}>
        {FILTER_STATUS.map((nilai) => (
          <Chip
            key={nilai}
            label={LABEL_FILTER[nilai]}
            selected={status === nilai}
            onPress={() => setStatus(nilai)}
          />
        ))}
      </View>
    </View>
  );

  const kosong = adaPenyaring ? (
    <EmptyState
      icon="search-outline"
      title="Tidak ada dokumen yang cocok"
      description="Coba kata kunci lain atau ubah filter statusnya."
      actionLabel="Hapus pencarian dan filter"
      onAction={() => {
        setInput('');
        setStatus('semua');
      }}
    />
  ) : (
    <EmptyState
      icon="document-text-outline"
      title="Belum ada dokumen"
      description="Dokumen yang dibuat pengguna akan muncul di sini."
    />
  );

  return (
    <ListaBerhalaman
      q={q}
      kepala={kepala}
      kosong={kosong}
      labelMemuat="Memuat dokumen"
      pesanGagalMuat="Daftar dokumen belum bisa dimuat."
      kunciSegar={kunciAdmin.semua(adminId)}
      renderItem={(d) => (
        <KartuDokumenAdmin
          dokumen={d}
          onPress={() => router.push({ pathname: '/admin/dokumen/[id]', params: { id: d.id } })}
        />
      )}
    />
  );
}

const styles = StyleSheet.create({
  kepala: { gap: spacing.lg, marginBottom: spacing.lg },
  chip: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  kartu: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
  mini: { width: SISI_MINI, height: SISI_MINI, borderRadius: radius.md },
  miniKosong: {
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  teks: { flex: 1, gap: spacing.xs, alignItems: 'flex-start' },
  judul: { ...typography.bodyStrong, color: colors.text },
  info: { ...typography.caption, color: colors.textMuted },
});
```

### 10.4 `src/features/admin/DetailDokumenAdmin.tsx` (tugas 8.5)

**Berkas:** `src/features/admin/DetailDokumenAdmin.tsx` (berkas baru: buat)

```tsx
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Banner, Button, Dialog, EmptyState, Screen, Skeleton } from '@/components';
import { formatTanggal, labelHalaman } from '@/features/dokumen/daftar';
import { LabelStatus } from '@/features/dokumen/KartuDokumen';
import { PagerHalaman } from '@/features/dokumen/PagerHalaman';
import { colors, radius, spacing, typography } from '@/theme';

import { namaTampil } from './daftar';
import { pesanGalat } from './galat';
import { useDetailDokumenAdmin, useHapusDokumenAdmin } from './hooks';

// Lihat dan hapus satu dokumen milik siapa pun (tugas 8.5). Admin hanya membaca: tidak ada
// ganti nama atau editor di sini; satu-satunya perubahan adalah menghapus lewat Edge Function.
export function DetailDokumenAdmin({ adminId, dokumenId }: { adminId: string; dokumenId: string }) {
  const router = useRouter();
  const q = useDetailDokumenAdmin(adminId, dokumenId);
  const hapus = useHapusDokumenAdmin(adminId);
  const [dialog, setDialog] = useState(false);

  const keluar = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/admin/dokumen');
  };

  if (q.isPending) {
    return (
      <Screen edges={['bottom']}>
        <View
          accessibilityLabel="Memuat dokumen"
          accessibilityLiveRegion="polite"
          style={styles.gap}
        >
          <Skeleton style={styles.kerangkaJudul} />
          <Skeleton style={styles.kerangkaInfo} />
          <Skeleton style={styles.kerangkaHalaman} />
        </View>
      </Screen>
    );
  }
  if (q.isError) {
    const hilang = (q.error as { kind?: string }).kind === 'tidakada';
    return (
      <Screen edges={['bottom']}>
        {hilang ? (
          <EmptyState
            icon="document-outline"
            title="Dokumen tidak ditemukan"
            description="Dokumen ini mungkin sudah dihapus."
            actionLabel="Kembali"
            onAction={keluar}
          />
        ) : (
          <View style={styles.gap}>
            <Banner message={pesanGalat(q.error, 'Dokumen belum bisa dimuat.')} />
            <Button title="Coba lagi" variant="secondary" onPress={() => void q.refetch()} />
          </View>
        )}
      </Screen>
    );
  }

  const dokumen = q.data;
  const jumlah = dokumen.halaman.length;
  const pemilik = dokumen.pemilik ? namaTampil(dokumen.pemilik) : 'pemilik tidak dikenal';

  const konfirmasi = () => {
    hapus.mutate(dokumenId, {
      onSuccess: () => {
        setDialog(false);
        keluar();
      },
    });
  };

  return (
    <Screen scroll edges={['bottom']}>
      <View style={styles.atas}>
        <Text accessibilityRole="header" style={styles.judul}>
          {dokumen.judul}
        </Text>
        <Text style={styles.info}>
          Milik {pemilik}
          {dokumen.pemilik?.email && dokumen.pemilik.nama ? ` (${dokumen.pemilik.email})` : ''}
        </Text>
        <Text style={styles.info}>
          {labelHalaman(jumlah)} · {formatTanggal(dokumen.dibuatPada)}
        </Text>
        <LabelStatus status={dokumen.status} />
      </View>

      {jumlah === 0 ? (
        <EmptyState
          icon="images-outline"
          title="Belum ada halaman"
          description="Dokumen ini belum punya halaman tersimpan."
        />
      ) : (
        <PagerHalaman halaman={dokumen.halaman} judul={dokumen.judul} />
      )}

      <View style={styles.aksi}>
        <Button
          title="Hapus dokumen"
          variant="danger"
          onPress={() => {
            hapus.reset();
            setDialog(true);
          }}
        />
      </View>

      <Dialog
        visible={dialog}
        title="Hapus dokumen ini?"
        message={`"${dokumen.judul}" milik ${pemilik} beserta ${labelHalaman(jumlah)}-nya akan dihapus permanen, termasuk file di penyimpanan. Aksi ini dicatat di log aktivitas dan tidak bisa dibatalkan.`}
        confirmLabel="Hapus"
        destructive
        onConfirm={konfirmasi}
        onCancel={() => setDialog(false)}
        busy={hapus.isPending}
        error={hapus.isError ? pesanGalat(hapus.error) : null}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  gap: { gap: spacing.md },
  atas: { gap: spacing.xs, alignItems: 'flex-start' },
  judul: { ...typography.heading, color: colors.text },
  info: { ...typography.caption, color: colors.textMuted },
  aksi: { flexDirection: 'row', justifyContent: 'center' },
  kerangkaJudul: { height: 24, width: '60%' },
  kerangkaInfo: { height: 16, width: '40%' },
  kerangkaHalaman: { height: 360, borderRadius: radius.lg },
});
```

Penjelasan: daftar dokumen admin mirip Dashboard (gambar mini, judul, status, jumlah halaman) tetapi memuat **semua pemilik** dan menambahkan nama dan email pemilik; pencarian mencakup judul, nama, dan email pemilik. Detail membaca satu dokumen lewat tabel dan RLS admin (hak baca admin dari Fase 2), memakai `PagerHalaman`, dan tombol **Hapus dokumen** memanggil `admin-delete-document` setelah dialog konfirmasi.

### 10.5 `src/features/admin/DaftarLog.tsx` (tugas 8.6)

**Berkas:** `src/features/admin/DaftarLog.tsx` (berkas baru: buat)

```tsx
import { Ionicons } from '@expo/vector-icons';
import { useState, type ComponentProps } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Card, Chip, EmptyState } from '@/components';
import { colors, radius, spacing, typography } from '@/theme';

import { LABEL_AKSI, URUTAN_AKSI, formatWaktu, namaTampil, type AksiLog } from './daftar';
import { kunciAdmin, useDaftarAdmin, useDaftarLog } from './hooks';
import { ListaBerhalaman } from './ListaBerhalaman';
import type { LogAdmin } from './skema';

const IKON: Record<AksiLog, ComponentProps<typeof Ionicons>['name']> = {
  nonaktifkan_akun: 'ban-outline',
  aktifkan_akun: 'checkmark-circle-outline',
  hapus_akun: 'person-remove-outline',
  hapus_dokumen: 'trash-outline',
};

function BarisLog({ log }: { log: LogAdmin }) {
  const oleh =
    log.adminId === null
      ? 'akun admin sudah dihapus'
      : namaTampil({ nama: log.namaAdmin, email: log.emailAdmin }, 'admin');
  return (
    <Card
      accessible
      accessibilityLabel={`${LABEL_AKSI[log.aksi]}, oleh ${oleh}, ${formatWaktu(log.waktu)}`}
      style={styles.baris}
    >
      <View style={styles.ikon}>
        <Ionicons name={IKON[log.aksi]} size={20} color={colors.primary} />
      </View>
      <View style={styles.teks}>
        <Text style={styles.aksi}>{LABEL_AKSI[log.aksi]}</Text>
        {log.keterangan ? <Text style={styles.keterangan}>{log.keterangan}</Text> : null}
        <Text style={styles.info}>
          Oleh {oleh} · {formatWaktu(log.waktu)}
        </Text>
      </View>
    </Card>
  );
}

// Log aktivitas (tugas 8.6): aksi admin terbaru lebih dulu, disaring menurut jenis aksi dan admin.
export function DaftarLog({ adminId }: { adminId: string }) {
  const [aksi, setAksi] = useState<AksiLog | null>(null);
  const [filterAdmin, setFilterAdmin] = useState<string | null>(null);
  const q = useDaftarLog(adminId, aksi, filterAdmin);
  const daftarAdmin = useDaftarAdmin(adminId);
  const adaPenyaring = aksi !== null || filterAdmin !== null;

  const kepala = (
    <View style={styles.kepala}>
      <Text style={styles.labelFilter}>Jenis aksi</Text>
      <View style={styles.chip}>
        <Chip label="Semua aksi" selected={aksi === null} onPress={() => setAksi(null)} />
        {URUTAN_AKSI.map((nilai) => (
          <Chip
            key={nilai}
            label={LABEL_AKSI[nilai]}
            selected={aksi === nilai}
            onPress={() => setAksi(nilai)}
          />
        ))}
      </View>
      {daftarAdmin.data && daftarAdmin.data.length > 0 ? (
        <>
          <Text style={styles.labelFilter}>Admin</Text>
          <View style={styles.chip}>
            <Chip
              label="Semua admin"
              selected={filterAdmin === null}
              onPress={() => setFilterAdmin(null)}
            />
            {daftarAdmin.data.map((a) => (
              <Chip
                key={a.id}
                label={namaTampil(a, 'Admin')}
                selected={filterAdmin === a.id}
                onPress={() => setFilterAdmin(a.id)}
              />
            ))}
          </View>
        </>
      ) : null}
    </View>
  );

  const kosong = adaPenyaring ? (
    <EmptyState
      icon="search-outline"
      title="Tidak ada log yang cocok"
      description="Coba ubah jenis aksi atau adminnya."
      actionLabel="Hapus filter"
      onAction={() => {
        setAksi(null);
        setFilterAdmin(null);
      }}
    />
  ) : (
    <EmptyState
      icon="time-outline"
      title="Belum ada aktivitas"
      description="Aksi admin seperti menonaktifkan akun atau menghapus dokumen akan tercatat di sini."
    />
  );

  return (
    <ListaBerhalaman
      q={q}
      kepala={kepala}
      kosong={kosong}
      labelMemuat="Memuat log aktivitas"
      pesanGagalMuat="Log aktivitas belum bisa dimuat."
      kunciSegar={kunciAdmin.semua(adminId)}
      renderItem={(log) => <BarisLog log={log} />}
    />
  );
}

const styles = StyleSheet.create({
  kepala: { gap: spacing.md, marginBottom: spacing.lg },
  labelFilter: { ...typography.bodyStrong, color: colors.text },
  chip: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  baris: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  ikon: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  teks: { flex: 1, gap: 2 },
  aksi: { ...typography.bodyStrong, color: colors.text },
  keterangan: { ...typography.body, color: colors.text },
  info: { ...typography.caption, color: colors.textMuted },
});
```

Penjelasan: setiap baris log menampilkan jenis aksi, keterangan, nama admin, dan waktu. Filter: chip **jenis aksi** (Semua aksi, Nonaktifkan akun, Aktifkan akun, Hapus akun, Hapus dokumen) dan chip **admin**. Aksi dari admin yang akunnya sudah dihapus tetap tampil, dengan keterangan "akun admin sudah dihapus" (kolom `admin_id` di log dibuat `on delete set null`, Fase 2). Nama chip: **Semua aksi** dan **Semua admin** mengosongkan filter.

### 10.6 `src/features/admin/index.ts`

**Berkas:** `src/features/admin/index.ts` (berkas baru: buat)

```ts
export { DaftarDokumenAdmin } from './DaftarDokumenAdmin';
export { DaftarLog } from './DaftarLog';
export { DaftarPengguna } from './DaftarPengguna';
export { DetailDokumenAdmin } from './DetailDokumenAdmin';
export { StatistikAdmin } from './StatistikAdmin';
```

### 10.7 Rute admin

Enam berkas rute. **Empat berkas lama dari Fase 3** (`_layout.tsx`, `index.tsx`, `pengguna.tsx`, `log.tsx`; ganti seluruh isinya) dan dua berkas baru di folder `app\admin\dokumen` (buat foldernya). Nama berkas bertanda kurung siku: beri tanda kutip bila membukanya dari terminal.

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
      <Stack.Screen name="dokumen/index" options={{ title: 'Dokumen' }} />
      <Stack.Screen name="dokumen/[id]" options={{ title: 'Detail dokumen' }} />
      <Stack.Screen name="log" options={{ title: 'Log aktivitas' }} />
    </Stack>
  );
}
```

**Berkas:** `app/admin/index.tsx` (berkas lama: ganti seluruh isinya)

```tsx
import { LoadingScreen, Screen } from '@/components';
import { StatistikAdmin } from '@/features/admin';
import { useAuth } from '@/features/auth';

export default function AdminDashboardScreen() {
  const { session } = useAuth();
  const adminId = session?.user.id;
  if (!adminId) return <LoadingScreen />;
  return (
    <Screen padded={false} edges={['bottom']}>
      <StatistikAdmin adminId={adminId} />
    </Screen>
  );
}
```

**Berkas:** `app/admin/pengguna.tsx` (berkas lama: ganti seluruh isinya)

```tsx
import { LoadingScreen, Screen } from '@/components';
import { DaftarPengguna } from '@/features/admin';
import { useAuth } from '@/features/auth';

export default function AdminPenggunaScreen() {
  const { session } = useAuth();
  const adminId = session?.user.id;
  if (!adminId) return <LoadingScreen />;
  return (
    <Screen padded={false} edges={['bottom']}>
      <DaftarPengguna adminId={adminId} />
    </Screen>
  );
}
```

**Berkas:** `app/admin/log.tsx` (berkas lama: ganti seluruh isinya)

```tsx
import { LoadingScreen, Screen } from '@/components';
import { DaftarLog } from '@/features/admin';
import { useAuth } from '@/features/auth';

export default function AdminLogScreen() {
  const { session } = useAuth();
  const adminId = session?.user.id;
  if (!adminId) return <LoadingScreen />;
  return (
    <Screen padded={false} edges={['bottom']}>
      <DaftarLog adminId={adminId} />
    </Screen>
  );
}
```

**Berkas:** `app/admin/dokumen/index.tsx` (berkas baru: buat)

```tsx
import { LoadingScreen, Screen } from '@/components';
import { DaftarDokumenAdmin } from '@/features/admin';
import { useAuth } from '@/features/auth';

export default function AdminDokumenScreen() {
  const { session } = useAuth();
  const adminId = session?.user.id;
  if (!adminId) return <LoadingScreen />;
  return (
    <Screen padded={false} edges={['bottom']}>
      <DaftarDokumenAdmin adminId={adminId} />
    </Screen>
  );
}
```

**Berkas:** `app/admin/dokumen/[id].tsx` (berkas baru: buat)

```tsx
import { useLocalSearchParams } from 'expo-router';

import { LoadingScreen } from '@/components';
import { DetailDokumenAdmin } from '@/features/admin';
import { useAuth } from '@/features/auth';

export default function AdminDokumenDetailScreen() {
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const { session } = useAuth();
  const adminId = session?.user.id;

  if (!adminId || !id) return <LoadingScreen />;
  // key: berpindah ke dokumen lain mengosongkan keadaan lokal (indeks halaman, dialog).
  return <DetailDokumenAdmin key={id} adminId={adminId} dokumenId={id} />;
}
```

Penjelasan: `_layout.tsx` adalah `Stack` dengan lima layar (`index`, `pengguna`, `dokumen/index`, `dokumen/[id]`, `log`). Penjagaan admin tetap di layout akar lewat `Stack.Protected` (Fase 3), jadi user biasa tidak bisa membuka rute admin meski mengetik alamatnya. Layar-layar rute hanya merakit komponen dari `src/features/admin`.

### 10.8 Hapus berkas rute lama

Rute `dokumen` kini berupa folder (`dokumen/index.tsx` dan `dokumen/[id].tsx`), jadi `app/admin/dokumen.tsx` yang lama **harus dihapus**, kalau tidak Expo Router melaporkan dua rute untuk `/admin/dokumen`:

```bash
del app\admin\dokumen.tsx
```

Kemudian hentikan Expo (Ctrl+C) dan mulai ulang dengan `npx expo start -c` agar tipe rute disegarkan.

---

## 11. Cek akhir kode

```bash
npm run typecheck
npm run lint
npm run format:check
npm run cek:kontras
npm test
```

Semuanya harus bersih (`npm test`: **127 lulus**). Bila `format:check` mengeluh, jalankan `npm run format` lalu ulangi.

Hal yang sering terlewat:

1. `tsconfig.json` dan `eslint.config.js` sudah diubah di 4.1 (tanpa itu `typecheck` mengeluh tentang impor `.ts` dan `Deno`).
2. `app/admin/dokumen.tsx` yang lama sudah dihapus (10.8).
3. Migrasi sudah diterapkan (3.3) dan keempat function sudah dideploy (7.3), sebelum menguji di HP.

---

## 12. Tugas 8.8: uji di HP, commit, pull request

### 12.1 Persiapan data uji

1. Akun admin-mu dan akun uji `uji8@contoh.com` (3.3) sudah ada.
2. **Isi akun uji dengan dokumen nyata.** Keluar dari akun admin, masuk sebagai `uji8@contoh.com`, scan **dua dokumen**: satu berisi 2 halaman dan satu berisi 1 halaman (Kamera, lalu simpan). Dokumen nyata diperlukan karena bukti utama Fase 8 adalah file Cloudinary ikut hilang. Setelah itu **keluar** dan masuk lagi sebagai admin.
3. Bila seed 55 dokumen Fase 7 belum kamu bersihkan, itu justru berguna: daftar dokumen admin akan berisi lebih dari 20 baris sehingga paginasinya teruji.
4. Salin dulu **URL salah satu halaman** akun uji (SQL Editor: `select p.dokumen_id, h.public_id, h.url_hasil from public.halaman_dokumen h join public.dokumen p on p.id = h.dokumen_id join public.profiles u on u.id = p.user_id where u.email = 'uji8@contoh.com';`). Kamu memerlukannya untuk membuktikan file hilang di 12.2 nomor 14.

### 12.2 Jalankan dan uji di HP

```bash
npx expo start -c
```

Buka di Expo Go (SDK 54). Kerjakan berurutan dan laporkan nomor yang gagal beserta pesan atau layarnya:

1. [ ] Masuk sebagai **akun uji** (bukan admin): kartu akun di Dashboard **tidak** punya tombol "Buka panel admin".
2. [ ] Masuk sebagai **admin**: ada tombol **Buka panel admin**; ketuk, layar **Panel admin** terbuka.
3. [ ] Statistik: skeleton sesaat, lalu empat angka. **Cocokkan dengan SQL** (SQL Editor): `select (select count(*) from public.profiles) as pengguna, (select count(*) from public.profiles where is_aktif) as aktif, (select count(*) from public.dokumen) as dokumen, (select count(*) from public.halaman_dokumen) as halaman, (select coalesce(sum(ukuran_byte),0) from public.halaman_dokumen) as byte;` Angkanya harus sama (ukuran dalam KB, MB, atau GB).
4. [ ] **Pengguna**: akunmu dan akun uji tampil, lengkap dengan **email** dan jumlah dokumen. Akunmu berlencana **Admin** dan **Akunmu**, tanpa tombol aksi.
5. [ ] Cari `uji8`: tersisa akun uji; cari `zzzz`: muncul "Tidak ada pengguna yang cocok". Chip **Aktif** dan **Nonaktif** menyaring sesuai.
6. [ ] **Nonaktifkan** akun uji: dialog menjelaskan akibatnya; **Batal** tidak mengubah apa pun; **Nonaktifkan** menutup dialog dan kartu berlencana **Nonaktif**.
7. [ ] **Log**: ada baris "Nonaktifkan akun" oleh namamu, dengan waktu baru saja.
8. [ ] Masuk (di HP yang sama, setelah keluar dari admin) sebagai **akun uji nonaktif**: dokumennya **tidak tampil** atau pesan izin muncul (sesi lama tidak dicabut, K55, tetapi data tidak terbaca). Catat apa yang terlihat persis.
9. [ ] Masuk lagi sebagai admin, **Aktifkan** akun uji: lencana Nonaktif hilang; log menambah baris "Aktifkan akun". Masuk sebagai akun uji: dokumennya kembali.
10. [ ] **Dokumen** (admin): daftar menampilkan dokumen **semua pengguna** dengan nama pemilik. Cari judul, nama pemilik, dan email pemilik. Bila seed Fase 7 ada: gulir menampilkan 20 lagi, di akhir tertulis penanda semua sudah tampil, tidak ada dokumen ganda.
11. [ ] Ketuk satu dokumen akun uji: detail terbuka; **geser** antar halaman dan penanda halaman ikut berubah.
12. [ ] **Hapus dokumen** (dokumen **1 halaman** milik akun uji): dialog menyebut judul dan pemilik; **Hapus** menutup dialog dan kembali ke daftar; dokumennya hilang. **Media Library** Cloudinary (folder `scannest`): file halaman itu **hilang**. Log menambah baris "Hapus dokumen".
13. [ ] **Hapus akun** (akun uji, yang masih punya dokumen 2 halaman): dialog menyebut nama, jumlah dokumen, dan bahwa file dihapus permanen; tombol **Hapus akun** **mati** sampai kamu mengetik `uji8@contoh.com` (huruf besar kecil tidak masalah); salah ketik tetap mati. Setelah cocok, tekan: dialog menutup dan akun hilang dari daftar.
14. [ ] **Buktikan hasilnya.** (a) Media Library: kedua file halaman dokumen itu **hilang**; (b) URL halaman yang kamu salin di 12.1 nomor 4 menghasilkan **404** di browser (cache CDN bisa bertahan beberapa menit; catat hasilnya); (c) Dashboard Supabase > **Authentication** > **Users**: akun `uji8@contoh.com` **tidak ada**; (d) SQL: `select count(*) from public.profiles where email = 'uji8@contoh.com';` hasilnya **0**, dan query dari 12.1 nomor 4 tidak mengembalikan baris lagi.
15. [ ] **Log**: ada baris "Hapus akun" dan "Hapus dokumen"; keterangan menyebut nama atau email target dan jumlah file. Filter chip **Hapus akun** menyaring hanya baris itu; filter **admin** bekerja; gabungan keduanya bekerja.
16. [ ] Cek log lewat SQL: `select waktu, aksi, keterangan from public.log_aktivitas order by waktu desc limit 10;` baris-barisnya sama dengan yang tampil di aplikasi.
17. [ ] Aktifkan **mode pesawat**, buka Pengguna lalu tarik layar: banner "Tidak bisa terhubung ke server" dan tombol **Coba lagi**; matikan mode pesawat, **Coba lagi** berhasil.
18. [ ] Lihat log function: Dashboard Supabase > **Edge Functions** > `admin-delete-user` > **Logs** (dan dua lainnya). Tidak ada galat tak terduga; bila ada baris "Gagal menghapus aset", salin pesannya kepadaku.
19. [ ] **Pantau Cloudinary (kuota):** buka Dashboard Cloudinary, lihat pemakaian penyimpanan dan transformasi; seharusnya turun setelah penghapusan. Laporkan angkanya.
20. [ ] Tab **Dashboard** akun admin hanya menampilkan dokumen **miliknya** (K47 Fase 7 tetap berlaku) dan hapus dokumen pribadi (Fase 7) masih bekerja.
21. [ ] Tidak ada layar merah atau peringatan kuning baru selama pengujian.

Bila seed Fase 7 masih ada, bersihkan dengan SQL pembersih di `docs/panduan-fase-7.md` bagian 9.1.

### 12.3 Commit dan pull request

```bash
git status
git add .
git status
```

Baca daftar berkas: yang berubah harus berada di `src/`, `app/`, `supabase/migrations/`, `supabase/functions/`, `supabase/tests/`, `tests/`, `tsconfig.json`, `eslint.config.js`, `ROADMAP.md`, dan `docs/`. **Tidak ada** `.env`, tidak ada berkas rahasia, `app/admin/dokumen.tsx` tampil sebagai **dihapus**, dan tidak ada berkas bernama aneh. Lalu:

```bash
git commit -m "feat(admin): panel admin, function admin, log aktivitas"
git push -u origin fase-8-admin
```

Buka pull request, tunggu **CI hijau**, **Merge**, lalu `git switch main` dan `git pull`. Centang tugas 8.0 sampai 8.8 di `ROADMAP.md` pada commit berikutnya.

---

## 13. Yang perlu diingat saat coding nanti

1. **Pemeriksaan admin harus pertama, selalu.** Function admin baru wajib memulai dengan `periksaAdmin` dan **baru** membuat klien secret key sesudahnya; fungsi database admin baru wajib memulai dengan `if not public.is_admin()`. Uji penolakan (3.3 dan 7.4) adalah cara memastikannya setiap kali menambah satu.
2. **Hapus dokumen dan akun hanya lewat function.** Aplikasi tidak pernah memanggil `supabase.from('dokumen').delete()`: itu meninggalkan file yatim di Cloudinary. Karena kini `service_role` yang menghapus lewat function admin, mencabut hak `delete` langsung milik pengguna pada tabel `dokumen` sudah bisa dikerjakan (B21, Fase 9).
3. **Secret key hanya di function.** `SUPABASE_SECRET_KEYS`, `CLOUDINARY_API_SECRET`, dan sejenisnya tidak pernah masuk `.env` aplikasi atau repo; semua `EXPO_PUBLIC_*` terbaca dari APK.
4. **Aksi admin = function + log.** Aksi baru (mis. mengubah peran, B28) mengikuti pola yang sama: function, pemeriksaan admin, sasaran terlarang, aksi, log setelahnya, dan satu nilai baru di `AksiLog` serta `LABEL_AKSI`.
5. **Nonaktif bukan "keluar paksa"** (K55): token berjalan tetap sah sampai kedaluwarsa. Mencabut sesi dicatat di B26.
6. **`supabase/functions/*/index.ts` dan `_shared/server.ts` dikecualikan dari `tsc` dan ESLint** (4.1). Bila mengubahnya, uji lewat `curl` (7.4) atau `deno check` bila Deno terpasang; `logic.ts` dan `_shared/admin.ts`, `_shared/cloudinary.ts` tetap lewat `npm test`.
7. **Akun admin pertama dan berikutnya dibuat lewat SQL** (`update public.profiles set role = 'admin' where email = 'EMAILMU@contoh.com';`), bukan dari aplikasi (B28).
8. **Gagal hapus akun setelah file hilang** menyisakan gambar rusak sampai hapus diulang (K53); tekan **Hapus akun** lagi, file yang sudah hilang dianggap beres.

---

## 14. Pemecahan masalah

| Gejala | Kemungkinan penyebab dan solusi |
|---|---|
| `db push`: `migration ... already exists` atau konflik riwayat | Jalankan `npx supabase migration list`; kirim keluarannya kepadaku sebelum memakai `repair`. |
| `db push` gagal pada `grant ... to service_role` | Jarang; kirim pesan galatnya kepadaku. Penyebab umum kalau proyekmu mengubah role. |
| Uji `admin_smoke.sql`: "Akun uji tidak ditemukan" | Email A atau B salah ketik, atau akun belum ada (3.3). |
| Uji `admin_smoke.sql` ada baris `GAGAL` | Kirim seluruh laporan kepadaku; jangan lanjut sebelum 0 gagal. |
| `typecheck`: `An import path can only end with a '.ts' extension when 'allowImportingTsExtensions' is enabled` (TS5097) | `tsconfig.json` belum diubah (4.1). |
| `typecheck`: `Cannot find name 'Deno'` atau `npm:...` di `_shared/server.ts` | Entri `exclude` untuk `_shared/server.ts` belum ditambahkan (4.1). |
| `lint`: galat di `supabase/functions/_shared/server.ts` | `ignores` di `eslint.config.js` belum diubah (4.1). |
| `npm test`: `Cannot find module ... _shared/admin.ts` | Berkas belum dibuat atau folder `_shared` salah nama (4.2 sampai 4.4). |
| `typecheck`: `Property 'accessible' does not exist` pada `Card` | `src/components/Card.tsx` belum diganti (9.1). |
| `typecheck`: `has no exported member` dari `@/features/admin` | `src/features/admin/index.ts` belum dibuat atau ada berkas yang terlewat (10.6). |
| Expo: dua rute `/admin/dokumen` atau layar admin tidak muncul | `app/admin/dokumen.tsx` lama belum dihapus (10.8); mulai ulang dengan `npx expo start -c`. |
| Deploy `delete-document` gagal: berkas `_shared` tidak ditemukan | Bundel `--use-api` tidak mengikuti impor relatif. **Berhenti dan kirim keluarannya kepadaku** (K54, 7.3). Function lama tetap jalan. |
| `curl` uji 1 mengembalikan 200 atau 403, bukan 401 | `verify_jwt` mati (deploy dengan `--no-verify-jwt`?). Deploy ulang tanpa flag itu. |
| `curl` uji 3 mengembalikan 500 "Server belum dikonfigurasi" | Secret Cloudinary belum ada (`npx supabase secrets list`), atau secret key Supabase tidak terbaca function; kirim log function kepadaku. Nilai rahasia **jangan** dikirim. |
| `curl` uji 3 mengembalikan 200 untuk akun uji | **Serius**: akun uji ternyata admin, atau pemeriksaan hilang. `select role from public.profiles where email = 'uji8@contoh.com';` harus `user`. Bila `user`, hentikan dan kirim keluarannya kepadaku. |
| `curl` uji 4 mengembalikan 403 `bukan_admin` untuk akun adminmu | `role` bukan `admin` atau `is_aktif` salah: `select role, is_aktif from public.profiles where email = 'EMAILMU@contoh.com';`. |
| Panel: "Akunmu tidak punya izin admin untuk melakukan ini." di layar admin | Migrasi belum diterapkan (3.3), atau akunmu bukan admin aktif. |
| Panel: kolom email kosong | Backfill belum berjalan; periksa `select email from public.profiles;` dan ulangi migrasi. |
| Panel: "Aksi sudah dijalankan, tetapi catatan log gagal ditulis" | Function berhasil mengubah data tetapi gagal menulis log (hak `insert` `service_role` pada `log_aktivitas` belum ada?). Periksa log function dan hak (bagian 4 migrasi). |
| Hapus akun: "Sebagian file belum bisa dihapus. Coba lagi; datanya tidak hilang." | Cloudinary menolak (kunci atau tanda tangan salah, atau gangguan). Lihat log function; akun masih utuh, ulangi setelah diperbaiki. |
| Hapus akun: tombol tetap mati | Teks yang diketik belum sama dengan email akun; spasi tepi tidak masalah, huruf besar kecil tidak masalah, tetapi isi harus persis sama. |
| Nonaktifkan: tidak ada baris log baru | Status akun sudah sama dengan yang diminta (tanpa log, K52). |
| Daftar menampilkan baris ganda atau tidak memuat lagi | Versi `hooks.ts` atau `ListaBerhalaman.tsx` lama; pastikan `gabungTanpaGanda` dipakai (8.2). |
| Kolom cari menutup keyboard tiap hasil berganti | `kepala` dibuat sebagai fungsi komponen, bukan elemen (9.4). |
| Detail dokumen Fase 7 berubah perilakunya | `DetailDokumen.tsx` belum diganti bersamaan dengan `PagerHalaman.tsx` (9.2 dan 9.3). |
| Nama berkas aneh muncul di `git status` | Kode tertempel ke terminal, bukan ke berkas. Hapus dengan `git rm` atau `del`; lihat `panduan-fase-1.md` bagian 3.0. |

---

## 15. Checklist akhir Fase 8

Sama dengan "Selesai bila" Fase 8 di `ROADMAP.md`.

- [ ] Fase 7 ditutup, cabang `fase-8-admin` siap (8.0)
- [ ] Migrasi diterapkan; `admin_smoke.sql` menunjukkan **10 lulus, 0 gagal**
- [ ] `delete-document` dan tiga function admin terpasang (Verify JWT menyala); `delete-document` masih berfungsi setelah refaktor (8.1)
- [ ] Uji `curl`: tanpa token dan token palsu **401**, user biasa **403 `bukan_admin`** di ketiga function, sasaran tidak ada **404**, diri sendiri **403 `target_dilarang`** (8.2, 8.7)
- [ ] Statistik cocok dengan SQL (8.3)
- [ ] Pengguna: cari, saring, nonaktifkan, aktifkan, hapus akun dengan konfirmasi ketik email; file Cloudinary dan akun benar-benar hilang (8.4)
- [ ] Dokumen: daftar semua pemilik, detail, hapus; file Cloudinary hilang (8.5)
- [ ] Log: setiap aksi tercatat; filter aksi dan admin bekerja (8.6)
- [ ] Tidak ada secret key atau API secret di aplikasi atau repo
- [ ] `typecheck`, `lint`, `format:check`, `cek:kontras`, `test` bersih; PR digabung dan CI hijau (8.8)

---

## 16. Daftar berkas Fase 8

| Berkas | Tugas | Status |
|---|---|---|
| `ROADMAP.md`, `docs/*.md` | 8.0 | diubah |
| `tsconfig.json`, `eslint.config.js` | 8.1 | diubah (impor `.ts`, kecualikan `_shared/server.ts`) |
| `supabase/migrations/20261025120000_admin_panel.sql` | 8.1, 8.3 sampai 8.6 | baru |
| `supabase/tests/admin_smoke.sql` | 8.7 | baru |
| `supabase/functions/_shared/cloudinary.ts` | 8.1 | baru |
| `supabase/functions/_shared/admin.ts` | 8.1, 8.2 | baru |
| `supabase/functions/_shared/server.ts` | 8.1, 8.2 | baru |
| `supabase/functions/delete-document/logic.ts` | 8.1 | diubah (memakai `_shared`) |
| `supabase/functions/admin-set-user-active/logic.ts`, `index.ts` | 8.1, 8.2 | baru |
| `supabase/functions/admin-delete-document/logic.ts`, `index.ts` | 8.1, 8.2 | baru |
| `supabase/functions/admin-delete-user/logic.ts`, `index.ts` | 8.1, 8.2 | baru |
| `tests/admin.test.mjs`, `tests/admin-app.test.mjs` | 8.2, 8.4 | baru |
| `src/features/admin/daftar.ts`, `galat.ts`, `skema.ts` | 8.3 sampai 8.6 | baru |
| `src/features/admin/api.ts`, `hooks.ts` | 8.3 sampai 8.6 | baru |
| `src/features/admin/ListaBerhalaman.tsx` | 8.4 sampai 8.6 | baru |
| `src/features/admin/StatistikAdmin.tsx` | 8.3 | baru |
| `src/features/admin/DaftarPengguna.tsx` | 8.4 | baru |
| `src/features/admin/DaftarDokumenAdmin.tsx`, `DetailDokumenAdmin.tsx` | 8.5 | baru |
| `src/features/admin/DaftarLog.tsx` | 8.6 | baru |
| `src/features/admin/index.ts` | 8.3 sampai 8.6 | baru |
| `src/features/dokumen/PagerHalaman.tsx` | 8.5 | baru |
| `src/features/dokumen/DetailDokumen.tsx` | 8.5 | diubah (memakai `PagerHalaman`) |
| `src/components/Card.tsx` | 8.4 | diubah (prop `accessible`) |
| `app/admin/_layout.tsx`, `index.tsx`, `pengguna.tsx`, `log.tsx` | 8.3, 8.4, 8.6 | diubah (dari placeholder) |
| `app/admin/dokumen/index.tsx`, `app/admin/dokumen/[id].tsx` | 8.5 | baru |
| `app/admin/dokumen.tsx` | 8.5 | **dihapus** |

---

## 17. Sumber (diakses 30 Oktober 2026)

- Supabase, migrasi ke kunci publishable dan secret (`SUPABASE_SECRET_KEYS`, `SUPABASE_PUBLISHABLE_KEYS`; kunci baru bukan JWT dan tidak dikirim lewat header `Authorization`): https://supabase.com/docs/guides/getting-started/migrating-to-new-api-keys
- Supabase, mengamankan Edge Functions (`verify_jwt`, variabel lingkungan bawaan): https://supabase.com/docs/guides/functions/auth
- Supabase, tips pengembangan Edge Functions (folder `_shared`): https://supabase.com/docs/guides/functions/development-tips
- Supabase, secret Edge Functions (`supabase secrets list`): https://supabase.com/docs/guides/functions/secrets
- Supabase CLI, `functions deploy` (`--use-api`, `--no-verify-jwt`): https://supabase.com/docs/reference/cli/supabase-functions-deploy
- Supabase JavaScript, `auth.admin.deleteUser`: https://supabase.com/docs/reference/javascript/auth-admin-deleteuser
- Supabase JavaScript, `rpc` (argumen bernama, nilai bawaan): https://supabase.com/docs/reference/javascript/rpc
- Supabase, fungsi database dan `security definer` (`set search_path`): https://supabase.com/docs/guides/database/functions
- Cloudinary, menghapus aset (`destroy`, `invalidate`) dan tanda tangan: https://cloudinary.com/documentation/delete_assets dan https://cloudinary.com/documentation/authentication_signatures
- TanStack Query v5, infinite queries: https://tanstack.com/query/v5/docs/framework/react/guides/infinite-queries
- Skema database Fase 2 (`supabase/migrations/20261010120000_init_schema.sql`): `profiles`, `dokumen`, `halaman_dokumen`, `log_aktivitas`, `is_admin()`, kebijakan RLS, `on delete cascade`
