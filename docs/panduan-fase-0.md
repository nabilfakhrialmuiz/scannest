# Panduan Fase 0: Setup Proyek Scannest (tugas 0.0 sampai 0.8)

Panduan ini disinkronkan dengan `ROADMAP.md` versi 0.7 (14 Oktober 2026). Nomor tugas di panduan sama dengan nomor tugas di roadmap. Semua perintah dan konfigurasi di sini sudah diuji pada proyek Expo SDK 54 yang sungguhan (dibuat dengan template resmi, lalu dicek `typecheck`, `lint`, dan `format:check` dari clone bersih). Pada 13 Oktober 2026 saya juga mengkloning repo publikmu dan menjalankan `npm ci`, `typecheck`, `lint`, dan `format:check`: semuanya lulus. Yang **tidak** bisa saya uji dari sini: Expo Go dan emulator di komputermu, serta mesin GitHub Actions itu sendiri. Untuk bagian itu saya menulis langkah dari dokumentasi resmi dan dari log yang kamu lihat.

Terminal yang dipakai: terminal bawaan VS Code (Terminal > New Terminal), dijalankan **di dalam folder proyek** `scannest`. Perbedaan Windows dan macOS/Linux saya tandai jika ada.

---

## Peta tugas

| Tugas di ROADMAP | Bagian panduan | Hasil |
|---|---|---|
| 0.0 | 0 | Identitas Git memakai email noreply |
| 0.1, 0.2 | 1 | Node terverifikasi, proyek Expo SDK 54 terbentuk |
| 0.3 | 2 | Dependensi cocok, `app.json` dirapikan |
| 0.4 | 3 | Prettier terpasang, tiga skrip baru, kode terformat |
| 0.5 | 4 | `.env` terabaikan Git, `.env.example` di-commit |
| 0.6 | 5 | Kode ada di GitHub (cabang `main`) |
| 0.7 | 6 | Folder `.github/workflows/` dan `ci.yml` (**berisi**), CI hijau; ada pemecahan masalah jika merah |
| 0.8 | 7 | Aplikasi jalan di Android (Expo Go SDK 54 atau emulator) |
| 0.9 | `panduan-supabase.md` bagian A | Proyek Supabase dibuat, kunci masuk `.env` |

---

## Daftar isi

0. Tugas 0.0: identitas Git dan email noreply (penting)
1. Tugas 0.1 dan 0.2: cek Node dan buat proyek (penting: versi SDK)
2. 0.3 Cek kecocokan dependensi
3. 0.4 TypeScript strict, ESLint, Prettier
4. 0.5 File `.env` dan `.gitignore`
5. 0.6 Repo GitHub
6. 0.7 GitHub Actions (CI)
7. 0.8 Menjalankan di Android
8. Checklist akhir Fase 0
9. Daftar berkas yang dibuat atau diubah di Fase 0

---

## 0. Tugas 0.0: identitas Git dan email noreply (penting)

Setiap commit Git menyimpan **nama dan email penulisnya di dalam commit itu sendiri**, permanen. Jika repo-mu publik dan email asli tercatat di commit, siapa pun bisa membacanya. Karena itu GitHub punya dua pengaturan terpisah di halaman Emails:

- **Keep my email addresses private**: menyembunyikan emailmu untuk operasi lewat situs web GitHub.
- **Block command line pushes that expose my email**: menolak push dari terminal bila commit-nya memakai email pribadimu (error `GH007`).

Aturan pentingnya: **atur identitas ini sebelum commit pertama**, yaitu sebelum menjalankan `create-expo-app`. Alasannya, `create-expo-app` langsung membuat commit awal memakai identitas Git yang ada saat itu. Mengubah `git config` sesudahnya **tidak** mengubah commit yang sudah ada.

**Langkah 1. Atur privasi email di GitHub.** Buka `https://github.com/settings/emails` (atau: foto profil > Settings > Emails), lalu centang:

- **Keep my email addresses private**
- **Block command line pushes that expose my email**

**Langkah 2. Cari alamat noreply-mu.** Formatnya:

```
ID+USERNAME@users.noreply.github.com
```

Yang perlu kamu pahami tentang alamat ini:

- Ini **bukan kotak masuk email**. Ia alamat alias yang GitHub sediakan khusus untuk identitas commit dan tidak menerima surat. Karena itu alamat ini **tidak muncul** di daftar email milikmu atau di dropdown *Primary email address*, dan kamu tidak perlu menambahkannya sendiri.
- Penulisannya selalu berakhiran `@users.noreply.github.com` (bukan `@github.co`).
- Format dengan `ID` berlaku untuk akun yang dibuat setelah 18 Juli 2017. `ID` adalah nomor akun GitHub-mu (angka), `USERNAME` adalah username-mu.
- Dokumentasi GitHub tidak menyebut letak persis alamat ini di halaman Emails, jadi jangan bergantung pada tampilannya. Gunakan cara yang pasti di bawah.

**Cara pasti menemukannya:**

1. Buka `https://api.github.com/users/USERNAME` di browser (ganti `USERNAME`).
2. Cari baris `"id":` dan catat angkanya.
3. Susun sendiri: `ANGKA+USERNAME@users.noreply.github.com`.

Contoh untuk akun `nabilfakhrialmuiz` (angka diambil dari profil publik pada 12 Oktober 2026; cek ulang sendiri dengan cara di atas):

```
288680631+nabilfakhrialmuiz@users.noreply.github.com
```

**Langkah 3. Pasang di Git (sekali per komputer).**

```bash
git config --global user.name "Nama Kamu"
git config --global user.email "ANGKA+USERNAME@users.noreply.github.com"
```

Nama ini ikut tampil publik di riwayat commit, jadi pakai nama yang nyaman kamu tampilkan (boleh username saja).

**Langkah 4. Cek.**

```bash
git config --global --list
git config --show-origin --get-all user.email
```

Perintah kedua menampilkan semua sumber pengaturan email. **Baris paling bawah adalah yang dipakai.** Pastikan yang paling bawah berisi alamat `noreply`. Jika baris paling bawah berasal dari `.git/config` (pengaturan khusus repo) dan masih berisi email asli, hapus dengan `git config --unset user.email`.

### Apakah "akun Git" di terminal sama dengan akun GitHub di situs?

Git sebenarnya tidak punya akun. `user.name` dan `user.email` hanyalah label yang ditempel ke setiap commit, dan sama sekali tidak dicek saat commit dibuat. Login ke GitHub saat `git push` adalah hal yang terpisah (diurus Git Credential Manager atau token). Jadi bisa saja kamu login sebagai akun A tetapi commit-nya berlabel email milik akun B.

Cara menyambungkannya: GitHub menghubungkan commit ke profilmu lewat **email di commit**. Email noreply milikmu otomatis terhubung ke akunmu, jadi commit berlabel noreply akan muncul sebagai milikmu (dan tercatat di grafik kontribusi). Commit berlabel email yang tidak terdaftar di akunmu tetap terpush, tetapi tidak terhubung ke profil.

Catatan dari pengalaman error `GH007`: pesan itu hanya muncul bila email di commit adalah **email pribadi di akun yang sedang melakukan push**. Jadi kemunculannya justru menandakan email di terminal dan akun GitHub-mu sudah sama.

---

## 1. Tugas 0.1 dan 0.2: cek Node dan buat proyek

Node kamu 24.11.1, sudah memenuhi syarat (minimal 20.19.4).

**Pastikan proyekmu benar-benar SDK 54.** Per 10 Oktober 2026, versi terbaru Expo sudah SDK 57. Jika perintah dijalankan tanpa tag `sdk-54`, proyek yang terbentuk adalah SDK 57, bukan 54. Buka `package.json` dan cari baris `expo`:

```json
"expo": "~54.0.36",
```

- Angka depannya **54**: aman, lanjut.
- Angka lain (misalnya 57): hapus folder proyek dan ulangi dengan perintah yang tepat.

```bash
npx create-expo-app@latest scannest --template default@sdk-54
```

Tag `sdk-54` untuk template ini sudah saya cek ada di npm. Jika instalasi dependensi belum jalan, masuk ke folder lalu `npm install`.

Dua hal yang dibuat otomatis oleh `create-expo-app`:

- Repo Git sudah dibuat dan sudah ada satu commit awal (`Initial commit`). Commit ini memakai identitas Git yang aktif saat itu, sehingga bagian 0 harus sudah dikerjakan **sebelum** perintah pembuatan proyek. Nama cabangnya `master`, bukan `main`. Kita ubah di langkah 0.6.
- Ada beberapa file tambahan (`AGENTS.md`, folder `.claude/`, folder `.vscode/`). `AGENTS.md` dan `.claude/` adalah petunjuk untuk asisten AI, tidak memengaruhi aplikasi. Boleh dibiarkan.

Catatan penting soal SDK: karena SDK 54 bukan yang terbaru lagi, **selalu pakai dokumentasi versi 54** (`https://docs.expo.dev/versions/v54.0.0/`) dan pasang library dengan `npx expo install <nama-paket>`, bukan `npm install`. Perintah `expo install` memilih versi yang cocok dengan SDK-mu.

---

## 2. Tugas 0.3: cek kecocokan dependensi

```bash
npx expo install --check
npx expo-doctor@latest
```

Penjelasan:

| Perintah | Fungsi |
|---|---|
| `npx expo install --check` | Membandingkan versi paket di `package.json` dengan daftar versi yang cocok untuk SDK 54. |
| `npx expo-doctor@latest` | Menjalankan 18 pemeriksaan kesehatan proyek (konfigurasi, dependensi, duplikasi paket). |

Hasil yang diharapkan: `Dependencies are up to date` dan semua pemeriksaan lulus. Jika `--check` melaporkan ada paket yang tidak cocok:

```bash
npx expo install --fix
```

**Rapikan identitas aplikasi (sekali saja, sebelum ada kode).** Buka `app.json`. Di dalam `"expo"`, ubah `name` menjadi `"Scannest"` (nama yang tampil di ponsel) dan tambahkan `package` di bagian `android`:

```json
"android": {
  "package": "com.namamu.scannest",
  ...
}
```

Ganti `namamu` dengan namamu sendiri (huruf kecil, tanpa spasi), misalnya `com.nabilfakhri.scannest`. ID ini menjadi identitas permanen aplikasi di Android, jadi pilih sekarang dan jangan diubah-ubah setelah ada yang memasang aplikasinya.

---

## 3. Tugas 0.4: TypeScript strict, ESLint, Prettier

### 3a. TypeScript strict: ternyata sudah aktif

Buka `tsconfig.json`. Template SDK 54 sudah memuat:

```json
"compilerOptions": {
  "strict": true,
  ...
}
```

Jadi tidak ada yang perlu kamu aktifkan. Yang dilakukan `strict: true`: TypeScript menolak variabel yang tipenya tidak jelas (`noImplicitAny`), memaksa kamu menangani nilai yang mungkin `null` atau `undefined` (`strictNullChecks`), dan beberapa pemeriksaan ketat lain. Hasilnya, banyak bug tertangkap saat menulis kode, bukan saat aplikasi dijalankan.

Template belum punya perintah khusus untuk mengecek tipe, jadi kita tambahkan di langkah 3d.

### 3b. ESLint: sudah terpasang

`eslint` dan `eslint-config-expo` sudah ada di `devDependencies`, dan file `eslint.config.js` sudah dibuat. ESLint membaca kode dan memberi peringatan untuk kesalahan umum, misalnya dependensi `useEffect` yang kurang. Perintahnya:

```bash
npm run lint
```

Di baliknya perintah ini menjalankan `expo lint`. Pasang juga ekstensi **ESLint** di VS Code (ikon Extensions, cari "ESLint") agar kesalahan langsung bergaris merah saat kamu mengetik.

### 3c. Prettier: ini yang perlu dipasang

Prettier memformat kode otomatis (kutip, titik koma, lebar baris) supaya gayanya seragam. Kita sambungkan ke ESLint sehingga pelanggaran format muncul sebagai error di `npm run lint`.

```bash
npm install --save-dev prettier eslint-config-prettier eslint-plugin-prettier
```

Perintah ini sama di semua sistem operasi. (Dokumentasi Expo menulis `npx expo install ... --dev`, hasilnya sama; di Windows perintah itu butuh tanda kutip khusus `"--"`, jadi saya pakai `npm install` agar lebih sederhana.)

Tiga paket itu fungsinya:

| Paket | Fungsi |
|---|---|
| `prettier` | Mesin pemformat kode. |
| `eslint-config-prettier` | Mematikan aturan gaya ESLint yang bentrok dengan Prettier. |
| `eslint-plugin-prettier` | Menjalankan Prettier di dalam ESLint, sehingga selisih format dilaporkan sebagai error. |

**File `.prettierrc`** (buat di folder utama proyek):

```json
{
  "singleQuote": true,
  "semi": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2
}
```

| Baris | Arti |
|---|---|
| `singleQuote: true` | Teks memakai kutip tunggal `'a'`, bukan `"a"`. |
| `semi: true` | Setiap pernyataan diakhiri titik koma. |
| `trailingComma: "all"` | Koma di elemen terakhir daftar multibaris, supaya diff Git lebih bersih. |
| `printWidth: 100` | Baris dipotong pada 100 karakter. |
| `tabWidth: 2` | Indentasi 2 spasi. |

**File `.prettierignore`** (daftar yang tidak diformat):

```
node_modules
.expo
dist
app-example
package-lock.json
*.md
```

`*.md` dikecualikan agar dokumen seperti `ROADMAP.md` tidak ikut diubah tabelnya oleh Prettier.

**File `eslint.config.js`**: ganti seluruh isinya dengan:

```js
// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');                       // 1
const expoConfig = require('eslint-config-expo/flat');                   // 2
const eslintPluginPrettierRecommended = require('eslint-plugin-prettier/recommended'); // 3

module.exports = defineConfig([
  expoConfig,                           // 4
  eslintPluginPrettierRecommended,      // 5
  {
    ignores: ['dist/*', 'app-example/*'], // 6
  },
]);
```

(Komentar bernomor di atas hanya untuk penjelasan; di file aslinya boleh dihapus. Versi tanpa komentar ada di file `eslint.config.js` pada paket starter.)

| No | Penjelasan |
|---|---|
| 1 | Mengambil fungsi `defineConfig` yang menyusun daftar konfigurasi ESLint (format "flat config" di ESLint 9). |
| 2 | Aturan standar Expo dan React Native. |
| 3 | Aturan "format harus sesuai Prettier". |
| 4 | Memakai aturan Expo. |
| 5 | Menambah aturan Prettier. |
| 6 | Folder yang diabaikan ESLint (hasil build dan contoh lama). |

### 3d. Tambah skrip `typecheck` dan `format`

Jalankan satu perintah ini (aman di PowerShell, CMD, dan terminal macOS/Linux):

```bash
npm pkg set scripts.typecheck="tsc --noEmit" scripts.format="prettier --write ." scripts.format:check="prettier --check ."
```

Atau edit manual bagian `"scripts"` di `package.json` agar menjadi:

```json
"scripts": {
  "start": "expo start",
  "reset-project": "node ./scripts/reset-project.js",
  "android": "expo start --android",
  "ios": "expo start --ios",
  "web": "expo start --web",
  "lint": "expo lint",
  "typecheck": "tsc --noEmit",
  "format": "prettier --write .",
  "format:check": "prettier --check ."
}
```

| Skrip | Fungsi |
|---|---|
| `typecheck` | Mengecek tipe TypeScript tanpa menghasilkan file (`--noEmit`). |
| `format` | Memformat semua file yang didukung Prettier. |
| `format:check` | Hanya mengecek format, tanpa mengubah. Dipakai CI. |

### 3e. Format sekali, lalu cek semuanya

Sebelum diformat, `npm run lint` akan menampilkan beberapa error `prettier/prettier` pada file contoh bawaan template. Itu normal. Format sekali:

```bash
npm run format
```

Pada uji saya, 9 file template berubah (jumlahnya bisa sedikit berbeda di komputermu). Lalu jalankan tiga pemeriksaan:

```bash
npm run typecheck
npm run lint
npm run format:check
```

Ketiganya harus selesai **tanpa error**. Terakhir, simpan ke Git:

```bash
git add -A
git commit -m "chore: tambah prettier, skrip typecheck dan format"
```

---

## 4. Tugas 0.5: `.env` dan `.gitignore`

### Mengapa perlu

Kunci dan alamat layanan (Supabase, Cloudinary) tidak boleh ditulis langsung di kode. Kita taruh di file `.env` yang **tidak** ikut ke GitHub.

### Langkah

**1. Tambahkan `.env` ke `.gitignore`.** Template hanya mengabaikan `.env*.local`, bukan `.env` biasa. Buka `.gitignore`, lalu tambahkan satu baris di bagian paling bawah:

```
.env
```

Cek bahwa Git mengabaikannya:

```bash
git check-ignore -v .env
```

Jika keluar baris yang menyebut `.gitignore`, artinya sudah benar. (Pada uji saya, `.env` terabaikan dan `.env.example` tetap bisa di-commit.)

**2. Buat `.env.example`** (daftar nama variabel tanpa nilai, aman di-commit):

```
# Salin file ini menjadi .env lalu isi nilainya. JANGAN commit file .env.
# Semua variabel EXPO_PUBLIC_* ikut terbundel ke aplikasi dan bisa dibaca siapa pun
# yang memiliki APK-nya. Isi hanya dengan kunci PUBLIK.
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME=
EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET=
```

Perhatikan: roadmap versi 0.1 menulis `..._ANON_KEY`. Dokumentasi Supabase terbaru memakai **publishable key**, dan kunci `anon` lama dijadwalkan dihentikan pada akhir 2026. Karena itu namanya sekarang `..._PUBLISHABLE_KEY`.

**3. Buat `.env` dari contoh:**

- Windows (PowerShell atau CMD): `copy .env.example .env`
- macOS/Linux: `cp .env.example .env`

Nilainya kita isi di panduan Supabase dan di Fase 5 (Cloudinary).

**Aturan keras:** jangan pernah menaruh *Supabase secret key*, *service_role*, atau *Cloudinary API secret* di `.env` aplikasi. Semua yang berawalan `EXPO_PUBLIC_` terbaca dari dalam APK.

**4. Commit:**

```bash
git add -A
git commit -m "chore: tambah .env.example dan abaikan .env"
```

Setelah mengubah `.env`, hentikan server Expo (Ctrl+C) dan jalankan ulang agar nilainya terbaca.

---

## 5. Tugas 0.6: repo GitHub

**1. Pastikan semua commit memakai email noreply.** Identitas sudah diatur di bagian 0. Sekarang periksa riwayat yang sudah ada:

```bash
git log --format="%h  author=%ae  committer=%ce  %s"
```

Setiap baris harus menampilkan alamat yang berakhiran `@users.noreply.github.com`. Jika masih ada email asli di salah satu baris, **perbaiki dulu** dengan langkah di bagian "Jika push ditolak GH007" di bawah, baru push.

**2. Ganti nama cabang ke `main`.** `create-expo-app` membuat cabang `master`, sedangkan GitHub memakai `main`:

```bash
git branch -M main
```

**3. Buat repo kosong di GitHub.** Buka `https://github.com/new`:

| Isian | Nilai |
|---|---|
| Repository name | `scannest` |
| Visibility | **Public** (agar bisa kamu tampilkan sebagai portofolio) |
| Add a README file | **Jangan dicentang** |
| Add .gitignore | **None** |
| Choose a license | **None** (kita tambah di Fase 10) |

Repo harus benar-benar kosong. Jika kamu mencentang README, push pertama akan ditolak karena riwayatnya berbeda.

**4. Hubungkan dan kirim.** Ganti `USERNAME` dengan username GitHub-mu:

```bash
git remote add origin https://github.com/USERNAME/scannest.git
git push -u origin main
```

Saat push pertama, Git meminta login. Di Windows biasanya muncul jendela browser untuk masuk ke GitHub; ikuti saja. GitHub tidak menerima password akun untuk Git, jadi bila yang muncul adalah kolom password, gunakan *Personal Access Token* (GitHub: Settings > Developer settings > Personal access tokens).

**5. Cek hasilnya.** Buka `https://github.com/USERNAME/scannest`. Pastikan:

- File `package-lock.json` ada (dibutuhkan CI).
- File `.env` **tidak** ada, sedangkan `.env.example` ada.

**Jika error:**

| Pesan | Penyebab dan solusi |
|---|---|
| `remote origin already exists` | Jalankan `git remote set-url origin https://github.com/USERNAME/scannest.git`. |
| `rejected ... fetch first` atau `unrelated histories` | Repo di GitHub tidak kosong. Hapus repo itu lalu buat ulang tanpa README. |
| `Authentication failed` | Pakai Personal Access Token, atau masuk lewat jendela browser yang diminta Git. |
| `GH007: Your push would publish a private email address` | Ada commit yang memakai email asli. Lihat bagian di bawah tabel ini. |

### Jika push ditolak GH007 ("would publish a private email address")

**Penyebabnya:**

1. Setiap commit menyimpan email penulisnya di dalam commit itu sendiri.
2. Pengaturan *Block command line pushes that expose my email* membuat GitHub memeriksa push-mu. Menurut dokumentasinya, GitHub memeriksa **commit terbaru**: bila email penulisnya adalah email pribadi di akunmu, push ditolak.
3. Mengubah `git config` hanya memengaruhi commit **berikutnya**. Commit lama, termasuk commit awal otomatis dari `create-expo-app`, tetap membawa email lama. Dokumentasi GitHub menyatakan hal yang sama: commit sebelum perubahan tetap terhubung dengan email lamanya.

**Mengapa seluruh riwayat harus ditulis ulang, bukan hanya commit terakhir:** karena GitHub hanya memeriksa commit terbaru, memperbaiki commit terakhir saja bisa meloloskan push. Tetapi commit-commit lama yang masih berisi email asli ikut terunggah ke repo publik dan terbaca siapa pun. Itu persis yang ingin dicegah.

**Solusinya** (aman karena push yang ditolak belum memasukkan apa pun ke GitHub, jadi riwayat lokal boleh ditulis ulang):

**a. Pastikan identitas sudah noreply** (bagian 0), dan tidak ada pengaturan lokal yang menimpanya:

```bash
git config --show-origin --get-all user.email
```

Baris terakhir adalah yang dipakai. Jika yang terakhir berasal dari `.git/config` (pengaturan khusus repo ini) dan masih berisi email asli, hapus dengan `git config --unset user.email`.

**b. Pastikan tidak ada perubahan yang belum di-commit:**

```bash
git status
```

Jika ada perubahan, commit dulu. Bila tidak, muncul error `cannot rebase: You have unstaged changes`.

**c. Tulis ulang semua commit dengan identitas baru:**

```bash
git rebase -r --root --exec "git commit --amend --no-edit --reset-author"
```

Perintah ini mengulang setiap commit dari yang paling awal dan mengganti penulisnya ke identitas sekarang. Isi file dan pesan commit tidak berubah, tetapi waktu commit akan menjadi waktu saat perintah ini dijalankan (tidak berbahaya). Keluarannya diakhiri `Successfully rebased and updated refs/heads/main`. Jika muncul masalah di tengah jalan, batalkan dengan `git rebase --abort`.

**d. Periksa hasilnya**, lalu push:

```bash
git log --format="%h  author=%ae  committer=%ce  %s"
git push -u origin main
```

Semua baris harus berakhiran `@users.noreply.github.com`. Tidak perlu `--force`, karena GitHub belum menerima commit apa pun.

**Cadangan jika langkah c bermasalah** (menghapus riwayat lokal; aman bila belum ada yang di-push):

```bash
rmdir /s /q .git
git init -b main
git add -A
git commit -m "chore: setup awal proyek Scannest"
git remote add origin https://github.com/USERNAME/scannest.git
git push -u origin main
```

(`rmdir /s /q` untuk Windows CMD. Di PowerShell atau macOS/Linux: `rm -rf .git`.)

**Opsi yang tidak disarankan:** mematikan *Block command line pushes that expose my email* atau mempublikasikan emailmu. Push akan lolos, tetapi email asli tercatat permanen di riwayat repo publik dan ikut tersalin ke setiap clone atau fork. Itu sulit ditarik kembali, dan alamat email publik rawan spam.

---

## 6. Tugas 0.7: GitHub Actions (CI)

CI (*continuous integration*) adalah robot di GitHub yang otomatis menjalankan `typecheck`, `lint`, dan `format:check` setiap kali kamu push. Jika ada yang rusak, kamu tahu sebelum terlambat.

**Prasyarat:** tugas 0.4 sudah selesai (skrip `typecheck`, `lint`, dan `format:check` ada di `package.json`) dan `package-lock.json` sudah ikut ter-push di tugas 0.6, karena CI memakai `npm ci`.

**Yang dibuat di tugas ini** adalah satu folder induk, satu subfolder, dan satu berkas:

```
scannest/
└─ .github/
   └─ workflows/
      └─ ci.yml
```

**Langkah 1. Buat folder-nya** dari terminal, di dalam folder proyek:

- Windows (CMD atau PowerShell): `mkdir .github\workflows`
- macOS/Linux: `mkdir -p .github/workflows`

Boleh juga lewat VS Code (klik kanan di panel Explorer, New Folder). Namanya harus persis `.github` (ada titik di depan) lalu `workflows`, huruf kecil semua. GitHub hanya menjalankan workflow dari lokasi ini.

**Langkah 2. Buat berkas `.github/workflows/ci.yml`** dengan isi berikut:

```yaml
name: CI                                   # 1

on:                                        # 2
  push:
    branches: [main]                       # 3
  pull_request:                            # 4

jobs:
  check:                                   # 5
    runs-on: ubuntu-latest                 # 6
    steps:
      - name: Ambil kode
        uses: actions/checkout@v7          # 7

      - name: Siapkan Node.js
        uses: actions/setup-node@v7        # 8
        with:
          node-version: 24                 # 9
          cache: npm                       # 10

      - name: Pasang dependensi
        run: npm ci                        # 11

      - name: Cek tipe (TypeScript)
        run: npm run typecheck

      - name: Lint (ESLint + Prettier)
        run: npm run lint

      - name: Cek format
        run: npm run format:check
```

| No | Penjelasan |
|---|---|
| 1 | Nama yang tampil di tab Actions. |
| 2 | Kapan robot berjalan. |
| 3 | Setiap push ke cabang `main`. |
| 4 | Setiap pull request. |
| 5 | Satu pekerjaan bernama `check`. |
| 6 | Dijalankan di mesin Linux milik GitHub. |
| 7 | Mengunduh kodemu ke mesin itu. |
| 8 | Memasang Node.js. |
| 9 | Versi 24, sama dengan yang kamu pakai di komputer. |
| 10 | Menyimpan cache paket npm agar run berikutnya lebih cepat. |
| 11 | Pasang dependensi persis sesuai `package-lock.json` (lebih ketat dari `npm install`). |

Versi `checkout@v7` dan `setup-node@v7` adalah rilis terbaru yang saya lihat di halaman rilis GitHub pada 10 Oktober 2026. Jika kelak GitHub memberi peringatan versi usang, naikkan nomornya.

**Langkah 2b (jangan dilewati): pastikan berkas tersimpan dan tidak kosong.** Berkas yang dibuat tetapi belum disimpan, atau dibuat lewat perintah yang menghasilkan berkas kosong, akan ikut ter-commit sebagai **0 byte**. Itu persis yang terjadi pada run pertamamu (lihat bagian 6.1). Cek dengan salah satu cara:

- VS Code: judul tab `ci.yml` tidak boleh punya titik atau bulatan putih (tanda belum disimpan). Tekan `Ctrl+S`. Aktifkan juga **File > Auto Save** agar tidak terulang.
- Windows (CMD atau PowerShell): `dir .github\workflows\ci.yml`. Kolom ukuran harus **lebih dari 0** (sekitar 550 byte). `type .github\workflows\ci.yml` menampilkan isinya.
- macOS/Linux: `wc -c .github/workflows/ci.yml`.

**Langkah 3: commit dan push.** Baca dulu `git status`: yang tercantum hanya `.github/workflows/ci.yml`. Berkas lain yang namanya aneh **jangan** ikut di-add (lihat bagian 6.2).

```bash
git status
git add .github/workflows/ci.yml
git diff --cached --stat
git commit -m "ci: tambah workflow typecheck, lint, dan cek format"
git push
```

Baris `git diff --cached --stat` harus menampilkan sesuatu seperti `ci.yml | 28 ++++`. Bila tertulis `| 0`, berkasnya kosong: berhenti dan kembali ke Langkah 2b.

Buka repo di GitHub, tab **Actions**. Run pertama berstatus kuning (berjalan), lalu hijau (lulus). Nama run harus **CI** (nama yang kita tulis di baris pertama `ci.yml`). Pada simulasi saya, alur yang sama dari clone bersih lulus di ketiga pemeriksaan, dan pada 13 Oktober 2026 saya mengulanginya pada salinan repo publikmu: `npm ci`, `typecheck`, `lint`, dan `format:check` lulus semua. Jadi bila `ci.yml` terisi benar, CI seharusnya hijau.

### 6.1 Run merah: cara membacanya

Klik run yang merah di tab Actions. Lihat dua hal: **banner/annotation** di bagian atas, dan **langkah (step)** mana yang bertanda silang merah.

| Yang tampil | Penyebab | Solusi |
|---|---|---|
| Tidak ada job sama sekali, banner merah **No event triggers defined in `on`**, dan nama run berupa path `.github/workflows/ci.yml` (bukan `CI`) | `ci.yml` kosong atau tidak terbaca sebagai YAML. **Ini kasus nyata di repomu pada 13 Oktober 2026**: berkas di commit `5d62b60` berukuran 0 byte | Isi ulang berkas (lihat "Perbaikan" di bawah) |
| Galat "Invalid workflow file" dengan nomor baris | Indentasi YAML salah. YAML hanya boleh spasi, **bukan tab**, dan kelipatan 2 spasi | Samakan persis dengan blok di Langkah 2 |
| Langkah **Pasang dependensi** (`npm ci`) merah, pesan tentang `package-lock.json` | Lockfile belum di-commit atau tidak sinkron dengan `package.json` | Jalankan `npm install`, lalu commit `package-lock.json` |
| Langkah **Cek tipe** merah | Ada galat TypeScript | Jalankan `npm run typecheck` di komputer, perbaiki galatnya |
| Langkah **Lint** merah, pesan menyebut `prettier/prettier` | Format kode belum rapi | `npm run format`, lalu commit |
| Langkah **Cek format** merah | Sama dengan di atas | `npm run format`, lalu commit |

**Perbaikan untuk `ci.yml` kosong** (kondisimu sekarang):

1. Buka `.github/workflows/ci.yml` di VS Code, tempel isi dari Langkah 2 (boleh tanpa komentar bernomor `# 1` dan seterusnya), tekan `Ctrl+S`.
2. Lakukan Langkah 2b (ukuran harus lebih dari 0).
3. `git add .github/workflows/ci.yml`, lalu `git commit -m "ci: isi workflow yang tadinya kosong"`, lalu `git push`.
4. Tab Actions otomatis menjalankan run baru. Run lama yang merah biarkan saja; tidak perlu dihapus.

### 6.2 Berkas nyasar di repo

Saat mengecek repomu pada 13 Oktober 2026, saya melihat dua berkas yang bukan bagian dari proyek di akar repo:

| Berkas | Isinya |
|---|---|
| `tatus` | Satu baris keluaran perintah `git config --show-origin` (hanya berisi alamat noreply, tidak ada data sensitif) |
| `h -u origin main` | Teks layar bantuan pager `less` (5 KB) |

Keduanya kemungkinan besar tercipta dari perintah terminal yang mengandung tanda `>` (pengalihan keluaran ke berkas) dan terketik atau terpaste tidak utuh, sehingga sisa teks perintah menjadi **nama berkas**. Saya tidak bisa memastikan perintah persisnya. Berkas ini tidak merusak CI (Prettier dan ESLint mengabaikan berkas yang tidak dikenalnya), tetapi mengotori repo publik. Hapus:

```bash
git rm tatus "h -u origin main"
git commit -m "chore: hapus berkas nyasar"
git push
```

Pencegahan: **selalu baca `git status` sebelum `git add`**. Tanda bahaya adalah berkas bernama tidak lazim di daftar "Untracked files". Ketik perintah satu per satu, jangan menempel beberapa baris sekaligus tanpa memeriksanya.

Setelah run hijau, centang tugas 0.7 di `ROADMAP.md`.

---

## 7. Tugas 0.8: menjalankan di Android

Pilih salah satu: ponsel fisik atau emulator.

### Opsi A: ponsel Android fisik dengan Expo Go (paling cepat)

**Aturan utama:** satu build Expo Go hanya berisi **satu** versi SDK. Dokumentasi Expo: "Each build of Expo Go includes one Expo SDK version", dan SDK proyek (angka di `"expo": "~54..."` pada `package.json`) harus sama dengan SDK Expo Go di HP. Dokumentasi yang sama menyebut versi Google Play **bisa tertinggal** dari rilis SDK baru. Halaman unduhan `expo.dev/go` per 13 Oktober 2026 menawarkan SDK 57 sebagai yang terbaru, jadi tidak ada jaminan Expo Go dari Play Store bernomor SDK 54. Karena itu langkah paling aman adalah memasang build SDK 54 secara eksplisit.

1. Di browser HP, buka **https://expo.dev/go**. Pilih **SDK 54**, platform **Android**, lalu **Install** (mengunduh berkas APK). Android bisa meminta izin memasang aplikasi dari browser tersebut; setujui hanya untuk pemasangan ini.
2. Bila pemasangan gagal karena bentrok dengan Expo Go dari Play Store, copot Expo Go lama dulu, lalu pasang lagi APK SDK 54.
3. Bila Play Store menawarkan pembaruan Expo Go, abaikan selama proyekmu masih SDK 54.
4. Pastikan HP dan komputer di **Wi-Fi yang sama**.
5. Di komputer, di folder proyek: `npm start` (sama dengan `npx expo start`). Kode QR muncul di terminal.
6. Di HP, buka **Expo Go**, pilih pemindai kode QR di dalam aplikasinya, lalu pindai kode QR di terminal.
7. Tunggu bundling selesai (pertama kali bisa setengah menit). Layar yang tampil: contoh template (tab Home dan Explore) bila Fase 1 belum dikerjakan, atau Dashboard Scannest bila sudah.

Setiap kali kamu menyimpan berkas, aplikasi di HP memuat ulang sendiri (*Fast Refresh*). Mengocok HP membuka menu pengembang Expo Go.

**Bila gagal**, cocokkan gejalanya:

| Gejala | Penyebab dan solusi |
|---|---|
| Pesan *project is incompatible with this version of Expo Go* | SDK Expo Go tidak sama dengan SDK proyek. Pasang build SDK 54 dari `expo.dev/go` (langkah 1). Pastikan juga `package.json` memuat `"expo": "~54..."`, lalu jalankan `npx expo-doctor@latest` dan `npx expo install --fix` ([dokumen Expo](https://docs.expo.dev/troubleshooting/expo-go-version-mismatch/)) |
| QR terbaca, tetapi muncul galat koneksi atau timeout | Jaringan memblokir komunikasi antar-perangkat (umum di Wi-Fi kampus, kantor, dan hotspot publik), atau firewall komputer memblokir Node.js. Pertama pastikan HP dan komputer satu Wi-Fi. Bila tetap gagal, pakai mode tunnel di bawah |
| Mode tunnel | `npx expo start --tunnel`. Bila diminta memasang paket tambahan, jawab ya. Pindai kode QR yang baru. Dokumentasi Expo mencatat tunnel membuat reload **jauh lebih lambat** ([dokumen Expo](https://docs.expo.dev/get-started/start-developing/)), jadi pakai hanya bila perlu |
| Muncul dialog firewall Windows saat `npm start` pertama kali | Izinkan akses Node.js untuk jaringan **Pribadi** (Private) |

### Opsi B: emulator di komputer (Android Studio)

1. Pasang Android Studio dari situs resmi `developer.android.com/studio`.
2. Buka **Device Manager**, buat perangkat virtual (misalnya Pixel) dengan system image yang direkomendasikan Android Studio, lalu jalankan.
3. Saat emulator sudah menyala dan terlihat layar utamanya, di terminal proyek jalankan:

```bash
npm run android
```

Expo akan mencoba membuka proyek di emulator. Jika Expo Go di emulator tidak cocok versinya, pasang yang SDK 54 dari **https://expo.dev/go** (pilih Android dan emulator).

### Catatan untuk fase berikutnya

Expo menyarankan *development build* untuk aplikasi yang serius, dan beberapa library native di backlog (misalnya deteksi tepi dokumen otomatis) memang tidak jalan di Expo Go. Untuk Fase 1 sampai 9, Expo Go sudah cukup. Kita pindah ke development build bila perlu.

---

## 8. Checklist akhir Fase 0

Daftar ini sama dengan "Selesai bila" Fase 0 di `ROADMAP.md`. **Status 14 Oktober 2026:** semua butir dicentang berdasarkan laporanmu bahwa seluruh tugas Fase 0 sudah selesai (saya tidak bisa memeriksa HP-mu; hasil CI hijau dilaporkan olehmu dan belum terbaca ikon hijaunya dari sisi saya).

- [x] `package.json` menunjukkan `expo` berawalan `~54` (0.2)
- [x] `npx expo install --check` melaporkan dependensi sesuai (0.3)
- [x] `app.json`: `name` = `Scannest` (huruf S besar), `android.package` sudah diisi (0.3). Di repomu per 13 Oktober 2026 `name` masih `scannest`; dikoreksi di Fase 1 tugas 1.8
- [x] `npm run typecheck`, `npm run lint`, `npm run format:check` bersih (0.4)
- [x] `.env` ada di `.gitignore`, `.env.example` sudah di-commit (0.5)
- [x] Repo ada di GitHub (cabang `main`), tanpa berkas `.env` (0.6)
- [x] `git log` hanya menampilkan email `noreply` (0.0, 0.6)
- [x] Tab Actions menunjukkan CI hijau dan `ci.yml` tidak kosong (0.7)
- [x] Aplikasi tampil di HP lewat Expo Go SDK 54, atau di emulator (0.8)
- [x] Proyek Supabase dibuat, URL dan publishable key masuk `.env` (0.9, lihat `panduan-supabase.md` bagian A)

Setelah semuanya tercentang, centang tugas 0.0 sampai 0.8 di `ROADMAP.md`. Lanjut ke **`docs/panduan-supabase.md`** untuk tugas 0.9, dan ke **`docs/panduan-fase-1.md`** untuk Fase 1 (UI dan navigasi). Keduanya bisa dikerjakan berselang-seling.

---

## 9. Daftar berkas yang dibuat atau diubah di Fase 0

Daftar yang sama ada di `ROADMAP.md` (Fase 0).

| Berkas atau folder | Tugas | Status | Keterangan |
|---|---|---|---|
| `package.json` | 0.2, 0.4 | diubah | Tambah devDependencies `prettier`, `eslint-config-prettier`, `eslint-plugin-prettier` dan skrip `typecheck`, `format`, `format:check` |
| `package-lock.json` | 0.2, 0.4 | dibuat otomatis | Wajib ikut di-commit: CI memakai `npm ci` |
| `app.json` | 0.3 | diubah | `name` = `Scannest` dan `android.package` |
| `tsconfig.json` | 0.4 | diverifikasi | `strict: true` sudah aktif dari template |
| `eslint.config.js` | 0.4 | isi diganti | ESLint ditambah aturan Prettier |
| `.prettierrc` | 0.4 | baru | Gaya format kode |
| `.prettierignore` | 0.4 | baru | Berkas yang tidak diformat |
| `.gitignore` | 0.5 | diubah | Tambah baris `.env` |
| `.env.example` | 0.5 | baru | Daftar nama variabel, di-commit |
| `.env` | 0.5 (diisi di 0.9) | baru, hanya lokal | **Tidak** di-commit |
| `.github/workflows/ci.yml` | 0.7 | baru | CI: `typecheck`, `lint`, `format:check` (folder `.github` dan `workflows` ikut dibuat) |
| Berkas contoh template (`app/`, `components/`, `hooks/`, `scripts/`) | 0.4 | diformat ulang | Hasil `npm run format` |
| `ROADMAP.md`, `docs/panduan-fase-0.md`, `docs/panduan-supabase.md` | dokumen | simpan di repo | Rencana kerja dan panduan |
