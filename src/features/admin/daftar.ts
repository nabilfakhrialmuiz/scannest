// Aturan murni untuk panel admin (Fase 8): label, filter, dan format tampilan. Tanpa supabase
// atau React Native supaya bisa diuji dengan `npm test`.

export type AksiLog = 'nonaktifkan_akun' | 'aktifkan_akun' | 'hapus_akun' | 'hapus_dokumen';

export const URUTAN_AKSI: AksiLog[] = [
  'nonaktifkan_akun',
  'aktifkan_akun',
  'hapus_akun',
  'hapus_dokumen',
];

export const LABEL_AKSI: Record<AksiLog, string> = {
  nonaktifkan_akun: 'Nonaktifkan akun',
  aktifkan_akun: 'Aktifkan akun',
  hapus_akun: 'Hapus akun',
  hapus_dokumen: 'Hapus dokumen',
};

export const FILTER_AKTIF = ['semua', 'aktif', 'nonaktif'] as const;
export type FilterAktif = (typeof FILTER_AKTIF)[number];

export const LABEL_FILTER_AKTIF: Record<FilterAktif, string> = {
  semua: 'Semua',
  aktif: 'Aktif',
  nonaktif: 'Nonaktif',
};

/** Nilai `p_aktif` untuk RPC: null berarti semua. */
export function nilaiAktif(filter: FilterAktif): boolean | null {
  return filter === 'semua' ? null : filter === 'aktif';
}

/** Angka dengan pemisah ribuan titik gaya Indonesia: 1234567 -> "1.234.567". */
export function formatAngka(n: number): string {
  const bulat = Math.round(n);
  return String(Math.abs(bulat))
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.')
    .replace(/^/, bulat < 0 ? '-' : '');
}

/** Ukuran berkas: "512 B", "1,5 KB", "2 MB", "1,25 GB" (maksimal dua desimal, koma desimal). */
export function formatUkuran(byte: number): string {
  if (!Number.isFinite(byte) || byte < 0) return '-';
  if (byte < 1024) return `${Math.round(byte)} B`;
  const satuan = ['KB', 'MB', 'GB', 'TB'];
  let nilai = byte / 1024;
  let i = 0;
  while (nilai >= 1024 && i < satuan.length - 1) {
    nilai /= 1024;
    i += 1;
  }
  const teks = (Math.round(nilai * 100) / 100).toString().replace('.', ',');
  return `${teks} ${satuan[i]}`;
}

const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const dua = (n: number) => String(n).padStart(2, '0');

/** "25 Okt 2026, 14.05" (zona waktu perangkat). Teks yang tidak terbaca dikembalikan "-". */
export function formatWaktu(iso: string): string {
  const w = new Date(iso);
  if (Number.isNaN(w.getTime())) return '-';
  return `${w.getDate()} ${BULAN[w.getMonth()]} ${w.getFullYear()}, ${dua(w.getHours())}.${dua(w.getMinutes())}`;
}

type Orang = { nama: string | null; email: string | null };

/** Nama utama untuk satu akun di daftar: nama, lalu email, lalu teks cadangan. */
export function namaTampil(orang: Orang, cadangan = 'Tanpa nama'): string {
  return orang.nama?.trim() || orang.email?.trim() || cadangan;
}

/** Huruf awal untuk avatar. */
export function inisial(orang: Orang): string {
  return (namaTampil(orang, '?')[0] ?? '?').toUpperCase();
}

/**
 * Kata yang harus diketik admin untuk mengonfirmasi penghapusan akun: email akun itu (paling
 * sulit diketik tanpa sengaja), atau "HAPUS" bila akun tidak punya email.
 */
export function kataKonfirmasi(pengguna: { email: string | null }): string {
  return pengguna.email?.trim() || 'HAPUS';
}

export function cocokKonfirmasi(masukan: string, pengguna: { email: string | null }): boolean {
  return masukan.trim().toLowerCase() === kataKonfirmasi(pengguna).toLowerCase();
}

/** Ringkasan satu baris untuk daftar pengguna: "3 dokumen · bergabung 17 Okt 2026". */
export function labelDokumen(jumlah: number): string {
  return `${formatAngka(jumlah)} dokumen`;
}
