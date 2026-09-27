/**
 * MINING FLOW — statistics card.
 */

import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, shadows, spacing, typography } from '@/theme/tokens';

interface StatCardProps {
  label: string;
  value: string;
  accent?: string;
}

export function StatCard({ label, value, accent = colors.primary }: StatCardProps) {
  return (
    <View style={[styles.card, shadows.soft]}>
      <Text style={[styles.value, { color: accent }]} numberOfLines={1}>
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
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.xs,
    minWidth: 120,
  },
  value: { ...typography.heading, color: colors.primary },
  label: { ...typography.caption, color: colors.textMuted },
});