/**
 * MINING FLOW — star rating display.
 */

import { StyleSheet, View } from 'react-native';
import { Star } from 'lucide-react-native';
import { colors, spacing } from '@/theme/tokens';
import { useT } from '@/i18n';

interface StarRatingProps {
  /** Earned stars. */
  count: number;
  total?: number;
  size?: number;
}

export function StarRating({ count, total = 3, size = 18 }: StarRatingProps) {
  const { t } = useT();
  return (
    <View
      style={styles.row}
      accessibilityLabel={t('shell.stars.a11y', { count, total })}
      accessibilityRole="image"
    >
      {Array.from({ length: total }, (_, i) => (
        <Star
          key={i}
          size={size}
          color={i < count ? colors.secondary : colors.textMuted}
          fill={i < count ? colors.secondary : 'transparent'}
          style={styles.star}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  star: { marginRight: spacing.xs },
});