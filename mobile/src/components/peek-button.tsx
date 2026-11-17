import type { ColorValue } from 'react-native';
import { Pressable, StyleSheet } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { Radius } from '@/constants/theme';

export interface PeekButtonProps {
  hidden: boolean;
  onPress: () => void;
  color?: ColorValue;
}

/** Eye toggle shown next to masked balances when "Hide balances" is on. */
export function PeekButton({ hidden, onPress, color }: PeekButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={hidden ? 'Show balances for a minute' : 'Hide balances'}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
      <Icon name={hidden ? 'eye' : 'eyeOff'} size={22} color={color} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 36,
    height: 36,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
});
