/**
 * Statistics tile — tinted icon, large value, label.
 */

import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, layout, radius, shadows, spacing, typography } from '@/theme/tokens';

interface StatCardProps {
  label: string;
  value: string;
  accent?: string;
  icon?: ReactNode;
}

export function StatCard({ label, value, accent = colors.primary, icon }: StatCardProps) {
  return (
    <View style={[styles.card, shadows.soft]} accessible accessibilityLabel={`${label}: ${value}`}>
      {icon ? <View style={[styles.icon, { backgroundColor: colors.background }]}>{icon}</View> : null}
      <Text style={[styles.value, { color: accent }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={styles.label} numberOfLines={2}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.xs,
    minWidth: 0,
  },
  icon: {
    width: layout.iconBadge - spacing.xs,
    height: layout.iconBadge - spacing.xs,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  value: { ...typography.title },
  label: { ...typography.caption, color: colors.textMuted },
});
