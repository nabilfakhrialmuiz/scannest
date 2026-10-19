// Model efek foto (tugas 6.2). Berkas ini murni: tidak mengimpor apa pun dari React atau Expo,
// sehingga bisa diuji langsung dengan `npm test`.

export const DAFTAR_FILTER = ['asli', 'dokumen', 'hitam_putih', 'abu_abu', 'tajam'] as const;

/** Sama dengan enum `filter_foto` di database. */
export type FilterFoto = (typeof DAFTAR_FILTER)[number];

export const LABEL_FILTER: Record<FilterFoto, string> = {
  asli: 'Asli',
  dokumen: 'Dokumen',
  hitam_putih: 'Hitam-putih',
  abu_abu: 'Abu-abu',
  tajam: 'Tajam',
};

export type Rotasi = 0 | 90 | 180 | 270;

/** Area crop dalam piksel foto asli (sudah dinormalisasi di Fase 4 dan dibatasi 2000 px di preset). */
export type CropPiksel = { x: number; y: number; w: number; h: number };

export type Efek = {
  filter: FilterFoto;
  /** -100 sampai 100 (batas kolom database). */
  kecerahan: number;
  /** -100 sampai 100 (batas kolom database). */
  kontras: number;
  rotasi: Rotasi;
  /** null: tanpa crop. */
  crop: CropPiksel | null;
};

export const EFEK_BAWAAN: Efek = {
  filter: 'asli',
  kecerahan: 0,
  kontras: 0,
  rotasi: 0,
  crop: null,
};

/** Langkah slider. Nilai yang lebih jarang berubah berarti lebih sedikit URL unik (hemat kredit). */
export const LANGKAH_SLIDER = 5;

export function bulatkanSlider(nilai: number): number {
  const terbatas = Math.max(-100, Math.min(100, nilai));
  return Math.round(terbatas / LANGKAH_SLIDER) * LANGKAH_SLIDER;
}

/** Putar 90 derajat searah jarum jam: 0, 90, 180, 270, lalu kembali ke 0. */
export function putar90(rotasi: Rotasi): Rotasi {
  return ((rotasi + 90) % 360) as Rotasi;
}

export function samaCrop(a: CropPiksel | null, b: CropPiksel | null): boolean {
  if (a === null || b === null) return a === b;
  return a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h;
}

export function samaEfek(a: Efek, b: Efek): boolean {
  return (
    a.filter === b.filter &&
    a.kecerahan === b.kecerahan &&
    a.kontras === b.kontras &&
    a.rotasi === b.rotasi &&
    samaCrop(a.crop, b.crop)
  );
}

export function adalahBawaan(efek: Efek): boolean {
  return samaEfek(efek, EFEK_BAWAAN);
}
