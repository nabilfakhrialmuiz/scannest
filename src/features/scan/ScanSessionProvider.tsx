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
import { judulBawaan } from '@/features/dokumen';
import type { HasilUnggah } from '@/lib/cloudinaryErrors';

import { HALAMAN_MAKS } from './ukuran';

/**
 * Siklus satu halaman saat disimpan (Fase 5):
 * baru → mengunggah → diunggah (Cloudinary berhasil, database belum) → tersimpan,
 * atau gagal di salah satu tahap (hasil unggahan tetap disimpan agar tidak diunggah dua kali).
 */
export type StatusHalaman = 'baru' | 'mengunggah' | 'diunggah' | 'tersimpan' | 'gagal';

/** Satu halaman dokumen dalam sesi. Hanya URI berkas, tidak pernah base64 (aturan 4.7). */
export type HalamanScan = {
  id: string;
  uri: string;
  width: number;
  height: number;
  status: StatusHalaman;
  /** 0 sampai 1, hanya berarti saat status `mengunggah`. */
  progress: number;
  galat: string | null;
  /** Hasil Cloudinary; terisi setelah unggahan berhasil. */
  hasil: HasilUnggah | null;
  /** Nomor urut di database; ditetapkan saat pertama kali disimpan dan tidak berubah lagi. */
  urutan: number | null;
};

export type FotoHalaman = Pick<HalamanScan, 'uri' | 'width' | 'height'>;

type SessionState = {
  /** Pemilik sesi; bila pengguna berganti atau keluar, sesi lama dibuang. */
  ownerId: string | null;
  pages: HalamanScan[];
  /** Id dokumen di database; terisi sejak penyimpanan pertama dimulai. */
  dokumenId: string | null;
  judul: string;
};

type ScanSessionValue = {
  pages: HalamanScan[];
  isFull: boolean;
  dokumenId: string | null;
  judul: string;
  /**
   * true sejak penyimpanan dimulai: urutan halaman dikunci karena nomor urut sudah dipakai
   * di database. Halaman yang belum tersimpan masih boleh dihapus.
   */
  isLocked: boolean;
  /** Menambah halaman di akhir. Mengembalikan false bila sesi sudah penuh. */
  addPage: (foto: FotoHalaman) => boolean;
  /** Menghapus halaman yang belum tersimpan. Halaman yang sedang atau sudah tersimpan diabaikan. */
  removePage: (id: string) => void;
  /** Menggeser halaman: -1 ke atas (lebih awal), 1 ke bawah. Diabaikan saat sesi terkunci. */
  movePage: (id: string, direction: -1 | 1) => void;
  patchPage: (id: string, patch: Partial<Omit<HalamanScan, 'id'>>) => void;
  setJudul: (judul: string) => void;
  setDokumenId: (id: string) => void;
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

const kosong = (ownerId: string | null): SessionState => ({
  ownerId,
  pages: [],
  dokumenId: null,
  judul: judulBawaan(),
});

export function ScanSessionProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;

  const [state, setState] = useState<SessionState>(() => kosong(userId));
  const counter = useRef(0);

  // Pengguna berganti, atau keluar lalu masuk lagi (userId sempat null): sesi lama dibuang.
  // Menyesuaikan state saat render diizinkan React untuk kasus seperti ini (tanpa effect).
  if (state.ownerId !== userId) {
    setState(kosong(userId));
  }
  const aktif = state.ownerId === userId ? state : kosong(userId);
  const { pages, dokumenId, judul } = aktif;

  // Semua perubahan lewat sini: selalu memakai state terbaru dan memastikan pemiliknya benar.
  const ubah = useCallback(
    (fn: (s: SessionState) => SessionState) => {
      setState((prev) => fn(prev.ownerId === userId ? prev : kosong(userId)));
    },
    [userId],
  );

  const addPage = useCallback(
    (foto: FotoHalaman) => {
      if (pages.length >= HALAMAN_MAKS) return false;
      counter.current += 1;
      const baru: HalamanScan = {
        ...foto,
        id: `h${Date.now().toString(36)}-${counter.current}`,
        status: 'baru',
        progress: 0,
        galat: null,
        hasil: null,
        urutan: null,
      };
      ubah((s) => (s.pages.length >= HALAMAN_MAKS ? s : { ...s, pages: [...s.pages, baru] }));
      return true;
    },
    [pages.length, ubah],
  );

  const removePage = useCallback(
    (id: string) => {
      ubah((s) => ({
        ...s,
        pages: s.pages.filter(
          (p) => p.id !== id || p.status === 'tersimpan' || p.status === 'mengunggah',
        ),
      }));
    },
    [ubah],
  );

  const movePage = useCallback(
    (id: string, direction: -1 | 1) => {
      ubah((s) => (s.dokumenId ? s : { ...s, pages: moveItem(s.pages, id, direction) }));
    },
    [ubah],
  );

  const patchPage = useCallback(
    (id: string, patch: Partial<Omit<HalamanScan, 'id'>>) => {
      ubah((s) => ({ ...s, pages: s.pages.map((p) => (p.id === id ? { ...p, ...patch } : p)) }));
    },
    [ubah],
  );

  const setJudul = useCallback((j: string) => ubah((s) => ({ ...s, judul: j })), [ubah]);
  const setDokumenId = useCallback((id: string) => ubah((s) => ({ ...s, dokumenId: id })), [ubah]);
  const clear = useCallback(() => setState(kosong(userId)), [userId]);

  const value = useMemo<ScanSessionValue>(
    () => ({
      pages,
      isFull: pages.length >= HALAMAN_MAKS,
      dokumenId,
      judul,
      isLocked: dokumenId !== null,
      addPage,
      removePage,
      movePage,
      patchPage,
      setJudul,
      setDokumenId,
      clear,
    }),
    [
      pages,
      dokumenId,
      judul,
      addPage,
      removePage,
      movePage,
      patchPage,
      setJudul,
      setDokumenId,
      clear,
    ],
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

