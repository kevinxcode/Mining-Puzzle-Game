/**
 * MINING FLOW — truck marker on the mining map.
 * Rendered as a native overlay above the map SVG so movement can be tweened on the
 * UI thread (the simulation only re-renders ~10×/s). Color + state are duplicated in
 * the equipment sheet text for accessibility.
 */

import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
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
import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';
import { balance } from '@/game/config/balance';
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
  /** False while the simulation is paused/finished — freezes motion effects. */
  running: boolean;
  /** Which side of a node the truck parks on (-1 = left, near the right map edge). */
  parkSide?: 1 | -1;
  /** Show the name pill (zoomed in or selected) — keeps crowded maps readable. */
  showLabel?: boolean;
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
const MOVING_STATES: ReadonlySet<TruckRuntimeState> = new Set([
  'driving-to-loader',
  'hauling',
  'returning',
  'to-fuel',
]);

export function TruckUnit({
  position: nodePosition,
  scale,
  loadFraction,
  state,
  label,
  selected,
  running,
  parkSide = 1,
  showLabel = true,
  onPress,
}: TruckUnitProps) {
  const reduceMotion = useReducedMotion();
  const r = 7 * scale;
  const target = PARKED_STATES.has(state)
    ? { x: nodePosition.x + parkSide * r * 2.4, y: nodePosition.y + r * 0.6 }
    : nodePosition;
  const moving = running && MOVING_STATES.has(state);
  const dumping = running && state === 'dumping';

  // Glide to each new simulation position over one sim interval.
  const x = useSharedValue(target.x);
  const y = useSharedValue(target.y);
  useEffect(() => {
    const config = { duration: reduceMotion ? 0 : balance.simIntervalMs, easing: Easing.linear };
    x.value = withTiming(target.x, config);
    y.value = withTiming(target.y, config);
  }, [target.x, target.y, reduceMotion, x, y]);

  // Engine bob while driving, tilt while dumping, dust puff loop behind the truck.
  const bob = useSharedValue(0);
  const tilt = useSharedValue(0);
  const dust = useSharedValue(0);
  useEffect(() => {
    if (moving && !reduceMotion) {
      bob.value = withRepeat(withSequence(withTiming(-0.8 * scale, { duration: 140 }), withTiming(0, { duration: 140 })), -1);
      dust.value = withRepeat(withTiming(1, { duration: 700, easing: Easing.out(Easing.quad) }), -1);
    } else {
      cancelAnimation(bob);
      cancelAnimation(dust);
      bob.value = withTiming(0, { duration: 120 });
      dust.value = 0;
    }
  }, [moving, reduceMotion, scale, bob, dust]);
  useEffect(() => {
    tilt.value = withTiming(dumping && !reduceMotion ? -14 : 0, { duration: 350 });
  }, [dumping, reduceMotion, tilt]);

  const box = r * 4;
  const wrapStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value - box / 2 }, { translateY: y.value - box / 2 + bob.value }],
  }));
  const bodyStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${tilt.value}deg` }] }));
  const dustStyle = useAnimatedStyle(() => ({
    opacity: dust.value === 0 ? 0 : 0.55 * (1 - dust.value),
    transform: [{ translateX: -r * (0.9 + dust.value * 1.2) }, { scale: 0.6 + dust.value * 0.9 }],
  }));

  const color = STATE_COLORS[state];
  const fill = Math.max(0, Math.min(1, loadFraction));
  const bedHeight = 7;
  const loadHeight = bedHeight * fill;
  const center = box / 2;
  const k = r / 12;

  return (
    <Animated.View pointerEvents="box-none" style={[styles.wrap, { width: box, height: box }, wrapStyle]}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.dust,
          { width: r, height: r, borderRadius: r / 2, left: center - r / 2, top: center + r * 0.2 },
          dustStyle,
        ]}
      />
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${label}, ${state.replace(/-/g, ' ')}, load ${Math.round(fill * 100)}%`}
        hitSlop={8}
        style={StyleSheet.absoluteFill}
      >
        <Animated.View style={[StyleSheet.absoluteFill, bodyStyle]}>
          <Svg width={box} height={box}>
            {selected ? (
              <Circle cx={center} cy={center} r={r * 1.6} fill="none" stroke={colors.primary} strokeWidth={1.5 * scale} />
            ) : null}
            <Ellipse cx={center + 0.8 * scale} cy={center + r * 0.95} rx={r * 0.95} ry={r * 0.32} fill="rgba(60,45,30,0.3)" />
            <Circle cx={center} cy={center} r={r} fill={color} stroke={colors.card} strokeWidth={1.2 * scale} />
            <G transform={`translate(${center} ${center}) scale(${k})`}>
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
          </Svg>
        </Animated.View>
      </Pressable>
      {/* Label pill above the badge */}
      {showLabel || selected ? (
      <View
        pointerEvents="none"
        style={[styles.label, { bottom: center + r + 1.5 * scale, borderRadius: 4 * scale, paddingHorizontal: 2.5 * scale }]}
      >
        <Text style={[styles.labelText, { fontSize: 4.2 * scale }]} numberOfLines={1}>
          {label}
        </Text>
      </View>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, top: 0, alignItems: 'center' },
  dust: { position: 'absolute', backgroundColor: colors.mapWall },
  label: { position: 'absolute', backgroundColor: 'rgba(28,31,36,0.85)', alignSelf: 'center' },
  labelText: { color: colors.textOnDark, fontWeight: '700' },
});
