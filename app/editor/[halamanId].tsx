import { useLocalSearchParams } from 'expo-router';

import { PlaceholderScreen } from '@/components';

export default function EditorScreen() {
  const { halamanId } = useLocalSearchParams<{ halamanId: string }>();

  return (
    <PlaceholderScreen
      icon="color-wand-outline"
      title="Editor"
      fase="Fase 6"
      description={`Editor untuk halaman "${halamanId}" akan tampil di sini.`}
      edges={['bottom']}
    />
  );
}

