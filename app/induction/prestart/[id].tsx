/**
 * Pre-start inspection (P2H) — mark each checklist item OK or Defect,
 * then decide whether the truck may operate. Results are reviewed and saved.
 */

import { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Ban, CheckCircle2, ClipboardCheck, RotateCcw, Truck, XCircle } from 'lucide-react-native';
import { colors, iconSizes, layout, minTouchTarget, radius, shadows, spacing, typography } from '@/theme/tokens';
import {
  correctDecision,
  getPrestartScenario,
  scorePrestart,
  type PrestartArea,
  type PrestartDecision,
} from '@/game/induction/prestart';
import { useProgression } from '@/state/progressionStore';
import { PressableScale } from '@/components/PressableScale';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ScreenHeader } from '@/components/ScreenHeader';
import { playSfx } from '@/services/audio';
import { hapticSelection, hapticSuccess, hapticWarning } from '@/services/haptics';

const AREA_LABEL: Record<PrestartArea, string> = {
  walkaround: 'WALK-AROUND',
  cab: 'IN THE CAB',
  safety: 'SAFETY EQUIPMENT',
};

export default function PrestartScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const scenario = getPrestartScenario(String(id));
  const recordPrestartRun = useProgression((s) => s.recordPrestartRun);

  const [marks, setMarks] = useState<Record<string, boolean>>({});
  const [decision, setDecision] = useState<PrestartDecision | null>(null);
  const [submitted, setSubmitted] = useState(false);

  if (!scenario) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScreenHeader title="Inspection not found" />
      </SafeAreaView>
    );
  }

  const answered = scenario.items.filter((i) => marks[i.id] !== undefined).length;
  const result = scorePrestart(scenario, marks, decision);
  const ready = answered === scenario.items.length && decision !== null;

  const mark = (itemId: string, defect: boolean) => {
    if (submitted) return;
    hapticSelection();
    setMarks({ ...marks, [itemId]: defect });
  };

  const submit = () => {
    setSubmitted(true);
    recordPrestartRun(scenario.id, { correct: result.correctItems, total: result.total, passed: result.passed });
    if (result.passed) {
      playSfx('complete');
      hapticSuccess();
    } else {
      playSfx('fail');
      hapticWarning();
    }
  };

  const retry = () => {
    setMarks({});
    setDecision(null);
    setSubmitted(false);
  };

  const areas: PrestartArea[] = ['walkaround', 'cab', 'safety'];

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScreenHeader title="Pre-start check" subtitle={`${scenario.title} · ${answered}/${scenario.items.length} checked`} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.brief, shadows.soft]}>
          <Truck size={iconSizes.md} color={colors.primary} />
          <Text style={styles.briefText}>{scenario.brief}</Text>
        </View>

        {areas.map((area) => {
          const items = scenario.items.filter((i) => i.area === area);
          if (items.length === 0) return null;
          return (
            <View key={area} style={styles.section}>
              <Text style={styles.sectionLabel}>{AREA_LABEL[area]}</Text>
              {items.map((item) => {
                const value = marks[item.id];
                const right = submitted && value === item.defect;
                const wrong = submitted && value !== item.defect;
                return (
                  <View key={item.id} style={[styles.item, right && styles.itemRight, wrong && styles.itemWrong]}>
                    <Text style={styles.itemLabel}>
                      {item.label}
                      {submitted && item.critical ? <Text style={styles.critical}>  CRITICAL</Text> : null}
                    </Text>
                    <Text style={styles.observation}>{item.observation}</Text>
                    <View style={styles.choices}>
                      <Choice label="OK" active={value === false} tone="ok" onPress={() => mark(item.id, false)} disabled={submitted} />
                      <Choice label="DEFECT" active={value === true} tone="defect" onPress={() => mark(item.id, true)} disabled={submitted} />
                    </View>
                    {submitted ? (
                      <View style={styles.feedback}>
                        {right ? (
                          <CheckCircle2 size={iconSizes.sm} color={colors.success} />
                        ) : (
                          <XCircle size={iconSizes.sm} color={colors.danger} />
                        )}
                        <Text style={styles.feedbackText}>
                          {item.defect ? 'Defect. ' : 'OK. '}
                          {item.explanation}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </View>
          );
        })}

        <Text style={styles.sectionLabel}>YOUR DECISION</Text>
        <View style={styles.decisions}>
          <DecisionCard
            icon={<ClipboardCheck size={iconSizes.md} color={colors.success} />}
            title="Safe to operate"
            body="Sign the pre-start sheet and start the shift."
            active={decision === 'operate'}
            onPress={() => !submitted && setDecision('operate')}
          />
          <DecisionCard
            icon={<Ban size={iconSizes.md} color={colors.danger} />}
            title="Tag out & report"
            body="Do not operate. Tag the truck and call maintenance."
            active={decision === 'tag-out'}
            onPress={() => !submitted && setDecision('tag-out')}
          />
        </View>

        {submitted ? (
          <Animated.View entering={FadeInUp} style={[styles.result, result.passed ? styles.resultPass : styles.resultFail]}>
            <Text style={styles.resultTitle}>{result.passed ? 'Inspection passed' : 'Not yet — review and retry'}</Text>
            <Text style={styles.resultBody}>
              {result.correctItems}/{result.total} items correct
              {result.missedCritical > 0 ? ` · ${result.missedCritical} critical defect${result.missedCritical === 1 ? '' : 's'} missed` : ''}
              {' · '}
              The right call was {correctDecision(scenario) === 'tag-out' ? 'TAG OUT' : 'SAFE TO OPERATE'}.
            </Text>
          </Animated.View>
        ) : null}

        {submitted ? (
          <>
            <PrimaryButton label="TRY AGAIN" icon={<RotateCcw size={iconSizes.sm} color={colors.textOnDark} />} onPress={retry} />
            <PrimaryButton label="BACK TO INDUCTION" variant="outline" onPress={() => router.back()} />
          </>
        ) : (
          <PrimaryButton
            label={ready ? 'SUBMIT INSPECTION' : `CHECK ALL ITEMS (${answered}/${scenario.items.length})`}
            onPress={submit}
            disabled={!ready}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Choice({
  label,
  active,
  tone,
  onPress,
  disabled,
}: {
  label: string;
  active: boolean;
  tone: 'ok' | 'defect';
  onPress: () => void;
  disabled: boolean;
}) {
  const color = tone === 'ok' ? colors.success : colors.danger;
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="radio"
      accessibilityState={{ selected: active, disabled }}
      accessibilityLabel={label}
      style={[styles.choice, active && { backgroundColor: color, borderColor: color }]}
    >
      <Text style={[styles.choiceText, active && styles.choiceTextActive]}>{label}</Text>
    </PressableScale>
  );
}

function DecisionCard({
  icon,
  title,
  body,
  active,
  onPress,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected: active }}
      accessibilityLabel={title}
      style={[styles.decision, shadows.soft, active && styles.decisionActive]}
    >
      {icon}
      <Text style={styles.decisionTitle}>{title}</Text>
      <Text style={styles.decisionBody}>{body}</Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: layout.gutter, gap: spacing.md, paddingBottom: spacing.xxl },
  brief: { flexDirection: 'row', gap: spacing.md, alignItems: 'center', backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.md },
  briefText: { ...typography.body, color: colors.text, flex: 1 },
  section: { gap: spacing.sm },
  sectionLabel: { ...typography.caption, color: colors.textMuted, fontWeight: '800', letterSpacing: 1, marginTop: spacing.sm },
  item: { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.md, gap: spacing.sm, borderWidth: 2, borderColor: 'transparent' },
  itemRight: { borderColor: colors.success },
  itemWrong: { borderColor: colors.danger },
  itemLabel: { ...typography.label, color: colors.text },
  critical: { ...typography.caption, color: colors.danger, fontWeight: '800' },
  observation: { ...typography.body, color: colors.textMuted, lineHeight: 21 },
  choices: { flexDirection: 'row', gap: spacing.sm },
  choice: {
    flex: 1,
    minHeight: minTouchTarget,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  choiceText: { ...typography.label, color: colors.text },
  choiceTextActive: { color: colors.textOnDark },
  feedback: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  feedbackText: { ...typography.caption, color: colors.textMuted, flex: 1, lineHeight: 18 },
  decisions: { flexDirection: 'row', gap: spacing.sm },
  decision: { flex: 1, backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.md, gap: spacing.xs, borderWidth: 2, borderColor: 'transparent' },
  decisionActive: { borderColor: colors.primary },
  decisionTitle: { ...typography.label, color: colors.text },
  decisionBody: { ...typography.caption, color: colors.textMuted },
  result: { borderRadius: radius.lg, padding: spacing.md, gap: spacing.xs, borderLeftWidth: 4, backgroundColor: colors.card },
  resultPass: { borderLeftColor: colors.success },
  resultFail: { borderLeftColor: colors.warning },
  resultTitle: { ...typography.heading, color: colors.text },
  resultBody: { ...typography.caption, color: colors.textMuted, lineHeight: 18 },
});
