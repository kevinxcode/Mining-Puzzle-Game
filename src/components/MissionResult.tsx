/**
 * MINING FLOW — mission result overlay.
 * Satisfying success screen with animated stars and rewards, plus an
 * encouraging failure screen with useful feedback.
 */

import { useEffect, useRef } from 'react';
import { Animated, Modal, StyleSheet, Text, View } from 'react-native';
import { animation, colors, radius, shadows, spacing, typography } from '@/theme/tokens';
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
  const starAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible && success) {
      starAnim.setValue(0);
      Animated.timing(starAnim, {
        toValue: 1,
        duration: animation.starPop,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, success, starAnim]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={success ? onHome : onReplay}>
      <View style={styles.backdrop}>
        <View style={[styles.card, shadows.raised]}>
          <Text style={[styles.title, success ? styles.titleSuccess : styles.titleFail]}>
            {success ? 'MISSION COMPLETE' : 'TARGET MISSED'}
          </Text>

          {success ? (
            <Animated.View style={{ transform: [{ scale: starAnim }] }}>
              <StarRating count={stars} size={30} />
            </Animated.View>
          ) : null}

          <View style={styles.grid}>
            <ResultItem label="Production" value={`${formatTons(tonsMoved)} / ${formatTons(targetTons)}`} />
            <ResultItem label="Time" value={formatClock(elapsedSeconds)} />
            <ResultItem label="Efficiency" value={`${efficiency}%`} />
            <ResultItem label="Fuel" value={formatFuel(fuelUsed)} />
            <ResultItem label="Queue" value={`${Math.round(maxQueueSeconds)}s`} />
          </View>

          {success ? (
            <Text style={styles.rewards}>
              {xpGain > 0 || coinsGain > 0
                ? `+${xpGain} XP · +${coinsGain} Coins`
                : 'Rewards already collected — earn more stars for a bonus'}
            </Text>
          ) : (
            <View style={styles.failureBlock}>
              <Text style={styles.issue}>Main issue: {issue}</Text>
              <Text style={styles.tip}>TIP: {tip}</Text>
            </View>
          )}

          {success ? (
            <View style={styles.buttons}>
              <PrimaryButton label="NEXT LEVEL" onPress={onNext} />
              <View style={styles.row}>
                <PrimaryButton label="REPLAY" variant="secondary" onPress={onReplay} style={styles.halfButton} />
                <PrimaryButton label="HOME" variant="ghost" onPress={onHome} style={styles.halfButton} />
              </View>
            </View>
          ) : (
            <View style={styles.buttons}>
              <PrimaryButton label="RETRY" onPress={onReplay} />
              <PrimaryButton label="CHANGE STRATEGY" variant="secondary" onPress={onChangeStrategy} />
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

function ResultItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.item}>
      <Text style={styles.itemValue}>{value}</Text>
      <Text style={styles.itemLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 17, 20, 0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: spacing.xl,
    gap: spacing.md,
    alignItems: 'center',
  },
  title: { ...typography.title, textAlign: 'center' },
  titleSuccess: { color: colors.success },
  titleFail: { color: colors.danger },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.md },
  item: { alignItems: 'center', gap: 2, minWidth: 96 },
  itemValue: { ...typography.heading, color: colors.text },
  itemLabel: { ...typography.tiny, color: colors.textMuted },
  rewards: { ...typography.heading, color: colors.primary },
  failureBlock: { gap: spacing.xs, alignItems: 'center' },
  issue: { ...typography.body, color: colors.text, textAlign: 'center' },
  tip: { ...typography.caption, color: colors.textMuted, textAlign: 'center' },
  buttons: { width: '100%', gap: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.sm },
  halfButton: { flex: 1 },
});