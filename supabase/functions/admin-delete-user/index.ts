// Edge Function `admin-delete-user` (tugas 8.1): admin menghapus akun pengguna beserta seluruh
// dokumennya (file Cloudinary dibersihkan dulu, lalu akun Auth dihapus; sisanya cascade).
// Body: { "userId": "<uuid>" }
import {
  bacaSemuaPublicId,
  buatKlienAdmin,
  GALAT_BELUM_DIKONFIGURASI,
  hapusAsetDari,
  kenaliPemanggil,
  layani,
  tulisLogDb,
} from '../_shared/server.ts';
import { prosesHapusPengguna, type Deps } from './logic.ts';

layani(
  async (req, badan, cloudinary) => {
    const pemanggil = await kenaliPemanggil(req);
    const admin = pemanggil.id ? buatKlienAdmin() : null;
    if (pemanggil.id && (!admin || !cloudinary)) {
      console.error('Secret key Supabase atau secret Cloudinary tidak tersedia.');
      return GALAT_BELUM_DIKONFIGURASI;
    }
    const deps: Deps = {
      ...pemanggil.deps,
      tulisLog: admin ? tulisLogDb(admin) : () => Promise.reject(new Error('tanpa klien')),
      hapusAset: cloudinary
        ? hapusAsetDari(cloudinary)
        : () => Promise.reject(new Error('tanpa cloudinary')),
      async cariPengguna(id) {
        const { data, error } = await admin!
          .from('profiles')
          .select('id, nama, email, role')
          .eq('id', id)
          .maybeSingle();
        if (error) throw error;
        return data
          ? {
              id: data.id as string,
              nama: (data.nama as string) ?? '',
              email: (data.email as string | null) ?? null,
              role: data.role === 'admin' ? 'admin' : 'user',
            }
          : null;
      },
      async hitungDokumen(userId) {
        const { count, error } = await admin!
          .from('dokumen')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId);
        if (error) throw error;
        return count ?? 0;
      },
      daftarPublicId: (userId) => bacaSemuaPublicId(admin!, { p_user_id: userId }),
      async hapusAkun(userId) {
        const { error } = await admin!.auth.admin.deleteUser(userId);
        if (error) throw error;
        return true;
      },
    };
    return prosesHapusPengguna({ pemanggilId: pemanggil.id, userId: badan?.userId }, deps);
  },
  { perluCloudinary: true },
);
