/**
 * Shared top bar for secondary screens: back button, title (+ optional subtitle), right slot.
 */

import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { colors, iconSizes, spacing, typography } from '@/theme/tokens';
import { IconButton } from './IconButton';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  onBack?: () => void;
  tone?: 'light' | 'dark';
}

export function ScreenHeader({ title, subtitle, right, onBack, tone = 'light' }: ScreenHeaderProps) {
  const router = useRouter();
  const textColor = tone === 'dark' ? colors.textOnDark : colors.text;
  return (
    <View style={styles.header}>
      <IconButton
        icon={<ChevronLeft size={iconSizes.md} color={colors.textOnDark} />}
        accessibilityLabel="Back"
        onPress={onBack ?? (() => router.back())}
      />
      <View style={styles.titleBlock}>
        <Text style={[styles.title, { color: textColor }]} numberOfLines={1} accessibilityRole="header">
          {title}
        </Text>
        {subtitle ? (
          <Text style={[styles.subtitle, tone === 'dark' && styles.subtitleDark]} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <View style={styles.right}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  titleBlock: { flex: 1, gap: 2 },
  title: { ...typography.title },
  subtitle: { ...typography.caption, color: colors.textMuted },
  subtitleDark: { color: colors.textOnDarkMuted },
  right: { minWidth: 44, alignItems: 'flex-end' },
});
