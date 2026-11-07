// Logika murni `admin-delete-document` (tugas 8.1, 8.2): admin menghapus dokumen milik siapa
// pun. Urutan sama dengan `delete-document`: semua file Cloudinary dulu, baru baris database,
// terakhir log. Bila file gagal terhapus, database dan log tidak disentuh.
import { hapusBanyakAset, type HasilHapusAset } from '../_shared/cloudinary.ts';
import {
  adalahUuid,
  galat,
  periksaAdmin,
  ringkas,
  type DepsPemanggil,
  type Jawaban,
} from '../_shared/admin.ts';

export type DokumenTarget = {
  id: string;
  judul: string;
  userId: string;
  /** Teks pemilik untuk log (email dan nama), boleh kosong bila profil tidak terbaca. */
  labelPemilik: string;
};

export type Deps = DepsPemanggil & {
  cariDokumen(id: string): Promise<DokumenTarget | null>;
  daftarPublicId(dokumenId: string): Promise<string[]>;
  hapusAset(publicId: string): Promise<HasilHapusAset>;
  /** true bila tepat satu baris terhapus. */
  hapusBaris(dokumenId: string): Promise<boolean>;
};

export type Hasil = { dihapus: number };

export async function prosesAdminHapusDokumen(
  masukan: { pemanggilId: string | null; dokumenId: unknown },
  deps: Deps,
): Promise<Jawaban<Hasil>> {
  const ditolak = await periksaAdmin(masukan.pemanggilId, deps);
  if (ditolak) return ditolak;
  const pemanggilId = masukan.pemanggilId as string;

  if (!adalahUuid(masukan.dokumenId)) return galat('permintaan_salah');
  const dokumenId = masukan.dokumenId;

  try {
    const dokumen = await deps.cariDokumen(dokumenId);
    if (!dokumen) return galat('tidak_ada');

    const idCloud = await deps.daftarPublicId(dokumenId);
    const { total, gagal } = await hapusBanyakAset(idCloud, (id) => deps.hapusAset(id), deps.catat);
    if (gagal > 0) return galat('cloudinary_gagal');

    let terhapus = false;
    try {
      terhapus = await deps.hapusBaris(dokumenId);
    } catch (alasan) {
      deps.catat?.(`Gagal menghapus baris dokumen ${dokumenId}`, alasan);
    }
    if (!terhapus) return galat('gagal_hapus');

    try {
      await deps.tulisLog({
        adminId: pemanggilId,
        targetUserId: dokumen.userId,
        aksi: 'hapus_dokumen',
        keterangan:
          `Dokumen "${ringkas(dokumen.judul)}" (${total} file)` +
          (dokumen.labelPemilik ? ` milik ${dokumen.labelPemilik}` : '') +
          ' dihapus',
      });
    } catch (alasan) {
      deps.catat?.(`Gagal menulis log untuk dokumen ${dokumenId}`, alasan);
      return galat('log_gagal');
    }
    return { status: 200, body: { ok: true, dihapus: total } };
  } catch (alasan) {
    deps.catat?.(`Galat tak terduga saat admin menghapus dokumen ${dokumenId}`, alasan);
    return galat('galat_server');
  }
}
