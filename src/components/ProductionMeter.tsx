/**
 * Production KPIs — headline rate plus three compact tiles.
 * Status uses color AND icon (queue/utilization turn amber with an alert glyph).
 */

import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Activity, AlertTriangle, Fuel, Gauge, Hourglass } from 'lucide-react-native';
import { colors, iconSizes, radius, shadows, spacing, typography } from '@/theme/tokens';
import { formatFuel, formatPercent, formatRate } from '@/utils/format';

interface ProductionMeterProps {
  tonsPerHour: number;
  fuelUsed: number;
  /** Truck utilization 0..1. */
  truckUtilization: number;
  avgQueueSeconds: number;
}

/** UI thresholds for amber status (display only; not gameplay balance). */
const QUEUE_WARN_SECONDS = 10;
const UTIL_WARN = 0.6;

export function ProductionMeter({ tonsPerHour, fuelUsed, truckUtilization, avgQueueSeconds }: ProductionMeterProps) {
  const queueWarn = avgQueueSeconds >= QUEUE_WARN_SECONDS;
  const utilWarn = tonsPerHour > 0 && truckUtilization < UTIL_WARN;
  return (
    <View style={[styles.card, shadows.soft]}>
      <View style={styles.rateBlock} accessible accessibilityLabel={`Production ${formatRate(tonsPerHour)}`}>
        <View style={styles.rateLabelRow}>
          <Activity size={iconSizes.xs} color={colors.primary} />
          <Text style={styles.rateLabel}>PRODUCTION</Text>
        </View>
        <Text style={styles.rate} numberOfLines={1} adjustsFontSizeToFit>
          {formatRate(tonsPerHour)}
        </Text>
      </View>
      <View style={styles.kpiRow}>
        <Kpi icon={<Fuel size={iconSizes.xs} color={colors.info} />} value={formatFuel(fuelUsed)} label="Fuel" />
        <Kpi
          icon={utilWarn ? <AlertTriangle size={iconSizes.xs} color={colors.warning} /> : <Gauge size={iconSizes.xs} color={colors.success} />}
          value={formatPercent(truckUtilization)}
          label="Util."
          warn={utilWarn}
        />
        <Kpi
          icon={queueWarn ? <AlertTriangle size={iconSizes.xs} color={colors.warning} /> : <Hourglass size={iconSizes.xs} color={colors.textMuted} />}
          value={`${Math.round(avgQueueSeconds)}s`}
          label="Queue"
          warn={queueWarn}
        />
      </View>
    </View>
  );
}

function Kpi({ icon, value, label, warn }: { icon: ReactNode; value: string; label: string; warn?: boolean }) {
  return (
    <View style={[styles.kpi, warn && styles.kpiWarn]} accessible accessibilityLabel={`${label} ${value}${warn ? ', needs attention' : ''}`}>
      <View style={styles.kpiTop}>
        {icon}
        <Text style={styles.kpiLabel}>{label}</Text>
      </View>
      <Text style={styles.kpiValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.sm + 2,
  },
  rateBlock: { flex: 1.1, gap: 2, paddingLeft: spacing.xs },
  rateLabelRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  rateLabel: { ...typography.tiny, color: colors.textMuted },
  rate: { ...typography.title, color: colors.primary },
  kpiRow: { flex: 2, flexDirection: 'row', gap: spacing.xs },
  kpi: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: radius.md,
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: spacing.xs + 2,
    gap: 2,
  },
  kpiWarn: { backgroundColor: colors.secondarySoft },
  kpiTop: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  kpiLabel: { ...typography.tiny, color: colors.textMuted },
  kpiValue: { ...typography.body, fontWeight: '800', color: colors.text },
});
