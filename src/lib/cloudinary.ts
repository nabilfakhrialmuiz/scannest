import { Platform } from 'react-native';

import {
    JEDA_ULANG_MS,
    MAKS_ULANG,
    UploadError,
    bacaJawaban,
    bisaDiulang,
    cekUkuran,
    jenisDariStatus,
    pesanDariBadan,
    type HasilUnggah,
} from './cloudinaryErrors';
import { env } from './env';

export { UploadError } from './cloudinaryErrors';
export type { HasilUnggah } from './cloudinaryErrors';

// Unggah tanpa tanda tangan (unsigned upload preset, K5): hanya `file` dan `upload_preset` yang
// dikirim. Folder, format yang diizinkan, larangan public_id, dan transformasi masuk semuanya
// diatur di preset, karena permintaan tanpa tanda tangan hanya boleh membawa parameter terbatas.
// Tidak ada API secret di aplikasi.

const WAKTU_HABIS_MS = 60_000;

export function cloudinaryTerpasang(): boolean {
  return Boolean(env.cloudinaryCloudName && env.cloudinaryUploadPreset);
}

type Opsi = {
  /** Dipanggil dengan nilai 0 sampai 1 selama pengiriman. */
  onProgress?: (bagian: number) => void;
  signal?: AbortSignal;
};

// Membaca berkas lokal sebagai blob untuk mengetahui ukurannya. Gagal membaca bukan masalah:
// ukuran dianggap tidak diketahui dan Cloudinary tetap menolak yang terlalu besar.
async function bacaBlob(uri: string): Promise<Blob | null> {
  try {
    const jawaban = await fetch(uri);
    return await jawaban.blob();
  } catch {
    return null;
  }
}

function bentukForm(uri: string, blob: Blob | null): FormData {
  const form = new FormData();
  if (Platform.OS === 'web') {
    // Di web (dipakai untuk uji di peramban) berkas harus berupa Blob.
    if (!blob) throw new UploadError('jaringan');
    form.append('file', blob, 'halaman.jpg');
  } else {
    // Di Android, React Native membaca berkas dari URI lewat objek {uri, name, type}.
    form.append('file', { uri, name: 'halaman.jpg', type: 'image/jpeg' } as unknown as Blob);
  }
  form.append('upload_preset', env.cloudinaryUploadPreset ?? '');
  return form;
}

// Satu kali pengiriman. XMLHttpRequest dipakai (bukan fetch) agar kemajuan unggahan bisa dilaporkan.
function kirim(url: string, form: FormData, { onProgress, signal }: Opsi): Promise<HasilUnggah> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new UploadError('dibatalkan'));
      return;
    }
    const xhr = new XMLHttpRequest();
    const batal = () => xhr.abort();
    signal?.addEventListener('abort', batal, { once: true });
    const bersihkan = () => signal?.removeEventListener('abort', batal);

    xhr.open('POST', url);
    xhr.timeout = WAKTU_HABIS_MS;
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0) onProgress?.(event.loaded / event.total);
    };
    xhr.onload = () => {
      bersihkan();
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(bacaJawaban(JSON.parse(xhr.responseText)));
        } catch (galat) {
          reject(galat instanceof UploadError ? galat : new UploadError('tidakvalid'));
        }
        return;
      }
      reject(new UploadError(jenisDariStatus(xhr.status), pesanDariBadan(xhr.responseText)));
    };
    xhr.onerror = () => {
      bersihkan();
      reject(new UploadError('jaringan'));
    };
    xhr.ontimeout = () => {
      bersihkan();
      reject(new UploadError('waktuhabis'));
    };
    xhr.onabort = () => {
      bersihkan();
      reject(new UploadError('dibatalkan'));
    };
    xhr.send(form);
  });
}

function tunggu(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new UploadError('dibatalkan'));
      return;
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', batal);
      resolve();
    }, ms);
    const batal = () => {
      clearTimeout(timer);
      reject(new UploadError('dibatalkan'));
    };
    signal?.addEventListener('abort', batal, { once: true });
  });
}

/**
 * Mengunggah satu foto ke Cloudinary: cek pengaturan, cek ukuran (tugas 5.4), kirim dengan
 * kemajuan (5.3), dan ulangi sampai MAKS_ULANG kali dengan jeda bertahap bila galatnya
 * mungkin sementara (5.5). Galat yang pasti permanen (preset salah, format ditolak) tidak diulang.
 */
export async function uploadImage(uri: string, opsi: Opsi = {}): Promise<HasilUnggah> {
  if (!env.cloudinaryCloudName || !env.cloudinaryUploadPreset) {
    throw new UploadError('config');
  }
  const url = `https://api.cloudinary.com/v1_1/${env.cloudinaryCloudName}/image/upload`;

  const blob = await bacaBlob(uri);
  cekUkuran(blob ? blob.size : null);

  for (let percobaan = 0; ; percobaan += 1) {
    try {
      opsi.onProgress?.(0);
      return await kirim(url, bentukForm(uri, blob), opsi);
    } catch (galat) {
      const kind = galat instanceof UploadError ? galat.kind : 'jaringan';
      if (percobaan >= MAKS_ULANG || !bisaDiulang(kind)) {
        throw galat instanceof UploadError ? galat : new UploadError('jaringan');
      }
      await tunggu(JEDA_ULANG_MS[percobaan] ?? 3000, opsi.signal);
    }
  }
}

