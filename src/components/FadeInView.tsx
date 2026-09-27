/**
 * Staggered entrance (fade + small rise). Pass `index` for list stagger.
 */

import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { animation } from '@/theme/tokens';

interface FadeInViewProps {
  index?: number;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function FadeInView({ index = 0, children, style }: FadeInViewProps) {
  return (
    <Animated.View
      entering={FadeInDown.duration(animation.slow).delay(Math.min(index, 10) * animation.stagger)}
      style={style}
    >
      {children}
    </Animated.View>
  );
}
