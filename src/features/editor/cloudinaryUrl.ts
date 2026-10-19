import type { CropPiksel, Efek, FilterFoto } from './efek';

// Membangun URL transformasi Cloudinary dari efek (tugas 6.2). Murni dan tanpa dependensi.
//
// Urutan rantai: crop -> rotasi -> filter -> kecerahan -> kontras (-> perkecil untuk preview).
// Setiap langkah adalah komponen sendiri yang dipisah "/", sesuai aturan rantai Cloudinary.
// Sintaks tiap komponen diuji langsung ke akun Cloudinary pada 18 Oktober 2026 (panduan bagian 3).

/** Kecerahan Cloudinary menolak -100 ("Brightness must be > -100"), jadi batas bawahnya -99. */
const KECERAHAN_MIN_CLOUDINARY = -99;

const KOMPONEN_FILTER: Record<FilterFoto, string | null> = {
  asli: null,
  dokumen: 'e_improve',
  hitam_putih: 'e_blackwhite',
  abu_abu: 'e_grayscale',
  tajam: 'e_sharpen',
};

/** Crop dianggap sah bila semua angkanya terhingga, x dan y tidak negatif, serta lebar dan tinggi minimal 1. */
export function cropSah(crop: CropPiksel | null): crop is CropPiksel {
  if (!crop) return false;
  const { x, y, w, h } = crop;
  if (![x, y, w, h].every(Number.isFinite)) return false;
  return Math.round(x) >= 0 && Math.round(y) >= 0 && Math.round(w) >= 1 && Math.round(h) >= 1;
}

/** Daftar komponen transformasi (tanpa "/"). Kosong bila foto dibiarkan asli. */
export function komponenTransformasi(efek: Efek): string[] {
  const hasil: string[] = [];
  if (cropSah(efek.crop)) {
    const { x, y, w, h } = efek.crop;
    // g_north_west membuat x dan y dihitung dari pojok kiri atas foto (diuji: crop yang melewati
    // tepi kanan terpotong di tepi, bukan bergeser).
    hasil.push(
      `c_crop,g_north_west,h_${Math.round(h)},w_${Math.round(w)},x_${Math.round(x)},y_${Math.round(y)}`,
    );
  }
  if (efek.rotasi !== 0) hasil.push(`a_${efek.rotasi}`);
  const filter = KOMPONEN_FILTER[efek.filter];
  if (filter) hasil.push(filter);
  const kecerahan = Math.max(KECERAHAN_MIN_CLOUDINARY, Math.min(100, Math.round(efek.kecerahan)));
  if (kecerahan !== 0) hasil.push(`e_brightness:${kecerahan}`);
  const kontras = Math.max(-100, Math.min(100, Math.round(efek.kontras)));
  if (kontras !== 0) hasil.push(`e_contrast:${kontras}`);
  return hasil;
}

type OpsiUrl = {
  /** Bila diisi, hasil diperkecil (tidak pernah diperbesar) ke sisi terpanjang ini, lalu `q_auto`. Untuk preview dan gambar mini. */
  sisiMaks?: number;
};

const PENANDA = '/image/upload/';

/**
 * Menyisipkan transformasi ke URL asli. Memakai `url_asli` dari database (bukan nama cloud dari
 * `.env`) supaya versi dan ekstensi berkas ikut terbawa persis. Mengembalikan null bila bentuk URL
 * tidak dikenali; pemanggil menampilkan galat, bukan gambar rusak.
 */
export function buildCloudinaryUrl(urlAsli: string, efek: Efek, opsi: OpsiUrl = {}): string | null {
  const titik = urlAsli.indexOf(PENANDA);
  if (titik < 0) return null;
  const awal = urlAsli.slice(0, titik + PENANDA.length);
  const sisa = urlAsli.slice(titik + PENANDA.length);
  // `url_asli` hasil unggahan tidak boleh sudah memuat transformasi: sisanya harus diawali versi (v123/) atau public_id.
  if (/^[a-z]{1,3}_[^/]*\//.test(sisa)) return null;

  const komponen = komponenTransformasi(efek);
  if (opsi.sisiMaks && opsi.sisiMaks > 0) {
    const s = Math.round(opsi.sisiMaks);
    komponen.push(`c_limit,h_${s},w_${s}`, 'q_auto');
  }
  return komponen.length === 0 ? urlAsli : `${awal}${komponen.join('/')}/${sisa}`;
}
