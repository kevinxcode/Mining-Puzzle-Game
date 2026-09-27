/**
 * MINING FLOW — SVG route polyline.
 */

import { Path } from 'react-native-svg';
import type { Point } from '@/types/game';

interface RouteLineProps {
  points: Point[];
  color: string;
  width: number;
  dashed?: boolean;
  opacity?: number;
}

export function RouteLine({ points, color, width, dashed = false, opacity = 1 }: RouteLineProps) {
  if (points.length < 2) return null;
  const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  return (
    <Path
      d={d}
      stroke={color}
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeDasharray={dashed ? '5 5' : undefined}
      opacity={opacity}
      fill="none"
    />
  );
}