/**
 * Campaign level node: number badge, name, stars; lock (icon + dim) and "next" states.
 */

import { StyleSheet, Text, View } from 'react-native';
import { ChevronRight, Lock } from 'lucide-react-native';
import { colors, iconSizes, layout, minTouchTarget, radius, spacing, typography } from '@/theme/tokens';
import { hapticSelection } from '@/services/haptics';
import { playSfx } from '@/services/audio';
import { PressableScale } from './PressableScale';
import { StarRating } from './StarRating';
import { useT } from '@/i18n';

interface LevelCardProps {
  levelNumber: number;
  name: string;
  accent: string;
  stars: number;
  locked: boolean;
  onPress: () => void;
  /** Highlight as the next level to play. */
  isNext?: boolean;
}

export function LevelCard({ levelNumber, name, accent, stars, locked, onPress, isNext = false }: LevelCardProps) {
  const { t } = useT();
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`${t('shell.levelCard.a11y', { number: levelNumber, name, state: locked ? t('shell.levelCard.locked') : t('shell.levelCard.stars', { count: stars }) })}${isNext ? t('shell.levelCard.nextUp') : ''}`}
      accessibilityState={{ disabled: locked }}
      disabled={locked}
      onPress={() => {
        playSfx('tap');
        hapticSelection();
        onPress();
      }}
      style={[styles.card, isNext && { borderColor: accent, backgroundColor: colors.primarySoft }, locked && styles.locked]}
    >
      <View style={[styles.badge, { backgroundColor: locked ? colors.surfaceMuted : accent }]}>
        {locked ? (
          <Lock size={iconSizes.xs} color={colors.textMuted} />
        ) : (
          <Text style={styles.badgeText}>{levelNumber}</Text>
        )}
      </View>
      <View style={styles.info}>
        <Text style={[styles.name, locked && styles.nameLocked]} numberOfLines={1}>
          {name}
        </Text>
        {locked ? <Text style={styles.lockedText}>{t('shell.levelCard.lockedHint')}</Text> : <StarRating count={stars} size={iconSizes.xs} />}
      </View>
      {isNext ? <Text style={[styles.nextTag, { backgroundColor: accent }]}>{t('shell.levelCard.next')}</Text> : null}
      {!locked ? <ChevronRight size={iconSizes.sm} color={colors.textMuted} /> : null}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.background,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: 'transparent',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: minTouchTarget + spacing.sm,
  },
  locked: { opacity: 0.6 },
  badge: {
    width: layout.iconBadge,
    height: layout.iconBadge,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { ...typography.heading, color: colors.surface },
  info: { flex: 1, gap: 2 },
  name: { ...typography.body, fontWeight: '700', color: colors.text },
  nameLocked: { color: colors.textMuted },
  lockedText: { ...typography.caption, color: colors.textMuted },
  nextTag: {
    ...typography.tiny,
    color: colors.surface,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    overflow: 'hidden',
  },
});
