import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { tambahkanKomponen, urlMini, urlTampil } from '../src/features/dokumen/gambar.ts';

const POLOS = 'https://res.cloudinary.com/demo/image/upload/v1700000000/abc123.jpg';
const DENGAN_EFEK =
  'https://res.cloudinary.com/demo/image/upload/c_crop,h_100,w_200,x_1,y_2/a_90/e_improve/v1700000000/abc123.jpg';

describe('tambahkanKomponen', () => {
  it('menyisipkan komponen sebelum segmen versi pada URL tanpa efek', () => {
    assert.equal(
      tambahkanKomponen(POLOS, ['w_300']),
      'https://res.cloudinary.com/demo/image/upload/w_300/v1700000000/abc123.jpg',
    );
  });
  it('menambah di AKHIR rantai efek, bukan di depannya', () => {
    assert.equal(
      tambahkanKomponen(DENGAN_EFEK, ['c_fill,w_300', 'q_auto']),
      'https://res.cloudinary.com/demo/image/upload/c_crop,h_100,w_200,x_1,y_2/a_90/e_improve/c_fill,w_300/q_auto/v1700000000/abc123.jpg',
    );
  });
  it('bekerja pada URL tanpa segmen versi', () => {
    assert.equal(
      tambahkanKomponen('https://res.cloudinary.com/demo/image/upload/abc123.jpg', ['q_auto']),
      'https://res.cloudinary.com/demo/image/upload/q_auto/abc123.jpg',
    );
  });
  it('tidak menganggap public_id berpola komponen sebagai rantai (segmen terakhir dilindungi)', () => {
    assert.equal(
      tambahkanKomponen('https://res.cloudinary.com/demo/image/upload/a_b.jpg', ['q_auto']),
      'https://res.cloudinary.com/demo/image/upload/q_auto/a_b.jpg',
    );
  });
  it('mengembalikan null untuk URL yang bukan /image/upload/', () => {
    assert.equal(tambahkanKomponen('https://example.com/foto.jpg', ['q_auto']), null);
    assert.equal(
      tambahkanKomponen('https://res.cloudinary.com/demo/video/upload/v1/x.mp4', ['q_auto']),
      null,
    );
  });
  it('tanpa komponen mengembalikan URL apa adanya', () => {
    assert.equal(tambahkanKomponen(POLOS, []), POLOS);
  });
});

describe('urlMini dan urlTampil', () => {
  it('urlMini: persegi, atas dipertahankan, format dan mutu otomatis', () => {
    assert.equal(
      urlMini(DENGAN_EFEK),
      'https://res.cloudinary.com/demo/image/upload/c_crop,h_100,w_200,x_1,y_2/a_90/e_improve/c_fill,g_north,h_300,w_300/f_auto/q_auto/v1700000000/abc123.jpg',
    );
  });
  it('urlMini menghormati ukuran dan membulatkannya', () => {
    assert.match(urlMini(POLOS, 144.4), /c_fill,g_north,h_144,w_144/);
  });
  it('urlTampil: c_limit supaya tidak pernah memperbesar', () => {
    assert.match(urlTampil(POLOS), /c_limit,h_1200,w_1200\/f_auto\/q_auto\/v1700000000/);
  });
  it('keduanya null untuk URL asing', () => {
    assert.equal(urlMini('https://example.com/a.jpg'), null);
    assert.equal(urlTampil('https://example.com/a.jpg'), null);
  });
});