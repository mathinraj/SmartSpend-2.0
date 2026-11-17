import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { pressDialogButton, useDialog, type DialogButton } from '@/lib/dialog';

function variantOf(button: DialogButton) {
  if (button.style === 'destructive') return 'danger' as const;
  if (button.style === 'cancel') return 'secondary' as const;
  return 'primary' as const;
}

/** Renders the dialog requested through `showDialog`. Mount once at the app root. */
export function DialogHost() {
  const colors = useTheme();
  const dialog = useDialog();
  if (!dialog) return null;

  const cancel = dialog.buttons.find((b) => b.style === 'cancel');
  const destructive = dialog.buttons.some((b) => b.style === 'destructive');
  const icon = dialog.icon ?? (destructive ? 'warning' : undefined);
  const tint = destructive ? colors.danger : colors.primary;
  // Cancel goes first in a row and last in a stack, so the main action sits where the thumb expects it.
  const actions = dialog.buttons.filter((b) => b !== cancel);
  const stacked = dialog.buttons.length > 2;
  const ordered = stacked ? [...actions, ...(cancel ? [cancel] : [])] : [...(cancel ? [cancel] : []), ...actions];
  // Only the first action is filled; any further non-destructive actions use the softer style.
  const secondaryAction = (b: DialogButton) => actions.indexOf(b) > 0 && b.style !== 'destructive';

  return (
    <Modal
      transparent
      visible
      animationType="fade"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={() => pressDialogButton(cancel)}>
      <Pressable style={styles.backdrop} onPress={cancel ? () => pressDialogButton(cancel) : undefined} accessible={false}>
        <Pressable style={[styles.card, { backgroundColor: colors.card }]} accessibilityRole="alert">
          {icon ? (
            <View style={[styles.iconCircle, { backgroundColor: `${tint}1F` }]}>
              <Icon name={icon} size={28} color={tint} />
            </View>
          ) : null}
          <Text variant="heading" style={styles.center}>
            {dialog.title}
          </Text>
          {dialog.message ? (
            <Text tone="secondary" style={styles.center}>
              {dialog.message}
            </Text>
          ) : null}
          <View style={[styles.buttons, stacked ? styles.stack : styles.row]}>
            {ordered.map((b) => (
              <View key={b.text} style={stacked ? undefined : styles.flex}>
                <Button
                  label={b.text}
                  variant={secondaryAction(b) ? 'secondary' : variantOf(b)}
                  onPress={() => pressDialogButton(b)}
                />
              </View>
            ))}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: Radius.xl,
    borderCurve: 'continuous',
    padding: Spacing.xl,
    gap: Spacing.md,
    alignItems: 'center',
    boxShadow: '0 12px 32px rgba(0, 0, 0, 0.25)',
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    textAlign: 'center',
  },
  buttons: {
    alignSelf: 'stretch',
    marginTop: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  stack: {
    gap: Spacing.sm,
  },
  flex: {
    flex: 1,
  },
});
