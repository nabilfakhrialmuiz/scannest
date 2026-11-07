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
