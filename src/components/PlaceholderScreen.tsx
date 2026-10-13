import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import type { Edge } from 'react-native-safe-area-context';

import { EmptyState } from './EmptyState';
import { Screen } from './Screen';
import { ScreenHeader } from './ScreenHeader';

type PlaceholderScreenProps = {
  icon: ComponentProps<typeof Ionicons>['name'];
  title: string;
  description: string;
  /** Fase roadmap yang akan mengisi layar ini, misalnya "Fase 4". */
  fase: string;
  /** true: tampilkan ScreenHeader (untuk layar tab). Layar Stack sudah punya header bawaan. */
  withHeader?: boolean;
  edges?: Edge[];
};

// Layar sementara. Setiap pemakainya diganti saat fase yang disebut `fase` dikerjakan.
export function PlaceholderScreen({
  icon,
  title,
  description,
  fase,
  withHeader = false,
  edges,
}: PlaceholderScreenProps) {
  return (
    <Screen scroll edges={edges}>
      {withHeader ? <ScreenHeader title={title} /> : null}
      <EmptyState icon={icon} title={`Segera hadir di ${fase}`} description={description} />
    </Screen>
  );
}

