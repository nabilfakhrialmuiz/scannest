import { useLocalSearchParams } from 'expo-router';

import { PlaceholderScreen } from '@/components';

export default function DokumenDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <PlaceholderScreen
      icon="documents-outline"
      title="Detail dokumen"
      fase="Fase 7"
      description={`Halaman-halaman dokumen "${id}" akan tampil di sini.`}
      edges={['bottom']}
    />
  );
}

