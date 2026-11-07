import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import { gabungTanpaGanda, type FilterStatus } from '@/features/dokumen/daftar';

import {
  hapusDokumenAdmin,
  hapusPengguna,
  muatDaftarAdmin,
  muatDetailDokumenAdmin,
  muatDokumenAdmin,
  muatLog,
  muatPengguna,
  muatStatistik,
  ubahStatusPengguna,
} from './api';
import type { AksiLog, FilterAktif } from './daftar';

// Semua kunci cache diawali "admin" + id admin, sehingga `invalidateQueries(kunciAdmin.semua(id))`
// menyegarkan statistik, semua daftar, dan log sekaligus setelah sebuah aksi.
export const kunciAdmin = {
  semua: (adminId: string) => ['admin', adminId] as const,
  statistik: (adminId: string) => ['admin', adminId, 'statistik'] as const,
  pengguna: (adminId: string, filter: FilterAktif, kata: string) =>
    ['admin', adminId, 'pengguna', filter, kata] as const,
  dokumen: (adminId: string, status: FilterStatus, kata: string) =>
    ['admin', adminId, 'dokumen', status, kata] as const,
  detailDokumen: (adminId: string, dokumenId: string) =>
    ['admin', adminId, 'detail-dokumen', dokumenId] as const,
  log: (adminId: string, aksi: AksiLog | null, filterAdmin: string | null) =>
    ['admin', adminId, 'log', aksi, filterAdmin] as const,
  daftarAdmin: (adminId: string) => ['admin', adminId, 'daftar-admin'] as const,
};

export function useStatistik(adminId: string) {
  return useQuery({ queryKey: kunciAdmin.statistik(adminId), queryFn: muatStatistik });
}

export function useDaftarPengguna(adminId: string, filter: FilterAktif, kata: string) {
  return useInfiniteQuery({
    queryKey: kunciAdmin.pengguna(adminId, filter, kata),
    queryFn: ({ pageParam }) => muatPengguna({ halamanKe: pageParam, filter, kata }),
    initialPageParam: 0,
    getNextPageParam: (terakhir, semua) => (terakhir.adaLagi ? semua.length : undefined),
    select: (data) => gabungTanpaGanda(data.pages.map((h) => h.item)),
    placeholderData: keepPreviousData,
  });
}

export function useDaftarDokumenAdmin(adminId: string, status: FilterStatus, kata: string) {
  return useInfiniteQuery({
    queryKey: kunciAdmin.dokumen(adminId, status, kata),
    queryFn: ({ pageParam }) => muatDokumenAdmin({ halamanKe: pageParam, status, kata }),
    initialPageParam: 0,
    getNextPageParam: (terakhir, semua) => (terakhir.adaLagi ? semua.length : undefined),
    select: (data) => gabungTanpaGanda(data.pages.map((h) => h.item)),
    placeholderData: keepPreviousData,
  });
}

export function useDetailDokumenAdmin(adminId: string, dokumenId: string) {
  return useQuery({
    queryKey: kunciAdmin.detailDokumen(adminId, dokumenId),
    queryFn: () => muatDetailDokumenAdmin(dokumenId),
  });
}

export function useDaftarLog(adminId: string, aksi: AksiLog | null, filterAdmin: string | null) {
  return useInfiniteQuery({
    queryKey: kunciAdmin.log(adminId, aksi, filterAdmin),
    queryFn: ({ pageParam }) => muatLog({ halamanKe: pageParam, aksi, adminId: filterAdmin }),
    initialPageParam: 0,
    getNextPageParam: (terakhir, semua) => (terakhir.adaLagi ? semua.length : undefined),
    select: (data) => gabungTanpaGanda(data.pages.map((h) => h.item)),
    placeholderData: keepPreviousData,
  });
}

export function useDaftarAdmin(adminId: string) {
  return useQuery({ queryKey: kunciAdmin.daftarAdmin(adminId), queryFn: muatDaftarAdmin });
}

// Setelah aksi apa pun (berhasil ATAU gagal) cache admin disegarkan: aksi yang gagal di tengah
// jalan (mis. log gagal ditulis) tetap bisa mengubah data, dan layar harus menampilkan keadaan terbaru.
export function useUbahStatusPengguna(adminId: string) {
  const klien = useQueryClient();
  return useMutation({
    mutationFn: ubahStatusPengguna,
    onSettled: () => klien.invalidateQueries({ queryKey: kunciAdmin.semua(adminId) }),
  });
}

export function useHapusPengguna(adminId: string) {
  const klien = useQueryClient();
  return useMutation({
    mutationFn: hapusPengguna,
    onSettled: () => klien.invalidateQueries({ queryKey: kunciAdmin.semua(adminId) }),
  });
}

export function useHapusDokumenAdmin(adminId: string) {
  const klien = useQueryClient();
  return useMutation({
    mutationFn: hapusDokumenAdmin,
    onSuccess: (_h, dokumenId) => {
      klien.removeQueries({ queryKey: kunciAdmin.detailDokumen(adminId, dokumenId) });
    },
    onSettled: () => {
      void klien.invalidateQueries({ queryKey: kunciAdmin.semua(adminId) });
      // Dokumen yang dihapus bisa saja milik admin sendiri: segarkan juga daftar Dashboard-nya.
      return klien.invalidateQueries({ queryKey: ['dokumen', adminId] });
    },
  });
}
