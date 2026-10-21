// Logika murni Edge Function `delete-document` (tugas 7.5). Berkas ini tidak memakai API Deno
// maupun paket npm, jadi bisa diuji dengan `npm test` di Node dan dipakai `index.ts` di Deno.
//
// Urutan yang dijaga: (1) pastikan pemanggil pemilik dokumen, (2) hapus SEMUA file di
// Cloudinary, (3) baru hapus baris database. Bila langkah 2 gagal sebagian, baris database
// tidak disentuh, sehingga pengguna bisa mengulang tanpa kehilangan jejak file yang tersisa.

export type KonfigCloudinary = { cloudName: string; apiKey: string; apiSecret: string };

export const FORMAT_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

type FetchFn = (
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

export type Deps = {
  /** null bila dokumen tidak ada atau tidak terlihat oleh pemanggil (RLS). */
  cariDokumen(id: string): Promise<{ userId: string } | null>;
  daftarPublicId(dokumenId: string): Promise<string[]>;
  hapusAset(publicId: string): Promise<HasilHapusAset>;
  /** true bila tepat satu baris terhapus. */
  hapusBaris(dokumenId: string): Promise<boolean>;
  /** Mencatat penyebab kegagalan ke log fungsi (jangan pernah mengisinya dengan secret). */
  catat?(pesan: string, galat: unknown): void;
};

export type KodeGalat =
  | 'belum_masuk'
  | 'permintaan_salah'
  | 'tidak_ada'
  | 'bukan_pemilik'
  | 'cloudinary_gagal'
  | 'gagal_hapus_baris'
  | 'galat_server';

export type Jawaban =
  | { status: 200; body: { ok: true; dihapus: number } }
  | { status: number; body: { ok: false; kode: KodeGalat; pesan: string } };

const PESAN: Record<KodeGalat, string> = {
  belum_masuk: 'Kamu belum masuk.',
  permintaan_salah: 'Permintaan tidak sah.',
  tidak_ada: 'Dokumen tidak ditemukan.',
  bukan_pemilik: 'Dokumen ini bukan milikmu.',
  cloudinary_gagal: 'Sebagian file belum bisa dihapus dari Cloudinary. Coba lagi.',
  gagal_hapus_baris: 'File sudah dihapus, tetapi catatan dokumen belum. Coba lagi.',
  galat_server: 'Terjadi masalah di server. Coba lagi sebentar lagi.',
};

const STATUS: Record<KodeGalat, number> = {
  belum_masuk: 401,
  permintaan_salah: 400,
  tidak_ada: 404,
  bukan_pemilik: 403,
  cloudinary_gagal: 502,
  gagal_hapus_baris: 500,
  galat_server: 500,
};

function galat(kode: KodeGalat): Jawaban {
  return { status: STATUS[kode], body: { ok: false, kode, pesan: PESAN[kode] } };
}

/** Menjalankan `kerja` untuk tiap item dengan paling banyak `batas` panggilan bersamaan. */
async function berbatas<T, R>(
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

export const BATAS_BERSAMAAN = 4;

export async function prosesHapus(
  masukan: { userId: string | null; dokumenId: unknown },
  deps: Deps,
): Promise<Jawaban> {
  if (!masukan.userId) return galat('belum_masuk');
  if (typeof masukan.dokumenId !== 'string' || !FORMAT_UUID.test(masukan.dokumenId)) {
    return galat('permintaan_salah');
  }
  const dokumenId = masukan.dokumenId;
  try {
    const dokumen = await deps.cariDokumen(dokumenId);
    if (!dokumen) return galat('tidak_ada');
    if (dokumen.userId !== masukan.userId) return galat('bukan_pemilik');

    const idCloud = (await deps.daftarPublicId(dokumenId)).filter((id) => id.trim() !== '');
    const hasil = await berbatas(idCloud, BATAS_BERSAMAAN, (id) => deps.hapusAset(id));
    const gagal = hasil.flatMap((h, i) => (h.status === 'rejected' ? [{ id: idCloud[i], h }] : []));
    for (const { id, h } of gagal)
      deps.catat?.(`Gagal menghapus aset ${id}`, (h as PromiseRejectedResult).reason);
    if (gagal.length > 0) return galat('cloudinary_gagal');

    if (!(await deps.hapusBaris(dokumenId))) return galat('gagal_hapus_baris');
    return { status: 200, body: { ok: true, dihapus: idCloud.length } };
  } catch (alasan) {
    deps.catat?.(`Galat tak terduga saat menghapus dokumen ${dokumenId}`, alasan);
    return galat('galat_server');
  }
}
