import { FunctionsFetchError, FunctionsHttpError } from '@supabase/supabase-js';

import { UKURAN_HALAMAN, polaPencarian } from '@/features/dokumen/daftar';
import type { FilterStatus } from '@/features/dokumen/daftar';
import { supabase } from '@/lib/supabase';

import { nilaiAktif, type AksiLog, type FilterAktif } from './daftar';
import { GalatAdmin, galatDariKodeFungsi, galatDariPostgrest } from './galat';
import {
  daftarAdminDariBaris,
  daftarDokumenAdminDariBaris,
  daftarLogDariBaris,
  daftarPenggunaDariBaris,
  detailDokumenAdminDariBaris,
  statistikDariJson,
  type AdminRingkas,
  type DetailDokumenAdminData,
  type DokumenAdmin,
  type LogAdmin,
  type PenggunaAdmin,
  type StatistikAdmin,
} from './skema';

// Akses data panel admin (Fase 8). Pembacaan lewat fungsi RPC `admin_*` (tiap fungsi menolak
// non-admin dengan kode 42501); aksi yang mengubah data lewat Edge Function admin, karena
// menghapus file Cloudinary, menghapus akun, dan menulis log butuh secret key yang hanya ada di server.
//
// `.retry(false)`: postgrest-js mengulang GET sendiri sampai 3 kali saat jaringan putus; ulang
// diatur satu kali di TanStack Query (lihat QueryProvider).

export type HalamanAdmin<T> = { item: T[]; adaLagi: boolean };

/** Menyusun argumen RPC tanpa kunci bernilai null/undefined (supaya default di SQL yang dipakai). */
function argumen(nilai: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(nilai).filter(([, v]) => v !== null && v !== undefined));
}

function dariOffset(halamanKe: number) {
  return halamanKe * UKURAN_HALAMAN;
}

export async function muatStatistik(): Promise<StatistikAdmin> {
  const { data, error } = await supabase.rpc('admin_statistik').retry(false);
  if (error) throw galatDariPostgrest(error);
  const statistik = statistikDariJson(data);
  if (!statistik) throw new GalatAdmin('lain');
  return statistik;
}

export async function muatPengguna(params: {
  halamanKe: number;
  filter: FilterAktif;
  kata: string;
}): Promise<HalamanAdmin<PenggunaAdmin>> {
  const { data, error } = await supabase
    .rpc(
      'admin_daftar_pengguna',
      argumen({
        p_pola: polaPencarian(params.kata),
        p_aktif: nilaiAktif(params.filter),
        p_limit: UKURAN_HALAMAN,
        p_offset: dariOffset(params.halamanKe),
      }),
    )
    .retry(false);
  if (error) throw galatDariPostgrest(error);
  const baris = Array.isArray(data) ? data : [];
  return { item: daftarPenggunaDariBaris(baris), adaLagi: baris.length >= UKURAN_HALAMAN };
}

export async function muatDokumenAdmin(params: {
  halamanKe: number;
  status: FilterStatus;
  kata: string;
}): Promise<HalamanAdmin<DokumenAdmin>> {
  const { data, error } = await supabase
    .rpc(
      'admin_daftar_dokumen',
      argumen({
        p_pola: polaPencarian(params.kata),
        p_status: params.status === 'semua' ? null : params.status,
        p_limit: UKURAN_HALAMAN,
        p_offset: dariOffset(params.halamanKe),
      }),
    )
    .retry(false);
  if (error) throw galatDariPostgrest(error);
  const baris = Array.isArray(data) ? data : [];
  return { item: daftarDokumenAdminDariBaris(baris), adaLagi: baris.length >= UKURAN_HALAMAN };
}

export type DetailDokumenAdmin = DetailDokumenAdminData & {
  pemilik: { nama: string; email: string | null } | null;
};

/** Satu dokumen (siapa pun pemiliknya) beserta halaman dan identitas pemilik. RLS: admin boleh baca. */
export async function muatDetailDokumenAdmin(dokumenId: string): Promise<DetailDokumenAdmin> {
  const { data, error } = await supabase
    .from('dokumen')
    .select('id, judul, status, dibuat_pada, user_id, halaman_dokumen(id, urutan, url_hasil)')
    .eq('id', dokumenId)
    .retry(false)
    .maybeSingle();
  if (error) throw galatDariPostgrest(error);
  if (!data) throw new GalatAdmin('tidakada');
  const detail = detailDokumenAdminDariBaris(data);
  if (!detail) throw new GalatAdmin('lain');

  const { data: pemilik } = await supabase
    .from('profiles')
    .select('nama, email')
    .eq('id', detail.userId)
    .retry(false)
    .maybeSingle();
  const p = pemilik as { nama?: unknown; email?: unknown } | null;
  return {
    ...detail,
    pemilik: p
      ? {
          nama: typeof p.nama === 'string' ? p.nama : '',
          email: typeof p.email === 'string' ? p.email : null,
        }
      : null,
  };
}

export async function muatLog(params: {
  halamanKe: number;
  aksi: AksiLog | null;
  adminId: string | null;
}): Promise<HalamanAdmin<LogAdmin>> {
  const { data, error } = await supabase
    .rpc(
      'admin_daftar_log',
      argumen({
        p_aksi: params.aksi,
        p_admin_id: params.adminId,
        p_limit: UKURAN_HALAMAN,
        p_offset: dariOffset(params.halamanKe),
      }),
    )
    .retry(false);
  if (error) throw galatDariPostgrest(error);
  const baris = Array.isArray(data) ? data : [];
  return { item: daftarLogDariBaris(baris), adaLagi: baris.length >= UKURAN_HALAMAN };
}

/** Daftar akun admin untuk chip filter log. Jumlahnya kecil, jadi tanpa paginasi. */
export async function muatDaftarAdmin(): Promise<AdminRingkas[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, nama, email')
    .eq('role', 'admin')
    .order('nama', { ascending: true })
    .limit(50)
    .retry(false);
  if (error) throw galatDariPostgrest(error);
  return daftarAdminDariBaris(data);
}

/** Memanggil Edge Function admin dan memetakan semua jenis galat ke GalatAdmin. */
async function panggilFungsi<T>(nama: string, body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke(nama, { body });
  if (!error) return data as T;

  if (error instanceof FunctionsFetchError) throw new GalatAdmin('jaringan');
  if (error instanceof FunctionsHttpError) {
    const isi: unknown = await error.context.json().catch(() => null);
    throw galatDariKodeFungsi((isi as { kode?: unknown } | null)?.kode);
  }
  throw new GalatAdmin('lain');
}

export async function ubahStatusPengguna(params: {
  userId: string;
  aktif: boolean;
}): Promise<{ aktif: boolean; berubah: boolean }> {
  return panggilFungsi('admin-set-user-active', params);
}

export async function hapusPengguna(userId: string): Promise<{ dokumen: number; file: number }> {
  return panggilFungsi('admin-delete-user', { userId });
}

export async function hapusDokumenAdmin(dokumenId: string): Promise<{ dihapus: number }> {
  return panggilFungsi('admin-delete-document', { dokumenId });
}
