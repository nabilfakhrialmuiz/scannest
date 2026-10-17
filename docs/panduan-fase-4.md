# Panduan Fase 4: Kamera dan Sesi Scan (Scannest)

**Untuk:** Nabil Fakhri Al Muiz · **Terakhir diperbarui:** 17 Oktober 2026 · **Sinkron dengan:** `ROADMAP.md` v0.9 (Fase 4, tugas 4.0 sampai 4.9)

Setelah Fase 4 selesai, tab **Kamera** berfungsi: kamu memotret dokumen halaman demi halaman, meninjau tiap foto (**Pakai foto** atau **Ulang**), dan mengumpulkannya dalam satu **sesi scan** yang bisa ditambah, diurutkan ulang, dan dihapus. Setiap foto yang dipakai sudah dinormalisasi (maksimum lebar 2000 piksel, JPEG, orientasi tegak) sehingga siap diunggah ke Cloudinary di Fase 5.

**Apa yang sudah dan belum saya uji:**

- Sudah: seluruh kode saya jalankan sebagai aplikasi web (React Native Web, Expo SDK 54) dengan **kamera tiruan milik Chromium**, melawan server Supabase tiruan. **39 skenario lulus**: pratinjau kamera hanya satu dan dilepas saat pindah layar, jepret, tinjau, Ulang, Pakai foto, flash berputar, grid, tambah halaman sampai 3, urut ulang (naik dan turun, tombol di ujung nonaktif), hapus dengan konfirmasi, buang sesi, hapus halaman terakhir (kembali ke kamera otomatis), kartu sesi di Dashboard, sesi tidak terbawa setelah keluar lalu masuk lagi, batas 30 halaman, dan izin kamera ditolak. Aturan ukuran foto punya **11 uji unit** tersendiri (portrait, landscape, tepat 2000, lebih kecil dari 2000, nilai tidak valid). `typecheck`, `lint`, `format:check`, dan `cek:kontras` (16 pasangan) bersih. Urutan langkah di panduan ini saya putar ulang dari kode Fase 3: **0 galat typecheck di setiap tahap**. Saya juga membaca kode sumber `expo-camera` dan `expo-image-manipulator` yang terpasang (lihat bagian 5).
- Belum: **kamera dan HP sungguhan** (Expo Go di Android): dialog izin asli, fokus dan flash, pemutaran orientasi foto portrait dan landscape, kecepatan memotret, dan perilaku memori. Kamera tiruan hanya menghasilkan gambar uji 640 × 480, jadi jalur **memperkecil** foto besar (lebih dari 2000 piksel) baru terbukti lewat uji unit untuk hitungan ukurannya, **bukan** lewat foto kamera nyata. Uji tugas 4.9 di HP-mu adalah bukti sebenarnya, terutama untuk orientasi.

---

## Daftar isi

1. Peta tugas dan keputusan
2. Tugas 4.0: tutup Fase 3 dan siapkan cabang
3. Tugas 4.1: pasang paket
4. Tugas 4.2: izin kamera di `app.json`
5. Tugas 4.3: aturan ukuran dan normalisasi foto
6. Tugas 4.4: sesi scan di context
7. Tugas 4.5: warna layar kamera dan `IconButton`
8. Tugas 4.6: izin dan layar kamera
9. Tugas 4.7: layar tinjau dan daftar halaman
10. Tugas 4.8: merakit layar Kamera dan Dashboard
11. Cek akhir kode
12. Tugas 4.9: uji di HP, commit, pull request
13. Yang perlu diingat saat coding nanti
14. Pemecahan masalah
15. Checklist akhir Fase 4
16. Daftar berkas Fase 4
17. Sumber

---

## 1. Peta tugas dan keputusan

| Tugas | Isi | Bagian |
|---|---|---|
| 4.0 | Tutup Fase 3 (dokumen terbaru masuk repo), cabang `fase-4-kamera` | 2 |
| 4.1 | Pasang `expo-camera` dan `expo-image-manipulator` | 3 |
| 4.2 | Izin kamera: teks izin di `app.json`, layar penjelasan, tombol ke pengaturan | 4, 8 |
| 4.3 | Aturan ukuran dan normalisasi foto (lebar 2000, JPEG 0,85, orientasi tegak) | 5 |
| 4.4 | Sesi scan di context: halaman sementara, tambah, hapus, urutkan | 6 |
| 4.5 | Warna `scrim` dan komponen `IconButton` | 7 |
| 4.6 | `CameraView` dengan tombol jepret, flash (mati, hidup, otomatis), grid | 8 |
| 4.7 | Layar tinjau (**Pakai foto** atau **Ulang**) dan daftar halaman (**Tambah halaman**) | 9 |
| 4.8 | Layar Kamera merakit semuanya; kartu sesi di Dashboard | 10 |
| 4.9 | Uji di HP, commit, PR, CI hijau, merge | 12 |

**Pemetaan ke roadmap v0.7:** 4.1 sama; 4.2 (izin) dikerjakan di bagian 4 dan 8; 4.3 (kamera) jadi tugas 4.6; 4.4 (tinjau) jadi 4.7; 4.5 (normalisasi) jadi 4.3; 4.6 (sesi) jadi 4.4; 4.7 (aturan memori) dipenuhi oleh 4.3 dan 4.4. Urutan di v0.8 mengikuti urutan pengerjaan.

**Pintasan (opsional):** `scannest-fase4-kode.zip` berisi 16 berkas kode Fase 4 dengan susunan folder yang sama dengan repomu. Kamu boleh mengekstraknya ke `C:\scannest` (timpa berkas yang ada) alih-alih mengetik satu per satu, tetapi baca bagian 5 sampai 10 agar paham isinya; setelah itu tetap jalankan perintah di bagian 3.

### Alur satu halaman, dalam satu gambar

```
Tab Kamera ──▶ izin kamera? ──belum──▶ layar penjelasan ──▶ dialog izin sistem
                   │ sudah
                   ▼
            CameraView (pratinjau) ──jepret──▶ foto mentah (URI, lebar, tinggi)
                                                   │
                                            layar tinjau
                                       ┌───────────┴───────────┐
                                    Ulang                  Pakai foto
                                 (foto dibuang,        normalisasi: perkecil bila lebar > 2000,
                                  kembali ke kamera)   simpan ulang JPEG 0,85 (orientasi menyatu)
                                                              │
                                                    sesi scan (daftar URI)
                                              Tambah halaman · naik/turun · hapus
                                                              │
                                                  Fase 5: unggah per halaman ke Cloudinary
```

### Keputusan teknis (dicek 16 Oktober 2026)

**K23: tempat menyimpan sesi scan.**

| Pilihan | Pro | Kontra |
|---|---|---|
| **State di memori (React context)** (dipilih) | Sederhana; tidak ada daftar URI yatim yang menunjuk berkas yang sudah dihapus sistem; tidak ada paket tambahan | Sesi hilang bila aplikasi ditutup paksa atau dimatikan Android. Berkas fotonya tetap ada di cache, tetapi tidak lagi terdaftar |
| AsyncStorage | Sesi bertahan setelah aplikasi ditutup | Android boleh membersihkan folder cache kapan saja, jadi URI tersimpan bisa menunjuk berkas yang sudah hilang; butuh logika pemulihan |

Mitigasinya ada di Fase 5: foto diunggah **per halaman segera setelah Pakai foto**, sehingga halaman yang sudah diunggah tersimpan di database dan tidak ikut hilang.

**K24: batas 30 halaman per sesi.** Pro: membatasi memori dan penggunaan kuota Cloudinary Free (25 kredit per bulan, 1 GB penyimpanan atau bandwidth setara 1 kredit). Kontra: dokumen yang sangat panjang harus dibagi dua. Angkanya satu konstanta (`HALAMAN_MAKS` di `ukuran.ts`) sehingga mudah diubah.

**K25: urut ulang dengan tombol naik dan turun, bukan seret-lepas.** Pro: tanpa paket gestur tambahan, bekerja di Expo Go, mudah diakses pembaca layar, dan sudah teruji. Kontra: kurang luwes untuk puluhan halaman. Seret-lepas dicatat sebagai backlog **B11**.

**K26: aturan normalisasi.** Foto diambil dengan `quality: 1` dan **tanpa** `skipProcessing`, lalu dinormalisasi: diperkecil hanya bila lebarnya lebih dari 2000 piksel (tidak pernah diperbesar), dan disimpan ulang sebagai JPEG kualitas 0,85. Pro: ukuran berkas wajar untuk kuota Cloudinary, dan orientasi menyatu di piksel. Kontra: dua kali penyimpanan JPEG sedikit menurunkan mutu (kualitas jepretan awal 1 menekan efeknya). Rencana Fase 5 (tugas 5.1) juga membatasi unggahan ke 2000 × 2000 di sisi Cloudinary, jadi 2000 piksel di sini sejalan.

---

## 2. Tugas 4.0: tutup Fase 3 dan siapkan cabang

Kamu melaporkan Fase 3 selesai 100%. Saya mencentangnya di `ROADMAP.md` v0.8 berdasarkan laporanmu (termasuk tugas 2.0 dan 2.9 yang ditutup di tugas 3.0). Pastikan dulu keadaan repo, lalu pasang dokumen terbaru.

### 2.1 Cek keadaan Fase 3

```bash
cd C:\scannest
git status
git switch main
git pull
git log --oneline -5
```

`git status` harus bersih (tidak ada berkas berubah) dan `git log` memuat commit Fase 3. Bila Fase 3 belum digabung ke `main`, selesaikan dulu pull request-nya (panduan Fase 3 bagian 10.4); jangan memulai Fase 4 di atas cabang yang belum digabung.

### 2.2 Salin dokumen terbaru

1. Unduh `scannest-dokumen.zip` dari percakapan ini dan ekstrak.
2. Salin `ROADMAP.md` ke akar `C:\scannest` (timpa), dan salin isi folder `docs` ke `C:\scannest\docs` (timpa; akan bertambah `panduan-fase-4.md`, dan `panduan-fase-3.md` berubah karena checklist-nya dicentang).

### 2.3 Cabang

```bash
git switch -c fase-4-kamera
git add ROADMAP.md docs
git commit -m "docs: roadmap v0.8 dan panduan fase 4"
```

Semua pekerjaan Fase 4 dilakukan di cabang `fase-4-kamera`.

---

## 3. Tugas 4.1: pasang paket

```bash
npx expo install expo-camera expo-image-manipulator
```

| Paket | Fungsi | Versi yang terpasang saat saya uji |
|---|---|---|
| `expo-camera` | Komponen `CameraView` (pratinjau dan jepret), hook izin `useCameraPermissions`. Termasuk di Expo Go. | `~17.0.10` |
| `expo-image-manipulator` | Memperkecil dan menyimpan ulang foto. | `~14.0.8` |

Pakai `npx expo install` (bukan `npm install`) agar versinya cocok dengan SDK 54. Bila `expo install` memilih nomor yang sedikit berbeda dari tabel di atas, itu wajar; yang penting ia memilihnya sendiri.

Cek: `package.json` memuat keduanya, lalu `npm run typecheck` tetap **0 galat**.

> **Catatan versi API.** Dokumentasi `expo-image-manipulator` di situs Expo yang saya buka saat riset ternyata untuk SDK 58. Karena itu saya memeriksa **tipe yang terpasang di `node_modules`** untuk SDK 54: `ImageManipulator.manipulate(uri)` → `resize` → `renderAsync()` → `saveAsync({ format, compress })`, plus `release()` untuk melepas memori, semuanya ada di versi `14.0.8`. Fungsi lama `manipulateAsync` sudah ditandai *deprecated*, jadi tidak dipakai.

---

## 4. Tugas 4.2: izin kamera di `app.json`

Plugin `expo-camera` mengisi teks izin kamera dan mematikan izin mikrofon. Aplikasi ini hanya memotret, tidak merekam video atau suara, jadi mikrofon tidak diminta sama sekali (prinsip izin seminimal mungkin). Tambahkan satu entri ke daftar `plugins`:

**Berkas:** `app.json` (berkas lama: yang berubah hanya entri `expo-camera` di daftar `plugins`; sisanya sama)

```json
{
  "expo": {
    "name": "Scannest",
    "slug": "scannest",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/images/icon.png",
    "scheme": "scannest",
    "userInterfaceStyle": "light",
    "newArchEnabled": true,
    "ios": {
      "supportsTablet": true
    },
    "android": {
      "package": "com.nabilfakhri.scannest",
      "adaptiveIcon": {
        "backgroundColor": "#E6F4FE",
        "foregroundImage": "./assets/images/android-icon-foreground.png",
        "backgroundImage": "./assets/images/android-icon-background.png",
        "monochromeImage": "./assets/images/android-icon-monochrome.png"
      },
      "edgeToEdgeEnabled": true,
      "predictiveBackGestureEnabled": false
    },
    "web": {
      "output": "static",
      "favicon": "./assets/images/favicon.png"
    },
    "plugins": [
      "expo-router",
      [
        "expo-splash-screen",
        {
          "image": "./assets/images/splash-icon.png",
          "imageWidth": 200,
          "resizeMode": "contain",
          "backgroundColor": "#FAF6F0"
        }
      ],
      "expo-font",
      [
        "expo-camera",
        {
          "cameraPermission": "Scannest memakai kamera untuk memotret dokumen yang ingin kamu pindai.",
          "microphonePermission": false,
          "recordAudioAndroid": false
        }
      ]
    ],
    "experiments": {
      "typedRoutes": true,
      "reactCompiler": true
    }
  }
}
```

| Baris | Arti |
|---|---|
| `"cameraPermission": "..."` | Teks yang dibaca sistem saat meminta izin kamera (dalam bahasa Indonesia). |
| `"microphonePermission": false` | Tidak menambahkan izin mikrofon. |
| `"recordAudioAndroid": false` | Tidak menambahkan izin `RECORD_AUDIO` di Android (bawaannya `true`). |

> **Penting:** plugin `app.json` baru berlaku pada **build** aplikasi (APK dari EAS di Fase 10). Setahu saya Expo Go tidak memakainya: di Expo Go, dialog izin memakai teks bawaan Expo Go, dan izin kamera di Android sudah termasuk otomatis (dokumentasi `expo-camera`: izin `CAMERA` Android ditambahkan otomatis). Jadi di Expo Go kamu tidak perlu melakukan apa-apa selain menekan **Izinkan** di dialog.

Sumber: dokumentasi `expo-camera` SDK 54 (bagian Configuration in app.json/app.config.js).

---

## 5. Tugas 4.3: aturan ukuran dan normalisasi foto

### 5.1 Mengapa foto harus dinormalisasi

Foto mentah dari kamera HP biasanya 12 megapiksel atau lebih (misalnya 3000 × 4000), berukuran beberapa megabyte. Mengunggahnya apa adanya memboroskan kuota Cloudinary dan data seluler, padahal untuk dokumen 2000 piksel pada sisi lebar sudah cukup terbaca. Langkah ini juga memastikan **orientasi menyatu di piksel**: bila foto hanya membawa tag EXIF "putar 90°", sebagian penampil menampilkannya miring.

Yang saya baca di kode sumber paket terpasang (SDK 54):

- **`expo-camera` (Android):** bila `skipProcessing` tidak diisi, `ResolveTakenPicture` membaca orientasi EXIF dan **memutar bitmap** (`decodeBitmap(imageData, orientation, ...)`) sebelum menyimpan. Itu sebabnya `takePictureAsync` kita tidak memakai `skipProcessing`.
- **`expo-image-manipulator` (iOS):** memperbaiki orientasi begitu gambar dimuat (`ImageFixOrientationTransformer`). Aplikasi kita Android, jadi ini hanya catatan.
- **`expo-image-manipulator` (Android):** saya **tidak menemukan** penanganan EXIF eksplisit di kodenya; gambar dimuat lewat `expo-image-loader` (Glide). Dugaan saya orientasi tetap benar karena kamera sudah memutar pikselnya (poin pertama), tetapi ini **belum terbukti di HP**. Karena itu uji orientasi di bagian 12.2 adalah uji terpenting Fase ini.

### 5.2 `src/features/scan/ukuran.ts`

Fungsi murni tanpa modul native, sehingga mudah diuji dan nilai pentingnya berada di satu tempat.

**Berkas:** `src/features/scan/ukuran.ts` (berkas baru: buat)

```ts
// Aturan ukuran foto sebelum diunggah. Fungsi murni (tanpa modul native) supaya mudah diuji.

/** Lebar maksimum hasil normalisasi, dalam piksel (roadmap 4.5). */
export const LEBAR_MAKS = 2000;

/** Kualitas JPEG hasil normalisasi (0 sampai 1). */
export const KUALITAS_JPEG = 0.85;

/** Batas halaman dalam satu sesi scan (keputusan K24). */
export const HALAMAN_MAKS = 30;

export type Ukuran = { width: number; height: number };

export type UkuranTarget = Ukuran & {
  /** true bila foto harus diperkecil; false bila sudah cukup kecil dan dibiarkan. */
  diperkecil: boolean;
};

/**
 * Menghitung ukuran akhir: lebar dibatasi `lebarMaks`, tinggi mengikuti rasio.
 * Foto yang sudah lebih kecil tidak diperbesar (memperbesar hanya menambah berat berkas).
 */
export function ukuranTarget(
  { width, height }: Ukuran,
  lebarMaks: number = LEBAR_MAKS,
): UkuranTarget {
  if (!(width > 0) || !(height > 0)) {
    throw new Error('Ukuran foto tidak valid.');
  }
  if (width <= lebarMaks) {
    return { width, height, diperkecil: false };
  }
  return {
    width: lebarMaks,
    height: Math.max(1, Math.round((height * lebarMaks) / width)),
    diperkecil: true,
  };
}
```

| Bagian | Penjelasan |
|---|---|
| `LEBAR_MAKS`, `KUALITAS_JPEG`, `HALAMAN_MAKS` | Tiga angka aturan (roadmap 4.5 dan K24). Ubah di sini saja bila perlu. |
| `ukuranTarget` | Bila lebar ≤ 2000: ukuran tetap, `diperkecil: false` (tidak pernah memperbesar). Bila lebih: lebar 2000, tinggi mengikuti rasio dan dibulatkan (minimal 1). Ukuran nol, negatif, atau `NaN` ditolak dengan galat. |

Contoh hasil (sudah diuji): 3000 × 4000 menjadi 2000 × 2667; 4000 × 3000 menjadi 2000 × 1500; 2160 × 3840 menjadi 2000 × 3556; 1200 × 1600 tidak berubah.

### 5.3 `src/features/scan/normalisasi.ts`

**Berkas:** `src/features/scan/normalisasi.ts` (berkas baru: buat)

```ts
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import { KUALITAS_JPEG, LEBAR_MAKS, ukuranTarget, type Ukuran } from './ukuran';

export type FotoMentah = Ukuran & { uri: string };
export type FotoNormal = Ukuran & { uri: string };

/**
 * Normalisasi foto sebelum diunggah (roadmap 4.5):
 * 1. perkecil bila lebarnya melebihi LEBAR_MAKS (tidak pernah memperbesar),
 * 2. simpan ulang sebagai JPEG berkualitas KUALITAS_JPEG.
 *
 * Penyimpanan ulang membuat orientasi menyatu di piksel: berkas hasil tidak lagi bergantung
 * pada tag EXIF, jadi tampil tegak di mana pun (Cloudinary, peramban, aplikasi lain).
 * Yang dikembalikan hanya URI berkas dan ukurannya, tidak pernah base64 (aturan memori 4.7).
 */
export async function normalisasiFoto(foto: FotoMentah): Promise<FotoNormal> {
  const target = ukuranTarget(foto, LEBAR_MAKS);

  const context = ImageManipulator.manipulate(foto.uri);
  try {
    if (target.diperkecil) {
      context.resize({ width: target.width });
    }
    const gambar = await context.renderAsync();
    try {
      const hasil = await gambar.saveAsync({ format: SaveFormat.JPEG, compress: KUALITAS_JPEG });
      return { uri: hasil.uri, width: hasil.width, height: hasil.height };
    } finally {
      gambar.release();
    }
  } finally {
    context.release();
  }
}
```

| Bagian | Penjelasan |
|---|---|
| `ImageManipulator.manipulate(foto.uri)` | Membuka "konteks" untuk satu gambar. Belum ada yang diproses. |
| `context.resize({ width })` | Hanya dipanggil bila `ukuranTarget(...).diperkecil`. Mengisi lebar saja, tinggi dihitung otomatis dari rasio. |
| `await context.renderAsync()` | Menjalankan semua perubahan dan menghasilkan `ImageRef`. |
| `gambar.saveAsync({ format: JPEG, compress: 0.85 })` | Menyimpan ke berkas baru di cache dan mengembalikan `{ uri, width, height }`. **Tidak** meminta `base64` (aturan memori 4.7). |
| `release()` di `finally` | Melepas objek bersama di sisi native agar memori tidak menumpuk walau terjadi galat. |

---

## 6. Tugas 4.4: sesi scan di context

### 6.1 `src/features/scan/ScanSessionProvider.tsx`

**Berkas:** `src/features/scan/ScanSessionProvider.tsx` (berkas baru: buat)

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

import { HALAMAN_MAKS } from './ukuran';

/** Satu halaman dokumen dalam sesi. Hanya URI berkas, tidak pernah base64 (aturan 4.7). */
export type HalamanScan = {
  id: string;
  uri: string;
  width: number;
  height: number;
};

type SessionState = {
  /** Pemilik sesi; bila pengguna berganti atau keluar, halaman sesi lama dianggap kosong. */
  ownerId: string | null;
  pages: HalamanScan[];
};

type ScanSessionValue = {
  pages: HalamanScan[];
  isFull: boolean;
  /** Menambah halaman di akhir. Mengembalikan false bila sesi sudah penuh. */
  addPage: (page: Omit<HalamanScan, 'id'>) => boolean;
  removePage: (id: string) => void;
  /** Menggeser halaman: -1 ke atas (lebih awal), 1 ke bawah (lebih akhir). */
  movePage: (id: string, direction: -1 | 1) => void;
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

export function ScanSessionProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;

  const [state, setState] = useState<SessionState>({ ownerId: userId, pages: [] });
  const counter = useRef(0);

  // Pengguna berganti, atau keluar lalu masuk lagi (userId sempat null): sesi lama dibuang.
  // Menyesuaikan state saat render diizinkan React untuk kasus seperti ini (tanpa effect).
  if (state.ownerId !== userId) {
    setState({ ownerId: userId, pages: [] });
  }
  const pages = useMemo(() => (state.ownerId === userId ? state.pages : []), [state, userId]);

  const addPage = useCallback(
    (page: Omit<HalamanScan, 'id'>) => {
      if (pages.length >= HALAMAN_MAKS) return false;
      counter.current += 1;
      const baru: HalamanScan = { ...page, id: `h${Date.now().toString(36)}-${counter.current}` };
      setState((prev) => {
        const base = prev.ownerId === userId ? prev.pages : [];
        if (base.length >= HALAMAN_MAKS) return prev;
        return { ownerId: userId, pages: [...base, baru] };
      });
      return true;
    },
    [pages.length, userId],
  );

  const removePage = useCallback(
    (id: string) => {
      setState((prev) => ({
        ownerId: userId,
        pages: (prev.ownerId === userId ? prev.pages : []).filter((p) => p.id !== id),
      }));
    },
    [userId],
  );

  const movePage = useCallback(
    (id: string, direction: -1 | 1) => {
      setState((prev) => ({
        ownerId: userId,
        pages: moveItem(prev.ownerId === userId ? prev.pages : [], id, direction),
      }));
    },
    [userId],
  );

  const clear = useCallback(() => setState({ ownerId: userId, pages: [] }), [userId]);

  const value = useMemo<ScanSessionValue>(
    () => ({
      pages,
      isFull: pages.length >= HALAMAN_MAKS,
      addPage,
      removePage,
      movePage,
      clear,
    }),
    [pages, addPage, removePage, movePage, clear],
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

### 6.2 Cara kerjanya

| Bagian | Penjelasan |
|---|---|
| `HalamanScan` | `id`, `uri`, `width`, `height`. **Hanya URI berkas**, tidak ada base64 (4.7). |
| `state.ownerId` | Sesi mencatat pemiliknya (id pengguna dari `useAuth`). Bila pengguna keluar atau berganti, `ownerId` tidak lagi sama dengan `userId`, dan state diatur ulang saat render. Ini menutup cacat yang sempat saya temukan saat menguji: tanpa langkah ini, keluar lalu masuk lagi dengan akun yang sama memunculkan kembali halaman lama. |
| `addPage` | Mengembalikan `false` bila sesi sudah 30 halaman; `true` bila berhasil. Id dibuat dari waktu dan penghitung, cukup unik untuk satu perangkat. |
| `movePage(id, -1 \| 1)` | Menukar posisi dengan tetangga; di ujung daftar tidak berbuat apa-apa. |
| `removePage`, `clear` | Menghapus satu halaman atau seluruh sesi. Berkas foto di cache tidak dihapus (lihat backlog **B12**). |
| `useScanSession()` | Hook untuk layar mana pun. Melempar galat jelas bila dipakai di luar provider. |

---

## 7. Tugas 4.5: warna layar kamera dan `IconButton`

### 7.1 Dua warna baru

Tombol di atas pratinjau kamera harus terbaca di atas foto apa pun, jadi latarnya dibuat pekat. Tambahkan `scrim` dan `onScrim`:

**Berkas:** `src/theme/colors.ts` (berkas lama: ganti seluruh isinya)

```ts
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
```

### 7.2 Uji kontras ditambah satu pasangan

**Berkas:** `scripts/cek-kontras.mjs` (berkas lama: ganti seluruh isinya)

```js
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
```

Jalankan `npm run cek:kontras`: harus **16 pasangan lulus** (pasangan baru: ikon dan teks putih di atas `scrim`, rasio 15,26).

### 7.3 `src/components/IconButton.tsx`

Tombol bulat berisi ikon, ukuran sentuh 48 dp. Wajib berlabel (`label`) karena tidak punya teks yang bisa dibacakan pembaca layar. Tiga nada: `soft`, `scrim`, `danger`.

**Berkas:** `src/components/IconButton.tsx` (berkas baru: buat)

```tsx
import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { colors, minTouchSize, radius } from '@/theme';

type IconButtonProps = {
  icon: ComponentProps<typeof Ionicons>['name'];
  /** Wajib: tombol ikon tidak punya teks, jadi labelnya yang dibacakan pembaca layar. */
  label: string;
  onPress?: () => void;
  /** soft: latar hijau lembut. scrim: di atas pratinjau kamera. danger: aksi menghapus. */
  tone?: 'soft' | 'scrim' | 'danger';
  disabled?: boolean;
};

const tones = {
  soft: { background: colors.primarySoft, icon: colors.primary },
  scrim: { background: colors.scrim, icon: colors.onScrim },
  danger: { background: colors.dangerSoft, icon: colors.danger },
} as const;

export function IconButton({
  icon,
  label,
  onPress,
  tone = 'soft',
  disabled = false,
}: IconButtonProps) {
  const palette = tones[tone];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      android_ripple={{ color: 'rgba(0,0,0,0.12)', borderless: false }}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: palette.background },
        disabled && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      <Ionicons name={icon} size={22} color={palette.icon} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    width: minTouchSize,
    height: minTouchSize,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  disabled: { opacity: 0.4 },
  pressed: { opacity: 0.85 },
});
```

### 7.4 `src/components/index.ts`

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
export { TextField } from './TextField';
```

---

## 8. Tugas 4.2 dan 4.6: izin dan layar kamera

### 8.1 `src/features/scan/IzinKamera.tsx`

Layar penjelasan: alasan izin dijelaskan dulu, baru dialog sistem muncul. Bila izin ditolak permanen (`canAskAgain` bernilai `false`), Android tidak lagi menampilkan dialog, sehingga satu-satunya jalan adalah pengaturan HP; tombol **Buka pengaturan** memanggil `Linking.openSettings()`.

**Berkas:** `src/features/scan/IzinKamera.tsx` (berkas baru: buat)

```tsx
import { Linking } from 'react-native';
import type { PermissionResponse } from 'expo-camera';

import { EmptyState, Screen, ScreenHeader } from '@/components';

type IzinKameraProps = {
  permission: PermissionResponse;
  onRequest: () => void;
};

// Layar penjelasan izin kamera. Alasannya dijelaskan dulu, baru sistem menampilkan dialog izin.
// Bila izin ditolak permanen (canAskAgain = false), Android tidak lagi menampilkan dialog,
// jadi satu-satunya jalan adalah pengaturan aplikasi.
export function IzinKamera({ permission, onRequest }: IzinKameraProps) {
  const blokir = !permission.granted && !permission.canAskAgain;

  return (
    <Screen scroll>
      <ScreenHeader title="Kamera" subtitle="Memotret halaman dokumen" />
      {blokir ? (
        <EmptyState
          icon="lock-closed-outline"
          title="Izin kamera dimatikan"
          description="Aktifkan kamera untuk Scannest di pengaturan HP: Izin, lalu Kamera, lalu Izinkan. Setelah itu kembali ke sini."
          actionLabel="Buka pengaturan"
          onAction={() => void Linking.openSettings()}
        />
      ) : (
        <EmptyState
          icon="camera-outline"
          title="Scannest butuh akses kamera"
          description="Kamera hanya dipakai saat kamu memotret dokumen. Tidak ada rekaman di latar belakang."
          actionLabel="Izinkan kamera"
          onAction={onRequest}
        />
      )}
    </Screen>
  );
}
```

### 8.2 `src/features/scan/KameraScan.tsx`

**Berkas:** `src/features/scan/KameraScan.tsx` (berkas baru: buat)

```tsx
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions, type FlashMode } from 'expo-camera';
import { useEffect, useRef, useState } from 'react';
import { AppState, Pressable, StyleSheet, Text, View } from 'react-native';

import { Banner, IconButton, LoadingScreen, Screen } from '@/components';
import { colors, minTouchSize, radius, spacing, typography } from '@/theme';

import { IzinKamera } from './IzinKamera';
import type { FotoMentah } from './normalisasi';

type KameraScanProps = {
  /** false saat layar tidak sedang dilihat: kamera dilepas (hanya satu pratinjau boleh aktif). */
  aktif: boolean;
  flash: FlashMode;
  onFlashChange: (flash: FlashMode) => void;
  grid: boolean;
  onGridChange: (grid: boolean) => void;
  jumlahHalaman: number;
  /** true: sesi sudah penuh, tombol jepret dinonaktifkan. */
  penuh: boolean;
  onFoto: (foto: FotoMentah) => void;
  /** Pindah ke daftar halaman sesi. */
  onLihatDaftar: () => void;
};

const urutanFlash: FlashMode[] = ['off', 'on', 'auto'];
const labelFlash: Record<FlashMode, string> = {
  off: 'Flash mati',
  on: 'Flash hidup',
  auto: 'Flash otomatis',
};
const ikonFlash = { off: 'flash-off', on: 'flash', auto: 'flash-outline' } as const;

export function KameraScan(props: KameraScanProps) {
  const [permission, requestPermission, getPermission] = useCameraPermissions();
  const granted = permission?.granted ?? false;

  // Kembali dari pengaturan HP: cek ulang izin tanpa menunggu pengguna menekan apa pun.
  useEffect(() => {
    if (granted) return;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void getPermission();
    });
    return () => sub.remove();
  }, [granted, getPermission]);

  if (!permission) return <LoadingScreen message="Menyiapkan kamera..." />;
  if (!permission.granted) {
    return <IzinKamera permission={permission} onRequest={() => void requestPermission()} />;
  }
  return <Pratinjau {...props} />;
}

// Dipasang hanya saat izin sudah ada; state `siap` otomatis kembali false tiap kamera dipasang ulang.
function Pratinjau({
  aktif,
  flash,
  onFlashChange,
  grid,
  onGridChange,
  jumlahHalaman,
  penuh,
  onFoto,
  onLihatDaftar,
}: KameraScanProps) {
  const cameraRef = useRef<CameraView>(null);
  const [siap, setSiap] = useState(false);
  const [mengambil, setMengambil] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);

  const ganti = () => {
    const berikut = urutanFlash[(urutanFlash.indexOf(flash) + 1) % urutanFlash.length];
    onFlashChange(berikut);
  };

  const jepret = async () => {
    // Tunggu kamera siap dan cegah dua jepretan bersamaan akibat ketukan ganda.
    if (!siap || mengambil || penuh) return;
    setMengambil(true);
    setGalat(null);
    try {
      // skipProcessing sengaja tidak diisi: tanpa itu expo-camera memutar piksel sesuai
      // orientasi perangkat, sehingga foto portrait dan landscape tegak.
      const foto = await cameraRef.current?.takePictureAsync({ quality: 1, exif: false });
      if (!foto) throw new Error('Kamera tidak mengembalikan foto.');
      onFoto({ uri: foto.uri, width: foto.width, height: foto.height });
    } catch {
      setGalat('Foto belum berhasil diambil. Coba jepret lagi.');
    } finally {
      setMengambil(false);
    }
  };

  return (
    <Screen padded={false}>
      <View style={styles.preview}>
        {aktif ? (
          <CameraView
            ref={cameraRef}
            style={StyleSheet.absoluteFill}
            facing="back"
            flash={flash}
            onCameraReady={() => setSiap(true)}
            onMountError={() =>
              setGalat('Kamera tidak bisa dibuka. Tutup aplikasi lain yang memakai kamera.')
            }
          />
        ) : null}

        {grid ? (
          <View pointerEvents="none" style={StyleSheet.absoluteFill}>
            <View style={[styles.garisH, { top: '33.33%' }]} />
            <View style={[styles.garisH, { top: '66.66%' }]} />
            <View style={[styles.garisV, { left: '33.33%' }]} />
            <View style={[styles.garisV, { left: '66.66%' }]} />
          </View>
        ) : null}

        <View style={styles.atas}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${labelFlash[flash]}. Ketuk untuk mengganti.`}
            onPress={ganti}
            style={styles.pil}
          >
            <Ionicons name={ikonFlash[flash]} size={20} color={colors.onScrim} />
            <Text style={styles.pilTeks}>{labelFlash[flash]}</Text>
          </Pressable>
          <IconButton
            icon={grid ? 'grid' : 'grid-outline'}
            label={grid ? 'Sembunyikan grid' : 'Tampilkan grid'}
            tone="scrim"
            onPress={() => onGridChange(!grid)}
          />
        </View>
      </View>

      {galat ? (
        <View style={styles.banner}>
          <Banner message={galat} />
        </View>
      ) : null}

      <View style={styles.bawah}>
        <View style={styles.sisi}>
          {jumlahHalaman > 0 ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Lihat ${jumlahHalaman} halaman`}
              onPress={onLihatDaftar}
              style={styles.hitung}
            >
              <Ionicons name="images-outline" size={22} color={colors.primary} />
              <Text style={styles.hitungTeks}>{jumlahHalaman}</Text>
            </Pressable>
          ) : null}
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={penuh ? 'Sesi penuh' : 'Jepret'}
          accessibilityState={{ disabled: !siap || mengambil || penuh, busy: mengambil }}
          disabled={!siap || mengambil || penuh}
          onPress={() => void jepret()}
          style={({ pressed }) => [
            styles.jepretLuar,
            (!siap || penuh) && styles.mati,
            pressed && styles.ditekan,
          ]}
        >
          <View style={[styles.jepretDalam, mengambil && styles.jepretProses]} />
        </Pressable>

        <View style={styles.sisi} />
      </View>
    </Screen>
  );
}

const GARIS = 'rgba(255,255,255,0.75)';

const styles = StyleSheet.create({
  preview: {
    flex: 1,
    margin: spacing.lg,
    marginBottom: spacing.sm,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.scrim,
  },
  garisH: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: GARIS },
  garisV: { position: 'absolute', top: 0, bottom: 0, width: 1, backgroundColor: GARIS },
  atas: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pil: {
    minHeight: minTouchSize,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    backgroundColor: colors.scrim,
  },
  pilTeks: { ...typography.bodyStrong, color: colors.onScrim },
  banner: { marginHorizontal: spacing.lg, marginBottom: spacing.sm },
  bawah: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
    paddingTop: spacing.sm,
  },
  sisi: { width: 72, alignItems: 'flex-start' },
  hitung: {
    minHeight: minTouchSize,
    minWidth: minTouchSize,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
  },
  hitungTeks: { ...typography.bodyStrong, color: colors.primary },
  jepretLuar: {
    width: 76,
    height: 76,
    borderRadius: radius.pill,
    borderWidth: 4,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  jepretDalam: {
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
  jepretProses: { opacity: 0.5 },
  mati: { opacity: 0.4 },
  ditekan: { opacity: 0.85 },
});
```

### 8.3 Cara kerjanya

| Bagian | Penjelasan |
|---|---|
| `useCameraPermissions()` | Mengembalikan `[permission, requestPermission, getPermission]`. `permission` bernilai `null` selama izin sedang dicek (layar "Menyiapkan kamera..."). |
| Effect `AppState` | Saat pengguna kembali dari pengaturan HP (aplikasi `active` lagi), izin dicek ulang otomatis; kamera langsung tampil tanpa menekan apa pun. |
| `Pratinjau` terpisah | Dipasang hanya setelah izin ada. State `siap` (`onCameraReady`) otomatis kembali `false` tiap kamera dipasang ulang, jadi tombol jepret tidak aktif sebelum kamera siap. |
| `aktif` | Dari layar Kamera: `true` hanya selagi layar itu terlihat. Bila `false`, `CameraView` tidak dirender sama sekali. Dokumentasi Expo menyebut hanya satu pratinjau kamera boleh aktif. |
| `jepret` | Menolak bila belum siap, sedang memotret, atau sesi penuh (mencegah ketukan ganda). `quality: 1`, **tanpa** `skipProcessing`, `exif: false`. Hasilnya `{ uri, width, height }` dikirim ke layar induk lewat `onFoto`. |
| Flash | `flash` adalah mode untuk jepretan (`off`, `on`, `auto`), berputar tiap ketuk dengan label teks supaya tidak bergantung pada ikon saja. Senter terus-menerus (`enableTorch`) sengaja tidak dipakai. |
| Grid | Dua garis tegak dan dua garis datar (sepertiga) sebagai panduan meluruskan dokumen. Bisa disembunyikan. |
| Lencana jumlah halaman | Muncul bila sesi sudah berisi halaman; membuka daftar halaman. |
| Galat | `onMountError` dan kegagalan `takePictureAsync` menampilkan `Banner` dengan pesan yang bisa ditindaklanjuti. |

> **Catatan perilaku web.** Di peramban, versi web `expo-camera` baru bisa memotret setelah video punya cukup data, sedangkan `onCameraReady` sudah menyala sebelum itu. Jadi di web, jepretan yang terlalu cepat setelah kamera dipasang ulang bisa gagal sekali dengan pesan "Coba jepret lagi". Ini perilaku web, bukan Android; aplikasi ini ditargetkan ke Android.

---

## 9. Tugas 4.7: layar tinjau dan daftar halaman

### 9.1 `src/features/scan/TinjauFoto.tsx`

**Berkas:** `src/features/scan/TinjauFoto.tsx` (berkas baru: buat)

```tsx
import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { Banner, Button, Screen } from '@/components';
import { colors, radius, spacing } from '@/theme';

import type { FotoMentah } from './normalisasi';

type TinjauFotoProps = {
  foto: FotoMentah;
  /** true selagi foto diperkecil dan disimpan ulang. */
  memproses: boolean;
  galat: string | null;
  onPakai: () => void;
  onUlang: () => void;
};

// Layar tinjau: pengguna menilai ketajaman dan keterbacaan sebelum foto masuk sesi.
export function TinjauFoto({ foto, memproses, galat, onPakai, onUlang }: TinjauFotoProps) {
  return (
    <Screen padded={false}>
      <View style={styles.frame}>
        <Image
          source={{ uri: foto.uri }}
          style={StyleSheet.absoluteFill}
          contentFit="contain"
          accessibilityLabel="Pratinjau foto dokumen"
        />
      </View>
      {galat ? (
        <View style={styles.banner}>
          <Banner message={galat} />
        </View>
      ) : null}
      <View style={styles.aksi}>
        <View style={styles.tombol}>
          <Button
            title="Ulang"
            variant="secondary"
            fullWidth
            disabled={memproses}
            onPress={onUlang}
          />
        </View>
        <View style={styles.tombol}>
          <Button title="Pakai foto" fullWidth loading={memproses} onPress={onPakai} />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  frame: {
    flex: 1,
    margin: spacing.lg,
    marginBottom: spacing.sm,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.scrim,
  },
  banner: { marginHorizontal: spacing.lg, marginBottom: spacing.sm },
  aksi: { flexDirection: 'row', gap: spacing.md, padding: spacing.lg, paddingTop: spacing.sm },
  tombol: { flex: 1 },
});
```

Foto ditampilkan dengan `contentFit="contain"` (utuh, tidak terpotong) supaya kamu menilai ketajaman dan keterbacaan sebelum menekan **Pakai foto**. Selama normalisasi berjalan, **Pakai foto** menampilkan spinner dan **Ulang** dinonaktifkan.

### 9.2 `src/features/scan/DaftarHalaman.tsx`

**Berkas:** `src/features/scan/DaftarHalaman.tsx` (berkas baru: buat)

```tsx
import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Banner, Button, Card, IconButton, Screen, ScreenHeader } from '@/components';
import { colors, radius, spacing, typography } from '@/theme';

import type { HalamanScan } from './ScanSessionProvider';
import { HALAMAN_MAKS } from './ukuran';

type DaftarHalamanProps = {
  pages: HalamanScan[];
  isFull: boolean;
  onTambah: () => void;
  onHapus: (id: string) => void;
  onGeser: (id: string, direction: -1 | 1) => void;
  onMulaiUlang: () => void;
};

// Konfirmasi dibuat inline (bukan Alert) supaya konsisten di semua platform dan bisa diuji.
type Konfirmasi = { jenis: 'halaman'; id: string } | { jenis: 'sesi' } | null;

export function DaftarHalaman({
  pages,
  isFull,
  onTambah,
  onHapus,
  onGeser,
  onMulaiUlang,
}: DaftarHalamanProps) {
  const [konfirmasi, setKonfirmasi] = useState<Konfirmasi>(null);

  return (
    <Screen scroll>
      <ScreenHeader title="Halaman scan" subtitle={`${pages.length} halaman dalam sesi ini`} />

      {isFull ? (
        <Banner
          variant="info"
          message={`Sesi sudah berisi ${HALAMAN_MAKS} halaman, batas maksimum.`}
        />
      ) : null}

      <Button title="Tambah halaman" fullWidth disabled={isFull} onPress={onTambah} />

      {pages.map((page, index) => {
        const menghapus = konfirmasi?.jenis === 'halaman' && konfirmasi.id === page.id;
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
              </View>
            </View>

            {menghapus ? (
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
                  disabled={index === 0}
                  onPress={() => onGeser(page.id, -1)}
                />
                <IconButton
                  icon="arrow-down"
                  label={`Pindahkan halaman ${index + 1} ke bawah`}
                  disabled={index === pages.length - 1}
                  onPress={() => onGeser(page.id, 1)}
                />
                <IconButton
                  icon="trash-outline"
                  label={`Hapus halaman ${index + 1}`}
                  tone="danger"
                  onPress={() => setKonfirmasi({ jenis: 'halaman', id: page.id })}
                />
              </View>
            )}
          </Card>
        );
      })}

      <Card>
        <Text style={styles.catatan}>
          Halaman ini baru ada di HP. Menyimpannya sebagai dokumen (unggah ke cloud) hadir di Fase
          5.
        </Text>
        {konfirmasi?.jenis === 'sesi' ? (
          <View style={styles.konfirmasi}>
            <Text style={styles.tanya}>Buang semua {pages.length} halaman?</Text>
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
                  title="Buang semua"
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
            onPress={() => setKonfirmasi({ jenis: 'sesi' })}
          />
        )}
      </Card>
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
| **Tambah halaman** | Kembali ke kamera. Nonaktif dan diberi `Banner` bila sesi sudah 30 halaman. |
| Gambar mini dan ukuran | Gambar mini memakai berkas hasil normalisasi; teks `lebar × tinggi px` memudahkanmu memeriksa hasil normalisasi (portrait biasanya `2000 × 2667` atau `2000 × 3556`). |
| Tombol naik, turun, hapus | `IconButton` 48 dp dengan label per halaman ("Pindahkan halaman 2 ke atas"). Naik nonaktif di halaman pertama, turun nonaktif di halaman terakhir. |
| Konfirmasi hapus | Dibuat **inline** ("Hapus halaman ini?" dengan **Batal** dan **Hapus**), bukan `Alert`, agar konsisten, bisa diuji, dan tidak bergantung platform. |
| **Mulai sesi baru** | Konfirmasi "Buang semua N halaman?" lalu mengosongkan sesi. |
| Catatan Fase 5 | Menegaskan bahwa halaman baru ada di HP; menyimpannya sebagai dokumen hadir di Fase 5. |

### 9.3 `src/features/scan/index.ts`

**Berkas:** `src/features/scan/index.ts` (berkas baru: buat)

```ts
export { DaftarHalaman } from './DaftarHalaman';
export { KameraScan } from './KameraScan';
export { normalisasiFoto } from './normalisasi';
export type { FotoMentah, FotoNormal } from './normalisasi';
export { ScanSessionProvider, useScanSession } from './ScanSessionProvider';
export type { HalamanScan } from './ScanSessionProvider';
export { TinjauFoto } from './TinjauFoto';
export { HALAMAN_MAKS, KUALITAS_JPEG, LEBAR_MAKS, ukuranTarget } from './ukuran';
```

---

## 10. Tugas 4.8: merakit layar Kamera dan Dashboard

### 10.1 `app/(tabs)/kamera.tsx`

Menggantikan `PlaceholderScreen`. Layar ini hanyalah **mesin tiga tahap**: `kamera`, `tinjau`, `daftar`.

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
  type FotoMentah,
} from '@/features/scan';

type Tahap = 'kamera' | 'tinjau' | 'daftar';

export default function KameraScreen() {
  const { pages, isFull, addPage, removePage, movePage, clear } = useScanSession();

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

| Bagian | Penjelasan |
|---|---|
| `tahap` awal | `daftar` bila sesi sudah berisi halaman, selain itu `kamera`. |
| `useFocusEffect` + `fokus` | Layar tab tetap terpasang saat kamu pindah tab. Dengan melacak fokus sendiri, kamera hanya dipasang saat tab Kamera terlihat. |
| `tampil` (turunan) | Daftar kosong (halaman terakhir dihapus atau sesi dibuang) otomatis kembali ke kamera; tahap `tinjau` tanpa foto juga kembali ke kamera. Tidak butuh effect tambahan. |
| `pakaiFoto` | Menormalisasi, lalu `addPage`. Bila `addPage` mengembalikan `false` (penuh) atau normalisasi gagal, pesan tampil di layar tinjau dan fotonya tidak hilang, jadi bisa dicoba lagi. |
| `flash` dan `grid` | Disimpan di layar ini (bukan di `KameraScan`) agar pilihanmu bertahan saat berpindah antara kamera dan tinjau. |

### 10.2 `app/_layout.tsx`

Bungkus navigator dengan `ScanSessionProvider`, **di dalam** `AuthProvider` (provider sesi memakai `useAuth`).

**Berkas:** `app/_layout.tsx` (berkas lama: ganti seluruh isinya)

```tsx
import { Nunito_400Regular, Nunito_600SemiBold, Nunito_700Bold } from '@expo-google-fonts/nunito';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { LoadingScreen } from '@/components';
import { AuthProvider, ProfileErrorScreen, useAuth } from '@/features/auth';
import { ScanSessionProvider } from '@/features/scan';
import { stackScreenOptions } from '@/theme';

// Tahan splash screen sampai font dan status masuk selesai ditentukan, supaya layar masuk
// tidak sempat berkedip sebelum pengguna dipindahkan ke Dashboard.
SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
  });

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <ScanSessionProvider>
        <RootNavigator />
      </ScanSessionProvider>
    </AuthProvider>
  );
}

function RootNavigator() {
  const { status, isAdmin } = useAuth();

  useEffect(() => {
    if (status !== 'loading') {
      SplashScreen.hideAsync();
    }
  }, [status]);

  if (status === 'loading') {
    return <LoadingScreen />;
  }
  if (status === 'error') {
    return <ProfileErrorScreen />;
  }

  const isSignedIn = status === 'signedIn';

  // Stack.Protected: layar di dalamnya hanya bisa dibuka bila `guard` bernilai true. Bila nilainya
  // berubah (masuk atau keluar), expo-router memindahkan pengguna otomatis ke layar yang diizinkan.
  // Ini pembatas tampilan saja; keamanan data sebenarnya ada di RLS dan Edge Function.
  return (
    <Stack screenOptions={stackScreenOptions}>
      <Stack.Protected guard={isSignedIn}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="dokumen/[id]" options={{ title: 'Detail dokumen' }} />
        <Stack.Screen name="editor/[halamanId]" options={{ title: 'Editor' }} />
        <Stack.Protected guard={isAdmin}>
          <Stack.Screen name="admin" options={{ headerShown: false }} />
        </Stack.Protected>
      </Stack.Protected>
      <Stack.Protected guard={!isSignedIn}>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      </Stack.Protected>
    </Stack>
  );
}
```

### 10.3 `app/(tabs)/index.tsx` (Dashboard)

Bila ada sesi berjalan, Dashboard menampilkan kartu "Sesi scan berjalan" dengan tombol **Buka sesi scan**.

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

  return (
    <Screen scroll>
      <ScreenHeader title="Dashboard" subtitle="Semua dokumenmu ada di sini" />
      <AccountCard />
      {pages.length > 0 ? (
        <Card>
          <Text style={styles.judul}>Sesi scan berjalan</Text>
          <Text style={styles.isi}>
            {pages.length} halaman menunggu, belum disimpan sebagai dokumen.
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

## 11. Cek akhir kode

```bash
npm run typecheck
npm run lint
npm run format:check
npm run cek:kontras
```

Hasil yang benar: `typecheck` **0 galat**, `lint` tanpa temuan, `format:check` "All matched files use Prettier code style!", dan `cek:kontras` "Semua pasangan lulus" (16 pasangan). Bila `format:check` mengeluh, jalankan `npm run format` lalu ulangi.

Cek tidak ada warna mentah di komponen:

```bash
git grep -nE "#[0-9A-Fa-f]{6}" -- app src/components src/features
```

Hasil yang benar: **kosong**. (`src/theme/colors.ts` memang memuat warna, dan tidak ikut dicari.)

---

## 12. Tugas 4.9: uji di HP, commit, pull request

### 12.1 Jalankan

```bash
npx expo start --clear
```

Buka lewat Expo Go **SDK 54** di HP.

### 12.2 Daftar uji di HP

Centang satu per satu dan **laporkan hasilnya kepada saya**, terutama yang gagal. Uji nomor 7 sampai 9 adalah yang terpenting.

1. [ ] Ketuk tab **Kamera** pertama kali: muncul layar "Scannest butuh akses kamera", **belum** dialog sistem.
2. [ ] Ketuk **Izinkan kamera**: dialog sistem muncul; pilih **Tolak**. Layar penjelasan tetap tampil.
3. [ ] Ketuk **Izinkan kamera** lagi dan tolak sekali lagi (Android biasanya menandainya permanen): tampil "Izin kamera dimatikan" dan tombol **Buka pengaturan**. Tombol membuka pengaturan aplikasi; aktifkan kamera, kembali ke Scannest: kamera **langsung tampil** tanpa menekan apa pun.
4. [ ] Pratinjau kamera tampil penuh dalam bingkai membulat, grid sepertiga terlihat, tidak tertutup status bar.
5. [ ] Ketuk label flash: berganti **Flash mati → Flash hidup → Flash otomatis → Flash mati**. Dengan "Flash hidup", lampu menyala saat jepret.
6. [ ] Ketuk ikon grid: grid hilang dan muncul lagi.
7. [ ] **Portrait:** pegang HP tegak, foto selembar dokumen, ketuk jepret. Di layar tinjau foto **tegak** (teks terbaca normal, tidak miring). Ketuk **Pakai foto**: gambar mini di daftar juga tegak. Catat ukuran yang tertulis (biasanya `2000 × 2667` atau `2000 × 3556`).
8. [ ] **Landscape:** miringkan HP ke samping (kunci rotasi layar mati atau hidup, catat yang kamu pakai), foto dokumen. Hasilnya harus **tegak sesuai cara kamu memegang** dan tidak terbalik; ukuran biasanya `2000 × 1500`.
9. [ ] **Foto dengan HP agak diputar 180°** (kepala di bawah), satu kali: catat apakah hasilnya terbalik. Bila ada orientasi yang salah di nomor 7 sampai 9, kirimkan modelnya HP, versi Android, dan urutan arah memotretnya; ini bahan perbaikan di tugas lanjutan.
10. [ ] **Ulang** di layar tinjau: kembali ke kamera, tidak ada halaman baru.
11. [ ] Tambahkan 3 halaman (**Tambah halaman**): lencana angka di kamera naik 1, 2, 3 dan membuka daftar saat diketuk.
12. [ ] Geser halaman 3 ke atas, lalu halaman 1 ke bawah: urutan berubah sesuai, gambar mini ikut berpindah. Tombol naik di halaman pertama dan turun di halaman terakhir nonaktif.
13. [ ] Hapus satu halaman: muncul "Hapus halaman ini?"; **Batal** membatalkan, **Hapus** menghapus.
14. [ ] Pindah ke tab Dashboard: kartu "Sesi scan berjalan" menunjukkan jumlah halaman yang benar; **Buka sesi scan** kembali ke Kamera. Pindah tab bolak-balik beberapa kali: kamera tidak hitam atau macet.
15. [ ] **Mulai sesi baru → Buang semua**: kembali ke kamera tanpa lencana.
16. [ ] Tutup paksa aplikasi (geser dari daftar aplikasi) lalu buka lagi: sesi **kosong** (ini perilaku yang disengaja, K23).
17. [ ] Keluar dari akun lalu masuk lagi: tidak ada kartu sesi di Dashboard.
18. [ ] Tidak ada layar merah atau peringatan kuning baru selama pengujian.

### 12.3 Commit dan pull request

```bash
git status
git add .
git status
```

Baca daftar berkas: yang berubah harus berada di `src/`, `app/`, `scripts/`, `app.json`, `package.json`, `package-lock.json`, `ROADMAP.md`, dan `docs/`; **tidak ada** `.env` dan tidak ada berkas bernama aneh. Lalu:

```bash
git commit -m "feat(scan): kamera, tinjau foto, normalisasi, dan sesi scan"
git push -u origin fase-4-kamera
```

Buka pull request, tunggu **CI hijau**, **Merge**, lalu `git switch main` dan `git pull`. Centang tugas 4.0 sampai 4.9 di `ROADMAP.md` pada commit berikutnya.

---

## 13. Yang perlu diingat saat coding nanti

1. **Mengambil sesi scan di layar mana pun:** `const { pages, addPage, removePage, movePage, clear } = useScanSession();` dari `@/features/scan`.
2. **Hanya satu pratinjau kamera boleh aktif.** Jangan merender `CameraView` di dua layar sekaligus; pola `aktif` + `useFocusEffect` di atas wajib dipakai bila kamera dipakai di tempat lain.
3. **Jangan pernah menyimpan base64** di state, context, atau database (aturan 4.7). Simpan URI; Fase 5 membaca berkas dari URI itu saat mengunggah.
4. **Jangan memakai `skipProcessing: true`** pada `takePictureAsync` tanpa alasan kuat: ia melewati pemutaran orientasi bawaan.
5. **Plugin `app.json` tidak berlaku di Expo Go.** Teks izin buatan kita baru terlihat di APK (Fase 10).
6. **Berkas foto di cache belum dibersihkan** saat halaman dihapus atau sesi dibuang (backlog **B12**); Android membersihkan cache sendiri bila ruang menipis.
7. **Fase 5 mengunggah per halaman** segera setelah **Pakai foto**; di titik itu `addPage` akan dipanggil setelah unggah berhasil atau diberi status "menunggu unggah".
8. **Rasio pratinjau.** `CameraView` punya prop `ratio` (khusus Android, `4:3`, `16:9`, `1:1`) yang belum dipakai. Bila di HP-mu pratinjau tampak terpotong atau tidak cocok dengan hasil foto, laporkan; itu bahan penyesuaian berikutnya.

---

## 14. Pemecahan masalah

| Gejala | Kemungkinan penyebab dan solusi |
|---|---|
| Layar kamera hitam | Aplikasi lain sedang memakai kamera, atau izin belum diberikan. Tutup aplikasi kamera lain; periksa izin di pengaturan HP. Bila tab Kamera dibuka tepat setelah pindah dari tab lain, tunggu sesaat: kamera dipasang ulang saat tab kembali terlihat. |
| "Kamera tidak bisa dibuka" | `onMountError`: kamera dipakai aplikasi lain. Tutup aplikasi itu lalu buka ulang tab Kamera. |
| "Foto belum berhasil diambil. Coba jepret lagi." | Jepretan gagal sesaat (mis. kamera belum benar-benar siap). Ketuk jepret lagi. Bila selalu gagal, kirimkan tipe HP dan versi Android. |
| Tombol jepret tidak bisa ditekan | Kamera belum siap (tunggu sedetik) atau sesi sudah 30 halaman. |
| Dialog izin tidak muncul setelah menolak dua kali | Android menandai penolakan permanen. Pakai tombol **Buka pengaturan**, lalu aktifkan izin kamera. |
| Foto tampil miring atau terbalik | Catat HP, versi Android, dan cara memegang HP, lalu laporkan (uji 12.2 nomor 7 sampai 9). Sumber dugaannya ada di bagian 5.1. |
| `typecheck`: `Cannot find module '@/features/scan'` | Berkas `src/features/scan/index.ts` belum dibuat (bagian 9.3). |
| `typecheck`: `Property 'scrim' does not exist` | `src/theme/colors.ts` belum diganti dengan versi bagian 7.1. |
| `typecheck`: `Cannot find module 'expo-camera'` | Paket belum terpasang; jalankan perintah di bagian 3, lalu mulai ulang Metro. |
| `useScanSession harus dipakai di dalam ScanSessionProvider` | `app/_layout.tsx` belum dibungkus provider (bagian 10.2), atau provider berada di luar `AuthProvider`. |
| Peringatan "The `lock` option is deprecated" di konsol (muncul di peramban uji) | Peringatan dari `@supabase/supabase-js` 2.117.3; tidak menghalangi apa pun. Dicatat sebagai backlog **B13** untuk dievaluasi di Fase 9. |
| Nama berkas aneh muncul di `git status` | Kode tertempel ke terminal, bukan ke berkas. Hapus dengan `git rm` atau `del`; lihat `panduan-fase-1.md` bagian 3.0. |

---

## 15. Checklist akhir Fase 4

*Status 17 Oktober 2026: dicentang berdasarkan laporan pengguna bahwa seluruh panduan Fase 4 sudah dikerjakan. Hasil uji orientasi foto (12.2 nomor 7 sampai 9) belum dirinci; panduan Fase 5 bagian 2 menanyakannya.*

Sama dengan "Selesai bila" Fase 4 di `ROADMAP.md`.

- [x] Dokumen terbaru dan cabang `fase-4-kamera` siap (4.0)
- [x] `expo-camera` dan `expo-image-manipulator` terpasang lewat `npx expo install` (4.1)
- [x] Izin kamera dijelaskan dulu; bila ditolak permanen ada tombol ke pengaturan; teks izin dan `recordAudioAndroid: false` ada di `app.json` (4.2)
- [x] Foto dinormalisasi (lebar maksimum 2000, JPEG 0,85) dan tegak untuk portrait dan landscape di HP (4.3, uji 12.2 nomor 7 sampai 9)
- [x] Sesi scan: tambah, hapus, urutkan; hanya URI yang disimpan (4.4)
- [x] Kamera dengan jepret, flash tiga mode, dan grid (4.6); tinjau **Pakai foto** atau **Ulang** (4.7)
- [x] Kartu sesi di Dashboard; sesi tidak terbawa setelah keluar (4.8)
- [x] `typecheck`, `lint`, `format:check`, `cek:kontras` bersih; PR digabung dan CI hijau (4.9)

---

## 16. Daftar berkas Fase 4

| Berkas | Tugas | Status |
|---|---|---|
| `ROADMAP.md`, `docs/*.md` | 4.0 | diubah |
| `package.json`, `package-lock.json` | 4.1 | diubah (2 paket) |
| `app.json` | 4.2 | diubah (plugin `expo-camera`) |
| `src/features/scan/ukuran.ts` | 4.3 | baru |
| `src/features/scan/normalisasi.ts` | 4.3 | baru |
| `src/features/scan/ScanSessionProvider.tsx` | 4.4 | baru |
| `src/theme/colors.ts` | 4.5 | diubah (`scrim`, `onScrim`) |
| `scripts/cek-kontras.mjs` | 4.5 | diubah (16 pasangan) |
| `src/components/IconButton.tsx` | 4.5 | baru |
| `src/components/index.ts` | 4.5 | diubah |
| `src/features/scan/IzinKamera.tsx` | 4.2 | baru |
| `src/features/scan/KameraScan.tsx` | 4.6 | baru |
| `src/features/scan/TinjauFoto.tsx` | 4.7 | baru |
| `src/features/scan/DaftarHalaman.tsx` | 4.7 | baru |
| `src/features/scan/index.ts` | 4.7 | baru |
| `app/(tabs)/kamera.tsx` | 4.8 | diubah (menggantikan placeholder) |
| `app/_layout.tsx` | 4.8 | diubah (`ScanSessionProvider`) |
| `app/(tabs)/index.tsx` | 4.8 | diubah (kartu sesi) |

---

## 17. Sumber (diakses 16 Oktober 2026)

- Expo, Camera (SDK 54: `CameraView`, `useCameraPermissions`, `takePictureAsync`, plugin `app.json`): https://docs.expo.dev/versions/v54.0.0/sdk/camera/
- Expo, ImageManipulator (halaman terbaru memuat API kontekstual; tipe SDK 54 diperiksa langsung di `node_modules/expo-image-manipulator` versi 14.0.8): https://docs.expo.dev/versions/latest/sdk/imagemanipulator/
- Kode sumber paket terpasang: `expo-camera` (`ResolveTakenPicture.kt`), `expo-image-manipulator` (`ImageManipulatorModule.kt`, `ImageManipulatorModule.swift`), `expo-image-loader` (`ImageLoaderModule.kt`)
- Expo Router, hook `useFocusEffect` (efek dibungkus `useCallback`; pembersihannya jalan saat layar kehilangan fokus): https://docs.expo.dev/router/reference/hooks/
- WCAG 2.2, kontras: https://www.w3.org/TR/WCAG22/#contrast-minimum dan https://www.w3.org/TR/WCAG22/#non-text-contrast
- Cloudinary, upload preset dan batas transformasi masuk: https://cloudinary.com/documentation/upload_presets
