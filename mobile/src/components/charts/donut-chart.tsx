import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';

import { useTheme } from '@/hooks/use-theme';

export interface DonutSegment {
  key: string;
  value: number;
  color: string;
}

export interface DonutChartProps {
  segments: DonutSegment[];
  size?: number;
  thickness?: number;
  /** Rendered in the hole, e.g. the total. */
  children?: ReactNode;
}

/** Gap between segments, in px along the ring. */
const GAP = 3;

export function DonutChart({ segments, size = 200, thickness = 24, children }: DonutChartProps) {
  const colors = useTheme();
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  const gap = segments.length > 1 ? GAP : 0;

  let offset = 0;
  const arcs = total > 0
    ? segments.map((s) => {
        const length = (s.value / total) * circumference;
        const dash = Math.max(length - gap, 0.5);
        const arc = (
          <Circle
            key={s.key}
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={s.color}
            strokeWidth={thickness}
            strokeDasharray={`${dash} ${circumference - dash}`}
            strokeDashoffset={-offset}
          />
        );
        offset += length;
        return arc;
      })
    : null;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <G rotation={-90} origin={`${center}, ${center}`}>
          <Circle cx={center} cy={center} r={radius} fill="none" stroke={colors.cardMuted} strokeWidth={thickness} />
          {arcs}
        </G>
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.hole]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  hole: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
