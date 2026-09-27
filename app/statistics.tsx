/**
 * MINING FLOW — statistics screen.
 * Career totals with simple progress visuals.
 */

import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { colors, spacing, typography } from '@/theme/tokens';
import { useProgression } from '@/state/progressionStore';
import { formatClock, formatFuel, formatNumber, formatRate, formatTons } from '@/utils/format';
import { IconButton } from '@/components/IconButton';
import { StatCard } from '@/components/StatCard';

export default function StatisticsScreen() {
  const router = useRouter();
  const stats = useProgression((s) => s.statistics);
  const levelRecords = useProgression((s) => s.levels);

  const bestTime = levelRecords
    ? Math.min(
        ...Object.values(levelRecords)
          .map((r) => r.bestTimeSeconds)
          .concat([Number.POSITIVE_INFINITY]),
      )
    : null;
  const bestTimeDisplay = bestTime !== null && Number.isFinite(bestTime) ? formatClock(bestTime) : '—';

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <IconButton
          icon={<ChevronLeft size={20} color={colors.textOnDark} />}
          accessibilityLabel="Back"
          onPress={() => router.back()}
        />
        <Text style={styles.title}>Statistics</Text>
        <View style={styles.headerSpacer} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.row}>
          <StatCard label="Total tons moved" value={formatTons(stats.totalTonsMoved)} />
          <StatCard label="Total trips" value={formatNumber(stats.totalTrips)} accent={colors.secondary} />
        </View>
        <View style={styles.row}>
          <StatCard label="Best production rate" value={formatRate(stats.bestProductionRate)} accent={colors.info} />
          <StatCard label="Avg efficiency" value={`${Math.round(stats.averageEfficiency)}%`} accent={colors.success} />
        </View>
        <View style={styles.row}>
          <StatCard label="Levels completed" value={`${stats.levelsCompleted}`} />
          <StatCard label="3-star levels" value={`${stats.threeStarLevels}`} accent={colors.secondary} />
        </View>
        <View style={styles.row}>
          <StatCard label="Best completion" value={bestTimeDisplay} accent={colors.info} />
          <StatCard label="Total fuel used" value={formatFuel(stats.totalFuelUsed)} accent={colors.danger} />
        </View>
        <View style={styles.row}>
          <StatCard label="Total playtime" value={formatClock(stats.totalPlaytimeSeconds)} accent={colors.success} />
          <StatCard label="Missions attempted" value={`${stats.attempts}`} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  headerSpacer: { width: 44 },
  title: { ...typography.title, color: colors.text },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  row: { flexDirection: 'row', gap: spacing.md },
});