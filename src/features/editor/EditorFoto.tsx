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
