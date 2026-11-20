import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Marks SMS import as a beta feature wherever it appears. */
export function BetaBadge() {
  const colors = useTheme();
  return (
    <View style={[styles.badge, { backgroundColor: `${colors.warning}33` }]}>
      <Text variant="label" style={{ color: colors.text }}>
        Beta
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.pill,
  },
});
