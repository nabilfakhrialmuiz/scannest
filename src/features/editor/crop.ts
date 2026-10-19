import type { CropPiksel } from './efek';

// Geometri crop (tugas 6.4). Semua angka crop dalam piksel foto asli; layar hanya menampilkannya
// dengan skala. Murni dan tanpa dependensi, jadi bisa diuji dengan `npm test`.

export type Ukuran = { w: number; h: number };

export type Sudut = 'nw' | 'ne' | 'sw' | 'se';

/** Sisi terpendek minimal 10% foto, tidak kurang dari 16 px, tidak melebihi foto itu sendiri. */
export function ukuranMinimum(foto: Ukuran): Ukuran {
  const pendek = Math.min(foto.w, foto.h);
  const sisi = Math.max(16, Math.round(pendek * 0.1));
  return { w: Math.min(sisi, foto.w), h: Math.min(sisi, foto.h) };
}

export function cropPenuh(foto: Ukuran): CropPiksel {
  return { x: 0, y: 0, w: foto.w, h: foto.h };
}

export function adalahPenuh(crop: CropPiksel, foto: Ukuran): boolean {
  return crop.x === 0 && crop.y === 0 && crop.w === foto.w && crop.h === foto.h;
}

/**
 * Memasukkan crop ke dalam foto: dibulatkan, tidak keluar dari tepi, dan tidak lebih kecil dari
 * ukuran minimum. Dipakai saat crop sedang diedit (crop penuh tetap crop penuh).
 */
export function masukkanKeFoto(crop: CropPiksel, foto: Ukuran): CropPiksel {
  const min = ukuranMinimum(foto);
  const w = Math.min(foto.w, Math.max(min.w, Math.round(crop.w)));
  const h = Math.min(foto.h, Math.max(min.h, Math.round(crop.h)));
  const x = Math.min(foto.w - w, Math.max(0, Math.round(crop.x)));
  const y = Math.min(foto.h - h, Math.max(0, Math.round(crop.y)));
  return { x, y, w, h };
}

/** Seperti masukkanKeFoto, tetapi crop yang menutupi seluruh foto menjadi null (tidak perlu c_crop). */
export function rapikanCrop(crop: CropPiksel | null, foto: Ukuran): CropPiksel | null {
  if (!crop) return null;
  const hasil = masukkanKeFoto(crop, foto);
  return adalahPenuh(hasil, foto) ? null : hasil;
}

/** Skala tampil: foto dimuat penuh di dalam kotak (seperti `contentFit="contain"`), tanpa diperbesar melewati kotak. */
export function cocokkan(foto: Ukuran, kotak: Ukuran): { w: number; h: number; skala: number } {
  if (foto.w <= 0 || foto.h <= 0 || kotak.w <= 0 || kotak.h <= 0) return { w: 0, h: 0, skala: 0 };
  const skala = Math.min(kotak.w / foto.w, kotak.h / foto.h);
  return { w: foto.w * skala, h: foto.h * skala, skala };
}

/**
 * Menggeser seluruh area crop sejauh (dx, dy) piksel foto dari posisi awal gestur.
 * Ukurannya tetap; posisinya ditahan di dalam foto.
 */
export function geserCrop(awal: CropPiksel, dx: number, dy: number, foto: Ukuran): CropPiksel {
  const x = Math.min(foto.w - awal.w, Math.max(0, awal.x + dx));
  const y = Math.min(foto.h - awal.h, Math.max(0, awal.y + dy));
  return { x, y, w: awal.w, h: awal.h };
}

/**
 * Menarik satu sudut sejauh (dx, dy) piksel foto dari posisi awal gestur. Sudut di seberangnya
 * tetap di tempat. Hasil ditahan di dalam foto dan tidak lebih kecil dari ukuran minimum.
 */
export function ubahSudut(
  awal: CropPiksel,
  sudut: Sudut,
  dx: number,
  dy: number,
  foto: Ukuran,
): CropPiksel {
  const min = ukuranMinimum(foto);
  const kiri0 = awal.x;
  const atas0 = awal.y;
  const kanan0 = awal.x + awal.w;
  const bawah0 = awal.y + awal.h;

  let kiri = kiri0;
  let atas = atas0;
  let kanan = kanan0;
  let bawah = bawah0;

  if (sudut === 'nw' || sudut === 'sw') {
    kiri = Math.min(kanan0 - min.w, Math.max(0, kiri0 + dx));
  } else {
    kanan = Math.max(kiri0 + min.w, Math.min(foto.w, kanan0 + dx));
  }
  if (sudut === 'nw' || sudut === 'ne') {
    atas = Math.min(bawah0 - min.h, Math.max(0, atas0 + dy));
  } else {
    bawah = Math.max(atas0 + min.h, Math.min(foto.h, bawah0 + dy));
  }
  return { x: kiri, y: atas, w: kanan - kiri, h: bawah - atas };
}
