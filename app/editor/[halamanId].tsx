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

