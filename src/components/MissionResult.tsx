/**
 * Mission result — bottom-sheet style card with a status badge (color + icon),
 * springy star reveal, KPI tiles, reward chips and clear next actions.
 * Failure is encouraging and gives one clear issue + tip.
 */

import type { ReactNode } from 'react';
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, SlideInDown, ZoomIn } from 'react-native-reanimated';
import {
  CheckCircle2,
  Clock,
  Coins,
  Fuel,
  Gauge,
  Home,
  Hourglass,
  Lightbulb,
  RotateCcw,
  SkipForward,
  Sparkles,
  Target,
  TriangleAlert,
} from 'lucide-react-native';
import { animation, colors, iconSizes, layout, radius, shadows, spacing, typography } from '@/theme/tokens';
import { formatClock, formatFuel, formatTons } from '@/utils/format';
import { PrimaryButton } from './PrimaryButton';
import { StarRating } from './StarRating';

interface MissionResultProps {
  visible: boolean;
  success: boolean;
  stars: number;
  tonsMoved: number;
  targetTons: number;
  elapsedSeconds: number;
  efficiency: number;
  fuelUsed: number;
  maxQueueSeconds: number;
  xpGain: number;
  coinsGain: number;
  issue?: string;
  tip?: string;
  onNext: () => void;
  onReplay: () => void;
  onHome: () => void;
  onChangeStrategy: () => void;
}

export function MissionResult({
  visible,
  success,
  stars,
  tonsMoved,
  targetTons,
  elapsedSeconds,
  efficiency,
  fuelUsed,
  maxQueueSeconds,
  xpGain,
  coinsGain,
  issue,
  tip,
  onNext,
  onReplay,
  onHome,
  onChangeStrategy,
}: MissionResultProps) {
  const statusColor = success ? colors.success : colors.warning;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={success ? onHome : onReplay}>
      <View style={styles.backdrop}>
        {visible ? (
          <Animated.View entering={SlideInDown.duration(animation.slow)} style={[styles.sheet, shadows.raised]}>
            <ScrollView contentContainerStyle={styles.content} bounces={false}>
              <View style={styles.handle} />
              <View style={[styles.badge, { backgroundColor: success ? colors.successSoft : colors.secondarySoft }]}>
                {success ? (
                  <CheckCircle2 size={iconSizes.lg} color={statusColor} />
                ) : (
                  <TriangleAlert size={iconSizes.lg} color={statusColor} />
                )}
              </View>
              <Text style={[styles.title, { color: statusColor }]} accessibilityRole="header">
                {success ? 'MISSION COMPLETE' : 'TARGET MISSED'}
              </Text>
              {!success ? <Text style={styles.subtitle}>So close — a small change can make the difference.</Text> : null}

              {success ? (
                <Animated.View entering={ZoomIn.delay(animation.normal).springify()}>
                  <StarRating count={stars} size={iconSizes.xl} />
                </Animated.View>
              ) : null}

              <View style={styles.grid}>
                <Tile icon={<Target size={iconSizes.xs} color={colors.primary} />} label="Production" value={`${formatTons(tonsMoved)} / ${formatTons(targetTons)}`} wide />
                <Tile icon={<Clock size={iconSizes.xs} color={colors.info} />} label="Time" value={formatClock(elapsedSeconds)} />
                <Tile icon={<Gauge size={iconSizes.xs} color={colors.success} />} label="Efficiency" value={`${efficiency}%`} />
                <Tile icon={<Fuel size={iconSizes.xs} color={colors.info} />} label="Fuel" value={formatFuel(fuelUsed)} />
                <Tile icon={<Hourglass size={iconSizes.xs} color={colors.warning} />} label="Max queue" value={`${Math.round(maxQueueSeconds)}s`} />
              </View>

              {success ? (
                xpGain > 0 || coinsGain > 0 ? (
                  <Animated.View entering={FadeIn.delay(animation.starPop)} style={styles.rewards}>
                    <View style={styles.rewardChip}>
                      <Sparkles size={iconSizes.sm} color={colors.primary} />
                      <Text style={styles.rewardText}>+{xpGain} XP</Text>
                    </View>
                    <View style={styles.rewardChip}>
                      <Coins size={iconSizes.sm} color={colors.primary} />
                      <Text style={styles.rewardText}>+{coinsGain}</Text>
                    </View>
                  </Animated.View>
                ) : (
                  <Text style={styles.subtitle}>Rewards already collected — earn more stars for a bonus.</Text>
                )
              ) : (
                <View style={styles.failureBlock}>
                  <Text style={styles.issueLabel}>MAIN ISSUE</Text>
                  <Text style={styles.issue}>{issue}</Text>
                  <View style={styles.tipRow}>
                    <Lightbulb size={iconSizes.sm} color={colors.warning} />
                    <Text style={styles.tip}>{tip}</Text>
                  </View>
                </View>
              )}

              {success ? (
                <View style={styles.buttons}>
                  <PrimaryButton label="NEXT LEVEL" icon={<SkipForward size={iconSizes.sm} color={colors.textOnDark} />} onPress={onNext} />
                  <View style={styles.row}>
                    <PrimaryButton label="REPLAY" variant="outline" icon={<RotateCcw size={iconSizes.sm} color={colors.text} />} onPress={onReplay} style={styles.halfButton} />
                    <PrimaryButton label="HOME" variant="ghost" icon={<Home size={iconSizes.sm} color={colors.textOnDark} />} onPress={onHome} style={styles.halfButton} />
                  </View>
                </View>
              ) : (
                <View style={styles.buttons}>
                  <PrimaryButton label="RETRY" icon={<RotateCcw size={iconSizes.sm} color={colors.textOnDark} />} onPress={onReplay} />
                  <View style={styles.row}>
                    <PrimaryButton label="STRATEGY" accessibilityLabel="Change strategy" variant="secondary" onPress={onChangeStrategy} style={styles.halfButton} />
                    <PrimaryButton label="HOME" variant="ghost" icon={<Home size={iconSizes.sm} color={colors.textOnDark} />} onPress={onHome} style={styles.halfButton} />
                  </View>
                </View>
              )}
            </ScrollView>
          </Animated.View>
        ) : null}
      </View>
    </Modal>
  );
}

function Tile({ icon, label, value, wide }: { icon: ReactNode; label: string; value: string; wide?: boolean }) {
  return (
    <View style={[styles.tile, wide && styles.tileWide]} accessible accessibilityLabel={`${label}: ${value}`}>
      <View style={styles.tileTop}>
        {icon}
        <Text style={styles.tileLabel}>{label}</Text>
      </View>
      <Text style={styles.tileValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.backdrop,
    justifyContent: 'flex-end',
  },
  sheet: {
    width: '100%',
    maxWidth: layout.maxContentWidth,
    maxHeight: '92%',
    alignSelf: 'center',
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
  },
  content: { padding: spacing.xl, paddingTop: spacing.md, gap: spacing.md, alignItems: 'center' },
  handle: { width: spacing.xxl, height: spacing.xs, borderRadius: radius.pill, backgroundColor: colors.border },
  badge: { width: 56, height: 56, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  title: { ...typography.title, textAlign: 'center' },
  subtitle: { ...typography.caption, color: colors.textMuted, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, width: '100%' },
  tile: {
    flexGrow: 1,
    flexBasis: '45%',
    backgroundColor: colors.background,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: 2,
  },
  tileWide: { flexBasis: '100%' },
  tileTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  tileLabel: { ...typography.tiny, color: colors.textMuted },
  tileValue: { ...typography.heading, color: colors.text },
  rewards: { flexDirection: 'row', gap: spacing.sm },
  rewardChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
  },
  rewardText: { ...typography.heading, color: colors.primaryDark },
  failureBlock: {
    width: '100%',
    gap: spacing.xs,
    backgroundColor: colors.secondarySoft,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  issueLabel: { ...typography.tiny, color: colors.warning },
  issue: { ...typography.body, fontWeight: '700', color: colors.text },
  tipRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start', marginTop: spacing.xs },
  tip: { ...typography.body, color: colors.text, flex: 1 },
  buttons: { width: '100%', gap: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.sm },
  halfButton: { flex: 1, paddingHorizontal: spacing.md },
});
