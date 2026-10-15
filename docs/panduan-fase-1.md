# Panduan Fase 1: Desain UI dan Kerangka Navigasi (Scannest)

**Untuk:** Nabil Fakhri Al Muiz · **Terakhir diperbarui:** 14 Oktober 2026 · **Sinkron dengan:** `ROADMAP.md` v0.7 (Fase 1, tugas 1.0 sampai 1.9)

Setelah Fase 1 selesai, aplikasimu punya wajah: palet krem dan sage yang konsisten, font Nunito, lima komponen dasar, tiga tab bawah (**Dashboard | Kamera | Percantik**), dan layar kerangka untuk **semua** rute yang akan diisi di fase berikutnya (login, daftar, detail dokumen, editor, empat layar admin). Belum ada fitur sungguhan. Itu disengaja: fondasinya dibuat dulu supaya Fase 3 sampai 8 tinggal mengisi.

Semua kode di panduan ini **diambil langsung dari berkas yang sudah saya uji**: `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm run cek:kontras`, dan bundling Android (`npx expo export --platform android`) semuanya lulus. Saya juga merender versi web-nya dan memeriksa tangkapan layar. **Yang belum bisa saya uji adalah di HP/emulator Android sungguhan**, jadi tugas 1.9 meminta kamu mengujinya dan melaporkan hasilnya.

---

## Daftar isi

1. Peta tugas dan hasil akhir
2. Keputusan desain dan perubahan dari roadmap lama
3. Tugas 1.0: persiapan (cabang, bersihkan template, alias `@/`)
4. Tugas 1.1: design tokens
5. Tugas 1.2: cek kontras warna
6. Tugas 1.3: font Nunito
7. Tugas 1.4: komponen dasar
8. Tugas 1.5: navigasi tab
9. Tugas 1.6: safe area dan edge-to-edge
10. Tugas 1.7: layar kerangka semua rute
11. Tugas 1.8: `app.json`
12. Tugas 1.9: uji, commit, pull request, dan Expo Go di HP
13. Pemecahan masalah
14. Checklist akhir Fase 1
15. Daftar berkas Fase 1
16. Sumber

---

## 1. Peta tugas dan hasil akhir

| Tugas | Isi | Bagian |
|---|---|---|
| 1.0 | Cabang kerja, hapus berkas demo template, ubah alias `@/` ke `src/` | 3 |
| 1.1 | Design tokens di `src/theme` (warna, jarak, radius, tipografi) | 4 |
| 1.2 | Cek rasio kontras dengan skrip (minimal 4,5:1) | 5 |
| 1.3 | Font Nunito lewat `@expo-google-fonts/nunito` | 6 |
| 1.4 | Komponen: `Button`, `Card`, `TextField`, `EmptyState`, `ScreenHeader` (+ `Screen`, `PlaceholderScreen`, `DevShortcuts`) | 7 |
| 1.5 | Tab bawah **Dashboard \| Kamera \| Percantik** | 8 |
| 1.6 | Safe area (edge-to-edge selalu aktif di SDK 54) | 9 |
| 1.7 | Layar kerangka untuk semua rute | 10 |
| 1.8 | Rapikan `app.json` (nama, tema terang, warna splash) | 11 |
| 1.9 | Uji, commit, pull request, CI hijau, uji di HP | 12 |

Struktur folder setelah Fase 1 (hanya bagian yang berubah):

```
scannest/
├─ app/
│  ├─ _layout.tsx                 # root: font, splash, Stack
│  ├─ +not-found.tsx              # halaman 404
│  ├─ (tabs)/  _layout.tsx  index.tsx  kamera.tsx  percantik.tsx
│  ├─ (auth)/  _layout.tsx  login.tsx  register.tsx
│  ├─ admin/   _layout.tsx  index.tsx  pengguna.tsx  dokumen.tsx  log.tsx
│  ├─ dokumen/[id].tsx
│  └─ editor/[halamanId].tsx
├─ src/
│  ├─ theme/       colors.ts  spacing.ts  typography.ts  navigation.ts  index.ts
│  └─ components/  Button  Card  TextField  EmptyState  ScreenHeader  Screen
│                  PlaceholderScreen  DevShortcuts  index.ts
└─ scripts/cek-kontras.mjs
```

---

## 2. Keputusan desain dan perubahan dari roadmap lama

Saat memverifikasi, saya menemukan beberapa hal di roadmap lama yang harus dikoreksi. Semuanya sudah dimasukkan ke `ROADMAP.md` (sejak v0.5).

| # | Keputusan | Alasan | Pro | Kontra |
|---|---|---|---|---|
| D1 | **Palet disesuaikan** agar lolos kontras. Sage `#6B8F71` menjadi `#4F7356`, teks redup `#8A7F78` menjadi `#6F645D`, bahaya `#C0553F` menjadi `#B04A35` | Saya hitung palet usulan lama: teks redup di latar krem hanya **3,62:1**, putih di atas sage **3,63:1**, sage di latar krem **3,37:1**. Semuanya di bawah 4,5:1 (batas WCAG untuk teks biasa) | Teks terbaca di bawah sinar matahari dan oleh pengguna berpenglihatan lemah | Hijau sedikit lebih tua, kesan "cozy" tetap terjaga |
| D2 | **Folder `admin/`, bukan grup `(admin)`** | Grup di `(...)` tidak masuk URL. `(admin)/index.tsx` dan `(tabs)/index.tsx` sama-sama menjadi `/`, dan Expo Router menganggap rute bersama itu sah, lalu memilih berdasarkan grup aktif atau urutan abjad ([dokumen](https://docs.expo.dev/router/advanced/shared-routes/)). Akibatnya Dashboard dan panel admin berpotensi tertukar tergantung cara layar dibuka | Rute admin pasti `/admin` | Tidak ada. Grup `(auth)` aman karena `/login` dan `/register` unik |
| D3 | **Alias `@/` menunjuk ke `src/`** (sebelumnya ke akar proyek) | Roadmap menaruh kode di `src/`. Impor menjadi `@/theme`, `@/components` | Impor pendek dan konsisten | Berkas template lama yang memakai `@/components/...` harus dihapus (dilakukan di 1.0) |
| D4 | **Tema terang saja** untuk v1 (`userInterfaceStyle: "light"`) | Mode gelap sudah ada di backlog sebagai B5 (P3, setelah v1.0.0). Menyiapkan dua palet sekarang melipatgandakan pekerjaan desain dan uji kontras | Satu palet, satu tampilan "cozy" | HP dengan mode gelap tetap menampilkan tema terang |
| D5 | **StyleSheet bawaan React Native**, tanpa pustaka UI (NativeWind, Tamagui, dan sejenisnya) | Hanya 8 komponen kecil. Tokens kita sendiri sudah cukup | Tanpa dependensi dan konfigurasi tambahan | Gaya ditulis manual |
| D6 | **Pintasan pengembangan** di Dashboard (hanya tampil saat `__DEV__`) | Layar login, admin, detail, dan editor belum punya jalan masuk dari UI. Tanpa pintasan, tugas 1.7 tidak bisa diuji di HP | Semua rute bisa dibuka dan dilihat | Harus dihapus di Fase 3 (sudah dicatat di roadmap) |
| D7 | Ikon pakai **Ionicons** dari `@expo/vector-icons` (sudah terpasang) | Ikon SF Symbols bawaan template hanya benar-benar native di iOS. Ionicons tampil sama di Android, iOS, dan web | Satu gaya ikon | Daftar ikon terbatas pada set Ionicons |

---

## 3. Tugas 1.0: persiapan

### 3.0 Cara membuat berkas (penting, baca dulu)

Setiap blok kode di panduan ini adalah **isi satu berkas**, dan setiap blok diberi label **Berkas:** berisi jalur lengkapnya, plus keterangan apakah berkas itu *baru* (buat) atau *lama* (ganti seluruh isinya). Cara mengerjakannya:

1. Di VS Code, klik kanan folder tujuan di panel Explorer, pilih **New File**, lalu ketik nama persis seperti di label (termasuk kurung `( )` dan kurung siku `[ ]`, misalnya `[id].tsx`).
2. Tempel isi blok kode di **editor** itu, lalu `Ctrl+S`.
3. Untuk berkas *lama*, pilih semua isinya (`Ctrl+A`), lalu tempel pengganti.

**Jangan menempel kode ke terminal.** Di CMD, tanda `>` berarti "alihkan keluaran ke berkas", sehingga baris seperti `onPress={() => router.push(item.href)}` membuat berkas kosong bernama `router.push(item.href)}`. Inilah yang kemungkinan besar terjadi pada repomu: saat saya mengecek, ada berkas nyasar bernama `(` dan `router.push(item.href)}` (keduanya 0 byte) yang ikut ter-commit di Fase 1, di samping `tatus` dan `h -u origin main` dari Fase 0. Hapus semuanya (CMD atau PowerShell):

```bash
git rm tatus "h -u origin main" "(" "router.push(item.href)}"
git commit -m "chore: hapus berkas nyasar"
git push
```

Bila Git menolak karena berkas sudah tidak ada atau salah ketik namanya, jalankan `git status` dan `git ls-files` untuk melihat nama yang tepat.

### 3.1 Prasyarat

- Tab **Actions** di repo sudah **hijau** (tugas 0.7). Bila masih merah, selesaikan dulu lewat `panduan-fase-0.md` bagian 6 (pemecahan masalah). Fase 1 akan memakai CI itu untuk memeriksa pekerjaanmu.
- Terminal berada di folder proyek (`C:\scannest`) dan `git status` bersih.

### 3.2 Buat cabang kerja

Mulai Fase 1, kita bekerja di cabang dan menggabungkannya lewat *pull request* (PR). Pro: CI memeriksa pekerjaanmu **sebelum** masuk `main`, dan riwayat repo rapi untuk portofolio. Kontra: ada 2 langkah tambahan di GitHub.

```bash
git switch main
git pull
git switch -c fase-1-ui
```

### 3.3 Hapus berkas demo template

Template berisi layar contoh (Home, Explore, modal) beserta komponen, hook, dan konstanta bawaannya. Semuanya akan digantikan, dan sebagian memakai alias `@/components/...` yang akan kita ubah. Hapus lewat Git supaya terlacak:

```bash
git rm -r components hooks constants scripts app/modal.tsx "app/(tabs)/explore.tsx"
npm pkg delete scripts.reset-project
```

Penjelasan: `git rm -r` menghapus folder dan mencatatnya di Git. `scripts/reset-project.js` ikut dihapus karena fungsinya (memindahkan berkas demo) sudah tidak kita perlukan, dan skrip `reset-project` di `package.json` dicabut dengan `npm pkg delete`. Kita akan membuat `scripts/` baru di tugas 1.2.

### 3.4 Ubah alias `@/` di `tsconfig.json`

Buka `tsconfig.json`, ubah satu baris di `paths`:

```json
"paths": {
  "@/*": ["./src/*"]
}
```

Artinya `import { colors } from '@/theme'` dibaca sebagai `./src/theme`. Bagian lain `tsconfig.json` (termasuk `"strict": true`) jangan diubah. Bila nanti `npm run format:check` mengeluh soal format `tsconfig.json` atau `app.json` (karena diedit tangan), jalankan `npm run format`. Expo membaca alias ini langsung dari `tsconfig.json`, jadi tidak perlu konfigurasi Babel tambahan.

### 3.5 Buat folder

```bash
mkdir src\theme src\components scripts
mkdir "app\(auth)" app\admin app\dokumen app\editor
```

(Perintah untuk CMD/PowerShell. macOS/Linux: `mkdir -p src/theme src/components scripts "app/(auth)" app/admin app/dokumen app/editor`.)

Untuk saat ini `npm run typecheck` akan menampilkan galat karena berkas lama sudah dihapus dan yang baru belum dibuat. Itu normal; kita selesaikan bertahap dan cek lagi di akhir bagian 4.

---

## 4. Tugas 1.1: design tokens

*Design tokens* adalah nilai desain yang diberi nama (warna, jarak, ukuran huruf) dan dipakai di seluruh aplikasi. Ubah satu nilai di sini, seluruh aplikasi ikut berubah. Aturan emas: **tidak ada kode warna atau angka jarak mentah di layar dan komponen**, selalu lewat tokens.

### 4.1 `src/theme/colors.ts`

**Berkas:** `src/theme/colors.ts` (berkas baru: buat)

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
} as const;

export type ColorName = keyof typeof colors;
```

| Bagian | Penjelasan |
|---|---|
| `background` `#FAF6F0` | Krem hangat untuk latar semua layar. |
| `surface` `#FFFFFF` | Putih untuk kartu, tab bar, dan kolom isian. Beda tipis dari krem sehingga kartu terlihat "terangkat". |
| `primary`, `primarySoft`, `onPrimary` | Aksen sage tua, versi lembutnya (untuk lingkaran ikon dan tombol sekunder), dan warna teks di atas aksen. |
| `text`, `textMuted` | Cokelat tua untuk teks utama, abu kecokelatan untuk teks pendukung. |
| `danger`, `dangerSoft`, `onDanger` | Merah bata untuk galat. `dangerSoft` disiapkan untuk latar pesan galat di fase berikutnya. |
| `border` | Garis halus kartu. Hanya hiasan, jadi tidak perlu lolos 3:1. |
| `inputBorder` | Garis kolom isian. Ini **batas komponen interaktif**, jadi minimal 3:1 (diuji di tugas 1.2). |
| `as const` | Membuat nilai menjadi literal tetap (misalnya `'#FAF6F0'`, bukan sekadar `string`), sehingga TypeScript menangkap salah ketik nama warna. |
| `ColorName` | Tipe berisi nama-nama warna, siap dipakai bila nanti butuh prop bertipe nama warna. |

### 4.2 `src/theme/spacing.ts`

**Berkas:** `src/theme/spacing.ts` (berkas baru: buat)

```ts
// Skala jarak kelipatan 4. Pakai nama, jangan angka mentah, di seluruh aplikasi.
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 20,
  pill: 999,
} as const;

// Ukuran sentuh minimum 48 dp (pedoman Android dan Material).
export const minTouchSize = 48;
```

| Bagian | Penjelasan |
|---|---|
| `spacing` | Skala jarak kelipatan 4 (4/8/12/16/24/32). Pakai `spacing.lg`, bukan `16`. |
| `radius` | Sudut membulat. `pill: 999` menghasilkan ujung bulat penuh (tombol). |
| `minTouchSize` | 48 dp, ukuran sentuh minimum yang dianjurkan Android. Dipakai tombol dan kolom isian. |

### 4.3 `src/theme/typography.ts`

**Berkas:** `src/theme/typography.ts` (berkas baru: buat)

```ts
// Nama font harus persis sama dengan kunci yang dimuat di app/_layout.tsx (useFonts).
export const fonts = {
  regular: 'Nunito_400Regular',
  semibold: 'Nunito_600SemiBold',
  bold: 'Nunito_700Bold',
} as const;

// Gaya teks siap pakai: ukuran dan tinggi baris dalam dp.
export const typography = {
  title: { fontFamily: fonts.bold, fontSize: 28, lineHeight: 34 },
  heading: { fontFamily: fonts.bold, fontSize: 20, lineHeight: 26 },
  body: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 24 },
  bodyStrong: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 24 },
  caption: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
  button: { fontFamily: fonts.bold, fontSize: 16, lineHeight: 22 },
} as const;
```

| Bagian | Penjelasan |
|---|---|
| `fonts` | Nama font **harus persis** sama dengan kunci di `useFonts` pada tugas 1.3 (`Nunito_400Regular`, dan seterusnya). Salah satu huruf saja, teks kembali ke font sistem. |
| `typography.title` dan seterusnya | Paket gaya teks: font, ukuran, dan `lineHeight` (tinggi baris). Dipakai dengan *spread*: `{ ...typography.body, color: colors.text }`. |
| `caption` 13 dp | Teks terkecil di aplikasi. Tidak ada yang di bawah 12 dp supaya tetap terbaca. |

### 4.4 `src/theme/navigation.ts`

**Berkas:** `src/theme/navigation.ts` (berkas baru: buat)

```ts
import { colors } from './colors';
import { fonts } from './typography';

// Opsi header yang dipakai semua Stack agar tampilannya seragam.
export const stackScreenOptions = {
  headerStyle: { backgroundColor: colors.background },
  headerTintColor: colors.text,
  headerTitleStyle: { fontFamily: fonts.bold, fontSize: 18 },
  headerShadowVisible: false,
  contentStyle: { backgroundColor: colors.background },
};
```

Satu objek opsi header yang dipakai semua `Stack` (root, auth, admin). Isinya: latar header sama dengan latar layar, ikon dan judul cokelat tua, judul memakai Nunito Bold, tanpa garis bayangan di bawah header (`headerShadowVisible: false`), dan `contentStyle` mewarnai latar layar supaya tidak ada kilatan putih saat berpindah layar.

### 4.5 `src/theme/index.ts`

**Berkas:** `src/theme/index.ts` (berkas baru: buat)

```ts
export { colors, type ColorName } from './colors';
export { minTouchSize, radius, spacing } from './spacing';
export { fonts, typography } from './typography';
export { stackScreenOptions } from './navigation';
```

Pintu masuk tunggal: layar cukup menulis `import { colors, spacing } from '@/theme'`. Perhatikan `type ColorName` di baris pertama: `export { ..., type ColorName }` mengekspor tipe tanpa ikut terbundel sebagai nilai.

### 4.6 Cek

```bash
npm run typecheck
```

**Hasil yang wajar di titik ini: `Found 9 errors in 3 files`** (4 di `app/(tabs)/_layout.tsx`, 4 di `app/(tabs)/index.tsx`, 1 di `app/_layout.tsx`). Semuanya berbunyi `Cannot find module '@/components/...'` (atau `@/constants/...`, `@/hooks/...`): tiga berkas lama itu masih mengimpor berkas template yang sudah kamu hapus di 1.0, dan akan kita ganti di bagian 6 dan 8. Yang harus **nol**: galat dari `src/theme/`. Daftar galat sementara untuk tiap tahap ada di bagian 13.1.

---

## 5. Tugas 1.2: cek kontras warna

**Mengapa penting:** WCAG 2.2 meminta rasio kontras minimal **4,5:1** untuk teks biasa dan **3:1** untuk komponen antarmuka seperti garis kolom isian dan ikon ([WCAG 1.4.3](https://www.w3.org/TR/WCAG22/#contrast-minimum), [1.4.11](https://www.w3.org/TR/WCAG22/#non-text-contrast)). Tema "cozy" cenderung memakai warna lembut, dan di situlah kontras sering tidak terpenuhi.

Skrip berikut membaca `src/theme/colors.ts` secara langsung (satu sumber kebenaran), menghitung rasio dengan rumus WCAG, dan gagal (kode keluar 1) bila ada pasangan di bawah batas.

### 5.1 `scripts/cek-kontras.mjs`

**Berkas:** `scripts/cek-kontras.mjs` (berkas baru: buat)

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
  ['Ikon aktif di tab bar', colors.primary, colors.surface, 3],
  ['Garis kolom isian', colors.inputBorder, colors.surface, 3],
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

| Bagian | Penjelasan |
|---|---|
| `import ... from '../src/theme/colors.ts'` | Node 22.18+ bisa membaca `.ts` langsung (tanpa kompilasi). Kamu memakai Node 24, jadi aman. |
| `luminance(hex)` | Mengubah `#RRGGBB` menjadi luminans relatif: tiap kanal dibagi 255, dilinearkan, lalu dibobot 0,2126 / 0,7152 / 0,0722 (mata paling peka pada hijau). |
| `contrast(a, b)` | `(terang + 0,05) / (gelap + 0,05)`. Hasil 1 (sama persis) sampai 21 (hitam di putih). |
| `checks` | Daftar pasangan yang benar-benar dipakai di komponen, dengan batas masing-masing. Tambahkan baris di sini bila kelak menambah pasangan warna baru. |
| `process.exit(...)` | Kode 1 bila ada yang gagal, supaya skrip ini bisa dipasang di CI kelak. |

### 5.2 Daftarkan skrip dan jalankan

```bash
npm pkg set scripts.cek:kontras="node scripts/cek-kontras.mjs"
npm run cek:kontras
```

Catatan: `npm pkg set` tidak mencetak apa pun, dan `npm run cek:kontras` mencetak tabel LULUS di bawah. Tulisan *Found N errors in M files* **bukan** keluaran kedua perintah itu, melainkan keluaran TypeScript (`npm run typecheck`). Bila kamu melihatnya di tahap ini, itu galat sementara yang wajar (9 galat, lihat bagian 13.1), bukan kesalahan di skrip kontras. Skrip `.mjs` memang tidak diperiksa TypeScript.

Hasil `npm run cek:kontras` yang diharapkan (nilai ini saya dapat saat menguji):

```
LULUS  12.00 (min 4.5)  Teks utama di latar
LULUS  12.92 (min 4.5)  Teks utama di kartu
LULUS   5.33 (min 4.5)  Teks redup di latar
LULUS   5.74 (min 4.5)  Teks redup di kartu
LULUS   5.36 (min 4.5)  Teks tombol utama
LULUS   4.71 (min 4.5)  Teks tombol sekunder
LULUS   4.98 (min 4.5)  Teks tombol ghost dan tautan
LULUS   5.42 (min 4.5)  Teks tombol bahaya
LULUS   5.03 (min 4.5)  Pesan galat di latar
LULUS   5.42 (min 4.5)  Pesan galat di kartu
LULUS   5.36 (min 3)  Ikon aktif di tab bar
LULUS   3.80 (min 3)  Garis kolom isian

Semua pasangan lulus.
```

Catatan jujur: skrip ini menguji pasangan warna, bukan keterbacaan sungguhan di layar HP. Cek juga dengan mata di bawah cahaya terang pada tugas 1.9.

---

## 6. Tugas 1.3: font Nunito

Nunito adalah font sans-serif berujung membulat yang cocok dengan kesan hangat. Paketnya dari `@expo-google-fonts/nunito` (versi 0.4.2 saat saya cek lewat `npm view`).

```bash
npx expo install @expo-google-fonts/nunito expo-font
```

`expo install` memilih versi yang cocok dengan SDK 54. Perintah ini juga menambahkan `"expo-font"` ke daftar `plugins` di `app.json`; biarkan.

### 6.1 `app/_layout.tsx` (root layout)

Ganti seluruh isi berkas ini:

**Berkas:** `app/_layout.tsx` (berkas lama: ganti seluruh isinya)

```tsx
import { Nunito_400Regular, Nunito_600SemiBold, Nunito_700Bold } from '@expo-google-fonts/nunito';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { stackScreenOptions } from '@/theme';

// Tahan splash screen sampai font selesai dimuat, supaya tidak ada kedipan font.
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

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={stackScreenOptions}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="admin" options={{ headerShown: false }} />
        <Stack.Screen name="dokumen/[id]" options={{ title: 'Detail dokumen' }} />
        <Stack.Screen name="editor/[halamanId]" options={{ title: 'Editor' }} />
      </Stack>
    </>
  );
}
```

| Bagian | Penjelasan |
|---|---|
| `SplashScreen.preventAutoHideAsync()` | Dipanggil di luar komponen, saat modul dimuat: menahan splash screen agar tidak hilang sebelum kita siap. |
| `unstable_settings.anchor` | Memberi tahu expo-router bahwa rute `(tabs)` adalah dasar tumpukan layar, jadi tombol kembali selalu berujung ke tab. |
| `useFonts({...})` | Memuat tiga bobot Nunito. Mengembalikan `[sudahDimuat, galat]`. |
| `useEffect` | Begitu font siap **atau** gagal dimuat, splash dilepas. Mengikutkan `fontError` penting: tanpanya, kegagalan memuat font membuat aplikasi macet di splash selamanya. |
| `if (!fontsLoaded && !fontError) return null` | Selama font belum siap, jangan render apa pun (splash masih menutupi layar). |
| `<StatusBar style="dark" />` | Ikon status bar gelap karena latar kita terang. |
| `<Stack screenOptions={stackScreenOptions}>` | Seluruh layar memakai gaya header dari tokens. |
| `(tabs)`, `(auth)`, `admin` → `headerShown: false` | Ketiganya punya header/tata letak sendiri. `dokumen/[id]` dan `editor/[halamanId]` memakai header bawaan Stack dengan judul yang ditetapkan. |

---

## 7. Tugas 1.4: komponen dasar

Delapan berkas di `src/components/`. Urutan pembuatan di bawah sudah memperhitungkan ketergantungan (yang dipakai komponen lain dibuat lebih dulu).

### 7.1 `Screen.tsx`: pembungkus layar (safe area + latar + padding)

**Berkas:** `src/components/Screen.tsx` (berkas baru: buat)

```tsx
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { colors, spacing } from '@/theme';

type ScreenProps = {
  children: ReactNode;
  /** true: isi bisa digulir (layar panjang atau berisi formulir). */
  scroll?: boolean;
  /** Sisi layar yang diberi jarak aman. Layar tab: ['top']. Layar dengan header bawaan: ['bottom']. */
  edges?: Edge[];
  /** false: tanpa padding bawaan (untuk konten tepi ke tepi). */
  padded?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
};

export function Screen({
  children,
  scroll = false,
  edges = ['top'],
  padded = true,
  contentStyle,
}: ScreenProps) {
  return (
    <SafeAreaView style={styles.root} edges={edges}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={[styles.scrollContent, padded && styles.padded, contentStyle]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.fill, padded && styles.padded, contentStyle]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  fill: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  padded: { padding: spacing.lg, gap: spacing.lg },
});
```

| Bagian | Penjelasan |
|---|---|
| `SafeAreaView` dari `react-native-safe-area-context` | Memberi jarak otomatis agar konten tidak tertutup status bar, poni kamera, atau tombol navigasi sistem. Ini yang disarankan dokumentasi Expo, bukan `SafeAreaView` bawaan React Native. |
| `edges` | Sisi mana yang diberi jarak. Bawaan `['top']` untuk layar tab (sisi bawah sudah ditangani tab bar). Layar dengan header bawaan memakai `['bottom']` (sisi atas sudah ditangani header). |
| `scroll` | `true` membungkus isi dengan `ScrollView` (layar panjang atau formulir). `keyboardShouldPersistTaps="handled"` membuat tombol tetap bisa ditekan saat keyboard terbuka. |
| `padded` | Padding 16 dan jarak antaranak 16 lewat `gap`. Matikan bila konten perlu tepi ke tepi. |
| `contentStyle` | Pintu keluar untuk gaya tambahan tanpa mengubah komponen. |

### 7.2 `ScreenHeader.tsx`: judul layar

**Berkas:** `src/components/ScreenHeader.tsx` (berkas baru: buat)

```tsx
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '@/theme';

type ScreenHeaderProps = {
  title: string;
  subtitle?: string;
  /** Elemen di sisi kanan, misalnya tombol kecil. */
  right?: ReactNode;
};

export function ScreenHeader({ title, subtitle, right }: ScreenHeaderProps) {
  return (
    <View style={styles.row}>
      <View style={styles.texts}>
        <Text accessibilityRole="header" style={styles.title}>
          {title}
        </Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {right ? <View>{right}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  texts: { flex: 1, gap: spacing.xs },
  title: { ...typography.title, color: colors.text },
  subtitle: { ...typography.body, color: colors.textMuted },
});
```

`accessibilityRole="header"` membuat pembaca layar (TalkBack) mengumumkan teks ini sebagai judul. `right` menyediakan slot untuk tombol kecil di kanan judul (dipakai di fase berikutnya).

### 7.3 `Card.tsx`: kartu

**Berkas:** `src/components/Card.tsx` (berkas baru: buat)

```tsx
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius, spacing } from '@/theme';

type CardProps = {
  children: ReactNode;
  /** Bila diisi, kartu bisa disentuh. */
  onPress?: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

export function Card({ children, onPress, accessibilityLabel, style }: CardProps) {
  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPress={onPress}
        android_ripple={{ color: colors.primarySoft }}
        style={({ pressed }) => [styles.card, pressed && styles.pressed, style]}
      >
        {children}
      </Pressable>
    );
  }
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
    shadowColor: colors.text,
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
    overflow: 'hidden',
  },
  pressed: { opacity: 0.85 },
});
```

| Bagian | Penjelasan |
|---|---|
| `onPress` opsional | Tanpa `onPress` kartu hanyalah `View`. Dengan `onPress` ia menjadi `Pressable` (bisa disentuh), lengkap dengan riak Android dan `accessibilityRole="button"`. |
| `shadow*` dan `elevation` | `shadow*` dipakai iOS, `elevation: 1` dipakai Android. Bayangan sangat tipis agar tetap "clean". |
| `overflow: 'hidden'` | Memotong riak sentuhan agar mengikuti sudut membulat. |

### 7.4 `Button.tsx`: tombol

**Berkas:** `src/components/Button.tsx` (berkas baru: buat)

```tsx
import { ActivityIndicator, Pressable, StyleSheet, Text, type ViewStyle } from 'react-native';

import { colors, minTouchSize, radius, spacing, typography } from '@/theme';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

type ButtonProps = {
  title: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  /** true: tampil spinner dan tombol tidak bisa disentuh. */
  loading?: boolean;
  disabled?: boolean;
  /** true: lebar penuh. Bawaan: selebar isinya. */
  fullWidth?: boolean;
};

const variantStyles: Record<ButtonVariant, { background: string; text: string }> = {
  primary: { background: colors.primary, text: colors.onPrimary },
  secondary: { background: colors.primarySoft, text: colors.primary },
  ghost: { background: 'transparent', text: colors.primary },
  danger: { background: colors.danger, text: colors.onDanger },
};

export function Button({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  fullWidth = false,
}: ButtonProps) {
  const inactive = disabled || loading;
  const palette = variantStyles[variant];
  const containerStyle: ViewStyle = {
    backgroundColor: palette.background,
    alignSelf: fullWidth ? 'stretch' : 'center',
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      android_ripple={{ color: 'rgba(0,0,0,0.12)' }}
      style={({ pressed }) => [
        styles.base,
        containerStyle,
        inactive && styles.inactive,
        pressed && styles.pressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.text} />
      ) : (
        <Text style={[styles.label, { color: palette.text }]}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: minTouchSize,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  label: { ...typography.button, textAlign: 'center' },
  inactive: { opacity: 0.5 },
  pressed: { opacity: 0.85 },
});
```

| Bagian | Penjelasan |
|---|---|
| `variant` | Empat gaya: `primary` (aksi utama), `secondary` (aksi pendukung), `ghost` (teks saja), `danger` (hapus dan semacamnya). Warnanya diambil dari `variantStyles`. |
| `loading` | Menampilkan spinner dan menonaktifkan tombol, supaya tidak terkirim dua kali. |
| `accessibilityState={{ disabled, busy }}` | Memberi tahu pembaca layar bahwa tombol nonaktif atau sedang bekerja. |
| `minHeight: minTouchSize` | Menjamin area sentuh minimal 48 dp. |
| `alignSelf: fullWidth ? 'stretch' : 'center'` | `fullWidth` melebarkan tombol penuh; selain itu tombol selebar isinya dan berada di tengah. |
| `opacity: 0.5` saat nonaktif | Komponen yang nonaktif memang dikecualikan dari aturan kontras WCAG. |

### 7.5 `TextField.tsx`: kolom isian

**Berkas:** `src/components/TextField.tsx` (berkas baru: buat)

```tsx
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { colors, minTouchSize, radius, spacing, typography } from '@/theme';

type TextFieldProps = Omit<TextInputProps, 'style'> & {
  label: string;
  /** Pesan galat. Bila ada, garis dan pesan berwarna danger. */
  error?: string;
  /** Petunjuk di bawah kolom (disembunyikan saat ada galat). */
  helper?: string;
};

export function TextField({
  label,
  error,
  helper,
  secureTextEntry,
  ...inputProps
}: TextFieldProps) {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);
  const isPassword = Boolean(secureTextEntry);

  const borderColor = error ? colors.danger : focused ? colors.primary : colors.inputBorder;

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.field, { borderColor, borderWidth: focused || error ? 2 : 1 }]}>
        <TextInput
          {...inputProps}
          accessibilityLabel={label}
          secureTextEntry={isPassword && hidden}
          placeholderTextColor={colors.textMuted}
          onFocus={(event) => {
            setFocused(true);
            inputProps.onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            inputProps.onBlur?.(event);
          }}
          style={styles.input}
        />
        {isPassword ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Tampilkan kata sandi' : 'Sembunyikan kata sandi'}
            onPress={() => setHidden((value) => !value)}
            hitSlop={8}
            style={styles.toggle}
          >
            <Ionicons
              name={hidden ? 'eye-outline' : 'eye-off-outline'}
              size={22}
              color={colors.textMuted}
            />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <Text accessibilityLiveRegion="polite" style={styles.error}>
          {error}
        </Text>
      ) : helper ? (
        <Text style={styles.helper}>{helper}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing.xs },
  label: { ...typography.bodyStrong, color: colors.text },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: minTouchSize,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
  },
  input: { flex: 1, ...typography.body, color: colors.text, paddingVertical: spacing.sm },
  toggle: { paddingLeft: spacing.sm },
  helper: { ...typography.caption, color: colors.textMuted },
  error: { ...typography.caption, color: colors.danger },
});
```

| Bagian | Penjelasan |
|---|---|
| `Omit<TextInputProps, 'style'>` | Menerima semua properti `TextInput` (keyboardType, autoComplete, dan seterusnya) kecuali `style`, karena gayanya dikendalikan komponen ini. |
| `focused` | Saat dipilih, garis menjadi hijau dan tebal (2 dp). Saat ada galat, garis merah. Warna tidak jadi satu-satunya penanda: galat juga punya teks. |
| `onFocus` / `onBlur` | Dibungkus supaya `onFocus` dan `onBlur` dari pemanggil tetap dijalankan. |
| `secureTextEntry` + tombol mata | Untuk kata sandi: ikon mata menampilkan atau menyembunyikan teks. `hitSlop={8}` memperluas area sentuh ikon. |
| `accessibilityLabel={label}` | TalkBack membacakan label kolom saat dipilih. |
| `accessibilityLiveRegion="polite"` | Pesan galat dibacakan otomatis saat muncul. |
| `helper` | Petunjuk di bawah kolom, disembunyikan saat ada galat. |

### 7.6 `EmptyState.tsx`: tampilan kosong

**Berkas:** `src/components/EmptyState.tsx` (berkas baru: buat)

```tsx
import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/theme';

import { Button } from './Button';

type EmptyStateProps = {
  icon: ComponentProps<typeof Ionicons>['name'];
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function EmptyState({ icon, title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <Ionicons name={icon} size={36} color={colors.primary} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      {actionLabel && onAction ? <Button title={actionLabel} onPress={onAction} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xxl },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { ...typography.heading, color: colors.text, textAlign: 'center' },
  description: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
    maxWidth: 320,
  },
});
```

Dipakai saat daftar belum berisi: lingkaran ikon, judul, deskripsi, dan tombol aksi opsional. `ComponentProps<typeof Ionicons>['name']` adalah tipe daftar nama ikon yang valid, jadi salah ketik nama ikon langsung ditandai TypeScript.

### 7.7 `PlaceholderScreen.tsx`: layar sementara

**Berkas:** `src/components/PlaceholderScreen.tsx` (berkas baru: buat)

```tsx
import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import type { Edge } from 'react-native-safe-area-context';

import { EmptyState } from './EmptyState';
import { Screen } from './Screen';
import { ScreenHeader } from './ScreenHeader';

type PlaceholderScreenProps = {
  icon: ComponentProps<typeof Ionicons>['name'];
  title: string;
  description: string;
  /** Fase roadmap yang akan mengisi layar ini, misalnya "Fase 4". */
  fase: string;
  /** true: tampilkan ScreenHeader (untuk layar tab). Layar Stack sudah punya header bawaan. */
  withHeader?: boolean;
  edges?: Edge[];
};

// Layar sementara. Setiap pemakainya diganti saat fase yang disebut `fase` dikerjakan.
export function PlaceholderScreen({
  icon,
  title,
  description,
  fase,
  withHeader = false,
  edges,
}: PlaceholderScreenProps) {
  return (
    <Screen scroll edges={edges}>
      {withHeader ? <ScreenHeader title={title} /> : null}
      <EmptyState icon={icon} title={`Segera hadir di ${fase}`} description={description} />
    </Screen>
  );
}
```

Satu komponen untuk semua layar kerangka, supaya tidak ada 11 berkas yang saling menyalin. Setiap pemakainya nanti diganti isinya pada fase yang disebut di prop `fase`.

### 7.8 `DevShortcuts.tsx`: pintasan pengembangan

**Berkas:** `src/components/DevShortcuts.tsx` (berkas baru: buat)

```tsx
import { useRouter, type Href } from 'expo-router';
import { StyleSheet, Text } from 'react-native';

import { colors, spacing, typography } from '@/theme';

import { Button } from './Button';
import { Card } from './Card';

type Shortcut = { label: string; href: Href };

const shortcuts: Shortcut[] = [
  { label: 'Login', href: '/login' },
  { label: 'Daftar', href: '/register' },
  { label: 'Detail dokumen (contoh)', href: '/dokumen/contoh' },
  { label: 'Editor (contoh)', href: '/editor/contoh' },
  { label: 'Admin: dashboard', href: '/admin' },
  { label: 'Admin: pengguna', href: '/admin/pengguna' },
  { label: 'Admin: dokumen', href: '/admin/dokumen' },
  { label: 'Admin: log aktivitas', href: '/admin/log' },
];

// Hanya tampil saat pengembangan (`__DEV__`). Dihapus di Fase 3 saat login dan peran aktif.
export function DevShortcuts() {
  const router = useRouter();

  return (
    <Card>
      <Text style={styles.title}>Pintasan pengembangan</Text>
      <Text style={styles.note}>Untuk menguji rute selama fase awal. Tidak tampil di rilis.</Text>
      {shortcuts.map((item) => (
        <Button
          key={item.label}
          title={item.label}
          variant="secondary"
          fullWidth
          onPress={() => router.push(item.href)}
        />
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.heading, color: colors.text },
  note: { ...typography.caption, color: colors.textMuted, marginBottom: spacing.sm },
});
```

| Bagian | Penjelasan |
|---|---|
| `Href` | Tipe alamat rute dari expo-router. Karena `typedRoutes` aktif di `app.json`, alamat yang salah ketik ditandai TypeScript. |
| `router.push(item.href)` | Membuka rute di atas tumpukan layar, sehingga tombol kembali berfungsi. |
| Dipakai hanya di `__DEV__` | Lihat `app/(tabs)/index.tsx` di bagian 8. **Hapus komponen ini di Fase 3.** |

### 7.9 `index.ts`: pintu masuk komponen

**Berkas:** `src/components/index.ts` (berkas baru: buat)

```ts
export { Button } from './Button';
export { Card } from './Card';
export { DevShortcuts } from './DevShortcuts';
export { EmptyState } from './EmptyState';
export { PlaceholderScreen } from './PlaceholderScreen';
export { Screen } from './Screen';
export { ScreenHeader } from './ScreenHeader';
export { TextField } from './TextField';
```

### 7.10 Cek

```bash
npm run typecheck
```

**Hasil yang wajar di titik ini: `Found 16 errors in 3 files`**:

| Berkas | Galat | Penyebab |
|---|---|---|
| `app/(tabs)/_layout.tsx` | 4 | Masih berkas template lama (impor `@/components/haptic-tab` dan sejenisnya). Diganti di bagian 8.1 |
| `app/(tabs)/index.tsx` | 4 | Sama, diganti di bagian 8.2 |
| `src/components/DevShortcuts.tsx` | 8 | Satu galat per alamat di daftar `shortcuts` (`/login`, `/register`, `/dokumen/contoh`, `/editor/contoh`, `/admin`, `/admin/pengguna`, `/admin/dokumen`, `/admin/log`). Karena `typedRoutes` aktif, TypeScript hanya menerima alamat yang **berkasnya sudah ada**, dan berkas-berkas rute itu baru dibuat di bagian 10. Selain itu daftar rute yang dikenal TypeScript (`.expo/types/router.d.ts`) masih mencatat rute template lama (`/modal`, `/explore`) sampai kamu menjalankan `npx expo start` di 10.5 |

Jadi galat di `DevShortcuts.tsx` **bukan** kesalahan kodenya. Sebelumnya saya menulis bahwa galat yang tersisa hanya di `app/`; itu keliru, karena saya menjalankan `typecheck` hanya setelah semua bagian selesai. Tabel lengkap per tahap ada di bagian 13.1.

---

## 8. Tugas 1.5: navigasi tab

### 8.1 `app/(tabs)/_layout.tsx`

Ganti seluruh isi berkas:

**Berkas:** `app/(tabs)/_layout.tsx` (berkas lama: ganti seluruh isinya)

```tsx
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';

import { colors, fonts } from '@/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

// Satu tempat untuk ikon tab: ikon terisi saat aktif, ikon garis saat tidak aktif.
// Ukuran dikunci 24 agar ikon dan label muat dalam tinggi tab bar bawaan (49 dp + area aman).
function tabIcon(active: IconName, inactive: IconName) {
  return function TabIcon({ color, focused }: { color: string; focused: boolean }) {
    return <Ionicons name={focused ? active : inactive} size={24} color={color} />;
  };
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarLabelStyle: { fontFamily: fonts.semibold, fontSize: 11, lineHeight: 13 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Dashboard', tabBarIcon: tabIcon('home', 'home-outline') }}
      />
      <Tabs.Screen
        name="kamera"
        options={{ title: 'Kamera', tabBarIcon: tabIcon('camera', 'camera-outline') }}
      />
      <Tabs.Screen
        name="percantik"
        options={{ title: 'Percantik', tabBarIcon: tabIcon('sparkles', 'sparkles-outline') }}
      />
    </Tabs>
  );
}
```

| Bagian | Penjelasan |
|---|---|
| `Tabs` | Komponen tab bawah dari expo-router. Tiap `Tabs.Screen name="..."` cocok dengan nama berkas di folder `(tabs)`. |
| `tabIcon(aktif, tidakAktif)` | Fungsi pembuat ikon: ikon terisi saat tab aktif, ikon garis saat tidak. |
| `size={24}` dikunci | Tinggi tab bar bawaan adalah 49 dp ditambah area aman, dengan padding 5 dp. Ikon 25 dp (bawaan) dan label font Nunito sempat membuat label terpotong saat saya uji di web; ikon 24 dp dengan label 11 dp (`lineHeight: 13`) muat. |
| `tabBarActiveTintColor` / `tabBarInactiveTintColor` | Hijau saat aktif, abu kecokelatan saat tidak. Keduanya lolos kontras terhadap latar putih tab bar. |
| `headerShown: false` | Header ditampilkan oleh layar sendiri (`ScreenHeader`). |

### 8.2 `app/(tabs)/index.tsx` (Dashboard)

**Berkas:** `app/(tabs)/index.tsx` (berkas lama: ganti seluruh isinya)

```tsx
import { useRouter } from 'expo-router';

import { DevShortcuts, EmptyState, Screen, ScreenHeader } from '@/components';

export default function DashboardScreen() {
  const router = useRouter();

  return (
    <Screen scroll>
      <ScreenHeader title="Dashboard" subtitle="Semua dokumenmu ada di sini" />
      <EmptyState
        icon="document-text-outline"
        title="Belum ada dokumen"
        description="Scan dokumen pertamamu lewat tab Kamera. Hasilnya akan muncul di sini."
        actionLabel="Mulai scan"
        onAction={() => router.navigate('/kamera')}
      />
      {__DEV__ ? <DevShortcuts /> : null}
    </Screen>
  );
}
```

| Bagian | Penjelasan |
|---|---|
| `useRouter()` | Pengendali navigasi. `router.navigate('/kamera')` berpindah ke tab Kamera. |
| `EmptyState` | Tampilan awal saat belum ada dokumen. Di Fase 7 ini diganti daftar dokumen. |
| `__DEV__ ? <DevShortcuts /> : null` | `__DEV__` bernilai `true` hanya saat `npm start` (mode pengembangan) dan `false` di build rilis, jadi pintasan tidak ikut terpublikasi. |

### 8.3 `app/(tabs)/kamera.tsx` dan `app/(tabs)/percantik.tsx`

**Berkas:** `app/(tabs)/kamera.tsx` (berkas baru: buat)

```tsx
import { PlaceholderScreen } from '@/components';

export default function KameraScreen() {
  return (
    <PlaceholderScreen
      withHeader
      icon="camera-outline"
      title="Kamera"
      fase="Fase 4"
      description="Di sini kamu akan memotret dokumen halaman demi halaman."
    />
  );
}
```

**Berkas:** `app/(tabs)/percantik.tsx` (berkas baru: buat)

```tsx
import { PlaceholderScreen } from '@/components';

export default function PercantikScreen() {
  return (
    <PlaceholderScreen
      withHeader
      icon="sparkles-outline"
      title="Percantik"
      fase="Fase 6"
      description="Di sini kamu akan merapikan hasil scan: crop, putar, dan efek dokumen."
    />
  );
}
```

Keduanya memakai `PlaceholderScreen` dengan `withHeader` (layar tab tidak punya header bawaan). Kamera diisi di Fase 4, Percantik di Fase 6.

### 8.4 Cek singkat

`npm run typecheck` kini menunjukkan **9 galat di 2 berkas**: 1 di `app/(tabs)/index.tsx` (alamat `'/kamera'`) dan 8 di `src/components/DevShortcuts.tsx`. Wajar: berkas rute lainnya baru dibuat di bagian 10 dan daftar rute TypeScript baru disegarkan di 10.5.

---

## 9. Tugas 1.6: safe area dan edge-to-edge

Pada SDK 54 mode **edge-to-edge** selalu aktif di Android: aplikasi digambar sampai ke bawah status bar dan di belakang tombol navigasi sistem. Bila konten tidak diberi jarak, teks bisa tertutup. Ringkasan pendekatan kita:

| Jenis layar | Penanganan |
|---|---|
| Layar tab (`(tabs)`) | `Screen` dengan `edges={['top']}` (bawaan). Tab bar bawaan menambahkan jarak bawah sendiri. |
| Layar dengan header Stack (`dokumen`, `editor`, `admin`, `+not-found`) | `edges={['bottom']}`. Header bawaan sudah menghindari status bar. |
| Layar penuh tanpa header (`login`, `register`) | `edges={['top', 'bottom']}`. |

`SafeAreaProvider` (pembungkus yang menghitung ukuran area aman) sudah dipasang otomatis oleh expo-router di akar aplikasi, jadi tidak perlu dipasang manual. Jangan memakai `SafeAreaView` dari `react-native` karena dokumentasi Expo merekomendasikan versi dari `react-native-safe-area-context` ([dokumen](https://docs.expo.dev/versions/v54.0.0/sdk/safe-area-context/)).

**Tidak ada kode baru di tugas ini**: semuanya sudah ada di `Screen` (bagian 7.1) dan `edges` pada setiap layar. Verifikasinya ada di tugas 1.9 (uji di HP).

---

## 10. Tugas 1.7: layar kerangka semua rute

Buat berkas-berkas berikut. Jalur berkas = alamat (rute) di aplikasi.

| Berkas | Rute | Diisi di |
|---|---|---|
| `app/(auth)/_layout.tsx` | grup auth | Fase 3 |
| `app/(auth)/login.tsx` | `/login` | Fase 3 |
| `app/(auth)/register.tsx` | `/register` | Fase 3 |
| `app/dokumen/[id].tsx` | `/dokumen/<id>` | Fase 7 |
| `app/editor/[halamanId].tsx` | `/editor/<halamanId>` | Fase 6 |
| `app/admin/_layout.tsx` | grup admin | Fase 8 |
| `app/admin/index.tsx` | `/admin` | Fase 8 |
| `app/admin/pengguna.tsx` | `/admin/pengguna` | Fase 8 |
| `app/admin/dokumen.tsx` | `/admin/dokumen` | Fase 8 |
| `app/admin/log.tsx` | `/admin/log` | Fase 8 |
| `app/+not-found.tsx` | alamat tak dikenal | tetap |

Nama berkas dengan `[kurung siku]` adalah **rute dinamis**: `[id]` menangkap bagian URL apa pun dan menyediakannya lewat `useLocalSearchParams`.

### 10.1 Grup auth

**Berkas:** `app/(auth)/_layout.tsx` (berkas baru: buat)

```tsx
import { Stack } from 'expo-router';

import { stackScreenOptions } from '@/theme';

export default function AuthLayout() {
  return <Stack screenOptions={{ ...stackScreenOptions, headerShown: false }} />;
}
```

**Berkas:** `app/(auth)/login.tsx` (berkas baru: buat)

```tsx
import { Link } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { Button, Screen, ScreenHeader, TextField } from '@/components';
import { colors, spacing, typography } from '@/theme';

// Kerangka tampilan saja. Validasi zod dan Supabase Auth dipasang di Fase 3.
export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState<string>();

  return (
    <Screen scroll edges={['top', 'bottom']}>
      <ScreenHeader title="Masuk" subtitle="Selamat datang kembali di Scannest" />
      <TextField
        label="Email"
        value={email}
        onChangeText={setEmail}
        error={emailError}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        placeholder="nama@email.com"
      />
      <TextField
        label="Kata sandi"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
        autoComplete="current-password"
        helper="Minimal 8 karakter"
      />
      <Button
        title="Masuk"
        fullWidth
        onPress={() => setEmailError(email.trim() ? undefined : 'Email wajib diisi')}
      />
      <Text style={styles.footer}>
        Belum punya akun?{' '}
        <Link href="/register" style={styles.link}>
          Daftar
        </Link>
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  footer: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  link: { fontFamily: typography.bodyStrong.fontFamily, color: colors.primary },
});
```

| Bagian | Penjelasan |
|---|---|
| `useState` untuk `email`, `password`, `emailError` | Hanya demonstrasi pemakaian `TextField` dan tampilan galatnya. Tombol Masuk menampilkan "Email wajib diisi" bila email kosong. **Belum ada login sungguhan**; validasi zod dan Supabase Auth dipasang di Fase 3. |
| `keyboardType="email-address"`, `autoCapitalize="none"`, `autoComplete="email"` | Keyboard khusus email, tanpa huruf kapital otomatis, dan saran isi otomatis dari sistem. |
| `<Link href="/register">` | Tautan antar layar. Karena `typedRoutes`, alamat salah ditandai TypeScript. |

**Berkas:** `app/(auth)/register.tsx` (berkas baru: buat)

```tsx
import { Link } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { Button, Screen, ScreenHeader, TextField } from '@/components';
import { colors, spacing, typography } from '@/theme';

// Kerangka tampilan saja. Validasi zod dan Supabase Auth dipasang di Fase 3.
export default function RegisterScreen() {
  const [nama, setNama] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <Screen scroll edges={['top', 'bottom']}>
      <ScreenHeader title="Daftar" subtitle="Buat akun untuk mulai memindai dokumen" />
      <TextField
        label="Nama"
        value={nama}
        onChangeText={setNama}
        autoComplete="name"
        placeholder="Nama lengkapmu"
      />
      <TextField
        label="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        placeholder="nama@email.com"
      />
      <TextField
        label="Kata sandi"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
        autoComplete="new-password"
        helper="Minimal 8 karakter"
      />
      <Button title="Buat akun" fullWidth />
      <Text style={styles.footer}>
        Sudah punya akun?{' '}
        <Link href="/login" style={styles.link}>
          Masuk
        </Link>
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  footer: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  link: { fontFamily: typography.bodyStrong.fontFamily, color: colors.primary },
});
```

### 10.2 Detail dokumen dan editor

**Berkas:** `app/dokumen/[id].tsx` (berkas baru: buat)

```tsx
import { useLocalSearchParams } from 'expo-router';

import { PlaceholderScreen } from '@/components';

export default function DokumenDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <PlaceholderScreen
      icon="documents-outline"
      title="Detail dokumen"
      fase="Fase 7"
      description={`Halaman-halaman dokumen "${id}" akan tampil di sini.`}
      edges={['bottom']}
    />
  );
}
```

**Berkas:** `app/editor/[halamanId].tsx` (berkas baru: buat)

```tsx
import { useLocalSearchParams } from 'expo-router';

import { PlaceholderScreen } from '@/components';

export default function EditorScreen() {
  const { halamanId } = useLocalSearchParams<{ halamanId: string }>();

  return (
    <PlaceholderScreen
      icon="color-wand-outline"
      title="Editor"
      fase="Fase 6"
      description={`Editor untuk halaman "${halamanId}" akan tampil di sini.`}
      edges={['bottom']}
    />
  );
}
```

`useLocalSearchParams<{ id: string }>()` membaca bagian dinamis dari URL. Di Fase 7, nilai `id` inilah yang dipakai untuk mengambil dokumen dari Supabase.

### 10.3 Grup admin

Folder bernama `admin` (bukan `(admin)`), alasannya di keputusan D2.

**Berkas:** `app/admin/_layout.tsx` (berkas baru: buat)

```tsx
import { Stack } from 'expo-router';

import { stackScreenOptions } from '@/theme';

// Folder biasa `admin` (bukan grup) agar URL-nya /admin dan tidak bentrok dengan Dashboard di "/".
// Pembatasan akses khusus admin dipasang di Fase 3.
export default function AdminLayout() {
  return (
    <Stack screenOptions={stackScreenOptions}>
      <Stack.Screen name="index" options={{ title: 'Panel admin' }} />
      <Stack.Screen name="pengguna" options={{ title: 'Pengguna' }} />
      <Stack.Screen name="dokumen" options={{ title: 'Dokumen' }} />
      <Stack.Screen name="log" options={{ title: 'Log aktivitas' }} />
    </Stack>
  );
}
```

**Berkas:** `app/admin/index.tsx` (berkas baru: buat)

```tsx
import { PlaceholderScreen } from '@/components';

export default function AdminDashboardScreen() {
  return (
    <PlaceholderScreen
      icon="shield-checkmark-outline"
      title="Panel admin"
      fase="Fase 8"
      description="Ringkasan jumlah pengguna dan dokumen akan tampil di sini."
      edges={['bottom']}
    />
  );
}
```

**Berkas:** `app/admin/pengguna.tsx` (berkas baru: buat)

```tsx
import { PlaceholderScreen } from '@/components';

export default function AdminPenggunaScreen() {
  return (
    <PlaceholderScreen
      icon="people-outline"
      title="Pengguna"
      fase="Fase 8"
      description="Daftar pengguna, serta aksi nonaktifkan dan aktifkan akun, akan tampil di sini."
      edges={['bottom']}
    />
  );
}
```

**Berkas:** `app/admin/dokumen.tsx` (berkas baru: buat)

```tsx
import { PlaceholderScreen } from '@/components';

export default function AdminDokumenScreen() {
  return (
    <PlaceholderScreen
      icon="folder-open-outline"
      title="Dokumen"
      fase="Fase 8"
      description="Semua dokumen dari seluruh pengguna akan tampil di sini (hanya baca)."
      edges={['bottom']}
    />
  );
}
```

**Berkas:** `app/admin/log.tsx` (berkas baru: buat)

```tsx
import { PlaceholderScreen } from '@/components';

export default function AdminLogScreen() {
  return (
    <PlaceholderScreen
      icon="time-outline"
      title="Log aktivitas"
      fase="Fase 8"
      description="Riwayat aksi admin akan tampil di sini."
      edges={['bottom']}
    />
  );
}
```

**Peringatan keamanan:** layar admin di Fase 1 **belum dilindungi**; siapa pun bisa membukanya lewat pintasan karena semuanya hanya kerangka kosong. Pembatasan akses (hanya peran `admin`) dipasang di Fase 3, dan keamanan sebenarnya ada di RLS dan Edge Function (Fase 2 dan 8), bukan di sembunyi-menyembunyikan layar.

### 10.4 Halaman tidak ditemukan

**Berkas:** `app/+not-found.tsx` (berkas baru: buat)

```tsx
import { Stack, useRouter } from 'expo-router';

import { EmptyState, Screen } from '@/components';

export default function NotFoundScreen() {
  const router = useRouter();

  return (
    <>
      <Stack.Screen options={{ title: 'Tidak ditemukan' }} />
      <Screen scroll edges={['bottom']}>
        <EmptyState
          icon="help-circle-outline"
          title="Halaman tidak ditemukan"
          description="Alamat yang kamu buka tidak ada di Scannest."
          actionLabel="Ke Dashboard"
          onAction={() => router.replace('/')}
        />
      </Screen>
    </>
  );
}
```

Nama `+not-found` khusus bagi expo-router: layar ini tampil untuk alamat yang tidak cocok dengan rute mana pun. `router.replace('/')` mengganti layar (bukan menumpuk) sehingga tombol kembali tidak membawa pengguna ke halaman galat.

### 10.5 Buat tipe rute, lalu cek

Fitur `typedRoutes` membuat berkas tipe `.expo/types/router.d.ts` saat Metro berjalan. Jalankan sekali:

```bash
npx expo start
```

Tunggu sampai muncul kode QR, lalu tekan `Ctrl+C`. Sebelum langkah ini, `typecheck` masih menunjukkan **11 galat** (1 di `login.tsx`, 1 di `register.tsx`, 1 di `index.tsx`, 8 di `DevShortcuts.tsx`), semuanya `Type '"/..."' is not assignable`, karena daftar rute TypeScript masih versi lama. Setelah `npx expo start` berjalan sekali, jalankan:

```bash
npm run typecheck
npm run lint
npm run format:check
```

**Hasil yang benar sekarang: 0 galat.** Bila `format:check` gagal, jalankan `npm run format` lalu cek ulang. Bila kamu menambah rute baru di fase berikutnya dan `typecheck` mengeluh bahwa alamat tidak dikenal, jalankan `npx expo start` sekali untuk menyegarkan berkas tipe. Berkas `.expo/` tidak ikut di-commit (ada di `.gitignore`); di CI, `typecheck` tetap lulus tanpanya (saya uji kedua keadaan).

---

## 11. Tugas 1.8: `app.json`

Tiga perubahan kecil di `app.json`:

| Kunci | Dari | Menjadi | Alasan |
|---|---|---|---|
| `expo.name` | `"scannest"` | `"Scannest"` | Nama yang tampil di bawah ikon aplikasi. Tugas 0.3 meminta huruf besar. |
| `expo.userInterfaceStyle` | `"automatic"` | `"light"` | Keputusan D4: tema terang saja. |
| `expo-splash-screen` → `backgroundColor` | `"#ffffff"` | `"#FAF6F0"` | Splash sewarna latar aplikasi. Hapus juga blok `"dark": { "backgroundColor": "#000000" }` di dalamnya. |

Hasil bagian terkait:

```json
[
  "expo-splash-screen",
  {
    "image": "./assets/images/splash-icon.png",
    "imageWidth": 200,
    "resizeMode": "contain",
    "backgroundColor": "#FAF6F0"
  }
]
```

Ikon dan gambar splash masih bawaan template. Ikon Scannest sendiri dibuat di Fase 10 (tertulis di roadmap), jadi biarkan dulu. Perubahan `app.json` baru terbaca setelah Metro dijalankan ulang (`Ctrl+C`, lalu `npm start`).

---

## 12. Tugas 1.9: uji, commit, pull request, dan Expo Go di HP

### 12.1 Jalankan di HP

Syarat HP: **Expo Go versi SDK 54** (lihat `panduan-fase-0.md` bagian 7 untuk caranya dan alasannya, karena Expo Go hanya mendukung **satu** SDK per versi). Singkatnya:

1. HP dan komputer di **Wi-Fi yang sama**.
2. Di komputer: `npm start`.
3. Di HP, buka **Expo Go** dan pilih pemindai kode QR di dalamnya, lalu pindai kode QR di terminal.
4. Bila gagal tersambung (Wi-Fi kampus atau kantor sering memblokir): `npx expo start --tunnel`.

### 12.2 Daftar uji di HP

Centang satu per satu dan **laporkan ke saya hasilnya**, terutama yang gagal. *(Status 14 Oktober 2026: dicentang berdasarkan laporanmu bahwa seluruh tugas Fase 1 selesai.)*

- [x] Splash berwarna krem, lalu Dashboard muncul dengan font Nunito (huruf berujung membulat, bukan font sistem).
- [x] Tiga tab tampil: Dashboard, Kamera, Percantik. Ikon dan label tidak terpotong. Tab aktif berwarna hijau.
- [x] Tombol **Mulai scan** di Dashboard membuka tab Kamera.
- [x] Judul layar tidak tertutup status bar atau poni kamera.
- [x] Tab bar dan konten tidak tertutup tombol navigasi sistem (tiga tombol atau garis gestur) di bawah layar.
- [x] Kartu "Pintasan pengembangan" tampil di Dashboard. Semua 8 tombolnya membuka layarnya, dan tombol kembali bekerja.
- [x] Layar admin: konten dan area bawah tidak tertutup tombol navigasi sistem.
- [x] Login: ketuk kolom Email, keyboard terbuka, kolom tidak tertutup keyboard. Bila tertutup, **catat saja**; penanganan keyboard dikerjakan di Fase 3 bersama formulir sungguhan.
- [x] Login: ikon mata menampilkan dan menyembunyikan kata sandi; tombol **Masuk** dengan email kosong memunculkan pesan merah.
- [x] Teks redup (abu kecokelatan) masih terbaca di bawah cahaya terang.

Catatan: perilaku edge-to-edge di Expo Go dan di APK hasil build bisa sedikit berbeda, jadi kita akan mengecek ulang di APK pada Fase 9. Hasil uji saya sendiri hanya di sandbox web, bukan HP.

### 12.2.1 Bila Expo Go menolak proyek

Pesan seperti *project is incompatible with this version of Expo Go* artinya versi Expo Go tidak sama dengan SDK proyek. Lihat `panduan-fase-0.md` bagian 7.

### 12.3 Commit, push, dan buka pull request

Pastikan dulu empat cek bersih:

```bash
npm run typecheck
npm run lint
npm run format:check
npm run cek:kontras
```

Lalu:

```bash
git status
git add -A
git commit -m "feat: kerangka UI Fase 1 (tokens, font, komponen, tab, layar placeholder)"
git push -u origin fase-1-ui
```

Baca `git status` sebelum `git add -A`: pastikan tidak ada berkas nyasar (berkas bernama potongan kode atau perintah, seperti `(`, `tatus`, atau `router.push(item.href)}`; lihat bagian 3.0) dan **tidak ada `.env`**.

Setelah push, GitHub menampilkan tombol **Compare & pull request** di halaman repo. Klik, beri judul "Fase 1: kerangka UI", lalu **Create pull request**. Di bagian bawah PR, kotak **Checks** akan menjalankan CI. Tunggu **hijau**, lalu klik **Merge pull request** dan **Confirm merge**. Kembali ke komputer:

```bash
git switch main
git pull
```

Centang tugas 1.0 sampai 1.9 di `ROADMAP.md` dan commit pembaruannya.

---

## 13. Pemecahan masalah

### 13.1 Galat typecheck sementara yang wajar (per tahap)

`npm run typecheck` memang menampilkan galat selama berkas belum lengkap. Jumlah di bawah saya ukur dengan mengulang panduan ini langkah demi langkah dari salinan repomu (dengan daftar rute TypeScript yang masih versi template, sama seperti keadaanmu setelah Fase 0). Dua jumlah pertama (9 dan 16) persis sama dengan yang kamu laporkan.

| Setelah bagian | Hasil `typecheck` | Rincian |
|---|---|---|
| 4 dan 5 (tokens, skrip kontras) | 9 galat, 3 berkas | `app/(tabs)/_layout.tsx` 4, `app/(tabs)/index.tsx` 4, `app/_layout.tsx` 1. Semua `Cannot find module '@/...'` dari berkas template lama |
| 6 dan 7 (font, komponen) | 16 galat, 3 berkas | `_layout.tsx` 4, `index.tsx` 4, `DevShortcuts.tsx` 8. Galat `app/_layout.tsx` hilang karena sudah diganti |
| 8 (tab) | 9 galat, 2 berkas | `index.tsx` 1 (`'/kamera'`), `DevShortcuts.tsx` 8 |
| 10 (semua rute), sebelum `npx expo start` | 11 galat, 4 berkas | `login.tsx` 1, `register.tsx` 1, `index.tsx` 1, `DevShortcuts.tsx` 8. Semua `Type '"/..."' is not assignable` |
| 10.5 (setelah `npx expo start`, `Ctrl+C`) | **0 galat** | Selesai |

Kapan galat **bukan** wajar: bila ada `Cannot find module '@expo-google-fonts/nunito'` (kamu lupa `npx expo install` di bagian 6), atau galat di `src/theme/` dan `src/components/` selain `DevShortcuts.tsx`, atau jumlahnya tetap setelah 10.5. Kirim saya teks galat persisnya.

### 13.2 Gejala lain

| Gejala | Penyebab dan solusi |
|---|---|
| `Cannot find module '@/theme'` | Alias belum diubah (bagian 3.4) atau editor belum memuat ulang `tsconfig.json`. Di VS Code: `Ctrl+Shift+P`, lalu **TypeScript: Restart TS Server**. |
| Teks tampil dengan font sistem, bukan Nunito | Nama font tidak cocok. Samakan `fonts` di `typography.ts` dengan kunci `useFonts` di `app/_layout.tsx` persis. |
| Aplikasi macet di splash | Font tidak selesai dimuat dan `fontError` tidak ikut diperiksa. Pastikan `useEffect` di root layout memeriksa `fontsLoaded \|\| fontError`. |
| `Property 'href' ... not assignable` untuk rute baru | Berkas tipe rute basi. Jalankan `npx expo start` sekali. |
| `ERROR  Unable to resolve "..."` | Berkas belum dibuat atau salah nama/huruf besar-kecil. Windows tidak membedakan huruf besar-kecil, tetapi **CI di Linux membedakan**. Samakan persis dengan panduan. |
| `typecheck` lulus lokal tetapi gagal di CI | Biasanya beda huruf besar-kecil pada nama berkas, atau berkas lupa di-`git add`. Cek `git ls-files`. |
| `format:check` gagal | Jalankan `npm run format`, lalu commit hasilnya. |
| `npm run cek:kontras` galat `Unknown file extension ".ts"` | Node di bawah 22.18. Cek `node -v`; kamu memakai 24, jadi seharusnya aman. |
| Dua layar dengan URL `/` bertabrakan | Jangan membuat `index.tsx` di dalam grup `(...)` lain selain `(tabs)`. Itu sebabnya admin memakai folder `admin`. |
| Layar putih setelah mengubah `app.json` | Metro belum dimuat ulang. `Ctrl+C`, lalu `npm start`. |

---

## 14. Checklist akhir Fase 1

Sama dengan "Selesai bila" Fase 1 di `ROADMAP.md`. **Status 14 Oktober 2026:** semua butir dicentang berdasarkan laporanmu.

- [x] Tab Actions pada PR hijau dan PR sudah digabung ke `main` (1.9)
- [x] `npm run typecheck`, `lint`, `format:check`, dan `cek:kontras` bersih (1.1 sampai 1.7)
- [x] Tiga tab bisa dibuka dan berfungsi di HP (1.5, 1.9)
- [x] Tampilan konsisten memakai tokens, tidak ada kode warna atau angka jarak mentah di `app/` dan `src/components/` (1.1)
- [x] Tidak ada teks tertutup status bar atau tombol navigasi (1.6, 1.9)
- [x] Semua rute di bagian 10 bisa dibuka lewat pintasan (1.7)
- [x] `app.json`: `name` = `Scannest`, `userInterfaceStyle` = `light` (1.8)

Tips memeriksa butir keempat:

```bash
git grep -nE "#[0-9A-Fa-f]{6}" -- app src/components
```

Hasil yang benar adalah **kosong** (semua warna ada di `src/theme/colors.ts`).

---

## 15. Daftar berkas Fase 1

| Berkas | Tugas | Status |
|---|---|---|
| `components/`, `hooks/`, `constants/`, `scripts/reset-project.js`, `app/modal.tsx`, `app/(tabs)/explore.tsx` | 1.0 | dihapus |
| `tsconfig.json` | 1.0 | diubah (alias `@/*` ke `./src/*`) |
| `src/theme/colors.ts`, `spacing.ts`, `typography.ts`, `navigation.ts`, `index.ts` | 1.1 | baru |
| `scripts/cek-kontras.mjs` | 1.2 | baru |
| `package.json`, `package-lock.json` | 1.0, 1.2, 1.3 | diubah (skrip `cek:kontras`, dependensi Nunito, skrip `reset-project` dicabut) |
| `app/_layout.tsx` | 1.3 | diganti |
| `src/components/*` (8 berkas + `index.ts`) | 1.4 | baru |
| `app/(tabs)/_layout.tsx`, `index.tsx`, `kamera.tsx`, `percantik.tsx` | 1.5 | diganti dan baru |
| `app/(auth)/*`, `app/dokumen/[id].tsx`, `app/editor/[halamanId].tsx`, `app/admin/*`, `app/+not-found.tsx` | 1.7 | baru |
| `app.json` | 1.3, 1.8 | diubah |

Pintasan opsional: berkas `scannest-fase1-kode.zip` berisi semua berkas baru di atas pada jalur yang benar (ditambah `.github/workflows/ci.yml` yang sudah terisi benar; tanpa `package.json`, `package-lock.json`, `tsconfig.json`, dan `app.json`, yang harus kamu ubah sendiri agar tidak menimpa pekerjaanmu). Ekstrak ke akar proyek **setelah** langkah 1.0, lalu kerjakan 1.2 (skrip npm), 1.3 (`npx expo install`), 1.8, dan 1.9.

---

## 16. Sumber

- Expo Router, rute bersama dan grup: https://docs.expo.dev/router/advanced/shared-routes/
- `react-native-safe-area-context` untuk SDK 54: https://docs.expo.dev/versions/v54.0.0/sdk/safe-area-context/
- Expo Go dan ketidakcocokan versi SDK: https://docs.expo.dev/troubleshooting/expo-go-version-mismatch/
- Memulai pengembangan dan membuka proyek di Expo Go: https://docs.expo.dev/get-started/start-developing/
- WCAG 2.2, kontras teks (1.4.3): https://www.w3.org/TR/WCAG22/#contrast-minimum
- WCAG 2.2, kontras non-teks (1.4.11): https://www.w3.org/TR/WCAG22/#non-text-contrast
- Paket font: https://www.npmjs.com/package/@expo-google-fonts/nunito
