/**
 * MINING FLOW — player XP progress bar.
 */

import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '@/theme/tokens';
import { formatNumber } from '@/utils/format';

interface XPBarProps {
  level: number;
  xp: number;
  /** Cumulative XP at the start of the current level. */
  currentLevelXp: number;
  /** Cumulative XP needed for the next level. */
  nextLevelXp: number;
}

export function XPBar({ level, xp, currentLevelXp, nextLevelXp }: XPBarProps) {
  const span = Math.max(1, nextLevelXp - currentLevelXp);
  const progress = Math.max(0, Math.min(1, (xp - currentLevelXp) / span));
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={styles.level}>LV {level}</Text>
        <Text style={styles.xp}>
          {formatNumber(xp - currentLevelXp)} / {formatNumber(span)} XP
        </Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${Math.round(progress * 100)}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xs },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  level: { ...typography.label, color: colors.textOnDark },
  xp: { ...typography.caption, color: colors.textOnDarkMuted },
  track: {
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceElevated,
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: radius.pill, backgroundColor: colors.primary },
});