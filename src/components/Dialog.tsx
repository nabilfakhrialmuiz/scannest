import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/theme';

import { Banner } from './Banner';
import { Button } from './Button';

type DialogProps = {
  visible: boolean;
  title: string;
  message?: string;
  /** Isi tambahan di bawah pesan, misalnya kolom isian. */
  children?: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  /** true: tombol konfirmasi merah (aksi yang tidak bisa dibatalkan). */
  destructive?: boolean;
  /** true: sedang memproses; tombol terkunci dan dialog tidak bisa ditutup. */
  busy?: boolean;
  confirmDisabled?: boolean;
  /** Pesan galat dari percobaan sebelumnya. */
  error?: string | null;
};

// Dialog konfirmasi buatan sendiri (bukan Alert bawaan) agar tampilannya konsisten di semua
// platform dan bisa memuat kolom isian serta pesan galat.
export function Dialog({
  visible,
  title,
  message,
  children,
  confirmLabel,
  cancelLabel = 'Batal',
  onConfirm,
  onCancel,
  destructive = false,
  busy = false,
  confirmDisabled = false,
  error,
}: DialogProps) {
  const tutup = () => {
    if (!busy) onCancel();
  };
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={tutup}>
      <KeyboardAvoidingView behavior="padding" style={styles.latar}>
        <Pressable
          accessibilityLabel="Tutup dialog"
          accessibilityRole="button"
          style={StyleSheet.absoluteFill}
          onPress={tutup}
        />
        <View accessibilityViewIsModal role="alertdialog" aria-label={title} style={styles.kotak}>
          <Text accessibilityRole="header" style={styles.judul}>
            {title}
          </Text>
          {message ? <Text style={styles.pesan}>{message}</Text> : null}
          {children}
          {error ? <Banner message={error} /> : null}
          <View style={styles.tombol}>
            <Button title={cancelLabel} variant="ghost" onPress={tutup} disabled={busy} />
            <Button
              title={confirmLabel}
              variant={destructive ? 'danger' : 'primary'}
              onPress={onConfirm}
              loading={busy}
              disabled={confirmDisabled}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  latar: {
    flex: 1,
    backgroundColor: 'rgba(43,36,32,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  kotak: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    gap: spacing.md,
  },
  judul: { ...typography.heading, color: colors.text },
  pesan: { ...typography.body, color: colors.textMuted },
  tombol: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
});