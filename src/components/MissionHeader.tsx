/**
 * Mission header — level name, time pill (turns red + alert icon when critical),
 * tonnage progress and projected stars.
 */

import { StyleSheet, Text, View } from 'react-native';
import { AlarmClock, Clock } from 'lucide-react-native';
import { colors, iconSizes, layout, radius, shadows, spacing, typography } from '@/theme/tokens';
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
  const done = progress >= 1;
  return (
    <View style={[styles.card, shadows.soft]}>
      <View style={styles.topRow}>
        <View style={styles.titleBlock}>
          <Text style={styles.region} numberOfLines={1}>
            {regionName.toUpperCase()}
          </Text>
          <Text style={styles.title} numberOfLines={1}>
            {levelName}
          </Text>
        </View>
        <View
          style={[styles.timePill, timeCritical && styles.timePillCritical]}
          accessibilityLabel={`${formatClock(remainingSeconds)} remaining${timeCritical ? ', time is running out' : ''}`}
        >
          {timeCritical ? (
            <AlarmClock size={iconSizes.xs} color={colors.textOnDark} />
          ) : (
            <Clock size={iconSizes.xs} color={colors.textMuted} />
          )}
          <Text style={[styles.time, timeCritical && styles.timeCriticalText]}>{formatClock(remainingSeconds)}</Text>
        </View>
      </View>
      <View style={styles.progressRow}>
        <Text style={styles.target}>
          <Text style={styles.targetStrong}>{formatTons(tonsMoved)}</Text> / {formatTons(targetTons)}
        </Text>
        <StarRating count={projectedStars} size={iconSizes.xs} />
      </View>
      <View
        style={styles.track}
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }}
      >
        <View
          style={[styles.fill, { width: `${Math.round(progress * 100)}%`, backgroundColor: done ? colors.success : colors.primary }]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    gap: spacing.xs + 2,
  },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  titleBlock: { flex: 1, gap: 1 },
  region: { ...typography.tiny, color: colors.textMuted },
  title: { ...typography.heading, color: colors.text },
  timePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.background,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
  },
  timePillCritical: { backgroundColor: colors.danger },
  time: { ...typography.heading, color: colors.text, fontVariant: ['tabular-nums'] },
  timeCriticalText: { color: colors.textOnDark },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  target: { ...typography.caption, color: colors.textMuted },
  targetStrong: { ...typography.body, fontWeight: '800', color: colors.text },
  track: {
    height: layout.progressHeight,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: radius.pill },
});
