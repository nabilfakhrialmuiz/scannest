import { FunctionsFetchError, FunctionsHttpError } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';

import { UKURAN_HALAMAN, polaPencarian, rentangHalaman, type FilterStatus } from './daftar';
import { GalatDokumen, galatDariKodeFungsi, galatDariPostgrest } from './galat';
import {
  daftarDokumenDariBaris,
  dokumenDetailDariBaris,
  type DokumenDetail,
  type DokumenRingkas,
} from './skema';

// Akses data untuk daftar, detail, ganti nama, dan hapus dokumen (Fase 7). Pembacaan dan
// pengubahan judul langsung ke tabel (dijaga RLS); penghapusan lewat Edge Function `delete-document`
// karena file di Cloudinary harus ikut terhapus dan itu butuh API secret yang hanya ada di server.

export type HalamanDaftar = { item: DokumenRingkas[]; adaLagi: boolean };

/**
 * Satu halaman daftar dokumen milik `userId`, terbaru dulu. `user_id` difilter eksplisit karena
 * RLS mengizinkan admin membaca semua dokumen, sedangkan Dashboard hanya untuk dokumen sendiri.
 * Dari tiap dokumen hanya halaman pertama yang dibawa (untuk gambar mini).
 */
export async function muatDaftarDokumen(params: {
  userId: string;
  halamanKe: number;
  status: FilterStatus;
  kata: string;
}): Promise<HalamanDaftar> {
  const { dari, sampai } = rentangHalaman(params.halamanKe);
  let kueri = supabase
    .from('dokumen')
    .select('id, judul, status, jumlah_halaman, dibuat_pada, halaman_dokumen(urutan, url_hasil)')
    .eq('user_id', params.userId)
    .order('dibuat_pada', { ascending: false })
    .order('id', { ascending: false })
    .order('urutan', { referencedTable: 'halaman_dokumen', ascending: true })
    .limit(1, { referencedTable: 'halaman_dokumen' });
  if (params.status !== 'semua') kueri = kueri.eq('status', params.status);
  const pola = polaPencarian(params.kata);
  if (pola) kueri = kueri.ilike('judul', pola);

  // `.retry(false)`: postgrest-js mengulang GET sendiri sampai 3 kali (jeda 1, 2, 4 detik) saat
  // jaringan putus, sehingga pengguna menunggu ±7 detik. Pengulangan diatur satu kali di TanStack Query.
  const { data, error } = await kueri.range(dari, sampai).retry(false);
  if (error) throw galatDariPostgrest(error);
  const baris = Array.isArray(data) ? data : [];
  return { item: daftarDokumenDariBaris(baris), adaLagi: baris.length >= UKURAN_HALAMAN };
}

/** Satu dokumen beserta semua halamannya, untuk layar detail. */
export async function muatDetailDokumen(params: {
  userId: string;
  dokumenId: string;
}): Promise<DokumenDetail> {
  const { data, error } = await supabase
    .from('dokumen')
    .select('id, judul, status, dibuat_pada, halaman_dokumen(id, urutan, url_hasil)')
    .eq('id', params.dokumenId)
    .eq('user_id', params.userId)
    .retry(false)
    .maybeSingle();
  if (error) throw galatDariPostgrest(error);
  if (!data) throw new GalatDokumen('tidakada');
  const detail = dokumenDetailDariBaris(data);
  if (!detail) throw new GalatDokumen('lain');
  return detail;
}

/** Mengganti judul. `.select('id')` dipakai supaya UPDATE yang menyentuh nol baris ketahuan. */
export async function ubahJudulDokumen(params: {
  dokumenId: string;
  judul: string;
}): Promise<void> {
  const { data, error } = await supabase
    .from('dokumen')
    .update({ judul: params.judul })
    .eq('id', params.dokumenId)
    .select('id');
  if (error) throw galatDariPostgrest(error);
  if (!data || data.length === 0) throw new GalatDokumen('tidakada');
}

/**
 * Menghapus dokumen lewat Edge Function: file Cloudinary lebih dulu, baru baris database.
 * Aman diulang: bila percobaan sebelumnya gagal di tengah, file yang sudah hilang dianggap beres.
 */
export async function hapusDokumen(dokumenId: string): Promise<void> {
  const { error } = await supabase.functions.invoke('delete-document', { body: { dokumenId } });
  if (!error) return;

  if (error instanceof FunctionsFetchError) throw new GalatDokumen('jaringan');
  if (error instanceof FunctionsHttpError) {
    const isi: unknown = await error.context.json().catch(() => null);
    throw galatDariKodeFungsi((isi as { kode?: unknown } | null)?.kode);
  }
  throw new GalatDokumen('lain');
}