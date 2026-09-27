/**
 * Achievements — summary progress + list (unlocked: green check; locked: lock icon + dim).
 */

import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Check, Lock, Trophy } from 'lucide-react-native';
import { colors, iconSizes, layout, radius, shadows, spacing, typography } from '@/theme/tokens';
import { ACHIEVEMENTS } from '@/game/achievements';
import { useProgression } from '@/state/progressionStore';
import { FadeInView } from '@/components/FadeInView';
import { ScreenHeader } from '@/components/ScreenHeader';

export default function AchievementsScreen() {
  const achievements = useProgression((s) => s.achievements);
  const unlockedCount = ACHIEVEMENTS.filter((a) => achievements[a.id]).length;
  const fraction = ACHIEVEMENTS.length ? unlockedCount / ACHIEVEMENTS.length : 0;

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title="Achievements" />
      <ScrollView contentContainerStyle={styles.content}>
        <FadeInView style={[styles.summary, shadows.raised]}>
          <View style={styles.trophy}>
            <Trophy size={iconSizes.lg} color={colors.secondary} />
          </View>
          <View style={styles.summaryInfo}>
            <Text style={styles.summaryText}>
              {unlockedCount} / {ACHIEVEMENTS.length} unlocked
            </Text>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${Math.round(fraction * 100)}%` }]} />
            </View>
          </View>
        </FadeInView>
        {ACHIEVEMENTS.map((achievement, i) => {
          const unlocked = Boolean(achievements[achievement.id]);
          return (
            <FadeInView
              key={achievement.id}
              index={i + 1}
              style={[styles.card, shadows.soft, !unlocked && styles.cardLocked]}
            >
              <View
                style={[styles.icon, unlocked && styles.iconUnlocked]}
                accessible
                accessibilityLabel={`${achievement.name}: ${unlocked ? 'unlocked' : 'locked'}. ${achievement.description}`}
              >
                {unlocked ? (
                  <Check size={iconSizes.sm} color={colors.textOnDark} />
                ) : (
                  <Lock size={iconSizes.xs} color={colors.textMuted} />
                )}
              </View>
              <View style={styles.info}>
                <Text style={styles.name}>{achievement.name}</Text>
                <Text style={styles.description}>{achievement.description}</Text>
              </View>
              {unlocked ? <Text style={styles.done}>DONE</Text> : null}
            </FadeInView>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: {
    padding: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing.xxl,
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
  },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
  },
  trophy: {
    width: layout.iconBadge + spacing.md,
    height: layout.iconBadge + spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryInfo: { flex: 1, gap: spacing.sm },
  summaryText: { ...typography.heading, color: colors.textOnDark },
  track: { height: layout.progressHeight, borderRadius: radius.pill, backgroundColor: colors.surfaceElevated, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.pill, backgroundColor: colors.secondary },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  cardLocked: { opacity: 0.65 },
  icon: {
    width: layout.iconBadge,
    height: layout.iconBadge,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconUnlocked: { backgroundColor: colors.success },
  info: { flex: 1, gap: 2 },
  name: { ...typography.body, fontWeight: '700', color: colors.text },
  description: { ...typography.caption, color: colors.textMuted },
  done: { ...typography.tiny, color: colors.success },
});
