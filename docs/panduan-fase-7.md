# Panduan Fase 7: Dashboard dan Manajemen Dokumen (Scannest)

**Untuk:** Nabil Fakhri Al Muiz · **Terakhir diperbarui:** 21 Oktober 2026 · **Sinkron dengan:** `ROADMAP.md` v0.11 (Fase 7, tugas 7.0 sampai 7.8)

Setelah Fase 7 selesai, Dashboard menampilkan **semua dokumenmu** (gambar mini, judul, status, jumlah halaman, tanggal) dengan **pencarian judul**, **filter status**, dan **paginasi** 20 dokumen per muatan. Mengetuk dokumen membuka **detail**: halaman digeser mendatar, judul bisa **diganti**, dan dokumen bisa **dihapus**. Penghapusan berjalan lewat sebuah **Edge Function** Supabase yang menghapus file di Cloudinary lebih dulu, baru baris di database. Itulah pertama kalinya aplikasi ini memakai API secret Cloudinary, dan secret itu **hanya hidup di server**, tidak pernah di aplikasi.

**Apa yang sudah dan belum saya uji:**

- Sudah: seluruh kode saya jalankan sebagai aplikasi web (React Native Web, Expo SDK 54) dengan Chromium melawan **tabel database, Cloudinary, dan Edge Function tiruan** buatan saya. **75 pemeriksaan e2e lulus** di tujuh kelompok skenario: daftar 60 dokumen (skeleton saat memuat, paginasi tepat pada offset 0, 20, 40, 60 tanpa dokumen ganda, filter `user_id`, gambar mini memakai `c_fill,g_north` di akhir rantai efek), pencarian dan filter (satu permintaan saja untuk kata yang diketik cepat, karakter khusus di-escape, kolom cari tidak kehilangan fokus), empty state dan galat (jaringan putus lalu **Coba lagi**, gagal memuat halaman berikutnya lalu **Muat lagi**), detail (pager, tombol panah, penanda halaman), ganti nama (kosong ditolak, batas 120 karakter, galat server di dalam dialog, hanya `judul` yang dikirim), hapus (batal, 502 Cloudinary, 404, jaringan putus, 403, sukses lalu kembali ke daftar tanpa dokumen itu), dan layar 360 px tanpa gulir mendatar. Regresi **Fase 6 (101)** dan **Fase 5 (48)** tetap lulus; harness Fase 5 saya sesuaikan karena Dashboard kini membaca tabel `dokumen`. **81 uji unit** (`npm test`): 34 dari Fase 6 dan 47 baru, termasuk **vektor tanda tangan Cloudinary dari dokumentasi resmi**. Edge Function saya periksa dengan `deno check` dan **jalankan sungguhan di Deno 2.9.6** melawan server Supabase dan Cloudinary tiruan: 15 skenario (tanda tangan dihitung ulang oleh penerima dan benar, baris dihapus **setelah** semua file, 401, 403, 404, 502, `OPTIONS` dan CORS). Skrip seed 55 dokumen saya jalankan di PostgreSQL 16 dengan migrasi Fase 2 (trigger `jumlah_halaman` bekerja, hapus berantai bersih). `typecheck`, `lint`, `format:check`, `cek:kontras` bersih, dan urutan langkah panduan ini saya putar ulang pada salinan bersih Fase 6.
- Belum: **Supabase milikmu yang sungguhan**, **Cloudinary asli untuk penghapusan**, dan **HP / Expo Go**. Khususnya belum terbukti: (1) function terpasang di proyekmu, secret terbaca, dan `verify_jwt` aktif; (2) **balasan asli `destroy`** dari Cloudinary (balasan `not found` terdokumentasi di forum dukungan Cloudinary; `ok` berasal dari pengetahuan saya tentang Upload API dan belum saya lihat langsung) dan apakah **gambar turunan ikut terhapus**; (3) PostgREST asli menerima embed terbatas (`halaman_dokumen.limit=1`) dan `ilike` ber-escape; (4) gestur geser pager, pull-to-refresh, dan fokus dialog di Android; (5) kelancaran 55 dokumen di HP. Daftar uji di bagian 9 adalah buktinya.

---

## Daftar isi

1. Peta tugas dan keputusan
2. Tugas 7.0: tutup Fase 6 dan siapkan cabang
3. Tugas 7.1, 7.2, 7.6: modul murni dan uji unit
4. Tugas 7.5: Edge Function `delete-document`
5. Tugas 7.1 dan 7.4: akses data dan TanStack Query
6. Komponen bersama: Chip, Skeleton, Dialog
7. Tugas 7.1 sampai 7.7: layar Dashboard dan detail
8. Cek akhir kode
9. Tugas 7.8: uji di HP, 55 dokumen uji, commit, pull request
10. Yang perlu diingat saat coding nanti
11. Pemecahan masalah
12. Checklist akhir Fase 7
13. Daftar berkas Fase 7
14. Sumber

---

## 1. Peta tugas dan keputusan

| Tugas | Isi | Bagian |
|---|---|---|
| 7.0 | Tutup Fase 6, cabang `fase-7-dashboard`, pasang `@tanstack/react-query` | 2 |
| 7.1 | Daftar dokumen: `FlatList`, pull-to-refresh, paginasi, TanStack Query | 3, 5, 7 |
| 7.2 | Gambar mini dari `url_hasil` (`c_fill,g_north`) dengan `expo-image` | 3, 7 |
| 7.3 | Detail dokumen: pager, tombol panah, tombol **Percantik halaman ini** | 7 |
| 7.4 | Ganti nama dokumen | 5, 7 |
| 7.5 | Hapus dokumen lewat Edge Function (deploy, secret, uji `curl`) | 4, 5 |
| 7.6 | Pencarian judul dan filter status | 3, 7 |
| 7.7 | Empty state dan skeleton | 6, 7 |
| 7.8 | Uji di HP (55 dokumen uji), commit, PR, CI hijau, merge | 9 |

Nomor 7.1 sampai 7.7 sama dengan roadmap v0.10; 7.0 dan 7.8 ditambahkan pada v0.11.

**Pintasan (opsional):** `scannest-fase7-kode.zip` berisi 25 berkas kode Fase 7 dengan susunan folder yang sama dengan repomu. Pengecualian: `package.json`, `tsconfig.json`, dan `eslint.config.js` **tidak** ada di zip (isinya milikmu); kamu menambah baris sendiri di **2.4** dan **4.3**. Kamu boleh mengekstraknya ke `C:\scannest` (timpa berkas yang ada) alih-alih mengetik satu per satu, tetapi baca bagian 3 sampai 7 agar paham isinya. **Deploy function (4.5) tetap kamu kerjakan sendiri**, karena butuh login Supabase dan API secret Cloudinary milikmu.

### Alur Dashboard, dalam satu gambar

```
Dashboard ──▶ useDaftarDokumen(userId, status, kata)
                  │  kata ditunda 400 ms; kunci cache = ['dokumen', userId, 'daftar', status, kata]
                  ▼
        dokumen ?user_id=eq.<kamu> &status=eq.… &judul=ilike.%kata%
                &order=dibuat_pada.desc,id.desc &offset=N &limit=20
                &halaman_dokumen.order=urutan.asc &halaman_dokumen.limit=1   ← hanya halaman pertama (sampul)
                  │
                  ▼  gulir hampir sampai bawah → muat 20 berikutnya (offset += 20)
        KartuDokumen: urlMini(url_hasil) = …/rantai efek/c_fill,g_north,h_300,w_300/f_auto/q_auto/v123/…
                  │ ketuk
                  ▼
        DetailDokumen: pager mendatar (urlTampil: c_limit,h_1200) · Percantik · Ganti nama · Hapus
```

### Alur menghapus dokumen

```
[Hapus] ─▶ dialog konfirmasi ─▶ supabase.functions.invoke('delete-document', { dokumenId })
                                          │  (JWT-mu ikut terkirim)
                                          ▼
        Edge Function: JWT sah? ─ tidak ─▶ 401
             │ ya
             ▼
        baca dokumen dengan JWT-mu (RLS) ─ tidak terlihat ─▶ 404 ; milik orang lain ─▶ 403
             │
             ▼
        daftar public_id halaman ─▶ Cloudinary destroy (≤ 4 sekaligus, bertanda tangan)
             │ ada yang gagal ─▶ 502, BARIS DATABASE TIDAK DISENTUH (kamu bisa mengulang)
             ▼ semua beres ("not found" dianggap beres)
        hapus baris dokumen (halaman dan efek ikut lewat cascade) ─▶ 200 { ok: true, dihapus: n }
```

### Keputusan teknis (dicek 21 Oktober 2026)

**K40: fungsi hapus bernama `delete-document`** (roadmap v0.10 menyebut `delete-asset`). Ia menghapus *semua file halaman* **dan** baris dokumen dalam satu pemanggilan, jadi nama lama menyesatkan. Fungsi admin di Fase 8 (`admin-delete-document`) tetap terpisah karena memakai hak yang berbeda.

**K41: function memakai JWT pemanggil dan RLS, bukan service role.**

| Pilihan | Pro | Kontra |
|---|---|---|
| **JWT pemanggil + RLS** (dipilih) | Tidak ada kunci "sakti" di function ini; pemilik dokumen diperiksa dua kali (kode dan RLS); `verify_jwt` bawaan menolak pemanggil tanpa JWT | Akun nonaktif tidak bisa menghapus (RLS menolak, hasilnya 404); admin tidak bisa memakainya (Fase 8 punya fungsi sendiri) |
| Service role | Bisa menghapus apa saja, termasuk atas nama admin | Satu kesalahan kode = bisa menghapus data siapa pun; kunci yang melewati RLS harus dijaga ekstra |

Kontra yang tersisa dan jujur: hak `delete` langsung pada tabel `dokumen` masih diberikan ke pengguna (dari Fase 2), jadi klien yang dimodifikasi bisa menghapus baris tanpa menghapus file. Aplikasi ini sendiri tidak melakukannya. Mencabut hak itu dicatat sebagai **B21** (setelah Fase 8, supaya admin tetap punya jalur hapus).

**K42: file dulu, baris belakangan, aman diulang.** Bila sebagian file gagal dihapus, function berhenti dengan 502 dan **tidak menyentuh baris database**; kamu cukup menekan **Hapus** lagi. File yang sudah hilang dianggap beres (`not found`). Risiko sisa: bila file sudah hilang tetapi baris gagal dihapus, dokumen tampil dengan gambar rusak sampai hapus diulang; pesannya khusus ("File sudah dihapus, tetapi catatan dokumen belum").

**K43: gambar mini `c_fill,g_north,h_300,w_300,f_auto,q_auto`** (roadmap v0.10: `c_fill,w_300`). Saya mencobanya ke akunmu lewat konektor Cloudinary pada 21 Oktober 2026: setelah rantai crop, putar, dan efek, hasilnya 300×300. `g_north` mempertahankan **bagian atas** halaman (kop surat dan judul biasanya di sana); tanpanya `c_fill` memotong bagian tengah. Gambar detail memakai `c_limit,h_1200,w_1200` (tidak pernah memperbesar). Keduanya **ditambahkan di akhir rantai** yang sudah ada di `url_hasil`, sebelum segmen versi `v123`, sehingga resep efek tetap dikerjakan lebih dulu.

**K44: TanStack Query v5** dengan kunci cache berawalan id pengguna, `staleTime` 30 detik, penyegaran saat layar kembali terlihat, dan cache dibuang saat keluar. Temuan uji penting: `postgrest-js` 2.117.3 **mengulang sendiri** permintaan baca (GET) sampai 3 kali dengan jeda 1, 2, dan 4 detik bila jaringan putus. Dikombinasikan dengan ulang TanStack, galat baru tampil setelah sekitar **16 detik**. Kini pembacaan memakai `.retry(false)` dan TanStack mengulang **satu kali** (kecuali galat izin dan "tidak ada"), jadi pesan galat muncul dalam beberapa detik. Layar Fase 6 masih memakai perilaku lama (B23).

**K45: dialog buatan sendiri** (`Dialog` di atas `Modal` React Native), bukan `Alert`. Pro: bisa memuat kolom isian (ganti nama) dan pesan galat di dalam dialog, tombol terkunci selagi memproses. Kontra: kode sendiri; fokus keyboard dan pembaca layar di Android belum teruji di HP.

**K46: paginasi offset, pencarian `ilike`, filter di server.** Pro: sederhana dan cepat untuk ratusan dokumen; `gabungTanpaGanda` mencegah dokumen ganda bila ada dokumen baru yang menggeser baris. Kontra: `ilike '%kata%'` tidak memakai indeks biasa (B22 bila dokumen jadi ribuan); bila total dokumen persis kelipatan 20, ada satu permintaan tambahan yang mengembalikan nol baris.

**K47: Dashboard memfilter `user_id` secara eksplisit.** Kebijakan RLS `dokumen_select` mengizinkan **admin** membaca semua dokumen; tanpa filter, Dashboard akun admin akan menampilkan dokumen semua orang.

**K48: detail dengan pager mendatar dan tombol panah.** Pro: bisa digeser dan bisa dioperasikan tanpa gestur (pembaca layar, mouse). Kontra: belum ada zoom cubit (B24).

---

## 2. Tugas 7.0: tutup Fase 6 dan siapkan cabang

### 2.1 Cek keadaan Fase 6

Di Command Prompt, folder `C:\scannest`:

```bash
git status
git branch --show-current
git log --oneline -5
```

Yang diharapkan: cabang `main`, tidak ada perubahan tertunda, dan commit terbaru memuat Fase 6 (`feat(editor): percantik foto ...`). Bila PR Fase 6 belum digabung, selesaikan dulu (`docs/panduan-fase-6.md` bagian 9.3).

Sekalian laporkan kepadaku dua hal yang belum kamu rinci: hasil uji HP Fase 6 (terutama gestur crop dan slider) dan angka pemakaian Cloudinary di Dashboard-nya (tugas 6.11).

### 2.2 Salin dokumen terbaru

Ekstrak `scannest-dokumen.zip` ke `C:\scannest` (timpa `ROADMAP.md` dan isi `docs/`). Pastikan `docs/panduan-fase-7.md` ada.

### 2.3 Cabang

```bash
git switch -c fase-7-dashboard
```

### 2.4 Pasang TanStack Query

```bash
npm install @tanstack/react-query
```

Pada uji saya terpasang versi **5.104.5** (membutuhkan React 18 atau 19; proyekmu memakai React 19.1). Bila `npm` melaporkan konflik `peer dependency`, kirim keluarannya kepadaku sebelum memakai `--force`. Setelah itu:

```bash
npx expo install --check
```

Seharusnya melaporkan dependensi sesuai (paket ini bukan paket native, jadi tidak diatur Expo). `package.json` dan `package-lock.json` berubah; keduanya ikut di-commit di 9.3.

---

## 3. Tugas 7.1, 7.2, 7.6: modul murni dan uji unit

Semua berkas di bagian ini **murni**: tidak memakai React Native, Expo, atau Supabase, sehingga bisa diuji `npm test` di Node. Aturan sama seperti Fase 6: impor tipe memakai `import type`.

### 3.1 `src/features/dokumen/gambar.ts`

**Berkas:** `src/features/dokumen/gambar.ts` (berkas baru: buat)

```ts
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
```

Penjelasan: `tambahkanKomponen` mencari penanda `/image/upload/`, memecah sisa URL menjadi segmen, lalu menghitung **rantai** (segmen awal berpola `kode_nilai` seperti `c_crop,x_1` atau `a_90`) dan menyisipkan komponen baru tepat setelahnya. Segmen terakhir (nama berkas) tidak pernah dianggap bagian rantai, jadi `public_id` seperti `a_b.jpg` aman. Mengembalikan `null` bila bukan URL Cloudinary berbentuk `/image/upload/`, dan layar menangani `null` dengan menampilkan URL aslinya.

### 3.2 `src/features/dokumen/daftar.ts`

**Berkas:** `src/features/dokumen/daftar.ts` (berkas baru: buat)

```ts
// Aturan murni untuk daftar dokumen (tugas 7.1 dan 7.6): halaman, pencarian, filter, tanggal.

export const UKURAN_HALAMAN = 20;

export const FILTER_STATUS = ['semua', 'draft', 'selesai'] as const;
export type FilterStatus = (typeof FILTER_STATUS)[number];

export const LABEL_FILTER: Record<FilterStatus, string> = {
  semua: 'Semua',
  draft: 'Draft',
  selesai: 'Selesai',
};

export const LABEL_STATUS: Record<'draft' | 'selesai', string> = {
  draft: 'Draft',
  selesai: 'Selesai',
};

/** Rentang baris untuk `.range(dari, sampai)` (batas atas ikut dihitung). */
export function rentangHalaman(halamanKe: number, ukuran = UKURAN_HALAMAN) {
  const dari = halamanKe * ukuran;
  return { dari, sampai: dari + ukuran - 1 };
}

const BATAS_PENCARIAN = 100;

/**
 * Menyiapkan kata kunci untuk `ilike`: spasi di tepi dibuang, panjangnya dibatasi, dan karakter
 * khusus LIKE (`%`, `_`, `\`) di-escape supaya dicari apa adanya. Kosong berarti tanpa pencarian.
 */
export function polaPencarian(teks: string): string | null {
  const bersih = teks.trim().slice(0, BATAS_PENCARIAN);
  if (bersih === '') return null;
  return `%${bersih.replace(/[\\%_]/g, (huruf) => `\\${huruf}`)}%`;
}

const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

/** "17 Okt 2026" (zona waktu perangkat). Teks tanggal yang tidak terbaca dikembalikan "-". */
export function formatTanggal(iso: string): string {
  const waktu = new Date(iso);
  if (Number.isNaN(waktu.getTime())) return '-';
  return `${waktu.getDate()} ${BULAN[waktu.getMonth()]} ${waktu.getFullYear()}`;
}

export function labelHalaman(jumlah: number): string {
  return `${jumlah} halaman`;
}

/** Menggabungkan halaman-halaman hasil paginasi tanpa dokumen ganda (dokumen baru menggeser baris). */
export function gabungTanpaGanda<T extends { id: string }>(halaman: T[][]): T[] {
  const lihat = new Set<string>();
  const hasil: T[] = [];
  for (const kelompok of halaman) {
    for (const item of kelompok) {
      if (lihat.has(item.id)) continue;
      lihat.add(item.id);
      hasil.push(item);
    }
  }
  return hasil;
}
```

Penjelasan: `rentangHalaman` menghasilkan batas untuk `.range(dari, sampai)` (batas atas ikut). `polaPencarian` membuang spasi tepi, memotong 100 karakter, dan memberi garis miring terbalik pada `%`, `_`, dan `\` agar dicari apa adanya (tanpa ini, mengetik `50%` akan mencocokkan semuanya). `gabungTanpaGanda` menyatukan halaman hasil paginasi dan membuang id yang sudah pernah muncul.

### 3.3 `src/features/dokumen/skema.ts`

**Berkas:** `src/features/dokumen/skema.ts` (berkas baru: buat)

```ts
import { z } from 'zod';

// Membaca jawaban database untuk daftar dan detail dokumen menjadi tipe aplikasi (zod).
// Baris yang bentuknya salah dilewati; aplikasi tidak tertutup karena satu baris rusak.

export type StatusDokumen = 'draft' | 'selesai';

export type DokumenRingkas = {
  id: string;
  judul: string;
  status: StatusDokumen;
  jumlahHalaman: number;
  dibuatPada: string;
  /** `url_hasil` halaman pertama untuk gambar mini; null bila dokumen belum punya halaman. */
  urlSampul: string | null;
};

const statusSchema = z.enum(['draft', 'selesai']);

const ringkasSchema = z.object({
  id: z.string(),
  judul: z.string(),
  status: statusSchema,
  jumlah_halaman: z.number().int(),
  dibuat_pada: z.string(),
  halaman_dokumen: z.array(z.object({ urutan: z.number().int(), url_hasil: z.string() })),
});

export function daftarDokumenDariBaris(data: unknown): DokumenRingkas[] {
  if (!Array.isArray(data)) return [];
  const hasil: DokumenRingkas[] = [];
  for (const baris of data) {
    const cek = ringkasSchema.safeParse(baris);
    if (!cek.success) continue;
    const d = cek.data;
    const pertama = [...d.halaman_dokumen].sort((a, b) => a.urutan - b.urutan)[0];
    hasil.push({
      id: d.id,
      judul: d.judul,
      status: d.status,
      jumlahHalaman: d.jumlah_halaman,
      dibuatPada: d.dibuat_pada,
      urlSampul: pertama?.url_hasil ?? null,
    });
  }
  return hasil;
}

export type HalamanDetail = {
  id: string;
  urutan: number;
  urlHasil: string;
};

export type DokumenDetail = {
  id: string;
  judul: string;
  status: StatusDokumen;
  dibuatPada: string;
  halaman: HalamanDetail[];
};

const detailSchema = z.object({
  id: z.string(),
  judul: z.string(),
  status: statusSchema,
  dibuat_pada: z.string(),
  halaman_dokumen: z.array(
    z.object({ id: z.string(), urutan: z.number().int(), url_hasil: z.string() }),
  ),
});

export function dokumenDetailDariBaris(data: unknown): DokumenDetail | null {
  const cek = detailSchema.safeParse(data);
  if (!cek.success) return null;
  const d = cek.data;
  return {
    id: d.id,
    judul: d.judul,
    status: d.status,
    dibuatPada: d.dibuat_pada,
    halaman: d.halaman_dokumen
      .map((h) => ({ id: h.id, urutan: h.urutan, urlHasil: h.url_hasil }))
      .sort((a, b) => a.urutan - b.urutan),
  };
}
```

Penjelasan: jawaban database dibaca dengan zod. Baris yang bentuknya salah **dilewati** (satu baris rusak tidak menutup aplikasi). Sampul = `url_hasil` halaman dengan `urutan` terkecil.

### 3.4 `src/features/dokumen/galat.ts`

**Berkas:** `src/features/dokumen/galat.ts` (berkas baru: buat)

```ts
// Galat untuk daftar, detail, ganti nama, dan hapus dokumen (Fase 7). Berkas ini murni (tanpa
// supabase atau React Native) supaya pemetaan kode galat bisa diuji dengan `npm test`.

export type JenisGalatDokumen = 'jaringan' | 'izin' | 'tidakada' | 'cloudinary' | 'lain';

const PESAN: Record<JenisGalatDokumen, string> = {
  jaringan: 'Tidak bisa terhubung ke server. Periksa internetmu, lalu coba lagi.',
  izin: 'Akunmu tidak diizinkan melakukan ini.',
  tidakada: 'Dokumen tidak ditemukan. Mungkin sudah dihapus.',
  cloudinary: 'Sebagian file belum bisa dihapus. Coba lagi; dokumenmu tidak hilang.',
  lain: 'Terjadi masalah saat memproses data. Coba lagi sebentar lagi.',
};

export class GalatDokumen extends Error {
  readonly kind: JenisGalatDokumen;
  constructor(kind: JenisGalatDokumen) {
    super(PESAN[kind]);
    this.name = 'GalatDokumen';
    this.kind = kind;
  }
}

type GalatPostgrest = { code?: string; message?: string };

/** Memetakan galat PostgREST ke jenis galat aplikasi. */
export function galatDariPostgrest(error: GalatPostgrest): GalatDokumen {
  if (error.code === '42501') return new GalatDokumen('izin');
  // Jaringan putus: klien mengembalikan galat tanpa kode, dengan pesan dari fetch.
  if (!error.code && /fetch|network|failed/i.test(error.message ?? '')) {
    return new GalatDokumen('jaringan');
  }
  return new GalatDokumen('lain');
}

/** Memetakan `kode` dari balasan galat Edge Function `delete-document`. */
export function galatDariKodeFungsi(kode: unknown): GalatDokumen {
  switch (kode) {
    case 'tidak_ada':
      return new GalatDokumen('tidakada');
    case 'bukan_pemilik':
    case 'belum_masuk':
      return new GalatDokumen('izin');
    case 'cloudinary_gagal':
      return new GalatDokumen('cloudinary');
    default:
      return new GalatDokumen('lain');
  }
}

export function pesanGalat(galat: unknown, cadangan = PESAN.lain): string {
  return galat instanceof GalatDokumen ? galat.message : cadangan;
}
```

Penjelasan: satu kelas galat (`GalatDokumen`) dengan lima jenis dan pesan Indonesia. `galatDariKodeFungsi` memetakan `kode` dari balasan galat Edge Function (bagian 4) ke jenis galat aplikasi.

### 3.5 Uji unit

**Berkas:** `tests/gambar.test.mjs` (berkas baru: buat)

```js
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { tambahkanKomponen, urlMini, urlTampil } from '../src/features/dokumen/gambar.ts';

const POLOS = 'https://res.cloudinary.com/demo/image/upload/v1700000000/abc123.jpg';
const DENGAN_EFEK =
  'https://res.cloudinary.com/demo/image/upload/c_crop,h_100,w_200,x_1,y_2/a_90/e_improve/v1700000000/abc123.jpg';

describe('tambahkanKomponen', () => {
  it('menyisipkan komponen sebelum segmen versi pada URL tanpa efek', () => {
    assert.equal(
      tambahkanKomponen(POLOS, ['w_300']),
      'https://res.cloudinary.com/demo/image/upload/w_300/v1700000000/abc123.jpg',
    );
  });
  it('menambah di AKHIR rantai efek, bukan di depannya', () => {
    assert.equal(
      tambahkanKomponen(DENGAN_EFEK, ['c_fill,w_300', 'q_auto']),
      'https://res.cloudinary.com/demo/image/upload/c_crop,h_100,w_200,x_1,y_2/a_90/e_improve/c_fill,w_300/q_auto/v1700000000/abc123.jpg',
    );
  });
  it('bekerja pada URL tanpa segmen versi', () => {
    assert.equal(
      tambahkanKomponen('https://res.cloudinary.com/demo/image/upload/abc123.jpg', ['q_auto']),
      'https://res.cloudinary.com/demo/image/upload/q_auto/abc123.jpg',
    );
  });
  it('tidak menganggap public_id berpola komponen sebagai rantai (segmen terakhir dilindungi)', () => {
    assert.equal(
      tambahkanKomponen('https://res.cloudinary.com/demo/image/upload/a_b.jpg', ['q_auto']),
      'https://res.cloudinary.com/demo/image/upload/q_auto/a_b.jpg',
    );
  });
  it('mengembalikan null untuk URL yang bukan /image/upload/', () => {
    assert.equal(tambahkanKomponen('https://example.com/foto.jpg', ['q_auto']), null);
    assert.equal(
      tambahkanKomponen('https://res.cloudinary.com/demo/video/upload/v1/x.mp4', ['q_auto']),
      null,
    );
  });
  it('tanpa komponen mengembalikan URL apa adanya', () => {
    assert.equal(tambahkanKomponen(POLOS, []), POLOS);
  });
});

describe('urlMini dan urlTampil', () => {
  it('urlMini: persegi, atas dipertahankan, format dan mutu otomatis', () => {
    assert.equal(
      urlMini(DENGAN_EFEK),
      'https://res.cloudinary.com/demo/image/upload/c_crop,h_100,w_200,x_1,y_2/a_90/e_improve/c_fill,g_north,h_300,w_300/f_auto/q_auto/v1700000000/abc123.jpg',
    );
  });
  it('urlMini menghormati ukuran dan membulatkannya', () => {
    assert.match(urlMini(POLOS, 144.4), /c_fill,g_north,h_144,w_144/);
  });
  it('urlTampil: c_limit supaya tidak pernah memperbesar', () => {
    assert.match(urlTampil(POLOS), /c_limit,h_1200,w_1200\/f_auto\/q_auto\/v1700000000/);
  });
  it('keduanya null untuk URL asing', () => {
    assert.equal(urlMini('https://example.com/a.jpg'), null);
    assert.equal(urlTampil('https://example.com/a.jpg'), null);
  });
});
```

**Berkas:** `tests/daftar.test.mjs` (berkas baru: buat)

```js
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  UKURAN_HALAMAN,
  formatTanggal,
  gabungTanpaGanda,
  labelHalaman,
  polaPencarian,
  rentangHalaman,
} from '../src/features/dokumen/daftar.ts';

describe('rentangHalaman', () => {
  it('halaman pertama 0..19 dan berikutnya berurutan tanpa celah', () => {
    assert.deepEqual(rentangHalaman(0), { dari: 0, sampai: UKURAN_HALAMAN - 1 });
    assert.deepEqual(rentangHalaman(1), { dari: 20, sampai: 39 });
    assert.deepEqual(rentangHalaman(2, 10), { dari: 20, sampai: 29 });
  });
});

describe('polaPencarian', () => {
  it('kosong atau spasi saja berarti tanpa pencarian', () => {
    assert.equal(polaPencarian(''), null);
    assert.equal(polaPencarian('   '), null);
  });
  it('dibungkus % dan spasi tepi dibuang', () => {
    assert.equal(polaPencarian('  kontrak '), '%kontrak%');
  });
  it('karakter khusus LIKE di-escape', () => {
    assert.equal(polaPencarian('50%_a\\b'), '%50\\%\\_a\\\\b%');
  });
  it('dibatasi 100 karakter', () => {
    assert.equal(polaPencarian('a'.repeat(300)), `%${'a'.repeat(100)}%`);
  });
});

describe('formatTanggal', () => {
  it('memakai bulan singkat Indonesia', () => {
    const iso = new Date(2026, 9, 17, 12, 0).toISOString();
    assert.equal(formatTanggal(iso), '17 Okt 2026');
    assert.equal(formatTanggal(new Date(2026, 4, 3, 12).toISOString()), '3 Mei 2026');
  });
  it('teks tidak terbaca menjadi tanda hubung', () => {
    assert.equal(formatTanggal('bukan tanggal'), '-');
  });
});

describe('labelHalaman', () => {
  it('menulis jumlah', () => assert.equal(labelHalaman(3), '3 halaman'));
});

describe('gabungTanpaGanda', () => {
  it('membuang id ganda antarhalaman dan menjaga urutan pertama kali muncul', () => {
    const hasil = gabungTanpaGanda([[{ id: 'a' }, { id: 'b' }], [{ id: 'b' }, { id: 'c' }], []]);
    assert.deepEqual(
      hasil.map((x) => x.id),
      ['a', 'b', 'c'],
    );
  });
});
```

**Berkas:** `tests/skemaDokumen.test.mjs` (berkas baru: buat)

```js
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { daftarDokumenDariBaris, dokumenDetailDariBaris } from '../src/features/dokumen/skema.ts';

const baris = (id, extra = {}) => ({
  id,
  judul: `Dokumen ${id}`,
  status: 'draft',
  jumlah_halaman: 2,
  dibuat_pada: '2026-10-17T05:40:00Z',
  halaman_dokumen: [{ urutan: 1, url_hasil: `https://x/${id}.jpg` }],
  ...extra,
});

describe('daftarDokumenDariBaris', () => {
  it('memetakan baris dan mengambil url_hasil halaman berurutan terkecil sebagai sampul', () => {
    const [d] = daftarDokumenDariBaris([
      baris('a', {
        halaman_dokumen: [
          { urutan: 3, url_hasil: 'https://x/3.jpg' },
          { urutan: 1, url_hasil: 'https://x/1.jpg' },
        ],
      }),
    ]);
    assert.equal(d.urlSampul, 'https://x/1.jpg');
    assert.equal(d.jumlahHalaman, 2);
    assert.equal(d.status, 'draft');
  });
  it('dokumen tanpa halaman: sampul null', () => {
    const [d] = daftarDokumenDariBaris([baris('a', { halaman_dokumen: [] })]);
    assert.equal(d.urlSampul, null);
  });
  it('baris rusak dilewati, yang benar tetap masuk', () => {
    const hasil = daftarDokumenDariBaris([
      baris('a'),
      { id: 1 },
      baris('b', { status: 'aneh' }),
      null,
    ]);
    assert.deepEqual(
      hasil.map((x) => x.id),
      ['a'],
    );
  });
  it('bukan larik: kosong', () => {
    assert.deepEqual(daftarDokumenDariBaris(null), []);
    assert.deepEqual(daftarDokumenDariBaris({}), []);
  });
});

describe('dokumenDetailDariBaris', () => {
  const detail = {
    id: 'd1',
    judul: 'Kontrak',
    status: 'selesai',
    dibuat_pada: '2026-10-17T05:40:00Z',
    halaman_dokumen: [
      { id: 'h2', urutan: 2, url_hasil: 'https://x/2.jpg' },
      { id: 'h1', urutan: 1, url_hasil: 'https://x/1.jpg' },
    ],
  };
  it('mengurutkan halaman menurut urutan', () => {
    const d = dokumenDetailDariBaris(detail);
    assert.deepEqual(
      d.halaman.map((h) => h.id),
      ['h1', 'h2'],
    );
  });
  it('bentuk salah: null', () => {
    assert.equal(dokumenDetailDariBaris({ ...detail, status: 'x' }), null);
    assert.equal(dokumenDetailDariBaris(null), null);
  });
});
```

Jalankan:

```bash
npm test
```

Seharusnya **59 lulus** (34 lama + 10 + 9 + 6). Uji `hapus.test.mjs` ditambahkan di bagian 4, jadi total akhirnya 81.

---

## 4. Tugas 7.5: Edge Function `delete-document`

### 4.1 `supabase/functions/delete-document/logic.ts`

Buat folder `supabase\functions\delete-document` (folder `supabase\functions` bisa belum ada).

**Berkas:** `supabase/functions/delete-document/logic.ts` (berkas baru: buat)

```ts
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
```

Penjelasan, per bagian:

- `tandatangani` membuat tanda tangan Cloudinary: pasangan `nama=nilai` diurutkan menurut nama, digabung dengan `&`, **API secret ditambahkan di ujung tanpa pemisah**, lalu di-hash SHA-1. Contoh resmi di dokumentasi Cloudinary menjadi vektor ujinya.
- `hapusAsetCloudinary` memanggil `POST https://api.cloudinary.com/v1_1/<cloud>/image/destroy` dengan `public_id`, `invalidate=true` (membersihkan cache CDN), `timestamp`, `api_key`, dan `signature`. Secret **tidak** ikut terkirim, hanya tanda tangannya. `result: 'ok'` berarti terhapus, `'not found'` dianggap beres, selain itu dilempar sebagai galat.
- `prosesHapus` adalah seluruh aturan main: pemanggil harus masuk (401), `dokumenId` harus berbentuk UUID (400), dokumen harus terlihat oleh pemanggil (404) dan miliknya (403), semua file dihapus lebih dulu (paling banyak `BATAS_BERSAMAAN` = 4 sekaligus; ada yang gagal = 502 **tanpa menyentuh baris**), baru baris dihapus. Kegagalan dicatat lewat `deps.catat` ke log function (tanpa secret).
- Semua dependensi (database, Cloudinary) disuntikkan lewat `Deps`, sehingga berkas ini diuji di Node tanpa jaringan.

### 4.2 `supabase/functions/delete-document/index.ts`

**Berkas:** `supabase/functions/delete-document/index.ts` (berkas baru: buat)

```ts
// Edge Function `delete-document` (tugas 7.5): menghapus dokumen milik pemanggil beserta semua
// file halamannya di Cloudinary. Dipanggil dari aplikasi lewat `supabase.functions.invoke`.
//
// Keamanan: `verify_jwt` bawaan (aktif) menolak permintaan tanpa JWT pengguna yang sah; kode di
// bawah masih memeriksa pemiliknya. Akses database memakai JWT pemanggil, jadi RLS tetap berlaku:
// fungsi ini TIDAK memakai secret key Supabase. API secret Cloudinary hanya ada sebagai secret
// fungsi (`supabase secrets set`), tidak pernah ada di aplikasi.
import { createClient } from 'npm:@supabase/supabase-js@2';

import { hapusAsetCloudinary, prosesHapus, type Deps, type Jawaban } from './logic.ts';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function balas(jawaban: Jawaban): Response {
  return new Response(JSON.stringify(jawaban.body), {
    status: jawaban.status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

function kunciPublik(): string {
  // Kunci publishable baru berbentuk JSON {"default": "sb_publishable_..."}; anon adalah cadangan.
  try {
    const kunci = JSON.parse(Deno.env.get('SUPABASE_PUBLISHABLE_KEYS') ?? '{}');
    if (typeof kunci.default === 'string') return kunci.default;
  } catch {
    // lanjut ke cadangan
  }
  return Deno.env.get('SUPABASE_ANON_KEY') ?? '';
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (req.method !== 'POST') {
    return balas({
      status: 405,
      body: { ok: false, kode: 'permintaan_salah', pesan: 'Gunakan metode POST.' },
    });
  }

  const cloudName = Deno.env.get('CLOUDINARY_CLOUD_NAME');
  const apiKey = Deno.env.get('CLOUDINARY_API_KEY');
  const apiSecret = Deno.env.get('CLOUDINARY_API_SECRET');
  const authorization = req.headers.get('Authorization') ?? '';
  if (!cloudName || !apiKey || !apiSecret) {
    console.error('Secret Cloudinary belum diatur di fungsi ini.');
    return balas({
      status: 500,
      body: { ok: false, kode: 'galat_server', pesan: 'Server belum dikonfigurasi.' },
    });
  }

  const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', kunciPublik(), {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  });
  const token = authorization.replace(/^Bearer\s+/i, '');
  const { data } = token ? await supabase.auth.getUser(token) : { data: { user: null } };

  const badan = await req.json().catch(() => null);

  const deps: Deps = {
    async cariDokumen(id) {
      const { data: baris, error } = await supabase
        .from('dokumen')
        .select('user_id')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      return baris ? { userId: baris.user_id as string } : null;
    },
    async daftarPublicId(dokumenId) {
      const { data: baris, error } = await supabase
        .from('halaman_dokumen')
        .select('public_id')
        .eq('dokumen_id', dokumenId);
      if (error) throw error;
      return (baris ?? []).map((b: { public_id: string }) => b.public_id);
    },
    hapusAset: (publicId) =>
      hapusAsetCloudinary(publicId, { cloudName, apiKey, apiSecret }, (url, init) =>
        fetch(url, init),
      ),
    catat: (pesan, galat) => console.error(pesan, galat instanceof Error ? galat.message : galat),
    async hapusBaris(dokumenId) {
      const { data: terhapus, error } = await supabase
        .from('dokumen')
        .delete()
        .eq('id', dokumenId)
        .select('id');
      if (error) throw error;
      return (terhapus?.length ?? 0) === 1;
    },
  };

  return balas(
    await prosesHapus({ userId: data.user?.id ?? null, dokumenId: badan?.dokumenId }, deps),
  );
});
```

Penjelasan, per bagian:

- `import { createClient } from 'npm:@supabase/supabase-js@2'`: awalan `npm:` adalah cara Deno (mesin Edge Functions) memuat paket npm. Berkas ini berjalan di Deno, bukan di Expo.
- `Deno.serve(...)` adalah pintu masuk. `OPTIONS` dijawab 204 dengan header CORS (aplikasi web dan pratinjau membutuhkannya; HP tidak).
- Secret Cloudinary dibaca dari `Deno.env`. Bila belum diatur, function menjawab 500 "Server belum dikonfigurasi" dan menulis ke log, **sebelum** menyentuh data apa pun.
- Klien Supabase dibuat dengan **kunci publishable** (dari variabel bawaan `SUPABASE_PUBLISHABLE_KEYS`, cadangan `SUPABASE_ANON_KEY`) dan header `Authorization` milik pemanggil. Itu sebabnya RLS berlaku. Function ini **tidak** memakai `SUPABASE_SECRET_KEYS`.
- `supabase.auth.getUser(token)` memastikan JWT sah dan mengambil id pengguna. Lapisan pertama sudah dijaga `verify_jwt` bawaan (4.5), ini lapisan kedua.
- `hapusBaris` memakai `.delete().eq('id', ...).select('id')` supaya kelihatan bila nol baris terhapus.

Bila kamu menjalankan `npm run typecheck` **sekarang**, akan muncul sekitar sembilan galat di `index.ts` (`Cannot find name 'Deno'`, `Cannot find module 'npm:...'`, dan impor berakhiran `.ts`). Itu wajar dan hilang setelah 4.3 (pada putar ulang panduan ini, itulah satu-satunya galat sementara).

### 4.3 Kecualikan berkas Deno dari `tsc` dan ESLint

`index.ts` memakai `Deno` dan `npm:` yang tidak dikenal `tsc` maupun ESLint proyek Expo. Kecualikan **hanya** `index.ts` (berkas `logic.ts` adalah TypeScript biasa dan tetap diperiksa).

Di `tsconfig.json`, tambahkan `"exclude"` setelah `"include"` (jangan lupa koma di akhir baris `"include"`):

```json
  "include": ["**/*.ts", "**/*.tsx", ".expo/types/**/*.ts", "expo-env.d.ts"],
  "exclude": ["node_modules", "supabase/functions/*/index.ts"]
```

Di `eslint.config.js`, ubah baris `ignores` menjadi:

```js
    ignores: ['dist/*', 'app-example/*', 'supabase/functions/*/index.ts'], // 6
```

Lalu:

```bash
npm run typecheck
npm run lint
```

Keduanya harus bersih.

### 4.4 Uji unit

**Berkas:** `tests/hapus.test.mjs` (berkas baru: buat)

```js
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  GalatDokumen,
  galatDariKodeFungsi,
  galatDariPostgrest,
  pesanGalat,
} from '../src/features/dokumen/galat.ts';
import {
  BATAS_BERSAMAAN,
  GalatCloudinary,
  hapusAsetCloudinary,
  prosesHapus,
  tandatangani,
} from '../supabase/functions/delete-document/logic.ts';

const ID = '3f2b8c1e-5a4d-4e0b-9c1a-0123456789ab';
const PEMILIK = 'u1';

describe('tandatangani (tanda tangan Cloudinary)', () => {
  it('cocok dengan contoh resmi di dokumentasi Cloudinary', async () => {
    const sig = await tandatangani(
      {
        eager: 'w_400,h_300,c_pad|w_260,h_200,c_crop',
        public_id: 'sample_image',
        timestamp: 1315060510,
      },
      'abcd',
    );
    assert.equal(sig, 'bfd09f95f331f558cbd1320e67aa8d488770583e');
  });
  it('urutan kunci masukan tidak berpengaruh', async () => {
    const a = await tandatangani({ b: 2, a: 1 }, 's');
    const b = await tandatangani({ a: 1, b: 2 }, 's');
    assert.equal(a, b);
  });
});

describe('hapusAsetCloudinary', () => {
  const konfig = { cloudName: 'demo', apiKey: 'KUNCI', apiSecret: 'abcd' };
  const jawab =
    (isi, status = 200) =>
    async () => ({ ok: status < 400, status, json: async () => isi });

  it('mengirim POST ke endpoint destroy dengan parameter bertanda tangan, tanpa membocorkan secret', async () => {
    let dipanggil;
    const hasil = await hapusAsetCloudinary(
      'pub1',
      konfig,
      async (url, init) => {
        dipanggil = { url, init };
        return { ok: true, status: 200, json: async () => ({ result: 'ok' }) };
      },
      () => 1315060510_000,
    );
    assert.equal(hasil, 'ok');
    assert.equal(dipanggil.url, 'https://api.cloudinary.com/v1_1/demo/image/destroy');
    assert.equal(dipanggil.init.method, 'POST');
    const badan = new URLSearchParams(dipanggil.init.body);
    assert.equal(badan.get('public_id'), 'pub1');
    assert.equal(badan.get('invalidate'), 'true');
    assert.equal(badan.get('timestamp'), '1315060510');
    assert.equal(badan.get('api_key'), 'KUNCI');
    assert.equal(
      badan.get('signature'),
      await tandatangani({ invalidate: 'true', public_id: 'pub1', timestamp: 1315060510 }, 'abcd'),
    );
    assert.ok(!dipanggil.init.body.includes('abcd'), 'secret tidak boleh ikut terkirim');
  });
  it('"not found" dianggap sudah terhapus', async () => {
    assert.equal(
      await hapusAsetCloudinary('p', konfig, jawab({ result: 'not found' })),
      'tidak_ada',
    );
  });
  it('hasil lain atau status galat dilempar', async () => {
    await assert.rejects(
      hapusAsetCloudinary('p', konfig, jawab({ error: { message: 'x' } }, 401)),
      GalatCloudinary,
    );
    await assert.rejects(
      hapusAsetCloudinary('p', konfig, jawab({ result: 'aneh' })),
      GalatCloudinary,
    );
  });
  it('jaringan putus dan balasan bukan JSON dilempar sebagai GalatCloudinary', async () => {
    await assert.rejects(
      hapusAsetCloudinary('p', konfig, async () => {
        throw new TypeError('fetch failed');
      }),
      GalatCloudinary,
    );
    await assert.rejects(
      hapusAsetCloudinary('p', konfig, async () => ({
        ok: false,
        status: 502,
        json: async () => {
          throw new Error('bukan json');
        },
      })),
      GalatCloudinary,
    );
  });
});

function dunia(opsi = {}) {
  const log = [];
  const deps = {
    async cariDokumen(id) {
      log.push(['cari', id]);
      return opsi.dokumen === undefined ? { userId: PEMILIK } : opsi.dokumen;
    },
    async daftarPublicId() {
      log.push(['daftar']);
      return opsi.publicIds ?? ['a', 'b', 'c'];
    },
    async hapusAset(id) {
      log.push(['aset', id]);
      if (opsi.gagalAset?.includes(id)) throw new GalatCloudinary('x');
      return opsi.tidakAda?.includes(id) ? 'tidak_ada' : 'ok';
    },
    async hapusBaris(id) {
      log.push(['baris', id]);
      return opsi.barisTerhapus ?? true;
    },
  };
  return { deps, log };
}

describe('prosesHapus', () => {
  it('sukses: semua aset dihapus LEBIH DULU, baru baris database', async () => {
    const { deps, log } = dunia();
    const r = await prosesHapus({ userId: PEMILIK, dokumenId: ID }, deps);
    assert.deepEqual(r, { status: 200, body: { ok: true, dihapus: 3 } });
    const iBaris = log.findIndex((l) => l[0] === 'baris');
    assert.equal(iBaris, log.length - 1);
    assert.equal(log.filter((l) => l[0] === 'aset').length, 3);
  });
  it('aset yang sudah hilang tidak menggagalkan (aman diulang)', async () => {
    const { deps } = dunia({ tidakAda: ['a', 'b', 'c'] });
    const r = await prosesHapus({ userId: PEMILIK, dokumenId: ID }, deps);
    assert.equal(r.status, 200);
  });
  it('satu aset gagal: 502, baris database TIDAK dihapus, aset lain tetap dicoba', async () => {
    const { deps, log } = dunia({ gagalAset: ['b'] });
    const r = await prosesHapus({ userId: PEMILIK, dokumenId: ID }, deps);
    assert.equal(r.status, 502);
    assert.equal(r.body.kode, 'cloudinary_gagal');
    assert.ok(!log.some((l) => l[0] === 'baris'));
    assert.equal(log.filter((l) => l[0] === 'aset').length, 3);
  });
  it('kegagalan dicatat ke log dengan id aset dan penyebabnya', async () => {
    const { deps } = dunia({ gagalAset: ['b'] });
    const catatan = [];
    deps.catat = (pesan, galat) => catatan.push([pesan, galat?.message]);
    await prosesHapus({ userId: PEMILIK, dokumenId: ID }, deps);
    assert.deepEqual(catatan, [['Gagal menghapus aset b', 'x']]);
    const { deps: d2 } = dunia();
    const catatan2 = [];
    d2.cariDokumen = async () => {
      throw new Error('db mati');
    };
    d2.catat = (pesan, galat) => catatan2.push([pesan, galat?.message]);
    await prosesHapus({ userId: PEMILIK, dokumenId: ID }, d2);
    assert.equal(catatan2.length, 1);
    assert.equal(catatan2[0][1], 'db mati');
  });
  it('belum masuk: 401 tanpa menyentuh database', async () => {
    const { deps, log } = dunia();
    const r = await prosesHapus({ userId: null, dokumenId: ID }, deps);
    assert.equal(r.status, 401);
    assert.equal(log.length, 0);
  });
  it('id bukan UUID atau bukan string: 400', async () => {
    const { deps, log } = dunia();
    for (const bad of [undefined, 5, '', '1; drop table dokumen', ID + 'x']) {
      const r = await prosesHapus({ userId: PEMILIK, dokumenId: bad }, deps);
      assert.equal(r.status, 400);
    }
    assert.equal(log.length, 0);
  });
  it('dokumen tidak terlihat (tidak ada atau bukan haknya menurut RLS): 404', async () => {
    const { deps, log } = dunia({ dokumen: null });
    const r = await prosesHapus({ userId: PEMILIK, dokumenId: ID }, deps);
    assert.equal(r.status, 404);
    assert.ok(!log.some((l) => l[0] === 'aset' || l[0] === 'baris'));
  });
  it('dokumen milik orang lain yang terlihat (mis. admin): 403, tidak ada yang dihapus', async () => {
    const { deps, log } = dunia({ dokumen: { userId: 'orang-lain' } });
    const r = await prosesHapus({ userId: PEMILIK, dokumenId: ID }, deps);
    assert.equal(r.status, 403);
    assert.ok(!log.some((l) => l[0] === 'aset' || l[0] === 'baris'));
  });
  it('baris tidak terhapus setelah aset hilang: 500 dengan kode khusus', async () => {
    const { deps } = dunia({ barisTerhapus: false });
    const r = await prosesHapus({ userId: PEMILIK, dokumenId: ID }, deps);
    assert.equal(r.status, 500);
    assert.equal(r.body.kode, 'gagal_hapus_baris');
  });
  it('galat tak terduga di database menjadi 500 galat_server, bukan pengecualian', async () => {
    const { deps } = dunia();
    deps.cariDokumen = async () => {
      throw new Error('db mati');
    };
    const r = await prosesHapus({ userId: PEMILIK, dokumenId: ID }, deps);
    assert.equal(r.status, 500);
    assert.equal(r.body.kode, 'galat_server');
  });
  it('dokumen tanpa halaman: langsung hapus baris (dihapus: 0)', async () => {
    const { deps } = dunia({ publicIds: [] });
    const r = await prosesHapus({ userId: PEMILIK, dokumenId: ID }, deps);
    assert.deepEqual(r, { status: 200, body: { ok: true, dihapus: 0 } });
  });
  it('public_id kosong diabaikan', async () => {
    const { deps, log } = dunia({ publicIds: ['a', '  ', ''] });
    await prosesHapus({ userId: PEMILIK, dokumenId: ID }, deps);
    assert.equal(log.filter((l) => l[0] === 'aset').length, 1);
  });
  it(`paling banyak ${BATAS_BERSAMAAN} penghapusan berjalan bersamaan`, async () => {
    const { deps } = dunia({ publicIds: Array.from({ length: 30 }, (_, i) => `p${i}`) });
    let aktif = 0;
    let puncak = 0;
    deps.hapusAset = async () => {
      aktif += 1;
      puncak = Math.max(puncak, aktif);
      await new Promise((r) => setTimeout(r, 5));
      aktif -= 1;
      return 'ok';
    };
    const r = await prosesHapus({ userId: PEMILIK, dokumenId: ID }, deps);
    assert.equal(r.body.dihapus, 30);
    assert.ok(puncak <= BATAS_BERSAMAAN && puncak > 1, `puncak=${puncak}`);
  });
});

describe('pemetaan galat di aplikasi', () => {
  it('kode fungsi → jenis galat', () => {
    assert.equal(galatDariKodeFungsi('tidak_ada').kind, 'tidakada');
    assert.equal(galatDariKodeFungsi('bukan_pemilik').kind, 'izin');
    assert.equal(galatDariKodeFungsi('belum_masuk').kind, 'izin');
    assert.equal(galatDariKodeFungsi('cloudinary_gagal').kind, 'cloudinary');
    assert.equal(galatDariKodeFungsi('galat_server').kind, 'lain');
    assert.equal(galatDariKodeFungsi(undefined).kind, 'lain');
  });
  it('galat PostgREST → jenis galat', () => {
    assert.equal(galatDariPostgrest({ code: '42501' }).kind, 'izin');
    assert.equal(galatDariPostgrest({ message: 'TypeError: Failed to fetch' }).kind, 'jaringan');
    assert.equal(galatDariPostgrest({ code: 'XX000', message: 'failed' }).kind, 'lain');
  });
  it('pesanGalat memakai pesan sendiri, selain itu cadangan', () => {
    assert.equal(pesanGalat(new GalatDokumen('jaringan')), new GalatDokumen('jaringan').message);
    assert.equal(pesanGalat(new Error('x'), 'cadangan'), 'cadangan');
  });
});
```

```bash
npm test
```

Seharusnya **81 lulus**. Di dalamnya ada vektor uji tanda tangan dari dokumentasi Cloudinary (`bfd09f95f331f558cbd1320e67aa8d488770583e`) dan uji bahwa **baris dihapus paling akhir**, **gagal sebagian tidak menghapus baris**, dan **secret tidak ikut terkirim**.

### 4.5 Pasang secret dan deploy

Kamu butuh tiga nilai dari Cloudinary: **cloud name** (sama dengan `EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME` di `.env`), **API key**, dan **API secret**. Dua yang terakhir ada di Console Cloudinary: ikon roda gigi (**Settings**) lalu **API Keys**. **API secret jangan kamu kirim kepadaku, jangan ditempel di chat, dan jangan masuk `.env` aplikasi** (semua `EXPO_PUBLIC_*` terbaca dari APK).

Simpan nilainya di berkas sementara **di luar repo**, lalu kirim ke Supabase dengan `--env-file`:

```bash
mkdir C:\scannest-rahasia
notepad C:\scannest-rahasia\functions.env
```

Isi berkas (ganti nilainya, tanpa tanda kutip):

```
CLOUDINARY_CLOUD_NAME=namacloudmu
CLOUDINARY_API_KEY=angka-api-key-mu
CLOUDINARY_API_SECRET=api-secret-mu
```

Simpan, tutup, lalu di `C:\scannest`:

```bash
npx supabase secrets set --env-file C:\scannest-rahasia\functions.env
npx supabase secrets list
del C:\scannest-rahasia\functions.env
```

`secrets list` hanya menampilkan **nama** dan ringkasan (digest), bukan nilainya; ketiga nama di atas harus ada. Nama secret tidak boleh berawalan `SUPABASE_` (dicadangkan). Function yang sudah terpasang membaca secret baru tanpa perlu deploy ulang.

Deploy (folder sudah terhubung ke proyekmu sejak Fase 2):

```bash
npx supabase functions deploy delete-document --use-api
```

`--use-api` membundel function di server Supabase, jadi **tidak butuh Docker**. Bila perintah meminta Docker atau gagal, kirim keluarannya kepadaku. Setelah berhasil, buka Dashboard Supabase > **Edge Functions** > `delete-document`: pastikan statusnya aktif dan pengaturan **Verify JWT** menyala.

### 4.6 Uji function dengan `curl`

Ambil **Project URL** dari `.env` (`EXPO_PUBLIC_SUPABASE_URL`, bentuk `https://abcdefghijkl.supabase.co`) dan **publishable key** (`EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`). Tiga uji berikut **tidak menghapus apa pun**.

**Uji 1: tanpa login harus ditolak.**

```bash
curl -i -X POST "https://abcdefghijkl.supabase.co/functions/v1/delete-document" -H "Content-Type: application/json" -d "{}"
```

Diharapkan: `HTTP/2 401` (ditolak gerbang karena tidak ada JWT).

**Uji 2: ambil token masuk sementara.** Ganti email dan sandi dengan milikmu (bila sandimu memuat `%`, hindari uji ini dan lewati ke uji lewat aplikasi di 9.2):

```bash
curl -s -X POST "https://abcdefghijkl.supabase.co/auth/v1/token?grant_type=password" -H "apikey: sb_publishable_xxxxx" -H "Content-Type: application/json" -d "{\"email\":\"emailmu@contoh.com\",\"password\":\"sandimu\"}"
```

Dari JSON yang keluar, salin nilai `access_token` (teks panjang berawalan `eyJ`). Token berlaku sekitar satu jam; **jangan ditempel di chat atau issue**.

**Uji 3: panggil dengan id dokumen yang tidak ada.**

```bash
set TOKEN=eyJ...tempel-token-di-sini
curl -i -X POST "https://abcdefghijkl.supabase.co/functions/v1/delete-document" -H "Authorization: Bearer %TOKEN%" -H "apikey: sb_publishable_xxxxx" -H "Content-Type: application/json" -d "{\"dokumenId\":\"00000000-0000-4000-8000-000000000000\"}"
set TOKEN=
```

Diharapkan: `HTTP/2 404` dengan badan `{"ok":false,"kode":"tidak_ada","pesan":"Dokumen tidak ditemukan."}`. Itu membuktikan function hidup, JWT diterima, dan akses database dengan RLS bekerja. Bila hasilnya **500** dengan pesan "Server belum dikonfigurasi", secret belum terpasang (ulangi 4.5). Bila **401**, token salah atau kedaluwarsa.

Uji menghapus yang sebenarnya dilakukan lewat aplikasi di 9.2 (nomor 9 dan 10).

---

## 5. Tugas 7.1 dan 7.4: akses data dan TanStack Query

### 5.1 `src/features/dokumen/kelola.ts`

**Berkas:** `src/features/dokumen/kelola.ts` (berkas baru: buat)

```ts
import { FunctionsFetchError, FunctionsHttpError } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';

import { UKURAN_HALAMAN, polaPencarian, rentangHalaman, type FilterStatus } from './daftar';
import { GalatDokumen, galatDariKodeFungsi, galatDariPostgrest } from './galat';
import {
  daftarDokumenDariBaris,
  dokumenDetailDariBaris,
  type DokumenDetail,
  type DokumenRingkas,
} from './skema';

// Akses data untuk daftar, detail, ganti nama, dan hapus dokumen (Fase 7). Pembacaan dan
// pengubahan judul langsung ke tabel (dijaga RLS); penghapusan lewat Edge Function `delete-document`
// karena file di Cloudinary harus ikut terhapus dan itu butuh API secret yang hanya ada di server.

export type HalamanDaftar = { item: DokumenRingkas[]; adaLagi: boolean };

/**
 * Satu halaman daftar dokumen milik `userId`, terbaru dulu. `user_id` difilter eksplisit karena
 * RLS mengizinkan admin membaca semua dokumen, sedangkan Dashboard hanya untuk dokumen sendiri.
 * Dari tiap dokumen hanya halaman pertama yang dibawa (untuk gambar mini).
 */
export async function muatDaftarDokumen(params: {
  userId: string;
  halamanKe: number;
  status: FilterStatus;
  kata: string;
}): Promise<HalamanDaftar> {
  const { dari, sampai } = rentangHalaman(params.halamanKe);
  let kueri = supabase
    .from('dokumen')
    .select('id, judul, status, jumlah_halaman, dibuat_pada, halaman_dokumen(urutan, url_hasil)')
    .eq('user_id', params.userId)
    .order('dibuat_pada', { ascending: false })
    .order('id', { ascending: false })
    .order('urutan', { referencedTable: 'halaman_dokumen', ascending: true })
    .limit(1, { referencedTable: 'halaman_dokumen' });
  if (params.status !== 'semua') kueri = kueri.eq('status', params.status);
  const pola = polaPencarian(params.kata);
  if (pola) kueri = kueri.ilike('judul', pola);

  // `.retry(false)`: postgrest-js mengulang GET sendiri sampai 3 kali (jeda 1, 2, 4 detik) saat
  // jaringan putus, sehingga pengguna menunggu ±7 detik. Pengulangan diatur satu kali di TanStack Query.
  const { data, error } = await kueri.range(dari, sampai).retry(false);
  if (error) throw galatDariPostgrest(error);
  const baris = Array.isArray(data) ? data : [];
  return { item: daftarDokumenDariBaris(baris), adaLagi: baris.length >= UKURAN_HALAMAN };
}

/** Satu dokumen beserta semua halamannya, untuk layar detail. */
export async function muatDetailDokumen(params: {
  userId: string;
  dokumenId: string;
}): Promise<DokumenDetail> {
  const { data, error } = await supabase
    .from('dokumen')
    .select('id, judul, status, dibuat_pada, halaman_dokumen(id, urutan, url_hasil)')
    .eq('id', params.dokumenId)
    .eq('user_id', params.userId)
    .retry(false)
    .maybeSingle();
  if (error) throw galatDariPostgrest(error);
  if (!data) throw new GalatDokumen('tidakada');
  const detail = dokumenDetailDariBaris(data);
  if (!detail) throw new GalatDokumen('lain');
  return detail;
}

/** Mengganti judul. `.select('id')` dipakai supaya UPDATE yang menyentuh nol baris ketahuan. */
export async function ubahJudulDokumen(params: {
  dokumenId: string;
  judul: string;
}): Promise<void> {
  const { data, error } = await supabase
    .from('dokumen')
    .update({ judul: params.judul })
    .eq('id', params.dokumenId)
    .select('id');
  if (error) throw galatDariPostgrest(error);
  if (!data || data.length === 0) throw new GalatDokumen('tidakada');
}

/**
 * Menghapus dokumen lewat Edge Function: file Cloudinary lebih dulu, baru baris database.
 * Aman diulang: bila percobaan sebelumnya gagal di tengah, file yang sudah hilang dianggap beres.
 */
export async function hapusDokumen(dokumenId: string): Promise<void> {
  const { error } = await supabase.functions.invoke('delete-document', { body: { dokumenId } });
  if (!error) return;

  if (error instanceof FunctionsFetchError) throw new GalatDokumen('jaringan');
  if (error instanceof FunctionsHttpError) {
    const isi: unknown = await error.context.json().catch(() => null);
    throw galatDariKodeFungsi((isi as { kode?: unknown } | null)?.kode);
  }
  throw new GalatDokumen('lain');
}
```

Penjelasan: `muatDaftarDokumen` menyusun satu kueri: `.eq('user_id', ...)` (K47), urutan `dibuat_pada` lalu `id` menurun (urutan tetap meski dua dokumen punya waktu sama), embed `halaman_dokumen(urutan, url_hasil)` dibatasi **satu baris** terurut (cukup untuk sampul), filter status dan `ilike` bila ada, lalu `.range(dari, sampai)`. `.retry(false)` mematikan ulang otomatis `postgrest-js` (K44). `adaLagi` bernilai benar bila jumlah baris mentah penuh 20. `hapusDokumen` memanggil Edge Function dan menerjemahkan tiga macam galat: `FunctionsFetchError` (jaringan), `FunctionsHttpError` (function menjawab non-2xx; `kode` di badan dipetakan ke pesan), dan lainnya.

### 5.2 `src/features/dokumen/hooks.ts`

**Berkas:** `src/features/dokumen/hooks.ts` (berkas baru: buat)

```ts
import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import { gabungTanpaGanda, type FilterStatus } from './daftar';
import { hapusDokumen, muatDaftarDokumen, muatDetailDokumen, ubahJudulDokumen } from './kelola';

// Semua kunci cache diawali id pengguna: dokumen akun lain tidak pernah tercampur, dan
// `invalidateQueries({ queryKey: kunciDokumen.semua(id) })` menyegarkan daftar sekaligus detail.
export const kunciDokumen = {
  semua: (userId: string) => ['dokumen', userId] as const,
  daftar: (userId: string, status: FilterStatus, kata: string) =>
    ['dokumen', userId, 'daftar', status, kata] as const,
  detail: (userId: string, dokumenId: string) => ['dokumen', userId, 'detail', dokumenId] as const,
};

export function useDaftarDokumen(userId: string, status: FilterStatus, kata: string) {
  return useInfiniteQuery({
    queryKey: kunciDokumen.daftar(userId, status, kata),
    queryFn: ({ pageParam }) => muatDaftarDokumen({ userId, halamanKe: pageParam, status, kata }),
    initialPageParam: 0,
    getNextPageParam: (terakhir, semua) => (terakhir.adaLagi ? semua.length : undefined),
    select: (data) => gabungTanpaGanda(data.pages.map((halaman) => halaman.item)),
    // Saat kata kunci atau filter berganti, daftar lama tetap tampil sampai yang baru siap.
    placeholderData: keepPreviousData,
  });
}

export function useDetailDokumen(userId: string, dokumenId: string) {
  return useQuery({
    queryKey: kunciDokumen.detail(userId, dokumenId),
    queryFn: () => muatDetailDokumen({ userId, dokumenId }),
  });
}

export function useUbahJudul(userId: string) {
  const klien = useQueryClient();
  return useMutation({
    mutationFn: ubahJudulDokumen,
    onSuccess: () => klien.invalidateQueries({ queryKey: kunciDokumen.semua(userId) }),
  });
}

export function useHapusDokumen(userId: string) {
  const klien = useQueryClient();
  return useMutation({
    mutationFn: hapusDokumen,
    onSuccess: (_hasil, dokumenId) => {
      // Detail dokumen yang baru dihapus dibuang dulu agar tidak sempat dimuat ulang (404).
      klien.removeQueries({ queryKey: kunciDokumen.detail(userId, dokumenId) });
      return klien.invalidateQueries({ queryKey: kunciDokumen.semua(userId) });
    },
  });
}
```

Penjelasan: `kunciDokumen` menyeragamkan kunci cache dan selalu diawali id pengguna. `useDaftarDokumen` memakai `useInfiniteQuery` (halaman berikutnya = jumlah halaman yang sudah dimuat), `select` meratakan hasil dan membuang ganda, dan `placeholderData: keepPreviousData` menjaga daftar lama tetap tampil saat kata kunci berubah. `useUbahJudul` dan `useHapusDokumen` menyegarkan semua kunci milik pengguna setelah berhasil; hapus juga membuang cache detail dokumen itu agar tidak sempat dimuat ulang (404).

### 5.3 `src/features/dokumen/QueryProvider.tsx`

**Berkas:** `src/features/dokumen/QueryProvider.tsx` (berkas baru: buat)

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState, type ReactNode } from 'react';

import { useAuth } from '@/features/auth';

// Pembungkus TanStack Query. Harus berada DI DALAM AuthProvider: begitu pengguna keluar, seluruh
// cache dibuang supaya data akun sebelumnya tidak tersisa di memori.
export function QueryProvider({ children }: { children: ReactNode }) {
  const [klien] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Satu kali ulang untuk galat sementara (jaringan, server). Galat yang pasti sama
            // hasilnya bila diulang (izin ditolak, dokumen tidak ada) langsung ditampilkan.
            retry: (jumlah, galat) =>
              jumlah < 1 && !['izin', 'tidakada'].includes((galat as { kind?: string }).kind ?? ''),
            staleTime: 30_000,
            refetchOnReconnect: true,
          },
        },
      }),
  );
  const { session } = useAuth();
  const userId = session?.user.id ?? null;

  useEffect(() => {
    if (!userId) klien.clear();
  }, [userId, klien]);

  return <QueryClientProvider client={klien}>{children}</QueryClientProvider>;
}
```

Penjelasan: `QueryClient` dibuat sekali. Aturan ulang: satu kali, **kecuali** galat `izin` dan `tidakada` (hasilnya pasti sama). Saat `session` hilang (keluar), seluruh cache dibuang. Pembungkus ini harus berada **di dalam** `AuthProvider` karena memakai `useAuth`; pemasangannya ada di 7.6.

---

## 6. Komponen bersama: Chip, Skeleton, Dialog

### 6.1 `src/components/Chip.tsx`

**Berkas:** `src/components/Chip.tsx` (berkas baru: buat)

```tsx
import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, minTouchSize, radius, spacing, typography } from '@/theme';

type ChipProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
};

// Pilihan filter berbentuk pil. Status terpilih diumumkan lewat accessibilityState, bukan warna saja.
export function Chip({ label, selected, onPress }: ChipProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        selected ? styles.selected : styles.idle,
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.label, { color: selected ? colors.onPrimary : colors.text }]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: minTouchSize,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    flexGrow: 0,
  },
  selected: { backgroundColor: colors.primary, borderColor: colors.primary },
  idle: { backgroundColor: colors.surface, borderColor: colors.inputBorder },
  pressed: { opacity: 0.85 },
  label: { ...typography.bodyStrong },
});
```

### 6.2 `src/components/Skeleton.tsx`

**Berkas:** `src/components/Skeleton.tsx` (berkas baru: buat)

```tsx
import { useEffect, useRef } from 'react';
import { Animated, Platform, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius } from '@/theme';

type SkeletonProps = { style?: StyleProp<ViewStyle> };

// Blok abu-abu berdenyut sebagai pengganti konten yang sedang dimuat. Tidak dibacakan pembaca
// layar (pembungkusnya yang memberi tahu "memuat").
export function Skeleton({ style }: SkeletonProps) {
  const redup = useRef(new Animated.Value(0.55)).current;

  useEffect(() => {
    const putaran = Animated.loop(
      Animated.sequence([
        Animated.timing(redup, {
          toValue: 1,
          duration: 700,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(redup, {
          toValue: 0.55,
          duration: 700,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]),
    );
    putaran.start();
    return () => putaran.stop();
  }, [redup]);

  return (
    <Animated.View
      importantForAccessibility="no-hide-descendants"
      style={[styles.blok, { opacity: redup }, style]}
    />
  );
}

const styles = StyleSheet.create({
  blok: { backgroundColor: colors.border, borderRadius: radius.sm },
});
```

### 6.3 `src/components/Dialog.tsx`

**Berkas:** `src/components/Dialog.tsx` (berkas baru: buat)

```tsx
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/theme';

import { Banner } from './Banner';
import { Button } from './Button';

type DialogProps = {
  visible: boolean;
  title: string;
  message?: string;
  /** Isi tambahan di bawah pesan, misalnya kolom isian. */
  children?: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  /** true: tombol konfirmasi merah (aksi yang tidak bisa dibatalkan). */
  destructive?: boolean;
  /** true: sedang memproses; tombol terkunci dan dialog tidak bisa ditutup. */
  busy?: boolean;
  confirmDisabled?: boolean;
  /** Pesan galat dari percobaan sebelumnya. */
  error?: string | null;
};

// Dialog konfirmasi buatan sendiri (bukan Alert bawaan) agar tampilannya konsisten di semua
// platform dan bisa memuat kolom isian serta pesan galat.
export function Dialog({
  visible,
  title,
  message,
  children,
  confirmLabel,
  cancelLabel = 'Batal',
  onConfirm,
  onCancel,
  destructive = false,
  busy = false,
  confirmDisabled = false,
  error,
}: DialogProps) {
  const tutup = () => {
    if (!busy) onCancel();
  };
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={tutup}>
      <KeyboardAvoidingView behavior="padding" style={styles.latar}>
        <Pressable
          accessibilityLabel="Tutup dialog"
          accessibilityRole="button"
          style={StyleSheet.absoluteFill}
          onPress={tutup}
        />
        <View accessibilityViewIsModal role="alertdialog" aria-label={title} style={styles.kotak}>
          <Text accessibilityRole="header" style={styles.judul}>
            {title}
          </Text>
          {message ? <Text style={styles.pesan}>{message}</Text> : null}
          {children}
          {error ? <Banner message={error} /> : null}
          <View style={styles.tombol}>
            <Button title={cancelLabel} variant="ghost" onPress={tutup} disabled={busy} />
            <Button
              title={confirmLabel}
              variant={destructive ? 'danger' : 'primary'}
              onPress={onConfirm}
              loading={busy}
              disabled={confirmDisabled}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  latar: {
    flex: 1,
    backgroundColor: 'rgba(43,36,32,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  kotak: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    gap: spacing.md,
  },
  judul: { ...typography.heading, color: colors.text },
  pesan: { ...typography.body, color: colors.textMuted },
  tombol: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
});
```

### 6.4 `src/components/index.ts`

**Berkas:** `src/components/index.ts` (berkas lama: ganti seluruh isinya)

```ts
export { Banner } from './Banner';
export { Button } from './Button';
export { Card } from './Card';
export { Chip } from './Chip';
export { Dialog } from './Dialog';
export { EmptyState } from './EmptyState';
export { IconButton } from './IconButton';
export { LoadingScreen } from './LoadingScreen';
export { PlaceholderScreen } from './PlaceholderScreen';
export { Screen } from './Screen';
export { ScreenHeader } from './ScreenHeader';
export { Skeleton } from './Skeleton';
export { Slider } from './Slider';
export { TextField } from './TextField';
```

Penjelasan: `Chip` menandai pilihan lewat `accessibilityState.selected` **dan** warna (tidak hanya warna). `Skeleton` berdenyut dengan `Animated` dan disembunyikan dari pembaca layar. `Dialog` memakai `Modal` transparan; tombol latar dan tombol Kembali Android menutupnya **kecuali** saat `busy` (sedang memproses), supaya permintaan hapus tidak ditinggalkan di tengah jalan.

---

## 7. Tugas 7.1 sampai 7.7: layar Dashboard dan detail

### 7.1 `src/features/editor/index.ts`

Berkas lama dari Fase 6; **ganti seluruh isinya** (tambahan satu baris: ekspor `useDebouncedValue`, dipakai pencarian).

**Berkas:** `src/features/editor/index.ts` (berkas lama: ganti seluruh isinya)

```ts
export { buildCloudinaryUrl } from './cloudinaryUrl';
export { EFEK_BAWAAN, LABEL_FILTER, type Efek, type FilterFoto } from './efek';
export { GalatEditor, muatDokumenPercantik, muatHalaman, simpanEfek } from './api';
export { DaftarPercantik } from './DaftarPercantik';
export { EditorFoto } from './EditorFoto';
export type { DokumenPercantik, HalamanEditor, HalamanRingkas } from './skema';
export { useDebouncedValue } from './useDebouncedValue';
```

### 7.2 `src/features/dokumen/KartuDokumen.tsx`

**Berkas:** `src/features/dokumen/KartuDokumen.tsx` (berkas baru: buat)

```tsx
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { Card, Skeleton } from '@/components';
import { colors, radius, spacing, typography } from '@/theme';

import { LABEL_STATUS, formatTanggal, labelHalaman } from './daftar';
import { urlMini } from './gambar';
import type { DokumenRingkas, StatusDokumen } from './skema';

const SISI_MINI = 72;

export function LabelStatus({ status }: { status: StatusDokumen }) {
  const selesai = status === 'selesai';
  return (
    <View style={[styles.lencana, selesai ? styles.lencanaSelesai : styles.lencanaDraft]}>
      <Text style={[styles.lencanaTeks, { color: selesai ? colors.primary : colors.text }]}>
        {LABEL_STATUS[status]}
      </Text>
    </View>
  );
}

// Satu baris dokumen di daftar: gambar mini, judul, status, jumlah halaman, tanggal.
export function KartuDokumen({
  dokumen,
  onPress,
}: {
  dokumen: DokumenRingkas;
  onPress: () => void;
}) {
  const mini = dokumen.urlSampul ? (urlMini(dokumen.urlSampul) ?? dokumen.urlSampul) : null;
  return (
    <Card
      onPress={onPress}
      accessibilityLabel={`${dokumen.judul}, ${LABEL_STATUS[dokumen.status]}, ${labelHalaman(dokumen.jumlahHalaman)}`}
      style={styles.kartu}
    >
      {mini ? (
        <Image
          source={{ uri: mini }}
          contentFit="cover"
          transition={150}
          accessibilityLabel={`Sampul ${dokumen.judul}`}
          style={styles.mini}
        />
      ) : (
        <View style={[styles.mini, styles.miniKosong]}>
          <Ionicons name="document-outline" size={28} color={colors.textMuted} />
        </View>
      )}
      <View style={styles.teks}>
        <Text numberOfLines={2} style={styles.judul}>
          {dokumen.judul}
        </Text>
        <Text style={styles.info}>
          {labelHalaman(dokumen.jumlahHalaman)} · {formatTanggal(dokumen.dibuatPada)}
        </Text>
        <LabelStatus status={dokumen.status} />
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
    </Card>
  );
}

/** Kerangka kartu selagi daftar dimuat. */
export function KartuDokumenKerangka() {
  return (
    <Card style={styles.kartu}>
      <Skeleton style={styles.mini} />
      <View style={styles.teks}>
        <Skeleton style={styles.kerangkaJudul} />
        <Skeleton style={styles.kerangkaInfo} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  kartu: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
  mini: { width: SISI_MINI, height: SISI_MINI, borderRadius: radius.md },
  miniKosong: {
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  teks: { flex: 1, gap: spacing.xs, alignItems: 'flex-start' },
  judul: { ...typography.bodyStrong, color: colors.text },
  info: { ...typography.caption, color: colors.textMuted },
  lencana: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.pill },
  lencanaDraft: { backgroundColor: colors.border },
  lencanaSelesai: { backgroundColor: colors.primarySoft },
  lencanaTeks: { ...typography.caption },
  kerangkaJudul: { height: 18, width: '70%' },
  kerangkaInfo: { height: 14, width: '45%' },
});
```

### 7.3 `src/features/dokumen/DaftarDokumen.tsx`

**Berkas:** `src/features/dokumen/DaftarDokumen.tsx` (berkas baru: buat)

```tsx
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { Banner, Button, Chip, EmptyState, TextField } from '@/components';
import { useDebouncedValue } from '@/features/editor';
import { colors, spacing, typography } from '@/theme';

import { FILTER_STATUS, LABEL_FILTER, type FilterStatus } from './daftar';
import { pesanGalat } from './galat';
import { kunciDokumen, useDaftarDokumen } from './hooks';
import { KartuDokumen, KartuDokumenKerangka } from './KartuDokumen';

type DaftarDokumenProps = {
  userId: string;
  /** Bagian paling atas (judul, kartu akun, dsb.) yang ikut tergulir bersama daftar. */
  atas?: ReactNode;
};

const JEDA_CARI_MS = 400;

// Daftar dokumen di Dashboard (tugas 7.1, 7.6, 7.7): FlatList dengan paginasi 20 baris,
// pull-to-refresh, pencarian judul (ditunda 400 ms), filter status, skeleton, dan empty state.
export function DaftarDokumen({ userId, atas }: DaftarDokumenProps) {
  const router = useRouter();
  const klien = useQueryClient();
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<FilterStatus>('semua');
  const [menyegarkan, setMenyegarkan] = useState(false);
  const kata = useDebouncedValue(input, JEDA_CARI_MS);
  const q = useDaftarDokumen(userId, status, kata.trim());

  // Segarkan tiap Dashboard kembali terlihat (mis. setelah menyimpan efek di editor atau menghapus
  // dokumen). Fokus pertama dilewati karena kueri sudah berjalan sendiri saat layar dibuka.
  const pertama = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (pertama.current) {
        pertama.current = false;
        return;
      }
      void klien.invalidateQueries({ queryKey: kunciDokumen.semua(userId) });
    }, [klien, userId]),
  );

  const tarikSegar = async () => {
    setMenyegarkan(true);
    try {
      await q.refetch();
    } finally {
      setMenyegarkan(false);
    }
  };

  const adaPenyaring = status !== 'semua' || kata.trim() !== '';
  const bukaDokumen = (id: string) => router.push({ pathname: '/dokumen/[id]', params: { id } });

  const kepala = (
    <View style={styles.kepala}>
      {atas}
      <TextField
        label="Cari dokumen"
        placeholder="Ketik judul dokumen"
        value={input}
        onChangeText={setInput}
        returnKeyType="search"
        autoCorrect={false}
        maxLength={100}
      />
      <View style={styles.chip}>
        {FILTER_STATUS.map((nilai) => (
          <Chip
            key={nilai}
            label={LABEL_FILTER[nilai]}
            selected={status === nilai}
            onPress={() => setStatus(nilai)}
          />
        ))}
      </View>
    </View>
  );

  let kosong: ReactNode = null;
  if (q.isPending) {
    kosong = (
      <View accessibilityLabel="Memuat dokumen" accessibilityLiveRegion="polite" style={styles.gap}>
        {[0, 1, 2, 3].map((i) => (
          <KartuDokumenKerangka key={i} />
        ))}
      </View>
    );
  } else if (q.isError && !q.data) {
    kosong = (
      <View style={styles.gap}>
        <Banner message={pesanGalat(q.error, 'Daftar dokumen belum bisa dimuat.')} />
        <Button title="Coba lagi" variant="secondary" onPress={() => void q.refetch()} />
      </View>
    );
  } else if (adaPenyaring) {
    kosong = (
      <EmptyState
        icon="search-outline"
        title="Tidak ada dokumen yang cocok"
        description="Coba kata kunci lain atau ubah filter statusnya."
        actionLabel="Hapus pencarian dan filter"
        onAction={() => {
          setInput('');
          setStatus('semua');
        }}
      />
    );
  } else {
    kosong = (
      <EmptyState
        icon="document-text-outline"
        title="Belum ada dokumen"
        description="Scan dokumen pertamamu lewat tab Kamera. Hasilnya akan muncul di sini."
        actionLabel="Mulai scan"
        onAction={() => router.navigate('/kamera')}
      />
    );
  }

  const kaki = q.isFetchNextPageError ? (
    <View style={styles.gap}>
      <Banner message="Dokumen berikutnya belum bisa dimuat." />
      <Button title="Muat lagi" variant="secondary" onPress={() => void q.fetchNextPage()} />
    </View>
  ) : q.isFetchingNextPage ? (
    <View accessibilityLabel="Memuat dokumen berikutnya" style={styles.kaki}>
      <ActivityIndicator color={colors.primary} />
    </View>
  ) : q.hasNextPage ? null : (q.data?.length ?? 0) > 0 ? (
    <Text style={styles.akhir}>
      <Ionicons name="checkmark-circle-outline" size={14} color={colors.textMuted} /> Semua dokumen
      sudah tampil
    </Text>
  ) : null;

  return (
    <FlatList
      data={q.isPending ? [] : (q.data ?? [])}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <KartuDokumen dokumen={item} onPress={() => bukaDokumen(item.id)} />
      )}
      ListHeaderComponent={kepala}
      ListEmptyComponent={kosong}
      ListFooterComponent={kaki}
      contentContainerStyle={styles.isi}
      ItemSeparatorComponent={Pemisah}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      onEndReachedThreshold={0.5}
      onEndReached={() => {
        if (q.hasNextPage && !q.isFetchingNextPage && !q.isFetchNextPageError) {
          void q.fetchNextPage();
        }
      }}
      refreshControl={
        <RefreshControl
          refreshing={menyegarkan}
          onRefresh={() => void tarikSegar()}
          colors={[colors.primary]}
          tintColor={colors.primary}
        />
      }
      style={q.isPlaceholderData ? styles.menunggu : undefined}
    />
  );
}

function Pemisah() {
  return <View style={styles.pemisah} />;
}

const styles = StyleSheet.create({
  isi: { padding: spacing.lg, flexGrow: 1 },
  kepala: { gap: spacing.lg, marginBottom: spacing.lg },
  chip: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  gap: { gap: spacing.md },
  pemisah: { height: spacing.md },
  kaki: { paddingVertical: spacing.lg },
  akhir: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
  menunggu: { opacity: 0.6 },
});
```

Penjelasan, bagian yang penting:

- **Header ikut di dalam `FlatList`** (`ListHeaderComponent` berupa elemen, bukan fungsi komponen). Dengan begitu kolom cari tidak dibuat ulang tiap daftar berubah, jadi keyboard tidak menutup dan fokus tidak hilang saat hasil berganti (diuji).
- `useDebouncedValue(input, 400)`: kueri baru hanya dikirim 400 ms setelah berhenti mengetik. Mengetik "kontrak" cepat menghasilkan **satu** permintaan, bukan tujuh.
- `useFocusEffect` + `pertama`: tiap Dashboard kembali terlihat (setelah menyimpan efek, menghapus, atau memindai dokumen baru), cache pengguna disegarkan. Fokus pertama dilewati karena kueri sudah berjalan saat layar dibuka.
- Tiga keadaan kosong: skeleton (memuat), banner galat + **Coba lagi**, dan dua empty state (tidak ada hasil pencarian, belum ada dokumen).
- `onEndReached` memuat 20 dokumen berikutnya hanya bila masih ada (`hasNextPage`) dan tidak sedang memuat; kegagalan memuat halaman berikutnya menampilkan **Muat lagi** tanpa membuang daftar yang sudah ada.

### 7.4 `src/features/dokumen/DetailDokumen.tsx`

**Berkas:** `src/features/dokumen/DetailDokumen.tsx` (berkas baru: buat)

```tsx
import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef, useState } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

import {
  Banner,
  Button,
  Dialog,
  EmptyState,
  IconButton,
  Screen,
  Skeleton,
  TextField,
} from '@/components';
import { colors, radius, spacing, typography } from '@/theme';

import { formatTanggal, labelHalaman } from './daftar';
import { pesanGalat } from './galat';
import { urlTampil } from './gambar';
import { kunciDokumen, useDetailDokumen, useHapusDokumen, useUbahJudul } from './hooks';
import { LabelStatus } from './KartuDokumen';
import { judulSchema } from './judul';
import type { HalamanDetail } from './skema';

const RASIO_HALAMAN = 4 / 3;

// Detail dokumen (tugas 7.3-7.5): halaman digeser mendatar (atau lewat tombol panah), judul bisa
// diganti, dan dokumen bisa dihapus setelah konfirmasi.
export function DetailDokumen({ userId, dokumenId }: { userId: string; dokumenId: string }) {
  const router = useRouter();
  const klien = useQueryClient();
  const q = useDetailDokumen(userId, dokumenId);
  const ubah = useUbahJudul(userId);
  const hapus = useHapusDokumen(userId);

  const [dialog, setDialog] = useState<'nama' | 'hapus' | null>(null);
  const [judulBaru, setJudulBaru] = useState('');
  const [galatJudul, setGalatJudul] = useState<string | null>(null);
  const [lebar, setLebar] = useState(0);
  const [indeks, setIndeks] = useState(0);
  const daftar = useRef<FlatList<HalamanDetail>>(null);
  const tujuan = useRef<number | null>(null);

  // Segarkan tiap layar ini kembali terlihat (mis. setelah menyimpan efek di editor).
  const pertama = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (pertama.current) {
        pertama.current = false;
        return;
      }
      void klien.invalidateQueries({ queryKey: kunciDokumen.detail(userId, dokumenId) });
    }, [klien, userId, dokumenId]),
  );

  if (q.isPending) {
    return (
      <Screen edges={['bottom']}>
        <View
          accessibilityLabel="Memuat dokumen"
          accessibilityLiveRegion="polite"
          style={styles.gap}
        >
          <Skeleton style={styles.kerangkaJudul} />
          <Skeleton style={styles.kerangkaInfo} />
          <Skeleton style={styles.kerangkaHalaman} />
        </View>
      </Screen>
    );
  }
  if (q.isError) {
    const hilang = (q.error as { kind?: string }).kind === 'tidakada';
    return (
      <Screen edges={['bottom']}>
        {hilang ? (
          <EmptyState
            icon="document-outline"
            title="Dokumen tidak ditemukan"
            description="Dokumen ini mungkin sudah dihapus."
            actionLabel="Kembali"
            onAction={keluar}
          />
        ) : (
          <View style={styles.gap}>
            <Banner message={pesanGalat(q.error, 'Dokumen belum bisa dimuat.')} />
            <Button title="Coba lagi" variant="secondary" onPress={() => void q.refetch()} />
          </View>
        )}
      </Screen>
    );
  }

  const dokumen = q.data;
  const halaman = dokumen.halaman;
  const jumlah = halaman.length;
  const tinggi = lebar > 0 ? Math.round(lebar * RASIO_HALAMAN) : 0;

  function keluar() {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }

  const geser = (ke: number) => {
    const sasaran = Math.max(0, Math.min(jumlah - 1, ke));
    if (sasaran === indeks) return;
    setIndeks(sasaran);
    // Selama animasi menuju `sasaran`, peristiwa gulir di tengah jalan diabaikan supaya penanda
    // "Halaman n dari m" tidak berkedip mundur lalu maju.
    tujuan.current = sasaran;
    daftar.current?.scrollToOffset({ offset: sasaran * lebar, animated: true });
  };

  const saatGulir = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (lebar <= 0) return;
    const ke = Math.round(e.nativeEvent.contentOffset.x / lebar);
    if (tujuan.current !== null) {
      if (ke !== tujuan.current) return;
      tujuan.current = null;
    }
    setIndeks(ke);
  };

  const bukaGantiNama = () => {
    ubah.reset();
    setGalatJudul(null);
    setJudulBaru(dokumen.judul);
    setDialog('nama');
  };

  const simpanNama = () => {
    const cek = judulSchema.safeParse(judulBaru);
    if (!cek.success) {
      setGalatJudul(cek.error.issues[0]?.message ?? 'Judul tidak valid');
      return;
    }
    if (cek.data === dokumen.judul) {
      setDialog(null);
      return;
    }
    ubah.mutate({ dokumenId, judul: cek.data }, { onSuccess: () => setDialog(null) });
  };

  const bukaHapus = () => {
    hapus.reset();
    setDialog('hapus');
  };

  const konfirmasiHapus = () => {
    hapus.mutate(dokumenId, {
      onSuccess: () => {
        setDialog(null);
        keluar();
      },
    });
  };

  const halamanAktif = halaman[Math.min(indeks, Math.max(0, jumlah - 1))];

  return (
    <Screen scroll edges={['bottom']}>
      <View style={styles.atas}>
        <Text accessibilityRole="header" style={styles.judul}>
          {dokumen.judul}
        </Text>
        <Text style={styles.info}>
          {labelHalaman(jumlah)} · {formatTanggal(dokumen.dibuatPada)}
        </Text>
        <LabelStatus status={dokumen.status} />
      </View>

      {jumlah === 0 ? (
        <EmptyState
          icon="images-outline"
          title="Belum ada halaman"
          description="Dokumen ini belum punya halaman tersimpan."
        />
      ) : (
        <View
          onLayout={(e: LayoutChangeEvent) => setLebar(Math.round(e.nativeEvent.layout.width))}
          style={styles.pager}
        >
          {lebar > 0 ? (
            <FlatList
              ref={daftar}
              data={halaman}
              keyExtractor={(h) => h.id}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={saatGulir}
              onScrollBeginDrag={() => {
                tujuan.current = null;
              }}
              scrollEventThrottle={16}
              getItemLayout={(_, i) => ({ length: lebar, offset: lebar * i, index: i })}
              initialNumToRender={2}
              windowSize={3}
              renderItem={({ item }) => (
                <View style={{ width: lebar, height: tinggi }}>
                  <Image
                    source={{ uri: urlTampil(item.urlHasil) ?? item.urlHasil }}
                    contentFit="contain"
                    transition={150}
                    accessibilityLabel={`Halaman ${item.urutan} dari ${dokumen.judul}`}
                    style={styles.halaman}
                  />
                </View>
              )}
            />
          ) : null}
        </View>
      )}

      {jumlah > 0 ? (
        <View style={styles.navigasi}>
          <IconButton
            icon="chevron-back"
            label="Halaman sebelumnya"
            onPress={() => geser(indeks - 1)}
            disabled={indeks <= 0}
          />
          <Text accessibilityLiveRegion="polite" style={styles.penanda}>
            Halaman {Math.min(indeks, jumlah - 1) + 1} dari {jumlah}
          </Text>
          <IconButton
            icon="chevron-forward"
            label="Halaman berikutnya"
            onPress={() => geser(indeks + 1)}
            disabled={indeks >= jumlah - 1}
          />
        </View>
      ) : null}

      {halamanAktif ? (
        <Button
          title="Percantik halaman ini"
          variant="secondary"
          fullWidth
          onPress={() =>
            router.push({ pathname: '/editor/[halamanId]', params: { halamanId: halamanAktif.id } })
          }
        />
      ) : null}

      <View style={styles.aksi}>
        <Button title="Ganti nama" variant="secondary" onPress={bukaGantiNama} />
        <Button title="Hapus dokumen" variant="danger" onPress={bukaHapus} />
      </View>

      <Dialog
        visible={dialog === 'nama'}
        title="Ganti nama dokumen"
        confirmLabel="Simpan"
        onConfirm={simpanNama}
        onCancel={() => setDialog(null)}
        busy={ubah.isPending}
        error={ubah.isError ? pesanGalat(ubah.error) : null}
      >
        <TextField
          label="Judul dokumen"
          value={judulBaru}
          onChangeText={(t) => {
            setJudulBaru(t);
            setGalatJudul(null);
          }}
          error={galatJudul ?? undefined}
          maxLength={120}
          autoFocus
          returnKeyType="done"
          onSubmitEditing={simpanNama}
        />
      </Dialog>

      <Dialog
        visible={dialog === 'hapus'}
        title="Hapus dokumen ini?"
        message={`"${dokumen.judul}" beserta ${labelHalaman(jumlah)}-nya akan dihapus permanen, termasuk file di penyimpanan. Tindakan ini tidak bisa dibatalkan.`}
        confirmLabel="Hapus"
        destructive
        onConfirm={konfirmasiHapus}
        onCancel={() => setDialog(null)}
        busy={hapus.isPending}
        error={hapus.isError ? pesanGalat(hapus.error) : null}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  gap: { gap: spacing.md },
  atas: { gap: spacing.xs, alignItems: 'flex-start' },
  judul: { ...typography.heading, color: colors.text },
  info: { ...typography.caption, color: colors.textMuted },
  pager: {
    width: '100%',
    overflow: 'hidden',
    borderRadius: radius.lg,
    backgroundColor: colors.border,
  },
  halaman: { width: '100%', height: '100%' },
  navigasi: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  penanda: { ...typography.bodyStrong, color: colors.text },
  aksi: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'center' },
  kerangkaJudul: { height: 24, width: '60%' },
  kerangkaInfo: { height: 16, width: '40%' },
  kerangkaHalaman: { height: 360, borderRadius: radius.lg },
});
```

Penjelasan, bagian yang penting:

- Pager adalah `FlatList` mendatar dengan `pagingEnabled`; lebar halaman diukur dari `onLayout`. Gambar memakai `urlTampil` (`c_limit,h_1200`).
- `tujuan` (ref) mencegah penanda "Halaman n dari m" berkedip: saat tombol panah ditekan, peristiwa gulir di tengah animasi diabaikan sampai posisi tujuan tercapai; menyentuh pager (`onScrollBeginDrag`) membatalkannya.
- **Ganti nama**: dialog berisi `TextField`; judul divalidasi `judulSchema` (1 sampai 120 karakter, spasi tepi dibuang) **sebelum** ada permintaan; galat server tampil di dalam dialog dan dialog tetap terbuka.
- **Hapus**: dialog menyebut judul dan jumlah halaman; selama proses tombol terkunci; galat per kasus (jaringan, 502, 404, 403) tampil di dalam dialog sehingga kamu bisa mengulang; sukses menutup dialog dan kembali ke daftar.

### 7.5 `src/features/dokumen/index.ts`

Berkas lama; **ganti seluruh isinya**.

**Berkas:** `src/features/dokumen/index.ts` (berkas lama: ganti seluruh isinya)

```ts
export { DbError, buatDokumen, simpanHalaman } from './api';
export { DaftarDokumen } from './DaftarDokumen';
export { DetailDokumen } from './DetailDokumen';
export { judulBawaan, judulSchema } from './judul';
export { QueryProvider } from './QueryProvider';
```

### 7.6 Pasang `QueryProvider` di `app/_layout.tsx`

Berkas lama; **ganti seluruh isinya**. Perubahannya hanya impor `QueryProvider` dan pembungkus di antara `AuthProvider` dan `ScanSessionProvider`.

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
import { QueryProvider } from '@/features/dokumen';
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
      <QueryProvider>
        <ScanSessionProvider>
          <RootNavigator />
        </ScanSessionProvider>
      </QueryProvider>
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

### 7.7 `app/(tabs)/index.tsx` dan `app/dokumen/[id].tsx`

Kedua berkas lama; **ganti seluruh isinya**. Nama berkas memakai tanda kurung dan kurung siku, jadi di Command Prompt beri tanda kutip bila membukanya dari terminal.

**Berkas:** `app/(tabs)/index.tsx` (berkas lama: ganti seluruh isinya)

```tsx
import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Button, Card, LoadingScreen, Screen, ScreenHeader } from '@/components';
import { AccountCard, useAuth } from '@/features/auth';
import { DaftarDokumen } from '@/features/dokumen';
import { useScanSession } from '@/features/scan';
import { colors, spacing, typography } from '@/theme';

export default function DashboardScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const { pages } = useScanSession();
  const belum = pages.filter((p) => p.status !== 'tersimpan').length;
  const userId = session?.user.id;

  if (!userId) return <LoadingScreen />;

  const atas = (
    <View style={styles.atas}>
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
    </View>
  );

  return (
    <Screen padded={false}>
      <DaftarDokumen userId={userId} atas={atas} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  atas: { gap: spacing.lg },
  judul: { ...typography.bodyStrong, color: colors.text },
  isi: { ...typography.body, color: colors.textMuted },
});
```

**Berkas:** `app/dokumen/[id].tsx` (berkas lama: ganti seluruh isinya)

```tsx
import { useLocalSearchParams } from 'expo-router';

import { LoadingScreen } from '@/components';
import { useAuth } from '@/features/auth';
import { DetailDokumen } from '@/features/dokumen';

export default function DokumenDetailScreen() {
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const { session } = useAuth();
  const userId = session?.user.id;

  if (!userId || !id) return <LoadingScreen />;
  // key: berpindah ke dokumen lain mengosongkan keadaan lokal (indeks halaman, dialog).
  return <DetailDokumen key={id} userId={userId} dokumenId={id} />;
}
```

Penjelasan: Dashboard kini hanya merakit: judul, kartu akun, kartu "Sesi scan berjalan" (dari Fase 5), lalu `DaftarDokumen` yang memegang daftar. Layar detail membaca `id` dari rute, memastikan sesi ada, dan memakai `key={id}` agar berpindah dokumen mengosongkan keadaan lokal (indeks halaman, dialog).

---

## 8. Cek akhir kode

```bash
npm run typecheck
npm run lint
npm run format:check
npm run cek:kontras
npm test
```

Semuanya harus bersih (`npm test`: **81 lulus**). Bila `format:check` mengeluh, jalankan `npm run format` lalu ulangi.

Dua hal yang sering terlewat:

1. `tsconfig.json` dan `eslint.config.js` sudah diubah di 4.3 (tanpa itu `typecheck` dan `lint` mengeluh tentang `Deno` dan `npm:`).
2. `@tanstack/react-query` ada di `package.json` (2.4).

---

## 9. Tugas 7.8: uji di HP, 55 dokumen uji, commit, pull request

### 9.1 Siapkan 55 dokumen uji

Salah satu syarat selesai Fase 7 adalah "daftar tetap lancar dengan 50+ dokumen". Memindai 50 dokumen satu per satu tidak masuk akal, jadi kita menyisipkannya lewat SQL. Syaratnya: akunmu sudah punya **minimal satu dokumen sungguhan** (dari Fase 5), karena skrip meminjam satu foto aslinya sebagai gambar semua dokumen uji. Dokumen uji punya `public_id` **palsu**, jadi menghapusnya akan membuat Cloudinary menjawab `not found` (dan itu justru menguji jalur "tidak ada = beres").

Buka Dashboard Supabase > **SQL Editor** > **New query**. **Ganti `EMAILMU@contoh.com` dengan emailmu** (kutipan tunggal tetap), lalu jalankan **satu kali** (menjalankannya dua kali menggandakan dokumen uji):

```sql
do $$
declare
  pemilik uuid;
  contoh  text;
  d       uuid;
  i       int;
  n       int;
begin
  select id into pemilik from auth.users where email = 'EMAILMU@contoh.com';
  if pemilik is null then
    raise exception 'Email tidak ditemukan di auth.users. Ganti EMAILMU@contoh.com dengan emailmu.';
  end if;

  -- Pinjam satu foto asli yang sudah kamu unggah sebelumnya sebagai gambar semua dokumen uji.
  select h.url_asli into contoh
  from public.halaman_dokumen h
  join public.dokumen k on k.id = h.dokumen_id
  where k.user_id = pemilik and k.judul not like 'Uji Fase 7%'
  limit 1;
  if contoh is null then
    raise exception 'Belum ada halaman dokumen milikmu. Simpan satu dokumen lewat aplikasi dulu.';
  end if;

  for i in 1..55 loop
    insert into public.dokumen (user_id, judul, status, dibuat_pada)
    values (
      pemilik,
      case when i % 11 = 0 then 'Uji Fase 7 - Kontrak sewa ' else 'Uji Fase 7 - Dokumen ' end
        || lpad(i::text, 2, '0'),
      case when i % 2 = 0 then 'selesai'::public.dokumen_status else 'draft'::public.dokumen_status end,
      now() - make_interval(hours => i * 5)
    )
    returning id into d;

    for n in 1..(1 + i % 3) loop
      insert into public.halaman_dokumen (dokumen_id, urutan, url_asli, url_hasil, public_id, ukuran_byte)
      values (d, n, contoh, contoh, 'uji-fase-7-palsu/' || d || '-' || n, 1000);
    end loop;
  end loop;
end $$;

select count(*) as dokumen_uji, sum(jumlah_halaman) as total_halaman
from public.dokumen where judul like 'Uji Fase 7%';
```

Hasil akhirnya `dokumen_uji = 55` dan `total_halaman = 110`. Dokumen bernomor kelipatan 11 berjudul "Kontrak sewa" (untuk uji pencarian), yang genap berstatus Selesai, dan tiap dokumen punya 1 sampai 3 halaman.

Pembersihan, bila sudah selesai menguji (menghapus halaman dan efek lewat `cascade`; **ganti emailnya juga**):

```sql
delete from public.dokumen
where judul like 'Uji Fase 7%'
  and user_id = (select id from auth.users where email = 'EMAILMU@contoh.com');
```

### 9.2 Jalankan dan uji di HP

```bash
npx expo start
```

Buka di Expo Go (SDK 54). Kerjakan berurutan dan laporkan nomor yang gagal beserta pesan atau layarnya:

1. [ ] Dashboard terbuka: skeleton sesaat, lalu dokumenmu muncul dengan **gambar mini** (bagian atas halaman terlihat).
2. [ ] Setelah seed (9.1) tarik layar ke bawah (**pull-to-refresh**): daftar menjadi 20 dokumen. Gulir ke bawah: muncul 20 lagi, lalu sisanya; di akhir tertulis **"Semua dokumen sudah tampil"**. Tidak ada dokumen yang muncul dua kali. Catat bila ada gulir yang patah-patah.
3. [ ] Ketik **kontrak** di kolom cari: tersisa lima dokumen "Kontrak sewa"; keyboard **tidak menutup** sendiri saat hasil berganti.
4. [ ] Ketuk chip **Draft** lalu **Selesai**: daftar berubah sesuai; gabungkan dengan pencarian. Ketik kata ngawur (`zzzz`): muncul "Tidak ada dokumen yang cocok" dan tombol **Hapus pencarian dan filter** mengembalikan semuanya.
5. [ ] Ketuk satu dokumen: detail terbuka. **Geser jari** antar halaman; penanda "Halaman n dari m" ikut berubah dan tidak berkedip. Tombol panah juga bekerja; panah kiri mati di halaman pertama.
6. [ ] Dokumen yang pernah kamu percantik (Fase 6) menampilkan **hasil berefek** di detail dan gambar mini.
7. [ ] **Percantik halaman ini** membuka editor untuk halaman yang sedang tampil. **Simpan**, kembali ke detail: tampilan berubah; di Dashboard status berubah bila semua halaman sudah berefek.
8. [ ] **Ganti nama**: judul kosong ditolak dengan pesan; teks lebih dari 120 karakter tertahan di 120; judul baru tersimpan dan terlihat di detail serta di daftar saat kembali.
9. [ ] **Hapus dokumen uji** (yang berjudul "Uji Fase 7 ..."): dialog menyebut judulnya; **Batal** tidak menghapus apa pun; **Hapus** menutup dialog, kembali ke daftar, dan dokumen itu hilang. (Bukti jalur `not found` dari Cloudinary: function tetap menjawab sukses.)
10. [ ] **Hapus dokumen nyata**: scan satu dokumen baru berisi 2 halaman (Kamera), simpan, lalu hapus dari Dashboard. Cek **Media Library** Cloudinary, folder `scannest`: kedua file **hilang**. Salin URL salah satu halaman dari data sebelum dihapus dan buka di browser setelahnya: harus **404** (cache CDN bisa bertahan beberapa menit; catat hasilnya, termasuk gambar turunan hasil efek bila ada).
11. [ ] Aktifkan **mode pesawat**, coba hapus dokumen uji lain: dialog menampilkan "Tidak bisa terhubung ke server", dokumen tetap ada. Matikan mode pesawat, ketuk **Hapus** lagi: berhasil.
12. [ ] Pindai dokumen baru, kembali ke tab **Dashboard**: dokumen baru muncul **tanpa** perlu tarik-untuk-segarkan.
13. [ ] Bila punya akun admin: Dashboard-nya hanya menampilkan dokumen **miliknya**, bukan semua dokumen.
14. [ ] **Keluar**, masuk dengan akun lain: dokumen akun sebelumnya tidak terlihat sekilas pun.
15. [ ] Tab **Percantik** (Fase 6) masih berfungsi dan tidak menampilkan dokumen yang sudah dihapus.
16. [ ] Cek SQL Editor setelah nomor 10: `select count(*) from public.halaman_dokumen where dokumen_id = 'ID-DOKUMEN-YANG-DIHAPUS';` hasilnya **0** (ganti id; id bisa dilihat di URL rute detail sebelum dihapus, atau lewat `select id, judul from public.dokumen order by dibuat_pada desc;` sebelum menghapus).
17. [ ] Lihat log function: Dashboard Supabase > **Edge Functions** > `delete-document` > **Logs**. Tidak ada galat tak terduga; bila ada baris "Gagal menghapus aset", salin pesannya kepadaku.
18. [ ] **Pantau Cloudinary (kuota):** buka Dashboard Cloudinary, lihat pemakaian transformasi dan penyimpanan; seharusnya turun setelah penghapusan. Laporkan angkanya.
19. [ ] Tidak ada layar merah atau peringatan kuning baru selama pengujian.

Setelah selesai, bersihkan dokumen uji dengan SQL pembersih di 9.1.

### 9.3 Commit dan pull request

```bash
git status
git add .
git status
```

Baca daftar berkas: yang berubah harus berada di `src/`, `app/`, `supabase/functions/`, `tests/`, `package.json`, `package-lock.json`, `tsconfig.json`, `eslint.config.js`, `ROADMAP.md`, dan `docs/`; **tidak ada** `.env`, **tidak ada** `C:\scannest-rahasia` (di luar repo), dan tidak ada berkas bernama aneh. Lalu:

```bash
git commit -m "feat(dokumen): daftar, detail, ganti nama, cari, filter, dan hapus lewat Edge Function"
git push -u origin fase-7-dashboard
```

Buka pull request, tunggu **CI hijau**, **Merge**, lalu `git switch main` dan `git pull`. Centang tugas 7.0 sampai 7.8 di `ROADMAP.md` pada commit berikutnya.

---

## 10. Yang perlu diingat saat coding nanti

1. **Fase 8 meniru pola ini.** `admin-delete-document` memakai ulang `tandatangani`, `hapusAsetCloudinary`, dan bentuk `prosesHapus`, tetapi dengan service role, pemeriksaan `role = admin`, dan penulisan `log_aktivitas`. Supabase mendukung folder `supabase/functions/_shared` untuk kode bersama; pindahkan `logic.ts` ke sana saat membuat fungsi kedua.
2. **Hapus dokumen hanya lewat function.** Jangan memanggil `supabase.from('dokumen').delete()` dari aplikasi: itu meninggalkan file yatim di Cloudinary. Pencabutan hak `delete` langsung dicatat di B21.
3. **API secret Cloudinary hanya di secret function.** Jangan masuk `.env` aplikasi dan jangan di-commit. Semua `EXPO_PUBLIC_*` terbaca dari APK.
4. **Semua data dokumen berada di bawah kunci `['dokumen', userId, ...]`.** Fitur baru yang mengubah dokumen cukup memanggil `invalidateQueries({ queryKey: kunciDokumen.semua(userId) })`; daftar dan detail ikut segar. Layar yang kembali terlihat juga menyegarkan sendiri.
5. **Bangun URL gambar dengan `tambahkanKomponen`** (`gambar.ts`), bukan menyambung string. Ekspor PDF (B2, Fase 9) memakai `url_hasil` dengan `c_limit` bila gambarnya besar.
6. **`supabase/functions/*/index.ts` dikecualikan dari `tsc` dan ESLint** (4.3). Bila mengubahnya, uji lewat `curl` (4.6) atau jalankan `deno check` bila Deno terpasang; `logic.ts` tetap lewat `npm test`.
7. **Pembacaan di Fase 6 (editor, tab Percantik) masih memakai ulang bawaan `postgrest-js`** (galat jaringan tampil lebih lambat, sekitar 7 detik). Menyamakannya dengan K44 dicatat di B23.
8. **Pencarian memakai `ilike '%kata%'`** tanpa indeks. Untuk ratusan dokumen cukup; bila ribuan, lihat B22.

---

## 11. Pemecahan masalah

| Gejala | Kemungkinan penyebab dan solusi |
|---|---|
| `npm install @tanstack/react-query` menolak karena `peer dependency` | Kirim keluarannya kepadaku sebelum memakai `--force`. |
| `typecheck`: `Cannot find name 'Deno'` atau `Cannot find module 'npm:@supabase/supabase-js@2'` | Pengecualian `supabase/functions/*/index.ts` di `tsconfig.json` belum ditambahkan (4.3). |
| `lint`: galat di `supabase/functions/delete-document/index.ts` | Baris `ignores` di `eslint.config.js` belum diubah (4.3). |
| `typecheck`: `Module '"@/components"' has no exported member 'Chip'` | `src/components/index.ts` belum diganti dengan versi 6.4. |
| `typecheck`: `has no exported member 'QueryProvider'` di `_layout.tsx` | `src/features/dokumen/index.ts` belum diganti (7.5); itu galat sementara yang wajar sebelum langkah 7.5 selesai. |
| `typecheck`: `has no exported member 'useDebouncedValue'` | `src/features/editor/index.ts` belum diganti (7.1). |
| `npm test`: `Cannot find module ... delete-document/logic.ts` | Berkas `logic.ts` belum dibuat atau salah folder (4.1). |
| Aplikasi galat "No QueryClient set" | `QueryProvider` belum dipasang di `app/_layout.tsx` (7.6). |
| Dashboard kosong padahal dokumenmu ada | Kamu masuk dengan akun lain, atau akunmu admin dan dokumennya milik orang lain (Dashboard hanya menampilkan milik sendiri, K47). Cek `select user_id, judul from public.dokumen;`. |
| Dashboard lama sebelum menampilkan galat saat internet putus | Pada Fase 7 seharusnya ±beberapa detik. Bila lebih dari 10 detik, `.retry(false)` di `kelola.ts` hilang (5.1). |
| Gambar mini kosong atau rusak | `url_hasil` bukan URL Cloudinary `/image/upload/` (kode memakai URL asli sebagai cadangan), atau gambar belum selesai dibuat Cloudinary; tarik layar untuk menyegarkan. |
| Gambar mini memotong bagian atas dokumen | `g_north` hilang di `gambar.ts` (3.1). |
| Hapus: "Failed to send a request to the Edge Function" atau pesan jaringan padahal internet ada | Function belum di-deploy atau nama salah (`delete-document`). Ulangi 4.5 dan cek Dashboard > Edge Functions. |
| Hapus: pesan "Terjadi masalah saat memproses data" | Function menjawab 500. Buka log function (9.2 nomor 17). Penyebab umum: secret Cloudinary belum atau salah diatur ("Server belum dikonfigurasi"). |
| Hapus: "Sebagian file belum bisa dihapus" berulang | Cloudinary menolak. Di log function lihat pesan "Gagal menghapus aset ..."; kemungkinan API key atau secret salah (pesan "Invalid Signature") atau `cloud name` salah. Ulangi 4.5 dengan nilai yang benar, lalu coba lagi. Dokumenmu aman selama pesan ini muncul. |
| Hapus: "File sudah dihapus, tetapi catatan dokumen belum" | Baris database gagal dihapus setelah file hilang (jarang). Ketuk **Hapus** lagi; file yang sudah hilang dianggap beres. |
| Hapus: "Akunmu tidak diizinkan melakukan ini." | Dokumen bukan milikmu (403), atau sesi kedaluwarsa. Keluar lalu masuk lagi. |
| `curl` uji 1 mengembalikan 200, bukan 401 | `verify_jwt` mati untuk function ini (mungkin deploy dengan `--no-verify-jwt`). Deploy ulang tanpa flag itu. |
| `curl` di CMD: `curl: (3) URL rejected` atau JSON error | Tanda kutip dan garis miring terbalik di `-d` salah. Salin persis dari 4.6; jangan menambah spasi di dalam JSON. |
| Daftar menampilkan dokumen ganda | Versi `daftar.ts` atau `hooks.ts` lama; pastikan `gabungTanpaGanda` dipakai di `select` (5.2). |
| Kolom cari menutup keyboard tiap hasil berganti | Header daftar dibuat sebagai fungsi komponen, bukan elemen; pakai `DaftarDokumen.tsx` di 7.3. |
| Penanda halaman di detail berkedip | `tujuan` dan `onScrollBeginDrag` hilang di `DetailDokumen.tsx` (7.4). |
| Nama berkas aneh muncul di `git status` | Kode tertempel ke terminal, bukan ke berkas. Hapus dengan `git rm` atau `del`; lihat `panduan-fase-1.md` bagian 3.0. |

---

## 12. Checklist akhir Fase 7

Sama dengan "Selesai bila" Fase 7 di `ROADMAP.md`.

- [ ] Fase 6 ditutup, cabang `fase-7-dashboard` dan `@tanstack/react-query` siap (7.0)
- [ ] Daftar dokumen, gambar mini, pull-to-refresh, dan paginasi bekerja dengan 55 dokumen uji tanpa gulir patah (7.1, 7.2)
- [ ] Detail: geser antar halaman, tombol panah, Percantik halaman ini (7.3)
- [ ] Ganti nama bekerja dengan validasi dan galat di dalam dialog (7.4)
- [ ] Function `delete-document` terpasang (secret dan `verify_jwt` benar); uji `curl` lulus; hapus nyata menghilangkan file di Cloudinary dan baris di database (7.5)
- [ ] Pencarian dan filter bekerja, bisa digabung (7.6)
- [ ] Empty state dan skeleton tampil di tempatnya (7.7)
- [ ] Dashboard hanya menampilkan dokumen milik sendiri; tidak ada rahasia di aplikasi atau repo
- [ ] `typecheck`, `lint`, `format:check`, `cek:kontras`, `test` bersih; PR digabung dan CI hijau (7.8)

---

## 13. Daftar berkas Fase 7

| Berkas | Tugas | Status |
|---|---|---|
| `ROADMAP.md`, `docs/*.md` | 7.0 | diubah |
| `package.json`, `package-lock.json` | 7.0 | diubah (`@tanstack/react-query`) |
| `tsconfig.json`, `eslint.config.js` | 7.5 | diubah (kecualikan `index.ts` Deno) |
| `src/features/dokumen/gambar.ts` | 7.2 | baru |
| `src/features/dokumen/daftar.ts` | 7.1, 7.6 | baru |
| `src/features/dokumen/skema.ts` | 7.1, 7.3 | baru |
| `src/features/dokumen/galat.ts` | 7.1, 7.5 | baru |
| `tests/gambar.test.mjs`, `tests/daftar.test.mjs`, `tests/skemaDokumen.test.mjs` | 7.1, 7.2, 7.6 | baru |
| `supabase/functions/delete-document/logic.ts` | 7.5 | baru |
| `supabase/functions/delete-document/index.ts` | 7.5 | baru |
| `tests/hapus.test.mjs` | 7.5 | baru |
| `src/features/dokumen/kelola.ts` | 7.1, 7.3, 7.4, 7.5 | baru |
| `src/features/dokumen/hooks.ts` | 7.1, 7.4, 7.5 | baru |
| `src/features/dokumen/QueryProvider.tsx` | 7.1 | baru |
| `src/components/Chip.tsx`, `Skeleton.tsx`, `Dialog.tsx` | 7.4, 7.6, 7.7 | baru |
| `src/components/index.ts` | 7.4, 7.6, 7.7 | diubah (tiga ekspor) |
| `src/features/editor/index.ts` | 7.6 | diubah (satu ekspor) |
| `src/features/dokumen/KartuDokumen.tsx` | 7.1, 7.2, 7.7 | baru |
| `src/features/dokumen/DaftarDokumen.tsx` | 7.1, 7.6, 7.7 | baru |
| `src/features/dokumen/DetailDokumen.tsx` | 7.3, 7.4, 7.5, 7.7 | baru |
| `src/features/dokumen/index.ts` | 7.1 | diubah |
| `app/_layout.tsx` | 7.1 | diubah (`QueryProvider`) |
| `app/(tabs)/index.tsx` | 7.1 | diubah (Dashboard) |
| `app/dokumen/[id].tsx` | 7.3 | diubah (dari placeholder) |

---

## 14. Sumber (diakses 21 Oktober 2026)

- Supabase, secret Edge Functions (`supabase secrets set`, `--env-file`, `supabase secrets list`; awalan `SUPABASE_` dicadangkan; variabel bawaan `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEYS`, `SUPABASE_SECRET_KEYS`): https://supabase.com/docs/guides/functions/secrets
- Supabase CLI, `functions deploy` (flag `--use-api`: membundel di server tanpa Docker; `--no-verify-jwt`): https://supabase.com/docs/reference/cli/supabase-functions-deploy
- Supabase, deploy Edge Functions: https://supabase.com/docs/guides/functions/deploy
- Cloudinary, menghapus aset (`destroy`, `invalidate`; tanda tangan dibuat di sisi server): https://cloudinary.com/documentation/delete_assets
- Cloudinary, tanda tangan otentikasi (contoh resmi dipakai sebagai vektor uji): https://cloudinary.com/documentation/authentication_signatures
- Cloudinary Support, `destroy` mengembalikan `{ result: 'not found' }` bila aset tidak ditemukan atau `resource_type` salah: https://support.cloudinary.com/hc/en-us/community/posts/6263540034450-Destroy-returning-not-found-
- TanStack Query v5, infinite queries: https://tanstack.com/query/v5/docs/framework/react/guides/infinite-queries
- `postgrest-js` 2.117.3, ulang otomatis GET (3 kali, jeda 1, 2, 4 detik; `.retry(false)`): dibaca dari kode paket di `node_modules/@supabase/postgrest-js/src/PostgrestBuilder.ts`
- Supabase, `supabase-js` `functions.invoke` dan kelas galat `FunctionsHttpError`, `FunctionsFetchError`, `FunctionsRelayError`: https://supabase.com/docs/reference/javascript/functions-invoke
- Expo, `expo-image` (SDK 54): https://docs.expo.dev/versions/v54.0.0/sdk/image/
- React Native, `FlatList`, `Modal`: https://reactnative.dev/docs/flatlist dan https://reactnative.dev/docs/modal
- Skema database Fase 2 (`supabase/migrations/20261010120000_init_schema.sql`): tabel `dokumen`, `halaman_dokumen`, `efek_foto`, kebijakan RLS, `grant` kolom, trigger `jumlah_halaman`
