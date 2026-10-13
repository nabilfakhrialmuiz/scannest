import { colors } from './colors';
import { fonts } from './typography';

// Opsi header yang dipakai semua Stack agar tampilannya seragam.
export const stackScreenOptions = {
  headerStyle: { backgroundColor: colors.background },
  headerTintColor: colors.text,
  headerTitleStyle: { fontFamily: fonts.bold, fontSize: 18 },
  headerShadowVisible: false,
  contentStyle: { backgroundColor: colors.background },
};

