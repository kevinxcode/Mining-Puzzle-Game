/**
 * MINING FLOW — the mining map.
 * Stylized SVG terrain with haul roads, nodes, trucks and excavators.
 * The map is the visual focus of the game screen.
 */

import { useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { runOnJS, useAnimatedReaction, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { Maximize2, Minus, Plus } from 'lucide-react-native';
import Svg, { Circle, Ellipse, G, Line, Rect, Text as SvgText } from 'react-native-svg';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { hapticSelection } from '@/services/haptics';
import { distanceToSegment, nearestWithin } from './map/hitTest';
import {
  CAMERA_MIN_SCALE,
  CAMERA_TAP_SCALE,
  clampCamera,
  toContent,
  zoomAround,
  type Camera,
} from './map/camera';
import { colors, radius, shadows } from '@/theme/tokens';
import { getMaterial } from '@/game/config/materials';
import { segmentKey } from '@/game/engine/routeEngine';
import { MAP_SIZE, nodePosition, truckPosition, truckRoutePath } from '@/game/mapMath';
import type { LevelConfig, Point, TruckRuntime } from '@/types/game';
import { RouteLine } from './RouteLine';
import { MapTerrain } from './map/MapTerrain';
import { TruckUnit } from './TruckUnit';
import { useProgression } from '@/state/progressionStore';
import { ExcavatorUnit } from './ExcavatorUnit';

interface GameMapProps {
  level: LevelConfig;
  trucks: TruckRuntime[];
  /** Live road state (events can close/open roads); falls back to the level config. */
  roads?: LevelConfig['map']['roads'];
  selectedTruckId: string | null;
  onSelectTruck: (truckId: string) => void;
  /** Long-press + drag a truck onto an excavator or a route line. */
  onDropTruck?: (truckId: string, target: DropTarget) => void;
  /** Simulation is advancing (drives motion effects). */
  running?: boolean;
}

export type DropTarget = { kind: 'excavator'; excavatorId: string } | { kind: 'route'; routeId: string };

interface DragState {
  truckId: string;
  point: Point;
  target: DropTarget | null;
}

const sameTarget = (a: DropTarget | null, b: DropTarget | null) =>
  a?.kind === b?.kind &&
  (a?.kind === 'excavator'
    ? a.excavatorId === (b as { excavatorId: string }).excavatorId
    : a?.kind === 'route'
      ? a.routeId === (b as { routeId: string }).routeId
      : true);

export function GameMap({ level, trucks, roads, selectedTruckId, onSelectTruck, onDropTruck, running = false }: GameMapProps) {
  const liveryId = useProgression((s) => s.cosmetics.livery);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const pad = 26;
  const usable = Math.max(0.01, Math.min(size.width, size.height) - pad * 2);
  const scale = usable / MAP_SIZE;
  const originX = (size.width - MAP_SIZE * scale) / 2;
  const originY = (size.height - MAP_SIZE * scale) / 2;

  const toScreen = useMemo(
    () => (p: Point): Point => ({ x: originX + p.x * scale, y: originY + p.y * scale }),
    [originX, originY, scale],
  );

  const roadGeometry = useMemo(
    () =>
      (roads ?? level.map.roads).map((road) => ({
        road,
        from: toScreen(nodePosition(level, road.from)),
        to: toScreen(nodePosition(level, road.to)),
      })),
    [level, roads, toScreen],
  );

  const occupiedSegments = (() => {
    const keys = new Set<string>();
    for (const truck of trucks) {
      if (truck.pathIndex >= truck.nodePath.length - 1) continue;
      if (truck.segmentProgress > 0) {
        keys.add(segmentKey(truck.nodePath[truck.pathIndex], truck.nodePath[truck.pathIndex + 1]));
      }
    }
    return keys;
  })();

  // Not memoized: the simulation mutates `trucks` in place, so the array identity never changes.
  const loadingExcavatorIds = new Set<string>();
  for (const truck of trucks) {
    if (truck.state === 'loading') loadingExcavatorIds.add(truck.assignedExcavatorId);
  }

  /* ---------------- Drag-to-assign ---------------- */
  const [drag, setDrag] = useState<DragState | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const updateDrag = (next: DragState | null) => {
    dragRef.current = next;
    setDrag(next);
  };

  const excavatorTargets = level.excavators.map((ex) => ({ id: ex.id, ...toScreen(nodePosition(level, ex.nodeId)) }));

  const targetAt = (point: Point): DropTarget | null => {
    const exId = nearestWithin(point, excavatorTargets, 16 * scale);
    if (exId) return { kind: 'excavator', excavatorId: exId };
    for (const route of level.map.routes) {
      for (let i = 0; i < route.nodePath.length - 1; i += 1) {
        const a = toScreen(nodePosition(level, route.nodePath[i]));
        const b = toScreen(nodePosition(level, route.nodePath[i + 1]));
        if (distanceToSegment(point, a, b) <= 6 * scale) return { kind: 'route', routeId: route.id };
      }
    }
    return null;
  };

  /* ---------------- Camera: pinch-zoom, pan, double-tap ---------------- */
  const camScale = useSharedValue(1);
  const camX = useSharedValue(0);
  const camY = useSharedValue(0);
  const start = useSharedValue<Camera>({ scale: 1, x: 0, y: 0 });
  const pinchFocal = useSharedValue<Point>({ x: 0, y: 0 });
  const view = { width: size.width, height: size.height };

  const applyCamera = (cam: Camera, animated: boolean) => {
    'worklet';
    const c = clampCamera(cam, view);
    if (animated) {
      camScale.value = withTiming(c.scale, { duration: 220 });
      camX.value = withTiming(c.x, { duration: 220 });
      camY.value = withTiming(c.y, { duration: 220 });
    } else {
      camScale.value = c.scale;
      camX.value = c.x;
      camY.value = c.y;
    }
  };
  const currentCamera = (): Camera => {
    'worklet';
    return { scale: camScale.value, x: camX.value, y: camY.value };
  };

  const pinchGesture = Gesture.Pinch()
    .onStart((e) => {
      start.value = currentCamera();
      pinchFocal.value = { x: e.focalX, y: e.focalY };
    })
    .onUpdate((e) => {
      const zoomed = zoomAround(start.value, pinchFocal.value, start.value.scale * e.scale);
      // Moving the fingers while pinching also pans.
      applyCamera(
        { ...zoomed, x: zoomed.x + e.focalX - pinchFocal.value.x, y: zoomed.y + e.focalY - pinchFocal.value.y },
        false,
      );
    });

  const panGesture = Gesture.Pan()
    .minDistance(6)
    .averageTouches(true)
    .onStart(() => {
      start.value = currentCamera();
    })
    .onUpdate((e) => {
      applyCamera({ ...start.value, x: start.value.x + e.translationX, y: start.value.y + e.translationY }, false);
    });

  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd((e) => {
      const cam = currentCamera();
      const target = cam.scale > CAMERA_MIN_SCALE + 0.05 ? CAMERA_MIN_SCALE : CAMERA_TAP_SCALE;
      applyCamera(zoomAround(cam, { x: e.x, y: e.y }, target), true);
    });

  const zoomBy = (factor: number) => {
    const cam = currentCamera();
    applyCamera(zoomAround(cam, { x: size.width / 2, y: size.height / 2 }, cam.scale * factor), true);
    hapticSelection();
  };
  const resetCamera = () => {
    applyCamera({ scale: 1, x: 0, y: 0 }, true);
    hapticSelection();
  };

  // Truck name pills only when zoomed in (or selected) so crowded junctions stay readable.
  const [zoomedIn, setZoomedIn] = useState(false);
  useAnimatedReaction(
    () => camScale.value >= 1.5,
    (now, before) => {
      if (now !== before) runOnJS(setZoomedIn)(now);
    },
  );

  const cameraStyle = useAnimatedStyle(() => ({
    transformOrigin: [0, 0, 0],
    transform: [{ translateX: camX.value }, { translateY: camY.value }, { scale: camScale.value }],
  }));

  /** Touch (map-view coordinates) → unzoomed map-layer coordinates. */
  const touchToMap = (x: number, y: number): Point => toContent({ x, y }, currentCamera());

  const dragGesture = Gesture.Pan()
    .enabled(Boolean(onDropTruck))
    .activateAfterLongPress(220)
    .runOnJS(true)
    .onStart((e) => {
      const point = touchToMap(e.x, e.y);
      const truckTargets = trucks.map((t) => ({ id: t.id, ...toScreen(truckPosition(t, level)) }));
      const truckId = nearestWithin(point, truckTargets, 22 * scale);
      if (!truckId) return;
      hapticSelection();
      updateDrag({ truckId, point, target: null });
    })
    .onUpdate((e) => {
      const current = dragRef.current;
      if (!current) return;
      const point = touchToMap(e.x, e.y);
      const target = targetAt(point);
      if (target && !sameTarget(target, current.target)) hapticSelection();
      updateDrag({ ...current, point, target });
    })
    .onEnd(() => {
      const current = dragRef.current;
      if (current?.target && onDropTruck) onDropTruck(current.truckId, current.target);
    })
    .onFinalize(() => updateDrag(null));

  // Long-press drag on a truck beats a camera pan; pinch and double-tap run alongside.
  const mapGesture = Gesture.Simultaneous(pinchGesture, doubleTapGesture, Gesture.Race(dragGesture, panGesture));

  const hoveredExcavator = drag?.target?.kind === 'excavator' ? drag.target.excavatorId : null;
  const hoveredRoute = drag?.target?.kind === 'route' ? level.map.routes.find((r) => r.id === (drag.target as { routeId: string }).routeId) : null;

  const onLayout = (event: {
    nativeEvent: { layout: { width: number; height: number } };
  }) => {
    const { width, height } = event.nativeEvent.layout;
    if (Math.abs(width - size.width) > 1 || Math.abs(height - size.height) > 1) {
      setSize({ width, height });
    }
  };

  return (
    <View style={[styles.container, shadows.soft]} onLayout={onLayout}>
      {size.width > 0 ? (
        <GestureDetector gesture={mapGesture}>
        <View collapsable={false} style={StyleSheet.absoluteFill}>
        <Animated.View style={[StyleSheet.absoluteFill, cameraStyle]}>
        <MapTerrain
          width={size.width}
          height={size.height}
          scale={scale}
          toScreen={toScreen}
          nodes={level.map.nodes}
          roads={roadGeometry}
        />
        <Svg width={size.width} height={size.height} style={StyleSheet.absoluteFill}>
          {/* Busy road segments (dynamic; the static terrain draws the rest) */}
          {roadGeometry.map(({ road, from, to }) =>
            occupiedSegments.has(segmentKey(road.from, road.to)) && !road.closed ? (
              <Line
                key={`busy-${road.id}`}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke="#B39A6C"
                strokeWidth={(road.narrow ? 3.6 : 5.4) * scale}
                strokeLinecap="round"
                opacity={0.55}
              />
            ) : null,
          )}

          {/* Selected truck's route */}
          {selectedTruckId
            ? trucks
                .filter((t) => t.id === selectedTruckId)
                .map((truck) => (
                  <RouteLine
                    key={`route-${truck.id}`}
                    points={truckRoutePath(truck).map((id) => toScreen(nodePosition(level, id)))}
                    color={colors.primary}
                    width={6.5 * scale}
                    opacity={0.9}
                  />
                ))
            : null}

          {/* Drag feedback: highlighted drop target + ghost truck under the finger */}
          {hoveredRoute
            ? hoveredRoute.nodePath.slice(0, -1).map((from, i) => {
                const a = toScreen(nodePosition(level, from));
                const b = toScreen(nodePosition(level, hoveredRoute.nodePath[i + 1]));
                return (
                  <Line
                    key={`drop-${i}`}
                    x1={a.x}
                    y1={a.y}
                    x2={b.x}
                    y2={b.y}
                    stroke={colors.info}
                    strokeWidth={5 * scale}
                    strokeLinecap="round"
                    opacity={0.6}
                  />
                );
              })
            : null}
          {hoveredExcavator
            ? (() => {
                const t = excavatorTargets.find((e) => e.id === hoveredExcavator)!;
                return (
                  <Circle cx={t.x} cy={t.y} r={14 * scale} fill="none" stroke={colors.info} strokeWidth={2.5 * scale} />
                );
              })()
            : null}
          {drag ? (
            <G opacity={0.85}>
              <Circle cx={drag.point.x} cy={drag.point.y} r={8 * scale} fill={colors.primary} stroke={colors.card} strokeWidth={1.5 * scale} />
              <Line
                x1={toScreen(truckPosition(trucks.find((t) => t.id === drag.truckId)!, level)).x}
                y1={toScreen(truckPosition(trucks.find((t) => t.id === drag.truckId)!, level)).y}
                x2={drag.point.x}
                y2={drag.point.y}
                stroke={colors.primary}
                strokeWidth={1.2 * scale}
                strokeDasharray={`${3 * scale} ${3 * scale}`}
              />
            </G>
          ) : null}
        </Svg>
        {/* Excavators + trucks: native overlays so motion runs on the UI thread */}
        {level.map.nodes
          .filter((node) => node.type === 'excavator')
          .map((node) => (
            <ExcavatorUnit
              key={node.id}
              position={toScreen(node.position)}
              scale={scale}
              materialColor={getMaterial(node.materialId)?.color ?? colors.mapRock}
              label={node.name}
              loading={loadingExcavatorIds.has(node.id)}
              running={running}
            />
          ))}
        {trucks.map((truck) => (
          <TruckUnit
            key={truck.id}
            position={toScreen(truckPosition(truck, level))}
            scale={scale}
            loadFraction={truck.spec.capacity > 0 ? truck.load / truck.spec.capacity : 0}
            state={truck.state}
            label={truck.spec.name}
            selected={truck.id === selectedTruckId}
            running={running}
            showLabel={zoomedIn}
            liveryId={liveryId}
            parkSide={toScreen(truckPosition(truck, level)).x > size.width * 0.6 ? -1 : 1}
            onPress={() => onSelectTruck(truck.id)}
          />
        ))}
        </Animated.View>
        {/* Zoom controls */}
        <View style={styles.zoomControls} pointerEvents="box-none">
          <Pressable style={styles.zoomButton} onPress={() => zoomBy(1.5)} accessibilityRole="button" accessibilityLabel="Zoom in" hitSlop={6}>
            <Plus size={18} color={colors.textOnDark} />
          </Pressable>
          <Pressable style={styles.zoomButton} onPress={() => zoomBy(1 / 1.5)} accessibilityRole="button" accessibilityLabel="Zoom out" hitSlop={6}>
            <Minus size={18} color={colors.textOnDark} />
          </Pressable>
          <Pressable style={styles.zoomButton} onPress={resetCamera} accessibilityRole="button" accessibilityLabel="Reset map view" hitSlop={6}>
            <Maximize2 size={16} color={colors.textOnDark} />
          </Pressable>
        </View>
        </View>
        </GestureDetector>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.mapGround,
  },
  zoomControls: {
    position: 'absolute',
    left: 10,
    bottom: 10,
    gap: 8,
  },
  zoomButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(28,31,36,0.78)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});