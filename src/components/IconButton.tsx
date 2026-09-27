/**
 * MINING FLOW — circular icon button.
 */

import type { ReactNode } from 'react';
import { Pressable, StyleSheet, type ViewStyle } from 'react-native';
import { colors, radius } from '@/theme/tokens';
import { hapticLight } from '@/services/haptics';
import { playSfx } from '@/services/audio';

interface IconButtonProps {
  icon: ReactNode;
  onPress: () => void;
  accessibilityLabel: string;
  variant?: 'surface' | 'accent';
  size?: number;
  style?: ViewStyle;
}

export function IconButton({
  icon,
  onPress,
  accessibilityLabel,
  variant = 'surface',
  size = 44,
  style,
}: IconButtonProps) {
  const background = variant === 'accent' ? colors.primary : colors.surfaceElevated;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={() => {
        playSfx('tap');
        hapticLight();
        onPress();
      }}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: background, width: size, height: size, opacity: pressed ? 0.8 : 1 },
        style,
      ]}
    >
      {icon}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});