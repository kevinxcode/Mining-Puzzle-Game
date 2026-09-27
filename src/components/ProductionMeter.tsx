/**
 * MINING FLOW — production KPIs.
 * Real-time production, fuel, truck utilization and average queue —
 * simple and readable, no industrial dashboard overload.
 */

import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, shadows, spacing, typography } from '@/theme/tokens';
import { formatFuel, formatPercent, formatRate } from '@/utils/format';

interface ProductionMeterProps {
  tonsPerHour: number;
  fuelUsed: number;
  /** Truck utilization 0..1. */
  truckUtilization: number;
  avgQueueSeconds: number;
}

export function ProductionMeter({
  tonsPerHour,
  fuelUsed,
  truckUtilization,
  avgQueueSeconds,
}: ProductionMeterProps) {
  return (
    <View style={[styles.card, shadows.soft]}>
      <View style={styles.primaryRow}>
        <View>
          <Text style={styles.rate}>{formatRate(tonsPerHour)}</Text>
          <Text style={styles.rateLabel}>Production</Text>
        </View>
        <View style={styles.kpiRow}>
          <View style={styles.kpi}>
            <Text style={styles.kpiValue}>{formatFuel(fuelUsed)}</Text>
            <Text style={styles.kpiLabel}>Fuel used</Text>
          </View>
          <View style={styles.kpi}>
            <Text style={styles.kpiValue}>{formatPercent(truckUtilization)}</Text>
            <Text style={styles.kpiLabel}>Utilization</Text>
          </View>
          <View style={styles.kpi}>
            <Text style={styles.kpiValue}>{Math.round(avgQueueSeconds)}s</Text>
            <Text style={styles.kpiLabel}>Avg queue</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  primaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rate: { ...typography.title, color: colors.primary },
  rateLabel: { ...typography.caption, color: colors.textMuted },
  kpiRow: { flexDirection: 'row', gap: spacing.lg },
  kpi: { alignItems: 'flex-end', gap: 2 },
  kpiValue: { ...typography.heading, color: colors.text },
  kpiLabel: { ...typography.tiny, color: colors.textMuted },
});