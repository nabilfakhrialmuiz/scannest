import { z } from 'zod';

const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

const dua = (n: number) => String(n).padStart(2, '0');

/** Judul bawaan dokumen baru, misalnya "Dokumen 17 Okt 2026 05.40" (waktu perangkat). */
export function judulBawaan(waktu: Date = new Date()): string {
  return (
    `Dokumen ${waktu.getDate()} ${BULAN[waktu.getMonth()]} ${waktu.getFullYear()} ` +
    `${dua(waktu.getHours())}.${dua(waktu.getMinutes())}`
  );
}

// Aturan sama dengan kolom `dokumen.judul` di database: 1 sampai 120 karakter.
export const judulSchema = z
  .string()
  .trim()
  .min(1, 'Judul dokumen wajib diisi')
  .max(120, 'Judul maksimal 120 karakter');