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
  select id into v_a from auth.users where email = 'uji8@contoh.com';
  select id into v_b from auth.users where email = 'nfgaming2911@gmail.com';
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
