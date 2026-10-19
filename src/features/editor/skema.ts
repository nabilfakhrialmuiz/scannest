import { z } from 'zod';

import { cropSah } from './cloudinaryUrl';
import { DAFTAR_FILTER, type CropPiksel, type Efek } from './efek';

// Membaca jawaban database menjadi tipe aplikasi, dengan pengecekan bentuk. Data yang rusak tidak
// membuat aplikasi tertutup: baris efek yang tidak terbaca dianggap "belum ada efek".

const cropSchema = z.object({ x: z.number(), y: z.number(), w: z.number(), h: z.number() });

const barisEfekSchema = z.object({
  jenis_filter: z.enum(DAFTAR_FILTER),
  kecerahan: z.number().int().min(-100).max(100),
  kontras: z.number().int().min(-100).max(100),
  rotasi: z.union([z.literal(0), z.literal(90), z.literal(180), z.literal(270)]),
  data_crop: z.unknown(),
});

/**
 * Menerima isi `efek_foto` hasil embed PostgREST. Karena `halaman_id` unik, jawabannya satu objek
 * atau null; bila klien mengembalikan larik, ambil elemen pertama.
 */
export function efekDariBaris(baris: unknown): Efek | null {
  const satu: unknown = Array.isArray(baris) ? baris[0] : baris;
  if (satu === null || satu === undefined) return null;
  const hasil = barisEfekSchema.safeParse(satu);
  if (!hasil.success) return null;
  const crop = cropSchema.safeParse(hasil.data.data_crop);
  return {
    filter: hasil.data.jenis_filter,
    kecerahan: hasil.data.kecerahan,
    kontras: hasil.data.kontras,
    rotasi: hasil.data.rotasi,
    crop: crop.success && cropSah(crop.data) ? crop.data : null,
  };
}

/** Baris untuk tabel `efek_foto` (kolom yang diizinkan `grant` Fase 2). */
export function barisUntukSimpan(halamanId: string, efek: Efek) {
  const crop: CropPiksel | null = cropSah(efek.crop)
    ? {
        x: Math.round(efek.crop.x),
        y: Math.round(efek.crop.y),
        w: Math.round(efek.crop.w),
        h: Math.round(efek.crop.h),
      }
    : null;
  return {
    halaman_id: halamanId,
    jenis_filter: efek.filter,
    kecerahan: Math.round(efek.kecerahan),
    kontras: Math.round(efek.kontras),
    rotasi: efek.rotasi,
    data_crop: crop,
  };
}

export type HalamanEditor = {
  id: string;
  dokumenId: string;
  urutan: number;
  urlAsli: string;
  efek: Efek | null;
};

const halamanEditorSchema = z.object({
  id: z.string(),
  dokumen_id: z.string(),
  urutan: z.number().int(),
  url_asli: z.string(),
  efek_foto: z.unknown(),
});

export function halamanEditorDariBaris(baris: unknown): HalamanEditor | null {
  const hasil = halamanEditorSchema.safeParse(baris);
  if (!hasil.success) return null;
  const d = hasil.data;
  return {
    id: d.id,
    dokumenId: d.dokumen_id,
    urutan: d.urutan,
    urlAsli: d.url_asli,
    efek: efekDariBaris(d.efek_foto),
  };
}

export type HalamanRingkas = {
  id: string;
  urutan: number;
  urlAsli: string;
  efek: Efek | null;
};

export type DokumenPercantik = {
  id: string;
  judul: string;
  dibuatPada: string;
  halaman: HalamanRingkas[];
  /** Jumlah halaman yang belum punya baris efek. */
  belum: number;
};

const dokumenPercantikSchema = z.object({
  id: z.string(),
  judul: z.string(),
  dibuat_pada: z.string(),
  halaman_dokumen: z.array(
    z.object({
      id: z.string(),
      urutan: z.number().int(),
      url_asli: z.string(),
      efek_foto: z.unknown(),
    }),
  ),
});

/** Dokumen tanpa halaman dilewati. Urutan halaman diurutkan menaik; urutan dokumen mengikuti jawaban server. */
export function dokumenPercantikDariBaris(data: unknown): DokumenPercantik[] {
  if (!Array.isArray(data)) return [];
  const hasil: DokumenPercantik[] = [];
  for (const baris of data) {
    const cek = dokumenPercantikSchema.safeParse(baris);
    if (!cek.success || cek.data.halaman_dokumen.length === 0) continue;
    const halaman = cek.data.halaman_dokumen
      .map((h) => ({
        id: h.id,
        urutan: h.urutan,
        urlAsli: h.url_asli,
        efek: efekDariBaris(h.efek_foto),
      }))
      .sort((a, b) => a.urutan - b.urutan);
    hasil.push({
      id: cek.data.id,
      judul: cek.data.judul,
      dibuatPada: cek.data.dibuat_pada,
      halaman,
      belum: halaman.filter((h) => h.efek === null).length,
    });
  }
  return hasil;
}
