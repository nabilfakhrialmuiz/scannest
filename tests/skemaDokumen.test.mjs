import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { daftarDokumenDariBaris, dokumenDetailDariBaris } from '../src/features/dokumen/skema.ts';

const baris = (id, extra = {}) => ({
  id,
  judul: `Dokumen ${id}`,
  status: 'draft',
  jumlah_halaman: 2,
  dibuat_pada: '2026-10-17T05:40:00Z',
  halaman_dokumen: [{ urutan: 1, url_hasil: `https://x/${id}.jpg` }],
  ...extra,
});

describe('daftarDokumenDariBaris', () => {
  it('memetakan baris dan mengambil url_hasil halaman berurutan terkecil sebagai sampul', () => {
    const [d] = daftarDokumenDariBaris([
      baris('a', {
        halaman_dokumen: [
          { urutan: 3, url_hasil: 'https://x/3.jpg' },
          { urutan: 1, url_hasil: 'https://x/1.jpg' },
        ],
      }),
    ]);
    assert.equal(d.urlSampul, 'https://x/1.jpg');
    assert.equal(d.jumlahHalaman, 2);
    assert.equal(d.status, 'draft');
  });
  it('dokumen tanpa halaman: sampul null', () => {
    const [d] = daftarDokumenDariBaris([baris('a', { halaman_dokumen: [] })]);
    assert.equal(d.urlSampul, null);
  });
  it('baris rusak dilewati, yang benar tetap masuk', () => {
    const hasil = daftarDokumenDariBaris([
      baris('a'),
      { id: 1 },
      baris('b', { status: 'aneh' }),
      null,
    ]);
    assert.deepEqual(
      hasil.map((x) => x.id),
      ['a'],
    );
  });
  it('bukan larik: kosong', () => {
    assert.deepEqual(daftarDokumenDariBaris(null), []);
    assert.deepEqual(daftarDokumenDariBaris({}), []);
  });
});

describe('dokumenDetailDariBaris', () => {
  const detail = {
    id: 'd1',
    judul: 'Kontrak',
    status: 'selesai',
    dibuat_pada: '2026-10-17T05:40:00Z',
    halaman_dokumen: [
      { id: 'h2', urutan: 2, url_hasil: 'https://x/2.jpg' },
      { id: 'h1', urutan: 1, url_hasil: 'https://x/1.jpg' },
    ],
  };
  it('mengurutkan halaman menurut urutan', () => {
    const d = dokumenDetailDariBaris(detail);
    assert.deepEqual(
      d.halaman.map((h) => h.id),
      ['h1', 'h2'],
    );
  });
  it('bentuk salah: null', () => {
    assert.equal(dokumenDetailDariBaris({ ...detail, status: 'x' }), null);
    assert.equal(dokumenDetailDariBaris(null), null);
  });
});