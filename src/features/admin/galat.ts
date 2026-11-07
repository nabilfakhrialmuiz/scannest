// Galat untuk layar admin (Fase 8). Murni, supaya pemetaan kode bisa diuji dengan `npm test`.

export type JenisGalatAdmin =
  'jaringan' | 'izin' | 'tidakada' | 'dilarang' | 'cloudinary' | 'log' | 'lain';

const PESAN: Record<JenisGalatAdmin, string> = {
  jaringan: 'Tidak bisa terhubung ke server. Periksa internetmu, lalu coba lagi.',
  izin: 'Akunmu tidak punya izin admin untuk melakukan ini.',
  tidakada: 'Data tidak ditemukan. Mungkin sudah dihapus.',
  dilarang: 'Aksi ini tidak boleh dilakukan pada akun tersebut.',
  cloudinary: 'Sebagian file belum bisa dihapus. Coba lagi; datanya tidak hilang.',
  log: 'Aksi sudah dijalankan, tetapi catatan log gagal ditulis. Beri tahu pengembang.',
  lain: 'Terjadi masalah saat memproses data. Coba lagi sebentar lagi.',
};

export class GalatAdmin extends Error {
  readonly kind: JenisGalatAdmin;
  constructor(kind: JenisGalatAdmin) {
    super(PESAN[kind]);
    this.name = 'GalatAdmin';
    this.kind = kind;
  }
}

type GalatPostgrest = { code?: string; message?: string };

export function galatDariPostgrest(error: GalatPostgrest): GalatAdmin {
  // 42501 = insufficient_privilege: pemeriksaan is_admin() di fungsi RPC atau RLS menolak.
  if (error.code === '42501') return new GalatAdmin('izin');
  if (!error.code && /fetch|network|failed/i.test(error.message ?? '')) {
    return new GalatAdmin('jaringan');
  }
  return new GalatAdmin('lain');
}

/** Memetakan `kode` dari balasan galat Edge Function admin. */
export function galatDariKodeFungsi(kode: unknown): GalatAdmin {
  switch (kode) {
    case 'belum_masuk':
    case 'bukan_admin':
      return new GalatAdmin('izin');
    case 'tidak_ada':
      return new GalatAdmin('tidakada');
    case 'target_dilarang':
      return new GalatAdmin('dilarang');
    case 'cloudinary_gagal':
      return new GalatAdmin('cloudinary');
    case 'log_gagal':
      return new GalatAdmin('log');
    default:
      return new GalatAdmin('lain');
  }
}

export function pesanGalat(galat: unknown, cadangan = PESAN.lain): string {
  return galat instanceof GalatAdmin ? galat.message : cadangan;
}
