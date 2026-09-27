/**
 * MINING FLOW — achievements screen.
 */

import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Check, ChevronLeft, Lock, Trophy } from 'lucide-react-native';
import { colors, radius, shadows, spacing, typography } from '@/theme/tokens';
import { ACHIEVEMENTS } from '@/game/achievements';
import { useProgression } from '@/state/progressionStore';
import { IconButton } from '@/components/IconButton';

export default function AchievementsScreen() {
  const router = useRouter();
  const achievements = useProgression((s) => s.achievements);
  const unlockedCount = ACHIEVEMENTS.filter((a) => achievements[a.id]).length;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <IconButton
          icon={<ChevronLeft size={20} color={colors.textOnDark} />}
          accessibilityLabel="Back"
          onPress={() => router.back()}
        />
        <Text style={styles.title}>Achievements</Text>
        <View style={styles.headerSpacer} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.summary}>
          <Trophy size={22} color={colors.secondary} />
          <Text style={styles.summaryText}>
            {unlockedCount} / {ACHIEVEMENTS.length} unlocked
          </Text>
        </View>
        {ACHIEVEMENTS.map((achievement) => {
          const unlocked = Boolean(achievements[achievement.id]);
          return (
            <View key={achievement.id} style={[styles.card, !unlocked && styles.cardLocked]}>
              <View style={[styles.icon, unlocked && styles.iconUnlocked]}>
                {unlocked ? (
                  <Check size={18} color={colors.textOnDark} />
                ) : (
                  <Lock size={16} color={colors.textMuted} />
                )}
              </View>
              <View style={styles.info}>
                <Text style={styles.name}>{achievement.name}</Text>
                <Text style={styles.description}>{achievement.description}</Text>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  headerSpacer: { width: 44 },
  title: { ...typography.title, color: colors.text },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    ...shadows.soft,
  },
  summaryText: { ...typography.heading, color: colors.text },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    ...shadows.soft,
  },
  cardLocked: { opacity: 0.6 },
  icon: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconUnlocked: { backgroundColor: colors.success },
  info: { flex: 1, gap: 2 },
  name: { ...typography.body, color: colors.text },
  description: { ...typography.caption, color: colors.textMuted },
});