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
