/**
 * Campaign region section with accent header and completion progress.
 */

import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Lock } from 'lucide-react-native';
import { colors, iconSizes, layout, radius, shadows, spacing, typography } from '@/theme/tokens';

interface RegionCardProps {
  name: string;
  tagline: string;
  accent: string;
  children: ReactNode;
  /** Completed levels in this region. */
  completed?: number;
  total?: number;
  locked?: boolean;
}

export function RegionCard({ name, tagline, accent, children, completed, total, locked }: RegionCardProps) {
  const fraction = total ? (completed ?? 0) / total : 0;
  return (
    <View style={[styles.card, shadows.soft, locked && styles.locked]}>
      <View style={[styles.headerBar, { backgroundColor: accent }]} />
      <View style={styles.content}>
        <View style={styles.titleRow}>
          <View style={styles.titleBlock}>
            <Text style={styles.name} accessibilityRole="header">
              {name}
            </Text>
            <Text style={styles.tagline}>{tagline}</Text>
          </View>
          {locked ? (
            <Lock size={iconSizes.sm} color={colors.textMuted} />
          ) : total ? (
            <Text style={styles.count}>
              {completed}/{total}
            </Text>
          ) : null}
        </View>
        {total ? (
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${Math.round(fraction * 100)}%`, backgroundColor: accent }]} />
          </View>
        ) : null}
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    overflow: 'hidden',
  },
  locked: { opacity: 0.85 },
  headerBar: { height: spacing.sm },
  content: { padding: spacing.lg, gap: spacing.md },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  titleBlock: { flex: 1, gap: 2 },
  name: { ...typography.title, color: colors.text },
  tagline: { ...typography.caption, color: colors.textMuted },
  count: { ...typography.label, color: colors.textMuted },
  track: { height: layout.progressHeight / 2, borderRadius: radius.pill, backgroundColor: colors.surfaceMuted, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.pill },
});
