/**
 * MINING FLOW — main game screen.
 * Mission header + mining map + production meter + floating control bar,
 * equipment/route bottom sheets, tutorial coachmark and result overlay.
 * The simulation runs outside React in a SimController; this screen
 * subscribes to its frames with useSyncExternalStore.
 */

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { AppState, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  FastForward,
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
import { nextRouteAfter, resolveLevel } from '@/game/levels/modeLevels';
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
  const params = useLocalSearchParams<{ id: string }>();
  const levelId = String(params.id);
  // Keyed by level id: moving to another level remounts, so the simulation
  // controller and tutorial state never carry over from the previous level.
  return <GameScreen key={levelId} levelId={levelId} />;
}

function GameScreen({ levelId }: { levelId: string }) {
  const router = useRouter();
  const level = resolveLevel(levelId);

  const upgrades = useProgression((s) => s.upgrades);
  const recordLevelResult = useProgression((s) => s.recordLevelResult);

  // Simulation controller lives outside React — created once per level.
  const controllerRef = useRef<SimController | null>(null);
  if (level && !controllerRef.current) {
    controllerRef.current = new SimController(level, upgrades);
  }
  const controller = controllerRef.current;

  const [sheetOpen, setSheetOpen] = useState(false);
  const [routeSheetOpen, setRouteSheetOpen] = useState(false);
  const [selectedTruckId, setSelectedTruckId] = useState<string | null>(null);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [tutorialDone, setTutorialDone] = useState(!level?.tutorialSteps);
  const [resultRecorded, setResultRecorded] = useState(false);
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
    setGrantedRewards(null);
    setTutorialDone(true);
    controller.reset(upgrades);
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
        {ready ? (
          <PrimaryButton
            label="START"
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
      <MissionResult
        visible={finished}
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
        onHome={() => router.replace('/')}
        onChangeStrategy={replay}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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