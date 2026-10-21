// Aturan murni untuk daftar dokumen (tugas 7.1 dan 7.6): halaman, pencarian, filter, tanggal.

export const UKURAN_HALAMAN = 20;

export const FILTER_STATUS = ['semua', 'draft', 'selesai'] as const;
export type FilterStatus = (typeof FILTER_STATUS)[number];

export const LABEL_FILTER: Record<FilterStatus, string> = {
  semua: 'Semua',
  draft: 'Draft',
  selesai: 'Selesai',
};

export const LABEL_STATUS: Record<'draft' | 'selesai', string> = {
  draft: 'Draft',
  selesai: 'Selesai',
};

/** Rentang baris untuk `.range(dari, sampai)` (batas atas ikut dihitung). */
export function rentangHalaman(halamanKe: number, ukuran = UKURAN_HALAMAN) {
  const dari = halamanKe * ukuran;
  return { dari, sampai: dari + ukuran - 1 };
}

const BATAS_PENCARIAN = 100;

/**
 * Menyiapkan kata kunci untuk `ilike`: spasi di tepi dibuang, panjangnya dibatasi, dan karakter
 * khusus LIKE (`%`, `_`, `\`) di-escape supaya dicari apa adanya. Kosong berarti tanpa pencarian.
 */
export function polaPencarian(teks: string): string | null {
  const bersih = teks.trim().slice(0, BATAS_PENCARIAN);
  if (bersih === '') return null;
  return `%${bersih.replace(/[\\%_]/g, (huruf) => `\\${huruf}`)}%`;
}

const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

/** "17 Okt 2026" (zona waktu perangkat). Teks tanggal yang tidak terbaca dikembalikan "-". */
export function formatTanggal(iso: string): string {
  const waktu = new Date(iso);
  if (Number.isNaN(waktu.getTime())) return '-';
  return `${waktu.getDate()} ${BULAN[waktu.getMonth()]} ${waktu.getFullYear()}`;
}

export function labelHalaman(jumlah: number): string {
  return `${jumlah} halaman`;
}

/** Menggabungkan halaman-halaman hasil paginasi tanpa dokumen ganda (dokumen baru menggeser baris). */
export function gabungTanpaGanda<T extends { id: string }>(halaman: T[][]): T[] {
  const lihat = new Set<string>();
  const hasil: T[] = [];
  for (const kelompok of halaman) {
    for (const item of kelompok) {
      if (lihat.has(item.id)) continue;
      lihat.add(item.id);
      hasil.push(item);
    }
  }
  return hasil;
}