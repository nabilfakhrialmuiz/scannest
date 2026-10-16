// Mengecek rasio kontras pasangan warna di src/theme/colors.ts (rumus WCAG 2.x).
// Jalankan: npm run cek:kontras
// Butuh Node 22.18 atau lebih baru (bisa membaca berkas .ts langsung).
import { colors } from '../src/theme/colors.ts';

// Luminans relatif sebuah warna heks "#RRGGBB".
function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const linear = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

// Rasio kontras dua warna: (terang + 0,05) / (gelap + 0,05).
function contrast(a, b) {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

// [nama, warna depan, warna belakang, minimum]. Teks butuh 4,5; komponen UI butuh 3.
const checks = [
  ['Teks utama di latar', colors.text, colors.background, 4.5],
  ['Teks utama di kartu', colors.text, colors.surface, 4.5],
  ['Teks redup di latar', colors.textMuted, colors.background, 4.5],
  ['Teks redup di kartu', colors.textMuted, colors.surface, 4.5],
  ['Teks tombol utama', colors.onPrimary, colors.primary, 4.5],
  ['Teks tombol sekunder', colors.primary, colors.primarySoft, 4.5],
  ['Teks tombol ghost dan tautan', colors.primary, colors.background, 4.5],
  ['Teks tombol bahaya', colors.onDanger, colors.danger, 4.5],
  ['Pesan galat di latar', colors.danger, colors.background, 4.5],
  ['Pesan galat di kartu', colors.danger, colors.surface, 4.5],
  ['Teks di kotak pesan galat', colors.text, colors.dangerSoft, 4.5],
  ['Teks di kotak pesan info', colors.text, colors.primarySoft, 4.5],
  ['Ikon kotak pesan galat', colors.danger, colors.dangerSoft, 3],
  ['Ikon aktif di tab bar', colors.primary, colors.surface, 3],
  ['Garis kolom isian', colors.inputBorder, colors.surface, 3],
  ['Ikon dan teks di atas pratinjau kamera', colors.onScrim, colors.scrim, 4.5],
];

let failed = 0;
for (const [name, fg, bg, min] of checks) {
  const ratio = contrast(fg, bg);
  const ok = ratio >= min;
  if (!ok) failed += 1;
  console.log(`${ok ? 'LULUS' : 'GAGAL'}  ${ratio.toFixed(2).padStart(5)} (min ${min})  ${name}`);
}

console.log(failed === 0 ? '\nSemua pasangan lulus.' : `\n${failed} pasangan gagal.`);
process.exit(failed === 0 ? 0 : 1);

