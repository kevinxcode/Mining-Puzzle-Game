/**
 * MINING FLOW — equipment screen.
 * Equipment catalog with unlock states and upgrade purchases.
 * All equipment unlocks through gameplay; upgrades cost coins.
 */

import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Coins, Lock } from 'lucide-react-native';
import { colors, radius, shadows, spacing, typography } from '@/theme/tokens';
import {
  EQUIPMENT_CATALOG,
  UPGRADES,
  upgradeCost,
  upgradeLevelOf,
  type EquipmentCatalogEntry,
} from '@/game/config/equipment';
import { balance } from '@/game/config/balance';
import { playerLevelFromXp } from '@/state/save';
import { useProgression } from '@/state/progressionStore';
import { formatNumber } from '@/utils/format';
import { IconButton } from '@/components/IconButton';
import { PrimaryButton } from '@/components/PrimaryButton';
import { StatCard } from '@/components/StatCard';

export default function EquipmentScreen() {
  const router = useRouter();
  const xp = useProgression((s) => s.xp);
  const coins = useProgression((s) => s.coins);
  const upgrades = useProgression((s) => s.upgrades);
  const buyUpgrade = useProgression((s) => s.buyUpgrade);
  const playerLevel = playerLevelFromXp(xp);

  const renderEntry = (entry: EquipmentCatalogEntry) => {
    const unlocked = playerLevel >= entry.unlockAtPlayerLevel;
    return (
      <View key={entry.id} style={[styles.entryCard, !unlocked && styles.entryLocked]}>
        <View style={styles.entryIcon}>
          {unlocked ? (
            <Text style={styles.entryIconText}>{entry.kind === 'truck' ? 'T' : 'E'}</Text>
          ) : (
            <Lock size={16} color={colors.textMuted} />
          )}
        </View>
        <View style={styles.entryInfo}>
          <Text style={styles.entryName}>{entry.name}</Text>
          <Text style={styles.entryDetails}>
            {unlocked ? entry.details : `Unlocks at player level ${entry.unlockAtPlayerLevel}`}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <IconButton
          icon={<ChevronLeft size={20} color={colors.textOnDark} />}
          accessibilityLabel="Back"
          onPress={() => router.back()}
        />
        <Text style={styles.title}>Equipment</Text>
        <View style={styles.coinsBadge}>
          <Coins size={16} color={colors.primary} />
          <Text style={styles.coinsText}>{formatNumber(coins)}</Text>
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.statRow}>
          <StatCard label="Player level" value={`LV ${playerLevel}`} />
          <StatCard label="Coins" value={formatNumber(coins)} accent={colors.secondary} />
        </View>

        <Text style={styles.sectionTitle}>Trucks</Text>
        {EQUIPMENT_CATALOG.filter((e) => e.kind === 'truck').map(renderEntry)}

        <Text style={styles.sectionTitle}>Excavators</Text>
        {EQUIPMENT_CATALOG.filter((e) => e.kind === 'excavator').map(renderEntry)}

        <Text style={styles.sectionTitle}>Upgrades</Text>
        {UPGRADES.map((def) => {
          const level = upgradeLevelOf(upgrades, def.id);
          const maxed = level >= balance.maxUpgradeLevel;
          const cost = upgradeCost(upgrades, def);
          const affordable = coins >= cost;
          return (
            <View key={def.id} style={styles.upgradeCard}>
              <View style={styles.upgradeInfo}>
                <Text style={styles.upgradeName}>
                  {def.name} <Text style={styles.upgradeTarget}>({def.target})</Text>
                </Text>
                <Text style={styles.upgradeDesc}>{def.description}</Text>
                <Text style={styles.upgradeLevel}>Level {level}/3</Text>
              </View>
              <PrimaryButton
                label={maxed ? 'MAX' : `${cost} C`}
                disabled={maxed || !affordable}
                onPress={() => buyUpgrade(def.id, cost)}
                style={styles.upgradeButton}
              />
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
  coinsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.card,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    ...shadows.soft,
  },
  coinsText: { ...typography.label, color: colors.text },
  title: { ...typography.title, color: colors.text },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  statRow: { flexDirection: 'row', gap: spacing.md },
  sectionTitle: { ...typography.heading, color: colors.text, marginTop: spacing.md },
  entryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    ...shadows.soft,
  },
  entryLocked: { opacity: 0.6 },
  entryIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  entryIconText: { ...typography.heading, color: colors.textOnDark },
  entryInfo: { flex: 1, gap: 2 },
  entryName: { ...typography.body, color: colors.text },
  entryDetails: { ...typography.caption, color: colors.textMuted },
  upgradeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    ...shadows.soft,
  },
  upgradeInfo: { flex: 1, gap: 2 },
  upgradeName: { ...typography.body, color: colors.text },
  upgradeTarget: { ...typography.caption, color: colors.textMuted },
  upgradeDesc: { ...typography.caption, color: colors.textMuted },
  upgradeLevel: { ...typography.tiny, color: colors.primary },
  upgradeButton: { minWidth: 96 },
});