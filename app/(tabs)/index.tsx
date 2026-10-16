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

