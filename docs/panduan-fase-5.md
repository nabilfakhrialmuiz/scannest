# Panduan Fase 5: Unggah ke Cloudinary dan Simpan Dokumen (Scannest)

**Untuk:** Nabil Fakhri Al Muiz · **Terakhir diperbarui:** 19 Oktober 2026 (checklist dicentang; isi tidak berubah) · **Sinkron dengan:** `ROADMAP.md` v0.10 (Fase 5, tugas 5.0 sampai 5.9)

Setelah Fase 5 selesai, sesi scan dari Fase 4 bisa **disimpan sebagai dokumen**: tiap halaman diunggah ke Cloudinary (dengan indikator kemajuan dan ulang otomatis), lalu dicatat ke tabel `dokumen` dan `halaman_dokumen` di Supabase. Bila satu halaman gagal, halaman sebelumnya tetap aman dan kamu cukup menekan **Coba lagi**; hanya halaman yang belum selesai yang dikerjakan ulang.

**Apa yang sudah dan belum saya uji:**

- Sudah: seluruh kode saya jalankan sebagai aplikasi web (React Native Web, Expo SDK 54) dengan kamera tiruan Chromium, melawan **Cloudinary dan tabel database tiruan** buatan saya. **46 skenario lulus**: simpan 3 halaman sukses (urutan kejadian, isi tiap kolom, hanya parameter `file` dan `upload_preset` yang dikirim), judul kosong, gagal di halaman tengah lalu **Coba lagi** (hanya halaman yang gagal diunggah ulang, dokumen tidak dibuat dua kali), preset ditolak (tidak diulang), jaringan putus (tiga percobaan), database gagal setelah Cloudinary berhasil (**tidak diunggah dua kali**), jawaban database hilang (kunci unik 23505 dikenali sebagai sudah tersimpan), hapus halaman yang gagal, pembuatan dokumen gagal, penolakan RLS, dan ketukan ganda. Ada juga **45 uji unit** untuk aturan unggah (jenis galat, pesan, batas 8 MB, jeda ulang, pembacaan jawaban Cloudinary) dan judul dokumen. `typecheck`, `lint`, `format:check`, `cek:kontras` bersih, dan urutan langkah panduan ini saya putar ulang: `typecheck` **0 galat** setelah tiap berkas, kecuali satu galat sementara di antara 8.1 dan 8.3 (bagian 8 menjelaskannya) yang hilang setelah `kamera.tsx` diganti.
- Belum: **Cloudinary milikmu dan Supabase milikmu yang sungguhan**, serta **HP / Expo Go**. Khususnya belum terbukti: (1) pengiriman berkas dari URI Android lewat `FormData` ({`uri`, `name`, `type`}, cara standar React Native), (2) pembacaan ukuran berkas dengan `fetch(uri)` di Android, (3) nama bidang jawaban Cloudinary (`public_id`, `secure_url`, `bytes`, `width`, `height`; saya tidak berhasil membuka halaman referensinya secara utuh, jadi tugas 5.1 meminta kamu membuktikannya dengan `curl`), dan (4) kalimat pesan galat asli Cloudinary (pola pesan saya berasal dari yang umum terlihat, dengan cadangan menampilkan pesan aslinya). Uji tugas 5.9 di HP-mu adalah bukti sebenarnya.

---

## Daftar isi

1. Peta tugas dan keputusan
2. Tugas 5.0: tutup Fase 4 dan siapkan cabang
3. Tugas 5.1: upload preset di Cloudinary
4. Tugas 5.2: `.env` dan modul unggah
5. Tugas 5.3 sampai 5.5: kemajuan, batas ukuran, ulang otomatis
6. Tugas 5.6: simpan ke Supabase
7. Tugas 5.7: sesi yang tahan gagal sebagian
8. Tugas 5.8: merakit layar
9. Cek akhir kode
10. Tugas 5.9: uji di HP, commit, pull request
11. Yang perlu diingat saat coding nanti
12. Pemecahan masalah
13. Checklist akhir Fase 5
14. Daftar berkas Fase 5
15. Sumber

---

## 1. Peta tugas dan keputusan

| Tugas | Isi | Bagian |
|---|---|---|
| 5.0 | Tutup Fase 4 (dokumen terbaru masuk repo), cabang `fase-5-cloudinary` | 2 |
| 5.1 | Buat **unsigned upload preset** di Cloudinary dan buktikan dengan `curl` | 3 |
| 5.2 | `.env` Cloudinary; `src/lib/cloudinary.ts` dengan `uploadImage(uri)` | 4 |
| 5.3 | `XMLHttpRequest` agar kemajuan unggahan bisa ditampilkan | 5 |
| 5.4 | Tolak foto lebih dari 8 MB sebelum diunggah | 5 |
| 5.5 | Ulang 2 kali dengan jeda bertahap, lalu pesan galat yang jelas | 5 |
| 5.6 | Buat `dokumen` (draft) dan isi `halaman_dokumen` | 6 |
| 5.7 | Halaman sebelumnya aman bila halaman ke-N gagal; ulang hanya yang gagal | 7 |
| 5.8 | Layar daftar halaman: judul, tombol simpan, status per halaman, Dashboard | 8 |
| 5.9 | Uji di HP, commit, PR, CI hijau, merge | 10 |

Nomor 5.1 sampai 5.7 sama dengan roadmap v0.8; 5.0, 5.8, dan 5.9 ditambahkan pada v0.9.

**Pintasan (opsional):** `scannest-fase5-kode.zip` berisi 12 berkas kode Fase 5 dengan susunan folder yang sama dengan repomu. Kamu boleh mengekstraknya ke `C:\scannest` (timpa berkas yang ada) alih-alih mengetik satu per satu, tetapi baca bagian 4 sampai 8 agar paham isinya. Tugas 5.1 (Cloudinary) dan pengisian `.env` tetap harus kamu kerjakan sendiri.

### Alur menyimpan, dalam satu gambar

```
Daftar halaman ──[Simpan dokumen]──▶ judul valid? Cloudinary diatur? ──tidak──▶ pesan galat
                                              │ ya
                                              ▼
                              buat baris `dokumen` (draft), sekali saja
                                              │
              untuk tiap halaman, berurutan, berhenti di yang pertama gagal:
                                              │
        unggah ke Cloudinary ──▶ simpan baris `halaman_dokumen` ──▶ status "Tersimpan"
        (kemajuan %, ulang 2×)    (urutan, url, public_id, ukuran)
              │ gagal                         │ gagal
              ▼                               ▼
        status "Gagal"                 status "Terunggah" + pesan
        (hasil lama tidak ada)         (hasil unggahan DISIMPAN, tidak diunggah ulang)
                                              │
                  tombol berubah menjadi [Coba lagi (N halaman)]: hanya sisa halaman diproses
```

### Keputusan teknis (dicek 17 Oktober 2026)

**K27: kapan foto diunggah.**

| Pilihan | Pro | Kontra |
|---|---|---|
| **Saat menekan Simpan dokumen** (dipilih) | Kamu bebas mengurutkan, menghapus, dan memberi judul dulu; tidak ada unggahan yang terbuang untuk halaman yang akhirnya dibuang; urutan di database langsung final | Sesi (di memori) hilang bila aplikasi ditutup paksa sebelum disimpan, jadi foto yang belum disimpan ikut hilang |
| Langsung setelah Pakai foto | Foto aman di cloud lebih cepat | Halaman yang dihapus atau diurutkan ulang meninggalkan unggahan terbuang dan urutan rumit; unsigned upload tidak bisa menghapus aset |

Ini **mengoreksi** catatan K23 di roadmap v0.8, yang berharap Fase 5 mengunggah per halaman segera setelah Pakai foto. Risiko kehilangan sesi diterima; biasakan menekan **Simpan dokumen** setelah selesai memotret.

**K28: unggah berurutan dan berhenti di kegagalan pertama.** Pro: kegagalan karena jaringan atau preset hampir selalu berlaku untuk semua halaman, jadi berhenti lebih cepat daripada mengulang untuk tiap halaman; halaman sebelumnya pasti sudah tersimpan. Kontra: satu halaman bermasalah menahan halaman sesudahnya sampai kamu mengulang atau menghapusnya.

**K29: hasil unggahan ikut disimpan di sesi.** Bila Cloudinary berhasil tetapi database gagal, percobaan ulang hanya mengulang penulisan ke database. Pro: tidak ada unggahan ganda, tidak ada kuota terbuang. Kontra: sedikit logika tambahan (status `diunggah`).

**K30: `.env` Cloudinary tidak membuat aplikasi gagal saat dibuka.** Berbeda dengan Supabase (tanpanya login mustahil), Cloudinary hanya dibutuhkan saat menyimpan. Pesan yang jelas muncul saat **Simpan dokumen** ditekan. Pro: login dan kamera tetap bisa diuji meski kamu belum menyelesaikan 5.1. Kontra: salah ketik nama variabel baru ketahuan saat menyimpan.

**Risiko yang diterima (K5): unsigned preset.** Nama preset dan cloud name terbaca dari APK, sehingga siapa pun yang mengambilnya bisa mengunggah ke akun Cloudinary-mu (menghabiskan kuota). Pengamannya: `allowed_formats`, `disallow_public_id`, dan *incoming transformation* di preset; dokumentasi Cloudinary juga menganjurkan unggahan bertanda tangan untuk kasus sensitif. Unggahan bertanda tangan lewat Edge Function dicatat sebagai backlog **B14** (P2, Fase 9). Penghapusan aset Cloudinary juga butuh permintaan bertanda tangan, itulah sebabnya K6 memakai Edge Function (Fase 8); aset yang terunggah tetapi tidak tercatat (misalnya aplikasi ditutup di tengah penyimpanan) dicatat sebagai **B15**.

---

## 2. Tugas 5.0: tutup Fase 4 dan siapkan cabang

Kamu melaporkan panduan Fase 4 selesai semua. Saya mencentangnya di `ROADMAP.md` v0.9 berdasarkan laporanmu. Satu hal tetap saya tanyakan: **hasil uji orientasi foto (daftar uji 12.2 nomor 7 sampai 9 di panduan Fase 4)**. Bila ada foto portrait atau landscape yang miring atau terbalik, beri tahu saya sebelum melanjutkan, karena foto yang miring akan ikut terunggah ke Cloudinary.

### 2.1 Cek keadaan Fase 4

```bash
cd C:\scannest
git status
git switch main
git pull
git log --oneline -5
```

`git status` harus bersih dan `git log` memuat commit Fase 4. Bila Fase 4 belum digabung ke `main`, selesaikan pull request-nya dulu (panduan Fase 4 bagian 12.3).

### 2.2 Salin dokumen terbaru

1. Unduh `scannest-dokumen.zip` dari percakapan ini dan ekstrak.
2. Salin `ROADMAP.md` ke akar `C:\scannest` (timpa), dan isi folder `docs` ke `C:\scannest\docs` (timpa; akan bertambah `panduan-fase-5.md`, dan `panduan-fase-4.md` berubah karena checklist-nya dicentang).

### 2.3 Cabang

```bash
git switch -c fase-5-cloudinary
git add ROADMAP.md docs
git commit -m "docs: roadmap v0.9 dan panduan fase 5"
```

---

## 3. Tugas 5.1: upload preset di Cloudinary

Bagian ini kamu kerjakan di situs Cloudinary; saya tidak bisa membuka akunmu. Kamu butuh akun Cloudinary (paket Free cukup: 25 kredit per bulan, file gambar maksimum **10 MB** dan **25 megapiksel** per unggahan).

### 3.1 Cloud name

Masuk ke https://console.cloudinary.com. Cloud name ada di dashboard (bagian *Product Environment* / *Cloud name*). Catat; ini nilai `EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME`.

### 3.2 Buat upload preset

Di Console: **Settings** (ikon roda gigi) → **Upload Presets** → **Add Upload Preset**. Isi:

| Pengaturan | Nilai | Mengapa |
|---|---|---|
| Nama preset | misalnya `scannest_unsigned` | Ini nilai `EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET`. Terlihat publik di aplikasi. |
| **Signing mode** | **Unsigned** | Aplikasi tidak boleh memegang API secret (K5). |
| Folder (*asset folder*) | `scannest` | Merapikan semua foto di satu folder. |
| **Allowed formats** (`allowed_formats`) | `jpg,png` | Menolak jenis berkas lain. |
| **Disallow public ID** (`disallow_public_id`) | aktif | Mencegah pengunggah menentukan nama berkas sendiri. Tanpa ini, permintaan bisa menimpa nama yang dibuat preset. |
| **Incoming transformation** | `c_limit,w_2000,h_2000` | Menjaga ukuran maksimum 2000 × 2000 di sisi Cloudinary (sejalan dengan normalisasi Fase 4). |
| Nama berkas | biarkan nama acak (jangan pakai nama berkas asli) | `public_id` acak lebih aman dan unik. |

Simpan. Nama tepat tiap kolom di Console bisa sedikit berbeda dari tabel ini (dokumentasi Cloudinary tidak menyebut label antarmukanya, dan saya tidak bisa membuka Console-mu); cari nama parameter di dalam kurung. Pengaturan umumnya ada di tab **Upload** (termasuk bagian *Upload control*) dan tab untuk transformasi masuk.

Dua hal penting dari dokumentasi Cloudinary (halaman *Upload presets* dan *Client-side uploading*): permintaan **tanpa tanda tangan hanya boleh membawa parameter terbatas**, jadi semua pengaturan di atas **harus** berada di preset; dan permintaan tanpa tanda tangan **tidak bisa menimpa** aset yang sudah ada.

### 3.3 Buktikan dengan `curl` (wajib)

Ini membuktikan preset benar **dan** menunjukkan bentuk jawaban asli Cloudinary yang dibaca kode kita. Ambil satu foto `.jpg` apa saja.

**Siapkan berkas dulu (jangan lewati).** `foto-uji.jpg` di bawah hanyalah contoh nama; berkas itu tidak ada di komputermu kecuali kamu membuatnya (begitu pula `berkas-uji.gif` untuk uji penolakan; buat dengan membuka sembarang gambar di Paint lalu **Save as > GIF picture**; jangan sekadar mengganti ekstensi, karena isi berkasnya tetap JPEG, letakkan di folder yang sama). Pindah ke folder tempat fotonya berada, pastikan namanya terbaca persis, lalu pakai **nama berkas saja** (tanpa jalur), supaya tidak ada masalah tanda kutip dan garis miring:

```bash
cd /d C:\Users\NAMAMU\Downloads
dir *.jpg
```

Ganti `NAMAMU` dengan nama folder penggunamu. Bila `dir` tidak menampilkan fotonya, berkas belum ada di folder itu. Di File Explorer, aktifkan **View > Show > File name extensions** agar kamu melihat nama aslinya (kesalahan umum: `foto.jpg.jpg` atau `foto.jpeg`). Ganti `CLOUD`, `PRESET`, dan `foto-uji.jpg` dengan nama berkasmu:

```bash
curl.exe -X POST -F "file=@foto-uji.jpg" -F "upload_preset=PRESET" https://api.cloudinary.com/v1_1/CLOUD/image/upload
```

Bila muncul `curl: (26) Failed to open/read local data from file/application`, curl **tidak bisa membuka berkas lokalnya**; permintaan belum sampai ke Cloudinary, jadi galat ini tidak ada hubungannya dengan preset. Penyebab tersering: nama atau jalur berkas salah (cek dengan `dir`), ekstensi tersembunyi, tanda kutip ganda di dalam tanda kutip (hasil *Copy as path* dari Explorer sudah membawa kutip; hapus kutip bawaannya), atau berkas masih berstatus *online-only* di OneDrive (klik kanan > *Always keep on this device*). Tanda koma, titik koma, atau kutip di dalam jalur juga membingungkan `curl -F`; salin foto ke folder sederhana seperti `C:\uji`.

Hasil yang benar: JSON berisi `public_id`, `secure_url` (diawali `https://`), `bytes`, `width`, `height`, `format`. **Kirimkan JSON itu kepada saya** (boleh dengan nama cloud-mu dihapus); kode `bacaJawaban` memeriksa lima bidang pertama, dan saya ingin memastikannya cocok. Lalu cek di Console: **Media Library** harus memuat foto itu di folder `scannest`.

Dua uji penolakan (keduanya harus **gagal** dengan pesan galat berformat JSON `{"error":{"message":...}}`):

```bash
curl.exe -X POST -F "file=@berkas-uji.gif" -F "upload_preset=PRESET" https://api.cloudinary.com/v1_1/CLOUD/image/upload
curl.exe -X POST -F "file=@foto-uji.jpg" -F "upload_preset=PRESET" -F "public_id=nama-sendiri" https://api.cloudinary.com/v1_1/CLOUD/image/upload
```

Yang pertama (gif) harus ditolak oleh `allowed_formats`. Yang kedua (`public_id` buatan sendiri) harus **tidak** menghasilkan `public_id` bernama `nama-sendiri`: ia ditolak, atau namanya diabaikan dan tetap acak. Kirimkan hasil keduanya juga; itu bukti `disallow_public_id` bekerja. Hapus foto-foto uji ini dari Media Library lewat Console agar kuotamu bersih.

---

## 4. Tugas 5.2: `.env` dan modul unggah

### 4.1 Isi `.env`

Buka `C:\scannest\.env` dan isi dua baris terakhir (`.env.example` sudah memuatnya sejak Fase 0):

```
EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME=cloud-namamu
EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET=scannest_unsigned
```

Dua nilai ini **bukan rahasia** (terbaca dari APK, memang begitu rancangannya), tetapi `.env` tetap tidak di-commit. **API secret Cloudinary tidak boleh ada di sini.** Setelah mengubah `.env`, hentikan Metro dan jalankan `npx expo start --clear`; di awal log harus tampil `env: export ...` dengan **empat** nama variabel.

### 4.2 `src/lib/env.ts`

**Berkas:** `src/lib/env.ts` (berkas lama: ganti seluruh isinya)

```ts
// Membaca variabel lingkungan dari .env.
// Penulisan `process.env.EXPO_PUBLIC_NAMA` harus persis seperti ini (bukan lewat destructuring atau
// nama dinamis), karena Expo mengganti teks tersebut dengan nilainya saat aplikasi dibundel.
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const cloudinaryCloudName = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME;
const cloudinaryUploadPreset = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

// Gagal cepat dengan pesan jelas bila .env belum diisi, daripada galat samar dari Supabase.
if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error(
    'EXPO_PUBLIC_SUPABASE_URL dan EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY belum diisi di .env. ' +
      'Isi keduanya (lihat .env.example), lalu jalankan ulang dengan: npx expo start --clear',
  );
}

export const env = {
  supabaseUrl,
  supabasePublishableKey,
  // Cloudinary sengaja tidak membuat aplikasi gagal saat dibuka: login dan kamera tetap jalan,
  // dan pesan jelas baru muncul saat pengguna menekan Simpan dokumen (lihat cloudinary.ts).
  cloudinaryCloudName: cloudinaryCloudName?.trim() || null,
  cloudinaryUploadPreset: cloudinaryUploadPreset?.trim() || null,
} as const;
```

Dua variabel Cloudinary berisi `null` bila kosong (K30), bukan melempar galat seperti Supabase.

### 4.3 `src/lib/cloudinaryErrors.ts`

Bagian "murni" (tanpa modul React Native) sehingga mudah diuji dengan Node: jenis galat, pesan, aturan ulang, batas ukuran, dan pembacaan jawaban.

**Berkas:** `src/lib/cloudinaryErrors.ts` (berkas baru: buat)

```ts
import { z } from 'zod';

// Bagian "murni" unggahan Cloudinary: jenis galat, pesan, aturan ulang, dan pembacaan jawaban.
// Tidak memakai modul React Native sehingga bisa diuji langsung dengan Node.

/** Batas ukuran sebelum diunggah (tugas 5.4). Paket Free Cloudinary menolak di atas 10 MB. */
export const BATAS_UKURAN_BYTE = 8 * 1024 * 1024;

/** Percobaan ulang setelah gagal pertama, dan jeda (ms) sebelum tiap percobaan ulang. */
export const MAKS_ULANG = 2;
export const JEDA_ULANG_MS = [1000, 3000] as const;

export type UploadErrorKind =
  | 'config' // .env Cloudinary belum diisi
  | 'terlalubesar' // lebih dari BATAS_UKURAN_BYTE
  | 'jaringan' // tidak terhubung
  | 'waktuhabis' // melebihi batas waktu
  | 'server' // Cloudinary 5xx atau 429
  | 'ditolak' // Cloudinary 4xx: preset, format, ukuran, dan sebagainya
  | 'tidakvalid' // jawaban tidak sesuai bentuk yang diharapkan
  | 'dibatalkan';

export class UploadError extends Error {
  readonly kind: UploadErrorKind;
  constructor(kind: UploadErrorKind, detail?: string) {
    super(pesanUnggah(kind, detail));
    this.name = 'UploadError';
    this.kind = kind;
  }
}

/** Hanya galat yang mungkin sementara yang layak diulang otomatis. */
export function bisaDiulang(kind: UploadErrorKind): boolean {
  return kind === 'jaringan' || kind === 'waktuhabis' || kind === 'server';
}

/** Status HTTP galat menjadi jenis galat. 429 (terlalu banyak permintaan) dianggap sementara. */
export function jenisDariStatus(status: number): UploadErrorKind {
  return status >= 500 || status === 429 ? 'server' : 'ditolak';
}

export function cekUkuran(bytes: number | null): void {
  if (bytes !== null && bytes > BATAS_UKURAN_BYTE) {
    throw new UploadError('terlalubesar');
  }
}

// Pesan Cloudinary ditaruh di `detail`. Pola di bawah berasal dari pesan galat yang umum terlihat
// (bukan daftar resmi); bila tidak cocok, pesan aslinya ikut ditampilkan supaya mudah dilacak.
export function pesanUnggah(kind: UploadErrorKind, detail?: string): string {
  switch (kind) {
    case 'config':
      return (
        'Cloudinary belum diatur. Isi EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME dan ' +
        'EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET di .env, lalu jalankan npx expo start --clear.'
      );
    case 'terlalubesar':
      return 'Foto terlalu besar (lebih dari 8 MB). Ulangi pemotretan dengan jarak yang lebih dekat.';
    case 'jaringan':
      return 'Tidak bisa terhubung ke Cloudinary. Periksa internetmu, lalu coba lagi.';
    case 'waktuhabis':
      return 'Unggahan terlalu lama. Periksa sinyalmu, lalu coba lagi.';
    case 'server':
      return 'Cloudinary sedang sibuk atau bermasalah. Coba lagi sebentar lagi.';
    case 'tidakvalid':
      return 'Jawaban Cloudinary tidak dikenali. Coba lagi; bila terus terjadi, periksa preset.';
    case 'dibatalkan':
      return 'Unggahan dibatalkan.';
    case 'ditolak': {
      const d = (detail ?? '').toLowerCase();
      if (d.includes('preset') && d.includes('not found')) {
        return 'Upload preset tidak ditemukan. Periksa nama preset di .env.';
      }
      if (d.includes('unsigned') || d.includes('api_key')) {
        return 'Preset belum berstatus Unsigned. Ubah Signing mode preset menjadi Unsigned di Cloudinary.';
      }
      if (d.includes('cloud_name') || d.includes('cloud name')) {
        return 'Cloud name salah. Periksa EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME di .env.';
      }
      if (d.includes('size') && (d.includes('large') || d.includes('maximum'))) {
        return 'Foto melebihi batas ukuran Cloudinary (10 MB pada paket Free).';
      }
      if (d.includes('format') || d.includes('invalid image')) {
        return 'Cloudinary menolak format foto ini. Preset hanya menerima jpg dan png.';
      }
      return detail ? `Cloudinary menolak foto: ${detail}` : 'Cloudinary menolak foto ini.';
    }
  }
}

/** Hasil unggahan yang kita simpan: hanya bidang yang dipakai aplikasi. */
export type HasilUnggah = {
  publicId: string;
  url: string;
  bytes: number;
  width: number;
  height: number;
};

const jawabanSchema = z.object({
  public_id: z.string().min(1),
  secure_url: z.string().startsWith('https://'),
  bytes: z.number().int().nonnegative(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});

/** Membaca jawaban JSON Cloudinary; melempar UploadError('tidakvalid') bila bentuknya lain. */
export function bacaJawaban(data: unknown): HasilUnggah {
  const hasil = jawabanSchema.safeParse(data);
  if (!hasil.success) throw new UploadError('tidakvalid');
  const d = hasil.data;
  return {
    publicId: d.public_id,
    url: d.secure_url,
    bytes: d.bytes,
    width: d.width,
    height: d.height,
  };
}

/** Mengambil pesan galat dari badan jawaban Cloudinary: { "error": { "message": "..." } }. */
export function pesanDariBadan(teks: string): string | undefined {
  try {
    const data: unknown = JSON.parse(teks);
    const pesan = z.object({ error: z.object({ message: z.string() }) }).safeParse(data);
    return pesan.success ? pesan.data.error.message : undefined;
  } catch {
    return undefined;
  }
}
```

| Bagian | Penjelasan |
|---|---|
| `BATAS_UKURAN_BYTE` | 8 MB (tugas 5.4). Paket Free menolak di atas 10 MB, jadi 8 MB memberi ruang. Foto hasil Fase 4 (lebar 2000, JPEG 0,85) biasanya 0,5 sampai 2 MB. |
| `MAKS_ULANG`, `JEDA_ULANG_MS` | Dua kali ulang, dengan jeda 1 detik lalu 3 detik (tugas 5.5). |
| `UploadErrorKind` | Delapan jenis galat. `jaringan`, `waktuhabis`, dan `server` (5xx dan 429) **bisa diulang**; sisanya tidak, karena mengulang preset yang salah hanya membuang waktu. |
| `pesanUnggah` | Pesan Indonesia per jenis. Untuk `ditolak`, pesan asli Cloudinary dicocokkan dengan pola umum (preset tidak ada, bukan unsigned, cloud name salah, terlalu besar, format); bila tidak cocok, pesan aslinya ditampilkan. |
| `bacaJawaban` | Membaca jawaban sukses dengan zod: harus punya `public_id`, `secure_url` berawalan `https://`, `bytes`, `width`, `height`. Bentuk lain menjadi galat `tidakvalid`, bukan data rusak di database. |

### 4.4 `src/lib/cloudinary.ts`

**Berkas:** `src/lib/cloudinary.ts` (berkas baru: buat)

```ts
import { Platform } from 'react-native';

import { env } from './env';
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
```

---

## 5. Tugas 5.3 sampai 5.5: kemajuan, batas ukuran, ulang otomatis

Semuanya berada di `src/lib/cloudinary.ts` di atas. Cara kerjanya:

| Bagian | Tugas | Penjelasan |
|---|---|---|
| `https://api.cloudinary.com/v1_1/<cloud_name>/image/upload` | 5.2 | Alamat unggah gambar. Bentuk ini tertulis di contoh staf Cloudinary dan dokumentasi; kamu membuktikannya sendiri di 3.3. |
| `bentukForm` | 5.2 | Hanya dua bagian yang dikirim: `file` dan `upload_preset`. Di Android, `file` berbentuk `{ uri, name, type }` (cara bawaan React Native membaca berkas lokal); di web (dipakai untuk uji) berupa `Blob`. |
| `kirim` dengan `XMLHttpRequest` | 5.3 | `fetch` tidak melaporkan kemajuan unggahan; `xhr.upload.onprogress` melaporkan `loaded / total`. Ada batas waktu 60 detik dan pembatalan lewat `AbortSignal`. |
| `bacaBlob` + `cekUkuran` | 5.4 | Berkas dibaca sebagai blob hanya untuk mengetahui ukurannya. Bila pembacaan gagal, ukuran dianggap tidak diketahui dan Cloudinary tetap menolak yang terlalu besar. |
| Perulangan di `uploadImage` | 5.5 | Gagal sementara diulang sampai 2 kali dengan jeda 1 dan 3 detik (dan bisa dibatalkan); galat permanen langsung dilempar. |
| Jenis dari status HTTP | 5.5 | 5xx dan 429 `server` (diulang); 4xx lain `ditolak` (tidak diulang). |

---

## 6. Tugas 5.6: simpan ke Supabase

### 6.1 `src/features/dokumen/judul.ts`

**Berkas:** `src/features/dokumen/judul.ts` (berkas baru: buat)

```ts
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
```

Judul bawaan memakai waktu perangkat (`Dokumen 17 Okt 2026 05.40`); aturan panjang 1 sampai 120 karakter sama dengan kolom `dokumen.judul` di database.

### 6.2 `src/features/dokumen/api.ts`

**Berkas:** `src/features/dokumen/api.ts` (berkas baru: buat)

```ts
import { supabase } from '@/lib/supabase';
import type { HasilUnggah } from '@/lib/cloudinaryErrors';

// Akses tabel `dokumen` dan `halaman_dokumen` (skema Fase 2). Semua dijaga RLS: pengguna hanya
// bisa menulis miliknya sendiri, dan akun nonaktif ditolak.

export class DbError extends Error {
  readonly kind: 'jaringan' | 'izin' | 'lain';
  constructor(kind: 'jaringan' | 'izin' | 'lain') {
    super(
      kind === 'jaringan'
        ? 'Tidak bisa terhubung ke server. Periksa internetmu, lalu coba lagi.'
        : kind === 'izin'
          ? 'Akunmu tidak diizinkan menyimpan dokumen. Hubungi admin bila ini keliru.'
          : 'Data belum bisa disimpan. Coba lagi sebentar lagi.',
    );
    this.name = 'DbError';
    this.kind = kind;
  }
}

type GalatPostgrest = { code?: string; message?: string };

function jenisGalat(error: GalatPostgrest): DbError {
  if (error.code === '42501') return new DbError('izin');
  // Jaringan putus: PostgREST client mengembalikan galat tanpa kode, dengan pesan dari fetch.
  if (!error.code && /fetch|network|failed/i.test(error.message ?? '')) {
    return new DbError('jaringan');
  }
  return new DbError('lain');
}

/** Membuat dokumen baru berstatus draft dan mengembalikan id-nya. */
export async function buatDokumen(params: { userId: string; judul: string }): Promise<string> {
  const { data, error } = await supabase
    .from('dokumen')
    .insert({ user_id: params.userId, judul: params.judul, status: 'draft' })
    .select('id')
    .single();
  if (error) throw jenisGalat(error);
  const id = (data as { id?: unknown } | null)?.id;
  if (typeof id !== 'string') throw new DbError('lain');
  return id;
}

/**
 * Menyimpan satu halaman. url_hasil awalnya sama dengan url_asli; Fase 6 yang mengubahnya.
 * Bila sambungan putus tepat setelah server menyimpan, percobaan ulang akan menabrak kunci unik
 * (dokumen_id, urutan). Kalau baris itu ternyata halaman yang sama (public_id sama), anggap sudah tersimpan.
 */
export async function simpanHalaman(params: {
  dokumenId: string;
  urutan: number;
  hasil: HasilUnggah;
}): Promise<void> {
  const { dokumenId, urutan, hasil } = params;
  const { error } = await supabase.from('halaman_dokumen').insert({
    dokumen_id: dokumenId,
    urutan,
    url_asli: hasil.url,
    url_hasil: hasil.url,
    public_id: hasil.publicId,
    ukuran_byte: hasil.bytes,
  });
  if (!error) return;

  if (error.code === '23505') {
    const { data } = await supabase
      .from('halaman_dokumen')
      .select('id')
      .eq('dokumen_id', dokumenId)
      .eq('urutan', urutan)
      .eq('public_id', hasil.publicId)
      .maybeSingle();
    if (data) return;
  }
  throw jenisGalat(error);
}
```

| Bagian | Penjelasan |
|---|---|
| `buatDokumen` | `insert` dengan hanya `user_id`, `judul`, `status` (kolom yang di-`grant` di Fase 2), lalu `.select('id').single()` untuk mendapat id. RLS memastikan `user_id` harus milikmu dan akun aktif. |
| `simpanHalaman` | `insert` ke `halaman_dokumen`: `dokumen_id`, `urutan`, `url_asli`, `url_hasil` (**awalnya sama** dengan `url_asli`; Fase 6 yang mengubahnya), `public_id`, `ukuran_byte` (dari Cloudinary). `jumlah_halaman` tidak ditulis: trigger database yang menjaganya. |
| Penanganan `23505` | Kunci unik `(dokumen_id, urutan)` bisa tertabrak bila sambungan putus tepat setelah server menyimpan, lalu kamu menekan Coba lagi. Kode memeriksa apakah baris itu halaman yang sama (`public_id` sama); bila ya, dianggap sudah tersimpan. |
| `DbError` | Tiga jenis: `jaringan`, `izin` (kode `42501`, RLS menolak: misalnya akun nonaktif), `lain`. |

### 6.3 `src/features/dokumen/index.ts`

**Berkas:** `src/features/dokumen/index.ts` (berkas baru: buat)

```ts
export { DbError, buatDokumen, simpanHalaman } from './api';
export { judulBawaan, judulSchema } from './judul';
```

---

## 7. Tugas 5.7: sesi yang tahan gagal sebagian

### 7.1 `src/features/scan/ScanSessionProvider.tsx`

Sesi kini menyimpan status tiap halaman, id dokumen, dan judul.

**Berkas:** `src/features/scan/ScanSessionProvider.tsx` (berkas lama: ganti seluruh isinya)

```tsx
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { useAuth } from '@/features/auth';
import { judulBawaan } from '@/features/dokumen';
import type { HasilUnggah } from '@/lib/cloudinaryErrors';

import { HALAMAN_MAKS } from './ukuran';

/**
 * Siklus satu halaman saat disimpan (Fase 5):
 * baru → mengunggah → diunggah (Cloudinary berhasil, database belum) → tersimpan,
 * atau gagal di salah satu tahap (hasil unggahan tetap disimpan agar tidak diunggah dua kali).
 */
export type StatusHalaman = 'baru' | 'mengunggah' | 'diunggah' | 'tersimpan' | 'gagal';

/** Satu halaman dokumen dalam sesi. Hanya URI berkas, tidak pernah base64 (aturan 4.7). */
export type HalamanScan = {
  id: string;
  uri: string;
  width: number;
  height: number;
  status: StatusHalaman;
  /** 0 sampai 1, hanya berarti saat status `mengunggah`. */
  progress: number;
  galat: string | null;
  /** Hasil Cloudinary; terisi setelah unggahan berhasil. */
  hasil: HasilUnggah | null;
  /** Nomor urut di database; ditetapkan saat pertama kali disimpan dan tidak berubah lagi. */
  urutan: number | null;
};

export type FotoHalaman = Pick<HalamanScan, 'uri' | 'width' | 'height'>;

type SessionState = {
  /** Pemilik sesi; bila pengguna berganti atau keluar, sesi lama dibuang. */
  ownerId: string | null;
  pages: HalamanScan[];
  /** Id dokumen di database; terisi sejak penyimpanan pertama dimulai. */
  dokumenId: string | null;
  judul: string;
};

type ScanSessionValue = {
  pages: HalamanScan[];
  isFull: boolean;
  dokumenId: string | null;
  judul: string;
  /**
   * true sejak penyimpanan dimulai: urutan halaman dikunci karena nomor urut sudah dipakai
   * di database. Halaman yang belum tersimpan masih boleh dihapus.
   */
  isLocked: boolean;
  /** Menambah halaman di akhir. Mengembalikan false bila sesi sudah penuh. */
  addPage: (foto: FotoHalaman) => boolean;
  /** Menghapus halaman yang belum tersimpan. Halaman yang sedang atau sudah tersimpan diabaikan. */
  removePage: (id: string) => void;
  /** Menggeser halaman: -1 ke atas (lebih awal), 1 ke bawah. Diabaikan saat sesi terkunci. */
  movePage: (id: string, direction: -1 | 1) => void;
  patchPage: (id: string, patch: Partial<Omit<HalamanScan, 'id'>>) => void;
  setJudul: (judul: string) => void;
  setDokumenId: (id: string) => void;
  clear: () => void;
};

const ScanSessionContext = createContext<ScanSessionValue | null>(null);

// Pindah satu posisi; di ujung daftar tidak berbuat apa-apa.
function moveItem(pages: HalamanScan[], id: string, direction: -1 | 1): HalamanScan[] {
  const from = pages.findIndex((p) => p.id === id);
  const to = from + direction;
  if (from < 0 || to < 0 || to >= pages.length) return pages;
  const next = [...pages];
  [next[from], next[to]] = [next[to], next[from]];
  return next;
}

const kosong = (ownerId: string | null): SessionState => ({
  ownerId,
  pages: [],
  dokumenId: null,
  judul: judulBawaan(),
});

export function ScanSessionProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;

  const [state, setState] = useState<SessionState>(() => kosong(userId));
  const counter = useRef(0);

  // Pengguna berganti, atau keluar lalu masuk lagi (userId sempat null): sesi lama dibuang.
  // Menyesuaikan state saat render diizinkan React untuk kasus seperti ini (tanpa effect).
  if (state.ownerId !== userId) {
    setState(kosong(userId));
  }
  const aktif = state.ownerId === userId ? state : kosong(userId);
  const { pages, dokumenId, judul } = aktif;

  // Semua perubahan lewat sini: selalu memakai state terbaru dan memastikan pemiliknya benar.
  const ubah = useCallback(
    (fn: (s: SessionState) => SessionState) => {
      setState((prev) => fn(prev.ownerId === userId ? prev : kosong(userId)));
    },
    [userId],
  );

  const addPage = useCallback(
    (foto: FotoHalaman) => {
      if (pages.length >= HALAMAN_MAKS) return false;
      counter.current += 1;
      const baru: HalamanScan = {
        ...foto,
        id: `h${Date.now().toString(36)}-${counter.current}`,
        status: 'baru',
        progress: 0,
        galat: null,
        hasil: null,
        urutan: null,
      };
      ubah((s) => (s.pages.length >= HALAMAN_MAKS ? s : { ...s, pages: [...s.pages, baru] }));
      return true;
    },
    [pages.length, ubah],
  );

  const removePage = useCallback(
    (id: string) => {
      ubah((s) => ({
        ...s,
        pages: s.pages.filter(
          (p) => p.id !== id || p.status === 'tersimpan' || p.status === 'mengunggah',
        ),
      }));
    },
    [ubah],
  );

  const movePage = useCallback(
    (id: string, direction: -1 | 1) => {
      ubah((s) => (s.dokumenId ? s : { ...s, pages: moveItem(s.pages, id, direction) }));
    },
    [ubah],
  );

  const patchPage = useCallback(
    (id: string, patch: Partial<Omit<HalamanScan, 'id'>>) => {
      ubah((s) => ({ ...s, pages: s.pages.map((p) => (p.id === id ? { ...p, ...patch } : p)) }));
    },
    [ubah],
  );

  const setJudul = useCallback((j: string) => ubah((s) => ({ ...s, judul: j })), [ubah]);
  const setDokumenId = useCallback((id: string) => ubah((s) => ({ ...s, dokumenId: id })), [ubah]);
  const clear = useCallback(() => setState(kosong(userId)), [userId]);

  const value = useMemo<ScanSessionValue>(
    () => ({
      pages,
      isFull: pages.length >= HALAMAN_MAKS,
      dokumenId,
      judul,
      isLocked: dokumenId !== null,
      addPage,
      removePage,
      movePage,
      patchPage,
      setJudul,
      setDokumenId,
      clear,
    }),
    [
      pages,
      dokumenId,
      judul,
      addPage,
      removePage,
      movePage,
      patchPage,
      setJudul,
      setDokumenId,
      clear,
    ],
  );

  return <ScanSessionContext.Provider value={value}>{children}</ScanSessionContext.Provider>;
}

export function useScanSession(): ScanSessionValue {
  const value = useContext(ScanSessionContext);
  if (!value) {
    throw new Error('useScanSession harus dipakai di dalam ScanSessionProvider.');
  }
  return value;
}
```

| Bagian | Penjelasan |
|---|---|
| `StatusHalaman` | `baru` → `mengunggah` → `diunggah` (Cloudinary berhasil, database belum) → `tersimpan`, atau `gagal`. |
| `hasil`, `urutan`, `progress`, `galat` | Per halaman. `hasil` menyimpan balasan Cloudinary agar percobaan ulang tidak mengunggah dua kali (K29). `urutan` ditetapkan sekali dan tidak berubah. |
| `dokumenId` | Terisi sejak penyimpanan dimulai. Selama terisi, sesi **terkunci**: `movePage` tidak berbuat apa-apa (nomor urut sudah dipakai di database), dan judul tidak bisa diubah. |
| `removePage` | Mengabaikan halaman `tersimpan` dan `mengunggah`. Halaman `gagal`, `baru`, dan `diunggah` masih boleh dihapus (aset Cloudinary yang terlanjur terunggah tidak bisa dihapus dari aplikasi; backlog B15). |
| `patchPage` | Mengubah satu halaman dengan state terbaru, aman dipanggil berkali-kali dari proses unggah. |
| `kosong(userId)` | Sesi baru. Pemilik sesi diperiksa seperti di Fase 4, sehingga sesi tidak terbawa ke akun lain atau setelah keluar-masuk. |

### 7.2 `src/features/scan/useSimpanDokumen.ts`

**Berkas:** `src/features/scan/useSimpanDokumen.ts` (berkas baru: buat)

```ts
import { useEffect, useRef, useState } from 'react';

import { useAuth } from '@/features/auth';
import { DbError, buatDokumen, judulSchema, simpanHalaman } from '@/features/dokumen';
import { cloudinaryTerpasang, uploadImage, UploadError } from '@/lib/cloudinary';

import { useScanSession, type HalamanScan } from './ScanSessionProvider';

function pesanDari(galat: unknown): string {
  if (galat instanceof UploadError || galat instanceof DbError) return galat.message;
  return 'Terjadi kesalahan yang tidak dikenal. Coba lagi.';
}

/**
 * Menyimpan sesi scan sebagai dokumen (tugas 5.6 dan 5.7):
 * 1. buat baris `dokumen` (draft) sekali saja,
 * 2. untuk tiap halaman, berurutan: unggah ke Cloudinary, lalu simpan baris `halaman_dokumen`,
 * 3. berhenti di halaman pertama yang gagal. Halaman sebelumnya sudah tersimpan dan aman;
 *    menekan tombol lagi hanya mengerjakan halaman yang belum selesai, tanpa membuat dokumen baru.
 */
export function useSimpanDokumen() {
  const { session } = useAuth();
  const { pages, dokumenId, judul, setDokumenId, patchPage } = useScanSession();
  const [menyimpan, setMenyimpan] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);

  const sedangJalan = useRef(false);
  const pembatal = useRef<AbortController | null>(null);

  // Meninggalkan layar atau keluar dari akun menghentikan unggahan yang sedang berjalan.
  useEffect(() => () => pembatal.current?.abort(), []);

  const selesai = pages.length > 0 && pages.every((p) => p.status === 'tersimpan');
  const sisa = pages.filter((p) => p.status !== 'tersimpan').length;

  const prosesHalaman = async (
    halaman: HalamanScan,
    id: string,
    urutan: number,
    sinyal: AbortSignal,
  ): Promise<boolean> => {
    let tahap: 'unggah' | 'simpan' = 'unggah';
    try {
      patchPage(halaman.id, { status: 'mengunggah', progress: 0, galat: null, urutan });

      // Hasil unggahan yang sudah ada dipakai ulang: percobaan ulang tidak mengunggah dua kali.
      let hasil = halaman.hasil;
      if (!hasil) {
        hasil = await uploadImage(halaman.uri, {
          signal: sinyal,
          onProgress: (progress) => patchPage(halaman.id, { progress }),
        });
        patchPage(halaman.id, { status: 'diunggah', progress: 1, hasil });
      }

      tahap = 'simpan';
      await simpanHalaman({ dokumenId: id, urutan, hasil });
      patchPage(halaman.id, { status: 'tersimpan', progress: 1, galat: null });
      return true;
    } catch (e) {
      if (e instanceof UploadError && e.kind === 'dibatalkan') return false;
      // Bila Cloudinary sudah berhasil, status kembali ke `diunggah` agar tampilan jujur.
      patchPage(halaman.id, {
        status: tahap === 'simpan' ? 'diunggah' : 'gagal',
        galat: pesanDari(e),
      });
      return false;
    }
  };

  const simpan = async () => {
    if (sedangJalan.current) return; // cegah ketukan ganda
    if (!cloudinaryTerpasang()) {
      setGalat(new UploadError('config').message);
      return;
    }
    const cekJudul = judulSchema.safeParse(judul);
    if (!cekJudul.success) {
      setGalat(cekJudul.error.issues[0]?.message ?? 'Judul belum benar');
      return;
    }
    if (!session) return;

    sedangJalan.current = true;
    setMenyimpan(true);
    setGalat(null);
    const kontrol = new AbortController();
    pembatal.current = kontrol;

    try {
      let id = dokumenId;
      if (!id) {
        id = await buatDokumen({ userId: session.user.id, judul: cekJudul.data });
        setDokumenId(id);
      }

      // Nomor urut dibagikan sekali dan tidak berubah; halaman baru mendapat nomor setelah yang terbesar.
      let urutanTerakhir = Math.max(0, ...pages.map((p) => p.urutan ?? 0));
      let gagal: HalamanScan | null = null;

      for (const halaman of pages) {
        if (kontrol.signal.aborted) return;
        if (halaman.status === 'tersimpan') continue;
        const urutan = halaman.urutan ?? ++urutanTerakhir;
        const berhasil = await prosesHalaman(halaman, id, urutan, kontrol.signal);
        if (!berhasil) {
          gagal = halaman;
          break;
        }
      }

      if (gagal && !kontrol.signal.aborted) {
        const nomor = pages.indexOf(gagal) + 1;
        setGalat(
          `Halaman ${nomor} belum berhasil disimpan. Halaman sebelumnya aman. Periksa pesannya, lalu tekan Coba lagi.`,
        );
      }
    } catch (e) {
      if (!(e instanceof UploadError && e.kind === 'dibatalkan')) setGalat(pesanDari(e));
    } finally {
      sedangJalan.current = false;
      setMenyimpan(false);
    }
  };

  return { simpan, menyimpan, galat, selesai, sisa, bersihkanGalat: () => setGalat(null) };
}
```

| Bagian | Penjelasan |
|---|---|
| `sedangJalan` (ref) | Mencegah ketukan ganda pada tombol menjalankan penyimpanan dua kali. |
| Pemeriksaan awal | Cloudinary diatur? Judul sah? Sudah masuk? Bila tidak, pesan jelas tampil tanpa permintaan apa pun. |
| `buatDokumen` sekali | Hanya bila `dokumenId` belum ada. Percobaan ulang memakai dokumen yang sama. |
| `urutanTerakhir` | Nomor urut halaman baru = nomor terbesar yang sudah ada + 1. Halaman yang sudah punya `urutan` memakainya lagi. |
| `prosesHalaman` | Unggah (bila `hasil` belum ada) lalu simpan ke database. Gagal di tahap unggah: status `gagal`. Gagal di tahap database: status `diunggah` dengan pesan, dan `hasil` tetap tersimpan. |
| Berhenti di gagal pertama | K28. Pesan umum: "Halaman N belum berhasil disimpan. Halaman sebelumnya aman..." |
| `AbortController` | Berpindah dari layar atau keluar akun menghentikan unggahan yang sedang berjalan. |

---

## 8. Tugas 5.8: merakit layar

Tiga berkas pertama bagian ini saling bergantung. Setelah 8.1 dan 8.2 tersimpan, `npm run typecheck` akan melaporkan satu galat di `app/(tabs)/kamera.tsx` (properti `DaftarHalaman` kurang). Itu wajar: `kamera.tsx` baru diganti di 8.3. Jangan jalankan `typecheck` sebelum 8.3 selesai.

### 8.1 `src/features/scan/DaftarHalaman.tsx`

**Berkas:** `src/features/scan/DaftarHalaman.tsx` (berkas lama: ganti seluruh isinya)

```tsx
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Banner, Button, Card, IconButton, Screen, ScreenHeader, TextField } from '@/components';
import { colors, radius, spacing, typography } from '@/theme';

import type { HalamanScan } from './ScanSessionProvider';
import { HALAMAN_MAKS } from './ukuran';

type DaftarHalamanProps = {
  pages: HalamanScan[];
  isFull: boolean;
  /** true setelah penyimpanan dimulai: urutan dikunci dan halaman tersimpan tidak bisa dihapus. */
  isLocked: boolean;
  judul: string;
  onJudulChange: (judul: string) => void;
  onTambah: () => void;
  onHapus: (id: string) => void;
  onGeser: (id: string, direction: -1 | 1) => void;
  onMulaiUlang: () => void;
  /** Penyimpanan (tugas 5.6): unggah ke Cloudinary lalu catat ke database. */
  onSimpan: () => void;
  menyimpan: boolean;
  /** Halaman yang belum tersimpan. */
  sisa: number;
  /** true bila semua halaman sudah tersimpan. */
  selesai: boolean;
  galat: string | null;
};

// Konfirmasi dibuat inline (bukan Alert) supaya konsisten di semua platform dan bisa diuji.
type Konfirmasi = { jenis: 'halaman'; id: string } | { jenis: 'sesi' } | null;

// Status satu halaman: teks selalu ada (tidak hanya warna) agar jelas bagi semua pengguna.
function Status({ page }: { page: HalamanScan }) {
  switch (page.status) {
    case 'baru':
      return <Text style={styles.ukuran}>Menunggu disimpan</Text>;
    case 'mengunggah':
      return (
        <View style={styles.statusBlok}>
          <Text style={styles.statusTeks}>Mengunggah {Math.round(page.progress * 100)}%</Text>
          <View style={styles.bar} accessibilityRole="progressbar">
            <View style={[styles.barIsi, { width: `${Math.round(page.progress * 100)}%` }]} />
          </View>
        </View>
      );
    case 'diunggah':
      return (
        <Text style={page.galat ? styles.statusGalat : styles.statusTeks}>
          {page.galat ?? 'Terunggah, menyimpan data...'}
        </Text>
      );
    case 'tersimpan':
      return (
        <View style={styles.statusBaris}>
          <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
          <Text style={styles.statusTeks}>Tersimpan</Text>
        </View>
      );
    case 'gagal':
      return <Text style={styles.statusGalat}>{page.galat ?? 'Gagal disimpan.'}</Text>;
  }
}

export function DaftarHalaman({
  pages,
  isFull,
  isLocked,
  judul,
  onJudulChange,
  onTambah,
  onHapus,
  onGeser,
  onMulaiUlang,
  onSimpan,
  menyimpan,
  sisa,
  selesai,
  galat,
}: DaftarHalamanProps) {
  const [konfirmasi, setKonfirmasi] = useState<Konfirmasi>(null);
  const sudahMulai = pages.some((p) => p.status !== 'baru');

  return (
    <Screen scroll avoidKeyboard>
      <ScreenHeader title="Halaman scan" subtitle={`${pages.length} halaman dalam sesi ini`} />

      {selesai ? (
        <Banner
          variant="info"
          message="Dokumen tersimpan. Semua halaman sudah diunggah ke Cloudinary dan tercatat di database."
        />
      ) : null}
      {isFull && !selesai ? (
        <Banner
          variant="info"
          message={`Sesi sudah berisi ${HALAMAN_MAKS} halaman, batas maksimum.`}
        />
      ) : null}
      {galat ? <Banner message={galat} /> : null}

      {selesai ? (
        <Button title="Mulai sesi baru" fullWidth onPress={onMulaiUlang} />
      ) : (
        <>
          <TextField
            label="Judul dokumen"
            value={judul}
            onChangeText={onJudulChange}
            editable={!menyimpan && !isLocked}
            maxLength={120}
            returnKeyType="done"
            helper={isLocked ? 'Judul dikunci setelah penyimpanan dimulai.' : undefined}
          />
          <Button
            title={sudahMulai ? `Coba lagi (${sisa} halaman)` : 'Simpan dokumen'}
            fullWidth
            loading={menyimpan}
            onPress={onSimpan}
          />
          <Button
            title="Tambah halaman"
            variant="secondary"
            fullWidth
            disabled={isFull || menyimpan}
            onPress={onTambah}
          />
        </>
      )}

      {pages.map((page, index) => {
        const menghapus = konfirmasi?.jenis === 'halaman' && konfirmasi.id === page.id;
        const bolehHapus = page.status !== 'tersimpan' && page.status !== 'mengunggah';
        return (
          <Card key={page.id}>
            <View style={styles.baris}>
              <Image
                source={{ uri: page.uri }}
                style={styles.thumb}
                contentFit="cover"
                accessibilityLabel={`Gambar mini halaman ${index + 1}`}
              />
              <View style={styles.teks}>
                <Text style={styles.judul}>Halaman {index + 1}</Text>
                <Text style={styles.ukuran}>
                  {page.width} × {page.height} px
                </Text>
                <Status page={page} />
              </View>
            </View>

            {selesai ? null : menghapus ? (
              <View style={styles.konfirmasi}>
                <Text style={styles.tanya}>Hapus halaman ini?</Text>
                <View style={styles.barisTombol}>
                  <View style={styles.tombol}>
                    <Button
                      title="Batal"
                      variant="secondary"
                      fullWidth
                      onPress={() => setKonfirmasi(null)}
                    />
                  </View>
                  <View style={styles.tombol}>
                    <Button
                      title="Hapus"
                      variant="danger"
                      fullWidth
                      onPress={() => {
                        onHapus(page.id);
                        setKonfirmasi(null);
                      }}
                    />
                  </View>
                </View>
              </View>
            ) : (
              <View style={styles.aksi}>
                <IconButton
                  icon="arrow-up"
                  label={`Pindahkan halaman ${index + 1} ke atas`}
                  disabled={index === 0 || isLocked || menyimpan}
                  onPress={() => onGeser(page.id, -1)}
                />
                <IconButton
                  icon="arrow-down"
                  label={`Pindahkan halaman ${index + 1} ke bawah`}
                  disabled={index === pages.length - 1 || isLocked || menyimpan}
                  onPress={() => onGeser(page.id, 1)}
                />
                <IconButton
                  icon="trash-outline"
                  label={`Hapus halaman ${index + 1}`}
                  tone="danger"
                  disabled={!bolehHapus || menyimpan}
                  onPress={() => setKonfirmasi({ jenis: 'halaman', id: page.id })}
                />
              </View>
            )}
          </Card>
        );
      })}

      {selesai ? null : (
        <Card>
          <Text style={styles.catatan}>
            {isLocked
              ? 'Penyimpanan sudah dimulai: urutan halaman dikunci dan halaman yang sudah tersimpan tidak bisa dihapus dari sini.'
              : 'Halaman ini baru ada di HP. Tekan Simpan dokumen untuk mengunggahnya ke Cloudinary dan mencatatnya ke akunmu. Sesi hilang bila aplikasi ditutup paksa, jadi simpan setelah selesai memotret.'}
          </Text>
          {konfirmasi?.jenis === 'sesi' ? (
            <View style={styles.konfirmasi}>
              <Text style={styles.tanya}>
                {isLocked
                  ? 'Mulai sesi baru? Halaman yang sudah tersimpan tetap ada di akunmu.'
                  : `Buang semua ${pages.length} halaman?`}
              </Text>
              <View style={styles.barisTombol}>
                <View style={styles.tombol}>
                  <Button
                    title="Batal"
                    variant="secondary"
                    fullWidth
                    onPress={() => setKonfirmasi(null)}
                  />
                </View>
                <View style={styles.tombol}>
                  <Button
                    title={isLocked ? 'Mulai baru' : 'Buang semua'}
                    variant="danger"
                    fullWidth
                    onPress={() => {
                      onMulaiUlang();
                      setKonfirmasi(null);
                    }}
                  />
                </View>
              </View>
            </View>
          ) : (
            <Button
              title="Mulai sesi baru"
              variant="ghost"
              disabled={menyimpan}
              onPress={() => setKonfirmasi({ jenis: 'sesi' })}
            />
          )}
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  baris: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  thumb: {
    width: 64,
    height: 88,
    borderRadius: radius.sm,
    backgroundColor: colors.primarySoft,
  },
  teks: { flex: 1, gap: spacing.xs },
  judul: { ...typography.bodyStrong, color: colors.text },
  ukuran: { ...typography.caption, color: colors.textMuted },
  statusBlok: { gap: spacing.xs },
  statusBaris: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  statusTeks: { ...typography.caption, color: colors.text },
  statusGalat: { ...typography.caption, color: colors.danger },
  bar: {
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    overflow: 'hidden',
  },
  barIsi: { height: 6, backgroundColor: colors.primary },
  aksi: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm },
  konfirmasi: { gap: spacing.sm },
  tanya: { ...typography.bodyStrong, color: colors.text },
  barisTombol: { flexDirection: 'row', gap: spacing.md },
  tombol: { flex: 1 },
  catatan: { ...typography.body, color: colors.textMuted },
});
```

| Bagian | Penjelasan |
|---|---|
| Kolom **Judul dokumen** | Terisi judul bawaan; terkunci saat menyimpan atau setelah penyimpanan dimulai. |
| Tombol utama | **Simpan dokumen**; setelah ada yang gagal berubah menjadi **Coba lagi (N halaman)**; setelah semua tersimpan, diganti **Mulai sesi baru**. |
| `Status` | Teks per halaman: Menunggu disimpan, Mengunggah N% (dengan batang kemajuan), Terunggah, Tersimpan (dengan ikon centang), atau pesan galat. Status selalu berupa teks, tidak hanya warna. |
| Kontrol terkunci | Geser dinonaktifkan setelah penyimpanan dimulai; hapus dinonaktifkan untuk halaman yang sudah atau sedang tersimpan. |
| `Screen avoidKeyboard` | Kolom judul tidak tertutup keyboard. |

### 8.2 `src/features/scan/index.ts`

**Berkas:** `src/features/scan/index.ts` (berkas lama: ganti seluruh isinya)

```ts
export { DaftarHalaman } from './DaftarHalaman';
export { KameraScan } from './KameraScan';
export { normalisasiFoto } from './normalisasi';
export type { FotoMentah, FotoNormal } from './normalisasi';
export { ScanSessionProvider, useScanSession } from './ScanSessionProvider';
export type { FotoHalaman, HalamanScan, StatusHalaman } from './ScanSessionProvider';
export { TinjauFoto } from './TinjauFoto';
export { useSimpanDokumen } from './useSimpanDokumen';
export { HALAMAN_MAKS, KUALITAS_JPEG, LEBAR_MAKS, ukuranTarget } from './ukuran';
```

### 8.3 `app/(tabs)/kamera.tsx`

Perubahan hanya menghubungkan `useSimpanDokumen` dan properti baru ke `DaftarHalaman`.

**Berkas:** `app/(tabs)/kamera.tsx` (berkas lama: ganti seluruh isinya)

```tsx
import type { FlashMode } from 'expo-camera';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import {
  DaftarHalaman,
  HALAMAN_MAKS,
  KameraScan,
  TinjauFoto,
  normalisasiFoto,
  useScanSession,
  useSimpanDokumen,
  type FotoMentah,
} from '@/features/scan';

type Tahap = 'kamera' | 'tinjau' | 'daftar';

export default function KameraScreen() {
  const { pages, isFull, isLocked, judul, setJudul, addPage, removePage, movePage, clear } =
    useScanSession();
  const { simpan, menyimpan, galat: galatSimpan, selesai, sisa } = useSimpanDokumen();

  const [tahap, setTahap] = useState<Tahap>(pages.length > 0 ? 'daftar' : 'kamera');
  const [foto, setFoto] = useState<FotoMentah | null>(null);
  const [memproses, setMemproses] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);
  const [flash, setFlash] = useState<FlashMode>('off');
  const [grid, setGrid] = useState(true);

  // Layar tab tetap terpasang saat pengguna pindah tab, jadi fokus dilacak sendiri:
  // kamera hanya dipasang selagi layar ini terlihat (hanya satu pratinjau boleh aktif).
  const [fokus, setFokus] = useState(false);
  useFocusEffect(
    useCallback(() => {
      setFokus(true);
      return () => setFokus(false);
    }, []),
  );

  // Daftar kosong (halaman terakhir dihapus, sesi dibuang) otomatis kembali ke kamera.
  const tampil: Tahap =
    (tahap === 'daftar' && pages.length === 0) || (tahap === 'tinjau' && !foto) ? 'kamera' : tahap;

  const pakaiFoto = async () => {
    if (!foto || memproses) return;
    setMemproses(true);
    setGalat(null);
    try {
      const hasil = await normalisasiFoto(foto);
      if (!addPage(hasil)) {
        setGalat(`Sesi sudah berisi ${HALAMAN_MAKS} halaman, batas maksimum.`);
        return;
      }
      setFoto(null);
      setTahap('daftar');
    } catch {
      setGalat(
        'Foto belum bisa diproses. Coba tekan Pakai foto lagi, atau Ulang untuk memotret ulang.',
      );
    } finally {
      setMemproses(false);
    }
  };

  if (tampil === 'tinjau' && foto) {
    return (
      <TinjauFoto
        foto={foto}
        memproses={memproses}
        galat={galat}
        onPakai={() => void pakaiFoto()}
        onUlang={() => {
          setFoto(null);
          setGalat(null);
          setTahap('kamera');
        }}
      />
    );
  }

  if (tampil === 'daftar') {
    return (
      <DaftarHalaman
        pages={pages}
        isFull={isFull}
        isLocked={isLocked}
        judul={judul}
        onJudulChange={setJudul}
        onSimpan={() => void simpan()}
        menyimpan={menyimpan}
        sisa={sisa}
        selesai={selesai}
        galat={galatSimpan}
        onTambah={() => setTahap('kamera')}
        onHapus={removePage}
        onGeser={movePage}
        onMulaiUlang={() => {
          clear();
          setTahap('kamera');
        }}
      />
    );
  }

  return (
    <KameraScan
      aktif={fokus}
      flash={flash}
      onFlashChange={setFlash}
      grid={grid}
      onGridChange={setGrid}
      jumlahHalaman={pages.length}
      penuh={isFull}
      onFoto={(hasil) => {
        setFoto(hasil);
        setGalat(null);
        setTahap('tinjau');
      }}
      onLihatDaftar={() => setTahap('daftar')}
    />
  );
}
```

### 8.4 `app/(tabs)/index.tsx` (Dashboard)

Kartu sesi kini menyebut berapa halaman yang belum disimpan, atau "Dokumen tersimpan (N halaman)".

**Berkas:** `app/(tabs)/index.tsx` (berkas lama: ganti seluruh isinya)

```tsx
import { useRouter } from 'expo-router';
import { StyleSheet, Text } from 'react-native';

import { Button, Card, EmptyState, Screen, ScreenHeader } from '@/components';
import { AccountCard } from '@/features/auth';
import { useScanSession } from '@/features/scan';
import { colors, typography } from '@/theme';

export default function DashboardScreen() {
  const router = useRouter();
  const { pages } = useScanSession();
  const belum = pages.filter((p) => p.status !== 'tersimpan').length;

  return (
    <Screen scroll>
      <ScreenHeader title="Dashboard" subtitle="Semua dokumenmu ada di sini" />
      <AccountCard />
      {pages.length > 0 ? (
        <Card>
          <Text style={styles.judul}>Sesi scan berjalan</Text>
          <Text style={styles.isi}>
            {belum > 0
              ? `${belum} dari ${pages.length} halaman belum disimpan sebagai dokumen.`
              : `Dokumen tersimpan (${pages.length} halaman).`}
          </Text>
          <Button title="Buka sesi scan" onPress={() => router.navigate('/kamera')} />
        </Card>
      ) : null}
      <EmptyState
        icon="document-text-outline"
        title="Belum ada dokumen"
        description="Scan dokumen pertamamu lewat tab Kamera. Hasilnya akan muncul di sini."
        actionLabel="Mulai scan"
        onAction={() => router.navigate('/kamera')}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  judul: { ...typography.bodyStrong, color: colors.text },
  isi: { ...typography.body, color: colors.textMuted },
});
```

---

## 9. Cek akhir kode

```bash
npm run typecheck
npm run lint
npm run format:check
npm run cek:kontras
```

Hasil yang benar: `typecheck` **0 galat**, `lint` tanpa temuan, `format:check` "All matched files use Prettier code style!", dan `cek:kontras` "Semua pasangan lulus" (16 pasangan, tidak berubah dari Fase 4). Bila `format:check` mengeluh, jalankan `npm run format`.

Cek tidak ada warna mentah dan tidak ada rahasia:

```bash
git grep -nE "#[0-9A-Fa-f]{6}" -- app src/components src/features
git grep -niE "api_secret|sb_secret|service_role" -- app src
```

Hasil yang benar: **kosong** untuk keduanya.

---

## 10. Tugas 5.9: uji di HP, commit, pull request

### 10.1 Jalankan

```bash
npx expo start --clear
```

Pastikan log menampilkan empat nama variabel `EXPO_PUBLIC_*`.

### 10.2 Daftar uji di HP

Centang satu per satu dan **laporkan hasilnya kepada saya**, terutama yang gagal. Siapkan Console Cloudinary (Media Library) dan Supabase (Table Editor) di layar lain.

1. [ ] Buka sesi dengan 3 halaman: kolom **Judul dokumen** berisi `Dokumen D Bln YYYY HH.MM` (waktu HP-mu) dan tiap halaman berstatus "Menunggu disimpan".
2. [ ] Ubah judul menjadi sesuatu yang jelas (misalnya "Uji Fase 5"), ketuk **Simpan dokumen**. Tiap halaman bergantian menampilkan "Mengunggah N%" lalu "Tersimpan" (ikon centang). Di akhir: banner "Dokumen tersimpan."
3. [ ] Cloudinary **Media Library**: 3 foto baru di folder `scannest`, tegak, ukuran sisi lebar tidak melebihi 2000 piksel, `public_id` acak.
4. [ ] Supabase **SQL Editor**, jalankan (tidak memuat email):

   ```sql
   select d.judul, d.status, d.jumlah_halaman, h.urutan, h.public_id, h.ukuran_byte
   from public.dokumen d
   join public.halaman_dokumen h on h.dokumen_id = d.id
   order by d.dibuat_pada desc, h.urutan;
   ```

   Harus ada 3 baris untuk "Uji Fase 5": `status` = `draft`, `jumlah_halaman` = 3 (dijaga trigger Fase 2), `urutan` 1, 2, 3, dan `public_id` yang sama dengan di Cloudinary.
5. [ ] Dashboard: kartu menyebut "Dokumen tersimpan (3 halaman)". Ketuk **Mulai sesi baru** di daftar: kembali ke kamera.
6. [ ] **Uji gagal tengah:** ambil 3 halaman baru. Ketuk **Simpan dokumen** lalu **segera** nyalakan mode pesawat saat halaman 1 atau 2 sedang diunggah. Setelah beberapa detik (tiga percobaan) muncul "Tidak bisa terhubung ke Cloudinary" pada halaman itu dan banner "Halaman N belum berhasil disimpan. Halaman sebelumnya aman...". Halaman yang sudah "Tersimpan" tetap berstatus itu.
7. [ ] Pada keadaan itu: tombol geser tidak aktif, judul terkunci, halaman yang sudah tersimpan tidak bisa dihapus, dan tombol berubah menjadi **Coba lagi (N halaman)**.
8. [ ] Matikan mode pesawat, ketuk **Coba lagi**: **hanya** halaman yang belum tersimpan diproses dan selesai. Cek Supabase (query nomor 4): tetap **satu** dokumen untuk sesi ini dan urutannya lengkap; Cloudinary tidak memuat foto ganda untuk halaman yang sudah tersimpan.
9. [ ] **Uji preset salah:** ubah sementara `EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET` di `.env` menjadi nama ngawur, restart (`npx expo start --clear`), ambil 1 halaman, ketuk **Simpan dokumen**: pesan "Upload preset tidak ditemukan" (atau pesan asli Cloudinary yang saya tampilkan bila kalimatnya berbeda; **laporkan kalimat yang tampil**) dan **tidak** ada percobaan ulang yang berkepanjangan. Kembalikan nilai `.env` yang benar.
10. [ ] **Uji tanpa `.env` Cloudinary:** kosongkan dua variabel Cloudinary, restart, simpan: pesan "Cloudinary belum diatur..." dan aplikasi tidak crash. Kembalikan nilainya.
11. [ ] Kosongkan kolom judul lalu ketuk **Simpan dokumen**: "Judul dokumen wajib diisi".
12. [ ] Kolom judul tidak tertutup keyboard saat diketuk (catat bila tertutup).
13. [ ] Ketuk **Simpan dokumen** dua kali dengan cepat: hanya satu dokumen terbentuk (cek query nomor 4).
14. [ ] Tidak ada layar merah atau peringatan kuning baru selama pengujian.

Setelah selesai, hapus dokumen dan foto uji bila kamu mau: foto dari Media Library Cloudinary, dan baris uji di Supabase (`delete from public.dokumen where judul like 'Uji Fase 5%';` menghapus halamannya juga karena `on delete cascade`).

### 10.3 Commit dan pull request

```bash
git status
git add .
git status
```

Baca daftar berkas: yang berubah harus berada di `src/`, `app/`, `ROADMAP.md`, dan `docs/`; **tidak ada** `.env` dan tidak ada berkas bernama aneh. Lalu:

```bash
git commit -m "feat(upload): unggah ke Cloudinary dan simpan dokumen ke Supabase"
git push -u origin fase-5-cloudinary
```

Buka pull request, tunggu **CI hijau**, **Merge**, lalu `git switch main` dan `git pull`. Centang tugas 5.0 sampai 5.9 di `ROADMAP.md` pada commit berikutnya.

---

## 11. Yang perlu diingat saat coding nanti

1. **Fase 6 membaca `url_asli`** (K33): URL percantik dibangun dengan menyisipkan resep ke `halaman_dokumen.url_asli`, jadi jangan pernah mengubahnya (begitu pula `public_id`). `url_hasil` awalnya sama dengan `url_asli`; Fase 6 yang menggantinya.
2. **Dokumen tetap `draft`** setelah disimpan. Status `selesai` baru diberikan di Fase 6 (tugas 6.9) setelah semua halaman diproses.
3. **Jangan memasukkan API secret Cloudinary** ke aplikasi, `.env`, atau repo. Penghapusan aset dan unggahan bertanda tangan hanya lewat Edge Function (K6, B14).
4. **Penghapusan dokumen (Fase 7) belum menghapus file di Cloudinary**; itu pekerjaan Edge Function di Fase 8. Sementara itu pantau kuota di dashboard Cloudinary.
5. **Kuota:** tiap halaman memakai penyimpanan (±0,5 sampai 2 MB) dan bandwidth saat dilihat. Hati-hati menguji berulang kali; hapus foto uji dari Media Library.
6. **Sesi tidak bertahan setelah aplikasi ditutup paksa** (K23, dipertegas K27): simpan setelah selesai memotret.
7. **Pesan galat Cloudinary dicocokkan dengan pola umum.** Bila kamu melihat pesan "Cloudinary menolak foto: ..." berisi kalimat asli, kirimkan kalimatnya agar polanya bisa ditambah.
8. **Tabel `dokumen` hanya menerima `user_id`, `judul`, `status` dari klien**, dan `halaman_dokumen` hanya enam kolom (`dokumen_id`, `urutan`, `url_asli`, `url_hasil`, `public_id`, `ukuran_byte`); menambah kolom lain akan ditolak oleh `grant` (Fase 2).

---

## 12. Pemecahan masalah

| Gejala | Kemungkinan penyebab dan solusi |
|---|---|
| `curl: (26) Failed to open/read local data from file/application` di 3.3 | Berkas foto tidak terbaca curl (nama atau jalur salah, ekstensi tersembunyi, kutip ganda dua kali, atau berkas OneDrive online-only). Bukan masalah preset. Lihat penjelasan di 3.3. |
| "Cloudinary belum diatur..." saat Simpan | Dua variabel Cloudinary kosong atau Metro belum di-restart. Isi `.env`, lalu `npx expo start --clear`, dan pastikan log menampilkan empat nama variabel. |
| "Upload preset tidak ditemukan" | Nama preset di `.env` salah ketik atau preset belum disimpan. Cocokkan dengan Console: **Settings > Upload Presets**. |
| "Preset belum berstatus Unsigned" | Signing mode preset masih *Signed*. Ubah menjadi **Unsigned**. |
| "Cloud name salah" | Nilai `EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME` keliru; salin dari dashboard Cloudinary (bukan nama pengguna atau email). |
| "Cloudinary menolak format foto ini" | Preset hanya menerima jpg dan png; foto hasil Fase 4 selalu JPEG, jadi cek `allowed_formats` tidak salah ketik (misalnya `jpg, png` dengan spasi). |
| "Tidak bisa terhubung ke Cloudinary" padahal internet ada | Sinyal buruk atau DNS; coba pindah jaringan. Bila hanya terjadi pada Cloudinary, buka `https://api.cloudinary.com` di peramban HP untuk memeriksa. |
| "Akunmu tidak diizinkan menyimpan dokumen" | RLS menolak: akunmu mungkin nonaktif (`is_aktif = false`) atau sesi kedaluwarsa. Keluar lalu masuk lagi. |
| "Data belum bisa disimpan" | Penulisan ke Supabase gagal (proyek di-pause? lihat Dashboard Supabase). Foto yang sudah terunggah tidak hilang; tekan Coba lagi. |
| Foto terunggah tetapi tidak ada di tabel | Tahap database gagal; status halaman menunjukkan "Terunggah" dengan pesan. Tekan Coba lagi. Bila aplikasi terlanjur ditutup, fotonya yatim di Cloudinary (B15) dan bisa dihapus manual. |
| Tombol Simpan tidak bereaksi | Penyimpanan sedang berjalan (tombol berputar), atau judul kosong (lihat pesan di atas daftar). |
| `typecheck`: `Type ... is missing the following properties from type 'DaftarHalamanProps'` di `kamera.tsx` | `kamera.tsx` belum diganti dengan versi bagian 8.3 (atau `index.ts` bagian 8.2 belum menyalin ekspor `useSimpanDokumen`). |
| `typecheck`: `Cannot find module '@/features/dokumen'` | Berkas `src/features/dokumen/index.ts` belum dibuat (bagian 6.3). |
| `typecheck`: `Property 'cloudinaryCloudName' does not exist` | `src/lib/env.ts` belum diganti dengan versi bagian 4.2. |
| Peringatan "The `lock` option is deprecated" di konsol | Dari `@supabase/supabase-js`; tidak menghalangi. Backlog B13. |
| Nama berkas aneh muncul di `git status` | Kode tertempel ke terminal, bukan ke berkas. Hapus dengan `git rm` atau `del`; lihat `panduan-fase-1.md` bagian 3.0. |

---

## 13. Checklist akhir Fase 5

Sama dengan "Selesai bila" Fase 5 di `ROADMAP.md`.

- [x] Dokumen terbaru dan cabang `fase-5-cloudinary` siap; hasil uji orientasi Fase 4 dilaporkan (5.0)
- [x] Preset Unsigned jadi; `curl` menghasilkan JSON yang benar, gif ditolak, `public_id` buatan sendiri tidak berlaku (5.1)
- [x] `.env` Cloudinary terisi; `uploadImage` bekerja dengan kemajuan, batas 8 MB, dan ulang otomatis (5.2 sampai 5.5)
- [x] Foto dari kamera muncul di Cloudinary dan tercatat di `halaman_dokumen` dengan `public_id` benar; `jumlah_halaman` sesuai (5.6)
- [x] Gagal di tengah tidak merusak halaman sebelumnya; **Coba lagi** hanya mengerjakan sisa, tanpa dokumen atau unggahan ganda (5.7)
- [x] Judul, status per halaman, dan kartu Dashboard bekerja (5.8)
- [x] `typecheck`, `lint`, `format:check`, `cek:kontras` bersih; PR digabung dan CI hijau (5.9)

---

## 14. Daftar berkas Fase 5

| Berkas | Tugas | Status |
|---|---|---|
| `ROADMAP.md`, `docs/*.md` | 5.0 | diubah |
| `.env` | 5.2 | diisi dua variabel (tidak di-commit) |
| `src/lib/env.ts` | 5.2 | diubah (variabel Cloudinary) |
| `src/lib/cloudinaryErrors.ts` | 5.2, 5.4, 5.5 | baru |
| `src/lib/cloudinary.ts` | 5.2, 5.3 | baru |
| `src/features/dokumen/judul.ts` | 5.6 | baru |
| `src/features/dokumen/api.ts` | 5.6 | baru |
| `src/features/dokumen/index.ts` | 5.6 | baru |
| `src/features/scan/ScanSessionProvider.tsx` | 5.7 | diubah (status, hasil, dokumen, judul) |
| `src/features/scan/useSimpanDokumen.ts` | 5.6, 5.7 | baru |
| `src/features/scan/DaftarHalaman.tsx` | 5.8 | diubah |
| `src/features/scan/index.ts` | 5.8 | diubah |
| `app/(tabs)/kamera.tsx` | 5.8 | diubah |
| `app/(tabs)/index.tsx` | 5.8 | diubah (teks kartu sesi) |

---

## 15. Sumber (diakses 17 Oktober 2026)

- Cloudinary, Upload presets (preset unsigned, `allowed_formats`, `disallow_public_id`, transformasi masuk, "hanya parameter terbatas pada permintaan tanpa tanda tangan"; versi Markdown dari indeks `llms-image-and-video-apis.txt`): https://cloudinary.com/documentation/upload_presets
- Cloudinary, Client-side uploading (pertimbangan keamanan unggahan tanpa tanda tangan, tidak bisa menimpa aset, `return_delete_token` tidak didukung tanpa tanda tangan): https://cloudinary.com/documentation/client_side_uploading
- Cloudinary, Upload API reference (halaman induk; rincian metode `upload` tidak berhasil saya baca utuh): https://cloudinary.com/documentation/image_upload_api_reference
- Cloudinary, contoh staf tentang alamat unggah `https://api.cloudinary.com/v1_1/<cloud_name>/image/upload` dengan `file`, `folder`, `upload_preset`: https://support.cloudinary.com/hc/en-us/community/posts/360043143252-Upload-image-to-specific-folder-via-endpoint-API
- Cloudinary, perbandingan paket (Free: 10 MB per gambar, 25 megapiksel): https://cloudinary.com/pricing/compare-plans
- Cloudinary, React Native image and video upload (SDK; tidak dipakai, kita memakai unggahan HTTP langsung): https://cloudinary.com/documentation/react_native_image_and_video_upload
- Skema database Fase 2 (`supabase/migrations/20261010120000_init_schema.sql`): tabel `dokumen`, `halaman_dokumen`, kebijakan RLS, `grant` kolom
