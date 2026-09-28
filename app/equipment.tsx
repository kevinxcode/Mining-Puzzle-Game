/**
 * Equipment — catalog with unlock states and coin upgrades.
 * All equipment unlocks through gameplay; upgrades cost coins.
 */

import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Coins, Lock, Pickaxe, Sparkles, Truck } from 'lucide-react-native';
import { colors, iconSizes, layout, radius, shadows, spacing, typography } from '@/theme/tokens';
import {
  EQUIPMENT_CATALOG,
  UPGRADES,
  upgradeCost,
  upgradeLevelOf,
  type EquipmentCatalogEntry,
  isEquipmentUnlocked,
  upgradeEffectLabel,
} from '@/game/config/equipment';
import { balance } from '@/game/config/balance';
import { playerLevelFromXp } from '@/state/save';
import { useProgression } from '@/state/progressionStore';
import { formatNumber } from '@/utils/format';
import { FadeInView } from '@/components/FadeInView';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ScreenHeader } from '@/components/ScreenHeader';
import { StatCard } from '@/components/StatCard';

export default function EquipmentScreen() {
  const xp = useProgression((s) => s.xp);
  const coins = useProgression((s) => s.coins);
  const upgrades = useProgression((s) => s.upgrades);
  const buyUpgrade = useProgression((s) => s.buyUpgrade);
  const playerLevel = playerLevelFromXp(xp);
  const levelsCompleted = useProgression((s) => s.statistics.levelsCompleted);

  const renderEntry = (entry: EquipmentCatalogEntry, index: number) => {
    const unlocked = isEquipmentUnlocked(entry, levelsCompleted);
    return (
      <FadeInView
        key={entry.id}
        index={index}
        style={[styles.entryCard, !unlocked && styles.entryLocked]}
      >
        <View
          style={styles.entryRow}
          accessible
          accessibilityLabel={`${entry.name}: ${unlocked ? entry.details : `locked, unlocks after completing ${entry.unlockAfterLevels} campaign levels`}`}
        >
          <View style={[styles.entryIcon, !unlocked && styles.entryIconLocked]}>
            {!unlocked ? (
              <Lock size={iconSizes.xs} color={colors.textMuted} />
            ) : entry.kind === 'truck' ? (
              <Truck size={iconSizes.sm} color={colors.secondary} />
            ) : (
              <Pickaxe size={iconSizes.sm} color={colors.secondary} />
            )}
          </View>
          <View style={styles.entryInfo}>
            <Text style={styles.entryName}>{entry.name}</Text>
            <Text style={styles.entryDetails}>
              {unlocked ? entry.details : `Unlocks after ${entry.unlockAfterLevels} campaign levels (${levelsCompleted}/${entry.unlockAfterLevels})`}
            </Text>
          </View>
        </View>
      </FadeInView>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader
        title="Equipment"
        subtitle="Fleet catalog & upgrades"
        right={
          <View style={[styles.coinsBadge, shadows.soft]} accessibilityLabel={`${coins} coins`}>
            <Coins size={iconSizes.xs} color={colors.primary} />
            <Text style={styles.coinsText}>{formatNumber(coins)}</Text>
          </View>
        }
      />
      <ScrollView contentContainerStyle={styles.content}>
        <FadeInView style={styles.statRow}>
          <StatCard label="Player level" value={`LV ${playerLevel}`} icon={<Sparkles size={iconSizes.sm} color={colors.primary} />} />
          <StatCard
            label="Coins"
            value={formatNumber(coins)}
            accent={colors.warning}
            icon={<Coins size={iconSizes.sm} color={colors.warning} />}
          />
        </FadeInView>

        <Text style={styles.sectionTitle}>Upgrades</Text>
        {UPGRADES.map((def, i) => {
          const level = upgradeLevelOf(upgrades, def.id);
          const maxed = level >= balance.maxUpgradeLevel;
          const cost = upgradeCost(upgrades, def);
          const affordable = coins >= cost;
          return (
            <FadeInView key={def.id} index={i + 1} style={styles.upgradeCard}>
              <View style={styles.upgradeInfo}>
                <Text style={styles.upgradeName}>
                  {def.name} <Text style={styles.upgradeTarget}>({def.target})</Text>
                </Text>
                <Text style={styles.upgradeDesc}>{def.description}</Text>
                <Text style={styles.upgradeEffect}>{upgradeEffectLabel(def, level)}</Text>
                <View style={styles.pips} accessible accessibilityLabel={`Level ${level} of ${balance.maxUpgradeLevel}`}>
                  {Array.from({ length: balance.maxUpgradeLevel }, (_, p) => (
                    <View key={p} style={[styles.pip, p < level && styles.pipOn]} />
                  ))}
                </View>
              </View>
              <PrimaryButton
                label={maxed ? 'MAX' : `${cost}`}
                accessibilityLabel={maxed ? `${def.name} maxed` : `Buy ${def.name} for ${cost} coins`}
                icon={maxed ? undefined : <Coins size={iconSizes.xs} color={colors.textOnDark} />}
                disabled={maxed || !affordable}
                onPress={() => buyUpgrade(def.id)}
                style={styles.upgradeButton}
              />
            </FadeInView>
          );
        })}

        <Text style={styles.sectionTitle}>Trucks</Text>
        {EQUIPMENT_CATALOG.filter((e) => e.kind === 'truck').map(renderEntry)}

        <Text style={styles.sectionTitle}>Excavators</Text>
        {EQUIPMENT_CATALOG.filter((e) => e.kind === 'excavator').map(renderEntry)}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  upgradeEffect: { ...typography.caption, color: colors.info, fontWeight: '700' },
  safe: { flex: 1, backgroundColor: colors.background },
  coinsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.card,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
  },
  coinsText: { ...typography.label, color: colors.text },
  content: {
    padding: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing.xxl,
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
  },
  statRow: { flexDirection: 'row', gap: spacing.md },
  sectionTitle: { ...typography.heading, color: colors.text, marginTop: spacing.md },
  entryCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    ...shadows.soft,
  },
  entryRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  entryLocked: { opacity: 0.6 },
  entryIcon: {
    width: layout.iconBadge,
    height: layout.iconBadge,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  entryIconLocked: { backgroundColor: colors.surfaceMuted },
  entryInfo: { flex: 1, gap: 2 },
  entryName: { ...typography.body, fontWeight: '700', color: colors.text },
  entryDetails: { ...typography.caption, color: colors.textMuted },
  upgradeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    ...shadows.soft,
  },
  upgradeInfo: { flex: 1, gap: 2 },
  upgradeName: { ...typography.body, fontWeight: '700', color: colors.text },
  upgradeTarget: { ...typography.caption, color: colors.textMuted },
  upgradeDesc: { ...typography.caption, color: colors.textMuted },
  pips: { flexDirection: 'row', gap: spacing.xs, marginTop: spacing.xs },
  pip: { width: spacing.lg, height: spacing.xs + 2, borderRadius: radius.pill, backgroundColor: colors.surfaceMuted },
  pipOn: { backgroundColor: colors.primary },
  upgradeButton: { minWidth: 96, paddingHorizontal: spacing.md },
});
