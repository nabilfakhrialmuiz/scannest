// Edge Function `admin-delete-document` (tugas 8.1): admin menghapus dokumen siapa pun,
// termasuk semua file halamannya di Cloudinary.
// Body: { "dokumenId": "<uuid>" }
import {
  bacaSemuaPublicId,
  buatKlienAdmin,
  GALAT_BELUM_DIKONFIGURASI,
  hapusAsetDari,
  kenaliPemanggil,
  layani,
  tulisLogDb,
} from '../_shared/server.ts';
import { labelAkun } from '../_shared/admin.ts';
import { prosesAdminHapusDokumen, type Deps } from './logic.ts';

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
      async cariDokumen(id) {
        const { data, error } = await admin!
          .from('dokumen')
          .select('id, judul, user_id')
          .eq('id', id)
          .maybeSingle();
        if (error) throw error;
        if (!data) return null;
        const { data: pemilik } = await admin!
          .from('profiles')
          .select('id, nama, email')
          .eq('id', data.user_id as string)
          .maybeSingle();
        return {
          id: data.id as string,
          judul: data.judul as string,
          userId: data.user_id as string,
          labelPemilik: pemilik
            ? labelAkun({
                id: pemilik.id as string,
                nama: (pemilik.nama as string) ?? '',
                email: (pemilik.email as string | null) ?? null,
              })
            : '',
        };
      },
      daftarPublicId: (dokumenId) => bacaSemuaPublicId(admin!, { p_dokumen_id: dokumenId }),
      async hapusBaris(dokumenId) {
        const { data, error } = await admin!
          .from('dokumen')
          .delete()
          .eq('id', dokumenId)
          .select('id');
        if (error) throw error;
        return (data?.length ?? 0) === 1;
      },
    };
    return prosesAdminHapusDokumen(
      { pemanggilId: pemanggil.id, dokumenId: badan?.dokumenId },
      deps,
    );
  },
  { perluCloudinary: true },
);
