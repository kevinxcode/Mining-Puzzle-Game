/**
 * MINING FLOW — the mining map.
 * Stylized SVG terrain with haul roads, nodes, trucks and excavators.
 * The map is the visual focus of the game screen.
 */

import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Ellipse, G, Rect, Text as SvgText } from 'react-native-svg';
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
}

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

export function GameMap({ level, trucks, roads, selectedTruckId, onSelectTruck }: GameMapProps) {
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

  const occupiedSegments = useMemo(() => {
    const keys = new Set<string>();
    for (const truck of trucks) {
      if (truck.pathIndex >= truck.nodePath.length - 1) continue;
      if (truck.segmentProgress > 0) {
        keys.add(segmentKey(truck.nodePath[truck.pathIndex], truck.nodePath[truck.pathIndex + 1]));
      }
    }
    return keys;
  }, [trucks]);

  const loadingExcavatorIds = useMemo(() => {
    const ids = new Set<string>();
    for (const truck of trucks) {
      if (truck.state === 'loading') ids.add(truck.assignedExcavatorId);
    }
    return ids;
  }, [trucks]);

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
            if (node.type === 'excavator') {
              return (
                <ExcavatorUnit
                  key={node.id}
                  position={s}
                  scale={scale}
                  materialColor={material?.color ?? colors.mapRock}
                  label={node.name}
                  loading={loadingExcavatorIds.has(node.id)}
                />
              );
            }
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

          {/* Trucks */}
          {trucks.map((truck) => (
            <TruckUnit
              key={truck.id}
              position={toScreen(truckPosition(truck, level))}
              scale={scale}
              loadFraction={truck.spec.capacity > 0 ? truck.load / truck.spec.capacity : 0}
              state={truck.state}
              label={truck.spec.name}
              selected={truck.id === selectedTruckId}
              onPress={() => onSelectTruck(truck.id)}
            />
          ))}
        </Svg>
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