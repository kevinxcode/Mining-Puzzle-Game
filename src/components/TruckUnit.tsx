/**
 * MINING FLOW — truck marker on the mining map.
 * Color + state are duplicated in the equipment sheet text for accessibility.
 */

import { Circle, G, Path, Rect, Text as SvgText } from 'react-native-svg';
import { colors } from '@/theme/tokens';
import type { Point, TruckRuntimeState } from '@/types/game';

interface TruckUnitProps {
  /** Screen coordinates. */
  position: Point;
  scale: number;
  loadFraction: number;
  state: TruckRuntimeState;
  label: string;
  selected: boolean;
  onPress: () => void;
}

const STATE_COLORS: Record<TruckRuntimeState, string> = {
  idle: colors.textMuted,
  'driving-to-loader': colors.info,
  queueing: colors.warning,
  loading: colors.secondary,
  hauling: colors.primary,
  dumping: colors.success,
  returning: colors.info,
  'to-fuel': colors.warning,
  refueling: colors.info,
  breakdown: colors.danger,
};

/** States where the truck sits on a node; drawn beside it so the node icon stays visible. */
const PARKED_STATES: ReadonlySet<TruckRuntimeState> = new Set(['queueing', 'loading', 'dumping']);

export function TruckUnit({
  position: nodePosition,
  scale,
  loadFraction,
  state,
  label,
  selected,
  onPress,
}: TruckUnitProps) {
  const r = 7 * scale;
  const position = PARKED_STATES.has(state)
    ? { x: nodePosition.x + r * 2.4, y: nodePosition.y + r * 0.6 }
    : nodePosition;
  const color = STATE_COLORS[state];
  // Icon is drawn in a 24x24 box centred on the origin, then scaled to the badge.
  const k = r / 12;
  const fill = Math.max(0, Math.min(1, loadFraction));
  const bedHeight = 7;
  const labelWidth = (label.length * 3.4 + 4) * scale;
  const loadHeight = bedHeight * fill;
  return (
    <G onPress={onPress}>
      {selected ? (
        <Circle
          cx={position.x}
          cy={position.y}
          r={r * 1.6}
          fill="none"
          stroke={colors.primary}
          strokeWidth={1.5 * scale}
        />
      ) : null}
      <Circle cx={position.x} cy={position.y} r={r} fill={color} stroke={colors.card} strokeWidth={1.2 * scale} />
      <G transform={`translate(${position.x} ${position.y}) scale(${k})`}>
        {/* Dump bed with material heaped inside by load fraction */}
        <Path d="M-9.5 -4 L3 -4 L3 3 L-8 3 Z" fill={colors.surface} />
        {loadHeight > 0 ? (
          <Rect x={-8.5} y={3 - loadHeight} width={10.5} height={loadHeight} fill={colors.secondary} />
        ) : null}
        {/* Cab */}
        <Path d="M3.8 -3 L7 -3 L9.5 0.5 L9.5 3 L3.8 3 Z" fill={colors.card} />
        <Path d="M5 -2 L6.6 -2 L8.2 0.4 L5 0.4 Z" fill={colors.info} />
        {/* Chassis + wheels */}
        <Rect x={-9} y={3} width={18.5} height={1.6} fill={colors.surface} />
        <Circle cx={-5.5} cy={5.6} r={2.4} fill={colors.surface} stroke={colors.card} strokeWidth={0.8} />
        <Circle cx={6} cy={5.6} r={2.4} fill={colors.surface} stroke={colors.card} strokeWidth={0.8} />
      </G>
      {/* Label pill above the badge, drawn over map text so it stays readable. */}
      <Rect
        x={position.x - labelWidth / 2}
        y={position.y - r - 9.5 * scale}
        width={labelWidth}
        height={8 * scale}
        rx={4 * scale}
        fill={colors.surface}
        opacity={0.85}
      />
      <SvgText
        x={position.x}
        y={position.y - r - 3.4 * scale}
        fontSize={5.5 * scale}
        fill={colors.textOnDark}
        textAnchor="middle"
        fontWeight="700"
      >
        {label}
      </SvgText>
    </G>
  );
}