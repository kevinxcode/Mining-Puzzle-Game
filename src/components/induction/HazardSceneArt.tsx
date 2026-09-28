/**
 * Illustrations for the hazard-spotting scenes (viewBox = SCENE_WIDTH × SCENE_HEIGHT).
 * Each hazard is drawn at its hotspot coordinates in src/game/induction/hazards.ts.
 */

import { memo, type ComponentType } from 'react';
import { Circle, Ellipse, G, Line, Path, Rect, Text as SvgText } from 'react-native-svg';
import { colors } from '@/theme/tokens';

const GROUND = '#E3D2B2';
const ROAD = '#CDB891';
const ROAD_EDGE = '#A99571';
const BENCH = '#C9AE84';
const SHADOW = 'rgba(60,45,30,0.25)';

/* ---------- reusable figures (drawn around a local origin) ---------- */

function Person({ x, y, vest = colors.primary }: { x: number; y: number; vest?: string }) {
  return (
    <G>
      <Ellipse cx={x} cy={y + 5.2} rx={2.6} ry={0.8} fill={SHADOW} />
      <Rect x={x - 1.6} y={y - 1} width={3.2} height={4.4} rx={1} fill={vest} />
      <Line x1={x - 0.8} y1={y + 3.4} x2={x - 1} y2={y + 5.2} stroke={colors.surface} strokeWidth={0.9} strokeLinecap="round" />
      <Line x1={x + 0.8} y1={y + 3.4} x2={x + 1} y2={y + 5.2} stroke={colors.surface} strokeWidth={0.9} strokeLinecap="round" />
      <Circle cx={x} cy={y - 2.4} r={1.4} fill="#E8B98E" />
      <Path d={`M${x - 1.6} ${y - 2.6} Q${x} ${y - 4.6} ${x + 1.6} ${y - 2.6} Z`} fill={colors.secondary} />
    </G>
  );
}

function HaulTruck({ x, y, flip = false, load = true }: { x: number; y: number; flip?: boolean; load?: boolean }) {
  return (
    <G transform={`translate(${x} ${y}) scale(${flip ? -1 : 1} 1)`}>
      <Ellipse cx={0} cy={6.2} rx={11} ry={1.6} fill={SHADOW} />
      {load ? <Path d="M-10 -3 Q-5 -8 0 -6 Q4 -8 6 -3 Z" fill="#B7784A" /> : null}
      <Path d="M-11 -3 L6 -3 L5.4 4 L-9 4 Z" fill={colors.primary} />
      <Path d="M6.6 -1 L10.6 -1 L12 2 L12 4.4 L6.6 4.4 Z" fill={colors.card} />
      <Path d="M7.6 -0.2 L10.2 -0.2 L11.2 1.8 L7.6 1.8 Z" fill={colors.info} />
      <Rect x={-10.5} y={4} width={22.5} height={1.2} fill={colors.surface} />
      <Circle cx={-6.5} cy={5.6} r={2.2} fill={colors.surface} />
      <Circle cx={8} cy={5.6} r={2.2} fill={colors.surface} />
    </G>
  );
}

function Excavator({ x, y }: { x: number; y: number }) {
  return (
    <G transform={`translate(${x} ${y})`}>
      <Ellipse cx={0} cy={6} rx={10} ry={1.8} fill={SHADOW} />
      <Rect x={-9} y={2.5} width={16} height={4} rx={2} fill={colors.surface} />
      <Rect x={-8} y={-2} width={13} height={5} rx={1} fill={colors.secondary} />
      <Path d="M-6 -2 L-6 -7 L-1.5 -7 L0 -2 Z" fill={colors.secondary} />
      <Path d="M-5.2 -6.2 L-2.2 -6.2 L-1.4 -3 L-5.2 -3 Z" fill={colors.info} />
      <Path d="M3 -1 L9 -11 L15 -5" fill="none" stroke={colors.surface} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M13.5 -5.5 L16.5 -5.5 L16 -1.5 L12.5 -1.5 Z" fill={colors.surface} />
    </G>
  );
}

function Pickup({ x, y }: { x: number; y: number }) {
  return (
    <G transform={`translate(${x} ${y})`}>
      <Ellipse cx={0} cy={3.4} rx={6} ry={1} fill={SHADOW} />
      <Rect x={-5.5} y={-1} width={11} height={3.6} rx={1} fill={colors.card} />
      <Path d="M-1 -1 L0.6 -3.6 L4 -3.6 L5.4 -1 Z" fill={colors.card} />
      <Path d="M1 -3 L3.6 -3 L4.6 -1.2 L1 -1.2 Z" fill={colors.info} />
      <Rect x={-2} y={-4.4} width={3} height={0.9} fill={colors.warning} />
      <Circle cx={-3} cy={2.8} r={1.3} fill={colors.surface} />
      <Circle cx={3} cy={2.8} r={1.3} fill={colors.surface} />
    </G>
  );
}

function Cone({ x, y }: { x: number; y: number }) {
  return (
    <G>
      <Path d={`M${x - 1.4} ${y + 1.4} L${x} ${y - 2.2} L${x + 1.4} ${y + 1.4} Z`} fill={colors.primary} />
      <Rect x={x - 0.8} y={y - 0.4} width={1.6} height={0.6} fill="#FFFFFF" />
    </G>
  );
}

function Berm({ d }: { d: string }) {
  return <Path d={d} fill="none" stroke="#9E855F" strokeWidth={3} strokeLinecap="round" />;
}

/* ---------- scenes ---------- */

function LoadingArea() {
  return (
    <G>
      <Rect x={0} y={0} width={100} height={130} fill={GROUND} />
      {/* Pit face and upper bench */}
      <Path d="M0 0 H100 V26 Q70 32 40 26 T0 30 Z" fill={BENCH} />
      <Path d="M0 30 Q20 26 40 26 T100 26" fill="none" stroke="#B0946A" strokeWidth={1.2} />
      {/* Haul road */}
      <Path d="M100 112 Q60 108 42 122 L40 130 H100 Z" fill={ROAD} />
      <Path d="M100 112 Q60 108 42 122" fill="none" stroke={ROAD_EDGE} strokeWidth={1} />
      {/* Bench edge at bottom-left with berm only on part of it (hazard: missing section) */}
      <Path d="M0 96 Q18 100 30 112 L30 130 H0 Z" fill="#B99D72" />
      <Berm d="M22 104 Q27 108 30 112" />
      {/* Loading operation */}
      <Excavator x={22} y={52} />
      <HaulTruck x={66} y={78} />
      {/* HAZARD swing-zone: person inside the swing radius */}
      <Person x={30} y={43} />
      {/* HAZARD blind-spot: light vehicle close behind the truck */}
      <Pickup x={80} y={90} />
      {/* HAZARD loose-rock on the haul road */}
      <Path d="M55 117 L57 115 L60 116 L61 119 L57 120 Z" fill="#8F877A" />
      <Path d="M61.5 118 L63 117 L64 119 L62.5 120 Z" fill="#8F877A" />
      {/* Safe elements */}
      <Cone x={44} y={86} />
      <Person x={90} y={20} vest={colors.success} />
    </G>
  );
}

function HaulRoad() {
  return (
    <G>
      <Rect x={0} y={0} width={100} height={130} fill={GROUND} />
      {/* Winding ramp */}
      <Path d="M10 130 Q14 90 40 72 T80 40 Q92 30 96 0 H80 Q76 22 66 32 T28 62 Q8 80 0 110 V130 Z" fill={ROAD} />
      <Path d="M10 130 Q14 90 40 72 T80 40 Q92 30 96 0" fill="none" stroke={ROAD_EDGE} strokeWidth={1} />
      {/* Outer berm with a gap on the curve (hazard curve-berm near 88,44) */}
      <Berm d="M97 0 Q97 22 94 34" />
      <Berm d="M84 52 Q60 68 48 76" />
      {/* One-way sign pointing up the ramp */}
      <Rect x={14} y={56} width={1} height={8} fill={colors.surface} />
      <Rect x={10} y={52} width={10} height={5} rx={1} fill={colors.info} />
      <Path d="M12 54.5 H17 M15.5 53 L17 54.5 L15.5 56" stroke="#FFFFFF" strokeWidth={0.8} fill="none" strokeLinecap="round" />
      {/* HAZARD wrong-way truck (heading down against the sign) */}
      <HaulTruck x={30} y={70} flip load={false} />
      {/* HAZARD pedestrian on the road */}
      <Person x={72} y={32} />
      {/* HAZARD unmarked breakdown: no cones, no triangle */}
      <G>
        <HaulTruck x={20} y={108} />
        <Path d="M16 98 q1 -3 2 0 q1 -3 2 0" fill="none" stroke="#8A8F98" strokeWidth={0.8} />
      </G>
      {/* Safe traffic: truck going the right way with cones on the shoulder */}
      <HaulTruck x={84} y={12} />
      <Cone x={6} y={40} />
    </G>
  );
}

function RefuelBay() {
  return (
    <G>
      <Rect x={0} y={0} width={100} height={130} fill="#D9CDB6" />
      {/* Concrete pad with bund */}
      <Rect x={8} y={20} width={84} height={100} rx={3} fill="#C9C3B6" stroke="#A8A193" strokeWidth={1.2} />
      {/* Canopy */}
      <Rect x={14} y={8} width={30} height={6} rx={1} fill={colors.surfaceElevated} />
      {/* Fuel pump */}
      <Rect x={30} y={30} width={8} height={14} rx={1} fill={colors.info} />
      <Rect x={31.5} y={32} width={5} height={4} fill={colors.card} />
      <Path d="M38 38 Q46 40 52 52" fill="none" stroke={colors.surface} strokeWidth={1} />
      {/* NO SMOKING sign */}
      <Circle cx={42} cy={24} r={3} fill="#FFFFFF" stroke={colors.danger} strokeWidth={0.8} />
      <Line x1={40} y1={22} x2={44} y2={26} stroke={colors.danger} strokeWidth={0.8} />
      {/* HAZARD smoking: person with cigarette and smoke */}
      <Person x={22} y={40} vest={colors.success} />
      <Line x1={23.5} y1={38.5} x2={25.5} y2={37.5} stroke="#FFFFFF" strokeWidth={0.5} />
      <Path d="M26 37 q1 -2 0 -3 q-1 -1.5 0.5 -3" fill="none" stroke="#9AA0A6" strokeWidth={0.5} />
      {/* HAZARD engine running: truck with exhaust fumes */}
      <HaulTruck x={64} y={62} load={false} />
      <Path d="M76 52 q1.5 -3 0 -5 q-1.5 -2 0.5 -4" fill="none" stroke="#6B7078" strokeWidth={0.9} />
      <Circle cx={76.5} cy={42} r={1.4} fill="#9AA0A6" opacity={0.7} />
      {/* HAZARD spill: puddle of diesel with sheen */}
      <Ellipse cx={48} cy={96} rx={8} ry={3.6} fill="#5B5446" opacity={0.75} />
      <Ellipse cx={46} cy={95} rx={3} ry={1} fill="#9C7BD3" opacity={0.5} />
      {/* Spill kit present but unused */}
      <Rect x={14} y={104} width={7} height={8} rx={1} fill={colors.warning} />
      <SvgText x={17.5} y={109.5} fontSize={2.6} fill={colors.surface} textAnchor="middle" fontWeight="700">
        KIT
      </SvgText>
      {/* HAZARD no-extinguisher: empty red bracket */}
      <Rect x={86} y={106} width={4} height={12} rx={0.8} fill="none" stroke={colors.danger} strokeWidth={1} />
      <Rect x={86.5} y={105} width={3} height={1.2} fill={colors.danger} />
    </G>
  );
}

const SCENES: Record<string, ComponentType> = {
  'loading-area': LoadingArea,
  'haul-road': HaulRoad,
  'refuel-bay': RefuelBay,
};

function HazardSceneArtImpl({ sceneId }: { sceneId: string }) {
  const Scene = SCENES[sceneId];
  return Scene ? <Scene /> : null;
}

export const HazardSceneArt = memo(HazardSceneArtImpl);
