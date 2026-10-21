// URL gambar untuk daftar dan detail dokumen (tugas 7.2 dan 7.3). Murni dan tanpa dependensi.
//
// `url_hasil` dari Fase 6 sudah memuat resep efek (crop, putar, filter...). Gambar mini dan
// tampilan layar dibuat dengan MENAMBAHKAN komponen di akhir rantai itu, sebelum segmen versi
// (v123456), sehingga resep efek tetap berjalan lebih dulu.

const PENANDA = '/image/upload/';

/** Komponen transformasi berbentuk "kode_nilai", misalnya c_crop,x_1 atau e_improve atau q_auto. */
const POLA_KOMPONEN = /^[a-z]{1,3}_[^/]*$/;

/**
 * Menambah komponen di akhir rantai transformasi yang sudah ada. Mengembalikan null bila bukan
 * URL Cloudinary berbentuk `.../image/upload/...`. Tanpa komponen, URL dikembalikan apa adanya.
 */
export function tambahkanKomponen(url: string, komponen: string[]): string | null {
  const titik = url.indexOf(PENANDA);
  if (titik < 0) return null;
  if (komponen.length === 0) return url;
  const awal = url.slice(0, titik + PENANDA.length);
  const segmen = url.slice(titik + PENANDA.length).split('/');
  // Rantai = segmen-segmen awal yang berpola komponen; berhenti di versi (v123) atau public_id.
  let akhirRantai = 0;
  while (akhirRantai < segmen.length - 1 && POLA_KOMPONEN.test(segmen[akhirRantai] ?? '')) {
    akhirRantai += 1;
  }
  const hasil = [...segmen.slice(0, akhirRantai), ...komponen, ...segmen.slice(akhirRantai)];
  return awal + hasil.join('/');
}

/** Gambar mini persegi untuk daftar: bagian atas halaman (judul dan kop surat biasanya di atas). */
export function urlMini(urlHasil: string, sisi = 300): string | null {
  const s = Math.round(sisi);
  return tambahkanKomponen(urlHasil, [`c_fill,g_north,h_${s},w_${s}`, 'f_auto', 'q_auto']);
}

/** Tampilan satu halaman utuh di layar detail: diperkecil (tidak pernah diperbesar). */
export function urlTampil(urlHasil: string, sisiMaks = 1200): string | null {
  const s = Math.round(sisiMaks);
  return tambahkanKomponen(urlHasil, [`c_limit,h_${s},w_${s}`, 'f_auto', 'q_auto']);
}