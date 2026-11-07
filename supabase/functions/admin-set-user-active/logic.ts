// Logika murni `admin-set-user-active` (tugas 8.1, 8.2): mengaktifkan atau menonaktifkan akun.
// Aturan: hanya admin; tidak boleh menarget diri sendiri atau akun admin lain; bila status
// sudah sama, tidak ada yang diubah dan tidak ada log (tidak ada aksi yang terjadi).
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
  isAktif: boolean;
};

export type Deps = DepsPemanggil & {
  cariPengguna(id: string): Promise<PenggunaTarget | null>;
  /** true bila tepat satu baris berubah. */
  ubahAktif(id: string, aktif: boolean): Promise<boolean>;
};

export type Hasil = { aktif: boolean; berubah: boolean };

export async function prosesUbahAktif(
  masukan: { pemanggilId: string | null; userId: unknown; aktif: unknown },
  deps: Deps,
): Promise<Jawaban<Hasil>> {
  const ditolak = await periksaAdmin(masukan.pemanggilId, deps);
  if (ditolak) return ditolak;
  const pemanggilId = masukan.pemanggilId as string;

  if (!adalahUuid(masukan.userId) || typeof masukan.aktif !== 'boolean') {
    return galat('permintaan_salah');
  }
  const { userId, aktif } = { userId: masukan.userId, aktif: masukan.aktif };
  if (userId === pemanggilId) return galat('target_dilarang');

  try {
    const target = await deps.cariPengguna(userId);
    if (!target) return galat('tidak_ada');
    if (target.role === 'admin') return galat('target_dilarang');
    if (target.isAktif === aktif) return { status: 200, body: { ok: true, aktif, berubah: false } };

    let berhasil = false;
    try {
      berhasil = await deps.ubahAktif(userId, aktif);
    } catch (alasan) {
      deps.catat?.(`Gagal mengubah status akun ${userId}`, alasan);
    }
    if (!berhasil) return galat('gagal_ubah');

    try {
      await deps.tulisLog({
        adminId: pemanggilId,
        targetUserId: userId,
        aksi: aktif ? 'aktifkan_akun' : 'nonaktifkan_akun',
        keterangan: `Akun ${labelAkun(target)} ${aktif ? 'diaktifkan' : 'dinonaktifkan'}`,
      });
    } catch (alasan) {
      deps.catat?.(`Gagal menulis log untuk akun ${userId}`, alasan);
      return galat('log_gagal');
    }
    return { status: 200, body: { ok: true, aktif, berubah: true } };
  } catch (alasan) {
    deps.catat?.(`Galat tak terduga saat mengubah status akun ${userId}`, alasan);
    return galat('galat_server');
  }
}
