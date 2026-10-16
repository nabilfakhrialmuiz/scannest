import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { useAuth } from '@/features/auth';

import { HALAMAN_MAKS } from './ukuran';

/** Satu halaman dokumen dalam sesi. Hanya URI berkas, tidak pernah base64 (aturan 4.7). */
export type HalamanScan = {
  id: string;
  uri: string;
  width: number;
  height: number;
};

type SessionState = {
  /** Pemilik sesi; bila pengguna berganti atau keluar, halaman sesi lama dianggap kosong. */
  ownerId: string | null;
  pages: HalamanScan[];
};

type ScanSessionValue = {
  pages: HalamanScan[];
  isFull: boolean;
  /** Menambah halaman di akhir. Mengembalikan false bila sesi sudah penuh. */
  addPage: (page: Omit<HalamanScan, 'id'>) => boolean;
  removePage: (id: string) => void;
  /** Menggeser halaman: -1 ke atas (lebih awal), 1 ke bawah (lebih akhir). */
  movePage: (id: string, direction: -1 | 1) => void;
  clear: () => void;
};

const ScanSessionContext = createContext<ScanSessionValue | null>(null);

// Pindah satu posisi; di ujung daftar tidak berbuat apa-apa.
function moveItem(pages: HalamanScan[], id: string, direction: -1 | 1): HalamanScan[] {
  const from = pages.findIndex((p) => p.id === id);
  const to = from + direction;
  if (from < 0 || to < 0 || to >= pages.length) return pages;
  const next = [...pages];
  [next[from], next[to]] = [next[to], next[from]];
  return next;
}

export function ScanSessionProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;

  const [state, setState] = useState<SessionState>({ ownerId: userId, pages: [] });
  const counter = useRef(0);

  // Pengguna berganti, atau keluar lalu masuk lagi (userId sempat null): sesi lama dibuang.
  // Menyesuaikan state saat render diizinkan React untuk kasus seperti ini (tanpa effect).
  if (state.ownerId !== userId) {
    setState({ ownerId: userId, pages: [] });
  }
  const pages = useMemo(() => (state.ownerId === userId ? state.pages : []), [state, userId]);

  const addPage = useCallback(
    (page: Omit<HalamanScan, 'id'>) => {
      if (pages.length >= HALAMAN_MAKS) return false;
      counter.current += 1;
      const baru: HalamanScan = { ...page, id: `h${Date.now().toString(36)}-${counter.current}` };
      setState((prev) => {
        const base = prev.ownerId === userId ? prev.pages : [];
        if (base.length >= HALAMAN_MAKS) return prev;
        return { ownerId: userId, pages: [...base, baru] };
      });
      return true;
    },
    [pages.length, userId],
  );

  const removePage = useCallback(
    (id: string) => {
      setState((prev) => ({
        ownerId: userId,
        pages: (prev.ownerId === userId ? prev.pages : []).filter((p) => p.id !== id),
      }));
    },
    [userId],
  );

  const movePage = useCallback(
    (id: string, direction: -1 | 1) => {
      setState((prev) => ({
        ownerId: userId,
        pages: moveItem(prev.ownerId === userId ? prev.pages : [], id, direction),
      }));
    },
    [userId],
  );

  const clear = useCallback(() => setState({ ownerId: userId, pages: [] }), [userId]);

  const value = useMemo<ScanSessionValue>(
    () => ({
      pages,
      isFull: pages.length >= HALAMAN_MAKS,
      addPage,
      removePage,
      movePage,
      clear,
    }),
    [pages, addPage, removePage, movePage, clear],
  );

  return <ScanSessionContext.Provider value={value}>{children}</ScanSessionContext.Provider>;
}

export function useScanSession(): ScanSessionValue {
  const value = useContext(ScanSessionContext);
  if (!value) {
    throw new Error('useScanSession harus dipakai di dalam ScanSessionProvider.');
  }
  return value;
}
