/**
 * Hazard spotting — tap every hazard in the scene. Each find explains the risk;
 * at the end missed hazards are revealed and the result is saved.
 */

import { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInUp } from 'react-native-reanimated';
import Svg, { Circle, G } from 'react-native-svg';
import { CheckCircle2, RotateCcw, ShieldAlert, XCircle } from 'lucide-react-native';
import { colors, iconSizes, layout, radius, shadows, spacing, typography } from '@/theme/tokens';
import {
  HAZARD_MAX_MISSES,
  SCENE_HEIGHT,
  SCENE_WIDTH,
  evaluateTap,
  getHazardScene,
  hazardRunPassed,
} from '@/game/induction/hazards';
import { useProgression } from '@/state/progressionStore';
import { HazardSceneArt } from '@/components/induction/HazardSceneArt';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ScreenHeader } from '@/components/ScreenHeader';
import { playSfx } from '@/services/audio';
import { hapticSuccess, hapticWarning } from '@/services/haptics';
import { useT } from '@/i18n';

interface Miss {
  x: number;
  y: number;
}

export default function HazardSpotScreen() {
  const router = useRouter();
  const { t, tx, tn } = useT();
  const { id } = useLocalSearchParams<{ id: string }>();
  const scene = getHazardScene(String(id));
  const recordHazardRun = useProgression((s) => s.recordHazardRun);

  const [found, setFound] = useState<string[]>([]);
  const [misses, setMisses] = useState<Miss[]>([]);
  const [lastId, setLastId] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);
  const [width, setWidth] = useState(0);

  if (!scene) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScreenHeader title={t('induction.hazard.notFound')} />
      </SafeAreaView>
    );
  }

  const k = width / SCENE_WIDTH;
  const total = scene.hazards.length;
  const passed = hazardRunPassed(scene, found.length, misses.length);
  const last = scene.hazards.find((h) => h.id === lastId);

  const finish = (nextFound: string[], nextMisses: Miss[]) => {
    setFinished(true);
    recordHazardRun(scene.id, { found: nextFound.length, total, misses: nextMisses.length });
    if (hazardRunPassed(scene, nextFound.length, nextMisses.length)) {
      playSfx('complete');
      hapticSuccess();
    } else {
      playSfx('fail');
    }
  };

  const onTap = (px: number, py: number) => {
    if (finished || k === 0) return;
    const point = { x: px / k, y: py / k };
    const result = evaluateTap(scene, found, point);
    if (result.kind === 'found') {
      const next = [...found, result.hazardId];
      setFound(next);
      setLastId(result.hazardId);
      playSfx('tap');
      hapticSuccess();
      if (next.length === total) finish(next, misses);
    } else if (result.kind === 'repeat') {
      setLastId(result.hazardId);
    } else {
      const next = [...misses, point];
      setMisses(next);
      hapticWarning();
    }
  };

  const retry = () => {
    setFound([]);
    setMisses([]);
    setLastId(null);
    setFinished(false);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScreenHeader title={tx(scene.title)} subtitle={t('induction.hazard.found', { found: found.length, total })} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.brief}>{tx(scene.brief)}</Text>

        <View
          style={[styles.sceneWrap, shadows.soft, { height: width * (SCENE_HEIGHT / SCENE_WIDTH) }]}
          onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={(e) => onTap(e.nativeEvent.locationX, e.nativeEvent.locationY)}
            accessibilityRole="imagebutton"
            accessibilityLabel={t('induction.hazard.sceneA11y', { title: tx(scene.title), found: found.length, total })}
          >
            {width > 0 ? (
              <Svg width={width} height={width * (SCENE_HEIGHT / SCENE_WIDTH)} viewBox={`0 0 ${SCENE_WIDTH} ${SCENE_HEIGHT}`}>
                <HazardSceneArt sceneId={scene.id} />
                {scene.hazards.map((h) => {
                  const isFound = found.includes(h.id);
                  if (!isFound && !finished) return null;
                  return (
                    <G key={h.id}>
                      <Circle
                        cx={h.x}
                        cy={h.y}
                        r={h.r}
                        fill={isFound ? 'rgba(55,178,108,0.18)' : 'rgba(214,69,69,0.15)'}
                        stroke={isFound ? colors.success : colors.danger}
                        strokeWidth={0.9}
                        strokeDasharray={isFound ? undefined : '2 1.5'}
                      />
                    </G>
                  );
                })}
                {misses.map((m, i) => (
                  <G key={`miss-${i}`}>
                    <Circle cx={m.x} cy={m.y} r={2.2} fill="none" stroke={colors.danger} strokeWidth={0.7} />
                  </G>
                ))}
              </Svg>
            ) : null}
          </Pressable>
        </View>

        <View style={styles.meta}>
          <Text style={styles.metaText}>
            {t('induction.hazard.wrongTaps', { misses: misses.length, max: HAZARD_MAX_MISSES })}
          </Text>
        </View>

        {last && !finished ? (
          <Animated.View key={last.id} entering={FadeInUp} style={[styles.card, styles.foundCard]}>
            <CheckCircle2 size={iconSizes.sm} color={colors.success} />
            <View style={styles.flex}>
              <Text style={styles.cardTitle}>{tx(last.title)}</Text>
              <Text style={styles.cardBody}>{tx(last.explanation)}</Text>
            </View>
          </Animated.View>
        ) : null}

        {finished ? (
          <Animated.View entering={FadeInUp} style={styles.results}>
            <View style={[styles.card, passed ? styles.foundCard : styles.failCard]}>
              {passed ? (
                <CheckCircle2 size={iconSizes.md} color={colors.success} />
              ) : (
                <ShieldAlert size={iconSizes.md} color={colors.warning} />
              )}
              <View style={styles.flex}>
                <Text style={styles.cardTitle}>{passed ? t('induction.hazard.cleared') : t('induction.notYet')}</Text>
                <Text style={styles.cardBody}>
                  {tn('induction.hazard.summary_one', 'induction.hazard.summary_other', misses.length, { found: found.length, total })}
                </Text>
              </View>
            </View>
            {scene.hazards.map((h) => {
              const isFound = found.includes(h.id);
              return (
                <View key={h.id} style={styles.reviewRow}>
                  {isFound ? (
                    <CheckCircle2 size={iconSizes.sm} color={colors.success} />
                  ) : (
                    <XCircle size={iconSizes.sm} color={colors.danger} />
                  )}
                  <View style={styles.flex}>
                    <Text style={styles.reviewTitle}>{tx(h.title)}</Text>
                    <Text style={styles.cardBody}>{tx(h.explanation)}</Text>
                  </View>
                </View>
              );
            })}
            <PrimaryButton label={t('induction.tryAgain')} icon={<RotateCcw size={iconSizes.sm} color={colors.textOnDark} />} onPress={retry} />
            <PrimaryButton label={t('induction.backToInduction')} variant="outline" onPress={() => router.back()} />
          </Animated.View>
        ) : (
          <PrimaryButton
            label={t('induction.hazard.done')}
            variant="outline"
            onPress={() => finish(found, misses)}
            accessibilityHint={t('induction.hazard.doneHint')}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  content: { padding: layout.gutter, gap: spacing.md, paddingBottom: spacing.xxl },
  brief: { ...typography.body, color: colors.textMuted },
  sceneWrap: { width: '100%', borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.mapGround },
  meta: { flexDirection: 'row', justifyContent: 'flex-end' },
  metaText: { ...typography.caption, color: colors.textMuted },
  card: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.card,
  },
  foundCard: { borderLeftWidth: 4, borderLeftColor: colors.success },
  failCard: { borderLeftWidth: 4, borderLeftColor: colors.warning },
  cardTitle: { ...typography.label, color: colors.text },
  cardBody: { ...typography.caption, color: colors.textMuted, lineHeight: 18 },
  results: { gap: spacing.md },
  reviewRow: { flexDirection: 'row', gap: spacing.md, paddingHorizontal: spacing.sm },
  reviewTitle: { ...typography.label, color: colors.text },
});
