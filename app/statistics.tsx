/**
 * Statistics — career totals as icon tiles.
 */

import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Activity,
  CheckCircle2,
  Clock,
  Flag,
  Fuel,
  Gauge,
  Repeat,
  Star,
  Timer,
  Weight,
} from 'lucide-react-native';
import { colors, iconSizes, layout, spacing } from '@/theme/tokens';
import { useProgression } from '@/state/progressionStore';
import { formatClock, formatFuel, formatNumber, formatRate, formatTons } from '@/utils/format';
import { FadeInView } from '@/components/FadeInView';
import { ScreenHeader } from '@/components/ScreenHeader';
import { StatCard } from '@/components/StatCard';
import { useT } from '@/i18n';

export default function StatisticsScreen() {
  const { t } = useT();
  const stats = useProgression((s) => s.statistics);
  const levelRecords = useProgression((s) => s.levels);

  const bestTime = Math.min(
    ...Object.values(levelRecords)
      .map((r) => r.bestTimeSeconds)
      .concat([Number.POSITIVE_INFINITY]),
  );
  const bestTimeDisplay = Number.isFinite(bestTime) ? formatClock(bestTime) : '—';
  const s = iconSizes.sm;

  const rows = [
    [
      { label: t('shell.stats.tons'), value: formatTons(stats.totalTonsMoved), accent: colors.primary, icon: <Weight size={s} color={colors.primary} /> },
      { label: t('shell.stats.trips'), value: formatNumber(stats.totalTrips), accent: colors.warning, icon: <Repeat size={s} color={colors.warning} /> },
    ],
    [
      { label: t('shell.stats.bestRate'), value: formatRate(stats.bestProductionRate), accent: colors.info, icon: <Activity size={s} color={colors.info} /> },
      { label: t('shell.stats.efficiency'), value: `${Math.round(stats.averageEfficiency)}%`, accent: colors.success, icon: <Gauge size={s} color={colors.success} /> },
    ],
    [
      { label: t('shell.stats.levels'), value: `${stats.levelsCompleted}`, accent: colors.primary, icon: <CheckCircle2 size={s} color={colors.primary} /> },
      { label: t('shell.stats.threeStar'), value: `${stats.threeStarLevels}`, accent: colors.warning, icon: <Star size={s} color={colors.secondary} fill={colors.secondary} /> },
    ],
    [
      { label: t('shell.stats.bestTime'), value: bestTimeDisplay, accent: colors.info, icon: <Timer size={s} color={colors.info} /> },
      { label: t('shell.stats.fuel'), value: formatFuel(stats.totalFuelUsed), accent: colors.danger, icon: <Fuel size={s} color={colors.danger} /> },
    ],
    [
      { label: t('shell.stats.playtime'), value: formatClock(stats.totalPlaytimeSeconds), accent: colors.success, icon: <Clock size={s} color={colors.success} /> },
      { label: t('shell.stats.attempts'), value: `${stats.attempts}`, accent: colors.text, icon: <Flag size={s} color={colors.text} /> },
    ],
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title={t('shell.stats.title')} subtitle={t('shell.stats.subtitle')} />
      <ScrollView contentContainerStyle={styles.content}>
        {rows.map((row, i) => (
          <FadeInView key={i} index={i} style={styles.row}>
            {row.map((c) => (
              <StatCard key={c.label} label={c.label} value={c.value} accent={c.accent} icon={c.icon} />
            ))}
          </FadeInView>
        ))}
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
  row: { flexDirection: 'row', gap: spacing.md },
});
