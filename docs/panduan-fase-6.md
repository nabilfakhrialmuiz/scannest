# Panduan Fase 6: Percantik Foto, Non-destruktif (Scannest)

**Untuk:** Nabil Fakhri Al Muiz · **Terakhir diperbarui:** 21 Oktober 2026 (checklist dicentang; isi tidak berubah) · **Sinkron dengan:** `ROADMAP.md` v0.11 (Fase 6, tugas 6.0 sampai 6.12)

Setelah Fase 6 selesai, setiap halaman yang sudah tersimpan di cloud bisa **dipercantik**: crop dengan menarik sudut, putar 90°, filter (Dokumen, Hitam-putih, Abu-abu, Tajam), kecerahan, dan kontras, dengan **pratinjau langsung**, tombol **Bandingkan** dan **Reset**, lalu **Simpan**. Foto asli di Cloudinary **tidak pernah diubah**: yang disimpan hanyalah *resep efek* di tabel `efek_foto`, dan Cloudinary menghitung hasilnya lewat URL. Tab **Percantik** menampilkan halaman mana yang belum dikerjakan.

**Apa yang sudah dan belum saya uji:**

- Sudah: seluruh kode saya jalankan sebagai aplikasi web (React Native Web, Expo SDK 54) dengan Chromium, melawan **Cloudinary dan tabel database tiruan** buatan saya (tiruan gambar memakai PIL, bukan Cloudinary sungguhan). **101 pemeriksaan e2e lulus** di sembilan kelompok skenario: tab Percantik (kosong, berisi, galat, lencana Belum/Selesai, thumbnail), editor (hanya foto asli diminta saat belum ada efek; ketuk cepat beberapa filter menghasilkan **satu** permintaan karena debounce), slider (kelipatan 5, -100 dipotong menjadi -99 di URL), crop (seret sudut dan badan, ukuran minimum, URL `c_crop`), urutan rantai crop → putar → filter → kecerahan → kontras, Bandingkan dan Reset, simpan (upsert `efek_foto`, `url_hasil`, status dokumen `selesai` **hanya** setelah semua halaman punya efek), buka ulang (efek pulih), dan galat (pratinjau putus lalu **Muat ulang pratinjau**, simpan gagal 500, RLS 42501, jaringan putus, `UPDATE` nol baris, halaman tidak ditemukan). Uji regresi Fase 5 (48 skenario) tetap lulus. **34 uji unit** (`npm test`) untuk model efek, pembangun URL, geometri crop, dan pembacaan data database. `typecheck`, `lint`, `format:check`, `cek:kontras` bersih, dan urutan langkah panduan ini saya putar ulang pada salinan bersih Fase 5 (typecheck setelah tiap berkas, `npm test` di akhir: 34 lulus; satu-satunya galat sementara dijelaskan di 7). Sintaks transformasi Cloudinary saya coba langsung ke akunmu lewat konektor Cloudinary pada 18 Oktober 2026 (bagian 3).
- Belum: **Supabase milikmu yang sungguhan**, **HP / Expo Go**, dan **tampilan visual efek nyata** dari Cloudinary (lewat konektor saya hanya memastikan sintaks diterima dan ukuran hasilnya benar, bukan menilai apakah "Dokumen" terlihat bagus). Khususnya belum terbukti: (1) gestur crop dan slider di layar sentuh Android (di web saya hanya memakai mouse), (2) `Image.prefetch` dan cache gambar di Android, (3) bentuk jawaban PostgREST untuk `efek_foto(...)` (satu objek atau larik; kode menerima keduanya), (4) `UPSERT` dan `UPDATE` terhadap RLS Supabase asli. Daftar uji di bagian 9 adalah buktinya.

---

## Daftar isi

1. Peta tugas dan keputusan
2. Tugas 6.0: tutup Fase 5 dan siapkan cabang
3. Tugas 6.1: verifikasi sintaks transformasi Cloudinary
4. Tugas 6.2: model efek, pembangun URL, dan uji unit
5. Tugas 6.3 dan 6.9: crop murni, pembacaan data, dan penyimpanan
6. Tugas 6.4 sampai 6.9: layar editor
7. Tugas 6.10: tab Percantik dan merakit layar
8. Cek akhir kode
9. Tugas 6.12: uji di HP, commit, pull request
10. Yang perlu diingat saat coding nanti
11. Pemecahan masalah
12. Checklist akhir Fase 6
13. Daftar berkas Fase 6
14. Sumber

---

## 1. Peta tugas dan keputusan

| Tugas | Isi | Bagian |
|---|---|---|
| 6.0 | Tutup Fase 5 (dokumen terbaru masuk repo), cabang `fase-6-percantik` | 2 |
| 6.1 | Verifikasi sintaks transformasi Cloudinary dan buktikan di browser-mu | 3 |
| 6.2 | `efek.ts`, `buildCloudinaryUrl`, uji unit (`node --test`) | 4 |
| 6.3 | Geometri crop, pembacaan data `efek_foto`, `muatHalaman` | 5 |
| 6.4 | Overlay crop 4 sudut | 6 |
| 6.5 | Putar 90° | 6 |
| 6.6 | Chip filter | 6 |
| 6.7 | Slider kecerahan dan kontras, pratinjau dengan debounce 300 ms | 6 |
| 6.8 | Bandingkan sebelum/sesudah dan Reset | 6 |
| 6.9 | Simpan: upsert `efek_foto`, `url_hasil`, status dokumen | 5 dan 6 |
| 6.10 | Tab Percantik, tombol **Percantik foto** setelah menyimpan dokumen, layar editor (rute) | 7 |
| 6.11 | Pantau pemakaian transformasi di dashboard Cloudinary | 9 |
| 6.12 | Uji di HP, commit, PR, CI hijau, merge | 9 |

Nomor 6.1 sampai 6.11 sama dengan roadmap v0.9; 6.0 dan 6.12 ditambahkan pada v0.10.

**Pintasan (opsional):** `scannest-fase6-kode.zip` berisi 21 berkas kode Fase 6 dengan susunan folder yang sama dengan repomu. Pengecualian: `package.json` **tidak** ada di zip (isinya milikmu); kamu menambah satu baris sendiri (4.5). Kamu boleh mengekstraknya ke `C:\scannest` (timpa berkas yang ada) alih-alih mengetik satu per satu, tetapi baca bagian 4 sampai 7 agar paham isinya.

### Alur memperindah satu halaman, dalam satu gambar

```
Tab Percantik ──ketuk halaman──▶ muatHalaman: url_asli + efek_foto (bila ada)
                                          │
                                          ▼
   Editor: state efek {filter, kecerahan, kontras, rotasi, crop}
          │ tiap perubahan
          ▼
   buildCloudinaryUrl(url_asli, efek, 1200 px)  ──▶  tunda 300 ms  ──▶  Image.prefetch
          │                                                                │ siap
          │ efek bawaan: tanpa URL (foto asli langsung)                     ▼
          ▼                                                        pratinjau diganti
   [Simpan] ──▶ upsert efek_foto ──▶ url_hasil = buildCloudinaryUrl(url_asli, efek)
                                          │
                       semua halaman dokumen punya efek? ──ya──▶ dokumen.status = 'selesai'
```

Satu fakta penting: **tidak ada berkas baru yang dibuat atau diunggah**. `url_hasil` hanyalah `url_asli` dengan resep transformasi disisipkan setelah `/image/upload/`. Cloudinary membuat gambar turunan saat URL itu pertama kali dibuka, lalu menyimpannya.

### Keputusan teknis (dicek 18 Oktober 2026)

**K31: gestur crop dan slider memakai `PanResponder` bawaan React Native, bukan Gesture Handler + Reanimated** (roadmap awal menyebut yang kedua).

| Pilihan | Pro | Kontra |
|---|---|---|
| **`PanResponder`** (dipilih) | Tanpa paket baru, tanpa konfigurasi Babel (worklet), tidak butuh *development build*; cukup untuk empat titik tarik dan dua slider; bisa saya uji di web | Berjalan di jalur JS: pada perangkat lambat gerakan bisa kurang mulus dibanding gestur native |
| Gesture Handler + Reanimated | Mulus di thread UI | Paket dan konfigurasi tambahan, risiko di Expo Go, sulit diuji di lingkungan saya |

Bila di HP-mu gestur crop terasa patah-patah, laporkan; kita bisa pindah ke Reanimated sebagai perbaikan terarah.

**K32: slider buatan sendiri** (`src/components/Slider.tsx`) alih-alih paket slider. Pro: tanpa dependensi, area sentuh 48 dp, bisa dioperasikan pembaca layar lewat aksi tambah dan kurang. Kontra: kode kita sendiri yang harus dirawat.

**K33: URL dibangun dari `url_asli`, bukan dari `public_id` + nama cloud** (roadmap awal menulis `buildCloudinaryUrl(publicId, efek)`). Pro: versi (`v123`), folder, dan ekstensi ikut terbawa persis; tidak bergantung pada `.env`. Kontra: bergantung pada bentuk URL Cloudinary; bila `url_asli` tidak memuat `/image/upload/`, fungsi mengembalikan `null` dan layar menampilkan pesan, bukan gambar rusak.

**K34: uji unit memakai `node --test`, bukan Jest** (roadmap awal menyebut Jest). Pro: tanpa paket baru; Node 22.18 ke atas (kamu memakai Node 24) menjalankan berkas `.ts` langsung; modul yang diuji murni, jadi tidak butuh lingkungan React Native. Kontra: tidak cocok untuk menguji komponen layar; kalau nanti butuh, Jest ditambahkan di Fase 9 (backlog B20).

**K35: pratinjau 1200 px, kualitas otomatis, ditunda 300 ms.** Pratinjau memakai `c_limit,h_1200,w_1200/q_auto` setelah resep; hasil simpan (`url_hasil`) **tanpa** pengecilan. Efek bawaan tidak memakai URL transformasi sama sekali. Slider berlangkah 5 mengurangi jumlah URL unik. Pro: respons cepat dan hemat kuota data. Kontra: pratinjau bukan resolusi penuh.

**K36: kecerahan dipotong minimal -99 di URL.** Cloudinary menolak `e_brightness:-100` ("Brightness must be > -100"; saya coba langsung). Slider tetap menampilkan -100 sampai 100 (batas kolom database).

**K37: crop dikerjakan pada foto asli, sebelum rotasi** (urutan rantai crop → rotasi → efek, sesuai roadmap). Koordinat crop disimpan dalam piksel foto asli di `data_crop` (`{x, y, w, h}`). Kontra yang diterima: kamu tidak bisa menarik crop pada tampilan yang sudah diputar; kamu crop dulu, baru putar (backlog B16).

**K38: status dokumen menjadi `selesai` bila setiap halamannya punya baris `efek_foto`**, termasuk halaman yang kamu simpan dengan **Simpan tanpa efek**. Pro: tombol "selesai" tidak perlu; satu ketukan per halaman. Kontra: "selesai" berarti "sudah ditinjau", bukan "pasti diberi efek". Pembaruan status bersifat pelengkap: bila gagal, efek tetap tersimpan dan status dibetulkan pada penyimpanan berikutnya.

**K39: Bandingkan berupa tombol sakelar** (ketuk untuk melihat foto asli, ketuk lagi untuk kembali), bukan tahan-tekan. Pro: mudah dipakai pembaca layar dan satu tangan. Kontra: satu ketukan tambahan.

**Kuota Cloudinary, dikoreksi dengan data.** Satu kredit setara **1.000 transformasi** (atau 1 GB penyimpanan, atau 1 GB bandwidth), dan setiap transformasi unik dihitung **sekali** (halaman *compare plans* Cloudinary). Jadi ratusan pratinjau tidak menghabiskan kuota; penyimpanan foto lebih berpengaruh. Pada 18 Oktober 2026 akunmu tercatat 47 transformasi (0,05 kredit) dan total 0,22 dari 25 kredit. Catatan di rencana awal saya ("tiap URL unik = 1 kredit") keliru; debounce tetap berguna untuk kecepatan dan kuota data.

---

## 2. Tugas 6.0: tutup Fase 5 dan siapkan cabang

Kamu melaporkan Fase 5 selesai semua. Saya mencentangnya di `ROADMAP.md` v0.10 berdasarkan laporanmu (termasuk koreksi contoh `curl` di panduan Fase 5 bagian 3.3). Satu hal tetap saya tanyakan: **sudahkah foto uji dan dokumen uji Fase 5 dibersihkan, dan apakah ada foto yang tampil miring di Cloudinary?** Foto yang miring akan ikut miring saat dipercantik dan membuat crop terasa meleset; beri tahu saya sebelum menguji crop.

### 2.1 Cek keadaan Fase 5

```bash
cd C:\scannest
git status
git switch main
git pull
git log --oneline -5
```

`git status` harus bersih dan `git log` memuat commit Fase 5. Bila Fase 5 belum digabung ke `main`, selesaikan pull request-nya dulu (panduan Fase 5 bagian 10.3).

### 2.2 Salin dokumen terbaru

1. Unduh `scannest-dokumen.zip` dari percakapan ini dan ekstrak.
2. Salin `ROADMAP.md` ke akar `C:\scannest` (timpa), dan isi folder `docs` ke `C:\scannest\docs` (timpa; akan bertambah `panduan-fase-6.md`, dan `panduan-fase-5.md` berubah karena checklist-nya dicentang).

### 2.3 Cabang

```bash
git switch -c fase-6-percantik
git add ROADMAP.md docs
git commit -m "docs: roadmap v0.10 dan panduan fase 6"
```

---

## 3. Tugas 6.1: verifikasi sintaks transformasi Cloudinary

Roadmap mewajibkan sintaks diuji sebelum coding. Saya sudah mencobanya langsung ke akun Cloudinary-mu pada 18 Oktober 2026 (konektor Cloudinary, gambar uji yang kemudian saya hapus beserta turunannya). Kamu membuktikannya sendiri di 3.2.

### 3.1 Hasil uji saya

Komponen dipisah `/` (satu komponen per langkah) dan dijalankan **berurutan dari kiri ke kanan**:

| Efek | Komponen | Hasil uji |
|---|---|---|
| Crop | `c_crop,g_north_west,h_H,w_W,x_X,y_Y` | Diterima. Dengan `g_north_west`, `x` dan `y` dihitung dari **pojok kiri atas** foto. Crop yang melewati tepi terpotong di tepi (tidak bergeser). |
| Putar | `a_90`, `a_180`, `a_270` | Diterima; `a_90` menukar lebar dan tinggi. |
| Dokumen | `e_improve` | Diterima. |
| Hitam-putih | `e_blackwhite` | Diterima. |
| Abu-abu | `e_grayscale` | Diterima. |
| Tajam | `e_sharpen` | Diterima. |
| Kecerahan | `e_brightness:N` | Diterima untuk **-99 sampai 100**. `-100` **ditolak** (400, "Brightness must be > -100"); kode memotongnya ke -99 (K36). |
| Kontras | `e_contrast:N` | Diterima untuk **-100 sampai 100**. |
| Pratinjau | `c_limit,h_1200,w_1200` lalu `q_auto` | Diterima; foto lebih kecil tidak diperbesar. |

Yang **tidak** bisa saya nilai: apakah hasil "Dokumen" atau "Tajam" tampak bagus di fotomu. Itu penilaianmu di HP.

Susunan URL lengkapnya (urutan crop → putar → filter → kecerahan → kontras → pratinjau):

```
https://res.cloudinary.com/CLOUD/image/upload/c_crop,g_north_west,h_600,w_800,x_100,y_50/a_90/e_improve/e_brightness:20/e_contrast:-10/c_limit,h_1200,w_1200/q_auto/v1234567890/scannest/NAMA.jpg
```

### 3.2 Buktikan di browser-mu

Ambil satu `url_asli` milikmu di Supabase **SQL Editor** (hasilnya tidak memuat email):

```sql
select h.url_asli
from public.halaman_dokumen h
join public.dokumen d on d.id = h.dokumen_id
order by d.dibuat_pada desc, h.urutan
limit 1;
```

URL itu berbentuk `https://res.cloudinary.com/CLOUD/image/upload/v.../scannest/NAMA.jpg`. Sisipkan komponen **setelah** `/upload/` lalu buka di browser. Coba empat URL ini (ganti bagian di depan dan belakang dengan milikmu):

| Yang diuji | Sisipkan setelah `/upload/` | Hasil yang benar |
|---|---|---|
| Putar | `a_90/` | Foto tampil terputar 90° searah jarum jam. |
| Dokumen | `e_improve/` | Foto tampil lebih kontras dan tajam. |
| Crop | `c_crop,g_north_west,h_300,w_300,x_0,y_0/` | Hanya pojok kiri atas foto (300 × 300) yang tampil. |
| Kecerahan ditolak | `e_brightness:-100/` | Browser menampilkan galat 400. Ini **benar**: itu sebabnya kode memakai -99. |

Tiap URL baru memakai satu transformasi (1.000 transformasi = 1 kredit), jadi empat URL ini praktis gratis.

---

## 4. Tugas 6.2: model efek, pembangun URL, dan uji unit

### 4.1 `src/features/editor/efek.ts`

Berkas **murni**: tidak mengimpor React atau Expo, supaya bisa diuji langsung dengan Node.

**Berkas:** `src/features/editor/efek.ts` (berkas baru: buat)

```ts
// Model efek foto (tugas 6.2). Berkas ini murni: tidak mengimpor apa pun dari React atau Expo,
// sehingga bisa diuji langsung dengan `npm test`.

export const DAFTAR_FILTER = ['asli', 'dokumen', 'hitam_putih', 'abu_abu', 'tajam'] as const;

/** Sama dengan enum `filter_foto` di database. */
export type FilterFoto = (typeof DAFTAR_FILTER)[number];

export const LABEL_FILTER: Record<FilterFoto, string> = {
  asli: 'Asli',
  dokumen: 'Dokumen',
  hitam_putih: 'Hitam-putih',
  abu_abu: 'Abu-abu',
  tajam: 'Tajam',
};

export type Rotasi = 0 | 90 | 180 | 270;

/** Area crop dalam piksel foto asli (sudah dinormalisasi di Fase 4 dan dibatasi 2000 px di preset). */
export type CropPiksel = { x: number; y: number; w: number; h: number };

export type Efek = {
  filter: FilterFoto;
  /** -100 sampai 100 (batas kolom database). */
  kecerahan: number;
  /** -100 sampai 100 (batas kolom database). */
  kontras: number;
  rotasi: Rotasi;
  /** null: tanpa crop. */
  crop: CropPiksel | null;
};

export const EFEK_BAWAAN: Efek = {
  filter: 'asli',
  kecerahan: 0,
  kontras: 0,
  rotasi: 0,
  crop: null,
};

/** Langkah slider. Nilai yang lebih jarang berubah berarti lebih sedikit URL unik (hemat kredit). */
export const LANGKAH_SLIDER = 5;

export function bulatkanSlider(nilai: number): number {
  const terbatas = Math.max(-100, Math.min(100, nilai));
  return Math.round(terbatas / LANGKAH_SLIDER) * LANGKAH_SLIDER;
}

/** Putar 90 derajat searah jarum jam: 0, 90, 180, 270, lalu kembali ke 0. */
export function putar90(rotasi: Rotasi): Rotasi {
  return ((rotasi + 90) % 360) as Rotasi;
}

export function samaCrop(a: CropPiksel | null, b: CropPiksel | null): boolean {
  if (a === null || b === null) return a === b;
  return a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h;
}

export function samaEfek(a: Efek, b: Efek): boolean {
  return (
    a.filter === b.filter &&
    a.kecerahan === b.kecerahan &&
    a.kontras === b.kontras &&
    a.rotasi === b.rotasi &&
    samaCrop(a.crop, b.crop)
  );
}

export function adalahBawaan(efek: Efek): boolean {
  return samaEfek(efek, EFEK_BAWAAN);
}
```

| Bagian | Penjelasan |
|---|---|
| `DAFTAR_FILTER`, `FilterFoto` | Lima nilai yang **sama persis** dengan enum `filter_foto` di database (Fase 2). Memakai `as const` supaya tipe `FilterFoto` diturunkan dari daftarnya. |
| `Rotasi`, `CropPiksel`, `Efek` | Bentuk satu resep efek. `crop: null` berarti tanpa crop. Kecerahan dan kontras -100 sampai 100 mengikuti batas kolom. |
| `EFEK_BAWAAN` | Resep "tidak ada yang berubah". Editor memulai dari sini bila halaman belum punya efek. |
| `LANGKAH_SLIDER`, `bulatkanSlider` | Slider berlangkah 5 (K35): lebih sedikit URL unik. Nilai dijepit ke -100 sampai 100 lalu dibulatkan. |
| `putar90` | 0 → 90 → 180 → 270 → 0, searah jarum jam seperti `a_90` Cloudinary. |
| `samaEfek`, `adalahBawaan` | Membandingkan resep. `adalahBawaan` menentukan tombol **Simpan tanpa efek**, status tombol Reset, dan apakah pratinjau perlu URL. |

### 4.2 `src/features/editor/cloudinaryUrl.ts`

Impor dari `./efek` memakai **`import type`**; ini disengaja: Node hanya melewati impor bertipe bila seluruh kata kuncinya `import type`.

**Berkas:** `src/features/editor/cloudinaryUrl.ts` (berkas baru: buat)

```ts
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
```

| Bagian | Penjelasan |
|---|---|
| `KECERAHAN_MIN_CLOUDINARY` | -99, hasil uji bagian 3 (K36). |
| `cropSah` | Crop dianggap sah bila semua angkanya terhingga, `x` dan `y` tidak negatif, `w` dan `h` minimal 1. Crop yang tidak sah dilewati (tanpa crop), bukan melempar galat. |
| `komponenTransformasi` | Urutan **tetap**: crop → putar → filter → kecerahan → kontras. Urutan ini penting: crop memakai koordinat foto asli, jadi harus pertama (K37). Kecerahan dan kontras bernilai 0 tidak menghasilkan komponen. |
| `buildCloudinaryUrl` | Menyisipkan komponen setelah `/image/upload/` pada `url_asli` (K33). Mengembalikan `null` bila bukan URL Cloudinary **atau** sudah memuat transformasi (mencegah penumpukan). Tanpa komponen sama sekali, URL asli dikembalikan apa adanya. |
| `sisiMaks` | Hanya untuk pratinjau dan gambar mini: menambah `c_limit,h_N,w_N` dan `q_auto`. `url_hasil` yang disimpan **tidak** memakainya. |

### 4.3 Pelari uji

Dua berkas kecil agar `node --test` bisa memuat berkas `.ts` proyek apa adanya (impor tanpa ekstensi dan alias `@/`, seperti Metro dan `tsc`):

**Berkas:** `tests/resolve-ts.mjs` (berkas baru: buat)

```js
// Membolehkan `node --test` memuat berkas .ts proyek apa adanya: impor relatif tanpa ekstensi
// ('./efek') dan alias '@/' (menunjuk ke src/) diselesaikan seperti yang dilakukan Metro dan tsc.
import { register } from 'node:module';

register('./resolve-ts-hook.mjs', import.meta.url);
```

**Berkas:** `tests/resolve-ts-hook.mjs` (berkas baru: buat)

```js
const SRC = new URL('../src/', import.meta.url);

export async function resolve(specifier, context, nextResolve) {
  const target = specifier.startsWith('@/') ? new URL(specifier.slice(2), SRC).href : specifier;
  try {
    return await nextResolve(target, context);
  } catch (galat) {
    if (galat.code !== 'ERR_MODULE_NOT_FOUND' && galat.code !== 'ERR_UNSUPPORTED_DIR_IMPORT')
      throw galat;
    for (const calon of [`${target}.ts`, `${target}/index.ts`]) {
      try {
        return await nextResolve(calon, context);
      } catch {
        // coba calon berikutnya
      }
    }
    throw galat;
  }
}
```

### 4.4 `tests/efek.test.mjs`

**Berkas:** `tests/efek.test.mjs` (berkas baru: buat)

```js
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildCloudinaryUrl,
  komponenTransformasi,
  cropSah,
} from '../src/features/editor/cloudinaryUrl.ts';
import {
  EFEK_BAWAAN,
  DAFTAR_FILTER,
  adalahBawaan,
  bulatkanSlider,
  putar90,
  samaEfek,
} from '../src/features/editor/efek.ts';

const ASLI = 'https://res.cloudinary.com/demo/image/upload/v1791777081/scannest/abc123.jpg';
const efek = (o = {}) => ({ ...EFEK_BAWAAN, ...o });

describe('buildCloudinaryUrl', () => {
  it('foto asli tanpa efek: URL tidak berubah', () => {
    assert.equal(buildCloudinaryUrl(ASLI, EFEK_BAWAAN), ASLI);
  });

  it('tiap filter menghasilkan komponen yang benar', () => {
    const hasil = {
      asli: ASLI,
      dokumen:
        'https://res.cloudinary.com/demo/image/upload/e_improve/v1791777081/scannest/abc123.jpg',
      hitam_putih:
        'https://res.cloudinary.com/demo/image/upload/e_blackwhite/v1791777081/scannest/abc123.jpg',
      abu_abu:
        'https://res.cloudinary.com/demo/image/upload/e_grayscale/v1791777081/scannest/abc123.jpg',
      tajam:
        'https://res.cloudinary.com/demo/image/upload/e_sharpen/v1791777081/scannest/abc123.jpg',
    };
    for (const f of DAFTAR_FILTER)
      assert.equal(buildCloudinaryUrl(ASLI, efek({ filter: f })), hasil[f], f);
  });

  it('rotasi 90, 180, 270; 0 tidak menambah komponen', () => {
    assert.deepEqual(komponenTransformasi(efek({ rotasi: 0 })), []);
    assert.deepEqual(komponenTransformasi(efek({ rotasi: 90 })), ['a_90']);
    assert.deepEqual(komponenTransformasi(efek({ rotasi: 180 })), ['a_180']);
    assert.deepEqual(komponenTransformasi(efek({ rotasi: 270 })), ['a_270']);
  });

  it('kecerahan dan kontras; nol dihilangkan', () => {
    assert.deepEqual(komponenTransformasi(efek({ kecerahan: 20 })), ['e_brightness:20']);
    assert.deepEqual(komponenTransformasi(efek({ kontras: -35 })), ['e_contrast:-35']);
    assert.deepEqual(komponenTransformasi(efek({ kecerahan: 0, kontras: 0 })), []);
  });

  it('kecerahan -100 dipaksa -99 (Cloudinary menolak -100); +100 dan kontras +-100 tetap', () => {
    assert.deepEqual(komponenTransformasi(efek({ kecerahan: -100 })), ['e_brightness:-99']);
    assert.deepEqual(komponenTransformasi(efek({ kecerahan: 100 })), ['e_brightness:100']);
    assert.deepEqual(komponenTransformasi(efek({ kontras: -100 })), ['e_contrast:-100']);
    assert.deepEqual(komponenTransformasi(efek({ kontras: 100 })), ['e_contrast:100']);
  });

  it('nilai di luar rentang dipotong, pecahan dibulatkan', () => {
    assert.deepEqual(komponenTransformasi(efek({ kecerahan: 500, kontras: -500 })), [
      'e_brightness:100',
      'e_contrast:-100',
    ]);
    assert.deepEqual(komponenTransformasi(efek({ kecerahan: 19.6 })), ['e_brightness:20']);
  });

  it('crop: pakai g_north_west dan pembulatan', () => {
    assert.deepEqual(komponenTransformasi(efek({ crop: { x: 100, y: 50, w: 600, h: 400 } })), [
      'c_crop,g_north_west,h_400,w_600,x_100,y_50',
    ]);
    assert.deepEqual(komponenTransformasi(efek({ crop: { x: 10.4, y: 0.6, w: 99.5, h: 80.2 } })), [
      'c_crop,g_north_west,h_80,w_100,x_10,y_1',
    ]);
  });

  it('crop tak sah diabaikan (negatif, nol, NaN, Infinity)', () => {
    for (const crop of [
      { x: -5, y: 0, w: 10, h: 10 },
      { x: 0, y: 0, w: 0, h: 10 },
      { x: 0, y: 0, w: 10, h: 0.2 },
      { x: NaN, y: 0, w: 10, h: 10 },
      { x: 0, y: 0, w: Infinity, h: 10 },
      null,
    ]) {
      assert.equal(cropSah(crop), false);
      assert.deepEqual(komponenTransformasi(efek({ crop })), []);
    }
  });

  it('urutan rantai: crop -> rotasi -> filter -> kecerahan -> kontras', () => {
    const url = buildCloudinaryUrl(
      ASLI,
      efek({
        crop: { x: 100, y: 50, w: 600, h: 400 },
        rotasi: 90,
        filter: 'dokumen',
        kecerahan: 20,
        kontras: 10,
      }),
    );
    assert.equal(
      url,
      'https://res.cloudinary.com/demo/image/upload/c_crop,g_north_west,h_400,w_600,x_100,y_50/a_90/e_improve/e_brightness:20/e_contrast:10/v1791777081/scannest/abc123.jpg',
    );
  });

  it('semua kombinasi filter x rotasi x kecerahan x kontras x crop: tiap URL sah dan unik', () => {
    const lihat = new Set();
    let n = 0;
    for (const filter of DAFTAR_FILTER)
      for (const rotasi of [0, 90, 180, 270])
        for (const kecerahan of [-100, 0, 35, 100])
          for (const kontras of [-100, 0, 35, 100])
            for (const crop of [null, { x: 0, y: 0, w: 500, h: 400 }]) {
              const url = buildCloudinaryUrl(ASLI, { filter, rotasi, kecerahan, kontras, crop });
              assert.ok(url?.startsWith('https://res.cloudinary.com/demo/image/upload/'));
              assert.ok(url.endsWith('/v1791777081/scannest/abc123.jpg') || url === ASLI);
              assert.ok(!url.includes('//e_') && !url.includes('/ /') && !url.includes(',,'));
              assert.ok(!/e_brightness:-100/.test(url));
              lihat.add(url);
              n++;
            }
    // kecerahan -100 dan -99 menghasilkan URL yang sama, jadi unik < n; tetap harus banyak.
    assert.equal(n, 5 * 4 * 4 * 4 * 2);
    assert.ok(lihat.size > 300);
  });

  it('opsi sisiMaks menambah c_limit dan q_auto di akhir rantai', () => {
    const url = buildCloudinaryUrl(ASLI, efek({ filter: 'dokumen' }), { sisiMaks: 1200 });
    assert.equal(
      url,
      'https://res.cloudinary.com/demo/image/upload/e_improve/c_limit,h_1200,w_1200/q_auto/v1791777081/scannest/abc123.jpg',
    );
    assert.equal(
      buildCloudinaryUrl(ASLI, EFEK_BAWAAN, { sisiMaks: 240 }),
      'https://res.cloudinary.com/demo/image/upload/c_limit,h_240,w_240/q_auto/v1791777081/scannest/abc123.jpg',
    );
  });

  it('URL tak dikenali atau sudah bertransformasi: null', () => {
    assert.equal(buildCloudinaryUrl('https://contoh.com/foto.jpg', EFEK_BAWAAN), null);
    assert.equal(buildCloudinaryUrl('', EFEK_BAWAAN), null);
    assert.equal(
      buildCloudinaryUrl(
        'https://res.cloudinary.com/demo/image/upload/e_improve/v1/scannest/a.jpg',
        EFEK_BAWAAN,
      ),
      null,
    );
  });

  it('public_id tanpa versi tetap diterima', () => {
    assert.equal(
      buildCloudinaryUrl(
        'https://res.cloudinary.com/demo/image/upload/scannest/abc.jpg',
        efek({ rotasi: 90 }),
      ),
      'https://res.cloudinary.com/demo/image/upload/a_90/scannest/abc.jpg',
    );
  });
});

describe('efek', () => {
  it('bulatkanSlider: kelipatan 5 dan terbatas -100..100', () => {
    assert.equal(bulatkanSlider(0), 0);
    assert.equal(bulatkanSlider(12), 10);
    assert.equal(bulatkanSlider(13), 15);
    assert.equal(bulatkanSlider(-12), -10);
    assert.equal(bulatkanSlider(-13), -15);
    assert.equal(bulatkanSlider(500), 100);
    assert.equal(bulatkanSlider(-500), -100);
  });

  it('putar90 berputar 0 -> 90 -> 180 -> 270 -> 0', () => {
    assert.equal(putar90(0), 90);
    assert.equal(putar90(90), 180);
    assert.equal(putar90(180), 270);
    assert.equal(putar90(270), 0);
  });

  it('samaEfek dan adalahBawaan', () => {
    assert.ok(adalahBawaan(EFEK_BAWAAN));
    assert.ok(
      samaEfek(
        efek({ crop: { x: 1, y: 2, w: 3, h: 4 } }),
        efek({ crop: { x: 1, y: 2, w: 3, h: 4 } }),
      ),
    );
    assert.ok(!samaEfek(efek({ crop: { x: 1, y: 2, w: 3, h: 4 } }), efek({ crop: null })));
    assert.ok(!samaEfek(efek({ filter: 'tajam' }), EFEK_BAWAAN));
    assert.ok(!adalahBawaan(efek({ kontras: 5 })));
  });
});
```

### 4.5 Tambahkan skrip `test` di `package.json`

Berkas `package.json` **tidak** diganti seluruhnya (isinya milikmu: versi paket dan lain-lain). Buka `C:\scannest\package.json`, cari bagian `"scripts"`, tambahkan **koma** di akhir baris `cek:kontras`, lalu satu baris baru sesudahnya, sehingga tampak begini:

```json
    "cek:kontras": "node scripts/cek-kontras.mjs",
    "test": "node --import ./tests/resolve-ts.mjs --test tests/*.test.mjs"
```

Perintah itu tanpa tanda kutip di sekitar `tests/*.test.mjs`: Node (21 ke atas) memperluas pola glob sendiri, jadi aman di Command Prompt Windows. Bila Node-mu di bawah 22.18, perintahnya tidak mengenali berkas `.ts`; cek dengan `node --version` (kamu memakai Node 24).

### 4.6 Jalankan

```bash
npm test
```

Hasil yang benar pada tahap ini: baris `# tests` bertambah untuk `efek.test.mjs` dan semuanya `pass`; setelah bagian 5 selesai total menjadi **34** uji, **0 fail**. Bila muncul `ERR_MODULE_NOT_FOUND`, cek bahwa dua berkas di 4.3 ada persis di folder `tests`.

---

## 5. Tugas 6.3 dan 6.9: crop murni, pembacaan data, dan penyimpanan

### 5.1 `src/features/editor/crop.ts`

**Berkas:** `src/features/editor/crop.ts` (berkas baru: buat)

```ts
import type { CropPiksel } from './efek';

// Geometri crop (tugas 6.4). Semua angka crop dalam piksel foto asli; layar hanya menampilkannya
// dengan skala. Murni dan tanpa dependensi, jadi bisa diuji dengan `npm test`.

export type Ukuran = { w: number; h: number };

export type Sudut = 'nw' | 'ne' | 'sw' | 'se';

/** Sisi terpendek minimal 10% foto, tidak kurang dari 16 px, tidak melebihi foto itu sendiri. */
export function ukuranMinimum(foto: Ukuran): Ukuran {
  const pendek = Math.min(foto.w, foto.h);
  const sisi = Math.max(16, Math.round(pendek * 0.1));
  return { w: Math.min(sisi, foto.w), h: Math.min(sisi, foto.h) };
}

export function cropPenuh(foto: Ukuran): CropPiksel {
  return { x: 0, y: 0, w: foto.w, h: foto.h };
}

export function adalahPenuh(crop: CropPiksel, foto: Ukuran): boolean {
  return crop.x === 0 && crop.y === 0 && crop.w === foto.w && crop.h === foto.h;
}

/**
 * Memasukkan crop ke dalam foto: dibulatkan, tidak keluar dari tepi, dan tidak lebih kecil dari
 * ukuran minimum. Dipakai saat crop sedang diedit (crop penuh tetap crop penuh).
 */
export function masukkanKeFoto(crop: CropPiksel, foto: Ukuran): CropPiksel {
  const min = ukuranMinimum(foto);
  const w = Math.min(foto.w, Math.max(min.w, Math.round(crop.w)));
  const h = Math.min(foto.h, Math.max(min.h, Math.round(crop.h)));
  const x = Math.min(foto.w - w, Math.max(0, Math.round(crop.x)));
  const y = Math.min(foto.h - h, Math.max(0, Math.round(crop.y)));
  return { x, y, w, h };
}

/** Seperti masukkanKeFoto, tetapi crop yang menutupi seluruh foto menjadi null (tidak perlu c_crop). */
export function rapikanCrop(crop: CropPiksel | null, foto: Ukuran): CropPiksel | null {
  if (!crop) return null;
  const hasil = masukkanKeFoto(crop, foto);
  return adalahPenuh(hasil, foto) ? null : hasil;
}

/** Skala tampil: foto dimuat penuh di dalam kotak (seperti `contentFit="contain"`), tanpa diperbesar melewati kotak. */
export function cocokkan(foto: Ukuran, kotak: Ukuran): { w: number; h: number; skala: number } {
  if (foto.w <= 0 || foto.h <= 0 || kotak.w <= 0 || kotak.h <= 0) return { w: 0, h: 0, skala: 0 };
  const skala = Math.min(kotak.w / foto.w, kotak.h / foto.h);
  return { w: foto.w * skala, h: foto.h * skala, skala };
}

/**
 * Menggeser seluruh area crop sejauh (dx, dy) piksel foto dari posisi awal gestur.
 * Ukurannya tetap; posisinya ditahan di dalam foto.
 */
export function geserCrop(awal: CropPiksel, dx: number, dy: number, foto: Ukuran): CropPiksel {
  const x = Math.min(foto.w - awal.w, Math.max(0, awal.x + dx));
  const y = Math.min(foto.h - awal.h, Math.max(0, awal.y + dy));
  return { x, y, w: awal.w, h: awal.h };
}

/**
 * Menarik satu sudut sejauh (dx, dy) piksel foto dari posisi awal gestur. Sudut di seberangnya
 * tetap di tempat. Hasil ditahan di dalam foto dan tidak lebih kecil dari ukuran minimum.
 */
export function ubahSudut(
  awal: CropPiksel,
  sudut: Sudut,
  dx: number,
  dy: number,
  foto: Ukuran,
): CropPiksel {
  const min = ukuranMinimum(foto);
  const kiri0 = awal.x;
  const atas0 = awal.y;
  const kanan0 = awal.x + awal.w;
  const bawah0 = awal.y + awal.h;

  let kiri = kiri0;
  let atas = atas0;
  let kanan = kanan0;
  let bawah = bawah0;

  if (sudut === 'nw' || sudut === 'sw') {
    kiri = Math.min(kanan0 - min.w, Math.max(0, kiri0 + dx));
  } else {
    kanan = Math.max(kiri0 + min.w, Math.min(foto.w, kanan0 + dx));
  }
  if (sudut === 'nw' || sudut === 'ne') {
    atas = Math.min(bawah0 - min.h, Math.max(0, atas0 + dy));
  } else {
    bawah = Math.max(atas0 + min.h, Math.min(foto.h, bawah0 + dy));
  }
  return { x: kiri, y: atas, w: kanan - kiri, h: bawah - atas };
}
```

| Bagian | Penjelasan |
|---|---|
| `ukuranMinimum` | Sisi terpendek area crop minimal 10% sisi terpendek foto, tidak kurang dari 16 px (area terlalu kecil menghasilkan gambar tak berguna dan sulit ditarik). |
| `masukkanKeFoto` | Membulatkan, menahan area di dalam foto, dan memastikan ukuran minimum. |
| `rapikanCrop` | Sama, tetapi crop yang menutupi **seluruh** foto menjadi `null` (tidak perlu `c_crop`, URL lebih pendek). Dipanggil saat menyimpan. |
| `cocokkan` | Hitung skala tampil foto di dalam kotak (seperti `contentFit="contain"`); dipakai untuk memetakan piksel foto ke koordinat layar. |
| `geserCrop` | Menggeser seluruh area dari posisi awal gestur; ukuran tetap, posisi tertahan di dalam foto. |
| `ubahSudut` | Menarik satu sudut; sudut di seberangnya tetap. Hasil tertahan di dalam foto dan tidak lebih kecil dari ukuran minimum. Dihitung dari **posisi awal gestur** (bukan dari posisi terakhir) supaya tidak ada selisih yang menumpuk. |

### 5.2 `tests/crop.test.mjs`

**Berkas:** `tests/crop.test.mjs` (berkas baru: buat)

```js
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  adalahPenuh,
  cocokkan,
  cropPenuh,
  geserCrop,
  masukkanKeFoto,
  rapikanCrop,
  ubahSudut,
  ukuranMinimum,
} from '../src/features/editor/crop.ts';

const FOTO = { w: 1000, h: 800 };

describe('crop', () => {
  it('ukuranMinimum: 10% sisi terpendek, minimal 16, tidak melebihi foto', () => {
    assert.deepEqual(ukuranMinimum(FOTO), { w: 80, h: 80 });
    assert.deepEqual(ukuranMinimum({ w: 100, h: 100 }), { w: 16, h: 16 });
    assert.deepEqual(ukuranMinimum({ w: 10, h: 500 }), { w: 10, h: 16 });
  });

  it('cropPenuh dan adalahPenuh', () => {
    assert.deepEqual(cropPenuh(FOTO), { x: 0, y: 0, w: 1000, h: 800 });
    assert.ok(adalahPenuh(cropPenuh(FOTO), FOTO));
    assert.ok(!adalahPenuh({ x: 1, y: 0, w: 999, h: 800 }, FOTO));
  });

  it('rapikanCrop: penuh jadi null, null tetap null', () => {
    assert.equal(rapikanCrop(cropPenuh(FOTO), FOTO), null);
    assert.equal(rapikanCrop(null, FOTO), null);
  });

  it('rapikanCrop: dibulatkan, dimasukkan ke dalam foto, dan tidak terlalu kecil', () => {
    assert.deepEqual(rapikanCrop({ x: 10.4, y: 20.6, w: 300.2, h: 200.7 }, FOTO), {
      x: 10,
      y: 21,
      w: 300,
      h: 201,
    });
    assert.deepEqual(rapikanCrop({ x: 900, y: 700, w: 300, h: 300 }, FOTO), {
      x: 700,
      y: 500,
      w: 300,
      h: 300,
    });
    assert.deepEqual(rapikanCrop({ x: -50, y: -50, w: 200, h: 200 }, FOTO), {
      x: 0,
      y: 0,
      w: 200,
      h: 200,
    });
    assert.deepEqual(rapikanCrop({ x: 10, y: 10, w: 1, h: 1 }, FOTO), {
      x: 10,
      y: 10,
      w: 80,
      h: 80,
    });
  });

  it('masukkanKeFoto: crop penuh tetap penuh (tidak jadi null)', () => {
    assert.deepEqual(masukkanKeFoto(cropPenuh(FOTO), FOTO), cropPenuh(FOTO));
    assert.deepEqual(masukkanKeFoto({ x: 5.5, y: 5.5, w: 2000, h: 2000 }, FOTO), {
      x: 0,
      y: 0,
      w: 1000,
      h: 800,
    });
  });

  it('cocokkan: contain, tanpa membuat tinggi atau lebar nol', () => {
    const a = cocokkan({ w: 1000, h: 500 }, { w: 400, h: 600 });
    assert.deepEqual([a.w, a.h, a.skala], [400, 200, 0.4]);
    const b = cocokkan({ w: 500, h: 1000 }, { w: 400, h: 600 });
    assert.deepEqual([b.w, b.h, b.skala], [300, 600, 0.6]);
    assert.deepEqual(cocokkan({ w: 0, h: 0 }, { w: 400, h: 600 }), { w: 0, h: 0, skala: 0 });
    assert.deepEqual(cocokkan({ w: 100, h: 100 }, { w: 0, h: 600 }), { w: 0, h: 0, skala: 0 });
  });

  it('geserCrop: ukuran tetap, posisi ditahan di dalam foto', () => {
    const awal = { x: 100, y: 100, w: 300, h: 200 };
    assert.deepEqual(geserCrop(awal, 50, -20, FOTO), { x: 150, y: 80, w: 300, h: 200 });
    assert.deepEqual(geserCrop(awal, -999, -999, FOTO), { x: 0, y: 0, w: 300, h: 200 });
    assert.deepEqual(geserCrop(awal, 9999, 9999, FOTO), { x: 700, y: 600, w: 300, h: 200 });
  });

  it('ubahSudut nw: sudut seberang (se) tetap', () => {
    const awal = { x: 100, y: 100, w: 300, h: 200 };
    assert.deepEqual(ubahSudut(awal, 'nw', 50, 30, FOTO), { x: 150, y: 130, w: 250, h: 170 });
    assert.deepEqual(ubahSudut(awal, 'nw', -999, -999, FOTO), { x: 0, y: 0, w: 400, h: 300 });
    // ditarik melewati sudut seberang: berhenti di ukuran minimum
    assert.deepEqual(ubahSudut(awal, 'nw', 999, 999, FOTO), { x: 320, y: 220, w: 80, h: 80 });
  });

  it('ubahSudut ne, sw, se', () => {
    const awal = { x: 100, y: 100, w: 300, h: 200 };
    assert.deepEqual(ubahSudut(awal, 'ne', 50, -30, FOTO), { x: 100, y: 70, w: 350, h: 230 });
    assert.deepEqual(ubahSudut(awal, 'sw', -50, 30, FOTO), { x: 50, y: 100, w: 350, h: 230 });
    assert.deepEqual(ubahSudut(awal, 'se', 9999, 9999, FOTO), { x: 100, y: 100, w: 900, h: 700 });
    assert.deepEqual(ubahSudut(awal, 'se', -9999, -9999, FOTO), { x: 100, y: 100, w: 80, h: 80 });
  });

  it('hasil ubahSudut selalu di dalam foto dan tidak lebih kecil dari minimum', () => {
    const min = ukuranMinimum(FOTO);
    for (const sudut of ['nw', 'ne', 'sw', 'se'])
      for (const dx of [-5000, -300, -1, 0, 1, 300, 5000])
        for (const dy of [-5000, -300, -1, 0, 1, 300, 5000]) {
          const c = ubahSudut({ x: 200, y: 150, w: 400, h: 300 }, sudut, dx, dy, FOTO);
          assert.ok(
            c.x >= 0 && c.y >= 0 && c.x + c.w <= FOTO.w && c.y + c.h <= FOTO.h,
            JSON.stringify([sudut, dx, dy, c]),
          );
          assert.ok(c.w >= min.w && c.h >= min.h, JSON.stringify([sudut, dx, dy, c]));
        }
  });
});
```

### 5.3 `src/features/editor/skema.ts`

**Berkas:** `src/features/editor/skema.ts` (berkas baru: buat)

```ts
import { z } from 'zod';

import { cropSah } from './cloudinaryUrl';
import { DAFTAR_FILTER, type CropPiksel, type Efek } from './efek';

// Membaca jawaban database menjadi tipe aplikasi, dengan pengecekan bentuk. Data yang rusak tidak
// membuat aplikasi tertutup: baris efek yang tidak terbaca dianggap "belum ada efek".

const cropSchema = z.object({ x: z.number(), y: z.number(), w: z.number(), h: z.number() });

const barisEfekSchema = z.object({
  jenis_filter: z.enum(DAFTAR_FILTER),
  kecerahan: z.number().int().min(-100).max(100),
  kontras: z.number().int().min(-100).max(100),
  rotasi: z.union([z.literal(0), z.literal(90), z.literal(180), z.literal(270)]),
  data_crop: z.unknown(),
});

/**
 * Menerima isi `efek_foto` hasil embed PostgREST. Karena `halaman_id` unik, jawabannya satu objek
 * atau null; bila klien mengembalikan larik, ambil elemen pertama.
 */
export function efekDariBaris(baris: unknown): Efek | null {
  const satu: unknown = Array.isArray(baris) ? baris[0] : baris;
  if (satu === null || satu === undefined) return null;
  const hasil = barisEfekSchema.safeParse(satu);
  if (!hasil.success) return null;
  const crop = cropSchema.safeParse(hasil.data.data_crop);
  return {
    filter: hasil.data.jenis_filter,
    kecerahan: hasil.data.kecerahan,
    kontras: hasil.data.kontras,
    rotasi: hasil.data.rotasi,
    crop: crop.success && cropSah(crop.data) ? crop.data : null,
  };
}

/** Baris untuk tabel `efek_foto` (kolom yang diizinkan `grant` Fase 2). */
export function barisUntukSimpan(halamanId: string, efek: Efek) {
  const crop: CropPiksel | null = cropSah(efek.crop)
    ? {
        x: Math.round(efek.crop.x),
        y: Math.round(efek.crop.y),
        w: Math.round(efek.crop.w),
        h: Math.round(efek.crop.h),
      }
    : null;
  return {
    halaman_id: halamanId,
    jenis_filter: efek.filter,
    kecerahan: Math.round(efek.kecerahan),
    kontras: Math.round(efek.kontras),
    rotasi: efek.rotasi,
    data_crop: crop,
  };
}

export type HalamanEditor = {
  id: string;
  dokumenId: string;
  urutan: number;
  urlAsli: string;
  efek: Efek | null;
};

const halamanEditorSchema = z.object({
  id: z.string(),
  dokumen_id: z.string(),
  urutan: z.number().int(),
  url_asli: z.string(),
  efek_foto: z.unknown(),
});

export function halamanEditorDariBaris(baris: unknown): HalamanEditor | null {
  const hasil = halamanEditorSchema.safeParse(baris);
  if (!hasil.success) return null;
  const d = hasil.data;
  return {
    id: d.id,
    dokumenId: d.dokumen_id,
    urutan: d.urutan,
    urlAsli: d.url_asli,
    efek: efekDariBaris(d.efek_foto),
  };
}

export type HalamanRingkas = {
  id: string;
  urutan: number;
  urlAsli: string;
  efek: Efek | null;
};

export type DokumenPercantik = {
  id: string;
  judul: string;
  dibuatPada: string;
  halaman: HalamanRingkas[];
  /** Jumlah halaman yang belum punya baris efek. */
  belum: number;
};

const dokumenPercantikSchema = z.object({
  id: z.string(),
  judul: z.string(),
  dibuat_pada: z.string(),
  halaman_dokumen: z.array(
    z.object({
      id: z.string(),
      urutan: z.number().int(),
      url_asli: z.string(),
      efek_foto: z.unknown(),
    }),
  ),
});

/** Dokumen tanpa halaman dilewati. Urutan halaman diurutkan menaik; urutan dokumen mengikuti jawaban server. */
export function dokumenPercantikDariBaris(data: unknown): DokumenPercantik[] {
  if (!Array.isArray(data)) return [];
  const hasil: DokumenPercantik[] = [];
  for (const baris of data) {
    const cek = dokumenPercantikSchema.safeParse(baris);
    if (!cek.success || cek.data.halaman_dokumen.length === 0) continue;
    const halaman = cek.data.halaman_dokumen
      .map((h) => ({
        id: h.id,
        urutan: h.urutan,
        urlAsli: h.url_asli,
        efek: efekDariBaris(h.efek_foto),
      }))
      .sort((a, b) => a.urutan - b.urutan);
    hasil.push({
      id: cek.data.id,
      judul: cek.data.judul,
      dibuatPada: cek.data.dibuat_pada,
      halaman,
      belum: halaman.filter((h) => h.efek === null).length,
    });
  }
  return hasil;
}
```

| Bagian | Penjelasan |
|---|---|
| `efekDariBaris` | Membaca isi embed `efek_foto(...)` dari PostgREST. Karena `halaman_id` unik, jawabannya satu objek atau `null`; bila klien mengembalikan larik, elemen pertama dipakai. Baris yang bentuknya salah dianggap "belum ada efek" (aplikasi tidak tertutup). `data_crop` yang rusak menjadi "tanpa crop". |
| `barisUntukSimpan` | Hanya kolom yang di-`grant` untuk klien di Fase 2: `halaman_id`, `jenis_filter`, `kecerahan`, `kontras`, `rotasi`, `data_crop`. Crop dibulatkan ke bilangan bulat. |
| `halamanEditorDariBaris` | Satu halaman beserta efeknya, untuk editor. |
| `dokumenPercantikDariBaris` | Dokumen dengan halamannya (diurutkan menaik) dan jumlah halaman yang **belum** punya efek (`belum`), untuk tab Percantik. Dokumen tanpa halaman dilewati. |

### 5.4 `tests/skema.test.mjs`

**Berkas:** `tests/skema.test.mjs` (berkas baru: buat)

```js
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  barisUntukSimpan,
  dokumenPercantikDariBaris,
  efekDariBaris,
  halamanEditorDariBaris,
} from '../src/features/editor/skema.ts';

const BARIS = {
  jenis_filter: 'dokumen',
  kecerahan: 20,
  kontras: -10,
  rotasi: 90,
  data_crop: { x: 1, y: 2, w: 300, h: 200 },
};

describe('efekDariBaris', () => {
  it('objek, larik berisi satu objek, null, dan undefined', () => {
    const efek = {
      filter: 'dokumen',
      kecerahan: 20,
      kontras: -10,
      rotasi: 90,
      crop: { x: 1, y: 2, w: 300, h: 200 },
    };
    assert.deepEqual(efekDariBaris(BARIS), efek);
    assert.deepEqual(efekDariBaris([BARIS]), efek);
    assert.equal(efekDariBaris(null), null);
    assert.equal(efekDariBaris(undefined), null);
    assert.equal(efekDariBaris([]), null);
  });

  it('data_crop null atau tak sah menjadi crop null', () => {
    assert.equal(efekDariBaris({ ...BARIS, data_crop: null }).crop, null);
    assert.equal(efekDariBaris({ ...BARIS, data_crop: { x: 1 } }).crop, null);
    assert.equal(efekDariBaris({ ...BARIS, data_crop: { x: -1, y: 0, w: 10, h: 10 } }).crop, null);
    assert.equal(efekDariBaris({ ...BARIS, data_crop: 'x' }).crop, null);
  });

  it('baris rusak dianggap tidak ada efek', () => {
    assert.equal(efekDariBaris({ ...BARIS, jenis_filter: 'sepia' }), null);
    assert.equal(efekDariBaris({ ...BARIS, rotasi: 45 }), null);
    assert.equal(efekDariBaris({ ...BARIS, kecerahan: 101 }), null);
    assert.equal(efekDariBaris({ ...BARIS, kontras: 1.5 }), null);
    assert.equal(efekDariBaris('rusak'), null);
  });
});

describe('barisUntukSimpan', () => {
  it('hanya kolom yang diizinkan grant; crop dibulatkan', () => {
    const baris = barisUntukSimpan('h1', {
      filter: 'tajam',
      kecerahan: 5,
      kontras: 0,
      rotasi: 180,
      crop: { x: 1.4, y: 2.6, w: 100.5, h: 80.2 },
    });
    assert.deepEqual(baris, {
      halaman_id: 'h1',
      jenis_filter: 'tajam',
      kecerahan: 5,
      kontras: 0,
      rotasi: 180,
      data_crop: { x: 1, y: 3, w: 101, h: 80 },
    });
    assert.deepEqual(Object.keys(baris).sort(), [
      'data_crop',
      'halaman_id',
      'jenis_filter',
      'kecerahan',
      'kontras',
      'rotasi',
    ]);
  });
  it('crop tak sah atau null disimpan sebagai null', () => {
    assert.equal(
      barisUntukSimpan('h', { filter: 'asli', kecerahan: 0, kontras: 0, rotasi: 0, crop: null })
        .data_crop,
      null,
    );
    assert.equal(
      barisUntukSimpan('h', {
        filter: 'asli',
        kecerahan: 0,
        kontras: 0,
        rotasi: 0,
        crop: { x: 0, y: 0, w: 0, h: 5 },
      }).data_crop,
      null,
    );
  });
});

describe('halamanEditorDariBaris', () => {
  it('membaca halaman dengan dan tanpa efek', () => {
    const dasar = {
      id: 'h1',
      dokumen_id: 'd1',
      urutan: 2,
      url_asli: 'https://x/image/upload/v1/a.jpg',
    };
    assert.deepEqual(halamanEditorDariBaris({ ...dasar, efek_foto: null }), {
      id: 'h1',
      dokumenId: 'd1',
      urutan: 2,
      urlAsli: dasar.url_asli,
      efek: null,
    });
    assert.equal(halamanEditorDariBaris({ ...dasar, efek_foto: BARIS }).efek.rotasi, 90);
    assert.equal(halamanEditorDariBaris({ id: 'h1' }), null);
  });
});

describe('dokumenPercantikDariBaris', () => {
  const dok = (id, halaman) => ({
    id,
    judul: 'Judul ' + id,
    dibuat_pada: '2026-10-18T01:00:00Z',
    halaman_dokumen: halaman,
  });
  const h = (id, urutan, efek) => ({
    id,
    urutan,
    url_asli: 'https://x/image/upload/v1/' + id + '.jpg',
    efek_foto: efek,
  });

  it('menghitung halaman belum dipercantik, mengurutkan halaman, melewati dokumen kosong dan baris rusak', () => {
    const hasil = dokumenPercantikDariBaris([
      dok('d1', [h('b', 2, null), h('a', 1, BARIS), h('c', 3, [])]),
      dok('d2', []),
      { rusak: true },
      dok('d3', [h('e', 1, BARIS)]),
    ]);
    assert.deepEqual(
      hasil.map((d) => d.id),
      ['d1', 'd3'],
    );
    assert.deepEqual(
      hasil[0].halaman.map((x) => x.id),
      ['a', 'b', 'c'],
    );
    assert.equal(hasil[0].belum, 2);
    assert.equal(hasil[1].belum, 0);
  });
  it('bukan larik: kosong', () => {
    assert.deepEqual(dokumenPercantikDariBaris(null), []);
    assert.deepEqual(dokumenPercantikDariBaris({}), []);
  });
});
```

Jalankan `npm test`: sekarang **34 uji, 0 gagal**.

### 5.5 `src/features/editor/api.ts`

**Berkas:** `src/features/editor/api.ts` (berkas baru: buat)

```ts
import { supabase } from '@/lib/supabase';

import { buildCloudinaryUrl } from './cloudinaryUrl';
import type { Efek } from './efek';
import {
  barisUntukSimpan,
  dokumenPercantikDariBaris,
  halamanEditorDariBaris,
  type DokumenPercantik,
  type HalamanEditor,
} from './skema';

// Akses tabel `halaman_dokumen`, `efek_foto`, dan `dokumen` untuk editor (Fase 6). Semuanya dijaga
// RLS dan `grant` kolom dari Fase 2: pengguna hanya bisa mengubah miliknya sendiri.

export type JenisGalat = 'jaringan' | 'izin' | 'tidakada' | 'lain';

const PESAN: Record<JenisGalat, string> = {
  jaringan: 'Tidak bisa terhubung ke server. Periksa internetmu, lalu coba lagi.',
  izin: 'Akunmu tidak diizinkan mengubah halaman ini.',
  tidakada: 'Halaman tidak ditemukan. Mungkin sudah dihapus.',
  lain: 'Terjadi masalah saat memproses data. Coba lagi sebentar lagi.',
};

export class GalatEditor extends Error {
  readonly kind: JenisGalat;
  constructor(kind: JenisGalat) {
    super(PESAN[kind]);
    this.name = 'GalatEditor';
    this.kind = kind;
  }
}

type GalatPostgrest = { code?: string; message?: string };

function jenisGalat(error: GalatPostgrest): GalatEditor {
  if (error.code === '42501') return new GalatEditor('izin');
  if (!error.code && /fetch|network|failed/i.test(error.message ?? '')) {
    return new GalatEditor('jaringan');
  }
  return new GalatEditor('lain');
}

const KOLOM_EFEK = 'efek_foto(jenis_filter, kecerahan, kontras, rotasi, data_crop)';

/** Memuat satu halaman beserta efek tersimpannya (bila ada). */
export async function muatHalaman(halamanId: string): Promise<HalamanEditor> {
  const { data, error } = await supabase
    .from('halaman_dokumen')
    .select(`id, dokumen_id, urutan, url_asli, ${KOLOM_EFEK}`)
    .eq('id', halamanId)
    .maybeSingle();
  if (error) throw jenisGalat(error);
  if (!data) throw new GalatEditor('tidakada');
  const halaman = halamanEditorDariBaris(data);
  if (!halaman) throw new GalatEditor('lain');
  return halaman;
}

/** Dokumen terbaru beserta halaman dan efeknya, untuk tab Percantik. */
export async function muatDokumenPercantik(batas = 20): Promise<DokumenPercantik[]> {
  const { data, error } = await supabase
    .from('dokumen')
    .select(`id, judul, dibuat_pada, halaman_dokumen(id, urutan, url_asli, ${KOLOM_EFEK})`)
    .order('dibuat_pada', { ascending: false })
    .limit(batas);
  if (error) throw jenisGalat(error);
  return dokumenPercantikDariBaris(data);
}

/**
 * Menyimpan efek satu halaman dalam tiga langkah yang aman diulang:
 * 1. upsert `efek_foto` (satu baris per halaman),
 * 2. perbarui `halaman_dokumen.url_hasil`,
 * 3. bila semua halaman dokumen sudah punya efek, ubah status dokumen menjadi `selesai`.
 * Langkah 3 hanya pelengkap: bila gagal, efek tetap tersimpan dan status dibetulkan pada penyimpanan berikutnya.
 */
export async function simpanEfek(params: {
  halamanId: string;
  dokumenId: string;
  urlAsli: string;
  efek: Efek;
}): Promise<{ dokumenSelesai: boolean }> {
  const { halamanId, dokumenId, urlAsli, efek } = params;
  const urlHasil = buildCloudinaryUrl(urlAsli, efek);
  if (!urlHasil) throw new GalatEditor('lain');

  const simpan = await supabase
    .from('efek_foto')
    .upsert(barisUntukSimpan(halamanId, efek), { onConflict: 'halaman_id' });
  if (simpan.error) throw jenisGalat(simpan.error);

  // `.select('id')` supaya kita tahu apakah barisnya benar-benar berubah: UPDATE yang ditolak
  // RLS tidak menghasilkan galat, hanya nol baris.
  const ubah = await supabase
    .from('halaman_dokumen')
    .update({ url_hasil: urlHasil })
    .eq('id', halamanId)
    .select('id');
  if (ubah.error) throw jenisGalat(ubah.error);
  if (!ubah.data || ubah.data.length === 0) throw new GalatEditor('izin');

  return { dokumenSelesai: await perbaruiStatusDokumen(dokumenId) };
}

async function perbaruiStatusDokumen(dokumenId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('halaman_dokumen')
    .select('id, efek_foto(id)')
    .eq('dokumen_id', dokumenId);
  if (error || !data || data.length === 0) return false;

  const semuaPunyaEfek = data.every((baris) => {
    const efek = (baris as { efek_foto?: unknown }).efek_foto;
    return Array.isArray(efek) ? efek.length > 0 : efek !== null && efek !== undefined;
  });
  if (!semuaPunyaEfek) return false;

  const hasil = await supabase
    .from('dokumen')
    .update({ status: 'selesai' })
    .eq('id', dokumenId)
    .select('id');
  return !hasil.error && (hasil.data?.length ?? 0) > 0;
}
```

| Bagian | Penjelasan |
|---|---|
| `GalatEditor` | Empat jenis (`jaringan`, `izin`, `tidakada`, `lain`) dengan pesan Indonesia siap tampil. Kode `42501` (RLS menolak) menjadi `izin`. |
| `muatHalaman` | `select` satu halaman dengan embed `efek_foto(...)`. `maybeSingle` membuat halaman yang tidak ada menjadi `null` (jenis `tidakada`), bukan galat teknis. |
| `muatDokumenPercantik` | Dokumen terbaru (maksimal 20) beserta halaman dan efeknya dalam **satu** permintaan, terbaru di atas. |
| `simpanEfek`, langkah 1 | `upsert` dengan `onConflict: 'halaman_id'`: satu baris efek per halaman, aman diulang. |
| `simpanEfek`, langkah 2 | Memperbarui `halaman_dokumen.url_hasil` dengan URL beresep (tanpa pengecilan). `.select('id')` penting: `UPDATE` yang ditolak RLS **tidak** menghasilkan galat, hanya nol baris, dan nol baris diperlakukan sebagai galat `izin`. |
| `perbaruiStatusDokumen` | Langkah 3: bila setiap halaman dokumen punya efek, status dokumen menjadi `selesai` (K38). Bersifat pelengkap: kegagalannya tidak membatalkan penyimpanan. |

Catatan jujur: tiga langkah ini **bukan satu transaksi**. Bila langkah 2 gagal setelah langkah 1 berhasil, efek sudah tersimpan tetapi `url_hasil` belum berubah; menekan **Simpan** lagi memperbaikinya (semua langkah aman diulang). Transaksi atomik lewat fungsi database dicatat sebagai backlog B19.

---

## 6. Tugas 6.4 sampai 6.9: layar editor

### 6.1 `src/components/Slider.tsx` dan ekspornya

**Berkas:** `src/components/Slider.tsx` (berkas baru: buat)

```tsx
import { useEffect, useRef, useState } from 'react';
import { PanResponder, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';

import { colors, minTouchSize, radius, spacing, typography } from '@/theme';

const THUMB = 28;
const GARIS = 6;

type SliderProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  /** Nilai selalu dibulatkan ke kelipatan ini. */
  step?: number;
  onChange: (value: number) => void;
  /** Teks nilai di kanan label, misalnya "+20". */
  formatValue?: (value: number) => string;
  disabled?: boolean;
};

// Slider buatan sendiri (tanpa paket tambahan): seluruh baris setinggi 48 dp bisa disentuh atau
// digeser. Pembaca layar memakai aksi "tambah" dan "kurang" (accessibilityActions).
export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  formatValue = String,
  disabled = false,
}: SliderProps) {
  const [lebar, setLebar] = useState(0);

  // PanResponder dibuat sekali, jadi ia membaca nilai terbaru lewat ref.
  const terbaru = useRef({ lebar, min, max, step, onChange, value, disabled });
  useEffect(() => {
    terbaru.current = { lebar, min, max, step, onChange, value, disabled };
  });
  const awalX = useRef(0);

  const [pan] = useState(() => {
    const nilaiDariX = (x: number) => {
      const t = terbaru.current;
      const area = Math.max(1, t.lebar - THUMB);
      const rasio = Math.min(1, Math.max(0, (x - THUMB / 2) / area));
      const langkah = Math.round((t.min + rasio * (t.max - t.min)) / t.step) * t.step;
      return Math.min(t.max, Math.max(t.min, langkah));
    };
    const ubah = (nilai: number) => {
      const t = terbaru.current;
      if (nilai === t.value) return;
      t.value = nilai;
      t.onChange(nilai);
    };
    return PanResponder.create({
      onStartShouldSetPanResponder: () => !terbaru.current.disabled,
      onMoveShouldSetPanResponder: () => !terbaru.current.disabled,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (event) => {
        awalX.current = event.nativeEvent.locationX;
        ubah(nilaiDariX(awalX.current));
      },
      onPanResponderMove: (_, gesture) => ubah(nilaiDariX(awalX.current + gesture.dx)),
    });
  });

  const rasio = max === min ? 0 : (value - min) / (max - min);
  const posisi = rasio * Math.max(0, lebar - THUMB);
  const geser = (arah: 1 | -1) =>
    onChange(Math.min(max, Math.max(min, Math.round((value + arah * step) / step) * step)));

  return (
    <View style={styles.wrapper}>
      <View style={styles.baris}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.nilai}>{formatValue(value)}</Text>
      </View>
      <View
        {...pan.panHandlers}
        onLayout={(event: LayoutChangeEvent) => setLebar(event.nativeEvent.layout.width)}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={label}
        accessibilityValue={{ min, max, now: value, text: formatValue(value) }}
        // Padanan aria-* untuk web (react-native-web tidak memetakan accessibilityValue).
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={formatValue(value)}
        accessibilityState={{ disabled }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(event) => {
          if (disabled) return;
          if (event.nativeEvent.actionName === 'increment') geser(1);
          if (event.nativeEvent.actionName === 'decrement') geser(-1);
        }}
        style={[styles.area, disabled && styles.disabled]}
      >
        <View style={styles.garis} />
        <View style={[styles.isi, { width: posisi }]} />
        <View style={[styles.thumb, { left: posisi }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing.xs },
  baris: { flexDirection: 'row', justifyContent: 'space-between' },
  label: { ...typography.bodyStrong, color: colors.text },
  nilai: { ...typography.bodyStrong, color: colors.text },
  area: { height: minTouchSize, justifyContent: 'center' },
  // Anak-anak tidak menerima sentuhan supaya `locationX` selalu relatif terhadap area ini.
  garis: {
    position: 'absolute',
    left: THUMB / 2,
    right: THUMB / 2,
    height: GARIS,
    borderRadius: radius.pill,
    backgroundColor: colors.inputBorder,
    pointerEvents: 'none',
  },
  isi: {
    position: 'absolute',
    left: THUMB / 2,
    height: GARIS,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    pointerEvents: 'none',
  },
  thumb: {
    position: 'absolute',
    width: THUMB,
    height: THUMB,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    borderWidth: 3,
    borderColor: colors.surface,
    pointerEvents: 'none',
  },
  disabled: { opacity: 0.4 },
});
```

Berkas `src/components/index.ts` hanya mendapat satu baris ekspor baru (`export { Slider } from './Slider';`); ganti seluruh isinya dengan berikut.

**Berkas:** `src/components/index.ts` (berkas lama: ganti seluruh isinya)

```ts
export { Banner } from './Banner';
export { Button } from './Button';
export { Card } from './Card';
export { EmptyState } from './EmptyState';
export { IconButton } from './IconButton';
export { LoadingScreen } from './LoadingScreen';
export { PlaceholderScreen } from './PlaceholderScreen';
export { Screen } from './Screen';
export { ScreenHeader } from './ScreenHeader';
export { Slider } from './Slider';
export { TextField } from './TextField';
```

| Bagian | Penjelasan |
|---|---|
| `PanResponder` dibuat sekali | `PanResponder.create` dipanggil sekali (di `useState`), sehingga nilai terbaru (`lebar`, `min`, `max`, `onChange`, ...) dibaca lewat `ref`. Tanpa ini, gestur memakai nilai usang. |
| `onPanResponderGrant` | Menyentuh bagian mana pun dari baris langsung melompatkan nilai ke posisi itu (memakai `locationX`), dan `Move` mengikuti `dx`. Nilai dibulatkan ke `step` dan dijepit ke `min` dan `max`. |
| `onPanResponderTerminationRequest: false` | Slider tidak melepaskan gestur ke induk, jadi layar tidak ikut tergulir saat menggeser. |
| Anak `pointerEvents: 'none'` | Supaya `locationX` selalu relatif terhadap baris slider, bukan terhadap garis atau tombolnya. |
| `accessibilityRole="adjustable"`, `accessibilityActions` | Pembaca layar mengumumkan nilai dan menyediakan aksi **tambah** dan **kurang** (satu langkah). Padanan `aria-*` ditambahkan agar web juga membaca nilainya. |
| Tinggi baris 48 dp | Sesuai ukuran sentuh minimum proyek (`minTouchSize`). |

### 6.2 `src/features/editor/useDebouncedValue.ts`

**Berkas:** `src/features/editor/useDebouncedValue.ts` (berkas baru: buat)

```ts
import { useEffect, useState } from 'react';

/** Mengikuti `value` dengan jeda: nilai baru baru dipakai bila tidak berubah lagi selama `ms`. */
export function useDebouncedValue<T>(value: T, ms: number): T {
  const [tunda, setTunda] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setTunda(value), ms);
    return () => clearTimeout(timer);
  }, [value, ms]);
  return tunda;
}
```

Hook ini mengikuti nilai dengan jeda: nilai baru baru dipakai bila tidak berubah lagi selama `ms`. Dipakai untuk URL pratinjau (300 ms) agar geseran slider yang puluhan kali per detik tidak memicu puluhan permintaan gambar.

### 6.3 `src/features/editor/CropOverlay.tsx` (tugas 6.4)

**Berkas:** `src/features/editor/CropOverlay.tsx` (berkas baru: buat)

```tsx
import { useEffect, useRef, useState } from 'react';
import { PanResponder, StyleSheet, View, type GestureResponderHandlers } from 'react-native';

import { colors, minTouchSize, radius } from '@/theme';

import { geserCrop, masukkanKeFoto, ubahSudut, type Sudut, type Ukuran } from './crop';
import type { CropPiksel } from './efek';

type CropOverlayProps = {
  /** Ukuran foto asli dalam piksel. */
  foto: Ukuran;
  /** Ukuran foto di layar (dp) dan skalanya (dp per piksel foto). */
  tampil: { w: number; h: number; skala: number };
  /** Area crop saat ini, dalam piksel foto. */
  crop: CropPiksel;
  onChange: (crop: CropPiksel) => void;
};

type Sasaran = Sudut | 'badan';

const SUDUT: Sudut[] = ['nw', 'ne', 'sw', 'se'];
const LABEL: Record<Sasaran, string> = {
  badan: 'Geser area crop',
  nw: 'Tarik sudut kiri atas',
  ne: 'Tarik sudut kanan atas',
  sw: 'Tarik sudut kiri bawah',
  se: 'Tarik sudut kanan bawah',
};

const TEPI = minTouchSize / 2;

// Overlay crop 4 sudut (tugas 6.4). Memakai PanResponder bawaan React Native, bukan Gesture
// Handler + Reanimated seperti rencana awal (lihat ROADMAP, keputusan K31): lebih sederhana,
// tanpa konfigurasi worklet, dan hasilnya cukup untuk empat titik tarik.
export function CropOverlay({ foto, tampil, crop, onChange }: CropOverlayProps) {
  // PanResponder dibuat sekali, jadi nilai terbaru dibaca lewat ref.
  const terbaru = useRef({ foto, skala: tampil.skala, crop, onChange });
  useEffect(() => {
    terbaru.current = { foto, skala: tampil.skala, crop, onChange };
  });
  const awal = useRef<CropPiksel>(crop);

  const bikin = (sasaran: Sasaran): GestureResponderHandlers => {
    const responder = PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        awal.current = terbaru.current.crop;
      },
      onPanResponderMove: (_, gesture) => {
        const { foto: f, skala, onChange: ubah } = terbaru.current;
        if (skala <= 0) return;
        const dx = gesture.dx / skala;
        const dy = gesture.dy / skala;
        const hasil =
          sasaran === 'badan'
            ? geserCrop(awal.current, dx, dy, f)
            : ubahSudut(awal.current, sasaran, dx, dy, f);
        ubah(masukkanKeFoto(hasil, f));
      },
    });
    return responder.panHandlers;
  };
  const [handlers] = useState<Record<Sasaran, GestureResponderHandlers>>(() => ({
    badan: bikin('badan'),
    nw: bikin('nw'),
    ne: bikin('ne'),
    sw: bikin('sw'),
    se: bikin('se'),
  }));

  const s = tampil.skala;
  const kiri = crop.x * s;
  const atas = crop.y * s;
  const lebar = crop.w * s;
  const tinggi = crop.h * s;
  const kanan = kiri + lebar;
  const bawah = atas + tinggi;

  const posisiSudut: Record<Sudut, { left: number; top: number }> = {
    nw: { left: kiri, top: atas },
    ne: { left: kanan, top: atas },
    sw: { left: kiri, top: bawah },
    se: { left: kanan, top: bawah },
  };

  // Root lebih besar setengah area sentuh (TEPI) di tiap sisi dibanding foto. Titik tarik (48 dp)
  // berpusat di sudut foto, jadi separuhnya berada di luar foto; sentuhan di luar batas induk
  // tidak diterima, sehingga root harus cukup besar untuk memuat seluruh area sentuh itu.
  return (
    <View
      style={[styles.root, { width: tampil.w + minTouchSize, height: tampil.h + minTouchSize }]}
    >
      <View style={[styles.foto, { left: TEPI, top: TEPI, width: tampil.w, height: tampil.h }]}>
        {/* Empat panel gelap di luar area crop. */}
        <View style={[styles.gelap, { left: 0, top: 0, width: tampil.w, height: atas }]} />
        <View
          style={[styles.gelap, { left: 0, top: bawah, width: tampil.w, height: tampil.h - bawah }]}
        />
        <View style={[styles.gelap, { left: 0, top: atas, width: kiri, height: tinggi }]} />
        <View
          style={[
            styles.gelap,
            { left: kanan, top: atas, width: tampil.w - kanan, height: tinggi },
          ]}
        />

        {/* Bingkai dan badan yang bisa digeser. */}
        <View
          {...handlers.badan}
          accessibilityLabel={LABEL.badan}
          testID="crop-badan"
          style={[styles.bingkai, { left: kiri, top: atas, width: lebar, height: tinggi }]}
        />
      </View>

      {SUDUT.map((sudut) => (
        <View
          key={sudut}
          {...handlers[sudut]}
          accessibilityLabel={LABEL[sudut]}
          testID={`crop-${sudut}`}
          style={[
            styles.area,
            {
              // Pusat titik tarik = sudut crop; TEPI mengimbangi geser root dan setengah area sentuh.
              left: posisiSudut[sudut].left,
              top: posisiSudut[sudut].top,
            },
          ]}
        >
          <View style={styles.titik} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { position: 'absolute', left: 0, top: 0 },
  foto: { position: 'absolute' },
  gelap: {
    position: 'absolute',
    backgroundColor: colors.scrim,
    opacity: 0.55,
    pointerEvents: 'none',
  },
  bingkai: { position: 'absolute', borderWidth: 2, borderColor: colors.onScrim },
  area: {
    position: 'absolute',
    width: minTouchSize,
    height: minTouchSize,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titik: {
    width: 22,
    height: 22,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    borderWidth: 3,
    borderColor: colors.onScrim,
    pointerEvents: 'none',
  },
});
```

| Bagian | Penjelasan |
|---|---|
| Lima responder | Empat sudut (`nw`, `ne`, `sw`, `se`) dan badan (`badan`: menggeser seluruh area). Semuanya `PanResponder` bawaan (K31). |
| `awal` | Area crop pada saat gestur **dimulai** (`onPanResponderGrant`). Selama gestur, hasil dihitung dari `awal` + `dx`/`dy`, bukan dari nilai terakhir. |
| `dx / skala` | Gerakan jari (dalam dp layar) dibagi skala tampil menjadi piksel foto asli (`crop.ts`). |
| Empat panel gelap | Menutupi bagian di luar crop dengan `colors.scrim` (`pointerEvents: 'none'` agar tidak menghalangi sentuhan). |
| `TEPI` dan root yang lebih besar | Titik tarik 48 dp berpusat di sudut foto, jadi **separuhnya di luar foto**. Di Android sentuhan di luar batas induk tidak diterima, sehingga root overlay dibuat lebih besar setengah area sentuh (`TEPI`) di tiap sisi. Saat uji saya menemukan titik tarik di sudut yang nempel tepi tidak bisa ditarik; inilah perbaikannya (area foto di editor diinset dengan jarak yang sama). |
| `testID` | `crop-nw`, `crop-ne`, `crop-sw`, `crop-se`, `crop-badan`: dipakai uji otomatis saya. |

### 6.4 `src/features/editor/EditorFoto.tsx` (tugas 6.4 sampai 6.9)

Berkas terbesar fase ini. Penjelasan per tugas ada di tabel setelah kodenya.

**Berkas:** `src/features/editor/EditorFoto.tsx` (berkas baru: buat)

```tsx
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState, type ComponentProps } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native';

import { Banner, Button, Screen, Slider } from '@/components';
import { colors, minTouchSize, radius, spacing, typography } from '@/theme';

import { GalatEditor, simpanEfek } from './api';
import { buildCloudinaryUrl } from './cloudinaryUrl';
import { cocokkan, cropPenuh, rapikanCrop, type Ukuran } from './crop';
import { CropOverlay } from './CropOverlay';
import {
  DAFTAR_FILTER,
  EFEK_BAWAAN,
  LABEL_FILTER,
  adalahBawaan,
  bulatkanSlider,
  putar90,
  type Efek,
} from './efek';
import type { HalamanEditor } from './skema';
import { useDebouncedValue } from './useDebouncedValue';

type Mode = 'crop' | 'filter' | 'sesuaikan';

const MODE: { id: Mode; label: string }[] = [
  { id: 'crop', label: 'Crop' },
  { id: 'filter', label: 'Filter' },
  { id: 'sesuaikan', label: 'Sesuaikan' },
];

/** Sisi terpanjang preview (piksel). Foto penuh paling besar 2000 px; preview lebih ringan dan hemat kuota. */
const SISI_PREVIEW = 1200;
const JEDA_PREVIEW_MS = 300;

/** Jarak foto ke tepi panggung: setengah area sentuh minimum. */
const INSET_FOTO = minTouchSize / 2;

const tandaNilai = (nilai: number) => (nilai > 0 ? `+${nilai}` : String(nilai));

export function EditorFoto({ halaman }: { halaman: HalamanEditor }) {
  const router = useRouter();

  const [efek, setEfek] = useState<Efek>(halaman.efek ?? EFEK_BAWAAN);
  const [mode, setMode] = useState<Mode>('filter');
  const [bandingkan, setBandingkan] = useState(false);
  const [kotak, setKotak] = useState<Ukuran>({ w: 0, h: 0 });
  const [fotoAsli, setFotoAsli] = useState<Ukuran | null>(null);
  const [urlTampil, setUrlTampil] = useState<string | null>(null);
  const [urlGalat, setUrlGalat] = useState<string | null>(null);
  const [percobaan, setPercobaan] = useState(0);
  const [menyimpan, setMenyimpan] = useState(false);
  const [galatSimpan, setGalatSimpan] = useState<string | null>(null);

  const bawaan = adalahBawaan(efek);

  // Preview: foto asli yang sudah dikenai efek oleh Cloudinary, diperkecil. Tanpa efek, kita
  // langsung memakai foto asli (tidak memakai kredit transformasi).
  const urlPreview = useMemo(
    () => (bawaan ? null : buildCloudinaryUrl(halaman.urlAsli, efek, { sisiMaks: SISI_PREVIEW })),
    [bawaan, halaman.urlAsli, efek],
  );
  // Slider dan crop bisa berubah puluhan kali per detik; tiap URL berbeda memakai kredit,
  // jadi hanya URL yang bertahan 300 ms yang diminta (tugas 6.7).
  const urlTunda = useDebouncedValue(urlPreview, JEDA_PREVIEW_MS);

  useEffect(() => {
    if (!urlTunda) {
      setUrlTampil(null);
      return;
    }
    let batal = false;
    // Muat dulu ke cache; preview lama tetap tampil sampai yang baru siap (tanpa berkedip).
    Image.prefetch(urlTunda)
      .then((berhasil) => {
        if (batal) return;
        if (berhasil) setUrlTampil(urlTunda);
        else setUrlGalat(urlTunda);
      })
      .catch(() => {
        if (!batal) setUrlGalat(urlTunda);
      });
    return () => {
      batal = true;
    };
  }, [urlTunda, percobaan]);

  const previewGalat = urlPreview !== null && urlGalat === urlTunda && urlTunda === urlPreview;
  const memuatPreview = urlPreview !== null && urlPreview !== urlTampil && !previewGalat;
  const urlTidakSah = !bawaan && urlPreview === null;

  const tampilkanAsli = mode === 'crop' || bandingkan || bawaan;
  const fit = fotoAsli ? cocokkan(fotoAsli, kotak) : null;

  function ubah(patch: Partial<Efek>) {
    setEfek((sebelum) => ({ ...sebelum, ...patch }));
    setBandingkan(false);
    setGalatSimpan(null);
  }

  async function simpan() {
    if (menyimpan) return;
    setMenyimpan(true);
    setGalatSimpan(null);
    try {
      const final: Efek = {
        ...efek,
        crop: fotoAsli ? rapikanCrop(efek.crop, fotoAsli) : efek.crop,
      };
      await simpanEfek({
        halamanId: halaman.id,
        dokumenId: halaman.dokumenId,
        urlAsli: halaman.urlAsli,
        efek: final,
      });
      if (router.canGoBack()) router.back();
      else router.replace('/percantik');
    } catch (galat) {
      setGalatSimpan(galat instanceof GalatEditor ? galat.message : 'Efek belum bisa disimpan.');
      setMenyimpan(false);
    }
  }

  return (
    <Screen edges={['bottom']} contentStyle={styles.layar}>
      <View style={styles.panggung}>
        {/* Foto memakai area yang diinset setengah area sentuh, agar titik tarik crop di tepi foto
            tetap berada di dalam panggung dan bisa disentuh penuh (48 dp). */}
        <View
          style={styles.areaFoto}
          onLayout={(event: LayoutChangeEvent) => {
            const { width, height } = event.nativeEvent.layout;
            setKotak({ w: width, h: height });
          }}
        >
          <Image
            source={{ uri: halaman.urlAsli }}
            style={StyleSheet.absoluteFill}
            contentFit="contain"
            accessibilityLabel={`Foto asli halaman ${halaman.urutan}`}
            onLoad={(event) => setFotoAsli({ w: event.source.width, h: event.source.height })}
          />
          {!tampilkanAsli && urlTampil ? (
            <Image
              source={{ uri: urlTampil }}
              style={StyleSheet.absoluteFill}
              contentFit="contain"
              accessibilityLabel={`Pratinjau halaman ${halaman.urutan}`}
            />
          ) : null}
        </View>

        {mode === 'crop' && fotoAsli && fit && fit.skala > 0 ? (
          <View
            style={[
              styles.penempatCrop,
              {
                // Root overlay lebih besar setengah area sentuh di tiap sisi (lihat CropOverlay).
                left: INSET_FOTO + (kotak.w - fit.w) / 2 - minTouchSize / 2,
                top: INSET_FOTO + (kotak.h - fit.h) / 2 - minTouchSize / 2,
                width: fit.w + minTouchSize,
                height: fit.h + minTouchSize,
              },
            ]}
          >
            <CropOverlay
              foto={fotoAsli}
              tampil={fit}
              crop={efek.crop ?? cropPenuh(fotoAsli)}
              onChange={(crop) => ubah({ crop: rapikanCrop(crop, fotoAsli) })}
            />
          </View>
        ) : null}

        {memuatPreview && !tampilkanAsli ? (
          <View style={styles.lencana} accessibilityLiveRegion="polite">
            <ActivityIndicator color={colors.onScrim} />
            <Text style={styles.lencanaTeks}>Memuat pratinjau...</Text>
          </View>
        ) : null}
        {bandingkan ? (
          <View style={styles.lencana}>
            <Text style={styles.lencanaTeks}>Foto asli</Text>
          </View>
        ) : null}
      </View>

      {previewGalat || urlTidakSah ? (
        <View style={styles.galatBlok}>
          <Banner
            message={
              urlTidakSah
                ? 'Alamat foto tidak dikenali, jadi pratinjau tidak bisa dibuat.'
                : 'Pratinjau belum bisa dimuat. Periksa internetmu, lalu coba lagi.'
            }
          />
          {previewGalat ? (
            <Button
              title="Muat ulang pratinjau"
              variant="secondary"
              onPress={() => {
                setUrlGalat(null);
                setPercobaan((n) => n + 1);
              }}
            />
          ) : null}
        </View>
      ) : null}
      {galatSimpan ? <Banner message={galatSimpan} /> : null}

      <View style={styles.tab} accessibilityRole="tablist">
        {MODE.map((m) => {
          const aktif = mode === m.id;
          return (
            <Pressable
              key={m.id}
              accessibilityRole="tab"
              accessibilityState={{ selected: aktif }}
              accessibilityLabel={m.label}
              onPress={() => setMode(m.id)}
              style={[styles.tabItem, aktif && styles.tabItemAktif]}
            >
              <Text style={[styles.tabTeks, aktif && styles.tabTeksAktif]}>{m.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.panel}>
        {mode === 'crop' ? (
          <View style={styles.panelIsi}>
            <Text style={styles.petunjuk}>
              {!fotoAsli
                ? 'Memuat foto...'
                : efek.crop
                  ? `Area crop: ${efek.crop.w} × ${efek.crop.h} px. Seret sudut atau geser areanya.`
                  : 'Seret sudut untuk memilih area. Tanpa crop, seluruh foto dipakai.'}
            </Text>
            <Text style={styles.petunjukRedup}>
              Crop dikerjakan pada foto asli, sebelum diputar.
            </Text>
            <Button
              title="Hapus crop"
              variant="secondary"
              disabled={!efek.crop}
              onPress={() => ubah({ crop: null })}
            />
          </View>
        ) : null}

        {mode === 'filter' ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.chipGulir}
            contentContainerStyle={styles.chipBaris}
          >
            {DAFTAR_FILTER.map((f) => {
              const aktif = efek.filter === f;
              return (
                <Pressable
                  key={f}
                  accessibilityRole="button"
                  accessibilityLabel={`Filter ${LABEL_FILTER[f]}`}
                  accessibilityState={{ selected: aktif }}
                  onPress={() => ubah({ filter: f })}
                  style={[styles.chip, aktif && styles.chipAktif]}
                >
                  <Text style={[styles.chipTeks, aktif && styles.chipTeksAktif]}>
                    {LABEL_FILTER[f]}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        ) : null}

        {mode === 'sesuaikan' ? (
          <View style={styles.panelIsi}>
            <Slider
              label="Kecerahan"
              value={efek.kecerahan}
              min={-100}
              max={100}
              step={5}
              formatValue={tandaNilai}
              onChange={(nilai) => ubah({ kecerahan: bulatkanSlider(nilai) })}
            />
            <Slider
              label="Kontras"
              value={efek.kontras}
              min={-100}
              max={100}
              step={5}
              formatValue={tandaNilai}
              onChange={(nilai) => ubah({ kontras: bulatkanSlider(nilai) })}
            />
          </View>
        ) : null}
      </View>

      <View style={styles.aksi}>
        <Aksi
          ikon="sync-outline"
          label="Putar 90°"
          keterangan={efek.rotasi === 0 ? undefined : `${efek.rotasi}°`}
          onPress={() => ubah({ rotasi: putar90(efek.rotasi) })}
        />
        <Aksi
          ikon="swap-horizontal-outline"
          label="Bandingkan"
          terpilih={bandingkan}
          disabled={bawaan}
          onPress={() => setBandingkan((nilai) => !nilai)}
        />
        <Aksi
          ikon="arrow-undo-outline"
          label="Reset"
          disabled={bawaan}
          onPress={() => ubah({ ...EFEK_BAWAAN })}
        />
      </View>

      <Button
        title={bawaan ? 'Simpan tanpa efek' : 'Simpan'}
        fullWidth
        loading={menyimpan}
        onPress={() => void simpan()}
      />
    </Screen>
  );
}

type AksiProps = {
  ikon: ComponentProps<typeof Ionicons>['name'];
  label: string;
  keterangan?: string;
  terpilih?: boolean;
  disabled?: boolean;
  onPress: () => void;
};

function Aksi({ ikon, label, keterangan, terpilih = false, disabled = false, onPress }: AksiProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={keterangan ? `${label} (${keterangan})` : label}
      accessibilityState={{ disabled, selected: terpilih }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.aksiTombol,
        terpilih && styles.aksiTerpilih,
        disabled && styles.aksiNonaktif,
        pressed && styles.aksiDitekan,
      ]}
    >
      <Ionicons name={ikon} size={22} color={colors.primary} />
      <Text style={styles.aksiTeks}>{keterangan ? `${label} (${keterangan})` : label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  layar: { gap: spacing.md },
  panggung: {
    flex: 1,
    minHeight: 200,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    overflow: 'hidden',
  },
  areaFoto: {
    position: 'absolute',
    top: INSET_FOTO,
    left: INSET_FOTO,
    right: INSET_FOTO,
    bottom: INSET_FOTO,
  },
  penempatCrop: { position: 'absolute' },
  lencana: {
    position: 'absolute',
    top: spacing.sm,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.scrim,
  },
  lencanaTeks: { ...typography.caption, color: colors.onScrim },
  galatBlok: { gap: spacing.sm },
  tab: { flexDirection: 'row', gap: spacing.xs },
  tabItem: {
    flex: 1,
    minHeight: minTouchSize,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
  },
  tabItemAktif: { backgroundColor: colors.primary },
  tabTeks: { ...typography.bodyStrong, color: colors.primary },
  tabTeksAktif: { color: colors.onPrimary },
  panel: { minHeight: 120, justifyContent: 'center' },
  panelIsi: { gap: spacing.sm },
  petunjuk: { ...typography.body, color: colors.text },
  petunjukRedup: { ...typography.caption, color: colors.textMuted },
  // flexGrow 0: tanpa ini ScrollView mengisi tinggi panel dan chip ikut memanjang ke bawah.
  chipGulir: { flexGrow: 0 },
  chipBaris: { gap: spacing.sm, paddingVertical: spacing.xs, alignItems: 'center' },
  chip: {
    minHeight: minTouchSize,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
  },
  chipAktif: { backgroundColor: colors.primary },
  chipTeks: { ...typography.bodyStrong, color: colors.primary },
  chipTeksAktif: { color: colors.onPrimary },
  aksi: { flexDirection: 'row', gap: spacing.sm },
  aksiTombol: {
    flex: 1,
    minHeight: minTouchSize,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    backgroundColor: colors.surface,
  },
  aksiTerpilih: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
    borderWidth: 2,
  },
  aksiNonaktif: { opacity: 0.4 },
  aksiDitekan: { opacity: 0.85 },
  aksiTeks: { ...typography.caption, color: colors.text, flexShrink: 1, textAlign: 'center' },
});
```

| Tugas | Bagian | Penjelasan |
|---|---|---|
| 6.3 | `efek` awal | `halaman.efek ?? EFEK_BAWAAN`: efek yang sudah tersimpan dimuat ulang saat editor dibuka. |
| 6.4 | Tab **Crop**, `CropOverlay`, `rapikanCrop` | Saat mode Crop, foto **asli** (tanpa pratinjau) tampil dan overlay muncul di atasnya (K37). Ukuran foto asli diambil dari `onLoad`. Teks "Area crop: W × H px" memberi tahu ukuran nyata. **Hapus crop** mengembalikan penuh. Sebelum menyimpan, `rapikanCrop` membuang crop yang menutupi seluruh foto. |
| 6.5 | Aksi **Putar 90°** | `putar90`; label tombol memuat derajat saat ini (misalnya "Putar 90° (180°)") supaya pembaca layar tahu keadaannya. |
| 6.6 | Tab **Filter** | Lima chip dari `DAFTAR_FILTER`; chip aktif ditandai warna **dan** `accessibilityState.selected`. `chipGulir: { flexGrow: 0 }` mencegah chip memanjang ke bawah (cacat yang saya temukan lewat tangkapan layar). |
| 6.7 | Tab **Sesuaikan**, `urlPreview`, `useDebouncedValue`, `Image.prefetch` | Dua `Slider` berlangkah 5. URL pratinjau dihitung dari efek, **ditunda 300 ms**, dimuat ke cache dengan `Image.prefetch`, dan baru dipasang bila selesai; pratinjau lama tetap tampil sampai yang baru siap (tanpa berkedip). Lencana "Memuat pratinjau..." tampil selama menunggu. Efek bawaan **tidak** membuat URL transformasi. |
| 6.7 | `previewGalat`, **Muat ulang pratinjau** | Bila gambar gagal dimuat, banner dan tombol muncul; tombol menaikkan `percobaan` sehingga `useEffect` memuat ulang. |
| 6.8 | **Bandingkan**, **Reset** | Bandingkan menyembunyikan pratinjau dan menampilkan foto asli dengan lencana "Foto asli"; mengubah efek apa pun mematikannya otomatis. Reset mengembalikan `EFEK_BAWAAN`. Keduanya nonaktif saat efek masih bawaan. |
| 6.9 | Tombol **Simpan** / **Simpan tanpa efek**, `simpan` | Memanggil `simpanEfek` (bagian 5.5), lalu `router.back()` (atau ke `/percantik` bila tidak ada halaman sebelumnya). Gagal: banner dengan pesan Indonesia dan tombol tetap bisa ditekan ulang; ketukan ganda diabaikan (`menyimpan`). |
| semua | `areaFoto` dengan inset `INSET_FOTO` | Foto ditampilkan di area yang diinset setengah ukuran sentuh, agar titik tarik di tepi foto tidak terpotong (lihat 6.3 di atas). |

---

## 7. Tugas 6.10: tab Percantik dan merakit layar

Berkas-berkas bagian ini saling bergantung. Satu hal perlu diketahui: setelah **7.4** menyimpan `DaftarHalaman.tsx` (yang kini meminta properti `onPercantik`), `npm run typecheck` melaporkan **satu galat** di `app/(tabs)/kamera.tsx`. Itu wajar: `kamera.tsx` baru diganti di langkah yang sama. Sebelum itu, hasil putar ulang saya menunjukkan **0 galat** setelah tiap berkas; jangan jalankan `typecheck` di tengah 7.4.

### 7.1 `src/features/editor/DaftarPercantik.tsx`

**Berkas:** `src/features/editor/DaftarPercantik.tsx` (berkas baru: buat)

```tsx
import { Image } from 'expo-image';
import { useRouter, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  Banner,
  Button,
  Card,
  EmptyState,
  LoadingScreen,
  Screen,
  ScreenHeader,
} from '@/components';
import { colors, radius, spacing, typography } from '@/theme';

import { GalatEditor, muatDokumenPercantik } from './api';
import { buildCloudinaryUrl } from './cloudinaryUrl';
import { EFEK_BAWAAN } from './efek';
import type { DokumenPercantik, HalamanRingkas } from './skema';

const SISI_GAMBAR_MINI = 240;

type Keadaan =
  | { status: 'memuat' }
  | { status: 'siap'; dokumen: DokumenPercantik[] }
  | { status: 'galat'; pesan: string };

// Tab Percantik (tugas 6.10): dokumen terbaru dengan halamannya. Halaman yang belum punya efek
// ditandai "Belum"; mengetuk halaman mana pun membuka editor (yang sudah dipercantik dimuat ulang).
export function DaftarPercantik() {
  const router = useRouter();
  const [keadaan, setKeadaan] = useState<Keadaan>({ status: 'memuat' });

  const muat = useCallback(async () => {
    try {
      const dokumen = await muatDokumenPercantik();
      setKeadaan({ status: 'siap', dokumen });
    } catch (galat) {
      setKeadaan({
        status: 'galat',
        pesan: galat instanceof GalatEditor ? galat.message : 'Daftar belum bisa dimuat.',
      });
    }
  }, []);

  // Dimuat ulang tiap tab ini dibuka lagi, supaya hasil simpan dari editor langsung terlihat.
  useFocusEffect(
    useCallback(() => {
      void muat();
    }, [muat]),
  );

  const bukaEditor = (halamanId: string) =>
    router.push({ pathname: '/editor/[halamanId]', params: { halamanId } });

  if (keadaan.status === 'memuat') {
    return <LoadingScreen message="Memuat dokumen..." />;
  }

  const perlu = keadaan.status === 'siap' ? keadaan.dokumen.filter((d) => d.belum > 0) : [];
  const selesai = keadaan.status === 'siap' ? keadaan.dokumen.filter((d) => d.belum === 0) : [];

  return (
    <Screen scroll>
      <ScreenHeader title="Percantik" subtitle="Crop, putar, dan beri efek pada halaman scan." />

      {keadaan.status === 'galat' ? (
        <>
          <Banner message={keadaan.pesan} />
          <Button
            title="Coba lagi"
            fullWidth
            onPress={() => {
              setKeadaan({ status: 'memuat' });
              void muat();
            }}
          />
        </>
      ) : null}

      {keadaan.status === 'siap' && keadaan.dokumen.length === 0 ? (
        <EmptyState
          icon="images-outline"
          title="Belum ada halaman"
          description="Scan dan simpan dokumen dulu, lalu halamannya muncul di sini untuk dipercantik."
          actionLabel="Mulai scan"
          onAction={() => router.push('/kamera')}
        />
      ) : null}

      {perlu.length > 0 ? <Text style={styles.bagian}>Perlu dipercantik</Text> : null}
      {perlu.map((dokumen) => (
        <KartuDokumen key={dokumen.id} dokumen={dokumen} onBuka={bukaEditor} />
      ))}

      {selesai.length > 0 ? <Text style={styles.bagian}>Sudah dipercantik</Text> : null}
      {selesai.map((dokumen) => (
        <KartuDokumen key={dokumen.id} dokumen={dokumen} onBuka={bukaEditor} />
      ))}
    </Screen>
  );
}

function KartuDokumen({
  dokumen,
  onBuka,
}: {
  dokumen: DokumenPercantik;
  onBuka: (halamanId: string) => void;
}) {
  return (
    <Card>
      <Text style={styles.judul}>{dokumen.judul}</Text>
      <Text style={styles.ringkas}>
        {dokumen.belum === 0
          ? `Semua ${dokumen.halaman.length} halaman sudah dipercantik`
          : `${dokumen.belum} dari ${dokumen.halaman.length} halaman belum dipercantik`}
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.baris}
      >
        {dokumen.halaman.map((halaman) => (
          <KartuHalaman
            key={halaman.id}
            halaman={halaman}
            judul={dokumen.judul}
            onPress={() => onBuka(halaman.id)}
          />
        ))}
      </ScrollView>
    </Card>
  );
}

function KartuHalaman({
  halaman,
  judul,
  onPress,
}: {
  halaman: HalamanRingkas;
  judul: string;
  onPress: () => void;
}) {
  const sudah = halaman.efek !== null;
  // Gambar mini mengikuti efek tersimpan; bila alamatnya tak dikenali, pakai foto asli apa adanya.
  const uri =
    buildCloudinaryUrl(halaman.urlAsli, halaman.efek ?? EFEK_BAWAAN, {
      sisiMaks: SISI_GAMBAR_MINI,
    }) ?? halaman.urlAsli;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Halaman ${halaman.urutan} dari ${judul}, ${sudah ? 'sudah' : 'belum'} dipercantik`}
      onPress={onPress}
      style={({ pressed }) => [styles.halaman, pressed && styles.ditekan]}
    >
      <Image source={{ uri }} style={styles.gambarMini} contentFit="cover" />
      <Text style={styles.nomor}>Halaman {halaman.urutan}</Text>
      <View style={[styles.lencana, sudah ? styles.lencanaSudah : styles.lencanaBelum]}>
        <Text
          style={[styles.lencanaTeks, sudah ? styles.lencanaTeksSudah : styles.lencanaTeksBelum]}
        >
          {sudah ? 'Selesai' : 'Belum'}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bagian: { ...typography.heading, color: colors.text },
  judul: { ...typography.bodyStrong, color: colors.text },
  ringkas: { ...typography.caption, color: colors.textMuted },
  baris: { gap: spacing.md, paddingVertical: spacing.sm },
  halaman: { width: 96, gap: spacing.xs, alignItems: 'flex-start' },
  ditekan: { opacity: 0.85 },
  gambarMini: {
    width: 96,
    height: 128,
    borderRadius: radius.sm,
    backgroundColor: colors.primarySoft,
  },
  nomor: { ...typography.caption, color: colors.text },
  lencana: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.pill },
  lencanaSudah: { backgroundColor: colors.primarySoft },
  lencanaBelum: { backgroundColor: colors.dangerSoft },
  lencanaTeks: { ...typography.caption },
  lencanaTeksSudah: { color: colors.text },
  lencanaTeksBelum: { color: colors.text },
});
```

| Bagian | Penjelasan |
|---|---|
| `useFocusEffect` | Daftar dimuat ulang **setiap kali tab ini dibuka**, sehingga hasil simpan dari editor langsung terlihat (tidak perlu tarik-untuk-segarkan). |
| Dua bagian | **Perlu dipercantik** (dokumen yang masih punya halaman tanpa efek) dan **Sudah dipercantik**. Tiap kartu menyebut "N dari M halaman belum dipercantik" atau "Semua M halaman sudah dipercantik". |
| Thumbnail | `buildCloudinaryUrl(urlAsli, efek ?? EFEK_BAWAAN, { sisiMaks: 240 })`: gambar mini 240 px dengan efek yang tersimpan. Ketuk halaman mana pun membuka editor. |
| Lencana **Belum** / **Selesai** | Teks, bukan hanya warna; label aksesibilitas memuat "Halaman N dari {judul}, sudah/belum dipercantik". |
| Galat dan kosong | Banner dengan **Coba lagi**; bila tak ada dokumen, `EmptyState` "Belum ada halaman". |

### 7.2 `src/features/editor/index.ts`

Pintu masuk fitur: layar-layar lain mengimpor dari `@/features/editor`, bukan dari berkas di dalamnya.

**Berkas:** `src/features/editor/index.ts` (berkas baru: buat)

```ts
export { buildCloudinaryUrl } from './cloudinaryUrl';
export { EFEK_BAWAAN, LABEL_FILTER, type Efek, type FilterFoto } from './efek';
export { GalatEditor, muatDokumenPercantik, muatHalaman, simpanEfek } from './api';
export { DaftarPercantik } from './DaftarPercantik';
export { EditorFoto } from './EditorFoto';
export type { DokumenPercantik, HalamanEditor, HalamanRingkas } from './skema';
```

### 7.3 `app/(tabs)/percantik.tsx`

Tab yang sebelumnya placeholder kini hanya menampilkan `DaftarPercantik`.

**Berkas:** `app/(tabs)/percantik.tsx` (berkas lama: ganti seluruh isinya)

```tsx
import { DaftarPercantik } from '@/features/editor';

export default function PercantikScreen() {
  return <DaftarPercantik />;
}
```

### 7.4 `src/features/scan/DaftarHalaman.tsx` dan `app/(tabs)/kamera.tsx`

Setelah dokumen tersimpan, daftar halaman menampilkan **Percantik foto** (utama) di atas **Mulai sesi baru** (sekunder). `kamera.tsx` menyambungkannya ke tab Percantik.

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
  /** Setelah tersimpan: buka tab Percantik (Fase 6). */
  onPercantik: () => void;
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
  onPercantik,
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
        <>
          <Button title="Percantik foto" fullWidth onPress={onPercantik} />
          <Button title="Mulai sesi baru" variant="secondary" fullWidth onPress={onMulaiUlang} />
        </>
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

**Berkas:** `app/(tabs)/kamera.tsx` (berkas lama: ganti seluruh isinya)

```tsx
import type { FlashMode } from 'expo-camera';
import { useFocusEffect, useRouter } from 'expo-router';
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
  const router = useRouter();
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
        onPercantik={() => router.push('/percantik')}
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

### 7.5 `app/editor/[halamanId].tsx`

Layar editor: memuat halaman (indikator, galat dengan **Coba lagi** dan **Kembali**), lalu menampilkan `EditorFoto`. Judul bilah atas: "Halaman N".

**Berkas:** `app/editor/[halamanId].tsx` (berkas lama: ganti seluruh isinya)

```tsx
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';

import { Banner, Button, LoadingScreen, Screen } from '@/components';
import { EditorFoto, GalatEditor, muatHalaman, type HalamanEditor } from '@/features/editor';

type Keadaan =
  | { status: 'memuat' }
  | { status: 'siap'; halaman: HalamanEditor }
  | { status: 'galat'; pesan: string };

export default function EditorScreen() {
  const { halamanId } = useLocalSearchParams<{ halamanId: string }>();
  const router = useRouter();
  const [keadaan, setKeadaan] = useState<Keadaan>({ status: 'memuat' });
  const [percobaan, setPercobaan] = useState(0);

  const muat = useCallback(async () => {
    try {
      const halaman = await muatHalaman(halamanId);
      setKeadaan({ status: 'siap', halaman });
    } catch (galat) {
      setKeadaan({
        status: 'galat',
        pesan: galat instanceof GalatEditor ? galat.message : 'Halaman belum bisa dimuat.',
      });
    }
  }, [halamanId]);

  useEffect(() => {
    void muat();
  }, [muat, percobaan]);

  if (keadaan.status === 'memuat') {
    return <LoadingScreen message="Memuat halaman..." />;
  }
  if (keadaan.status === 'galat') {
    return (
      <Screen edges={['bottom']}>
        <Banner message={keadaan.pesan} />
        <Button
          title="Coba lagi"
          fullWidth
          onPress={() => {
            setKeadaan({ status: 'memuat' });
            setPercobaan((n) => n + 1);
          }}
        />
        <Button
          title="Kembali"
          variant="secondary"
          fullWidth
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/percantik'))}
        />
      </Screen>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: `Halaman ${keadaan.halaman.urutan}` }} />
      <EditorFoto halaman={keadaan.halaman} />
    </>
  );
}
```

---

## 8. Cek akhir kode

```bash
npm run typecheck
npm run lint
npm run format:check
npm run cek:kontras
npm test
```

Hasil yang benar: `typecheck` **0 galat**, `lint` tanpa temuan, `format:check` "All matched files use Prettier code style!", `cek:kontras` "Semua pasangan lulus" (16 pasangan, tidak berubah), dan `npm test` **34 lulus, 0 gagal**. Bila `format:check` mengeluh, jalankan `npm run format`.

Cek tidak ada warna mentah dan tidak ada rahasia:

```bash
git grep -nE "#[0-9A-Fa-f]{6}" -- app src/components src/features
git grep -niE "api_secret|sb_secret|service_role" -- app src
```

Hasil yang benar: **kosong** untuk keduanya.

---

## 9. Tugas 6.12: uji di HP, commit, pull request

### 9.1 Jalankan

```bash
npx expo start --clear
```

Siapkan **Supabase** (SQL Editor) dan **Cloudinary** (Dashboard, Media Library) di layar lain. Kamu butuh minimal satu dokumen dengan 3 halaman dari Fase 5.

### 9.2 Daftar uji di HP

Centang satu per satu dan **laporkan hasilnya kepada saya**, terutama yang gagal.

1. [ ] Tab **Percantik**: dokumenmu tampil di bagian **Perlu dipercantik**, kartunya menyebut "3 dari 3 halaman belum dipercantik", tiap halaman berlencana **Belum**, dan gambar mininya muncul.
2. [ ] Ketuk halaman 1: editor terbuka dengan judul "Halaman 1", foto **tegak** dan tidak terpotong, tombol utama bertuliskan **Simpan tanpa efek**, **Bandingkan** dan **Reset** tampak pudar. Catat bila foto tampak miring.
3. [ ] Tab **Filter**: ketuk **Dokumen**, **Hitam-putih**, **Abu-abu**, **Tajam**, lalu **Asli**. Setiap kali muncul "Memuat pratinjau..." sebentar, lalu foto berubah. Catat filter yang hasilnya tidak masuk akal.
4. [ ] Tab **Sesuaikan**: geser **Kecerahan** dan **Kontras**. Nilai berubah per 5 (misalnya +35), menyentuh bagian mana pun dari baris langsung melompat, layar **tidak** ikut tergulir, dan pratinjau berubah **sekali** setelah jarimu berhenti sebentar (tidak berkedip-kedip).
5. [ ] Tab **Crop**: foto asli tampil dengan empat titik. Tarik tiap sudut (terutama yang **menempel tepi layar**), geser area dari dalam, dan coba menciutkannya sampai habis (ada ukuran minimum). Teks "Area crop: W × H px" ikut berubah. Gerakan terasa lancar (K31); catat bila patah-patah.
6. [ ] **Putar 90°** empat kali: labelnya berubah (90°, 180°, 270°, lalu kembali tanpa keterangan).
7. [ ] **Bandingkan**: ketuk, foto asli tampil dengan lencana "Foto asli"; ketuk lagi, kembali ke hasil. Ubah efek saat Bandingkan aktif: ia mati sendiri. **Reset**: semua kembali bawaan dan tombol menjadi **Simpan tanpa efek**.
8. [ ] Atur efek (misalnya crop + putar 90° + Dokumen + kecerahan +20), ketuk **Simpan**. Kembali ke daftar, halaman itu berlencana **Selesai**, ringkasan menjadi "2 dari 3".
9. [ ] Buka halaman yang sama lagi: filter terpilih, slider, putaran, dan crop **kembali seperti saat disimpan**.
10. [ ] Supabase **SQL Editor**:

    ```sql
    select d.judul, d.status, h.urutan, e.jenis_filter, e.kecerahan, e.kontras, e.rotasi, e.data_crop, h.url_hasil
    from public.dokumen d
    join public.halaman_dokumen h on h.dokumen_id = d.id
    left join public.efek_foto e on e.halaman_id = h.id
    order by d.dibuat_pada desc, h.urutan;
    ```

    Halaman yang disimpan: `jenis_filter`, `kecerahan`, `kontras`, `rotasi`, `data_crop` sesuai yang kamu atur, dan `url_hasil` memuat resep (`/c_crop,.../a_90/e_improve/...`) **tanpa** `c_limit` atau `q_auto`. Halaman lain: kolom efek kosong.
11. [ ] Salin `url_hasil` itu ke browser: hasilnya sama dengan pratinjau (area crop, putaran, efek). Foto asli di Media Library tetap tidak berubah.
12. [ ] Simpan halaman 2 dan 3 (boleh dengan **Simpan tanpa efek** untuk satu): setelah **semua** halaman tersimpan, kartu pindah ke **Sudah dipercantik** ("Semua 3 halaman sudah dipercantik") dan query nomor 10 menunjukkan `status` = `selesai`.
13. [ ] **Uji gagal:** di editor, nyalakan mode pesawat lalu ubah filter: muncul "Pratinjau belum bisa dimuat..." dan tombol **Muat ulang pratinjau**; matikan mode pesawat dan ketuk tombolnya: pratinjau muncul. Lalu ubah efek, nyalakan mode pesawat, ketuk **Simpan**: muncul "Tidak bisa terhubung ke server...", editor tidak tertutup, dan setelah mode pesawat dimatikan **Simpan** berhasil.
14. [ ] Selesai menyimpan dokumen baru di tab Kamera: tombol **Percantik foto** membuka tab Percantik.
15. [ ] **Pantau Cloudinary (tugas 6.11):** buka Dashboard Cloudinary, lihat pemakaian transformasi dan kredit. Seharusnya naik sedikit (puluhan transformasi). Laporkan angkanya.
16. [ ] Tidak ada layar merah atau peringatan kuning baru selama pengujian.

Setelah selesai, hapus dokumen uji bila kamu mau (`delete from public.dokumen where judul like 'Uji Fase 6%';` menghapus halaman dan efeknya juga lewat `on delete cascade`), dan foto uji dari Media Library Cloudinary.

### 9.3 Commit dan pull request

```bash
git status
git add .
git status
```

Baca daftar berkas: yang berubah harus berada di `src/`, `app/`, `tests/`, `package.json`, `ROADMAP.md`, dan `docs/`; **tidak ada** `.env` dan tidak ada berkas bernama aneh. Lalu:

```bash
git commit -m "feat(editor): percantik foto non-destruktif dengan efek, crop, dan rotasi"
git push -u origin fase-6-percantik
```

Buka pull request, tunggu **CI hijau**, **Merge**, lalu `git switch main` dan `git pull`. Centang tugas 6.0 sampai 6.12 di `ROADMAP.md` pada commit berikutnya.

---

## 10. Yang perlu diingat saat coding nanti

1. **`url_hasil` kini berisi resep transformasi** (tanpa pengecilan). Fase 7 (daftar dan detail dokumen) memakai `url_hasil` untuk menampilkan hasil dan `url_asli` untuk aslinya; gambar mini dibuat dengan `buildCloudinaryUrl`.
2. **Jangan ubah urutan rantai** di `komponenTransformasi` (crop → putar → filter → kecerahan → kontras). Crop memakai koordinat foto asli; kalau dipindah, hasil crop meleset.
3. **`efek_foto` satu baris per halaman** (`halaman_id` unik, K38): menyimpan ulang menimpa. Menghapus halaman menghapus efeknya (`on delete cascade`).
4. **Dokumen `selesai`** berarti semua halaman punya baris efek. Fase 7 boleh memakainya sebagai penanda di daftar.
5. **Ekspor PDF (B2, Fase 9) memakai `url_hasil`.** URL itu menghasilkan gambar penuh; bila besar, tambahkan `c_limit` saat membangun PDF.
6. **Tes ada di `tests/`** dan dijalankan `npm test`. Fase 4 dan 5 punya uji unit yang saya jalankan di luar repo; memindahkannya ke `tests/` dicatat di B20.
7. **Perubahan belum disimpan hilang** bila kamu menutup editor (tombol kembali tidak bertanya). Peringatan dicatat di B18.
8. **Pembaca layar:** crop lewat gestur seret belum punya padanan aksesibel selain slider; dicatat di B17.

---

## 11. Pemecahan masalah

| Gejala | Kemungkinan penyebab dan solusi |
|---|---|
| "Pratinjau belum bisa dimuat..." padahal internet ada | Cloudinary menolak URL (misalnya kecerahan -100 pada kode lama) atau sinyal buruk. Ketuk **Muat ulang pratinjau**. Bila hanya efek tertentu yang gagal, salin URL dari log dan buka di browser untuk melihat pesan galat Cloudinary, lalu laporkan. |
| "Alamat foto tidak dikenali, jadi pratinjau tidak bisa dibuat." | `url_asli` tidak memuat `/image/upload/` atau sudah memuat transformasi. Cek nilainya dengan query di 3.2. |
| Titik tarik crop di tepi tidak bisa digeser | Berkas `CropOverlay.tsx` atau `EditorFoto.tsx` lama (tanpa inset). Pakai versi di bagian 6. |
| Layar ikut tergulir saat menggeser slider atau crop | Gestur dilepas ke induk: pastikan `onPanResponderTerminationRequest` bernilai `false` pada `Slider.tsx` dan `CropOverlay.tsx`. |
| Chip filter memanjang ke bawah | `chipGulir: { flexGrow: 0 }` hilang di `EditorFoto.tsx`. |
| "Akunmu tidak diizinkan mengubah halaman ini." | RLS menolak: akun nonaktif, atau halaman bukan milikmu, atau sesi kedaluwarsa. Keluar lalu masuk lagi. |
| "Halaman tidak ditemukan." | Halaman sudah dihapus (misalnya bersama dokumennya). Kembali ke daftar. |
| Setelah **Simpan**, lencana tidak berubah | Daftar dimuat ulang saat tab dibuka lagi; pindah tab lalu kembali. Bila tetap sama, cek query 9.2 nomor 10: baris efek ada? |
| Dokumen tidak pernah menjadi **Selesai** | Masih ada halaman tanpa baris `efek_foto`. Simpan halaman itu (boleh **Simpan tanpa efek**). |
| `npm test`: `ERR_MODULE_NOT_FOUND` | Dua berkas pelari uji (4.3) tidak ada atau salah folder. |
| `npm test`: `Unknown file extension ".ts"` | Node terlalu lama. Perlu Node 22.18 ke atas; cek `node --version`. |
| `npm test`: `tests/*.test.mjs` tidak ditemukan | Skrip `test` salah ketik di `package.json` (lihat 4.5), atau dijalankan bukan dari `C:\scannest`. |
| `typecheck`: `Module '"@/components"' has no exported member 'Slider'` | Ekspor `Slider` belum ditambahkan di `src/components/index.ts` (6.1). |
| `typecheck`: `Property 'onPercantik' is missing` di `kamera.tsx` | `kamera.tsx` belum diganti dengan versi 7.4 (galat sementara yang wajar di antara dua berkas itu). |
| Peringatan "The `lock` option is deprecated" di konsol | Dari `@supabase/supabase-js`; tidak menghalangi. Backlog B13. |
| Nama berkas aneh muncul di `git status` | Kode tertempel ke terminal, bukan ke berkas. Hapus dengan `git rm` atau `del`; lihat `panduan-fase-1.md` bagian 3.0. |

---

## 12. Checklist akhir Fase 6

Sama dengan "Selesai bila" Fase 6 di `ROADMAP.md`.

- [x] Dokumen terbaru dan cabang `fase-6-percantik` siap (6.0)
- [x] Sintaks transformasi terbukti di browser-mu (6.1)
- [x] `buildCloudinaryUrl` dan model efek lulus `npm test` (6.2, 6.3)
- [x] Editor memuat foto dan efek tersimpan; crop 4 sudut, putar, filter, kecerahan, kontras bekerja di HP (6.4 sampai 6.7)
- [x] Bandingkan dan Reset bekerja (6.8)
- [x] **Simpan** menulis `efek_foto` dan `url_hasil`; status dokumen menjadi `selesai` setelah semua halaman (6.9)
- [x] Tab **Percantik** dan tombol **Percantik foto** bekerja (6.10)
- [x] Pemakaian transformasi Cloudinary dipantau dan dilaporkan (6.11)
- [x] `typecheck`, `lint`, `format:check`, `cek:kontras`, `test` bersih; PR digabung dan CI hijau (6.12)

---

## 13. Daftar berkas Fase 6

| Berkas | Tugas | Status |
|---|---|---|
| `ROADMAP.md`, `docs/*.md` | 6.0 | diubah |
| `package.json` | 6.2 | diubah (satu skrip `test`) |
| `tests/resolve-ts.mjs`, `tests/resolve-ts-hook.mjs` | 6.2 | baru |
| `tests/efek.test.mjs` | 6.2 | baru |
| `tests/crop.test.mjs` | 6.3 | baru |
| `tests/skema.test.mjs` | 6.3 | baru |
| `src/features/editor/efek.ts` | 6.2 | baru |
| `src/features/editor/cloudinaryUrl.ts` | 6.2 | baru |
| `src/features/editor/crop.ts` | 6.3, 6.4 | baru |
| `src/features/editor/skema.ts` | 6.3 | baru |
| `src/features/editor/api.ts` | 6.3, 6.9 | baru |
| `src/components/Slider.tsx` | 6.7 | baru |
| `src/components/index.ts` | 6.7 | diubah (satu ekspor) |
| `src/features/editor/useDebouncedValue.ts` | 6.7 | baru |
| `src/features/editor/CropOverlay.tsx` | 6.4 | baru |
| `src/features/editor/EditorFoto.tsx` | 6.4 sampai 6.9 | baru |
| `src/features/editor/DaftarPercantik.tsx` | 6.10 | baru |
| `src/features/editor/index.ts` | 6.10 | baru |
| `app/(tabs)/percantik.tsx` | 6.10 | diubah (dari placeholder) |
| `app/editor/[halamanId].tsx` | 6.3 | diubah (dari placeholder) |
| `src/features/scan/DaftarHalaman.tsx` | 6.10 | diubah (tombol Percantik foto) |
| `app/(tabs)/kamera.tsx` | 6.10 | diubah |

---

## 14. Sumber (diakses 18 Oktober 2026)

- Cloudinary, Transformation URL API reference (sintaks `c_crop`, `a_`, `e_improve`, `e_blackwhite`, `e_grayscale`, `e_sharpen`, `e_brightness`, `e_contrast`, `c_limit`, `q_auto`; saya juga mencobanya langsung lewat konektor): https://cloudinary.com/documentation/transformation_reference
- Cloudinary, Image transformations (rantai komponen dipisah `/`, urutan berpengaruh): https://cloudinary.com/documentation/image_transformations
- Cloudinary, perbandingan paket (1 kredit = 1.000 transformasi, 1 GB penyimpanan, atau 1 GB bandwidth; transformasi unik dihitung sekali): https://cloudinary.com/pricing/compare-plans
- Cloudinary, Image enhancement (`e_improve`): https://cloudinary.com/documentation/image_enhancement
- Expo, `expo-image` (SDK 54; `Image.prefetch`, `onLoad`): https://docs.expo.dev/versions/v54.0.0/sdk/image/
- React Native, PanResponder: https://reactnative.dev/docs/panresponder
- Supabase, PostgREST embed dan `upsert` (`onConflict`): https://supabase.com/docs/reference/javascript/upsert
- Node.js, `node --test` dan type stripping (Node 22.18 ke atas): https://nodejs.org/api/test.html
- Skema database Fase 2 (`supabase/migrations/20261010120000_init_schema.sql`): tabel `efek_foto`, `halaman_dokumen`, `dokumen`, kebijakan RLS, `grant` kolom
