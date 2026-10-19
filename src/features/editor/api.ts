import { supabase } from '@/lib/supabase';

import { buildCloudinaryUrl } from './cloudinaryUrl';
import type { Efek } from './efek';
import {
  barisUntukSimpan,
  dokumenPercantikDariBaris,
  halamanEditorDariBaris,
  type DokumenPercantik,
  type HalamanEditor,
} from './skema';

// Akses tabel `halaman_dokumen`, `efek_foto`, dan `dokumen` untuk editor (Fase 6). Semuanya dijaga
// RLS dan `grant` kolom dari Fase 2: pengguna hanya bisa mengubah miliknya sendiri.

export type JenisGalat = 'jaringan' | 'izin' | 'tidakada' | 'lain';

const PESAN: Record<JenisGalat, string> = {
  jaringan: 'Tidak bisa terhubung ke server. Periksa internetmu, lalu coba lagi.',
  izin: 'Akunmu tidak diizinkan mengubah halaman ini.',
  tidakada: 'Halaman tidak ditemukan. Mungkin sudah dihapus.',
  lain: 'Terjadi masalah saat memproses data. Coba lagi sebentar lagi.',
};

export class GalatEditor extends Error {
  readonly kind: JenisGalat;
  constructor(kind: JenisGalat) {
    super(PESAN[kind]);
    this.name = 'GalatEditor';
    this.kind = kind;
  }
}

type GalatPostgrest = { code?: string; message?: string };

function jenisGalat(error: GalatPostgrest): GalatEditor {
  if (error.code === '42501') return new GalatEditor('izin');
  if (!error.code && /fetch|network|failed/i.test(error.message ?? '')) {
    return new GalatEditor('jaringan');
  }
  return new GalatEditor('lain');
}

const KOLOM_EFEK = 'efek_foto(jenis_filter, kecerahan, kontras, rotasi, data_crop)';

/** Memuat satu halaman beserta efek tersimpannya (bila ada). */
export async function muatHalaman(halamanId: string): Promise<HalamanEditor> {
  const { data, error } = await supabase
    .from('halaman_dokumen')
    .select(`id, dokumen_id, urutan, url_asli, ${KOLOM_EFEK}`)
    .eq('id', halamanId)
    .maybeSingle();
  if (error) throw jenisGalat(error);
  if (!data) throw new GalatEditor('tidakada');
  const halaman = halamanEditorDariBaris(data);
  if (!halaman) throw new GalatEditor('lain');
  return halaman;
}

/** Dokumen terbaru beserta halaman dan efeknya, untuk tab Percantik. */
export async function muatDokumenPercantik(batas = 20): Promise<DokumenPercantik[]> {
  const { data, error } = await supabase
    .from('dokumen')
    .select(`id, judul, dibuat_pada, halaman_dokumen(id, urutan, url_asli, ${KOLOM_EFEK})`)
    .order('dibuat_pada', { ascending: false })
    .limit(batas);
  if (error) throw jenisGalat(error);
  return dokumenPercantikDariBaris(data);
}

/**
 * Menyimpan efek satu halaman dalam tiga langkah yang aman diulang:
 * 1. upsert `efek_foto` (satu baris per halaman),
 * 2. perbarui `halaman_dokumen.url_hasil`,
 * 3. bila semua halaman dokumen sudah punya efek, ubah status dokumen menjadi `selesai`.
 * Langkah 3 hanya pelengkap: bila gagal, efek tetap tersimpan dan status dibetulkan pada penyimpanan berikutnya.
 */
export async function simpanEfek(params: {
  halamanId: string;
  dokumenId: string;
  urlAsli: string;
  efek: Efek;
}): Promise<{ dokumenSelesai: boolean }> {
  const { halamanId, dokumenId, urlAsli, efek } = params;
  const urlHasil = buildCloudinaryUrl(urlAsli, efek);
  if (!urlHasil) throw new GalatEditor('lain');

  const simpan = await supabase
    .from('efek_foto')
    .upsert(barisUntukSimpan(halamanId, efek), { onConflict: 'halaman_id' });
  if (simpan.error) throw jenisGalat(simpan.error);

  // `.select('id')` supaya kita tahu apakah barisnya benar-benar berubah: UPDATE yang ditolak
  // RLS tidak menghasilkan galat, hanya nol baris.
  const ubah = await supabase
    .from('halaman_dokumen')
    .update({ url_hasil: urlHasil })
    .eq('id', halamanId)
    .select('id');
  if (ubah.error) throw jenisGalat(ubah.error);
  if (!ubah.data || ubah.data.length === 0) throw new GalatEditor('izin');

  return { dokumenSelesai: await perbaruiStatusDokumen(dokumenId) };
}

async function perbaruiStatusDokumen(dokumenId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('halaman_dokumen')
    .select('id, efek_foto(id)')
    .eq('dokumen_id', dokumenId);
  if (error || !data || data.length === 0) return false;

  const semuaPunyaEfek = data.every((baris) => {
    const efek = (baris as { efek_foto?: unknown }).efek_foto;
    return Array.isArray(efek) ? efek.length > 0 : efek !== null && efek !== undefined;
  });
  if (!semuaPunyaEfek) return false;

  const hasil = await supabase
    .from('dokumen')
    .update({ status: 'selesai' })
    .eq('id', dokumenId)
    .select('id');
  return !hasil.error && (hasil.data?.length ?? 0) > 0;
}
