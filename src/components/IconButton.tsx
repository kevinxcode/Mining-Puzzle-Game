/**
 * Circular icon button (44pt+ touch target, press scale, required a11y label).
 */

import type { ReactNode } from 'react';
import { StyleSheet, type ViewStyle } from 'react-native';
import { colors, radius } from '@/theme/tokens';
import { hapticLight } from '@/services/haptics';
import { playSfx } from '@/services/audio';
import { PressableScale } from './PressableScale';

interface IconButtonProps {
  icon: ReactNode;
  onPress: () => void;
  accessibilityLabel: string;
  variant?: 'surface' | 'accent' | 'light';
  size?: number;
  style?: ViewStyle;
}

const BACKGROUNDS = {
  surface: colors.surfaceElevated,
  accent: colors.primary,
  light: colors.card,
} as const;

export function IconButton({
  icon,
  onPress,
  accessibilityLabel,
  variant = 'surface',
  size = 44,
  style,
}: IconButtonProps) {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={4}
      onPress={() => {
        playSfx('tap');
        hapticLight();
        onPress();
      }}
      style={[styles.base, { backgroundColor: BACKGROUNDS[variant], width: size, height: size }, style]}
    >
      {icon}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
