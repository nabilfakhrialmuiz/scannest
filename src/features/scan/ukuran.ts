// Aturan ukuran foto sebelum diunggah. Fungsi murni (tanpa modul native) supaya mudah diuji.

/** Lebar maksimum hasil normalisasi, dalam piksel (roadmap 4.5). */
export const LEBAR_MAKS = 2000;

/** Kualitas JPEG hasil normalisasi (0 sampai 1). */
export const KUALITAS_JPEG = 0.85;

/** Batas halaman dalam satu sesi scan (keputusan K24). */
export const HALAMAN_MAKS = 30;

export type Ukuran = { width: number; height: number };

export type UkuranTarget = Ukuran & {
  /** true bila foto harus diperkecil; false bila sudah cukup kecil dan dibiarkan. */
  diperkecil: boolean;
};

/**
 * Menghitung ukuran akhir: lebar dibatasi `lebarMaks`, tinggi mengikuti rasio.
 * Foto yang sudah lebih kecil tidak diperbesar (memperbesar hanya menambah berat berkas).
 */
export function ukuranTarget(
  { width, height }: Ukuran,
  lebarMaks: number = LEBAR_MAKS,
): UkuranTarget {
  if (!(width > 0) || !(height > 0)) {
    throw new Error('Ukuran foto tidak valid.');
  }
  if (width <= lebarMaks) {
    return { width, height, diperkecil: false };
  }
  return {
    width: lebarMaks,
    height: Math.max(1, Math.round((height * lebarMaks) / width)),
    diperkecil: true,
  };
}
