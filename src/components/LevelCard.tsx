/**
 * MINING FLOW — campaign level node.
 */

import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Lock } from 'lucide-react-native';
import { colors, radius, shadows, spacing, typography } from '@/theme/tokens';
import { hapticSelection } from '@/services/haptics';
import { playSfx } from '@/services/audio';
import { StarRating } from './StarRating';

interface LevelCardProps {
  levelNumber: number;
  name: string;
  accent: string;
  stars: number;
  locked: boolean;
  onPress: () => void;
}

export function LevelCard({
  levelNumber,
  name,
  accent,
  stars,
  locked,
  onPress,
}: LevelCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Level ${levelNumber}: ${name}${locked ? ' (locked)' : ''}`}
      accessibilityState={{ disabled: locked }}
      disabled={locked}
      onPress={() => {
        playSfx('tap');
        hapticSelection();
        onPress();
      }}
      style={({ pressed }) => [
        styles.card,
        { opacity: locked ? 0.55 : pressed ? 0.9 : 1 },
      ]}
    >
      <View style={[styles.badge, { backgroundColor: locked ? colors.textMuted : accent }]}>
        {locked ? (
          <Lock size={14} color={colors.textOnDark} />
        ) : (
          <Text style={styles.badgeText}>{levelNumber}</Text>
        )}
      </View>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>
        <StarRating count={stars} size={12} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    ...shadows.soft,
  },
  badge: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { ...typography.heading, color: colors.textOnDark },
  info: { flex: 1, gap: 2 },
  name: { ...typography.body, color: colors.text },
});