// Palet Scannest: krem hangat, hijau sage tua, cokelat tua.
// Semua pasangan teks/latar dicek oleh `npm run cek:kontras` (minimal 4,5:1 untuk teks).
export const colors = {
  background: '#FAF6F0', // latar layar (krem)
  surface: '#FFFFFF', // kartu, tab bar, kolom isian
  primary: '#4F7356', // aksen utama (sage tua)
  primarySoft: '#EBF2EC', // latar lembut untuk tombol sekunder dan ikon
  onPrimary: '#FFFFFF', // teks di atas warna primary
  text: '#3B2F2A', // teks utama (cokelat tua)
  textMuted: '#6F645D', // teks pendukung
  danger: '#B04A35', // galat dan aksi berbahaya
  dangerSoft: '#F6E3DE', // latar lembut untuk pesan galat
  onDanger: '#FFFFFF', // teks di atas warna danger
  border: '#E6DED3', // garis halus kartu (dekoratif)
  inputBorder: '#8C8178', // garis kolom isian (komponen UI, minimal 3:1)
  scrim: '#2B2420', // latar tombol di atas pratinjau kamera (pekat agar terbaca di foto apa pun)
  onScrim: '#FFFFFF', // ikon dan teks di atas scrim
} as const;

export type ColorName = keyof typeof colors;

