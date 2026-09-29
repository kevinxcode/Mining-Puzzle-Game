/**
 * Site Induction — one module: swipeable concept cards → quick check → practice.
 */

import { useRef, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { CheckCircle2, Gamepad2, Lightbulb, RotateCcw, XCircle } from 'lucide-react-native';
import { colors, iconSizes, layout, minTouchTarget, radius, shadows, spacing, typography } from '@/theme/tokens';
import { useActivePack } from '@/state/contentStore';
import { isAnswerCorrect, scoreQuiz, type QuizScore } from '@/game/induction/quiz';
import { getLevelById } from '@/game/levels/levelFactory';
import { useProgression } from '@/state/progressionStore';
import { InductionArt } from '@/components/InductionArt';
import { PressableScale } from '@/components/PressableScale';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ScreenHeader } from '@/components/ScreenHeader';
import { playSfx } from '@/services/audio';
import { hapticSelection, hapticSuccess, hapticWarning } from '@/services/haptics';
import { useT } from '@/i18n';

type Phase = 'learn' | 'quiz' | 'result';

export default function InductionModuleScreen() {
  const router = useRouter();
  const { t, tx } = useT();
  const params = useLocalSearchParams<{ id: string }>();
  const pack = useActivePack();
  const module = pack.modules.find((m) => m.id === String(params.id));
  const recordInductionQuiz = useProgression((s) => s.recordInductionQuiz);
  const { width } = useWindowDimensions();
  const pageWidth = Math.min(width, layout.maxContentWidth);

  const [phase, setPhase] = useState<Phase>('learn');
  const [cardIndex, setCardIndex] = useState(0);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [score, setScore] = useState<QuizScore | null>(null);
  const pager = useRef<ScrollView>(null);

  if (!module) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScreenHeader title={t('induction.module.notFound')} />
      </SafeAreaView>
    );
  }

  const practiceLevel = getLevelById(module.practiceLevelId);
  const lastCard = cardIndex >= module.cards.length - 1;
  const question = module.questions[questionIndex];
  const chosen = question ? answers[question.id] : undefined;
  const answered = chosen !== undefined;

  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(e.nativeEvent.contentOffset.x / pageWidth);
    if (next !== cardIndex) {
      setCardIndex(next);
      hapticSelection();
    }
  };

  const goToCard = (index: number) => {
    pager.current?.scrollTo({ x: index * pageWidth, animated: true });
    setCardIndex(index);
  };

  const choose = (optionId: string) => {
    if (answered || !question) return;
    setAnswers({ ...answers, [question.id]: optionId });
    if (isAnswerCorrect(question, optionId)) {
      playSfx('star');
      hapticSuccess();
    } else {
      hapticWarning();
    }
  };

  const nextQuestion = () => {
    if (questionIndex < module.questions.length - 1) {
      setQuestionIndex(questionIndex + 1);
      return;
    }
    const result = scoreQuiz(module.questions, answers);
    recordInductionQuiz(module.id, result, pack.modules.map((m) => m.id), pack.version);
    setScore(result);
    setPhase('result');
    playSfx(result.passed ? 'complete' : 'fail');
  };

  const retake = () => {
    setAnswers({});
    setQuestionIndex(0);
    setScore(null);
    setPhase('quiz');
  };

  const subtitle =
    phase === 'learn'
      ? t('induction.module.card', { n: cardIndex + 1, total: module.cards.length })
      : phase === 'quiz'
        ? t('induction.module.question', { n: questionIndex + 1, total: module.questions.length })
        : t('induction.module.checkComplete');

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title={`${module.number}. ${module.title}`} subtitle={subtitle} />

      {phase === 'learn' ? (
        <View style={styles.flex}>
          <ScrollView
            ref={pager}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={onScrollEnd}
            style={[styles.flex, styles.pager, { width: pageWidth }]}
          >
            {module.cards.map((card) => (
              <ScrollView key={card.id} style={{ width: pageWidth }} contentContainerStyle={styles.page}>
                <View style={[styles.card, shadows.soft]}>
                  <InductionArt art={card.art} />
                  <Text style={styles.cardTitle} accessibilityRole="header">
                    {card.title}
                  </Text>
                  <Text style={styles.cardBody}>{card.body}</Text>
                  {card.keyPoint ? (
                    <View style={styles.keyPoint}>
                      <Lightbulb size={iconSizes.sm} color={colors.warning} />
                      <Text style={styles.keyPointText}>{card.keyPoint}</Text>
                    </View>
                  ) : null}
                </View>
              </ScrollView>
            ))}
          </ScrollView>
          <View style={styles.dots} accessibilityLabel={t('induction.module.card', { n: cardIndex + 1, total: module.cards.length })}>
            {module.cards.map((card, i) => (
              <View key={card.id} style={[styles.dot, i === cardIndex && styles.dotActive]} />
            ))}
          </View>
          <View style={styles.footer}>
            {cardIndex > 0 ? (
              <PrimaryButton label={t('induction.back')} variant="outline" onPress={() => goToCard(cardIndex - 1)} style={styles.half} />
            ) : null}
            <PrimaryButton
              label={lastCard ? t('induction.startCheck') : t('induction.next')}
              onPress={() => (lastCard ? setPhase('quiz') : goToCard(cardIndex + 1))}
              style={styles.half}
            />
          </View>
        </View>
      ) : null}

      {phase === 'quiz' && question ? (
        <View style={styles.flex}>
          <ScrollView contentContainerStyle={styles.quizContent}>
            <Animated.View key={question.id} entering={FadeInDown} style={styles.quizInner}>
              <Text style={styles.quizLabel}>{t('induction.quickCheck')}</Text>
              <Text style={styles.prompt} accessibilityRole="header">
                {question.prompt}
              </Text>
              {question.options.map((option) => {
                const isChosen = chosen === option.id;
                const showCorrect = answered && option.correct;
                const showWrong = answered && isChosen && !option.correct;
                return (
                  <PressableScale
                    key={option.id}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: isChosen, disabled: answered }}
                    accessibilityLabel={
                      showCorrect
                        ? t('induction.option.correct', { text: option.text })
                        : showWrong
                          ? t('induction.option.wrong', { text: option.text })
                          : option.text
                    }
                    disabled={answered}
                    onPress={() => choose(option.id)}
                    style={[
                      styles.option,
                      showCorrect && styles.optionCorrect,
                      showWrong && styles.optionWrong,
                      answered && !showCorrect && !showWrong && styles.optionDim,
                    ]}
                  >
                    <Text style={styles.optionText}>{option.text}</Text>
                    {showCorrect ? <CheckCircle2 size={iconSizes.md} color={colors.success} /> : null}
                    {showWrong ? <XCircle size={iconSizes.md} color={colors.danger} /> : null}
                  </PressableScale>
                );
              })}
              {answered ? (
                <Animated.View
                  entering={FadeIn}
                  style={[styles.feedback, isAnswerCorrect(question, chosen) ? styles.feedbackGood : styles.feedbackBad]}
                  accessibilityLiveRegion="polite"
                >
                  <Text style={styles.feedbackTitle}>
                    {isAnswerCorrect(question, chosen) ? t('induction.feedback.correct') : t('induction.feedback.wrong')}
                  </Text>
                  <Text style={styles.feedbackText}>{question.explanation}</Text>
                </Animated.View>
              ) : null}
            </Animated.View>
          </ScrollView>
          <View style={styles.footer}>
            <PrimaryButton
              label={questionIndex < module.questions.length - 1 ? t('induction.nextQuestion') : t('induction.seeResult')}
              onPress={nextQuestion}
              disabled={!answered}
              style={styles.half}
            />
          </View>
        </View>
      ) : null}

      {phase === 'result' && score ? (
        <ScrollView contentContainerStyle={styles.quizContent}>
          <Animated.View entering={FadeInDown} style={[styles.resultCard, shadows.raised]}>
            {score.passed ? (
              <CheckCircle2 size={iconSizes.xl * 1.5} color={colors.success} />
            ) : (
              <RotateCcw size={iconSizes.xl * 1.5} color={colors.warning} />
            )}
            <Text style={[styles.resultTitle, { color: score.passed ? colors.success : colors.warning }]}>
              {score.passed ? t('induction.result.passed') : t('induction.result.almost')}
            </Text>
            <Text style={styles.resultScore}>
              {t('induction.result.score', { correct: score.correct, total: score.total })}
            </Text>
            <Text style={styles.resultText}>
              {score.passed
                ? t('induction.result.passedBody')
                : t('induction.result.failedBody')}
            </Text>
          </Animated.View>

          {practiceLevel ? (
            <View style={[styles.practiceCard, shadows.soft]}>
              <Text style={styles.quizLabel}>{t('induction.practice')}</Text>
              <Text style={styles.practiceTitle}>
                {t('induction.practice.level', { id: practiceLevel.id, name: tx(practiceLevel.name) })}
              </Text>
              <Text style={styles.practiceNote}>{module.practiceNote}</Text>
              <PrimaryButton
                label={t('induction.practice')}
                icon={<Gamepad2 size={iconSizes.sm} color={colors.textOnDark} />}
                onPress={() => router.push(`/level/${practiceLevel.id}`)}
              />
            </View>
          ) : null}

          <View style={styles.resultButtons}>
            {!score.passed ? <PrimaryButton label={t('induction.retakeCheck')} variant="secondary" onPress={retake} /> : null}
            <PrimaryButton
              label={t('induction.reviewCards')}
              variant="outline"
              onPress={() => {
                setCardIndex(0);
                setPhase('learn');
              }}
            />
            <PrimaryButton label={t('induction.allModules')} variant="ghost" onPress={() => router.back()} />
          </View>
        </ScrollView>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  pager: { alignSelf: 'center' },
  page: { padding: spacing.lg, paddingBottom: spacing.md },
  card: { backgroundColor: colors.card, borderRadius: radius.xl, padding: spacing.lg, gap: spacing.md },
  cardTitle: { ...typography.title, color: colors.text },
  cardBody: { ...typography.bodyLarge, color: colors.text },
  keyPoint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.secondarySoft,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  keyPointText: { ...typography.body, color: colors.text, flex: 1, fontWeight: '700' },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
  dot: { width: spacing.sm, height: spacing.sm, borderRadius: radius.pill, backgroundColor: colors.border },
  dotActive: { width: spacing.xl, backgroundColor: colors.primary },
  footer: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    paddingTop: spacing.xs,
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
  },
  half: { flex: 1 },
  quizContent: {
    padding: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing.xxl,
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
  },
  quizInner: { gap: spacing.md },
  quizLabel: { ...typography.label, color: colors.primary },
  prompt: { ...typography.title, color: colors.text },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.border,
    padding: spacing.lg,
    minHeight: minTouchTarget + spacing.md,
  },
  optionCorrect: { borderColor: colors.success, backgroundColor: colors.successSoft },
  optionWrong: { borderColor: colors.danger, backgroundColor: colors.dangerSoft },
  optionDim: { opacity: 0.55 },
  optionText: { ...typography.bodyLarge, color: colors.text, flex: 1 },
  feedback: { borderRadius: radius.lg, padding: spacing.md, gap: spacing.xs },
  feedbackGood: { backgroundColor: colors.successSoft },
  feedbackBad: { backgroundColor: colors.secondarySoft },
  feedbackTitle: { ...typography.heading, color: colors.text },
  feedbackText: { ...typography.body, color: colors.text },
  resultCard: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  resultTitle: { ...typography.title },
  resultScore: { ...typography.heading, color: colors.text },
  resultText: { ...typography.body, color: colors.textMuted, textAlign: 'center' },
  practiceCard: { backgroundColor: colors.card, borderRadius: radius.xl, padding: spacing.lg, gap: spacing.sm },
  practiceTitle: { ...typography.heading, color: colors.text },
  practiceNote: { ...typography.body, color: colors.textMuted },
  resultButtons: { gap: spacing.sm },
});
