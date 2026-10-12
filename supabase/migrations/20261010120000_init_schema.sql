-- =====================================================================
-- Scannest | Migrasi 1: skema database, keamanan (RLS), dan trigger
-- Sumber rancangan: ROADMAP.md bagian 2 (pemetaan ERD ke implementasi)
-- Jalankan lewat: npx supabase db push
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. TIPE ENUM
-- Enum membatasi nilai kolom ke daftar tetap, jadi data tidak bisa
-- berisi typo seperti 'admn'.
-- ---------------------------------------------------------------------
create type public.user_role as enum ('user', 'admin');
create type public.dokumen_status as enum ('draft', 'selesai');
create type public.filter_foto as enum ('asli', 'dokumen', 'hitam_putih', 'abu_abu', 'tajam');


-- ---------------------------------------------------------------------
-- 2. TABEL
-- ---------------------------------------------------------------------

-- USERS (ERD) -> profiles
-- Email dan password dikelola Supabase Auth (tabel auth.users), jadi
-- tabel ini hanya menyimpan data profil dan peran.
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  nama        text not null default '' check (char_length(nama) <= 80),
  role        public.user_role not null default 'user',
  is_aktif    boolean not null default true,
  dibuat_pada timestamptz not null default now()
);

-- DOKUMEN
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

-- HALAMAN_DOKUMEN
-- "deferrable initially deferred": unik urutan baru dicek saat transaksi
-- selesai, sehingga menukar urutan dua halaman dalam satu UPDATE tidak gagal.
-- Constraint unik ini juga sudah menjadi indeks untuk pencarian per dokumen.
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

-- EFEK_FOTO
-- Satu halaman paling banyak punya satu baris efek (halaman_id unik).
-- data_crop berisi koordinat piksel: {"x":0,"y":0,"w":800,"h":1000}.
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

-- LOG_AKTIVITAS
-- target_user_id sengaja tanpa foreign key agar log tetap ada setelah
-- akun yang dituju dihapus. admin_id menjadi null bila akun admin dihapus.
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


-- ---------------------------------------------------------------------
-- 3. FUNGSI BANTU
-- "security definer" = dijalankan dengan hak pemilik fungsi, sehingga
-- bisa membaca profiles tanpa terhalang RLS (dan tidak terjadi rekursi).
-- "set search_path = ''" = mencegah pembajakan nama tabel; semua tabel
-- ditulis lengkap dengan nama skema (public.xxx).
-- ---------------------------------------------------------------------

-- Apakah pemanggil adalah admin yang akunnya aktif?
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

-- Apakah akun pemanggil masih aktif?
create function public.is_aktif_user()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select is_aktif from public.profiles where id = (select auth.uid())),
    false
  );
$$;

-- Apakah dokumen ini milik pemanggil (dan akunnya aktif)?
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

-- Apakah halaman ini milik pemanggil (lewat dokumennya)?
create function public.owns_halaman(p_halaman_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_aktif_user()
    and exists (
      select 1
      from public.halaman_dokumen h
      join public.dokumen d on d.id = h.dokumen_id
      where h.id = p_halaman_id
        and d.user_id = (select auth.uid())
    );
$$;


-- ---------------------------------------------------------------------
-- 4. TRIGGER
-- ---------------------------------------------------------------------

-- 4a. Buat baris profiles otomatis saat ada akun baru terdaftar.
-- Nama diambil dari metadata pendaftaran: signUp({ options: { data: { nama } } }).
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

-- 4b. Jaga dokumen.jumlah_halaman tetap sama dengan jumlah baris halaman.
-- Pada INSERT hanya NEW yang terisi, pada DELETE hanya OLD, maka coalesce.
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


-- ---------------------------------------------------------------------
-- 5. ROW LEVEL SECURITY (RLS)
-- Setelah RLS aktif, baris hanya terlihat bila ada policy yang mengizinkan.
-- Tanpa policy = tidak ada akses. service_role (Edge Function) melewati RLS.
-- "(select auth.uid())" dibungkus select agar dihitung sekali per query.
-- ---------------------------------------------------------------------
alter table public.profiles        enable row level security;
alter table public.dokumen         enable row level security;
alter table public.halaman_dokumen enable row level security;
alter table public.efek_foto       enable row level security;
alter table public.log_aktivitas   enable row level security;

-- profiles: baca milik sendiri (admin: semua), ubah milik sendiri.
create policy profiles_select on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or public.is_admin());

create policy profiles_update_sendiri on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- dokumen: pemilik penuh; admin hanya baca.
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

-- halaman_dokumen: kepemilikan dicek lewat dokumennya.
create policy halaman_select on public.halaman_dokumen
  for select to authenticated
  using (public.owns_dokumen(dokumen_id) or public.is_admin());

create policy halaman_insert on public.halaman_dokumen
  for insert to authenticated
  with check (public.owns_dokumen(dokumen_id));

create policy halaman_update on public.halaman_dokumen
  for update to authenticated
  using (public.owns_dokumen(dokumen_id))
  with check (public.owns_dokumen(dokumen_id));

create policy halaman_delete on public.halaman_dokumen
  for delete to authenticated
  using (public.owns_dokumen(dokumen_id));

-- efek_foto: kepemilikan dicek lewat halamannya.
create policy efek_select on public.efek_foto
  for select to authenticated
  using (public.owns_halaman(halaman_id) or public.is_admin());

create policy efek_insert on public.efek_foto
  for insert to authenticated
  with check (public.owns_halaman(halaman_id));

create policy efek_update on public.efek_foto
  for update to authenticated
  using (public.owns_halaman(halaman_id))
  with check (public.owns_halaman(halaman_id));

create policy efek_delete on public.efek_foto
  for delete to authenticated
  using (public.owns_halaman(halaman_id));

-- log_aktivitas: hanya admin yang boleh baca. Tidak ada policy tulis,
-- jadi hanya Edge Function (service_role) yang bisa mengisinya.
create policy log_select_admin on public.log_aktivitas
  for select to authenticated
  using (public.is_admin());


-- ---------------------------------------------------------------------
-- 6. HAK AKSES (GRANT) TAMBAHAN
-- Lapisan kedua di luar RLS: membatasi KOLOM yang boleh ditulis klien.
-- Contoh: pengguna tidak bisa mengubah role, is_aktif, atau jumlah_halaman.
-- ---------------------------------------------------------------------
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
