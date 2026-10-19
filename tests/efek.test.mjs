import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildCloudinaryUrl,
  komponenTransformasi,
  cropSah,
} from '../src/features/editor/cloudinaryUrl.ts';
import {
  EFEK_BAWAAN,
  DAFTAR_FILTER,
  adalahBawaan,
  bulatkanSlider,
  putar90,
  samaEfek,
} from '../src/features/editor/efek.ts';

const ASLI = 'https://res.cloudinary.com/demo/image/upload/v1791777081/scannest/abc123.jpg';
const efek = (o = {}) => ({ ...EFEK_BAWAAN, ...o });

describe('buildCloudinaryUrl', () => {
  it('foto asli tanpa efek: URL tidak berubah', () => {
    assert.equal(buildCloudinaryUrl(ASLI, EFEK_BAWAAN), ASLI);
  });

  it('tiap filter menghasilkan komponen yang benar', () => {
    const hasil = {
      asli: ASLI,
      dokumen:
        'https://res.cloudinary.com/demo/image/upload/e_improve/v1791777081/scannest/abc123.jpg',
      hitam_putih:
        'https://res.cloudinary.com/demo/image/upload/e_blackwhite/v1791777081/scannest/abc123.jpg',
      abu_abu:
        'https://res.cloudinary.com/demo/image/upload/e_grayscale/v1791777081/scannest/abc123.jpg',
      tajam:
        'https://res.cloudinary.com/demo/image/upload/e_sharpen/v1791777081/scannest/abc123.jpg',
    };
    for (const f of DAFTAR_FILTER)
      assert.equal(buildCloudinaryUrl(ASLI, efek({ filter: f })), hasil[f], f);
  });

  it('rotasi 90, 180, 270; 0 tidak menambah komponen', () => {
    assert.deepEqual(komponenTransformasi(efek({ rotasi: 0 })), []);
    assert.deepEqual(komponenTransformasi(efek({ rotasi: 90 })), ['a_90']);
    assert.deepEqual(komponenTransformasi(efek({ rotasi: 180 })), ['a_180']);
    assert.deepEqual(komponenTransformasi(efek({ rotasi: 270 })), ['a_270']);
  });

  it('kecerahan dan kontras; nol dihilangkan', () => {
    assert.deepEqual(komponenTransformasi(efek({ kecerahan: 20 })), ['e_brightness:20']);
    assert.deepEqual(komponenTransformasi(efek({ kontras: -35 })), ['e_contrast:-35']);
    assert.deepEqual(komponenTransformasi(efek({ kecerahan: 0, kontras: 0 })), []);
  });

  it('kecerahan -100 dipaksa -99 (Cloudinary menolak -100); +100 dan kontras +-100 tetap', () => {
    assert.deepEqual(komponenTransformasi(efek({ kecerahan: -100 })), ['e_brightness:-99']);
    assert.deepEqual(komponenTransformasi(efek({ kecerahan: 100 })), ['e_brightness:100']);
    assert.deepEqual(komponenTransformasi(efek({ kontras: -100 })), ['e_contrast:-100']);
    assert.deepEqual(komponenTransformasi(efek({ kontras: 100 })), ['e_contrast:100']);
  });

  it('nilai di luar rentang dipotong, pecahan dibulatkan', () => {
    assert.deepEqual(komponenTransformasi(efek({ kecerahan: 500, kontras: -500 })), [
      'e_brightness:100',
      'e_contrast:-100',
    ]);
    assert.deepEqual(komponenTransformasi(efek({ kecerahan: 19.6 })), ['e_brightness:20']);
  });

  it('crop: pakai g_north_west dan pembulatan', () => {
    assert.deepEqual(komponenTransformasi(efek({ crop: { x: 100, y: 50, w: 600, h: 400 } })), [
      'c_crop,g_north_west,h_400,w_600,x_100,y_50',
    ]);
    assert.deepEqual(komponenTransformasi(efek({ crop: { x: 10.4, y: 0.6, w: 99.5, h: 80.2 } })), [
      'c_crop,g_north_west,h_80,w_100,x_10,y_1',
    ]);
  });

  it('crop tak sah diabaikan (negatif, nol, NaN, Infinity)', () => {
    for (const crop of [
      { x: -5, y: 0, w: 10, h: 10 },
      { x: 0, y: 0, w: 0, h: 10 },
      { x: 0, y: 0, w: 10, h: 0.2 },
      { x: NaN, y: 0, w: 10, h: 10 },
      { x: 0, y: 0, w: Infinity, h: 10 },
      null,
    ]) {
      assert.equal(cropSah(crop), false);
      assert.deepEqual(komponenTransformasi(efek({ crop })), []);
    }
  });

  it('urutan rantai: crop -> rotasi -> filter -> kecerahan -> kontras', () => {
    const url = buildCloudinaryUrl(
      ASLI,
      efek({
        crop: { x: 100, y: 50, w: 600, h: 400 },
        rotasi: 90,
        filter: 'dokumen',
        kecerahan: 20,
        kontras: 10,
      }),
    );
    assert.equal(
      url,
      'https://res.cloudinary.com/demo/image/upload/c_crop,g_north_west,h_400,w_600,x_100,y_50/a_90/e_improve/e_brightness:20/e_contrast:10/v1791777081/scannest/abc123.jpg',
    );
  });

  it('semua kombinasi filter x rotasi x kecerahan x kontras x crop: tiap URL sah dan unik', () => {
    const lihat = new Set();
    let n = 0;
    for (const filter of DAFTAR_FILTER)
      for (const rotasi of [0, 90, 180, 270])
        for (const kecerahan of [-100, 0, 35, 100])
          for (const kontras of [-100, 0, 35, 100])
            for (const crop of [null, { x: 0, y: 0, w: 500, h: 400 }]) {
              const url = buildCloudinaryUrl(ASLI, { filter, rotasi, kecerahan, kontras, crop });
              assert.ok(url?.startsWith('https://res.cloudinary.com/demo/image/upload/'));
              assert.ok(url.endsWith('/v1791777081/scannest/abc123.jpg') || url === ASLI);
              assert.ok(!url.includes('//e_') && !url.includes('/ /') && !url.includes(',,'));
              assert.ok(!/e_brightness:-100/.test(url));
              lihat.add(url);
              n++;
            }
    // kecerahan -100 dan -99 menghasilkan URL yang sama, jadi unik < n; tetap harus banyak.
    assert.equal(n, 5 * 4 * 4 * 4 * 2);
    assert.ok(lihat.size > 300);
  });

  it('opsi sisiMaks menambah c_limit dan q_auto di akhir rantai', () => {
    const url = buildCloudinaryUrl(ASLI, efek({ filter: 'dokumen' }), { sisiMaks: 1200 });
    assert.equal(
      url,
      'https://res.cloudinary.com/demo/image/upload/e_improve/c_limit,h_1200,w_1200/q_auto/v1791777081/scannest/abc123.jpg',
    );
    assert.equal(
      buildCloudinaryUrl(ASLI, EFEK_BAWAAN, { sisiMaks: 240 }),
      'https://res.cloudinary.com/demo/image/upload/c_limit,h_240,w_240/q_auto/v1791777081/scannest/abc123.jpg',
    );
  });

  it('URL tak dikenali atau sudah bertransformasi: null', () => {
    assert.equal(buildCloudinaryUrl('https://contoh.com/foto.jpg', EFEK_BAWAAN), null);
    assert.equal(buildCloudinaryUrl('', EFEK_BAWAAN), null);
    assert.equal(
      buildCloudinaryUrl(
        'https://res.cloudinary.com/demo/image/upload/e_improve/v1/scannest/a.jpg',
        EFEK_BAWAAN,
      ),
      null,
    );
  });

  it('public_id tanpa versi tetap diterima', () => {
    assert.equal(
      buildCloudinaryUrl(
        'https://res.cloudinary.com/demo/image/upload/scannest/abc.jpg',
        efek({ rotasi: 90 }),
      ),
      'https://res.cloudinary.com/demo/image/upload/a_90/scannest/abc.jpg',
    );
  });
});

describe('efek', () => {
  it('bulatkanSlider: kelipatan 5 dan terbatas -100..100', () => {
    assert.equal(bulatkanSlider(0), 0);
    assert.equal(bulatkanSlider(12), 10);
    assert.equal(bulatkanSlider(13), 15);
    assert.equal(bulatkanSlider(-12), -10);
    assert.equal(bulatkanSlider(-13), -15);
    assert.equal(bulatkanSlider(500), 100);
    assert.equal(bulatkanSlider(-500), -100);
  });

  it('putar90 berputar 0 -> 90 -> 180 -> 270 -> 0', () => {
    assert.equal(putar90(0), 90);
    assert.equal(putar90(90), 180);
    assert.equal(putar90(180), 270);
    assert.equal(putar90(270), 0);
  });

  it('samaEfek dan adalahBawaan', () => {
    assert.ok(adalahBawaan(EFEK_BAWAAN));
    assert.ok(
      samaEfek(
        efek({ crop: { x: 1, y: 2, w: 3, h: 4 } }),
        efek({ crop: { x: 1, y: 2, w: 3, h: 4 } }),
      ),
    );
    assert.ok(!samaEfek(efek({ crop: { x: 1, y: 2, w: 3, h: 4 } }), efek({ crop: null })));
    assert.ok(!samaEfek(efek({ filter: 'tajam' }), EFEK_BAWAAN));
    assert.ok(!adalahBawaan(efek({ kontras: 5 })));
  });
});
