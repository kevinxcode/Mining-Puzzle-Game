/**
 * Primary action button — large, rounded, tactile (press scale), optional leading icon.
 */

import type { ReactNode } from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { colors, minTouchTarget, radius, shadows, spacing, typography } from '@/theme/tokens';
import { hapticLight } from '@/services/haptics';
import { playSfx } from '@/services/audio';
import { PressableScale } from './PressableScale';

interface PrimaryButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'light' | 'outline';
  disabled?: boolean;
  style?: ViewStyle;
  icon?: ReactNode;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

const VARIANTS = {
  primary: { background: colors.primary, text: colors.textOnDark, border: colors.primary },
  secondary: { background: colors.secondary, text: colors.text, border: colors.secondary },
  ghost: { background: colors.surfaceElevated, text: colors.textOnDark, border: colors.surfaceElevated },
  danger: { background: colors.danger, text: colors.textOnDark, border: colors.danger },
  light: { background: colors.card, text: colors.text, border: colors.card },
  outline: { background: 'transparent', text: colors.text, border: colors.border },
} as const;

export function PrimaryButton({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  style,
  icon,
  accessibilityLabel,
  accessibilityHint,
}: PrimaryButtonProps) {
  const palette = VARIANTS[variant];
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={() => {
        playSfx('tap');
        hapticLight();
        onPress();
      }}
      style={[
        styles.base,
        variant !== 'outline' && shadows.soft,
        { backgroundColor: palette.background, borderColor: palette.border, opacity: disabled ? 0.4 : 1 },
        style,
      ]}
    >
      <View style={styles.row}>
        {icon}
        <Text style={[styles.label, { color: palette.text }]} numberOfLines={1}>
          {label}
        </Text>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.lg,
    borderWidth: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: minTouchTarget + 4,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  label: { ...typography.button },
});
