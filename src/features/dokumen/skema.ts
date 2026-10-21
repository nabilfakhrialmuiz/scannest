import { z } from 'zod';

// Membaca jawaban database untuk daftar dan detail dokumen menjadi tipe aplikasi (zod).
// Baris yang bentuknya salah dilewati; aplikasi tidak tertutup karena satu baris rusak.

export type StatusDokumen = 'draft' | 'selesai';

export type DokumenRingkas = {
  id: string;
  judul: string;
  status: StatusDokumen;
  jumlahHalaman: number;
  dibuatPada: string;
  /** `url_hasil` halaman pertama untuk gambar mini; null bila dokumen belum punya halaman. */
  urlSampul: string | null;
};

const statusSchema = z.enum(['draft', 'selesai']);

const ringkasSchema = z.object({
  id: z.string(),
  judul: z.string(),
  status: statusSchema,
  jumlah_halaman: z.number().int(),
  dibuat_pada: z.string(),
  halaman_dokumen: z.array(z.object({ urutan: z.number().int(), url_hasil: z.string() })),
});

export function daftarDokumenDariBaris(data: unknown): DokumenRingkas[] {
  if (!Array.isArray(data)) return [];
  const hasil: DokumenRingkas[] = [];
  for (const baris of data) {
    const cek = ringkasSchema.safeParse(baris);
    if (!cek.success) continue;
    const d = cek.data;
    const pertama = [...d.halaman_dokumen].sort((a, b) => a.urutan - b.urutan)[0];
    hasil.push({
      id: d.id,
      judul: d.judul,
      status: d.status,
      jumlahHalaman: d.jumlah_halaman,
      dibuatPada: d.dibuat_pada,
      urlSampul: pertama?.url_hasil ?? null,
    });
  }
  return hasil;
}

export type HalamanDetail = {
  id: string;
  urutan: number;
  urlHasil: string;
};

export type DokumenDetail = {
  id: string;
  judul: string;
  status: StatusDokumen;
  dibuatPada: string;
  halaman: HalamanDetail[];
};

const detailSchema = z.object({
  id: z.string(),
  judul: z.string(),
  status: statusSchema,
  dibuat_pada: z.string(),
  halaman_dokumen: z.array(
    z.object({ id: z.string(), urutan: z.number().int(), url_hasil: z.string() }),
  ),
});

export function dokumenDetailDariBaris(data: unknown): DokumenDetail | null {
  const cek = detailSchema.safeParse(data);
  if (!cek.success) return null;
  const d = cek.data;
  return {
    id: d.id,
    judul: d.judul,
    status: d.status,
    dibuatPada: d.dibuat_pada,
    halaman: d.halaman_dokumen
      .map((h) => ({ id: h.id, urutan: h.urutan, urlHasil: h.url_hasil }))
      .sort((a, b) => a.urutan - b.urutan),
  };
}