import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { Button, IconButton } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { toMonthKey } from '@/lib/format';

const MONTH_INDEXES = Array.from({ length: 12 }, (_, i) => i);

export interface MonthPickerProps {
  title: string;
  /** Selected month as `YYYY-MM`. */
  month: string;
  onSelect: (month: string) => void;
  onClose: () => void;
}

/** Year and month grid in a popup card. Render it only while open, so it starts on the selected month's year. Future months are disabled. */
export function MonthPicker({ title, month, onSelect, onClose }: MonthPickerProps) {
  const colors = useTheme();
  const latest = toMonthKey(new Date());
  const latestYear = Number(latest.slice(0, 4));
  const [year, setYear] = useState(Number(month.slice(0, 4)));

  return (
    <Modal
      transparent
      visible
      animationType="fade"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessible={false}>
        <Pressable style={[styles.card, { backgroundColor: colors.card }]}>
          <Text variant="heading" style={styles.center}>
            {title}
          </Text>
          <View style={styles.yearRow}>
            <IconButton icon="chevronLeft" accessibilityLabel="Previous year" onPress={() => setYear(year - 1)} />
            <Text variant="heading" numeric style={styles.year}>
              {year}
            </Text>
            {year < latestYear ? (
              <IconButton icon="chevronRight" accessibilityLabel="Next year" onPress={() => setYear(year + 1)} />
            ) : (
              <View style={styles.iconPlaceholder} />
            )}
          </View>
          <View style={styles.grid}>
            {MONTH_INDEXES.map((index) => {
              const key = `${year}-${String(index + 1).padStart(2, '0')}`;
              const date = new Date(year, index, 1);
              const selected = key === month;
              const future = key > latest;
              return (
                <Pressable
                  key={key}
                  disabled={future}
                  accessibilityRole="button"
                  accessibilityLabel={date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                  accessibilityState={{ selected, disabled: future }}
                  onPress={() => {
                    onSelect(key);
                    onClose();
                  }}
                  style={({ pressed }) => [
                    styles.cell,
                    {
                      backgroundColor: selected ? colors.primary : colors.cardMuted,
                      borderColor: key === latest && !selected ? colors.primary : 'transparent',
                    },
                    future && styles.disabled,
                    pressed && styles.pressed,
                  ]}>
                  <Text variant="bodyStrong" style={{ color: selected ? colors.onPrimary : colors.text }}>
                    {date.toLocaleDateString(undefined, { month: 'short' })}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Button label="Cancel" variant="secondary" onPress={onClose} />
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
    gap: Spacing.lg,
    boxShadow: '0 12px 32px rgba(0, 0, 0, 0.25)',
  },
  center: {
    textAlign: 'center',
  },
  yearRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  year: {
    flex: 1,
    textAlign: 'center',
  },
  iconPlaceholder: {
    width: 44,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  cell: {
    flexBasis: '30%',
    flexGrow: 1,
    minHeight: 48,
    borderRadius: Radius.md,
    borderCurve: 'continuous',
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.35,
  },
  pressed: {
    opacity: 0.7,
  },
});
