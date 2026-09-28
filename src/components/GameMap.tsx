/**
 * MINING FLOW — the mining map.
 * Stylized SVG terrain with haul roads, nodes, trucks and excavators.
 * The map is the visual focus of the game screen.
 */

import { useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Ellipse, G, Line, Rect, Text as SvgText } from 'react-native-svg';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { hapticSelection } from '@/services/haptics';
import { distanceToSegment, nearestWithin } from './map/hitTest';
import { colors, radius, shadows } from '@/theme/tokens';
import { getMaterial } from '@/game/config/materials';
import { segmentKey } from '@/game/engine/routeEngine';
import { MAP_SIZE, nodePosition, truckPosition, truckRoutePath } from '@/game/mapMath';
import type { LevelConfig, Point, TruckRuntime } from '@/types/game';
import { RouteLine } from './RouteLine';
import { TruckUnit } from './TruckUnit';
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

/** Deterministic terrain decoration positions (same every render). */
const DECORATIONS = {
  trees: [
    { x: 6, y: 12 }, { x: 93, y: 10 }, { x: 40, y: 30 }, { x: 62, y: 24 },
    { x: 8, y: 70 }, { x: 94, y: 60 }, { x: 26, y: 96 }, { x: 70, y: 96 },
  ],
  rocks: [
    { x: 34, y: 8 }, { x: 66, y: 44 }, { x: 10, y: 40 }, { x: 90, y: 40 },
    { x: 44, y: 78 }, { x: 58, y: 54 },
  ],
  puddles: [
    { x: 46, y: 46, rx: 6, ry: 3 }, { x: 18, y: 64, rx: 5, ry: 2.4 },
    { x: 82, y: 66, rx: 5, ry: 2.4 },
  ],
  cones: [{ x: 26, y: 46 }, { x: 74, y: 46 }, { x: 46, y: 72 }],
} as const;

export function GameMap({ level, trucks, roads, selectedTruckId, onSelectTruck, onDropTruck, running = false }: GameMapProps) {
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

  const dragGesture = Gesture.Pan()
    .enabled(Boolean(onDropTruck))
    .activateAfterLongPress(220)
    .runOnJS(true)
    .onStart((e) => {
      const point = { x: e.x, y: e.y };
      const truckTargets = trucks.map((t) => ({ id: t.id, ...toScreen(truckPosition(t, level)) }));
      const truckId = nearestWithin(point, truckTargets, 22 * scale);
      if (!truckId) return;
      hapticSelection();
      updateDrag({ truckId, point, target: null });
    })
    .onUpdate((e) => {
      const current = dragRef.current;
      if (!current) return;
      const point = { x: e.x, y: e.y };
      const target = targetAt(point);
      if (target && !sameTarget(target, current.target)) hapticSelection();
      updateDrag({ ...current, point, target });
    })
    .onEnd(() => {
      const current = dragRef.current;
      if (current?.target && onDropTruck) onDropTruck(current.truckId, current.target);
    })
    .onFinalize(() => updateDrag(null));

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
        <GestureDetector gesture={dragGesture}>
        <View collapsable={false} style={StyleSheet.absoluteFill}>
        <Svg width={size.width} height={size.height}>
          {/* Ground */}
          <Rect
            x={0}
            y={0}
            width={size.width}
            height={size.height}
            rx={radius.lg}
            fill={colors.mapGround}
          />
          {/* Quarry wall along the top */}
          <Rect
            x={0}
            y={0}
            width={size.width}
            height={8 * scale + 6}
            rx={radius.lg}
            fill={colors.mapWall}
            opacity={0.7}
          />

          {/* Decorations */}
          {DECORATIONS.puddles.map((p, i) => {
            const s = toScreen({ x: p.x, y: p.y });
            return (
              <Ellipse
                key={`puddle-${i}`}
                cx={s.x}
                cy={s.y}
                rx={p.rx * scale}
                ry={p.ry * scale}
                fill={colors.mapWater}
                opacity={0.8}
              />
            );
          })}
          {DECORATIONS.rocks.map((p, i) => {
            const s = toScreen({ x: p.x, y: p.y });
            return (
              <Circle key={`rock-${i}`} cx={s.x} cy={s.y} r={2.2 * scale} fill={colors.mapRock} />
            );
          })}
          {DECORATIONS.trees.map((p, i) => {
            const s = toScreen({ x: p.x, y: p.y });
            return (
              <Circle key={`tree-${i}`} cx={s.x} cy={s.y} r={2.8 * scale} fill={colors.mapTree} />
            );
          })}
          {DECORATIONS.cones.map((p, i) => {
            const s = toScreen({ x: p.x, y: p.y });
            return (
              <SvgText
                key={`cone-${i}`}
                x={s.x}
                y={s.y + 2 * scale}
                fontSize={6 * scale}
                textAnchor="middle"
              >
                {'▲'}
              </SvgText>
            );
          })}

          {/* Roads */}
          {roadGeometry.map(({ road, from, to }) => {
            const active = occupiedSegments.has(segmentKey(road.from, road.to));
            const width = (road.narrow ? 3.2 : road.mud ? 5.4 : 5) * scale;
            const color = road.closed
              ? colors.textMuted
              : active
                ? colors.mapRoadActive
                : colors.mapRoad;
            return (
              <RouteLine
                key={road.id}
                points={[from, to]}
                color={color}
                width={width}
                dashed={Boolean(road.closed) || Boolean(road.mud)}
                opacity={road.closed ? 0.9 : 1}
              />
            );
          })}

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

          {/* One-way indicators */}
          {roadGeometry.map(({ road, from, to }) =>
            road.oneWay ? (
              <SvgText
                key={`oneway-${road.id}`}
                x={(from.x + to.x) / 2}
                y={(from.y + to.y) / 2 + 2 * scale}
                fontSize={7 * scale}
                fill={colors.text}
                textAnchor="middle"
              >
                {'▸'}
              </SvgText>
            ) : null,
          )}

          {/* Nodes */}
          {level.map.nodes.map((node) => {
            const s = toScreen(node.position);
            const material = getMaterial(node.materialId);
            if (node.type === 'excavator') return null; // drawn in the native overlay
            if (node.type === 'dump') {
              return (
                <G key={node.id}>
                  <SvgText
                    x={s.x}
                    y={s.y - 8 * scale}
                    fontSize={6.5 * scale}
                    fill={colors.text}
                    textAnchor="middle"
                    fontWeight="700"
                  >
                    {node.name}
                  </SvgText>
                  <SvgText x={s.x} y={s.y + 3 * scale} fontSize={8 * scale} textAnchor="middle">
                    {'⬢'}
                  </SvgText>
                  <Circle
                    cx={s.x}
                    cy={s.y + 2 * scale}
                    r={2 * scale}
                    fill={material?.color ?? colors.mapRock}
                  />
                </G>
              );
            }
            if (node.type === 'fuel') {
              return (
                <G key={node.id}>
                  <Circle
                    cx={s.x}
                    cy={s.y}
                    r={4.5 * scale}
                    fill={colors.info}
                    stroke={colors.card}
                    strokeWidth={1.2 * scale}
                  />
                  <SvgText
                    x={s.x}
                    y={s.y + 2.5 * scale}
                    fontSize={6 * scale}
                    fill={colors.textOnDark}
                    textAnchor="middle"
                    fontWeight="700"
                  >
                    {'F'}
                  </SvgText>
                  <SvgText
                    x={s.x}
                    y={s.y + 10 * scale}
                    fontSize={6 * scale}
                    fill={colors.text}
                    textAnchor="middle"
                  >
                    {node.name}
                  </SvgText>
                </G>
              );
            }
            if (node.type === 'parking') {
              return (
                <G key={node.id}>
                  <Rect
                    x={s.x - 6 * scale}
                    y={s.y - 4 * scale}
                    width={12 * scale}
                    height={8 * scale}
                    rx={2 * scale}
                    fill="none"
                    stroke={colors.textMuted}
                    strokeWidth={1.2 * scale}
                    strokeDasharray="3 3"
                  />
                  <SvgText
                    x={s.x}
                    y={s.y + 9 * scale}
                    fontSize={5.5 * scale}
                    fill={colors.textMuted}
                    textAnchor="middle"
                  >
                    {node.name}
                  </SvgText>
                </G>
              );
            }
            if (node.type === 'workshop') {
              return (
                <G key={node.id}>
                  <Rect
                    x={s.x - 4.5 * scale}
                    y={s.y - 3.5 * scale}
                    width={9 * scale}
                    height={7 * scale}
                    rx={1.5 * scale}
                    fill={colors.mapWall}
                    stroke={colors.mapRoadActive}
                    strokeWidth={1 * scale}
                  />
                  <SvgText
                    x={s.x}
                    y={s.y + 8.5 * scale}
                    fontSize={5.5 * scale}
                    fill={colors.textMuted}
                    textAnchor="middle"
                  >
                    {node.name}
                  </SvgText>
                </G>
              );
            }
            return (
              <Circle key={node.id} cx={s.x} cy={s.y} r={2.4 * scale} fill={colors.mapRoadActive} />
            );
          })}

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
            parkSide={toScreen(truckPosition(truck, level)).x > size.width * 0.6 ? -1 : 1}
            onPress={() => onSelectTruck(truck.id)}
          />
        ))}
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
});