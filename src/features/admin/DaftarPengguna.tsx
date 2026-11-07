import { StyleSheet, Text, View } from 'react-native';
import { useState } from 'react';

import { Banner, Button, Card, Chip, Dialog, EmptyState, TextField } from '@/components';
import { formatTanggal } from '@/features/dokumen/daftar';
import { useDebouncedValue } from '@/features/editor';
import { colors, minTouchSize, radius, spacing, typography } from '@/theme';

import {
  FILTER_AKTIF,
  LABEL_FILTER_AKTIF,
  cocokKonfirmasi,
  inisial,
  kataKonfirmasi,
  labelDokumen,
  namaTampil,
  type FilterAktif,
} from './daftar';
import { pesanGalat } from './galat';
import { kunciAdmin, useDaftarPengguna, useHapusPengguna, useUbahStatusPengguna } from './hooks';
import { ListaBerhalaman } from './ListaBerhalaman';
import type { PenggunaAdmin } from './skema';

const JEDA_CARI_MS = 400;

type Tindakan = { jenis: 'status' | 'hapus'; pengguna: PenggunaAdmin };

function Lencana({ teks, tone }: { teks: string; tone: 'netral' | 'bahaya' }) {
  return (
    <View style={[styles.lencana, tone === 'bahaya' ? styles.lencanaBahaya : styles.lencanaNetral]}>
      <Text
        style={[styles.lencanaTeks, { color: tone === 'bahaya' ? colors.danger : colors.primary }]}
      >
        {teks}
      </Text>
    </View>
  );
}

function KartuPengguna({
  pengguna,
  diriSendiri,
  onStatus,
  onHapus,
}: {
  pengguna: PenggunaAdmin;
  diriSendiri: boolean;
  onStatus: () => void;
  onHapus: () => void;
}) {
  const admin = pengguna.role === 'admin';
  return (
    <Card>
      <View role="group" aria-label={`Pengguna ${namaTampil(pengguna)}`} style={styles.kelompok}>
        <View style={styles.baris}>
          <View style={styles.avatar}>
            <Text style={styles.avatarTeks}>{inisial(pengguna)}</Text>
          </View>
          <View style={styles.identitas}>
            <Text numberOfLines={1} style={styles.nama}>
              {namaTampil(pengguna)}
            </Text>
            {pengguna.email ? (
              <Text numberOfLines={1} style={styles.info}>
                {pengguna.email}
              </Text>
            ) : null}
            <Text style={styles.info}>
              {labelDokumen(pengguna.jumlahDokumen)} · bergabung{' '}
              {formatTanggal(pengguna.dibuatPada)}
            </Text>
          </View>
        </View>
        <View style={styles.lencanaBaris}>
          {admin ? <Lencana teks="Admin" tone="netral" /> : null}
          {diriSendiri ? <Lencana teks="Akunmu" tone="netral" /> : null}
          {!pengguna.isAktif ? <Lencana teks="Nonaktif" tone="bahaya" /> : null}
        </View>
        {admin ? (
          <Text style={styles.info}>Akun admin tidak bisa diubah dari aplikasi.</Text>
        ) : (
          <View style={styles.aksi}>
            <Button
              title={pengguna.isAktif ? 'Nonaktifkan' : 'Aktifkan'}
              variant="secondary"
              onPress={onStatus}
            />
            <Button title="Hapus akun" variant="danger" onPress={onHapus} />
          </View>
        )}
      </View>
    </Card>
  );
}

// Kelola pengguna (tugas 8.4): daftar, pencarian nama/email, filter aktif/nonaktif, nonaktifkan
// atau aktifkan akun, dan hapus akun dengan konfirmasi mengetik email.
export function DaftarPengguna({ adminId }: { adminId: string }) {
  const [input, setInput] = useState('');
  const [filter, setFilter] = useState<FilterAktif>('semua');
  const kata = useDebouncedValue(input, JEDA_CARI_MS).trim();
  const q = useDaftarPengguna(adminId, filter, kata);
  const ubah = useUbahStatusPengguna(adminId);
  const hapus = useHapusPengguna(adminId);

  const [tindakan, setTindakan] = useState<Tindakan | null>(null);
  const [ketik, setKetik] = useState('');
  const [kabar, setKabar] = useState<string | null>(null);

  const adaPenyaring = filter !== 'semua' || kata !== '';

  const buka = (jenis: Tindakan['jenis'], pengguna: PenggunaAdmin) => {
    ubah.reset();
    hapus.reset();
    setKetik('');
    setTindakan({ jenis, pengguna });
  };
  const tutup = () => setTindakan(null);

  const konfirmasi = () => {
    if (!tindakan) return;
    const { jenis, pengguna } = tindakan;
    const nama = namaTampil(pengguna);
    if (jenis === 'status') {
      const aktif = !pengguna.isAktif;
      ubah.mutate(
        { userId: pengguna.id, aktif },
        {
          onSuccess: () => {
            setKabar(`Akun ${nama} ${aktif ? 'diaktifkan' : 'dinonaktifkan'}.`);
            tutup();
          },
        },
      );
    } else {
      hapus.mutate(pengguna.id, {
        onSuccess: (hasil) => {
          setKabar(`Akun ${nama} dihapus (${hasil.dokumen} dokumen, ${hasil.file} file).`);
          tutup();
        },
      });
    }
  };

  const kepala = (
    <View style={styles.kepala}>
      {kabar ? <Banner variant="info" message={kabar} /> : null}
      <TextField
        label="Cari pengguna"
        placeholder="Nama atau email"
        value={input}
        onChangeText={setInput}
        returnKeyType="search"
        autoCorrect={false}
        autoCapitalize="none"
        maxLength={100}
      />
      <View style={styles.chip}>
        {FILTER_AKTIF.map((nilai) => (
          <Chip
            key={nilai}
            label={LABEL_FILTER_AKTIF[nilai]}
            selected={filter === nilai}
            onPress={() => setFilter(nilai)}
          />
        ))}
      </View>
    </View>
  );

  const kosong = adaPenyaring ? (
    <EmptyState
      icon="search-outline"
      title="Tidak ada pengguna yang cocok"
      description="Coba kata kunci lain atau ubah filternya."
      actionLabel="Hapus pencarian dan filter"
      onAction={() => {
        setInput('');
        setFilter('semua');
      }}
    />
  ) : (
    <EmptyState
      icon="people-outline"
      title="Belum ada pengguna"
      description="Akun yang mendaftar akan muncul di sini."
    />
  );

  const sasaran = tindakan?.pengguna;
  const statusDialog = tindakan?.jenis === 'status' && sasaran;
  const hapusDialog = tindakan?.jenis === 'hapus' && sasaran;
  const nonaktifkan = statusDialog ? sasaran.isAktif : false;

  return (
    <>
      <ListaBerhalaman
        q={q}
        kepala={kepala}
        kosong={kosong}
        labelMemuat="Memuat pengguna"
        pesanGagalMuat="Daftar pengguna belum bisa dimuat."
        kunciSegar={kunciAdmin.semua(adminId)}
        renderItem={(p) => (
          <KartuPengguna
            pengguna={p}
            diriSendiri={p.id === adminId}
            onStatus={() => buka('status', p)}
            onHapus={() => buka('hapus', p)}
          />
        )}
      />

      <Dialog
        visible={Boolean(statusDialog)}
        title={nonaktifkan ? 'Nonaktifkan akun ini?' : 'Aktifkan akun ini?'}
        message={
          sasaran
            ? nonaktifkan
              ? `${namaTampil(sasaran)} tidak akan bisa membuka atau mengubah dokumennya sampai kamu mengaktifkannya lagi. Dokumennya tidak dihapus.`
              : `${namaTampil(sasaran)} akan bisa memakai aplikasinya lagi.`
            : undefined
        }
        confirmLabel={nonaktifkan ? 'Nonaktifkan' : 'Aktifkan'}
        destructive={nonaktifkan}
        onConfirm={konfirmasi}
        onCancel={tutup}
        busy={ubah.isPending}
        error={ubah.isError ? pesanGalat(ubah.error) : null}
      />

      <Dialog
        visible={Boolean(hapusDialog)}
        title="Hapus akun ini?"
        message={
          sasaran
            ? `Akun ${namaTampil(sasaran)} beserta ${labelDokumen(sasaran.jumlahDokumen)} dan semua filenya di penyimpanan akan dihapus permanen. Tindakan ini tidak bisa dibatalkan.`
            : undefined
        }
        confirmLabel="Hapus akun"
        destructive
        onConfirm={konfirmasi}
        onCancel={tutup}
        busy={hapus.isPending}
        confirmDisabled={!sasaran || !cocokKonfirmasi(ketik, sasaran)}
        error={hapus.isError ? pesanGalat(hapus.error) : null}
      >
        {sasaran ? (
          <TextField
            label={`Ketik ${kataKonfirmasi(sasaran)} untuk mengonfirmasi`}
            value={ketik}
            onChangeText={setKetik}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="done"
          />
        ) : null}
      </Dialog>
    </>
  );
}

const styles = StyleSheet.create({
  kepala: { gap: spacing.lg, marginBottom: spacing.lg },
  chip: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  kelompok: { gap: spacing.sm },
  baris: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: {
    width: minTouchSize,
    height: minTouchSize,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarTeks: { ...typography.heading, color: colors.primary },
  identitas: { flex: 1 },
  nama: { ...typography.bodyStrong, color: colors.text },
  info: { ...typography.caption, color: colors.textMuted },
  lencanaBaris: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  lencana: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.pill },
  lencanaNetral: { backgroundColor: colors.primarySoft },
  lencanaBahaya: { backgroundColor: colors.dangerSoft },
  lencanaTeks: { ...typography.caption },
  aksi: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
