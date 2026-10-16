import { Button, EmptyState, Screen } from '@/components';

import { useAuth } from './AuthProvider';

// Tampil bila sesi ada tetapi profil gagal dimuat (biasanya karena internet putus).
export function ProfileErrorScreen() {
  const { retryProfile, signOut } = useAuth();

  return (
    <Screen scroll edges={['top', 'bottom']}>
      <EmptyState
        icon="cloud-offline-outline"
        title="Akunmu belum bisa dimuat"
        description="Periksa koneksi internetmu, lalu coba lagi. Kamu juga bisa keluar dan masuk kembali."
        actionLabel="Coba lagi"
        onAction={retryProfile}
      />
      <Button title="Keluar" variant="ghost" onPress={signOut} />
    </Screen>
  );
}