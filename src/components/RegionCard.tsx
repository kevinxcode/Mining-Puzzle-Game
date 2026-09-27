/**
 * MINING FLOW — campaign region section.
 */

import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, shadows, spacing, typography } from '@/theme/tokens';

interface RegionCardProps {
  name: string;
  tagline: string;
  accent: string;
  children: ReactNode;
}

export function RegionCard({ name, tagline, accent, children }: RegionCardProps) {
  return (
    <View style={[styles.card, shadows.soft]}>
      <View style={[styles.headerBar, { backgroundColor: accent }]} />
      <View style={styles.content}>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.tagline}>{tagline}</Text>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  headerBar: { height: 6 },
  content: { padding: spacing.md, gap: spacing.sm },
  name: { ...typography.heading, color: colors.text },
  tagline: { ...typography.caption, color: colors.textMuted },
});