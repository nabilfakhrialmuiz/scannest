import { z } from 'zod';

// Bagian "murni" unggahan Cloudinary: jenis galat, pesan, aturan ulang, dan pembacaan jawaban.
// Tidak memakai modul React Native sehingga bisa diuji langsung dengan Node.

/** Batas ukuran sebelum diunggah (tugas 5.4). Paket Free Cloudinary menolak di atas 10 MB. */
export const BATAS_UKURAN_BYTE = 8 * 1024 * 1024;

/** Percobaan ulang setelah gagal pertama, dan jeda (ms) sebelum tiap percobaan ulang. */
export const MAKS_ULANG = 2;
export const JEDA_ULANG_MS = [1000, 3000] as const;

export type UploadErrorKind =
  | 'config' // .env Cloudinary belum diisi
  | 'terlalubesar' // lebih dari BATAS_UKURAN_BYTE
  | 'jaringan' // tidak terhubung
  | 'waktuhabis' // melebihi batas waktu
  | 'server' // Cloudinary 5xx atau 429
  | 'ditolak' // Cloudinary 4xx: preset, format, ukuran, dan sebagainya
  | 'tidakvalid' // jawaban tidak sesuai bentuk yang diharapkan
  | 'dibatalkan';

export class UploadError extends Error {
  readonly kind: UploadErrorKind;
  constructor(kind: UploadErrorKind, detail?: string) {
    super(pesanUnggah(kind, detail));
    this.name = 'UploadError';
    this.kind = kind;
  }
}

/** Hanya galat yang mungkin sementara yang layak diulang otomatis. */
export function bisaDiulang(kind: UploadErrorKind): boolean {
  return kind === 'jaringan' || kind === 'waktuhabis' || kind === 'server';
}

/** Status HTTP galat menjadi jenis galat. 429 (terlalu banyak permintaan) dianggap sementara. */
export function jenisDariStatus(status: number): UploadErrorKind {
  return status >= 500 || status === 429 ? 'server' : 'ditolak';
}

export function cekUkuran(bytes: number | null): void {
  if (bytes !== null && bytes > BATAS_UKURAN_BYTE) {
    throw new UploadError('terlalubesar');
  }
}

// Pesan Cloudinary ditaruh di `detail`. Pola di bawah berasal dari pesan galat yang umum terlihat
// (bukan daftar resmi); bila tidak cocok, pesan aslinya ikut ditampilkan supaya mudah dilacak.
export function pesanUnggah(kind: UploadErrorKind, detail?: string): string {
  switch (kind) {
    case 'config':
      return (
        'Cloudinary belum diatur. Isi EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME dan ' +
        'EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET di .env, lalu jalankan npx expo start --clear.'
      );
    case 'terlalubesar':
      return 'Foto terlalu besar (lebih dari 8 MB). Ulangi pemotretan dengan jarak yang lebih dekat.';
    case 'jaringan':
      return 'Tidak bisa terhubung ke Cloudinary. Periksa internetmu, lalu coba lagi.';
    case 'waktuhabis':
      return 'Unggahan terlalu lama. Periksa sinyalmu, lalu coba lagi.';
    case 'server':
      return 'Cloudinary sedang sibuk atau bermasalah. Coba lagi sebentar lagi.';
    case 'tidakvalid':
      return 'Jawaban Cloudinary tidak dikenali. Coba lagi; bila terus terjadi, periksa preset.';
    case 'dibatalkan':
      return 'Unggahan dibatalkan.';
    case 'ditolak': {
      const d = (detail ?? '').toLowerCase();
      if (d.includes('preset') && d.includes('not found')) {
        return 'Upload preset tidak ditemukan. Periksa nama preset di .env.';
      }
      if (d.includes('unsigned') || d.includes('api_key')) {
        return 'Preset belum berstatus Unsigned. Ubah Signing mode preset menjadi Unsigned di Cloudinary.';
      }
      if (d.includes('cloud_name') || d.includes('cloud name')) {
        return 'Cloud name salah. Periksa EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME di .env.';
      }
      if (d.includes('size') && (d.includes('large') || d.includes('maximum'))) {
        return 'Foto melebihi batas ukuran Cloudinary (10 MB pada paket Free).';
      }
      if (d.includes('format') || d.includes('invalid image')) {
        return 'Cloudinary menolak format foto ini. Preset hanya menerima jpg dan png.';
      }
      return detail ? `Cloudinary menolak foto: ${detail}` : 'Cloudinary menolak foto ini.';
    }
  }
}

/** Hasil unggahan yang kita simpan: hanya bidang yang dipakai aplikasi. */
export type HasilUnggah = {
  publicId: string;
  url: string;
  bytes: number;
  width: number;
  height: number;
};

const jawabanSchema = z.object({
  public_id: z.string().min(1),
  secure_url: z.string().startsWith('https://'),
  bytes: z.number().int().nonnegative(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});

/** Membaca jawaban JSON Cloudinary; melempar UploadError('tidakvalid') bila bentuknya lain. */
export function bacaJawaban(data: unknown): HasilUnggah {
  const hasil = jawabanSchema.safeParse(data);
  if (!hasil.success) throw new UploadError('tidakvalid');
  const d = hasil.data;
  return {
    publicId: d.public_id,
    url: d.secure_url,
    bytes: d.bytes,
    width: d.width,
    height: d.height,
  };
}

/** Mengambil pesan galat dari badan jawaban Cloudinary: { "error": { "message": "..." } }. */
export function pesanDariBadan(teks: string): string | undefined {
  try {
    const data: unknown = JSON.parse(teks);
    const pesan = z.object({ error: z.object({ message: z.string() }) }).safeParse(data);
    return pesan.success ? pesan.data.error.message : undefined;
  } catch {
    return undefined;
  }
}

