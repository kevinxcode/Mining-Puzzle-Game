/**
 * Vertical gradient scrim over background art so text stays readable.
 */

import { StyleSheet } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { colors, layout } from '@/theme/tokens';

interface ScrimProps {
  /** Opacity at the top of the screen. */
  topOpacity?: number;
  /** Opacity at the bottom of the screen. */
  bottomOpacity?: number;
}

export function Scrim({ topOpacity = 0.35, bottomOpacity = 0.9 }: ScrimProps) {
  return (
    <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" pointerEvents="none">
      <Defs>
        <LinearGradient id="scrim" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={colors.scrim} stopOpacity={topOpacity} />
          <Stop offset={String(layout.scrimStart)} stopColor={colors.scrim} stopOpacity={topOpacity * 0.4} />
          <Stop offset="1" stopColor={colors.scrim} stopOpacity={bottomOpacity} />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill="url(#scrim)" />
    </Svg>
  );
}
