import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import { gabungTanpaGanda, type FilterStatus } from './daftar';
import { hapusDokumen, muatDaftarDokumen, muatDetailDokumen, ubahJudulDokumen } from './kelola';

// Semua kunci cache diawali id pengguna: dokumen akun lain tidak pernah tercampur, dan
// `invalidateQueries({ queryKey: kunciDokumen.semua(id) })` menyegarkan daftar sekaligus detail.
export const kunciDokumen = {
  semua: (userId: string) => ['dokumen', userId] as const,
  daftar: (userId: string, status: FilterStatus, kata: string) =>
    ['dokumen', userId, 'daftar', status, kata] as const,
  detail: (userId: string, dokumenId: string) => ['dokumen', userId, 'detail', dokumenId] as const,
};

export function useDaftarDokumen(userId: string, status: FilterStatus, kata: string) {
  return useInfiniteQuery({
    queryKey: kunciDokumen.daftar(userId, status, kata),
    queryFn: ({ pageParam }) => muatDaftarDokumen({ userId, halamanKe: pageParam, status, kata }),
    initialPageParam: 0,
    getNextPageParam: (terakhir, semua) => (terakhir.adaLagi ? semua.length : undefined),
    select: (data) => gabungTanpaGanda(data.pages.map((halaman) => halaman.item)),
    // Saat kata kunci atau filter berganti, daftar lama tetap tampil sampai yang baru siap.
    placeholderData: keepPreviousData,
  });
}

export function useDetailDokumen(userId: string, dokumenId: string) {
  return useQuery({
    queryKey: kunciDokumen.detail(userId, dokumenId),
    queryFn: () => muatDetailDokumen({ userId, dokumenId }),
  });
}

export function useUbahJudul(userId: string) {
  const klien = useQueryClient();
  return useMutation({
    mutationFn: ubahJudulDokumen,
    onSuccess: () => klien.invalidateQueries({ queryKey: kunciDokumen.semua(userId) }),
  });
}

export function useHapusDokumen(userId: string) {
  const klien = useQueryClient();
  return useMutation({
    mutationFn: hapusDokumen,
    onSuccess: (_hasil, dokumenId) => {
      // Detail dokumen yang baru dihapus dibuang dulu agar tidak sempat dimuat ulang (404).
      klien.removeQueries({ queryKey: kunciDokumen.detail(userId, dokumenId) });
      return klien.invalidateQueries({ queryKey: kunciDokumen.semua(userId) });
    },
  });
}