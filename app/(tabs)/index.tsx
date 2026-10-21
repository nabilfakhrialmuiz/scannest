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