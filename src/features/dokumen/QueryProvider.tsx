import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState, type ReactNode } from 'react';

import { useAuth } from '@/features/auth';

// Pembungkus TanStack Query. Harus berada DI DALAM AuthProvider: begitu pengguna keluar, seluruh
// cache dibuang supaya data akun sebelumnya tidak tersisa di memori.
export function QueryProvider({ children }: { children: ReactNode }) {
  const [klien] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Satu kali ulang untuk galat sementara (jaringan, server). Galat yang pasti sama
            // hasilnya bila diulang (izin ditolak, dokumen tidak ada) langsung ditampilkan.
            retry: (jumlah, galat) =>
              jumlah < 1 && !['izin', 'tidakada'].includes((galat as { kind?: string }).kind ?? ''),
            staleTime: 30_000,
            refetchOnReconnect: true,
          },
        },
      }),
  );
  const { session } = useAuth();
  const userId = session?.user.id ?? null;

  useEffect(() => {
    if (!userId) klien.clear();
  }, [userId, klien]);

  return <QueryClientProvider client={klien}>{children}</QueryClientProvider>;
}