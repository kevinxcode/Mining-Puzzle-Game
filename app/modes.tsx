/**
 * Play Modes — Daily Challenge (one shared level per day, streaks) and
 * Endless Shift (escalating targets, best shift record).
 */

import { useRouter } from 'expo-router';
import { StyleSheet, Text, View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CalendarDays, CheckCircle2, Flame, Infinity as InfinityIcon, Play, Trophy } from 'lucide-react-native';
import { colors, iconSizes, layout, radius, shadows, spacing, typography } from '@/theme/tokens';
import { modeRewards } from '@/game/config/rewards';
import { buildDailyLevel, dailyLevelId, endlessLevelId, localDateKey } from '@/game/levels/modeLevels';
import { useProgression } from '@/state/progressionStore';
import { FadeInView } from '@/components/FadeInView';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ScreenHeader } from '@/components/ScreenHeader';
import { playSfx } from '@/services/audio';
import { formatNumber } from '@/utils/format';

export default function ModesScreen() {
  const router = useRouter();
  const modes = useProgression((s) => s.modes);
  const today = localDateKey();
  const daily = buildDailyLevel(today);
  const wonToday = modes.daily.lastWinDate === today;
  const bestToday = modes.daily.bestScoreDate === today ? modes.daily.bestScoreToday : 0;
  const nextStreak = Math.min(modes.daily.streak + 1, modeRewards.dailyStreakCap);
  const dailyReward = modeRewards.dailyCoins + modeRewards.dailyStreakBonus * nextStreak;

  const open = (levelId: string) => {
    playSfx('tap');
    router.push(`/level/${levelId}`);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScreenHeader title="Play Modes" subtitle="Fresh challenges beyond the campaign" />
      <ScrollView contentContainerStyle={styles.content}>
        <FadeInView style={[styles.card, shadows.raised]}>
          <View style={styles.cardHead}>
            <View style={[styles.badge, { backgroundColor: colors.info }]}>
              <CalendarDays size={iconSizes.md} color={colors.textOnDark} />
            </View>
            <View style={styles.flex}>
              <Text style={styles.eyebrow}>DAILY CHALLENGE · {today}</Text>
              <Text style={styles.title} accessibilityRole="header">
                {daily.regionName}
              </Text>
            </View>
          </View>
          <Text style={styles.body}>
            One mission for everyone today: move {daily.targetTons} t in {Math.round(daily.timeLimit / 60)} min.
          </Text>
          <View style={styles.stats}>
            <Stat icon={<Flame size={iconSizes.sm} color={colors.primary} />} label="Streak" value={`${modes.daily.streak} day${modes.daily.streak === 1 ? '' : 's'}`} />
            <Stat icon={<Trophy size={iconSizes.sm} color={colors.secondary} />} label="Best today" value={bestToday ? formatNumber(bestToday) : '—'} />
          </View>
          {wonToday ? (
            <View style={styles.done}>
              <CheckCircle2 size={iconSizes.sm} color={colors.success} />
              <Text style={styles.doneText}>Reward collected — replay for a better score or come back tomorrow.</Text>
            </View>
          ) : (
            <Text style={styles.reward}>Win today: +{dailyReward} coins · +{modeRewards.dailyXp} XP</Text>
          )}
          <PrimaryButton
            label={wonToday ? 'REPLAY DAILY' : 'PLAY DAILY'}
            icon={<Play size={iconSizes.sm} color={colors.textOnDark} />}
            onPress={() => open(dailyLevelId(today))}
          />
        </FadeInView>

        <FadeInView index={1} style={[styles.card, shadows.raised]}>
          <View style={styles.cardHead}>
            <View style={[styles.badge, { backgroundColor: colors.primary }]}>
              <InfinityIcon size={iconSizes.md} color={colors.textOnDark} />
            </View>
            <View style={styles.flex}>
              <Text style={styles.eyebrow}>ENDLESS SHIFT</Text>
              <Text style={styles.title} accessibilityRole="header">
                How long can you keep up?
              </Text>
            </View>
          </View>
          <Text style={styles.body}>
            Every shift raises the target and adds site events. Clear a shift to earn coins and move on.
          </Text>
          <View style={styles.stats}>
            <Stat icon={<Trophy size={iconSizes.sm} color={colors.secondary} />} label="Best shift" value={modes.endless.bestShift ? `${modes.endless.bestShift}` : '—'} />
            <Stat icon={<Flame size={iconSizes.sm} color={colors.primary} />} label="Best tons" value={modes.endless.bestTons ? `${formatNumber(Math.round(modes.endless.bestTons))} t` : '—'} />
          </View>
          <Text style={styles.reward}>
            Shift N pays +{modeRewards.endlessCoinsBase} + {modeRewards.endlessCoinsPerShift}×N coins
          </Text>
          <PrimaryButton
            label="START SHIFT 1"
            icon={<Play size={iconSizes.sm} color={colors.textOnDark} />}
            onPress={() => open(endlessLevelId(1))}
          />
        </FadeInView>
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <View style={styles.stat} accessible accessibilityLabel={`${label}: ${value}`}>
      {icon}
      <View>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  content: { padding: layout.gutter, gap: spacing.lg, paddingBottom: spacing.xxl },
  card: { backgroundColor: colors.card, borderRadius: radius.xl, padding: spacing.lg, gap: spacing.md },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  badge: { width: 48, height: 48, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  eyebrow: { ...typography.caption, color: colors.primaryDark, fontWeight: '700', letterSpacing: 1 },
  title: { ...typography.heading, color: colors.text },
  body: { ...typography.body, color: colors.textMuted, lineHeight: 22 },
  stats: { flexDirection: 'row', gap: spacing.md },
  stat: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  statValue: { ...typography.heading, color: colors.text },
  statLabel: { ...typography.caption, color: colors.textMuted },
  reward: { ...typography.label, color: colors.success },
  done: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  doneText: { ...typography.caption, color: colors.textMuted, flex: 1 },
});
