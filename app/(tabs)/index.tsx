import { useRouter } from 'expo-router';

import { EmptyState, Screen, ScreenHeader } from '@/components';
import { AccountCard } from '@/features/auth';

export default function DashboardScreen() {
  const router = useRouter();

  return (
    <Screen scroll>
      <ScreenHeader title="Dashboard" subtitle="Semua dokumenmu ada di sini" />
      <AccountCard />
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