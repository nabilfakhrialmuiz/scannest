// Galat untuk daftar, detail, ganti nama, dan hapus dokumen (Fase 7). Berkas ini murni (tanpa
// supabase atau React Native) supaya pemetaan kode galat bisa diuji dengan `npm test`.

export type JenisGalatDokumen = 'jaringan' | 'izin' | 'tidakada' | 'cloudinary' | 'lain';

const PESAN: Record<JenisGalatDokumen, string> = {
  jaringan: 'Tidak bisa terhubung ke server. Periksa internetmu, lalu coba lagi.',
  izin: 'Akunmu tidak diizinkan melakukan ini.',
  tidakada: 'Dokumen tidak ditemukan. Mungkin sudah dihapus.',
  cloudinary: 'Sebagian file belum bisa dihapus. Coba lagi; dokumenmu tidak hilang.',
  lain: 'Terjadi masalah saat memproses data. Coba lagi sebentar lagi.',
};

export class GalatDokumen extends Error {
  readonly kind: JenisGalatDokumen;
  constructor(kind: JenisGalatDokumen) {
    super(PESAN[kind]);
    this.name = 'GalatDokumen';
    this.kind = kind;
  }
}

type GalatPostgrest = { code?: string; message?: string };

/** Memetakan galat PostgREST ke jenis galat aplikasi. */
export function galatDariPostgrest(error: GalatPostgrest): GalatDokumen {
  if (error.code === '42501') return new GalatDokumen('izin');
  // Jaringan putus: klien mengembalikan galat tanpa kode, dengan pesan dari fetch.
  if (!error.code && /fetch|network|failed/i.test(error.message ?? '')) {
    return new GalatDokumen('jaringan');
  }
  return new GalatDokumen('lain');
}

/** Memetakan `kode` dari balasan galat Edge Function `delete-document`. */
export function galatDariKodeFungsi(kode: unknown): GalatDokumen {
  switch (kode) {
    case 'tidak_ada':
      return new GalatDokumen('tidakada');
    case 'bukan_pemilik':
    case 'belum_masuk':
      return new GalatDokumen('izin');
    case 'cloudinary_gagal':
      return new GalatDokumen('cloudinary');
    default:
      return new GalatDokumen('lain');
  }
}

export function pesanGalat(galat: unknown, cadangan = PESAN.lain): string {
  return galat instanceof GalatDokumen ? galat.message : cadangan;
}