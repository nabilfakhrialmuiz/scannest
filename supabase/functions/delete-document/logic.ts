// Logika murni Edge Function `delete-document` (tugas 7.5). Berkas ini tidak memakai API Deno
// maupun paket npm, jadi bisa diuji dengan `npm test` di Node dan dipakai `index.ts` di Deno.
//
// Urutan yang dijaga: (1) pastikan pemanggil pemilik dokumen, (2) hapus SEMUA file di
// Cloudinary, (3) baru hapus baris database. Bila langkah 2 gagal sebagian, baris database
// tidak disentuh, sehingga pengguna bisa mengulang tanpa kehilangan jejak file yang tersisa.

import {
  BATAS_BERSAMAAN,
  GalatCloudinary,
  hapusAsetCloudinary,
  hapusBanyakAset,
  tandatangani,
  type HasilHapusAset,
  type KonfigCloudinary,
} from '../_shared/cloudinary.ts';

// Pembantu Cloudinary dipindahkan ke `_shared/cloudinary.ts` (Fase 8) agar dipakai bersama fungsi
// admin. Diekspor ulang di sini supaya impor lama (dan tes) tetap bekerja.
export { BATAS_BERSAMAAN, GalatCloudinary, hapusAsetCloudinary, tandatangani };
export type { HasilHapusAset, KonfigCloudinary };

export const FORMAT_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type Deps = {
  /** null bila dokumen tidak ada atau tidak terlihat oleh pemanggil (RLS). */
  cariDokumen(id: string): Promise<{ userId: string } | null>;
  daftarPublicId(dokumenId: string): Promise<string[]>;
  hapusAset(publicId: string): Promise<HasilHapusAset>;
  /** true bila tepat satu baris terhapus. */
  hapusBaris(dokumenId: string): Promise<boolean>;
  /** Mencatat penyebab kegagalan ke log fungsi (jangan pernah mengisinya dengan secret). */
  catat?(pesan: string, galat: unknown): void;
};

export type KodeGalat =
  | 'belum_masuk'
  | 'permintaan_salah'
  | 'tidak_ada'
  | 'bukan_pemilik'
  | 'cloudinary_gagal'
  | 'gagal_hapus_baris'
  | 'galat_server';

export type Jawaban =
  | { status: 200; body: { ok: true; dihapus: number } }
  | { status: number; body: { ok: false; kode: KodeGalat; pesan: string } };

const PESAN: Record<KodeGalat, string> = {
  belum_masuk: 'Kamu belum masuk.',
  permintaan_salah: 'Permintaan tidak sah.',
  tidak_ada: 'Dokumen tidak ditemukan.',
  bukan_pemilik: 'Dokumen ini bukan milikmu.',
  cloudinary_gagal: 'Sebagian file belum bisa dihapus dari Cloudinary. Coba lagi.',
  gagal_hapus_baris: 'File sudah dihapus, tetapi catatan dokumen belum. Coba lagi.',
  galat_server: 'Terjadi masalah di server. Coba lagi sebentar lagi.',
};

const STATUS: Record<KodeGalat, number> = {
  belum_masuk: 401,
  permintaan_salah: 400,
  tidak_ada: 404,
  bukan_pemilik: 403,
  cloudinary_gagal: 502,
  gagal_hapus_baris: 500,
  galat_server: 500,
};

function galat(kode: KodeGalat): Jawaban {
  return { status: STATUS[kode], body: { ok: false, kode, pesan: PESAN[kode] } };
}

export async function prosesHapus(
  masukan: { userId: string | null; dokumenId: unknown },
  deps: Deps,
): Promise<Jawaban> {
  if (!masukan.userId) return galat('belum_masuk');
  if (typeof masukan.dokumenId !== 'string' || !FORMAT_UUID.test(masukan.dokumenId)) {
    return galat('permintaan_salah');
  }
  const dokumenId = masukan.dokumenId;
  try {
    const dokumen = await deps.cariDokumen(dokumenId);
    if (!dokumen) return galat('tidak_ada');
    if (dokumen.userId !== masukan.userId) return galat('bukan_pemilik');

    const idCloud = await deps.daftarPublicId(dokumenId);
    const { total, gagal } = await hapusBanyakAset(idCloud, (id) => deps.hapusAset(id), deps.catat);
    if (gagal > 0) return galat('cloudinary_gagal');

    if (!(await deps.hapusBaris(dokumenId))) return galat('gagal_hapus_baris');
    return { status: 200, body: { ok: true, dihapus: total } };
  } catch (alasan) {
    deps.catat?.(`Galat tak terduga saat menghapus dokumen ${dokumenId}`, alasan);
    return galat('galat_server');
  }
}
