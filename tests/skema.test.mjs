import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  barisUntukSimpan,
  dokumenPercantikDariBaris,
  efekDariBaris,
  halamanEditorDariBaris,
} from '../src/features/editor/skema.ts';

const BARIS = {
  jenis_filter: 'dokumen',
  kecerahan: 20,
  kontras: -10,
  rotasi: 90,
  data_crop: { x: 1, y: 2, w: 300, h: 200 },
};

describe('efekDariBaris', () => {
  it('objek, larik berisi satu objek, null, dan undefined', () => {
    const efek = {
      filter: 'dokumen',
      kecerahan: 20,
      kontras: -10,
      rotasi: 90,
      crop: { x: 1, y: 2, w: 300, h: 200 },
    };
    assert.deepEqual(efekDariBaris(BARIS), efek);
    assert.deepEqual(efekDariBaris([BARIS]), efek);
    assert.equal(efekDariBaris(null), null);
    assert.equal(efekDariBaris(undefined), null);
    assert.equal(efekDariBaris([]), null);
  });

  it('data_crop null atau tak sah menjadi crop null', () => {
    assert.equal(efekDariBaris({ ...BARIS, data_crop: null }).crop, null);
    assert.equal(efekDariBaris({ ...BARIS, data_crop: { x: 1 } }).crop, null);
    assert.equal(efekDariBaris({ ...BARIS, data_crop: { x: -1, y: 0, w: 10, h: 10 } }).crop, null);
    assert.equal(efekDariBaris({ ...BARIS, data_crop: 'x' }).crop, null);
  });

  it('baris rusak dianggap tidak ada efek', () => {
    assert.equal(efekDariBaris({ ...BARIS, jenis_filter: 'sepia' }), null);
    assert.equal(efekDariBaris({ ...BARIS, rotasi: 45 }), null);
    assert.equal(efekDariBaris({ ...BARIS, kecerahan: 101 }), null);
    assert.equal(efekDariBaris({ ...BARIS, kontras: 1.5 }), null);
    assert.equal(efekDariBaris('rusak'), null);
  });
});

describe('barisUntukSimpan', () => {
  it('hanya kolom yang diizinkan grant; crop dibulatkan', () => {
    const baris = barisUntukSimpan('h1', {
      filter: 'tajam',
      kecerahan: 5,
      kontras: 0,
      rotasi: 180,
      crop: { x: 1.4, y: 2.6, w: 100.5, h: 80.2 },
    });
    assert.deepEqual(baris, {
      halaman_id: 'h1',
      jenis_filter: 'tajam',
      kecerahan: 5,
      kontras: 0,
      rotasi: 180,
      data_crop: { x: 1, y: 3, w: 101, h: 80 },
    });
    assert.deepEqual(Object.keys(baris).sort(), [
      'data_crop',
      'halaman_id',
      'jenis_filter',
      'kecerahan',
      'kontras',
      'rotasi',
    ]);
  });
  it('crop tak sah atau null disimpan sebagai null', () => {
    assert.equal(
      barisUntukSimpan('h', { filter: 'asli', kecerahan: 0, kontras: 0, rotasi: 0, crop: null })
        .data_crop,
      null,
    );
    assert.equal(
      barisUntukSimpan('h', {
        filter: 'asli',
        kecerahan: 0,
        kontras: 0,
        rotasi: 0,
        crop: { x: 0, y: 0, w: 0, h: 5 },
      }).data_crop,
      null,
    );
  });
});

describe('halamanEditorDariBaris', () => {
  it('membaca halaman dengan dan tanpa efek', () => {
    const dasar = {
      id: 'h1',
      dokumen_id: 'd1',
      urutan: 2,
      url_asli: 'https://x/image/upload/v1/a.jpg',
    };
    assert.deepEqual(halamanEditorDariBaris({ ...dasar, efek_foto: null }), {
      id: 'h1',
      dokumenId: 'd1',
      urutan: 2,
      urlAsli: dasar.url_asli,
      efek: null,
    });
    assert.equal(halamanEditorDariBaris({ ...dasar, efek_foto: BARIS }).efek.rotasi, 90);
    assert.equal(halamanEditorDariBaris({ id: 'h1' }), null);
  });
});

describe('dokumenPercantikDariBaris', () => {
  const dok = (id, halaman) => ({
    id,
    judul: 'Judul ' + id,
    dibuat_pada: '2026-10-18T01:00:00Z',
    halaman_dokumen: halaman,
  });
  const h = (id, urutan, efek) => ({
    id,
    urutan,
    url_asli: 'https://x/image/upload/v1/' + id + '.jpg',
    efek_foto: efek,
  });

  it('menghitung halaman belum dipercantik, mengurutkan halaman, melewati dokumen kosong dan baris rusak', () => {
    const hasil = dokumenPercantikDariBaris([
      dok('d1', [h('b', 2, null), h('a', 1, BARIS), h('c', 3, [])]),
      dok('d2', []),
      { rusak: true },
      dok('d3', [h('e', 1, BARIS)]),
    ]);
    assert.deepEqual(
      hasil.map((d) => d.id),
      ['d1', 'd3'],
    );
    assert.deepEqual(
      hasil[0].halaman.map((x) => x.id),
      ['a', 'b', 'c'],
    );
    assert.equal(hasil[0].belum, 2);
    assert.equal(hasil[1].belum, 0);
  });
  it('bukan larik: kosong', () => {
    assert.deepEqual(dokumenPercantikDariBaris(null), []);
    assert.deepEqual(dokumenPercantikDariBaris({}), []);
  });
});
