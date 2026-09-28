/**
 * MINING FLOW — excavator marker on the mining map.
 * Native overlay (like TruckUnit) so the arm can swing on the UI thread while the
 * excavator loads a truck; material bits drop from the bucket on each swing.
 */

import { useEffect } from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';
import { colors } from '@/theme/tokens';
import type { Point } from '@/types/game';

interface ExcavatorUnitProps {
  /** Screen coordinates. */
  position: Point;
  scale: number;
  materialColor: string;
  label: string;
  loading: boolean;
  /** False while the simulation is paused/finished — freezes the swing. */
  running: boolean;
}

/** One dig-swing-dump cycle of the arm, in ms. */
const SWING_MS = 650;

export function ExcavatorUnit({ position, scale, materialColor, label, loading, running }: ExcavatorUnitProps) {
  const reduceMotion = useReducedMotion();
  const size = 16 * scale;
  const box = size * 2.2;
  const center = box / 2;
  // Icon is drawn in a 24x24 box centred on the origin, then scaled to the badge.
  const k = size / 24;
  const pivot = { x: center + 1 * k, y: center + 1 * k };
  const animate = loading && running && !reduceMotion;

  const swing = useSharedValue(0);
  useEffect(() => {
    if (animate) {
      swing.value = withRepeat(
        withSequence(
          withTiming(-22, { duration: SWING_MS, easing: Easing.inOut(Easing.quad) }),
          withTiming(6, { duration: SWING_MS, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
      );
    } else {
      cancelAnimation(swing);
      swing.value = withTiming(0, { duration: 200 });
    }
  }, [animate, swing]);

  const armStyle = useAnimatedStyle(() => ({
    transformOrigin: [pivot.x, pivot.y, 0],
    transform: [{ rotate: `${swing.value}deg` }],
  }));
  // Bits fall from the bucket while the arm swings back over the truck.
  const bitsStyle = useAnimatedStyle(() => {
    const phase = Math.max(0, Math.min(1, (swing.value + 4) / 10));
    return {
      opacity: animate ? phase : 0,
      transform: [{ translateY: phase * 5 * scale }],
    };
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.wrap, { width: box, height: box, left: position.x - center, top: position.y - center }]}
    >
      <Svg width={box} height={box} style={StyleSheet.absoluteFill}>
        {loading ? (
          <Circle cx={center} cy={center} r={size * 0.95} fill="none" stroke={colors.secondary} strokeWidth={1.5 * scale} />
        ) : null}
        <Rect
          x={center - size / 2}
          y={center - size / 2}
          width={size}
          height={size}
          rx={3.5 * scale}
          fill={materialColor}
          stroke={colors.card}
          strokeWidth={1.2 * scale}
        />
        <G transform={`translate(${center} ${center}) scale(${k})`}>
          {/* Tracks */}
          <Rect x={-9.5} y={5} width={13} height={4} rx={2} fill={colors.surface} />
          <Circle cx={-7.5} cy={7} r={1} fill={colors.textOnDarkMuted} />
          <Circle cx={1.5} cy={7} r={1} fill={colors.textOnDarkMuted} />
          {/* Upper body + cab */}
          <Rect x={-8.5} y={0} width={11} height={4.5} rx={1} fill={colors.secondary} />
          <Path d="M-6.5 0 L-6.5 -5 L-2 -5 L-0.5 0 Z" fill={colors.secondary} />
          <Path d="M-5.5 -4 L-2.6 -4 L-1.7 -1 L-5.5 -1 Z" fill={colors.info} />
        </G>
      </Svg>
      {/* Boom, stick and bucket swing around the boom foot */}
      <Animated.View style={[StyleSheet.absoluteFill, armStyle]}>
        <Svg width={box} height={box}>
          <G transform={`translate(${center} ${center}) scale(${k})`}>
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
        </Svg>
      </Animated.View>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, bitsStyle]}>
        <Svg width={box} height={box}>
          <Circle cx={center + 10 * k} cy={center + 2 * k} r={0.9 * scale} fill={materialColor} />
          <Circle cx={center + 11.5 * k} cy={center + 3.5 * k} r={0.7 * scale} fill={materialColor} />
        </Svg>
      </Animated.View>
      <Text style={[styles.label, { left: center - 100, top: center + size / 2 + 1.5 * scale, fontSize: 6.5 * scale }]} numberOfLines={1}>
        {label}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', alignItems: 'center' },
  label: { position: 'absolute', color: colors.text, fontWeight: '700', width: 200, textAlign: 'center' },
});
