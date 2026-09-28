/**
 * Static terrain layer of the mining map: ground, pit benches, decorations,
 * haul roads and site buildings. Memoized — only redraws when layout or roads change.
 */

import { memo } from 'react';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  Line,
  LinearGradient,
  Path,
  RadialGradient,
  Rect,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
import { colors, radius } from '@/theme/tokens';
import { getMaterial } from '@/game/config/materials';
import type { LevelConfig, Point } from '@/types/game';

export interface RoadGeometry {
  road: LevelConfig['map']['roads'][number];
  from: Point;
  to: Point;
}

interface MapTerrainProps {
  width: number;
  height: number;
  scale: number;
  toScreen: (p: Point) => Point;
  nodes: LevelConfig['map']['nodes'];
  roads: RoadGeometry[];
}

/** Deterministic terrain decoration positions (map units, same every render). */
const DECORATIONS = {
  trees: [
    { x: 6, y: 12 }, { x: 93, y: 10 }, { x: 40, y: 30 }, { x: 62, y: 24 },
    { x: 8, y: 70 }, { x: 94, y: 60 }, { x: 26, y: 96 }, { x: 70, y: 96 },
    { x: 4, y: 90 }, { x: 97, y: 88 },
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

const ROAD_EDGE = '#A99571';
const ROAD_SURFACE = '#D8C7A3';
const ROAD_LINE = '#F6EEDC';

function Label({ x, y, text, scale }: { x: number; y: number; text: string; scale: number }) {
  const w = (text.length * 2.3 + 4) * scale;
  const h = 6 * scale;
  return (
    <G>
      <Rect x={x - w / 2} y={y - h / 2} width={w} height={h} rx={h / 2} fill="rgba(28,31,36,0.72)" />
      <SvgText x={x} y={y + 1.5 * scale} fontSize={4 * scale} fill={colors.textOnDark} textAnchor="middle" fontWeight="700">
        {text}
      </SvgText>
    </G>
  );
}

function MapTerrainImpl({ width, height, scale, toScreen, nodes, roads }: MapTerrainProps) {
  const center = toScreen({ x: 50, y: 50 });
  const benchRx = 48 * scale;
  const benchRy = 44 * scale;

  return (
    <Svg width={width} height={height}>
      <Defs>
        <LinearGradient id="ground" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#EADBC0" />
          <Stop offset="1" stopColor="#DCC7A3" />
        </LinearGradient>
        <RadialGradient id="vignette" cx="50%" cy="50%" r="70%">
          <Stop offset="0.6" stopColor="#000000" stopOpacity="0" />
          <Stop offset="1" stopColor="#5A4228" stopOpacity="0.28" />
        </RadialGradient>
        <LinearGradient id="water" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#B7E2EC" />
          <Stop offset="1" stopColor="#86C4D4" />
        </LinearGradient>
      </Defs>

      {/* Ground + open-pit bench contours for depth */}
      <Rect x={0} y={0} width={width} height={height} rx={radius.lg} fill="url(#ground)" />
      {[1, 0.78, 0.56].map((f, i) => (
        <Ellipse
          key={`bench-${i}`}
          cx={center.x}
          cy={center.y}
          rx={benchRx * f}
          ry={benchRy * f}
          fill={i === 2 ? 'rgba(160,125,85,0.10)' : 'none'}
          stroke="rgba(150,115,75,0.22)"
          strokeWidth={2.2 * scale}
        />
      ))}
      {/* Quarry wall along the top */}
      <Path
        d={`M0 0 H${width} V${7 * scale} Q${width * 0.75} ${12 * scale} ${width / 2} ${8 * scale} T0 ${10 * scale} Z`}
        fill="#CDB48D"
      />

      {/* Puddles */}
      {DECORATIONS.puddles.map((p, i) => {
        const s = toScreen(p);
        return (
          <G key={`puddle-${i}`}>
            <Ellipse cx={s.x} cy={s.y + 0.6 * scale} rx={p.rx * scale} ry={p.ry * scale} fill="rgba(90,66,40,0.18)" />
            <Ellipse cx={s.x} cy={s.y} rx={p.rx * scale} ry={p.ry * scale} fill="url(#water)" />
            <Ellipse cx={s.x - p.rx * 0.3 * scale} cy={s.y - p.ry * 0.3 * scale} rx={p.rx * 0.35 * scale} ry={p.ry * 0.25 * scale} fill="#FFFFFF" opacity={0.45} />
          </G>
        );
      })}

      {/* Haul roads: edge, surface, dashed centre line */}
      {roads.map(({ road, from, to }) => {
        const w = (road.narrow ? 3.6 : road.mud ? 5.6 : 5.4) * scale;
        return (
          <Line key={`edge-${road.id}`} x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke={ROAD_EDGE} strokeWidth={w + 1.6 * scale} strokeLinecap="round" />
        );
      })}
      {roads.map(({ road, from, to }) => {
        const w = (road.narrow ? 3.6 : road.mud ? 5.6 : 5.4) * scale;
        const fill = road.closed ? '#B9B2A6' : road.mud ? '#A98D66' : ROAD_SURFACE;
        return <Line key={`road-${road.id}`} x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke={fill} strokeWidth={w} strokeLinecap="round" />;
      })}
      {roads.map(({ road, from, to }) =>
        road.closed ? (
          <Line
            key={`closed-${road.id}`}
            x1={from.x}
            y1={from.y}
            x2={to.x}
            y2={to.y}
            stroke={colors.danger}
            strokeWidth={1.4 * scale}
            strokeDasharray={`${3 * scale} ${2 * scale}`}
          />
        ) : road.narrow ? null : (
          <Line
            key={`centre-${road.id}`}
            x1={from.x}
            y1={from.y}
            x2={to.x}
            y2={to.y}
            stroke={ROAD_LINE}
            strokeWidth={0.7 * scale}
            strokeDasharray={`${2.4 * scale} ${2.6 * scale}`}
            opacity={0.9}
          />
        ),
      )}
      {/* One-way chevrons */}
      {roads.map(({ road, from, to }) => {
        if (!road.oneWay) return null;
        const mx = (from.x + to.x) / 2;
        const my = (from.y + to.y) / 2;
        const angle = (Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI;
        const c = 1.8 * scale;
        return (
          <Path
            key={`oneway-${road.id}`}
            d={`M${-c} ${-c} L${c * 0.6} 0 L${-c} ${c}`}
            fill="none"
            stroke={colors.surface}
            strokeWidth={0.9 * scale}
            strokeLinecap="round"
            strokeLinejoin="round"
            transform={`translate(${mx} ${my}) rotate(${angle})`}
          />
        );
      })}
      {/* Junctions */}
      {nodes
        .filter((n) => n.type === 'junction')
        .map((n) => {
          const s = toScreen(n.position);
          return <Circle key={n.id} cx={s.x} cy={s.y} r={3 * scale} fill={ROAD_SURFACE} stroke={ROAD_EDGE} strokeWidth={0.8 * scale} />;
        })}

      {/* Rocks */}
      {DECORATIONS.rocks.map((p, i) => {
        const s = toScreen(p);
        return (
          <G key={`rock-${i}`}>
            <Ellipse cx={s.x + 0.6 * scale} cy={s.y + 1.4 * scale} rx={2.6 * scale} ry={1.1 * scale} fill="rgba(60,45,30,0.22)" />
            <Path
              d={`M${s.x - 2.4 * scale} ${s.y + 1 * scale} L${s.x - 1.6 * scale} ${s.y - 1.4 * scale} L${s.x + 0.6 * scale} ${s.y - 2 * scale} L${s.x + 2.4 * scale} ${s.y - 0.4 * scale} L${s.x + 2 * scale} ${s.y + 1.2 * scale} Z`}
              fill="#A39A88"
            />
            <Path d={`M${s.x - 1.6 * scale} ${s.y - 1.4 * scale} L${s.x + 0.6 * scale} ${s.y - 2 * scale} L${s.x + 0.2 * scale} ${s.y - 0.2 * scale} Z`} fill="#C3BBA9" />
          </G>
        );
      })}
      {/* Trees: shadow, canopy, highlight */}
      {DECORATIONS.trees.map((p, i) => {
        const s = toScreen(p);
        const r = 3 * scale;
        return (
          <G key={`tree-${i}`}>
            <Ellipse cx={s.x + 0.8 * scale} cy={s.y + r * 0.9} rx={r * 0.95} ry={r * 0.4} fill="rgba(60,45,30,0.25)" />
            <Circle cx={s.x} cy={s.y} r={r} fill="#5E8F4E" />
            <Circle cx={s.x - r * 0.3} cy={s.y - r * 0.3} r={r * 0.55} fill="#86B56F" />
          </G>
        );
      })}
      {/* Traffic cones with reflective stripe */}
      {DECORATIONS.cones.map((p, i) => {
        const s = toScreen(p);
        const c = 1.8 * scale;
        return (
          <G key={`cone-${i}`}>
            <Ellipse cx={s.x} cy={s.y + c} rx={c * 1.1} ry={c * 0.35} fill="rgba(60,45,30,0.25)" />
            <Path d={`M${s.x - c} ${s.y + c} L${s.x} ${s.y - c * 1.4} L${s.x + c} ${s.y + c} Z`} fill={colors.primary} />
            <Rect x={s.x - c * 0.55} y={s.y - c * 0.1} width={c * 1.1} height={c * 0.4} fill="#FFFFFF" opacity={0.9} />
          </G>
        );
      })}

      {/* Site buildings */}
      {nodes.map((node) => {
        const s = toScreen(node.position);
        if (node.type === 'dump') {
          const color = getMaterial(node.materialId)?.color ?? colors.mapRock;
          const w = 7 * scale;
          return (
            <G key={node.id}>
              <Ellipse cx={s.x} cy={s.y + 2.4 * scale} rx={w * 1.05} ry={2 * scale} fill="rgba(60,45,30,0.28)" />
              <Path d={`M${s.x - w} ${s.y + 2.4 * scale} Q${s.x - w * 0.4} ${s.y - 5 * scale} ${s.x} ${s.y - 5.2 * scale} Q${s.x + w * 0.5} ${s.y - 4.6 * scale} ${s.x + w} ${s.y + 2.4 * scale} Z`} fill={color} />
              <Path d={`M${s.x - w * 0.55} ${s.y - 1 * scale} Q${s.x - w * 0.2} ${s.y - 4.6 * scale} ${s.x + w * 0.1} ${s.y - 4.8 * scale}`} fill="none" stroke="#FFFFFF" strokeOpacity={0.35} strokeWidth={1 * scale} strokeLinecap="round" />
              <Label x={s.x} y={s.y - 10 * scale} text={node.name} scale={scale} />
            </G>
          );
        }
        if (node.type === 'fuel') {
          const t = 5 * scale;
          return (
            <G key={node.id}>
              <Ellipse cx={s.x} cy={s.y + t + 0.6 * scale} rx={t * 1.1} ry={1.4 * scale} fill="rgba(60,45,30,0.28)" />
              <Rect x={s.x - t} y={s.y - t} width={t * 2} height={t * 2} rx={2 * scale} fill={colors.info} stroke={colors.card} strokeWidth={1 * scale} />
              <Rect x={s.x - t * 0.45} y={s.y - t * 0.6} width={t * 0.7} height={t * 1.2} rx={0.6 * scale} fill={colors.card} />
              <Path d={`M${s.x + t * 0.25} ${s.y - t * 0.3} h${t * 0.3} v${t * 0.8}`} fill="none" stroke={colors.card} strokeWidth={0.7 * scale} strokeLinecap="round" />
              <Label x={s.x} y={s.y + t + 5.5 * scale} text={node.name} scale={scale} />
            </G>
          );
        }
        if (node.type === 'parking') {
          const w = 8 * scale;
          const h = 5 * scale;
          return (
            <G key={node.id}>
              <Rect x={s.x - w} y={s.y - h} width={w * 2} height={h * 2} rx={1.8 * scale} fill="#8C8577" opacity={0.55} />
              {[-0.5, 0, 0.5].map((f) => (
                <Line key={f} x1={s.x + f * w} y1={s.y - h * 0.8} x2={s.x + f * w} y2={s.y + h * 0.8} stroke="#F6EEDC" strokeWidth={0.6 * scale} />
              ))}
              <Label x={s.x} y={s.y + h + 5 * scale} text={node.name} scale={scale} />
            </G>
          );
        }
        if (node.type === 'workshop') {
          const w = 5 * scale;
          return (
            <G key={node.id}>
              <Rect x={s.x - w} y={s.y - w * 0.6} width={w * 2} height={w * 1.4} rx={1 * scale} fill="#B8A07A" />
              <Path d={`M${s.x - w * 1.15} ${s.y - w * 0.6} L${s.x} ${s.y - w * 1.3} L${s.x + w * 1.15} ${s.y - w * 0.6} Z`} fill={colors.surfaceElevated} />
              <Label x={s.x} y={s.y + w + 5 * scale} text={node.name} scale={scale} />
            </G>
          );
        }
        return null;
      })}

      {/* Vignette on top of terrain */}
      <Rect x={0} y={0} width={width} height={height} rx={radius.lg} fill="url(#vignette)" />
    </Svg>
  );
}

export const MapTerrain = memo(MapTerrainImpl);
