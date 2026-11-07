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
