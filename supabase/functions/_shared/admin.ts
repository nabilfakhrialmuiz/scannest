// Aturan bersama fungsi admin (Fase 8). Murni: tanpa API Deno atau paket npm, jadi bisa diuji
// dengan `npm test`. Berisi tipe jawaban, pemeriksaan "pemanggil adalah admin", dan pencatatan log.

export type KodeGalat =
  | 'belum_masuk'
  | 'bukan_admin'
  | 'permintaan_salah'
  | 'tidak_ada'
  | 'target_dilarang'
  | 'cloudinary_gagal'
  | 'gagal_ubah'
  | 'gagal_hapus'
  | 'log_gagal'
  | 'galat_server';

export type Jawaban<T extends object = Record<string, never>> =
  | { status: 200; body: { ok: true } & T }
  | { status: number; body: { ok: false; kode: KodeGalat; pesan: string } };

export const PESAN: Record<KodeGalat, string> = {
  belum_masuk: 'Kamu belum masuk.',
  bukan_admin: 'Hanya admin yang boleh melakukan ini.',
  permintaan_salah: 'Permintaan tidak sah.',
  tidak_ada: 'Data yang dituju tidak ditemukan.',
  target_dilarang: 'Aksi ini tidak boleh dilakukan pada akun tersebut.',
  cloudinary_gagal: 'Sebagian file belum bisa dihapus dari Cloudinary. Coba lagi.',
  gagal_ubah: 'Perubahan belum bisa disimpan. Coba lagi.',
  gagal_hapus: 'File sudah dihapus, tetapi datanya belum. Coba lagi.',
  log_gagal: 'Aksi sudah dijalankan, tetapi catatan log gagal ditulis. Beri tahu pengembang.',
  galat_server: 'Terjadi masalah di server. Coba lagi sebentar lagi.',
};

export const STATUS: Record<KodeGalat, number> = {
  belum_masuk: 401,
  bukan_admin: 403,
  permintaan_salah: 400,
  tidak_ada: 404,
  target_dilarang: 403,
  cloudinary_gagal: 502,
  gagal_ubah: 500,
  gagal_hapus: 500,
  log_gagal: 500,
  galat_server: 500,
};

export function galat(kode: KodeGalat): {
  status: number;
  body: { ok: false; kode: KodeGalat; pesan: string };
} {
  return { status: STATUS[kode], body: { ok: false, kode, pesan: PESAN[kode] } };
}

export const FORMAT_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function adalahUuid(nilai: unknown): nilai is string {
  return typeof nilai === 'string' && FORMAT_UUID.test(nilai);
}

export type AksiLog = 'nonaktifkan_akun' | 'aktifkan_akun' | 'hapus_akun' | 'hapus_dokumen';

export type EntriLog = {
  adminId: string;
  targetUserId: string | null;
  aksi: AksiLog;
  keterangan: string;
};

export type DepsPemanggil = {
  /** true bila pemanggil admin yang aktif (memanggil `is_admin()` dengan JWT pemanggil). */
  adalahAdmin(): Promise<boolean>;
  /** Menulis satu baris `log_aktivitas`; melempar galat bila gagal. */
  tulisLog(entri: EntriLog): Promise<void>;
  /** Mencatat penyebab kegagalan ke log fungsi (jangan pernah mengisinya dengan secret). */
  catat?(pesan: string, galat: unknown): void;
};

/**
 * Pintu masuk semua fungsi admin. Mengembalikan jawaban galat bila pemanggil belum masuk atau
 * bukan admin; `null` berarti lolos. Dijalankan SEBELUM memeriksa isi permintaan, sehingga
 * pengguna biasa selalu menerima 403 dan tidak bisa menebak bentuk permintaan yang sah.
 */
export async function periksaAdmin(
  pemanggilId: string | null,
  deps: Pick<DepsPemanggil, 'adalahAdmin' | 'catat'>,
): Promise<ReturnType<typeof galat> | null> {
  if (!pemanggilId) return galat('belum_masuk');
  try {
    if (!(await deps.adalahAdmin())) return galat('bukan_admin');
  } catch (alasan) {
    deps.catat?.('Gagal memeriksa peran admin', alasan);
    return galat('galat_server');
  }
  return null;
}

/** Merapikan teks untuk keterangan log: spasi ganda dibuang, dipotong dengan "…" bila terlalu panjang. */
export function ringkas(teks: string, maks = 80): string {
  const rapi = teks.replace(/\s+/g, ' ').trim();
  return rapi.length > maks ? `${rapi.slice(0, maks - 1)}…` : rapi;
}

/** Nama yang enak dibaca untuk satu akun di log: email dulu, lalu nama, lalu id. */
export function labelAkun(akun: { id: string; nama: string; email: string | null }): string {
  const email = akun.email?.trim();
  const nama = ringkas(akun.nama, 40);
  if (email && nama) return `${email} (${nama})`;
  return email || nama || akun.id;
}
