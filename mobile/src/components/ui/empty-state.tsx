import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { Spacing } from '@/constants/theme';

export interface EmptyStateProps {
  emoji: string;
  title: string;
  message: string;
  /** Usually one or two `Button`s. */
  actions?: ReactNode;
}

export function EmptyState({ emoji, title, message, actions }: EmptyStateProps) {
  return (
    <Card style={styles.card}>
      <Text style={styles.emoji}>{emoji}</Text>
      <Text variant="heading" style={styles.center}>
        {title}
      </Text>
      <Text tone="secondary" style={styles.center}>
        {message}
      </Text>
      {actions ? <View style={styles.actions}>{actions}</View> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.xxl,
  },
  emoji: {
    fontSize: 44,
    lineHeight: 52,
  },
  center: {
    textAlign: 'center',
  },
  actions: {
    alignSelf: 'stretch',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
});
