// Edge Function `admin-set-user-active` (tugas 8.1): mengaktifkan/menonaktifkan akun.
// Body: { "userId": "<uuid>", "aktif": true | false }
// Alur: kenali pemanggil -> pastikan admin (is_admin) -> baru pakai secret key -> catat log.
import {
  buatKlienAdmin,
  GALAT_BELUM_DIKONFIGURASI,
  kenaliPemanggil,
  layani,
  tulisLogDb,
} from '../_shared/server.ts';
import { prosesUbahAktif, type Deps } from './logic.ts';

layani(
  async (req, badan) => {
    const pemanggil = await kenaliPemanggil(req);
    const admin = pemanggil.id ? buatKlienAdmin() : null;
    if (pemanggil.id && !admin) {
      console.error('Secret key Supabase tidak tersedia di fungsi ini.');
      return GALAT_BELUM_DIKONFIGURASI;
    }
    const deps: Deps = {
      ...pemanggil.deps,
      tulisLog: admin ? tulisLogDb(admin) : () => Promise.reject(new Error('tanpa klien')),
      async cariPengguna(id) {
        const { data, error } = await admin!
          .from('profiles')
          .select('id, nama, email, role, is_aktif')
          .eq('id', id)
          .maybeSingle();
        if (error) throw error;
        return data
          ? {
              id: data.id as string,
              nama: (data.nama as string) ?? '',
              email: (data.email as string | null) ?? null,
              role: data.role === 'admin' ? 'admin' : 'user',
              isAktif: data.is_aktif === true,
            }
          : null;
      },
      async ubahAktif(id, aktif) {
        const { data, error } = await admin!
          .from('profiles')
          .update({ is_aktif: aktif })
          .eq('id', id)
          .select('id');
        if (error) throw error;
        return (data?.length ?? 0) === 1;
      },
    };
    return prosesUbahAktif(
      { pemanggilId: pemanggil.id, userId: badan?.userId, aktif: badan?.aktif },
      deps,
    );
  },
  { perluCloudinary: false },
);
