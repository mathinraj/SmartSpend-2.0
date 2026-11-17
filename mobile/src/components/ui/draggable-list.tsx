import { useRef, useState, type ReactNode } from 'react';
import { Animated, StyleSheet, View, type GestureResponderEvent } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** How long the handle must be held before the row lifts. */
const LONG_PRESS_MS = 220;
/** Moving further than this before the row lifts cancels the drag. */
const CANCEL_DISTANCE = 10;

export interface DraggableListProps<T> {
  items: T[];
  keyOf: (item: T) => string;
  /** `handle` is the drag grip; place it in the row where it should appear. */
  renderItem: (item: T, index: number, handle: ReactNode) => ReactNode;
  onReorder: (from: number, to: number) => void;
  /** Screen reader name for an item, e.g. "Groceries". */
  labelOf: (item: T, index: number) => string;
}

/** A short list reordered by holding a row's ≡ handle and dragging it up or down. */
export function DraggableList<T>({ items, keyOf, renderItem, onReorder, labelOf }: DraggableListProps<T>) {
  const [heights, setHeights] = useState<Record<string, number>>({});
  const [dy] = useState(() => new Animated.Value(0));
  const [active, setActive] = useState<number | null>(null);
  const [target, setTarget] = useState<number | null>(null);
  const heightAt = (i: number) => heights[keyOf(items[i])] ?? 0;

  function targetFor(from: number, offset: number): number {
    let top = 0;
    for (let i = 0; i < from; i++) top += heightAt(i);
    const center = top + heightAt(from) / 2 + offset;
    let edge = 0;
    for (let i = 0; i < items.length; i++) {
      edge += heightAt(i);
      if (center < edge) return i;
    }
    return items.length - 1;
  }

  function shiftFor(index: number): number {
    if (active === null || target === null || index === active) return 0;
    const size = heightAt(active);
    if (active < target && index > active && index <= target) return -size;
    if (active > target && index < active && index >= target) return size;
    return 0;
  }

  return (
    <View>
      {items.map((item, index) => {
        const key = keyOf(item);
        return (
          <DragRow
            key={key}
            isActive={active === index}
            shift={shiftFor(index)}
            dy={dy}
            label={labelOf(item, index)}
            canMove={items.length > 1}
            onHeight={(h) => setHeights((prev) => (prev[key] === h ? prev : { ...prev, [key]: h }))}
            onLift={() => {
              dy.setValue(0);
              setActive(index);
              setTarget(index);
            }}
            onMove={(offset) => {
              dy.setValue(offset);
              setTarget(targetFor(index, offset));
            }}
            onDrop={(offset) => {
              const to = targetFor(index, offset);
              dy.setValue(0);
              setActive(null);
              setTarget(null);
              if (to !== index) onReorder(index, to);
            }}
            onMoveBy={(delta) => {
              const to = index + delta;
              if (to >= 0 && to < items.length) onReorder(index, to);
            }}>
            {(handle) => renderItem(item, index, handle)}
          </DragRow>
        );
      })}
    </View>
  );
}

interface DragRowProps {
  isActive: boolean;
  shift: number;
  dy: Animated.Value;
  label: string;
  canMove: boolean;
  onHeight: (height: number) => void;
  onLift: () => void;
  onMove: (offset: number) => void;
  onDrop: (offset: number) => void;
  onMoveBy: (delta: -1 | 1) => void;
  children: (handle: ReactNode) => ReactNode;
}

function DragRow({ isActive, shift, dy, label, canMove, onHeight, onLift, onMove, onDrop, onMoveBy, children }: DragRowProps) {
  const colors = useTheme();
  // Gesture bookkeeping, only touched inside touch handlers.
  const gesture = useRef({ startY: 0, lifted: false, timer: undefined as ReturnType<typeof setTimeout> | undefined });

  function offsetOf(e: GestureResponderEvent) {
    return e.nativeEvent.pageY - gesture.current.startY;
  }

  function end(e: GestureResponderEvent) {
    const g = gesture.current;
    clearTimeout(g.timer);
    if (g.lifted) onDrop(offsetOf(e));
    g.lifted = false;
  }

  const handle = (
    <View
      onStartShouldSetResponder={() => canMove}
      onResponderGrant={(e) => {
        const g = gesture.current;
        g.startY = e.nativeEvent.pageY;
        g.lifted = false;
        g.timer = setTimeout(() => {
          g.lifted = true;
          onLift();
        }, LONG_PRESS_MS);
        // Returning true keeps the surrounding ScrollView from taking over the touch.
        return true;
      }}
      onResponderMove={(e) => {
        const g = gesture.current;
        const offset = offsetOf(e);
        if (g.lifted) onMove(offset);
        else if (Math.abs(offset) > CANCEL_DISTANCE) clearTimeout(g.timer);
      }}
      onResponderRelease={end}
      onResponderTerminate={end}
      onResponderTerminationRequest={() => !gesture.current.lifted}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={`Reorder ${label}`}
      accessibilityHint="Hold and drag up or down"
      accessibilityActions={[
        { name: 'increment', label: 'Move down' },
        { name: 'decrement', label: 'Move up' },
      ]}
      onAccessibilityAction={(e) => onMoveBy(e.nativeEvent.actionName === 'increment' ? 1 : -1)}
      hitSlop={8}
      style={[styles.handle, !canMove && styles.disabled]}>
      <Icon name="dragHandle" size={24} color={isActive ? colors.primary : colors.textSecondary} />
    </View>
  );

  return (
    <Animated.View
      onLayout={(e) => onHeight(e.nativeEvent.layout.height)}
      style={[
        styles.row,
        isActive
          ? { zIndex: 10, elevation: 10, transform: [{ translateY: dy }, { scale: 1.03 }] }
          : { transform: [{ translateY: shift }] },
      ]}>
      <View
        style={[
          styles.inner,
          isActive && { backgroundColor: colors.card, boxShadow: '0 6px 18px rgba(0, 0, 0, 0.18)', borderRadius: 12 },
        ]}>
        {children(handle)}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingBottom: Spacing.sm,
  },
  inner: {
    padding: 2,
  },
  handle: {
    width: 36,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.35,
  },
});
