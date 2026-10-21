import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  GalatDokumen,
  galatDariKodeFungsi,
  galatDariPostgrest,
  pesanGalat,
} from '../src/features/dokumen/galat.ts';
import {
  BATAS_BERSAMAAN,
  GalatCloudinary,
  hapusAsetCloudinary,
  prosesHapus,
  tandatangani,
} from '../supabase/functions/delete-document/logic.ts';

const ID = '3f2b8c1e-5a4d-4e0b-9c1a-0123456789ab';
const PEMILIK = 'u1';

describe('tandatangani (tanda tangan Cloudinary)', () => {
  it('cocok dengan contoh resmi di dokumentasi Cloudinary', async () => {
    const sig = await tandatangani(
      {
        eager: 'w_400,h_300,c_pad|w_260,h_200,c_crop',
        public_id: 'sample_image',
        timestamp: 1315060510,
      },
      'abcd',
    );
    assert.equal(sig, 'bfd09f95f331f558cbd1320e67aa8d488770583e');
  });
  it('urutan kunci masukan tidak berpengaruh', async () => {
    const a = await tandatangani({ b: 2, a: 1 }, 's');
    const b = await tandatangani({ a: 1, b: 2 }, 's');
    assert.equal(a, b);
  });
});

describe('hapusAsetCloudinary', () => {
  const konfig = { cloudName: 'demo', apiKey: 'KUNCI', apiSecret: 'abcd' };
  const jawab =
    (isi, status = 200) =>
    async () => ({ ok: status < 400, status, json: async () => isi });

  it('mengirim POST ke endpoint destroy dengan parameter bertanda tangan, tanpa membocorkan secret', async () => {
    let dipanggil;
    const hasil = await hapusAsetCloudinary(
      'pub1',
      konfig,
      async (url, init) => {
        dipanggil = { url, init };
        return { ok: true, status: 200, json: async () => ({ result: 'ok' }) };
      },
      () => 1315060510_000,
    );
    assert.equal(hasil, 'ok');
    assert.equal(dipanggil.url, 'https://api.cloudinary.com/v1_1/demo/image/destroy');
    assert.equal(dipanggil.init.method, 'POST');
    const badan = new URLSearchParams(dipanggil.init.body);
    assert.equal(badan.get('public_id'), 'pub1');
    assert.equal(badan.get('invalidate'), 'true');
    assert.equal(badan.get('timestamp'), '1315060510');
    assert.equal(badan.get('api_key'), 'KUNCI');
    assert.equal(
      badan.get('signature'),
      await tandatangani({ invalidate: 'true', public_id: 'pub1', timestamp: 1315060510 }, 'abcd'),
    );
    assert.ok(!dipanggil.init.body.includes('abcd'), 'secret tidak boleh ikut terkirim');
  });
  it('"not found" dianggap sudah terhapus', async () => {
    assert.equal(
      await hapusAsetCloudinary('p', konfig, jawab({ result: 'not found' })),
      'tidak_ada',
    );
  });
  it('hasil lain atau status galat dilempar', async () => {
    await assert.rejects(
      hapusAsetCloudinary('p', konfig, jawab({ error: { message: 'x' } }, 401)),
      GalatCloudinary,
    );
    await assert.rejects(
      hapusAsetCloudinary('p', konfig, jawab({ result: 'aneh' })),
      GalatCloudinary,
    );
  });
  it('jaringan putus dan balasan bukan JSON dilempar sebagai GalatCloudinary', async () => {
    await assert.rejects(
      hapusAsetCloudinary('p', konfig, async () => {
        throw new TypeError('fetch failed');
      }),
      GalatCloudinary,
    );
    await assert.rejects(
      hapusAsetCloudinary('p', konfig, async () => ({
        ok: false,
        status: 502,
        json: async () => {
          throw new Error('bukan json');
        },
      })),
      GalatCloudinary,
    );
  });
});

function dunia(opsi = {}) {
  const log = [];
  const deps = {
    async cariDokumen(id) {
      log.push(['cari', id]);
      return opsi.dokumen === undefined ? { userId: PEMILIK } : opsi.dokumen;
    },
    async daftarPublicId() {
      log.push(['daftar']);
      return opsi.publicIds ?? ['a', 'b', 'c'];
    },
    async hapusAset(id) {
      log.push(['aset', id]);
      if (opsi.gagalAset?.includes(id)) throw new GalatCloudinary('x');
      return opsi.tidakAda?.includes(id) ? 'tidak_ada' : 'ok';
    },
    async hapusBaris(id) {
      log.push(['baris', id]);
      return opsi.barisTerhapus ?? true;
    },
  };
  return { deps, log };
}

describe('prosesHapus', () => {
  it('sukses: semua aset dihapus LEBIH DULU, baru baris database', async () => {
    const { deps, log } = dunia();
    const r = await prosesHapus({ userId: PEMILIK, dokumenId: ID }, deps);
    assert.deepEqual(r, { status: 200, body: { ok: true, dihapus: 3 } });
    const iBaris = log.findIndex((l) => l[0] === 'baris');
    assert.equal(iBaris, log.length - 1);
    assert.equal(log.filter((l) => l[0] === 'aset').length, 3);
  });
  it('aset yang sudah hilang tidak menggagalkan (aman diulang)', async () => {
    const { deps } = dunia({ tidakAda: ['a', 'b', 'c'] });
    const r = await prosesHapus({ userId: PEMILIK, dokumenId: ID }, deps);
    assert.equal(r.status, 200);
  });
  it('satu aset gagal: 502, baris database TIDAK dihapus, aset lain tetap dicoba', async () => {
    const { deps, log } = dunia({ gagalAset: ['b'] });
    const r = await prosesHapus({ userId: PEMILIK, dokumenId: ID }, deps);
    assert.equal(r.status, 502);
    assert.equal(r.body.kode, 'cloudinary_gagal');
    assert.ok(!log.some((l) => l[0] === 'baris'));
    assert.equal(log.filter((l) => l[0] === 'aset').length, 3);
  });
  it('kegagalan dicatat ke log dengan id aset dan penyebabnya', async () => {
    const { deps } = dunia({ gagalAset: ['b'] });
    const catatan = [];
    deps.catat = (pesan, galat) => catatan.push([pesan, galat?.message]);
    await prosesHapus({ userId: PEMILIK, dokumenId: ID }, deps);
    assert.deepEqual(catatan, [['Gagal menghapus aset b', 'x']]);
    const { deps: d2 } = dunia();
    const catatan2 = [];
    d2.cariDokumen = async () => {
      throw new Error('db mati');
    };
    d2.catat = (pesan, galat) => catatan2.push([pesan, galat?.message]);
    await prosesHapus({ userId: PEMILIK, dokumenId: ID }, d2);
    assert.equal(catatan2.length, 1);
    assert.equal(catatan2[0][1], 'db mati');
  });
  it('belum masuk: 401 tanpa menyentuh database', async () => {
    const { deps, log } = dunia();
    const r = await prosesHapus({ userId: null, dokumenId: ID }, deps);
    assert.equal(r.status, 401);
    assert.equal(log.length, 0);
  });
  it('id bukan UUID atau bukan string: 400', async () => {
    const { deps, log } = dunia();
    for (const bad of [undefined, 5, '', '1; drop table dokumen', ID + 'x']) {
      const r = await prosesHapus({ userId: PEMILIK, dokumenId: bad }, deps);
      assert.equal(r.status, 400);
    }
    assert.equal(log.length, 0);
  });
  it('dokumen tidak terlihat (tidak ada atau bukan haknya menurut RLS): 404', async () => {
    const { deps, log } = dunia({ dokumen: null });
    const r = await prosesHapus({ userId: PEMILIK, dokumenId: ID }, deps);
    assert.equal(r.status, 404);
    assert.ok(!log.some((l) => l[0] === 'aset' || l[0] === 'baris'));
  });
  it('dokumen milik orang lain yang terlihat (mis. admin): 403, tidak ada yang dihapus', async () => {
    const { deps, log } = dunia({ dokumen: { userId: 'orang-lain' } });
    const r = await prosesHapus({ userId: PEMILIK, dokumenId: ID }, deps);
    assert.equal(r.status, 403);
    assert.ok(!log.some((l) => l[0] === 'aset' || l[0] === 'baris'));
  });
  it('baris tidak terhapus setelah aset hilang: 500 dengan kode khusus', async () => {
    const { deps } = dunia({ barisTerhapus: false });
    const r = await prosesHapus({ userId: PEMILIK, dokumenId: ID }, deps);
    assert.equal(r.status, 500);
    assert.equal(r.body.kode, 'gagal_hapus_baris');
  });
  it('galat tak terduga di database menjadi 500 galat_server, bukan pengecualian', async () => {
    const { deps } = dunia();
    deps.cariDokumen = async () => {
      throw new Error('db mati');
    };
    const r = await prosesHapus({ userId: PEMILIK, dokumenId: ID }, deps);
    assert.equal(r.status, 500);
    assert.equal(r.body.kode, 'galat_server');
  });
  it('dokumen tanpa halaman: langsung hapus baris (dihapus: 0)', async () => {
    const { deps } = dunia({ publicIds: [] });
    const r = await prosesHapus({ userId: PEMILIK, dokumenId: ID }, deps);
    assert.deepEqual(r, { status: 200, body: { ok: true, dihapus: 0 } });
  });
  it('public_id kosong diabaikan', async () => {
    const { deps, log } = dunia({ publicIds: ['a', '  ', ''] });
    await prosesHapus({ userId: PEMILIK, dokumenId: ID }, deps);
    assert.equal(log.filter((l) => l[0] === 'aset').length, 1);
  });
  it(`paling banyak ${BATAS_BERSAMAAN} penghapusan berjalan bersamaan`, async () => {
    const { deps } = dunia({ publicIds: Array.from({ length: 30 }, (_, i) => `p${i}`) });
    let aktif = 0;
    let puncak = 0;
    deps.hapusAset = async () => {
      aktif += 1;
      puncak = Math.max(puncak, aktif);
      await new Promise((r) => setTimeout(r, 5));
      aktif -= 1;
      return 'ok';
    };
    const r = await prosesHapus({ userId: PEMILIK, dokumenId: ID }, deps);
    assert.equal(r.body.dihapus, 30);
    assert.ok(puncak <= BATAS_BERSAMAAN && puncak > 1, `puncak=${puncak}`);
  });
});

describe('pemetaan galat di aplikasi', () => {
  it('kode fungsi → jenis galat', () => {
    assert.equal(galatDariKodeFungsi('tidak_ada').kind, 'tidakada');
    assert.equal(galatDariKodeFungsi('bukan_pemilik').kind, 'izin');
    assert.equal(galatDariKodeFungsi('belum_masuk').kind, 'izin');
    assert.equal(galatDariKodeFungsi('cloudinary_gagal').kind, 'cloudinary');
    assert.equal(galatDariKodeFungsi('galat_server').kind, 'lain');
    assert.equal(galatDariKodeFungsi(undefined).kind, 'lain');
  });
  it('galat PostgREST → jenis galat', () => {
    assert.equal(galatDariPostgrest({ code: '42501' }).kind, 'izin');
    assert.equal(galatDariPostgrest({ message: 'TypeError: Failed to fetch' }).kind, 'jaringan');
    assert.equal(galatDariPostgrest({ code: 'XX000', message: 'failed' }).kind, 'lain');
  });
  it('pesanGalat memakai pesan sendiri, selain itu cadangan', () => {
    assert.equal(pesanGalat(new GalatDokumen('jaringan')), new GalatDokumen('jaringan').message);
    assert.equal(pesanGalat(new Error('x'), 'cadangan'), 'cadangan');
  });
});