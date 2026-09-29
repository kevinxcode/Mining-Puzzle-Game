/**
 * MINING FLOW — contextual tutorial coachmark.
 * Short interactive steps — never long instruction screens.
 */

import { Modal, StyleSheet, Text, View } from 'react-native';
import { colors, radius, shadows, spacing, typography } from '@/theme/tokens';
import { PrimaryButton } from './PrimaryButton';
import { useT } from '@/i18n';

interface TutorialCoachmarkProps {
  visible: boolean;
  steps: string[];
  stepIndex: number;
  onNext: () => void;
  onSkip: () => void;
}

export function TutorialCoachmark({
  visible,
  steps,
  stepIndex,
  onNext,
  onSkip,
}: TutorialCoachmarkProps) {
  const { t, tx } = useT();
  if (!visible || steps.length === 0) return null;
  const text = steps[Math.min(stepIndex, steps.length - 1)];
  const last = stepIndex >= steps.length - 1;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onSkip}>
      <View style={styles.backdrop}>
        <View style={[styles.card, shadows.raised]}>
          <Text style={styles.stepLabel}>
            {t('game.tutorial.step', { step: stepIndex + 1, total: steps.length })}
          </Text>
          <Text style={styles.text}>{tx(text)}</Text>
          <View style={styles.row}>
            <PrimaryButton label={last ? t('game.tutorial.gotIt') : t('game.tutorial.next')} onPress={onNext} style={styles.button} />
            <PrimaryButton label={t('game.tutorial.skip')} variant="ghost" onPress={onSkip} style={styles.button} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 17, 20, 0.6)',
    alignItems: 'center',
    justifyContent: 'flex-end',
    padding: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  stepLabel: { ...typography.label, color: colors.primary },
  text: { ...typography.body, color: colors.text },
  row: { flexDirection: 'row', gap: spacing.sm },
  button: { flex: 1 },
});