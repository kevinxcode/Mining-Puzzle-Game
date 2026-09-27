/**
 * MINING FLOW — primary action button.
 */

import { Pressable, StyleSheet, Text, type ViewStyle } from 'react-native';
import { colors, radius, shadows, spacing, typography } from '@/theme/tokens';
import { hapticLight } from '@/services/haptics';
import { playSfx } from '@/services/audio';

interface PrimaryButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  disabled?: boolean;
  style?: ViewStyle;
}

const VARIANTS = {
  primary: { background: colors.primary, text: colors.textOnDark },
  secondary: { background: colors.secondary, text: colors.text },
  ghost: { background: colors.surfaceElevated, text: colors.textOnDark },
  danger: { background: colors.danger, text: colors.textOnDark },
} as const;

export function PrimaryButton({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  style,
}: PrimaryButtonProps) {
  const palette = VARIANTS[variant];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={() => {
        playSfx('tap');
        hapticLight();
        onPress();
      }}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: palette.background, opacity: disabled ? 0.4 : pressed ? 0.85 : 1 },
        style,
      ]}
    >
      <Text style={[styles.label, { color: palette.text }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    ...shadows.soft,
  },
  label: {
    ...typography.heading,
  },
});