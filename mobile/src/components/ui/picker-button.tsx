import { Pressable, StyleSheet, View } from 'react-native';

import { Icon, type IconName } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Input-styled button that opens a system picker (see `src/lib/pickers.ts`). */
export function PickerButton({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  const colors = useTheme();
  return (
    <View style={[styles.clip, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        android_ripple={{ color: colors.border }}
        style={styles.picker}>
        <Icon name={icon} size={20} color={colors.primary} />
        <Text variant="bodyStrong" numberOfLines={1}>
          {label}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  clip: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  picker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    minHeight: 50,
    paddingHorizontal: Spacing.lg,
  },
});
