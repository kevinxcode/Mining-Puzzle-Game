/**
 * MINING FLOW — home screen.
 * Premium modern home: player level + XP, title, primary CONTINUE action,
 * navigation buttons and star/coin totals.
 */

import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Coins, Settings, Star } from 'lucide-react-native';
import { colors, radius, shadows, spacing, typography } from '@/theme/tokens';
import { LEVELS, getLevelByNumber } from '@/game/levels/levelFactory';
import { playerLevelFromXp } from '@/state/save';
import { useProgression } from '@/state/progressionStore';
import { formatNumber } from '@/utils/format';
import { IconButton } from '@/components/IconButton';
import { PrimaryButton } from '@/components/PrimaryButton';
import { playSfx, updateMusicPlayback } from '@/services/audio';
import { hapticLight } from '@/services/haptics';

export default function HomeScreen() {
  const router = useRouter();
  const xp = useProgression((s) => s.xp);
  const coins = useProgression((s) => s.coins);
  const levelRecords = useProgression((s) => s.levels);
  const lastPlayedLevelId = useProgression((s) => s.lastPlayedLevelId);

  useEffect(() => {
    updateMusicPlayback();
  }, []);

  const totalStars = Object.values(levelRecords).reduce((sum, r) => sum + r.stars, 0);
  const playerLevel = playerLevelFromXp(xp);

  // CONTINUE: the next uncompleted level, or the final level when everything is done.
  const nextUncompleted = LEVELS.find((l) => !levelRecords[l.id]);
  const continueLevel = nextUncompleted
    ? getLevelByNumber(Number(nextUncompleted.id))
    : lastPlayedLevelId
      ? getLevelByNumber(Number(lastPlayedLevelId))
      : LEVELS[0];

  const go = (path: string) => {
    playSfx('tap');
    hapticLight();
    router.push(path);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <View style={styles.levelBadge}>
            <Text style={styles.levelText}>LV {playerLevel}</Text>
          </View>
          <Text style={styles.xpText}>{formatNumber(xp)} XP</Text>
          <IconButton
            icon={<Settings size={20} color={colors.textOnDark} />}
            accessibilityLabel="Settings"
            onPress={() => go('/settings')}
          />
        </View>

        {/* Title */}
        <View style={styles.titleBlock}>
          <Text style={styles.title}>MINING FLOW</Text>
          <Text style={styles.subtitle}>Logistics Puzzle Game</Text>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <PrimaryButton
            label="▶  CONTINUE"
            onPress={() => go(`/level/${continueLevel.id}`)}
            style={styles.continueButton}
          />
          <PrimaryButton label="CAMPAIGN" variant="ghost" onPress={() => go('/campaign')} style={styles.menuButton} />
          <PrimaryButton label="EQUIPMENT" variant="ghost" onPress={() => go('/equipment')} style={styles.menuButton} />
          <PrimaryButton label="STATISTICS" variant="ghost" onPress={() => go('/statistics')} style={styles.menuButton} />
          <PrimaryButton label="ACHIEVEMENTS" variant="ghost" onPress={() => go('/achievements')} style={styles.menuButton} />
        </View>

        {/* Footer stats */}
        <View style={styles.footer}>
          <View style={styles.footerItem}>
            <Star size={18} color={colors.secondary} fill={colors.secondary} />
            <Text style={styles.footerText}>{formatNumber(totalStars)}</Text>
          </View>
          <View style={styles.footerItem}>
            <Coins size={18} color={colors.primary} />
            <Text style={styles.footerText}>{formatNumber(coins)}</Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  levelBadge: {
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    ...shadows.soft,
  },
  levelText: { ...typography.label, color: colors.textOnDark },
  xpText: { ...typography.body, color: colors.textMuted, flex: 1 },
  titleBlock: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.xs },
  title: { ...typography.display, color: colors.text, letterSpacing: 1.5 },
  subtitle: { ...typography.caption, color: colors.textMuted, letterSpacing: 2 },
  actions: { gap: spacing.md, marginBottom: spacing.xl },
  continueButton: { paddingVertical: spacing.lg },
  menuButton: { paddingVertical: spacing.md + 2 },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    ...shadows.soft,
  },
  footerItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  footerText: { ...typography.heading, color: colors.textOnDark },
});