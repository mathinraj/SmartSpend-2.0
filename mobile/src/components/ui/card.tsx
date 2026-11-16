import { View, type ViewProps } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface CardProps extends ViewProps {
  /** Drop the inner padding, e.g. for edge-to-edge list rows. */
  flush?: boolean;
}

export function Card({ flush, style, ...rest }: CardProps) {
  const colors = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: colors.card,
          borderRadius: Radius.lg,
          borderCurve: 'continuous',
          boxShadow: colors.shadow,
          padding: flush ? 0 : Spacing.lg,
          overflow: 'hidden',
        },
        style,
      ]}
      {...rest}
    />
  );
}
