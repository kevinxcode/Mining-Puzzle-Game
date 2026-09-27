/**
 * MINING FLOW — excavator marker on the mining map.
 * A loading ring appears while the excavator is loading a truck.
 */

import { Circle, G, Path, Rect, Text as SvgText } from 'react-native-svg';
import { colors } from '@/theme/tokens';
import type { Point } from '@/types/game';

interface ExcavatorUnitProps {
  /** Screen coordinates. */
  position: Point;
  scale: number;
  materialColor: string;
  label: string;
  loading: boolean;
}

export function ExcavatorUnit({
  position,
  scale,
  materialColor,
  label,
  loading,
}: ExcavatorUnitProps) {
  const size = 16 * scale;
  // Icon is drawn in a 24x24 box centred on the origin, then scaled to the badge.
  const k = size / 24;
  return (
    <G>
      {loading ? (
        <Circle
          cx={position.x}
          cy={position.y}
          r={size * 0.95}
          fill="none"
          stroke={colors.secondary}
          strokeWidth={1.5 * scale}
        />
      ) : null}
      <Rect
        x={position.x - size / 2}
        y={position.y - size / 2}
        width={size}
        height={size}
        rx={3.5 * scale}
        fill={materialColor}
        stroke={colors.card}
        strokeWidth={1.2 * scale}
      />
      <G transform={`translate(${position.x} ${position.y}) scale(${k})`}>
        {/* Tracks */}
        <Rect x={-9.5} y={5} width={13} height={4} rx={2} fill={colors.surface} />
        <Circle cx={-7.5} cy={7} r={1} fill={colors.textOnDarkMuted} />
        <Circle cx={1.5} cy={7} r={1} fill={colors.textOnDarkMuted} />
        {/* Upper body + cab */}
        <Rect x={-8.5} y={0} width={11} height={4.5} rx={1} fill={colors.secondary} />
        <Path d="M-6.5 0 L-6.5 -5 L-2 -5 L-0.5 0 Z" fill={colors.secondary} />
        <Path d="M-5.5 -4 L-2.6 -4 L-1.7 -1 L-5.5 -1 Z" fill={colors.info} />
        {/* Boom, stick and bucket */}
        <Path
          d="M1 1 L6 -8 L10.5 -3"
          fill="none"
          stroke={colors.surface}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Path d="M9 -3.5 L11.5 -3.5 L11 1 L7.5 1 Z" fill={colors.surface} />
      </G>
      <SvgText
        x={position.x}
        y={position.y + size / 2 + 7 * scale}
        fontSize={6.5 * scale}
        fill={colors.text}
        textAnchor="middle"
        fontWeight="700"
      >
        {label}
      </SvgText>
    </G>
  );
}