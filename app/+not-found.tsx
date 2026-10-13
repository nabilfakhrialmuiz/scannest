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

