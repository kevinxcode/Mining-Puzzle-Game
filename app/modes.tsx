/**
 * Play Modes — Daily Challenge (one shared level per day, streaks) and
 * Endless Shift (escalating targets, best shift record).
 */

import { useRouter } from 'expo-router';
import { StyleSheet, Text, View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CalendarDays, CalendarRange, CheckCircle2, Flame, Infinity as InfinityIcon, Pencil, Play, Swords, Trophy } from 'lucide-react-native';
import { colors, iconSizes, layout, radius, shadows, spacing, typography } from '@/theme/tokens';
import { modeRewards } from '@/game/config/rewards';
import {
  buildDailyLevel,
  buildWeeklyLevel,
  dailyLevelId,
  endlessLevelId,
  isoWeekKey,
  localDateKey,
  weeklyLevelId,
} from '@/game/levels/modeLevels';
import { useProgression } from '@/state/progressionStore';
import { FadeInView } from '@/components/FadeInView';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ScreenHeader } from '@/components/ScreenHeader';
import { playSfx } from '@/services/audio';
import { formatNumber } from '@/utils/format';
import { useT } from '@/i18n';

export default function ModesScreen() {
  const router = useRouter();
  const { t, tx, tn } = useT();
  const modes = useProgression((s) => s.modes);
  const today = localDateKey();
  const daily = buildDailyLevel(today);
  const wonToday = modes.daily.lastWinDate === today;
  const bestToday = modes.daily.bestScoreDate === today ? modes.daily.bestScoreToday : 0;
  const nextStreak = Math.min(modes.daily.streak + 1, modeRewards.dailyStreakCap);
  const dailyReward = modeRewards.dailyCoins + modeRewards.dailyStreakBonus * nextStreak;

  const week = isoWeekKey();
  const weekly = buildWeeklyLevel(week);
  const wonThisWeek = modes.weekly.lastWinWeek === week;
  const bestThisWeek = modes.weekly.bestWeek === week ? modes.weekly.bestScore : 0;

  const open = (levelId: string) => {
    playSfx('tap');
    router.push(`/level/${levelId}`);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScreenHeader title={t('shell.modes.title')} subtitle={t('shell.modes.subtitle')} />
      <ScrollView contentContainerStyle={styles.content}>
        <FadeInView style={[styles.card, shadows.raised]}>
          <View style={styles.cardHead}>
            <View style={[styles.badge, { backgroundColor: colors.info }]}>
              <CalendarDays size={iconSizes.md} color={colors.textOnDark} />
            </View>
            <View style={styles.flex}>
              <Text style={styles.eyebrow}>{t('shell.modes.dailyEyebrow', { date: today })}</Text>
              <Text style={styles.title} accessibilityRole="header">
                {tx(daily.regionName)}
              </Text>
            </View>
          </View>
          <Text style={styles.body}>
            {t('shell.modes.dailyBody', { tons: daily.targetTons, minutes: Math.round(daily.timeLimit / 60) })}
          </Text>
          <View style={styles.stats}>
            <Stat icon={<Flame size={iconSizes.sm} color={colors.primary} />} label={t('shell.modes.streak')} value={tn('shell.modes.day_one', 'shell.modes.day_other', modes.daily.streak)} />
            <Stat icon={<Trophy size={iconSizes.sm} color={colors.secondary} />} label={t('shell.modes.bestToday')} value={bestToday ? formatNumber(bestToday) : '—'} />
          </View>
          {wonToday ? (
            <View style={styles.done}>
              <CheckCircle2 size={iconSizes.sm} color={colors.success} />
              <Text style={styles.doneText}>{t('shell.modes.dailyDone')}</Text>
            </View>
          ) : (
            <Text style={styles.reward}>{t('shell.modes.dailyReward', { coins: dailyReward, xp: modeRewards.dailyXp })}</Text>
          )}
          <PrimaryButton
            label={t(wonToday ? 'shell.modes.replayDaily' : 'shell.modes.playDaily')}
            icon={<Play size={iconSizes.sm} color={colors.textOnDark} />}
            onPress={() => open(dailyLevelId(today))}
          />
        </FadeInView>

        <FadeInView index={1} style={[styles.card, shadows.raised]}>
          <View style={styles.cardHead}>
            <View style={[styles.badge, { backgroundColor: colors.secondary }]}>
              <CalendarRange size={iconSizes.md} color={colors.surface} />
            </View>
            <View style={styles.flex}>
              <Text style={styles.eyebrow}>{t('shell.modes.weeklyEyebrow', { week })}</Text>
              <Text style={styles.title} accessibilityRole="header">
                {tx(weekly.regionName)}
              </Text>
            </View>
          </View>
          <Text style={styles.body}>
            {t('shell.modes.weeklyBody', { tons: weekly.targetTons, minutes: Math.round(weekly.timeLimit / 60) })}
          </Text>
          <View style={styles.stats}>
            <Stat icon={<Trophy size={iconSizes.sm} color={colors.secondary} />} label={t('shell.modes.bestWeek')} value={bestThisWeek ? formatNumber(bestThisWeek) : '—'} />
            <Stat icon={<CheckCircle2 size={iconSizes.sm} color={colors.success} />} label={t('shell.modes.weeksWon')} value={`${modes.weekly.totalWins}`} />
          </View>
          {wonThisWeek ? (
            <View style={styles.done}>
              <CheckCircle2 size={iconSizes.sm} color={colors.success} />
              <Text style={styles.doneText}>{t('shell.modes.weeklyDone')}</Text>
            </View>
          ) : (
            <Text style={styles.reward}>{t('shell.modes.weeklyReward', { coins: modeRewards.weeklyCoins, xp: modeRewards.weeklyXp })}</Text>
          )}
          <PrimaryButton
            label={t(wonThisWeek ? 'shell.modes.replayWeekly' : 'shell.modes.playWeekly')}
            icon={<Play size={iconSizes.sm} color={colors.textOnDark} />}
            onPress={() => open(weeklyLevelId(week))}
          />
        </FadeInView>

        <FadeInView index={2} style={[styles.card, shadows.raised]}>
          <View style={styles.cardHead}>
            <View style={[styles.badge, { backgroundColor: colors.success }]}>
              <Swords size={iconSizes.md} color={colors.textOnDark} />
            </View>
            <View style={styles.flex}>
              <Text style={styles.eyebrow}>{t('shell.modes.friendEyebrow')}</Text>
              <Text style={styles.title} accessibilityRole="header">
                {t('shell.modes.friendTitle')}
              </Text>
            </View>
          </View>
          <Text style={styles.body}>
            {t('shell.modes.friendBody')}
          </Text>
          <PrimaryButton label={t('shell.modes.openFriend')} icon={<Swords size={iconSizes.sm} color={colors.textOnDark} />} onPress={() => router.push('/challenge')} />
        </FadeInView>

        <FadeInView index={3} style={[styles.card, shadows.raised]}>
          <View style={styles.cardHead}>
            <View style={[styles.badge, { backgroundColor: colors.warning }]}>
              <Pencil size={iconSizes.md} color={colors.textOnDark} />
            </View>
            <View style={styles.flex}>
              <Text style={styles.eyebrow}>{t('editor.entry.eyebrow')}</Text>
              <Text style={styles.title} accessibilityRole="header">
                {t('editor.entry.title')}
              </Text>
            </View>
          </View>
          <Text style={styles.body}>{t('editor.entry.body')}</Text>
          <PrimaryButton label={t('editor.entry.open')} icon={<Pencil size={iconSizes.sm} color={colors.textOnDark} />} onPress={() => router.push('/editor' as never)} />
        </FadeInView>

        <FadeInView index={4} style={[styles.card, shadows.raised]}>
          <View style={styles.cardHead}>
            <View style={[styles.badge, { backgroundColor: colors.primary }]}>
              <InfinityIcon size={iconSizes.md} color={colors.textOnDark} />
            </View>
            <View style={styles.flex}>
              <Text style={styles.eyebrow}>{t('shell.modes.endlessEyebrow')}</Text>
              <Text style={styles.title} accessibilityRole="header">
                {t('shell.modes.endlessTitle')}
              </Text>
            </View>
          </View>
          <Text style={styles.body}>
            {t('shell.modes.endlessBody')}
          </Text>
          <View style={styles.stats}>
            <Stat icon={<Trophy size={iconSizes.sm} color={colors.secondary} />} label={t('shell.modes.bestShift')} value={modes.endless.bestShift ? `${modes.endless.bestShift}` : '—'} />
            <Stat icon={<Flame size={iconSizes.sm} color={colors.primary} />} label={t('shell.modes.bestTons')} value={modes.endless.bestTons ? `${formatNumber(Math.round(modes.endless.bestTons))} t` : '—'} />
          </View>
          <Text style={styles.reward}>
            {t('shell.modes.endlessReward', { base: modeRewards.endlessCoinsBase, perShift: modeRewards.endlessCoinsPerShift })}
          </Text>
          <PrimaryButton
            label={t('shell.modes.startShift')}
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
