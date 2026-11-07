// Logika murni `admin-delete-user` (tugas 8.1, 8.2): admin menghapus akun pengguna beserta
// seluruh isinya. Urutan: (1) semua file Cloudinary milik pengguna, (2) akun di Supabase Auth
// (baris profil, dokumen, halaman, dan efek ikut terhapus lewat cascade), (3) log.
// Bila langkah 1 gagal sebagian, akun TIDAK disentuh sehingga admin bisa mengulang.
// Tidak boleh menarget diri sendiri atau akun admin.
import { hapusBanyakAset, type HasilHapusAset } from '../_shared/cloudinary.ts';
import {
  adalahUuid,
  galat,
  labelAkun,
  periksaAdmin,
  type DepsPemanggil,
  type Jawaban,
} from '../_shared/admin.ts';

export type PenggunaTarget = {
  id: string;
  nama: string;
  email: string | null;
  role: 'user' | 'admin';
};

export type Deps = DepsPemanggil & {
  cariPengguna(id: string): Promise<PenggunaTarget | null>;
  hitungDokumen(userId: string): Promise<number>;
  /** Semua public_id Cloudinary milik pengguna (semua halaman hasil dibaca habis). */
  daftarPublicId(userId: string): Promise<string[]>;
  hapusAset(publicId: string): Promise<HasilHapusAset>;
  /** Menghapus akun di Supabase Auth; true bila berhasil. */
  hapusAkun(userId: string): Promise<boolean>;
};

export type Hasil = { dokumen: number; file: number };

export async function prosesHapusPengguna(
  masukan: { pemanggilId: string | null; userId: unknown },
  deps: Deps,
): Promise<Jawaban<Hasil>> {
  const ditolak = await periksaAdmin(masukan.pemanggilId, deps);
  if (ditolak) return ditolak;
  const pemanggilId = masukan.pemanggilId as string;

  if (!adalahUuid(masukan.userId)) return galat('permintaan_salah');
  const userId = masukan.userId;
  if (userId === pemanggilId) return galat('target_dilarang');

  try {
    const target = await deps.cariPengguna(userId);
    if (!target) return galat('tidak_ada');
    if (target.role === 'admin') return galat('target_dilarang');

    const jumlahDokumen = await deps.hitungDokumen(userId);
    const idCloud = await deps.daftarPublicId(userId);
    const { total, gagal } = await hapusBanyakAset(idCloud, (id) => deps.hapusAset(id), deps.catat);
    if (gagal > 0) return galat('cloudinary_gagal');

    let terhapus = false;
    try {
      terhapus = await deps.hapusAkun(userId);
    } catch (alasan) {
      deps.catat?.(`Gagal menghapus akun ${userId}`, alasan);
    }
    if (!terhapus) return galat('gagal_hapus');

    try {
      await deps.tulisLog({
        adminId: pemanggilId,
        targetUserId: userId,
        aksi: 'hapus_akun',
        keterangan: `Akun ${labelAkun(target)} dihapus (${jumlahDokumen} dokumen, ${total} file)`,
      });
    } catch (alasan) {
      deps.catat?.(`Gagal menulis log untuk akun ${userId}`, alasan);
      return galat('log_gagal');
    }
    return { status: 200, body: { ok: true, dokumen: jumlahDokumen, file: total } };
  } catch (alasan) {
    deps.catat?.(`Galat tak terduga saat menghapus akun ${userId}`, alasan);
    return galat('galat_server');
  }
}
