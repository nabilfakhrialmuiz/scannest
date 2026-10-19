import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  adalahPenuh,
  cocokkan,
  cropPenuh,
  geserCrop,
  masukkanKeFoto,
  rapikanCrop,
  ubahSudut,
  ukuranMinimum,
} from '../src/features/editor/crop.ts';

const FOTO = { w: 1000, h: 800 };

describe('crop', () => {
  it('ukuranMinimum: 10% sisi terpendek, minimal 16, tidak melebihi foto', () => {
    assert.deepEqual(ukuranMinimum(FOTO), { w: 80, h: 80 });
    assert.deepEqual(ukuranMinimum({ w: 100, h: 100 }), { w: 16, h: 16 });
    assert.deepEqual(ukuranMinimum({ w: 10, h: 500 }), { w: 10, h: 16 });
  });

  it('cropPenuh dan adalahPenuh', () => {
    assert.deepEqual(cropPenuh(FOTO), { x: 0, y: 0, w: 1000, h: 800 });
    assert.ok(adalahPenuh(cropPenuh(FOTO), FOTO));
    assert.ok(!adalahPenuh({ x: 1, y: 0, w: 999, h: 800 }, FOTO));
  });

  it('rapikanCrop: penuh jadi null, null tetap null', () => {
    assert.equal(rapikanCrop(cropPenuh(FOTO), FOTO), null);
    assert.equal(rapikanCrop(null, FOTO), null);
  });

  it('rapikanCrop: dibulatkan, dimasukkan ke dalam foto, dan tidak terlalu kecil', () => {
    assert.deepEqual(rapikanCrop({ x: 10.4, y: 20.6, w: 300.2, h: 200.7 }, FOTO), {
      x: 10,
      y: 21,
      w: 300,
      h: 201,
    });
    assert.deepEqual(rapikanCrop({ x: 900, y: 700, w: 300, h: 300 }, FOTO), {
      x: 700,
      y: 500,
      w: 300,
      h: 300,
    });
    assert.deepEqual(rapikanCrop({ x: -50, y: -50, w: 200, h: 200 }, FOTO), {
      x: 0,
      y: 0,
      w: 200,
      h: 200,
    });
    assert.deepEqual(rapikanCrop({ x: 10, y: 10, w: 1, h: 1 }, FOTO), {
      x: 10,
      y: 10,
      w: 80,
      h: 80,
    });
  });

  it('masukkanKeFoto: crop penuh tetap penuh (tidak jadi null)', () => {
    assert.deepEqual(masukkanKeFoto(cropPenuh(FOTO), FOTO), cropPenuh(FOTO));
    assert.deepEqual(masukkanKeFoto({ x: 5.5, y: 5.5, w: 2000, h: 2000 }, FOTO), {
      x: 0,
      y: 0,
      w: 1000,
      h: 800,
    });
  });

  it('cocokkan: contain, tanpa membuat tinggi atau lebar nol', () => {
    const a = cocokkan({ w: 1000, h: 500 }, { w: 400, h: 600 });
    assert.deepEqual([a.w, a.h, a.skala], [400, 200, 0.4]);
    const b = cocokkan({ w: 500, h: 1000 }, { w: 400, h: 600 });
    assert.deepEqual([b.w, b.h, b.skala], [300, 600, 0.6]);
    assert.deepEqual(cocokkan({ w: 0, h: 0 }, { w: 400, h: 600 }), { w: 0, h: 0, skala: 0 });
    assert.deepEqual(cocokkan({ w: 100, h: 100 }, { w: 0, h: 600 }), { w: 0, h: 0, skala: 0 });
  });

  it('geserCrop: ukuran tetap, posisi ditahan di dalam foto', () => {
    const awal = { x: 100, y: 100, w: 300, h: 200 };
    assert.deepEqual(geserCrop(awal, 50, -20, FOTO), { x: 150, y: 80, w: 300, h: 200 });
    assert.deepEqual(geserCrop(awal, -999, -999, FOTO), { x: 0, y: 0, w: 300, h: 200 });
    assert.deepEqual(geserCrop(awal, 9999, 9999, FOTO), { x: 700, y: 600, w: 300, h: 200 });
  });

  it('ubahSudut nw: sudut seberang (se) tetap', () => {
    const awal = { x: 100, y: 100, w: 300, h: 200 };
    assert.deepEqual(ubahSudut(awal, 'nw', 50, 30, FOTO), { x: 150, y: 130, w: 250, h: 170 });
    assert.deepEqual(ubahSudut(awal, 'nw', -999, -999, FOTO), { x: 0, y: 0, w: 400, h: 300 });
    // ditarik melewati sudut seberang: berhenti di ukuran minimum
    assert.deepEqual(ubahSudut(awal, 'nw', 999, 999, FOTO), { x: 320, y: 220, w: 80, h: 80 });
  });

  it('ubahSudut ne, sw, se', () => {
    const awal = { x: 100, y: 100, w: 300, h: 200 };
    assert.deepEqual(ubahSudut(awal, 'ne', 50, -30, FOTO), { x: 100, y: 70, w: 350, h: 230 });
    assert.deepEqual(ubahSudut(awal, 'sw', -50, 30, FOTO), { x: 50, y: 100, w: 350, h: 230 });
    assert.deepEqual(ubahSudut(awal, 'se', 9999, 9999, FOTO), { x: 100, y: 100, w: 900, h: 700 });
    assert.deepEqual(ubahSudut(awal, 'se', -9999, -9999, FOTO), { x: 100, y: 100, w: 80, h: 80 });
  });

  it('hasil ubahSudut selalu di dalam foto dan tidak lebih kecil dari minimum', () => {
    const min = ukuranMinimum(FOTO);
    for (const sudut of ['nw', 'ne', 'sw', 'se'])
      for (const dx of [-5000, -300, -1, 0, 1, 300, 5000])
        for (const dy of [-5000, -300, -1, 0, 1, 300, 5000]) {
          const c = ubahSudut({ x: 200, y: 150, w: 400, h: 300 }, sudut, dx, dy, FOTO);
          assert.ok(
            c.x >= 0 && c.y >= 0 && c.x + c.w <= FOTO.w && c.y + c.h <= FOTO.h,
            JSON.stringify([sudut, dx, dy, c]),
          );
          assert.ok(c.w >= min.w && c.h >= min.h, JSON.stringify([sudut, dx, dy, c]));
        }
  });
});
