/**
 * MINING FLOW — mission header.
 * Target progress, remaining time and projected stars.
 */

import { StyleSheet, Text, View } from 'react-native';
import { Clock } from 'lucide-react-native';
import { colors, radius, shadows, spacing, typography } from '@/theme/tokens';
import { formatClock, formatTons } from '@/utils/format';
import { StarRating } from './StarRating';

interface MissionHeaderProps {
  levelName: string;
  regionName: string;
  tonsMoved: number;
  targetTons: number;
  remainingSeconds: number;
  projectedStars: number;
  timeCritical: boolean;
}

export function MissionHeader({
  levelName,
  regionName,
  tonsMoved,
  targetTons,
  remainingSeconds,
  projectedStars,
  timeCritical,
}: MissionHeaderProps) {
  const progress = Math.max(0, Math.min(1, targetTons > 0 ? tonsMoved / targetTons : 0));
  return (
    <View style={[styles.card, shadows.soft]}>
      <View style={styles.topRow}>
        <View style={styles.titleBlock}>
          <Text style={styles.region}>{regionName}</Text>
          <Text style={styles.title}>{levelName}</Text>
        </View>
        <View style={styles.timeBlock}>
          <Clock size={16} color={timeCritical ? colors.danger : colors.textMuted} />
          <Text style={[styles.time, timeCritical && styles.timeCriticalText]}>
            {formatClock(remainingSeconds)}
          </Text>
        </View>
      </View>
      <View style={styles.progressRow}>
        <Text style={styles.target}>
          {formatTons(tonsMoved)} / {formatTons(targetTons)}
        </Text>
        <StarRating count={projectedStars} size={14} />
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${Math.round(progress * 100)}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  titleBlock: { gap: 2 },
  region: { ...typography.label, color: colors.textMuted },
  title: { ...typography.heading, color: colors.text },
  timeBlock: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  time: { ...typography.heading, color: colors.text },
  timeCriticalText: { color: colors.danger },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  target: { ...typography.body, color: colors.text },
  track: {
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
    overflow: 'hidden',
  },
  fill: { height: '100%', backgroundColor: colors.primary },
});