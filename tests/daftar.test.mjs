import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  UKURAN_HALAMAN,
  formatTanggal,
  gabungTanpaGanda,
  labelHalaman,
  polaPencarian,
  rentangHalaman,
} from '../src/features/dokumen/daftar.ts';

describe('rentangHalaman', () => {
  it('halaman pertama 0..19 dan berikutnya berurutan tanpa celah', () => {
    assert.deepEqual(rentangHalaman(0), { dari: 0, sampai: UKURAN_HALAMAN - 1 });
    assert.deepEqual(rentangHalaman(1), { dari: 20, sampai: 39 });
    assert.deepEqual(rentangHalaman(2, 10), { dari: 20, sampai: 29 });
  });
});

describe('polaPencarian', () => {
  it('kosong atau spasi saja berarti tanpa pencarian', () => {
    assert.equal(polaPencarian(''), null);
    assert.equal(polaPencarian('   '), null);
  });
  it('dibungkus % dan spasi tepi dibuang', () => {
    assert.equal(polaPencarian('  kontrak '), '%kontrak%');
  });
  it('karakter khusus LIKE di-escape', () => {
    assert.equal(polaPencarian('50%_a\\b'), '%50\\%\\_a\\\\b%');
  });
  it('dibatasi 100 karakter', () => {
    assert.equal(polaPencarian('a'.repeat(300)), `%${'a'.repeat(100)}%`);
  });
});

describe('formatTanggal', () => {
  it('memakai bulan singkat Indonesia', () => {
    const iso = new Date(2026, 9, 17, 12, 0).toISOString();
    assert.equal(formatTanggal(iso), '17 Okt 2026');
    assert.equal(formatTanggal(new Date(2026, 4, 3, 12).toISOString()), '3 Mei 2026');
  });
  it('teks tidak terbaca menjadi tanda hubung', () => {
    assert.equal(formatTanggal('bukan tanggal'), '-');
  });
});

describe('labelHalaman', () => {
  it('menulis jumlah', () => assert.equal(labelHalaman(3), '3 halaman'));
});

describe('gabungTanpaGanda', () => {
  it('membuang id ganda antarhalaman dan menjaga urutan pertama kali muncul', () => {
    const hasil = gabungTanpaGanda([[{ id: 'a' }, { id: 'b' }], [{ id: 'b' }, { id: 'c' }], []]);
    assert.deepEqual(
      hasil.map((x) => x.id),
      ['a', 'b', 'c'],
    );
  });
});