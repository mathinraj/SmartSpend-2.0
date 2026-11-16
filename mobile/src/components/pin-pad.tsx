import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export const PIN_LENGTH = 4;

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'bio', '0', 'back'] as const;

export interface PinPadProps {
  title: string;
  subtitle?: string;
  error?: string | null;
  /** Called with the full PIN; the pad clears itself afterwards. */
  onComplete: (pin: string) => void;
  /** Shows a fingerprint key in the bottom-left corner. */
  onBiometric?: () => void;
}

export function PinPad({ title, subtitle, error, onComplete, onBiometric }: PinPadProps) {
  const colors = useTheme();
  const [pin, setPin] = useState('');

  function press(key: (typeof KEYS)[number]) {
    if (key === 'bio') {
      onBiometric?.();
      return;
    }
    if (key === 'back') {
      setPin((p) => p.slice(0, -1));
      return;
    }
    const next = pin + key;
    if (next.length < PIN_LENGTH) {
      setPin(next);
      return;
    }
    setPin('');
    onComplete(next);
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant="title" style={styles.center}>
          {title}
        </Text>
        {subtitle ? (
          <Text tone="secondary" style={styles.center}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      <View style={styles.dots} accessibilityLabel={`${pin.length} of ${PIN_LENGTH} digits entered`}>
        {Array.from({ length: PIN_LENGTH }, (_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              { borderColor: error ? colors.danger : colors.primary },
              i < pin.length && { backgroundColor: error ? colors.danger : colors.primary },
            ]}
          />
        ))}
      </View>
      <Text variant="bodyStrong" tone="danger" style={[styles.center, styles.error]}>
        {error ?? ' '}
      </Text>

      <View style={styles.grid}>
        {KEYS.map((key) => {
          if (key === 'bio' && !onBiometric) return <View key={key} style={styles.key} />;
          return (
            <View key={key} style={[styles.keyClip, key !== 'bio' && key !== 'back' && { backgroundColor: colors.card }]}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={key === 'back' ? 'Delete' : key === 'bio' ? 'Use fingerprint' : key}
                onPress={() => press(key)}
                android_ripple={{ color: colors.border }}
                style={styles.key}>
                {key === 'back' ? (
                  <Icon name="backspace" size={26} color={colors.textSecondary} />
                ) : key === 'bio' ? (
                  <Icon name="fingerprint" size={30} color={colors.primary} />
                ) : (
                  <Text style={[styles.digit, { color: colors.text }]}>{key}</Text>
                )}
              </Pressable>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const KEY_SIZE = 72;

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: Spacing.lg,
  },
  header: {
    gap: Spacing.xs,
    paddingHorizontal: Spacing.xl,
  },
  center: {
    textAlign: 'center',
  },
  dots: {
    flexDirection: 'row',
    gap: Spacing.lg,
    marginTop: Spacing.md,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: Radius.pill,
    borderWidth: 2,
  },
  error: {
    minHeight: 21,
  },
  grid: {
    width: KEY_SIZE * 3 + Spacing.xl * 2,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xl,
    rowGap: Spacing.lg,
  },
  keyClip: {
    borderRadius: Radius.pill,
    overflow: 'hidden',
  },
  key: {
    width: KEY_SIZE,
    height: KEY_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  digit: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '500',
  },
});
