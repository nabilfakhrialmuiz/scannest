// Penghapusan file di Cloudinary, dipakai bersama oleh `delete-document` (pengguna menghapus
// dokumennya) dan fungsi admin (hapus dokumen atau akun orang lain). Berkas ini tidak memakai
// API Deno maupun paket npm, jadi bisa diuji dengan `npm test` di Node.
//
// Urutan yang selalu dijaga pemanggilnya: (1) hapus SEMUA file di Cloudinary, (2) baru hapus
// baris database. Bila langkah 1 gagal sebagian, database tidak disentuh, sehingga aksi bisa
// diulang tanpa kehilangan jejak file yang tersisa.

export type KonfigCloudinary = { cloudName: string; apiKey: string; apiSecret: string };

async function sha1Hex(teks: string): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(teks));
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Tanda tangan Cloudinary: pasangan `nama=nilai` diurutkan menurut nama, digabung dengan `&`,
 * API secret ditambahkan di akhir tanpa pemisah, lalu di-hash SHA-1 (heksadesimal).
 * `file`, `cloud_name`, `resource_type`, dan `api_key` tidak ikut ditandatangani.
 */
export async function tandatangani(
  parameter: Record<string, string | number>,
  apiSecret: string,
): Promise<string> {
  const teks = Object.keys(parameter)
    .sort()
    .map((nama) => `${nama}=${parameter[nama]}`)
    .join('&');
  return sha1Hex(teks + apiSecret);
}

export type HasilHapusAset = 'ok' | 'tidak_ada';

export class GalatCloudinary extends Error {}

export type FetchFn = (
  input: string,
  init: { method: string; body: string; headers: Record<string, string> },
) => Promise<{
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
}>;

/**
 * Menghapus satu gambar (beserta turunannya) lewat Upload API `destroy`. Aset yang sudah tidak
 * ada dianggap berhasil (`tidak_ada`), sehingga menghapus ulang aman. Galat lain dilempar.
 */
export async function hapusAsetCloudinary(
  publicId: string,
  konfig: KonfigCloudinary,
  panggil: FetchFn,
  sekarang: () => number = () => Date.now(),
): Promise<HasilHapusAset> {
  const timestamp = Math.floor(sekarang() / 1000);
  const bertanda = { invalidate: 'true', public_id: publicId, timestamp };
  const signature = await tandatangani(bertanda, konfig.apiSecret);
  const body = new URLSearchParams({
    public_id: publicId,
    invalidate: 'true',
    timestamp: String(timestamp),
    api_key: konfig.apiKey,
    signature,
  }).toString();

  let jawaban;
  try {
    jawaban = await panggil(`https://api.cloudinary.com/v1_1/${konfig.cloudName}/image/destroy`, {
      method: 'POST',
      body,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  } catch {
    throw new GalatCloudinary('Cloudinary tidak terjangkau');
  }

  let isi: unknown = null;
  try {
    isi = await jawaban.json();
  } catch {
    // isi bukan JSON; ditangani di bawah lewat status
  }
  const hasil = (isi as { result?: unknown } | null)?.result;
  if (hasil === 'ok') return 'ok';
  if (hasil === 'not found') return 'tidak_ada';
  throw new GalatCloudinary(`Cloudinary menolak penghapusan (status ${jawaban.status})`);
}

export const BATAS_BERSAMAAN = 4;

/** Menjalankan `kerja` untuk tiap item dengan paling banyak `batas` panggilan bersamaan. */
export async function berbatas<T, R>(
  item: T[],
  batas: number,
  kerja: (x: T) => Promise<R>,
): Promise<PromiseSettledResult<R>[]> {
  const hasil: PromiseSettledResult<R>[] = new Array(item.length);
  let berikut = 0;
  async function pekerja() {
    while (berikut < item.length) {
      const i = berikut++;
      try {
        hasil[i] = { status: 'fulfilled', value: await kerja(item[i] as T) };
      } catch (alasan) {
        hasil[i] = { status: 'rejected', reason: alasan };
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(batas, item.length) }, pekerja));
  return hasil;
}

/**
 * Menghapus banyak aset (paling banyak BATAS_BERSAMAAN sekaligus) dan mengembalikan jumlah
 * yang GAGAL. Id kosong dilewati. Tiap kegagalan dicatat lewat `catat`.
 */
export async function hapusBanyakAset(
  daftarId: string[],
  hapusAset: (publicId: string) => Promise<HasilHapusAset>,
  catat?: (pesan: string, galat: unknown) => void,
): Promise<{ total: number; gagal: number }> {
  const idCloud = daftarId.filter((id) => id.trim() !== '');
  const hasil = await berbatas(idCloud, BATAS_BERSAMAAN, (id) => hapusAset(id));
  let gagal = 0;
  hasil.forEach((h, i) => {
    if (h.status === 'rejected') {
      gagal += 1;
      catat?.(`Gagal menghapus aset ${idCloud[i]}`, h.reason);
    }
  });
  return { total: idCloud.length, gagal };
}
