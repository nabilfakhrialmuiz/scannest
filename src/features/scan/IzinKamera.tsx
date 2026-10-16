import { Linking } from 'react-native';
import type { PermissionResponse } from 'expo-camera';

import { EmptyState, Screen, ScreenHeader } from '@/components';

type IzinKameraProps = {
  permission: PermissionResponse;
  onRequest: () => void;
};

// Layar penjelasan izin kamera. Alasannya dijelaskan dulu, baru sistem menampilkan dialog izin.
// Bila izin ditolak permanen (canAskAgain = false), Android tidak lagi menampilkan dialog,
// jadi satu-satunya jalan adalah pengaturan aplikasi.
export function IzinKamera({ permission, onRequest }: IzinKameraProps) {
  const blokir = !permission.granted && !permission.canAskAgain;

  return (
    <Screen scroll>
      <ScreenHeader title="Kamera" subtitle="Memotret halaman dokumen" />
      {blokir ? (
        <EmptyState
          icon="lock-closed-outline"
          title="Izin kamera dimatikan"
          description="Aktifkan kamera untuk Scannest di pengaturan HP: Izin, lalu Kamera, lalu Izinkan. Setelah itu kembali ke sini."
          actionLabel="Buka pengaturan"
          onAction={() => void Linking.openSettings()}
        />
      ) : (
        <EmptyState
          icon="camera-outline"
          title="Scannest butuh akses kamera"
          description="Kamera hanya dipakai saat kamu memotret dokumen. Tidak ada rekaman di latar belakang."
          actionLabel="Izinkan kamera"
          onAction={onRequest}
        />
      )}
    </Screen>
  );
}
