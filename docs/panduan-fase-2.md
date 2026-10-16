# Panduan Fase 2: Database Supabase dan Keamanan (Scannest)

**Untuk:** Nabil Fakhri Al Muiz · **Terakhir diperbarui:** 14 Oktober 2026 · **Sinkron dengan:** `ROADMAP.md` v0.7 (Fase 2, tugas 2.0 sampai 2.9)

Setelah Fase 2 selesai, database Scannest hidup di Supabase: lima tabel sesuai ERD, dua trigger otomatis, aturan keamanan per baris (RLS), dan pembatasan hak tulis per kolom, semuanya diuji dengan dua akun. Fase ini **hampir tanpa kode baru**: berkas SQL-nya sudah ada di repomu (`supabase/migrations/20261010120000_init_schema.sql` dan `supabase/tests/rls_smoke.sql`; saya bandingkan dengan repo publikmu pada 14 Oktober 2026 dan isinya identik dengan versi yang saya uji). Pekerjaanmu adalah **menerapkannya ke proyek Supabase online, memahaminya, lalu mengujinya**. Pemahaman ini penting: seluruh keamanan data pengguna bertumpu pada aturan di fase ini, bukan pada tampilan aplikasi.

**Apa yang sudah dan belum saya uji:**

- Sudah: seluruh SQL migrasi dan skrip uji dijalankan di PostgreSQL 16 dengan tiruan lingkungan Supabase (peran `anon`, `authenticated`, skema `auth`). Hasil skrip uji: **34 lulus, 0 gagal**. Saya juga sengaja merusak aturan keamanan lima kali dan skrip uji mendeteksi semuanya.
- Belum: menjalankannya di **proyek Supabase sungguhan milikmu** (saya tidak punya aksesnya), tampilan Dashboard (nama menu bisa sedikit berbeda), dan Postgres versi 17 (konfigurasi lokal `supabase/config.toml` menyebut `major_version = 17`; fitur SQL yang dipakai standar, tetapi saya mengujinya di versi 16). Untuk bagian itu saya mengikuti dokumentasi resmi Supabase CLI, dan langkah 2.8 akan menjadi bukti nyata di proyekmu.

---

## Daftar isi

1. Peta tugas dan gambaran besar
2. Tugas 2.0: persiapan
3. Tugas 2.1: Supabase CLI (`login` dan `link`)
4. Tugas 2.2: terapkan migrasi (`db push`)
5. Tugas 2.3 dan 2.4: dua trigger otomatis
6. Tugas 2.5: RLS (aturan per baris)
7. Tugas 2.6: hak tulis per kolom
8. Tugas 2.7: jadikan akunmu admin
9. Tugas 2.8: uji RLS dengan dua akun
10. Tugas 2.9: uji dari luar, tutup fase
11. Yang perlu diingat saat coding nanti
12. Pemecahan masalah
13. Checklist akhir Fase 2
14. Sumber

---

## 1. Peta tugas dan gambaran besar

| Tugas | Isi | Bagian |
|---|---|---|
| 2.0 | Cabang kerja, cek prasyarat, bersihkan berkas nyasar | 2 |
| 2.1 | CLI Supabase: `login` dan `link` ke proyekmu | 3 |
| 2.2 | `db push`: skema (enum, lima tabel) masuk database online | 4 |
| 2.3 | Trigger `handle_new_user` (profil otomatis) | 5 |
| 2.4 | Trigger `sync_jumlah_halaman` (jumlah halaman otomatis) | 5 |
| 2.5 | RLS aktif di semua tabel | 6 |
| 2.6 | Hak akses per kolom (anti eskalasi) | 7 |
| 2.7 | Akunmu dijadikan admin lewat SQL Editor | 8 |
| 2.8 | Uji RLS dengan `rls_smoke.sql` (target 34 lulus, 0 gagal) | 9 |
| 2.9 | Uji dari luar, commit, tutup fase | 10 |

Tugas 2.2 sampai 2.6 **semuanya dikerjakan oleh satu perintah** (`db push`), karena skema, trigger, RLS, dan hak kolom ada dalam satu berkas migrasi. Bagian 4 sampai 7 menjelaskan isinya satu per satu agar kamu paham apa yang baru saja diterapkan.

```
Komputermu                                    Supabase (online)
supabase/migrations/*.sql  ──  db push  ───▶  Database Postgres
   (riwayat di Git)         (lewat `link`)    ├─ 5 tabel + trigger
                                              ├─ RLS + hak kolom
supabase/tests/rls_smoke.sql ─ tempel ─────▶  └─ SQL Editor (uji)
```

### Keputusan: CLI atau SQL Editor?

| | Jalur CLI (`db push`), **dipilih** | Jalur SQL Editor |
|---|---|---|
| Pro | Riwayat tersimpan di Git dan tercatat di database (`supabase_migrations.schema_migrations`), bisa diulang di proyek lain, dan menjadi kebiasaan kerja profesional | Tanpa pasang apa pun, 1 kali tempel |
| Kontra | Perlu `login`, `link`, dan password database | Tidak ada riwayat migrasi; mudah lupa perubahan apa yang sudah dijalankan |
| Cocok untuk | Proyek yang dipublikasikan di GitHub (portofoliomu) | Percobaan sekali pakai |

**Jangan mencampur keduanya** pada database yang sama: bila skema sudah dibuat lewat SQL Editor, `db push` akan gagal dengan galat seperti `type ... already exists`.

---

## 2. Tugas 2.0: persiapan

### 2.1 Prasyarat

- Fase 1 selesai dan sudah digabung ke `main`.
- Tugas 0.9 selesai: proyek Supabase ada, `.env` berisi `EXPO_PUBLIC_SUPABASE_URL` dan `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- **Database password** dari saat membuat proyek masih kamu simpan (password manager). Bila lupa: Dashboard, **Settings > Database**, lalu reset password.
- **Project Ref** dicatat: bagian depan URL proyek. Contoh `https://abcdefghijkl.supabase.co` berarti ref-nya `abcdefghijkl`.
- Paket `supabase` sudah ada di `devDependencies` repomu (versi `^2.120.0` saat saya cek) dan folder `supabase/` sudah berisi `config.toml`, migrasi, dan tes. Artinya `npm install supabase --save-dev` dan `npx supabase init` **sudah pernah kamu jalankan; jangan diulang**.
- Docker **tidak** diperlukan untuk `link` dan `db push` (dokumentasi hanya menyebut Docker untuk `db pull`, yang tidak kita pakai).

### 2.2 Bersihkan berkas nyasar

Saat mengecek repo publikmu (14 Oktober 2026) saya masih menemukan empat berkas nyasar di akar repo: `tatus`, `h -u origin main`, `(`, dan `router.push(item.href)}`. Penyebabnya dan cara mencegahnya ada di `panduan-fase-1.md` bagian 3.0. Hapus sekarang, di cabang baru ini:

```bash
git switch main
git pull
git switch -c fase-2-database
git rm tatus "h -u origin main" "(" "router.push(item.href)}"
git commit -m "chore: hapus berkas nyasar"
```

Bila Git menjawab bahwa sebuah berkas tidak ditemukan, jalankan `git ls-files` untuk melihat nama persisnya, lalu sesuaikan.

### 2.3 Cek keadaan awal

```bash
npx supabase --version
git status
```

Versi tercetak (contoh `2.120.0`) dan `git status` bersih (selain commit di atas). Bila `npx supabase --version` galat, jalankan `npm install` dulu.

---

## 3. Tugas 2.1: Supabase CLI (`login` dan `link`)

### 3.1 Login

```bash
npx supabase login
```

Browser terbuka dan meminta izin; setelah disetujui, CLI menyimpan *access token* di komputermu (bukan di repo). Bila browser tidak terbuka otomatis, CLI menampilkan tautan yang bisa kamu salin ke browser.

### 3.2 Hubungkan folder ini ke proyekmu

```bash
npx supabase link --project-ref abcdefghijkl
```

Ganti `abcdefghijkl` dengan Project Ref-mu. CLI akan menanyakan **database password**; jawab dengan password dari saat membuat proyek (layar tidak menampilkan huruf yang diketik, itu normal). Menurut dokumentasi CLI, mengosongkan jawaban hanya melewati validasi pengaturan database, dan password disimpan di penyimpanan kredensial sistem bila tersedia. Untuk CI nanti, password bisa diberikan lewat variabel lingkungan `SUPABASE_DB_PASSWORD`.

Yang dilakukan `link`: mengaitkan folder `supabase/` dengan proyek online (catatannya disimpan di `supabase/.temp/`, yang sudah diabaikan Git lewat `supabase/.gitignore`) dan memeriksa kecocokan pengaturan API dengan `config.toml`.

### 3.3 Cek

```bash
git status
```

Seharusnya tidak ada berkas baru. Bila `supabase/config.toml` ikut berubah, lihat isinya dengan `git diff supabase/config.toml`; perubahan wajar boleh di-commit.

**Selesai bila:** `link` berakhir tanpa galat.

---

## 4. Tugas 2.2: terapkan migrasi (`db push`)

*Migrasi* adalah berkas SQL bertanggal yang mengubah database. Nama `20261010120000_init_schema.sql` diawali cap waktu (`2026-10-10 12:00:00`); Supabase menjalankan migrasi berurutan menurut angka itu dan mencatat yang sudah dijalankan sehingga tidak berjalan dua kali. **Jangan menjalankan `supabase migration new` untuk migrasi pertama**; berkas ini sudah migrasi pertama.

### 4.1 Lihat dulu, lalu terapkan

```bash
npx supabase db push --dry-run
npx supabase db push
```

- `--dry-run`: hanya mencetak migrasi yang **akan** dijalankan, tanpa mengubah apa pun. Harus tercantum `20261010120000_init_schema.sql`.
- `db push`: menerapkan migrasi ke database online. Pada penerapan pertama CLI membuat tabel riwayat `supabase_migrations.schema_migrations` dan mencatat tiap migrasi yang berhasil.
- Bila ditanya konfirmasi (`Do you want to push these migrations to the remote database?`), jawab `y`.

### 4.2 Cek hasilnya

```bash
npx supabase migration list
```

Kolom **LOCAL** dan **REMOTE** harus sama-sama berisi `20261010120000`. Lalu di Dashboard, buka **Table Editor**: harus ada lima tabel di skema `public`: `profiles`, `dokumen`, `halaman_dokumen`, `efek_foto`, `log_aktivitas`, masing-masing dengan penanda RLS aktif.

### 4.3 Isi migrasi, bagian 1 dan 2: enum dan tabel

**Berkas:** `supabase/migrations/20261010120000_init_schema.sql` (sudah ada di repomu; kutipan di bawah sama persis dengan isinya)

*Enum* membatasi nilai kolom ke daftar tetap, sehingga typo seperti `admn` ditolak database:

```sql
create type public.user_role as enum ('user', 'admin');
create type public.dokumen_status as enum ('draft', 'selesai');
create type public.filter_foto as enum ('asli', 'dokumen', 'hitam_putih', 'abu_abu', 'tajam');
```

Tabel `profiles` (pengganti entitas `USERS` di ERD; email dan password dikelola Supabase Auth di tabel `auth.users`):

```sql
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  nama        text not null default '' check (char_length(nama) <= 80),
  role        public.user_role not null default 'user',
  is_aktif    boolean not null default true,
  dibuat_pada timestamptz not null default now()
);
```

| Bagian | Penjelasan |
|---|---|
| `id uuid primary key references auth.users (id)` | Kunci utama sekaligus penaut ke akun Auth: satu akun, satu profil. |
| `on delete cascade` | Bila akun Auth dihapus, profilnya ikut terhapus. |
| `nama text not null default '' check (char_length(nama) <= 80)` | Nama maksimal 80 karakter, tidak boleh `null`. |
| `role public.user_role not null default 'user'` | Peran, hanya `user` atau `admin`. Akun baru otomatis `user`. |
| `is_aktif boolean not null default true` | Saklar blokir akun: `false` berarti akun dinonaktifkan. |
| `dibuat_pada timestamptz ... default now()` | Waktu dibuat, diisi otomatis. |

Tabel `dokumen`:

```sql
create table public.dokumen (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles (id) on delete cascade,
  judul          text not null check (char_length(judul) between 1 and 120),
  status         public.dokumen_status not null default 'draft',
  jumlah_halaman integer not null default 0 check (jumlah_halaman >= 0),
  dibuat_pada    timestamptz not null default now()
);

-- Indeks untuk daftar dokumen milik satu pengguna, terbaru dulu.
create index dokumen_user_dibuat_idx on public.dokumen (user_id, dibuat_pada desc);
```

| Bagian | Penjelasan |
|---|---|
| `id uuid ... default gen_random_uuid()` | ID acak yang dibuat database, jadi aplikasi tidak perlu (dan tidak boleh) menentukannya. |
| `user_id ... references public.profiles (id) on delete cascade` | Pemilik dokumen. Hapus profil, dokumennya ikut terhapus. |
| `judul ... check (char_length(judul) between 1 and 120)` | Judul wajib, 1 sampai 120 karakter. |
| `jumlah_halaman ... check (jumlah_halaman >= 0)` | Dijaga trigger (bagian 5), bukan diisi aplikasi. |
| `create index ... (user_id, dibuat_pada desc)` | Mempercepat daftar dokumen satu pengguna, terbaru di atas. Indeks juga membantu RLS yang menyaring `user_id`. |

Tabel `halaman_dokumen`:

```sql
create table public.halaman_dokumen (
  id          uuid primary key default gen_random_uuid(),
  dokumen_id  uuid not null references public.dokumen (id) on delete cascade,
  urutan      integer not null check (urutan > 0),
  url_asli    text not null,
  url_hasil   text not null,
  public_id   text not null,
  ukuran_byte integer not null check (ukuran_byte >= 0),
  unique (dokumen_id, urutan) deferrable initially deferred
);
```

| Bagian | Penjelasan |
|---|---|
| `url_asli`, `url_hasil`, `public_id` | Alamat foto di Cloudinary dan ID publiknya (dipakai untuk menghapus file, Fase 8). |
| `unique (dokumen_id, urutan) deferrable initially deferred` | Aturan "urutan tidak boleh kembar" **dicek di akhir transaksi**, bukan per baris. Tanpa ini, menukar urutan halaman 1 dan 2 dalam satu `UPDATE` gagal sementara karena sesaat ada dua baris bernomor sama. Constraint ini juga otomatis menjadi indeks pencarian per dokumen. |

Tabel `efek_foto`:

```sql
create table public.efek_foto (
  id           uuid primary key default gen_random_uuid(),
  halaman_id   uuid not null unique references public.halaman_dokumen (id) on delete cascade,
  jenis_filter public.filter_foto not null default 'asli',
  kecerahan    integer not null default 0 check (kecerahan between -100 and 100),
  kontras      integer not null default 0 check (kontras between -100 and 100),
  rotasi       integer not null default 0 check (rotasi in (0, 90, 180, 270)),
  data_crop    jsonb check (
                 data_crop is null
                 or (jsonb_typeof(data_crop) = 'object' and data_crop ?& array['x', 'y', 'w', 'h'])
               )
);
```

| Bagian | Penjelasan |
|---|---|
| `halaman_id ... unique references ... on delete cascade` | Satu halaman paling banyak punya satu baris efek. |
| `kecerahan`, `kontras` `between -100 and 100` | Rentang slider di editor (Fase 6). |
| `rotasi in (0, 90, 180, 270)` | Hanya putaran kelipatan 90 derajat. |
| `data_crop jsonb check (...)` | Koordinat crop `{"x":0,"y":0,"w":800,"h":1000}`. `?& array['x','y','w','h']` mensyaratkan keempat kunci ada. `null` berarti tanpa crop. |

Tabel `log_aktivitas`:

```sql
create table public.log_aktivitas (
  id             uuid primary key default gen_random_uuid(),
  admin_id       uuid references public.profiles (id) on delete set null,
  target_user_id uuid,
  aksi           text not null check (
                   aksi in ('nonaktifkan_akun', 'aktifkan_akun', 'hapus_akun', 'hapus_dokumen')
                 ),
  keterangan     text,
  waktu          timestamptz not null default now()
);

create index log_aktivitas_waktu_idx on public.log_aktivitas (waktu desc);
```

| Bagian | Penjelasan |
|---|---|
| `admin_id ... on delete set null` | Bila akun admin dihapus, log tetap ada (kolom menjadi `null`). |
| `target_user_id uuid` **tanpa** foreign key | Sengaja: log tentang akun yang sudah dihapus harus tetap tersimpan. |
| `aksi ... check (aksi in (...))` | Hanya empat jenis aksi yang dikenal. |
| `create index ... (waktu desc)` | Daftar log terbaru di atas dengan cepat. |

---

## 5. Tugas 2.3 dan 2.4: dua trigger otomatis

*Trigger* adalah fungsi yang dijalankan database otomatis ketika ada kejadian. Keduanya sudah masuk dalam `db push` di bagian 4.

### 5.1 `handle_new_user`: profil otomatis (tugas 2.3)

**Berkas:** `supabase/migrations/20261010120000_init_schema.sql`

```sql
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, nama)
  values (new.id, left(coalesce(new.raw_user_meta_data ->> 'nama', ''), 80));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

| Bagian | Penjelasan |
|---|---|
| `after insert on auth.users ... for each row` | Dijalankan setiap kali ada akun baru terdaftar di Supabase Auth. |
| `new.raw_user_meta_data ->> 'nama'` | Nama dikirim aplikasi saat daftar: `signUp({ options: { data: { nama } } })` (Fase 3). |
| `left(..., 80)` dan `coalesce(..., '')` | Memotong ke 80 karakter dan memakai teks kosong bila nama tidak dikirim, agar constraint `check` tidak membuat pendaftaran gagal. |
| `security definer set search_path = ''` | Berjalan dengan hak pemilik fungsi (supaya boleh menulis ke `profiles` walau RLS aktif), dan `search_path` dikosongkan agar tidak bisa dibajak lewat tabel palsu. Karena itu semua tabel ditulis lengkap, misalnya `public.profiles`. |

**Cara menguji sekarang:** di Dashboard, **Authentication > Users > Add user** (opsi buat tanpa kirim email atau auto-confirm), lalu buka Table Editor `profiles`. Satu baris dengan `id` yang sama dengan akun baru itu harus muncul sendiri, dengan `role` = `user` dan `is_aktif` = `true`.

### 5.2 `sync_jumlah_halaman`: hitung halaman otomatis (tugas 2.4)

```sql
create function public.sync_jumlah_halaman()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_dokumen_id uuid := coalesce(new.dokumen_id, old.dokumen_id);
begin
  update public.dokumen
  set jumlah_halaman = (
    select count(*) from public.halaman_dokumen where dokumen_id = v_dokumen_id
  )
  where id = v_dokumen_id;
  return null;
end;
$$;

create trigger halaman_sync_jumlah
  after insert or delete on public.halaman_dokumen
  for each row execute function public.sync_jumlah_halaman();
```

| Bagian | Penjelasan |
|---|---|
| `after insert or delete on public.halaman_dokumen` | Dijalankan setiap kali halaman ditambah atau dihapus. |
| `coalesce(new.dokumen_id, old.dokumen_id)` | Pada `INSERT` hanya `new` yang terisi, pada `DELETE` hanya `old`; `coalesce` memilih yang ada. |
| `update public.dokumen set jumlah_halaman = (select count(*) ...)` | Menghitung ulang dari data sebenarnya, jadi angka tidak bisa melenceng dan tidak bisa dipalsukan aplikasi. |
| `return null` | Untuk trigger `AFTER`, nilai kembalian diabaikan. |

---

## 6. Tugas 2.5: RLS (aturan per baris)

**RLS (Row Level Security)** artinya setiap permintaan dicek per baris: "apakah pengguna ini boleh melihat atau mengubah **baris** ini?". Prinsip pentingnya: **setelah RLS aktif, tanpa policy yang mengizinkan, tidak ada akses sama sekali.** Supabase menyarankan mengaktifkan RLS di setiap tabel di skema yang terekspos ke API, dan satu policy per operasi (select, insert, update, delete).

Mengapa penting untuk Scannest: aplikasi mobile memakai *publishable key* yang **terbaca oleh siapa pun** yang membongkar APK. Kunci itu aman hanya karena RLS membatasi apa yang bisa dilakukannya.

### 6.1 Fungsi bantu

**Berkas:** `supabase/migrations/20261010120000_init_schema.sql`

```sql
create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'admin'
      and is_aktif
  );
$$;
```

| Bagian | Penjelasan |
|---|---|
| `returns boolean ... stable` | Mengembalikan benar/salah; `stable` memberi tahu Postgres hasilnya tidak berubah dalam satu query sehingga bisa di-cache. |
| `security definer` | Fungsi ini membaca `profiles` dengan hak pemiliknya, bukan hak pemanggil. Tanpa ini, policy `profiles` yang memanggil dirinya sendiri membuat **rekursi tak berujung** (galat `42P17`). |
| `set search_path = ''` | Wajib untuk fungsi `security definer` agar tidak bisa dibajak. |
| `(select auth.uid())` | `auth.uid()` adalah ID pengguna yang sedang login. Dibungkus `select` supaya dihitung **sekali per query**, bukan per baris (saran performa dari dokumentasi Supabase). |
| `and is_aktif` | Admin yang dinonaktifkan kehilangan kuasanya. |

Tiga fungsi lain bekerja dengan pola yang sama:

```sql
create function public.owns_dokumen(p_dokumen_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_aktif_user()
    and exists (
      select 1
      from public.dokumen d
      where d.id = p_dokumen_id
        and d.user_id = (select auth.uid())
    );
$$;
```

`is_aktif_user()` (baris 120 sampai 131) memeriksa akun pemanggil aktif. `owns_dokumen(id)` memeriksa dokumen itu milik pemanggil **dan** akunnya aktif. `owns_halaman(id)` melakukan hal yang sama lewat dokumen induk halaman (baris 151 sampai 166). Karena itu akun nonaktif kehilangan akses ke datanya sendiri di sisi server, bukan hanya di tampilan.

### 6.2 Aktifkan RLS dan policy

```sql
alter table public.profiles        enable row level security;
alter table public.dokumen         enable row level security;
alter table public.halaman_dokumen enable row level security;
alter table public.efek_foto       enable row level security;
alter table public.log_aktivitas   enable row level security;
```

Lima tabel, lima baris: RLS aktif di semuanya.

Policy `profiles`:

```sql
create policy profiles_select on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or public.is_admin());

create policy profiles_update_sendiri on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));
```

| Bagian | Penjelasan |
|---|---|
| `for select to authenticated` | Berlaku untuk membaca, hanya bagi pengguna yang sudah login. Pengunjung anonim (`anon`) tidak punya policy, jadi ditolak. |
| `using (...)` | Syarat **baris mana yang boleh dilihat/dijadikan sasaran**. |
| `id = (select auth.uid()) or public.is_admin()` | Lihat profil sendiri; admin melihat semua. |
| `with check (...)` pada `update` | Syarat **hasil akhir baris sesudah diubah**: baris tetap harus milik sendiri (tidak bisa "dioper" ke orang lain). |

Policy `dokumen` (pemilik penuh, admin hanya baca):

```sql
create policy dokumen_select on public.dokumen
  for select to authenticated
  using (
    (user_id = (select auth.uid()) and public.is_aktif_user())
    or public.is_admin()
  );

create policy dokumen_insert on public.dokumen
  for insert to authenticated
  with check (user_id = (select auth.uid()) and public.is_aktif_user());

create policy dokumen_update on public.dokumen
  for update to authenticated
  using (user_id = (select auth.uid()) and public.is_aktif_user())
  with check (user_id = (select auth.uid()) and public.is_aktif_user());

create policy dokumen_delete on public.dokumen
  for delete to authenticated
  using (user_id = (select auth.uid()) and public.is_aktif_user());
```

| Operasi | Siapa yang boleh |
|---|---|
| `select` | Pemilik yang akunnya aktif, **atau** admin (baca semua). |
| `insert` | Hanya atas nama dirinya sendiri (`user_id = auth.uid()`) dan akun aktif. |
| `update`, `delete` | Hanya pemilik yang aktif. Admin **tidak** punya policy tulis, jadi admin hanya bisa membaca dari aplikasi; aksi hapus oleh admin nanti lewat Edge Function (Fase 8). |

`halaman_dokumen` dan `efek_foto` memakai pola sama lewat `owns_dokumen()` dan `owns_halaman()` (baris 261 sampai 294). Policy log:

```sql
create policy log_select_admin on public.log_aktivitas
  for select to authenticated
  using (public.is_admin());
```

`log_aktivitas` hanya punya policy `select` untuk admin. **Tidak ada** policy `insert`, `update`, `delete`, jadi aplikasi (bahkan admin) tidak bisa menulis log; hanya Edge Function dengan *secret key* yang bisa, karena kunci itu melewati RLS.

### 6.3 Ringkasan aturan akses

| Tabel | Pengguna biasa | Admin (dari aplikasi) | Server (Edge Function) |
|---|---|---|---|
| `profiles` | Baca profil sendiri, ubah `nama` sendiri | Baca semua | Semua |
| `dokumen` | CRUD miliknya (hanya `judul` dan `status` yang boleh diubah) | Baca semua | Semua |
| `halaman_dokumen` | CRUD pada dokumen miliknya | Baca semua | Semua |
| `efek_foto` | CRUD pada halaman miliknya | Baca semua | Semua |
| `log_aktivitas` | Tidak ada akses | Baca | Tulis |

---

## 7. Tugas 2.6: hak tulis per kolom

RLS menjawab "baris mana". Lapisan kedua, `GRANT`, menjawab **"kolom mana"**. Tanpa lapisan ini, pengguna yang punya hak mengubah profilnya sendiri bisa saja mengirim `role = 'admin'` lewat permintaan API langsung. Dokumentasi Supabase juga mengingatkan bahwa grant dan policy adalah dua pemeriksaan terpisah: grant yang hilang menghasilkan galat `42501` (*permission denied*) **sebelum** policy dijalankan.

**Berkas:** `supabase/migrations/20261010120000_init_schema.sql`

```sql
revoke all on public.profiles, public.dokumen, public.halaman_dokumen,
              public.efek_foto, public.log_aktivitas
  from anon, authenticated;

grant select on public.profiles        to authenticated;
grant update (nama) on public.profiles to authenticated;

grant select, delete on public.dokumen to authenticated;
grant insert (user_id, judul, status) on public.dokumen to authenticated;
grant update (judul, status) on public.dokumen to authenticated;

grant select, delete on public.halaman_dokumen to authenticated;
grant insert (dokumen_id, urutan, url_asli, url_hasil, public_id, ukuran_byte)
  on public.halaman_dokumen to authenticated;
grant update (urutan, url_hasil) on public.halaman_dokumen to authenticated;

-- halaman_id ikut di grant update karena upsert (insert ... on conflict
-- do update) mengisi ulang semua kolom yang dikirim, termasuk halaman_id.
grant select, delete on public.efek_foto to authenticated;
grant insert (halaman_id, jenis_filter, kecerahan, kontras, rotasi, data_crop)
  on public.efek_foto to authenticated;
grant update (halaman_id, jenis_filter, kecerahan, kontras, rotasi, data_crop)
  on public.efek_foto to authenticated;

grant select on public.log_aktivitas to authenticated;

-- Fungsi: hanya pengguna login yang boleh memanggil fungsi bantu.
-- Fungsi trigger tidak perlu dipanggil siapa pun secara langsung.
revoke execute on function public.is_admin()              from public, anon;
revoke execute on function public.is_aktif_user()         from public, anon;
revoke execute on function public.owns_dokumen(uuid)      from public, anon;
revoke execute on function public.owns_halaman(uuid)      from public, anon;
revoke execute on function public.handle_new_user()       from public, anon, authenticated;
revoke execute on function public.sync_jumlah_halaman()   from public, anon, authenticated;

grant execute on function public.is_admin()          to authenticated;
grant execute on function public.is_aktif_user()     to authenticated;
grant execute on function public.owns_dokumen(uuid)  to authenticated;
grant execute on function public.owns_halaman(uuid)  to authenticated;
```

| Bagian | Penjelasan |
|---|---|
| `revoke all ... from anon, authenticated` | Mulai dari nol: cabut semua hak bawaan. Pada sebagian proyek Supabase, tabel baru di `public` otomatis diberi hak penuh untuk `anon` dan `authenticated`, jadi langkah ini membuat hasilnya sama di proyek mana pun. |
| `grant select on public.profiles` + `grant update (nama)` | Pengguna boleh membaca `profiles` dan **hanya** mengubah kolom `nama`. `role` dan `is_aktif` terkunci. |
| `grant insert (user_id, judul, status) on public.dokumen` | Saat membuat dokumen hanya tiga kolom itu yang boleh dikirim. `id`, `dibuat_pada`, `jumlah_halaman` diisi database. |
| `grant update (judul, status)` | Hanya judul dan status yang boleh diubah. |
| `halaman_dokumen`: `insert (...)` dan `update (urutan, url_hasil)` | Foto asli tidak bisa diganti setelah diunggah; hanya urutan dan URL hasil. |
| `efek_foto`: `halaman_id` ikut di `update` | Karena *upsert* (`insert ... on conflict do update`) mengisi ulang semua kolom yang dikirim, termasuk `halaman_id`. Sudah diuji. |
| `grant select on public.log_aktivitas` | Hanya baca (dan RLS membatasi ke admin). |
| `revoke execute ... from public, anon` lalu `grant execute ... to authenticated` | Fungsi bantu hanya boleh dipanggil pengguna yang login. Fungsi trigger (`handle_new_user`, `sync_jumlah_halaman`) tidak boleh dipanggil siapa pun secara langsung. |

**Catatan keamanan yang jujur:** dokumentasi Supabase menyarankan agar fungsi `security definer` tidak diletakkan di skema yang terekspos ke API, dan `public` adalah skema terekspos. Fungsi bantu kita memang berada di `public`, tetapi hanya bisa dipanggil pengguna login dan hanya mengungkap status **dirinya sendiri** (apakah ia admin, apakah dokumen itu miliknya), jadi risikonya kecil. Memindahkannya ke skema privat saya catat sebagai item backlog B8 (P2, ditinjau di Fase 9). Migrasi yang sudah diuji tidak saya ubah sekarang agar tidak menambah risiko sebelum penerapan pertama.

---

## 8. Tugas 2.7: jadikan akunmu admin

Admin **tidak** bisa dibuat lewat aplikasi (pengguna tidak punya hak mengubah `role`, itu tujuan tugas 2.6). Caranya lewat SQL Editor, tempat kamu bekerja sebagai pemilik database.

### 8.1 Buat akun

Aplikasi belum punya layar daftar yang berfungsi (Fase 3), jadi buat lewat Dashboard:

1. **Authentication > Users > Add user > Create new user.**
2. Isi email dan password akunmu. Aktifkan opsi **Auto Confirm User** (bila ada) agar tidak perlu konfirmasi email.
3. Klik buat. Trigger `handle_new_user` otomatis membuat baris di `profiles`.

### 8.2 Naikkan menjadi admin

Buka **SQL Editor**, buat query baru, tempel (ganti emailnya), lalu **Run**:

```sql
update public.profiles
set role = 'admin'
where id = (select id from auth.users where email = 'EMAILMU@contoh.com');
```

Cek:

```sql
select p.id, u.email, p.role, p.is_aktif
from public.profiles p
join auth.users u on u.id = p.id;
```

Barismu harus berisi `role` = `admin` dan `is_aktif` = `true`.

**Jangan** menuliskan email aslimu di berkas repo atau commit; perintah ini hanya untuk SQL Editor.

---

## 9. Tugas 2.8: uji RLS dengan dua akun

Ini bukti bahwa semua aturan di atas benar-benar bekerja di proyekmu. Skrip `rls_smoke.sql` menjalankan 34 pemeriksaan: apa yang boleh dan **tidak** boleh dilakukan pengguna A, pengguna B, admin, dan akun nonaktif.

### 9.1 Buat dua akun uji biasa

Seperti 8.1, buat dua akun **non-admin** (bukan akunmu): misalnya `uji-a@contoh.com` dan `uji-b@contoh.com`. Alamat fiktif boleh asal formatnya benar dan **Auto Confirm User** aktif.

### 9.2 Siapkan dan jalankan skrip

1. Buka `supabase/tests/rls_smoke.sql` di VS Code, lalu salin **seluruh isinya** ke SQL Editor (query baru).
2. **Hanya di salinan di SQL Editor** (bukan di berkas repo), ganti `GANTI_EMAIL_A` dan `GANTI_EMAIL_B` (baris 33 dan 34) dengan email kedua akun uji.
3. Klik **Run**.

### 9.3 Cara membaca hasil

Skrip ini **sengaja berakhir dengan pesan galat** yang berisi laporan. Itu bukan kegagalan: dengan cara itu semua perubahan uji (akun dijadikan admin sementara, dinonaktifkan, dokumen uji) otomatis dibatalkan dan datamu tidak berubah. Cari bagian ini di panel hasil:

```
Ringkasan: 34 lulus, 0 gagal
SEMUA UJI LULUS.
```

| Hasil | Artinya | Tindakan |
|---|---|---|
| `34 lulus, 0 gagal` | Semua aturan berfungsi | Lanjut ke 2.9 |
| Baris `GAGAL` pada pemeriksaan **keamanan** (mis. "A TIDAK boleh ...") | Ada celah akses. **Serius.** | **Jangan lanjut ke Fase 3.** Salin seluruh laporan dan kirim kepada saya |
| Hanya satu `GAGAL` pada "Hapus akun A (cascade)" dengan pesan *permission denied* | Kemungkinan pembatasan hak pada tabel `auth` di Supabase online, bukan celah data | Laporkan kepada saya dengan laporan lengkapnya |
| Galat `Akun uji tidak ditemukan` | Email salah ketik atau akun belum dibuat | Perbaiki email, jalankan lagi |

Kelompok pemeriksaan yang diuji: A membuat dan mengubah dokumennya sendiri; A tidak bisa menulis atas nama B, mengisi `jumlah_halaman`, mengubah `role` atau `is_aktif`; A tidak bisa membaca log; B tidak bisa melihat atau mengubah data A; admin bisa membaca semuanya tetapi tidak bisa menulis dari aplikasi; akun nonaktif kehilangan akses; penghapusan akun menghapus datanya berantai.

Catat tanggal dan hasil uji (34/0) di `ROADMAP.md`.

---

## 10. Tugas 2.9: uji dari luar, commit, tutup fase

### 10.1 Uji dari luar (opsional, 2 menit)

Pemeriksaan ini meniru orang asing yang memegang publishable key dari APK-mu. Di terminal (CMD atau PowerShell Windows 10 ke atas memiliki `curl`), ganti `REF` dan kuncinya dengan milikmu:

```bash
curl -i "https://REF.supabase.co/rest/v1/dokumen?select=*" -H "apikey: sb_publishable_xxxxxxxx"
```

Hasil yang diharapkan: **bukan** daftar dokumen. Saya memperkirakan status 401 atau 403 dengan pesan *permission denied for table dokumen* (kode `42501`), karena tugas 2.6 mencabut semua hak `anon`. Bagian ini **belum saya uji di proyekmu**; bila hasilnya berbeda (apalagi bila data muncul), kirim kepada saya. Jangan pernah memakai *secret key* untuk uji ini.

### 10.2 Commit dan tutup fase

Fase 2 hampir tidak mengubah berkas di repo. Yang berubah hanya dokumen dan centang roadmap:

```bash
git status
git add ROADMAP.md docs/panduan-fase-2.md
git commit -m "docs: Fase 2 selesai, hasil uji RLS 34 lulus"
git push -u origin fase-2-database
```

(Sesuaikan daftar berkas dengan yang kamu ubah; baca `git status` dulu, dan pastikan tidak ada berkas bernama aneh.) Buka pull request, tunggu CI hijau, lalu **Merge**.

Centang tugas 2.0 sampai 2.9 di `ROADMAP.md`.

---

## 11. Yang perlu diingat saat coding nanti

1. **Jangan kirim kolom yang tidak diizinkan.** Hak tulis dibatasi per kolom: mengirim `id`, `dibuat_pada`, atau `jumlah_halaman` dari aplikasi ditolak dengan `permission denied`. Biarkan database yang mengisinya.
2. **Upsert efek foto** (`insert ... on conflict (halaman_id)`) sudah diuji dan berfungsi.
3. **Mengubah skema di kemudian hari:** jangan edit berkas migrasi yang sudah di-push. Buat migrasi baru dengan `npx supabase migration new nama_perubahan`, tulis SQL-nya, lalu `npx supabase db push`.
4. **Jangan pernah** menaruh *secret key* (`sb_secret_...`) atau `service_role` di aplikasi atau repo. Dokumentasi Supabase: kunci itu melewati RLS dan hanya untuk komponen server seperti Edge Function.
5. **Proyek paket Free di-pause** setelah satu minggu tanpa aktivitas (dicek 10 Oktober 2026). Bila aplikasi tidak merespons, klik **Restore project** di Dashboard. Backlog B4 menyiapkan pengingat otomatis.
6. Kunci lama `anon` dan `service_role` dijadwalkan dihentikan **akhir 2026** (dokumentasi Supabase). Kita sudah memakai publishable key, jadi aman.

---

## 12. Pemecahan masalah

| Gejala | Kemungkinan penyebab dan solusi |
|---|---|
| `supabase login` tidak membuka browser | Salin tautan yang dicetak CLI ke browser, atau ulangi perintahnya |
| `link` menolak password | Salah password database. Reset di **Settings > Database**, lalu coba lagi |
| `db push` berkata tidak ada migrasi baru | Migrasi sudah pernah diterapkan, atau berkas tidak ada di `supabase/migrations/`. Cek dengan `npx supabase migration list` |
| `db push` gagal pada `type ... already exists` atau `relation ... already exists` | Skema sebelumnya dibuat lewat SQL Editor (jalur campuran). Pilih satu jalur; kirim galatnya kepada saya untuk dibersihkan |
| Riwayat LOCAL dan REMOTE tidak cocok | `npx supabase migration repair` memperbaiki catatan riwayat tanpa menjalankan migrasi (lihat dokumentasi CLI). Kirim keluaran `migration list` kepada saya sebelum mencobanya |
| Tidak bisa tersambung ke database | Proyek Free sedang di-pause: **Restore project** di Dashboard, tunggu siap, ulangi |
| Aplikasi nanti: `permission denied for table ...` saat insert | Kamu mengirim kolom di luar yang diizinkan (bagian 11, poin 1) |
| Tabel muncul tetapi data kosong saat dibaca dari aplikasi | Normal bila belum login: RLS menolak akses anonim |
| `Akun uji tidak ditemukan` di skrip uji | Email di baris 33 dan 34 tidak sama dengan email akun yang dibuat |

---

## 13. Checklist akhir Fase 2

Sama dengan "Selesai bila" Fase 2 di `ROADMAP.md`.

*Status 16 Oktober 2026: dicentang berdasarkan laporan pengguna (tugas 2.1 sampai 2.8 pada 14 Oktober, penutup 2.0 dan 2.9 lewat tugas 3.0 pada 16 Oktober).*

- [x] `login` dan `link` berhasil (2.1)
- [x] `db push` berhasil; `migration list` menunjukkan LOCAL dan REMOTE sama; lima tabel ada di Table Editor (2.2)
- [x] Trigger terbukti: akun baru otomatis punya baris `profiles` (2.3)
- [x] RLS aktif di semua tabel, dipahami (2.5) dan hak kolom dipahami (2.6)
- [x] Akunmu admin (`role` = `admin`) (2.7)
- [x] `rls_smoke.sql` menunjukkan **34 lulus, 0 gagal** (2.8)
- [x] Migrasi tersimpan di repo; berkas nyasar sudah dihapus; PR digabung dan CI hijau (2.0, 2.9)

---

## 14. Sumber (diakses 14 Oktober 2026)

- `supabase db push` dan `migration list`: https://supabase.com/docs/reference/cli/supabase-db-push
- `supabase link`: https://supabase.com/docs/reference/cli/supabase-link
- API keys (publishable, secret, jadwal penghentian kunci lama): https://supabase.com/docs/guides/api/api-keys
- Row Level Security: https://supabase.com/docs/guides/database/postgres/row-level-security
