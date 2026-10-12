-- =====================================================================
-- Scannest | Uji keamanan RLS (tugas 2.8 di ROADMAP.md)
--
-- CARA PAKAI
-- 1. Buat dua akun biasa lewat aplikasi atau Dashboard Supabase
--    (Authentication -> Users -> Add user). Keduanya BUKAN admin.
-- 2. Ganti GANTI_EMAIL_A dan GANTI_EMAIL_B di bawah dengan email keduanya.
-- 3. Tempel seluruh isi file ini di SQL Editor Supabase, lalu klik Run.
--
-- CARA MEMBACA HASIL
-- Seluruh uji berjalan di dalam SATU blok DO yang di akhir sengaja
-- memunculkan error berisi laporan. Itu bukan kegagalan: dengan begitu
-- semua perubahan uji (akun dijadikan admin, dinonaktifkan, dokumen uji)
-- otomatis DIBATALKAN dan data aslimu tidak berubah.
-- Cari baris "Ringkasan". Yang diharapkan: 0 gagal.
-- =====================================================================

do $uji$
declare
  v_a        uuid;
  v_b        uuid;
  v_doc      uuid;
  v_hal1     uuid;
  v_hal2     uuid;
  n          integer;
  v_flag     boolean;
  v_nama     text;
  v_log      text := '';
  v_lulus    integer;
  v_gagal    integer;
begin
  -- ---------- Persiapan (berjalan sebagai pemilik database) ----------
  select id into v_a from auth.users where email = 'GANTI_EMAIL_A';
  select id into v_b from auth.users where email = 'GANTI_EMAIL_B';
  if v_a is null or v_b is null then
    raise exception 'Akun uji tidak ditemukan. Periksa email A dan B di bagian atas file.';
  end if;

  -- Satu baris log contoh agar uji "tidak bisa baca log" bermakna.
  insert into public.log_aktivitas (admin_id, aksi, keterangan)
  values (null, 'hapus_dokumen', 'baris contoh uji');

  -- ================= BAGIAN 1: akun A (pengguna biasa) =================
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_a, 'role', 'authenticated')::text, true);
  set local role authenticated;

  begin
    insert into public.dokumen (user_id, judul) values (v_a, 'Dokumen A1') returning id into v_doc;
    v_log := v_log || E'LULUS  A bisa membuat dokumen miliknya\n';
  exception when others then
    v_log := v_log || E'GAGAL  A bisa membuat dokumen miliknya: ' || sqlerrm || E'\n';
  end;

  begin
    insert into public.dokumen (user_id, judul) values (v_b, 'curang');
    v_log := v_log || E'GAGAL  A TIDAK boleh membuat dokumen atas nama B\n';
  exception when insufficient_privilege then
    v_log := v_log || E'LULUS  A tidak bisa membuat dokumen atas nama B\n';
  end;

  begin
    insert into public.dokumen (user_id, judul, jumlah_halaman) values (v_a, 'curang', 99);
    v_log := v_log || E'GAGAL  A TIDAK boleh mengisi jumlah_halaman sendiri\n';
  exception when insufficient_privilege then
    v_log := v_log || E'LULUS  A tidak bisa mengisi jumlah_halaman sendiri\n';
  end;

  begin
    insert into public.halaman_dokumen (dokumen_id, urutan, url_asli, url_hasil, public_id, ukuran_byte)
    values (v_doc, 1, 'https://contoh/1.jpg', 'https://contoh/1.jpg', 'scannest/uji1', 1000)
    returning id into v_hal1;
    insert into public.halaman_dokumen (dokumen_id, urutan, url_asli, url_hasil, public_id, ukuran_byte)
    values (v_doc, 2, 'https://contoh/2.jpg', 'https://contoh/2.jpg', 'scannest/uji2', 2000)
    returning id into v_hal2;
    v_log := v_log || E'LULUS  A bisa menambah halaman ke dokumennya\n';
  exception when others then
    v_log := v_log || E'GAGAL  A bisa menambah halaman: ' || sqlerrm || E'\n';
  end;

  select jumlah_halaman into n from public.dokumen where id = v_doc;
  v_log := v_log || case when n = 2 then 'LULUS  ' else 'GAGAL  ' end
        || 'jumlah_halaman otomatis = 2 (nilai: ' || coalesce(n::text, 'null') || E')\n';

  begin
    update public.halaman_dokumen set urutan = 3 - urutan where dokumen_id = v_doc;
    v_log := v_log || E'LULUS  Tukar urutan halaman 1 dan 2 berhasil (unique deferrable)\n';
  exception when others then
    v_log := v_log || E'GAGAL  Tukar urutan halaman: ' || sqlerrm || E'\n';
  end;

  begin
    insert into public.efek_foto (halaman_id, jenis_filter, kecerahan)
    values (v_hal1, 'dokumen', 10)
    on conflict (halaman_id) do update
      set halaman_id = excluded.halaman_id, jenis_filter = excluded.jenis_filter,
          kecerahan = excluded.kecerahan;
    insert into public.efek_foto (halaman_id, jenis_filter, kecerahan)
    values (v_hal1, 'hitam_putih', 20)
    on conflict (halaman_id) do update
      set halaman_id = excluded.halaman_id, jenis_filter = excluded.jenis_filter,
          kecerahan = excluded.kecerahan;
    select count(*) into n from public.efek_foto where halaman_id = v_hal1 and kecerahan = 20;
    v_log := v_log || case when n = 1 then 'LULUS  ' else 'GAGAL  ' end
          || E'Simpan efek foto dua kali (upsert) menghasilkan 1 baris terbaru\n';
  exception when others then
    v_log := v_log || E'GAGAL  Upsert efek_foto: ' || sqlerrm || E'\n';
  end;

  begin
    insert into public.efek_foto (halaman_id, rotasi) values (v_hal2, 45);
    v_log := v_log || E'GAGAL  Rotasi 45 derajat TIDAK boleh diterima\n';
  exception when check_violation then
    v_log := v_log || E'LULUS  Rotasi selain 0/90/180/270 ditolak (check constraint)\n';
  end;

  begin
    update public.profiles set nama = 'Nama Baru Uji' where id = v_a;
    select nama into v_nama from public.profiles where id = v_a;
    v_log := v_log || case when v_nama = 'Nama Baru Uji' then 'LULUS  ' else 'GAGAL  ' end
          || E'A bisa mengubah nama profilnya sendiri\n';
  exception when others then
    v_log := v_log || E'GAGAL  A mengubah nama sendiri: ' || sqlerrm || E'\n';
  end;

  begin
    update public.profiles set role = 'admin' where id = v_a;
    v_log := v_log || E'GAGAL  A TIDAK boleh menjadikan dirinya admin\n';
  exception when insufficient_privilege then
    v_log := v_log || E'LULUS  A tidak bisa mengubah role sendiri menjadi admin\n';
  end;

  begin
    update public.profiles set is_aktif = true where id = v_a;
    v_log := v_log || E'GAGAL  A TIDAK boleh mengubah is_aktif sendiri\n';
  exception when insufficient_privilege then
    v_log := v_log || E'LULUS  A tidak bisa mengubah is_aktif sendiri\n';
  end;

  select count(*) into n from public.profiles;
  v_log := v_log || case when n = 1 then 'LULUS  ' else 'GAGAL  ' end
        || 'A hanya melihat profilnya sendiri (terlihat: ' || n || E')\n';

  select count(*) into n from public.log_aktivitas;
  v_log := v_log || case when n = 0 then 'LULUS  ' else 'GAGAL  ' end
        || E'A tidak bisa membaca log aktivitas\n';

  begin
    insert into public.log_aktivitas (aksi) values ('hapus_akun');
    v_log := v_log || E'GAGAL  A TIDAK boleh menulis log aktivitas\n';
  exception when insufficient_privilege then
    v_log := v_log || E'LULUS  A tidak bisa menulis log aktivitas\n';
  end;

  v_flag := public.is_admin();
  v_log := v_log || case when v_flag = false then 'LULUS  ' else 'GAGAL  ' end
        || E'is_admin() bernilai false untuk A\n';

  -- ================= BAGIAN 2: akun B (pengguna biasa lain) =================
  reset role;
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_b, 'role', 'authenticated')::text, true);
  set local role authenticated;

  select count(*) into n from public.dokumen where id = v_doc;
  v_log := v_log || case when n = 0 then 'LULUS  ' else 'GAGAL  ' end
        || E'B tidak bisa melihat dokumen milik A\n';

  select count(*) into n from public.halaman_dokumen where dokumen_id = v_doc;
  v_log := v_log || case when n = 0 then 'LULUS  ' else 'GAGAL  ' end
        || E'B tidak bisa melihat halaman milik A\n';

  select count(*) into n from public.efek_foto where halaman_id = v_hal1;
  v_log := v_log || case when n = 0 then 'LULUS  ' else 'GAGAL  ' end
        || E'B tidak bisa melihat efek foto milik A\n';

  select count(*) into n from public.profiles where id = v_a;
  v_log := v_log || case when n = 0 then 'LULUS  ' else 'GAGAL  ' end
        || E'B tidak bisa melihat profil A\n';

  update public.dokumen set judul = 'dibajak' where id = v_doc;
  get diagnostics n = row_count;
  v_log := v_log || case when n = 0 then 'LULUS  ' else 'GAGAL  ' end
        || E'B tidak bisa mengubah dokumen A (0 baris terpengaruh)\n';

  delete from public.dokumen where id = v_doc;
  get diagnostics n = row_count;
  v_log := v_log || case when n = 0 then 'LULUS  ' else 'GAGAL  ' end
        || E'B tidak bisa menghapus dokumen A (0 baris terpengaruh)\n';

  begin
    insert into public.halaman_dokumen (dokumen_id, urutan, url_asli, url_hasil, public_id, ukuran_byte)
    values (v_doc, 9, 'x', 'x', 'x', 1);
    v_log := v_log || E'GAGAL  B TIDAK boleh menambah halaman ke dokumen A\n';
  exception when insufficient_privilege then
    v_log := v_log || E'LULUS  B tidak bisa menambah halaman ke dokumen A\n';
  end;

  begin
    insert into public.efek_foto (halaman_id) values (v_hal2);
    v_log := v_log || E'GAGAL  B TIDAK boleh menambah efek ke halaman A\n';
  exception when insufficient_privilege then
    v_log := v_log || E'LULUS  B tidak bisa menambah efek ke halaman A\n';
  end;

  -- ================= BAGIAN 3: B dijadikan admin sementara =================
  reset role;
  update public.profiles set role = 'admin' where id = v_b;

  perform set_config('request.jwt.claims',
    json_build_object('sub', v_b, 'role', 'authenticated')::text, true);
  set local role authenticated;

  v_flag := public.is_admin();
  v_log := v_log || case when v_flag then 'LULUS  ' else 'GAGAL  ' end
        || E'is_admin() bernilai true untuk B setelah dijadikan admin\n';

  select count(*) into n from public.dokumen where id = v_doc;
  v_log := v_log || case when n = 1 then 'LULUS  ' else 'GAGAL  ' end
        || E'Admin bisa membaca dokumen pengguna lain\n';

  select count(*) into n from public.halaman_dokumen where dokumen_id = v_doc;
  v_log := v_log || case when n = 2 then 'LULUS  ' else 'GAGAL  ' end
        || E'Admin bisa membaca halaman dokumen pengguna lain\n';

  select count(*) into n from public.profiles;
  v_log := v_log || case when n >= 2 then 'LULUS  ' else 'GAGAL  ' end
        || E'Admin bisa membaca profil semua pengguna\n';

  select count(*) into n from public.log_aktivitas;
  v_log := v_log || case when n >= 1 then 'LULUS  ' else 'GAGAL  ' end
        || E'Admin bisa membaca log aktivitas\n';

  update public.dokumen set judul = 'diubah admin' where id = v_doc;
  get diagnostics n = row_count;
  v_log := v_log || case when n = 0 then 'LULUS  ' else 'GAGAL  ' end
        || E'Admin hanya baca: tidak bisa mengubah dokumen langsung dari aplikasi\n';

  delete from public.dokumen where id = v_doc;
  get diagnostics n = row_count;
  v_log := v_log || case when n = 0 then 'LULUS  ' else 'GAGAL  ' end
        || E'Admin hanya baca: tidak bisa menghapus dokumen langsung dari aplikasi\n';

  begin
    insert into public.log_aktivitas (aksi) values ('hapus_akun');
    v_log := v_log || E'GAGAL  Admin TIDAK boleh menulis log dari aplikasi\n';
  exception when insufficient_privilege then
    v_log := v_log || E'LULUS  Log hanya bisa ditulis Edge Function (admin pun ditolak dari aplikasi)\n';
  end;

  -- ================= BAGIAN 4: A dinonaktifkan =================
  reset role;
  update public.profiles set is_aktif = false where id = v_a;

  perform set_config('request.jwt.claims',
    json_build_object('sub', v_a, 'role', 'authenticated')::text, true);
  set local role authenticated;

  select count(*) into n from public.dokumen where id = v_doc;
  v_log := v_log || case when n = 0 then 'LULUS  ' else 'GAGAL  ' end
        || E'Akun nonaktif tidak bisa melihat dokumennya sendiri\n';

  begin
    insert into public.dokumen (user_id, judul) values (v_a, 'dari akun nonaktif');
    v_log := v_log || E'GAGAL  Akun nonaktif TIDAK boleh membuat dokumen\n';
  exception when insufficient_privilege then
    v_log := v_log || E'LULUS  Akun nonaktif tidak bisa membuat dokumen\n';
  end;

  -- ================= BAGIAN 5: penghapusan akun (cascade) =================
  reset role;
  begin
    delete from auth.users where id = v_a;
    select count(*) into n from public.dokumen where id = v_doc;
    select n + count(*) into n from public.halaman_dokumen where dokumen_id = v_doc;
    select n + count(*) into n from public.profiles where id = v_a;
    v_log := v_log || case when n = 0 then 'LULUS  ' else 'GAGAL  ' end
          || E'Hapus akun A ikut menghapus profil, dokumen, dan halamannya (cascade)\n';
  exception when others then
    v_log := v_log || E'GAGAL  Hapus akun A (cascade): ' || sqlerrm || E'\n';
  end;

  -- ---------- Laporan ----------
  v_lulus := (length(v_log) - length(replace(v_log, 'LULUS', ''))) / 5;
  v_gagal := (length(v_log) - length(replace(v_log, 'GAGAL', ''))) / 5;

  raise exception E'\n\n===== HASIL UJI RLS SCANNEST =====\n%\nRingkasan: % lulus, % gagal\n%\n(Pesan ini sengaja berbentuk error agar semua perubahan uji dibatalkan otomatis.)\n',
    v_log, v_lulus, v_gagal,
    case when v_gagal = 0 then 'SEMUA UJI LULUS.' else 'ADA UJI GAGAL: periksa baris GAGAL di atas.' end;
end
$uji$;
