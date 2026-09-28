/**
 * MINING FLOW — main game screen.
 * Mission header + mining map + production meter + floating control bar,
 * equipment/route bottom sheets, tutorial coachmark and result overlay.
 * The simulation runs outside React in a SimController; this screen
 * subscribes to its frames with useSyncExternalStore.
 */

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { AppState, Share, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  FastForward,
  Ghost,
  Lightbulb,
  RotateCcw,
  Undo2,
  X,
  Pause,
  Play,
  Radio,
  Route as RouteIcon,
  Truck,
} from 'lucide-react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { colors, iconSizes, minTouchTarget, radius, shadows, spacing, typography } from '@/theme/tokens';
import { TOTAL_LEVELS } from '@/game/levels/levelFactory';
import { SimController } from '@/game/simController';
import {
  evaluateObjectives,
  fleetIdlePercent,
} from '@/game/engine/simulationEngine';
import {
  analyzeFailure,
  computeEfficiency,
  computeResultFlags,
  computeRewards,
  computeStars,
} from '@/game/scoring';
import { useProgression } from '@/state/progressionStore';
import type { LevelResultInput } from '@/state/save';
import { EquipmentSheet } from '@/components/EquipmentSheet';
import { GameMap } from '@/components/GameMap';
import { IconButton } from '@/components/IconButton';
import { MissionHeader } from '@/components/MissionHeader';
import { MissionResult } from '@/components/MissionResult';
import { PressableScale } from '@/components/PressableScale';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ProductionMeter } from '@/components/ProductionMeter';
import { RouteSheet } from '@/components/RouteSheet';
import { TutorialCoachmark } from '@/components/TutorialCoachmark';
import { nextRouteAfter, parseModeLevelId, resolveLevel } from '@/game/levels/modeLevels';
import { buildShareText } from '@/game/share';
import { isRunLog } from '@/game/replay';
import { hqExtraHints } from '@/game/config/siteHq';
import { computeHint, HINTS_PER_RUN, type Hint, type HintAction } from '@/game/engine/hintEngine';
import { playSfx } from '@/services/audio';
import { hapticSuccess, hapticWarning } from '@/services/haptics';

const noopSubscribe = () => () => undefined;

/** Bottom-bar button: icon over a short label (44pt+ target). */
function BarButton({
  icon,
  label,
  accessibilityLabel,
  onPress,
}: {
  icon: ReactNode;
  label: string;
  accessibilityLabel: string;
  onPress: () => void;
}) {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={() => {
        playSfx('tap');
        onPress();
      }}
      style={styles.barButton}
    >
      {icon}
      <Text style={styles.barLabel}>{label}</Text>
    </PressableScale>
  );
}

export default function GameRoute() {
  const params = useLocalSearchParams<{ id: string; ghost?: string }>();
  const levelId = String(params.id);
  const ghostMode = params.ghost === '1';
  // Keyed by level id: moving to another level remounts, so the simulation
  // controller and tutorial state never carry over from the previous level.
  return <GameScreen key={`${levelId}${ghostMode ? ':ghost' : ''}`} levelId={levelId} ghostMode={ghostMode} />;
}

function GameScreen({ levelId, ghostMode }: { levelId: string; ghostMode: boolean }) {
  const router = useRouter();
  const level = resolveLevel(levelId);
  const savedGhost = useProgression((s) => s.levels[levelId]?.ghost);
  const ghostLog = ghostMode && isRunLog(savedGhost) ? savedGhost : null;

  const upgrades = useProgression((s) => s.upgrades);
  const recordLevelResult = useProgression((s) => s.recordLevelResult);
  const hq = useProgression((s) => s.hq);
  const hintsPerRun = HINTS_PER_RUN + hqExtraHints(hq);

  // Simulation controller lives outside React — created once per level.
  const controllerRef = useRef<SimController | null>(null);
  if (level && !controllerRef.current) {
    controllerRef.current = new SimController(level, upgrades, ghostLog);
  }
  const controller = controllerRef.current;

  const [sheetOpen, setSheetOpen] = useState(false);
  const [routeSheetOpen, setRouteSheetOpen] = useState(false);
  const [selectedTruckId, setSelectedTruckId] = useState<string | null>(null);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [tutorialDone, setTutorialDone] = useState(!level?.tutorialSteps || ghostMode);
  const [resultRecorded, setResultRecorded] = useState(false);
  const [hintsLeft, setHintsLeft] = useState(hintsPerRun);
  const [hint, setHint] = useState<Hint | null>(null);
  /** XP / coins actually paid for this run (replays only pay the difference). */
  const [grantedRewards, setGrantedRewards] = useState<{ xp: number; coins: number } | null>(null);

  // Subscribe to simulation frames — re-renders on every notify.
  const version = useSyncExternalStore(
    controller ? controller.subscribe : noopSubscribe,
    () => (controller ? controller.version : 0),
  );
  void version;

  // Pause when the app goes to the background.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (appState) => {
      if (appState === 'background' || appState === 'inactive') {
        controller?.pause();
      }
    });
    return () => subscription.remove();
  }, [controller]);

  // Dispose the controller on unmount.
  useEffect(() => () => controller?.dispose(), [controller]);

  // Record rewards exactly once when the mission ends.
  useEffect(() => {
    const sim = controllerRef.current;
    const lvl = level;
    if (!sim || !lvl) return;
    const status = sim.state.status;
    if (status !== 'success' && status !== 'failed') return;
    if (sim.state.rewarded || resultRecorded) return;
    if (sim.ghost) {
      // Watching a replay never records results or pays rewards.
      sim.markRewarded();
      return;
    }
    setResultRecorded(true);

    const simState = sim.state;
    const stars = computeStars(simState, lvl);
    const rewards = computeRewards(simState, lvl, stars);
    const flags = computeResultFlags(simState, lvl, stars);
    const success = status === 'success';
    const input: LevelResultInput = {
      success,
      stars: success ? stars : 0,
      elapsedSeconds: Math.round(simState.elapsed),
      score: rewards.score,
      tonsMoved: Math.round(simState.stats.tonsMoved),
      trips: simState.stats.trips,
      fuelUsed: Math.round(simState.stats.fuelUsed),
      efficiency: computeEfficiency(simState),
      breakdowns: simState.stats.breakdowns,
      productionRate: simState.stats.avgProductionRate,
      playtimeSeconds: Math.round(simState.elapsed),
      xpGain: success ? rewards.xp : 0,
      coinsGain: success ? rewards.coins : 0,
      ghost: sim.runLog(),
    };
    const recorded = recordLevelResult(lvl.id, input, flags);
    setGrantedRewards({ xp: recorded.xpGranted, coins: recorded.coinsGranted });
    sim.markRewarded();
    if (success) {
      playSfx('complete');
      hapticSuccess();
    } else {
      playSfx('fail');
      hapticWarning();
    }
  }, [version, controller, level, recordLevelResult, resultRecorded]);

  if (!level || !controller) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.title}>Level not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const state = controller.state;
  const ready = state.status === 'ready';
  const finished = state.status === 'success' || state.status === 'failed';
  const projectedStars = computeStars(state, level);
  const timeCritical = state.status === 'running' && level.timeLimit - state.elapsed <= 30;
  const outcome =
    state.status === 'failed'
      ? evaluateObjectives(state, level)
      : { success: state.status === 'success', failedObjectiveId: null };
  const failure = analyzeFailure(state, level, outcome.failedObjectiveId);
  const selectedTruck = state.trucks.find((t) => t.id === selectedTruckId) ?? null;

  const cycleSpeed = () => {
    const next: 1 | 2 | 3 = state.speed === 3 ? 1 : state.speed === 2 ? 3 : 2;
    controller.setSpeed(next);
    playSfx('tap');
  };

  const replay = () => {
    playSfx('tap');
    setResultRecorded(false);
    setHintsLeft(hintsPerRun);
    setHint(null);
    setGrantedRewards(null);
    setTutorialDone(true);
    controller.reset(upgrades);
  };

  const showHint = () => {
    if (hintsLeft === 0) return;
    playSfx('tap');
    setHint(computeHint(controller.state, level));
    setHintsLeft(hintsLeft - 1);
  };
  const applyHint = (action: HintAction) => {
    const ok =
      action.kind === 'fuel'
        ? controller.sendToFuel(action.truckId)
        : action.kind === 'assign'
          ? controller.assignTruck(action.truckId, action.excavatorId)
          : controller.setTruckRoute(action.truckId, action.routeId);
    if (ok) hapticSuccess();
    else hapticWarning();
    setHint(null);
  };
  const undoMove = () => {
    if (controller.undo()) {
      playSfx('tap');
      hapticSuccess();
    }
  };

  const shareResult = () => {
    const isMode = Boolean(parseModeLevelId(level.id));
    const message = buildShareText({
      levelTitle: isMode ? level.name : `Level ${level.id} · ${level.regionName}`,
      success: state.status === 'success',
      stars: state.status === 'success' ? projectedStars : 0,
      tons: state.stats.tonsMoved,
      targetTons: state.targetTons,
      seconds: state.elapsed,
      efficiency: computeEfficiency(state),
    });
    Share.share({ message }).catch(() => undefined);
  };

  const nextLevel = () => {
    playSfx('tap');
    router.replace(nextRouteAfter(level.id, TOTAL_LEVELS) as never);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* Mission header */}
        <View style={styles.headerRow}>
          <IconButton
            icon={<ChevronLeft size={20} color={colors.textOnDark} />}
            accessibilityLabel="Exit level"
            onPress={() => {
              controller.pause();
              router.back();
            }}
          />
          <View style={styles.headerFill}>
            <MissionHeader
              levelName={level.name}
              regionName={level.regionName}
              tonsMoved={state.stats.tonsMoved}
              targetTons={state.targetTons}
              remainingSeconds={level.timeLimit - state.elapsed}
              projectedStars={projectedStars}
              timeCritical={timeCritical}
            />
          </View>
        </View>

        {/* Event feed banner */}
        {state.eventFeed.length > 0 ? (
          <Animated.View key={state.eventFeed[0].message} entering={FadeInUp} style={styles.feedBanner} accessibilityLiveRegion="polite">
            <Radio size={iconSizes.xs} color={colors.secondary} />
            <Text style={styles.feedText} numberOfLines={1}>
              {state.eventFeed[0].message}
            </Text>
          </Animated.View>
        ) : null}

        {/* Mining map — the visual focus */}
        <View style={styles.mapWrap}>
          {ghostLog ? (
            <View style={styles.ghostBadge} pointerEvents="none" accessibilityLiveRegion="polite">
              <Ghost size={iconSizes.sm} color={colors.textOnDark} />
              <Text style={styles.ghostText}>BEST RUN REPLAY</Text>
            </View>
          ) : null}
          {/* Hint + undo */}
          <View style={[styles.mapTools, ghostLog && styles.hidden]} pointerEvents={ghostLog ? 'none' : 'box-none'}>
            <PressableScale
              style={[styles.toolButton, hintsLeft === 0 && styles.toolDisabled]}
              disabled={hintsLeft === 0 || finished}
              onPress={showHint}
              accessibilityRole="button"
              accessibilityLabel={`Hint, ${hintsLeft} left`}
            >
              <Lightbulb size={iconSizes.sm} color={colors.secondary} />
              <Text style={styles.toolCount}>{hintsLeft}</Text>
            </PressableScale>
            <PressableScale
              style={[styles.toolButton, !controller.canUndo && styles.toolDisabled]}
              disabled={!controller.canUndo || finished}
              onPress={undoMove}
              accessibilityRole="button"
              accessibilityLabel="Undo last move"
            >
              <Undo2 size={iconSizes.sm} color={colors.textOnDark} />
            </PressableScale>
          </View>
          <GameMap
            level={level}
            trucks={state.trucks}
            roads={state.roads}
            running={state.status === 'running'}
            selectedTruckId={selectedTruckId}
            onSelectTruck={(truckId) => {
              setSelectedTruckId(truckId);
              setSheetOpen(true);
            }}
            onDropTruck={(truckId, target) => {
              const ok =
                target.kind === 'excavator'
                  ? controller.assignTruck(truckId, target.excavatorId)
                  : controller.setTruckRoute(truckId, target.routeId);
              if (ok) {
                playSfx('tap');
                hapticSuccess();
              } else {
                hapticWarning();
              }
            }}
          />
          {hint ? (
            <Animated.View entering={FadeInUp} style={styles.hintCard} accessibilityLiveRegion="polite">
              <Lightbulb size={iconSizes.sm} color={colors.secondary} />
              <Text style={styles.hintText}>{hint.message}</Text>
              {hint.action ? (
                <PressableScale style={styles.hintApply} onPress={() => applyHint(hint.action!)} accessibilityRole="button" accessibilityLabel="Apply hint">
                  <Text style={styles.hintApplyText}>APPLY</Text>
                </PressableScale>
              ) : null}
              <PressableScale onPress={() => setHint(null)} accessibilityRole="button" accessibilityLabel="Close hint" hitSlop={10}>
                <X size={iconSizes.sm} color={colors.textOnDarkMuted} />
              </PressableScale>
            </Animated.View>
          ) : null}
        </View>

        {/* Production meter */}
        <ProductionMeter
          tonsPerHour={state.stats.avgProductionRate}
          fuelUsed={state.stats.fuelUsed}
          truckUtilization={1 - fleetIdlePercent(state) / 100}
          avgQueueSeconds={
            state.trucks.length > 0
              ? state.trucks.reduce((sum, t) => sum + t.queueTime, 0) / state.trucks.length
              : 0
          }
        />
      </View>

      {/* Floating control bar */}
      <View style={[styles.controlBar, shadows.raised]}>
        <BarButton
          icon={<Truck size={iconSizes.md} color={colors.textOnDark} />}
          label="Fleet"
          accessibilityLabel="Equipment"
          onPress={() => setSheetOpen(true)}
        />
        <BarButton
          icon={<RouteIcon size={iconSizes.md} color={colors.textOnDark} />}
          label="Routes"
          accessibilityLabel="Routes"
          onPress={() => {
            setSelectedTruckId(selectedTruckId ?? state.trucks[0]?.id ?? null);
            setRouteSheetOpen(true);
          }}
        />
        <BarButton
          icon={<FastForward size={iconSizes.md} color={state.speed > 1 ? colors.secondary : colors.textOnDark} />}
          label={`${state.speed}x`}
          accessibilityLabel={`Simulation speed ${state.speed}x — tap to change`}
          onPress={cycleSpeed}
        />
        {ghostLog && finished ? (
          <PrimaryButton
            label="WATCH AGAIN"
            icon={<RotateCcw size={iconSizes.sm} color={colors.textOnDark} />}
            onPress={() => controller.reset()}
            style={styles.startButton}
          />
        ) : ready ? (
          <PrimaryButton
            label={ghostLog ? 'WATCH' : 'START'}
            accessibilityLabel="Start operation"
            icon={<Play size={iconSizes.sm} color={colors.textOnDark} fill={colors.textOnDark} />}
            onPress={() => {
              controller.start();
              if (level.tutorialSteps) setTutorialDone(true);
            }}
            style={styles.startButton}
          />
        ) : (
          <PrimaryButton
            label={state.status === 'paused' ? 'RESUME' : 'PAUSE'}
            variant={state.status === 'paused' ? 'primary' : 'ghost'}
            icon={
              state.status === 'paused' ? (
                <Play size={iconSizes.sm} color={colors.textOnDark} fill={colors.textOnDark} />
              ) : (
                <Pause size={iconSizes.sm} color={colors.textOnDark} />
              )
            }
            onPress={() => controller.togglePause()}
            style={styles.startButton}
          />
        )}
      </View>

      {/* Sheets */}
      <EquipmentSheet
        visible={sheetOpen && !finished}
        onClose={() => setSheetOpen(false)}
        level={level}
        trucks={state.trucks}
        selectedTruckId={selectedTruckId}
        onSelectTruck={setSelectedTruckId}
        onSendToFuel={(truckId) => controller.sendToFuel(truckId)}
        onAssign={(truckId, excavatorId) => controller.assignTruck(truckId, excavatorId)}
        onOpenRoutes={() => {
          setSheetOpen(false);
          setRouteSheetOpen(true);
        }}
      />
      <RouteSheet
        visible={routeSheetOpen && !finished}
        onClose={() => setRouteSheetOpen(false)}
        level={level}
        truck={selectedTruck}
        onChoose={(routeId) => {
          if (selectedTruckId) controller.setTruckRoute(selectedTruckId, routeId);
        }}
      />

      {/* Tutorial */}
      {level.tutorialSteps ? (
        <TutorialCoachmark
          visible={!tutorialDone && !finished && !sheetOpen && !routeSheetOpen}
          steps={level.tutorialSteps}
          stepIndex={tutorialStep}
          onNext={() => {
            if (tutorialStep >= level.tutorialSteps!.length - 1) setTutorialDone(true);
            else setTutorialStep(tutorialStep + 1);
          }}
          onSkip={() => setTutorialDone(true)}
        />
      ) : null}

      {/* Result overlay */}
      {ghostLog && finished ? (
        <Animated.View entering={FadeInUp} style={styles.ghostEnd}>
          <Text style={styles.ghostEndTitle}>Replay finished</Text>
          <Text style={styles.hintText}>
            {Math.round(state.stats.tonsMoved)} / {state.targetTons} t in {Math.round(state.elapsed)} s · {computeEfficiency(state)}% efficiency
          </Text>
          <PrimaryButton label="PLAY THIS LEVEL" onPress={() => router.replace(`/game/${level.id}` as never)} />
        </Animated.View>
      ) : null}
      <MissionResult
        visible={finished && !ghostLog}
        success={state.status === 'success'}
        stars={state.status === 'success' ? projectedStars : 0}
        tonsMoved={state.stats.tonsMoved}
        targetTons={state.targetTons}
        elapsedSeconds={state.elapsed}
        efficiency={computeEfficiency(state)}
        fuelUsed={state.stats.fuelUsed}
        maxQueueSeconds={state.stats.maxQueueTime}
        xpGain={grantedRewards?.xp ?? 0}
        coinsGain={grantedRewards?.coins ?? 0}
        issue={failure.issue}
        tip={failure.tip}
        onNext={nextLevel}
        onReplay={replay}
        onShare={shareResult}
        onHome={() => router.replace('/')}
        onChangeStrategy={replay}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  hidden: { opacity: 0 },
  ghostBadge: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    zIndex: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: 'rgba(76,141,214,0.9)',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
  },
  ghostText: { ...typography.label, color: colors.textOnDark, letterSpacing: 1 },
  ghostEnd: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    bottom: 120,
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    ...shadows.raised,
  },
  ghostEndTitle: { ...typography.heading, color: colors.textOnDark },
  safe: { flex: 1, backgroundColor: colors.background },
  container: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    gap: spacing.sm,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { ...typography.title, color: colors.text },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  headerFill: { flex: 1 },
  feedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
  },
  feedText: { ...typography.caption, color: colors.textOnDark, flex: 1 },
  mapWrap: { flex: 1 },
  mapTools: { position: 'absolute', top: spacing.sm, right: spacing.sm, zIndex: 5, gap: spacing.sm },
  toolButton: {
    width: minTouchTarget,
    height: minTouchTarget,
    borderRadius: minTouchTarget / 2,
    backgroundColor: 'rgba(28,31,36,0.82)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolDisabled: { opacity: 0.4 },
  toolCount: {
    position: 'absolute',
    right: 2,
    bottom: 2,
    fontSize: 10,
    fontWeight: '800',
    color: colors.secondary,
  },
  hintCard: {
    position: 'absolute',
    left: spacing.sm,
    right: spacing.sm,
    bottom: spacing.sm,
    zIndex: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    ...shadows.raised,
  },
  hintText: { ...typography.caption, color: colors.textOnDark, flex: 1, lineHeight: 18 },
  hintApply: {
    minHeight: 36,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    justifyContent: 'center',
  },
  hintApplyText: { ...typography.label, color: colors.textOnDark },
  controlBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surface,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: radius.xl,
  },
  barButton: {
    minWidth: minTouchTarget + spacing.xs,
    minHeight: minTouchTarget + spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    borderRadius: radius.md,
  },
  barLabel: { ...typography.tiny, color: colors.textOnDarkMuted },
  startButton: { flex: 1, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
});