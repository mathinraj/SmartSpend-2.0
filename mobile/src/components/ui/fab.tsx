import { Pressable, StyleSheet, View } from 'react-native';

import { Icon, type IconName } from '@/components/ui/icon';
import { BottomTabInset, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface FabProps {
  onPress: () => void;
  accessibilityLabel: string;
  icon?: IconName;
}

/** Floating action button for tab screens; positioned clear of the tab bar. */
export function Fab({ onPress, accessibilityLabel, icon = 'add' }: FabProps) {
  const colors = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          bottom: BottomTabInset + Spacing.lg,
          backgroundColor: colors.primary,
          boxShadow: '0 6px 16px rgba(108, 92, 231, 0.35)',
        },
      ]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPress={onPress}
        android_ripple={{ color: 'rgba(255, 255, 255, 0.3)' }}
        style={styles.button}>
        <Icon name={icon} size={28} color={colors.onPrimary} />
      </Pressable>
    </View>
  );
}

/** Bottom padding for scrollable content on screens that show a `Fab`, so the last row isn't covered. */
export const FAB_CLEARANCE = 56 + Spacing.lg;

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: Spacing.lg,
    borderRadius: Radius.lg,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  button: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
