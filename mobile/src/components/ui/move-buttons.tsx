import { Pressable, StyleSheet, View } from 'react-native';

import { Icon, type IconName } from '@/components/ui/icon';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface MoveButtonsProps {
  /** Names the item in screen reader labels, e.g. "Move Food up". */
  label: string;
  onMove: (delta: -1 | 1) => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
}

/** Up/down arrows for reordering a list item one place at a time. */
export function MoveButtons({ label, onMove, canMoveUp, canMoveDown }: MoveButtonsProps) {
  return (
    <View style={styles.row}>
      <MoveButton icon="arrowUp" accessibilityLabel={`Move ${label} up`} disabled={!canMoveUp} onPress={() => onMove(-1)} />
      <MoveButton
        icon="arrowDown"
        accessibilityLabel={`Move ${label} down`}
        disabled={!canMoveDown}
        onPress={() => onMove(1)}
      />
    </View>
  );
}

function MoveButton({
  icon,
  accessibilityLabel,
  disabled,
  onPress,
}: {
  icon: IconName;
  accessibilityLabel: string;
  disabled: boolean;
  onPress: () => void;
}) {
  const colors = useTheme();
  return (
    <View style={[styles.clip, { backgroundColor: colors.cardMuted }, disabled && styles.disabled]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={onPress}
        android_ripple={{ color: colors.border }}
        style={styles.button}>
        <Icon name={icon} size={18} color={colors.textSecondary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 6,
  },
  clip: {
    borderRadius: Radius.pill,
    overflow: 'hidden',
  },
  button: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.35,
  },
});
