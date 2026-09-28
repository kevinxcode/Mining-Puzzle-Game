/**
 * Equipment — catalog with unlock states and coin upgrades.
 * All equipment unlocks through gameplay; upgrades cost coins.
 */

import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Check, Coins, Lock, Pickaxe, Sparkles, Star, Truck } from 'lucide-react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { LIVERIES, isLiveryOwned, type Livery } from '@/game/config/liveries';
import { PressableScale } from '@/components/PressableScale';
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
  const cosmetics = useProgression((s) => s.cosmetics);
  const threeStars = useProgression((s) => s.statistics.threeStarLevels);
  const buyLivery = useProgression((s) => s.buyLivery);
  const selectLivery = useProgression((s) => s.selectLivery);
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

        <Text style={styles.sectionTitle}>Liveries</Text>
        <Text style={styles.upgradeDesc}>Cosmetic paint for your haul fleet. No effect on performance.</Text>
        <View style={styles.liveryGrid}>
          {LIVERIES.map((livery) => {
            const owned = isLiveryOwned(cosmetics, livery, threeStars);
            const equipped = cosmetics.livery === livery.id;
            const starLocked = livery.unlockThreeStars !== undefined && !owned;
            const affordable = coins >= livery.cost;
            const onPress = () => (owned ? selectLivery(livery.id) : buyLivery(livery.id));
            const status = equipped
              ? 'Equipped'
              : owned
                ? 'Tap to equip'
                : starLocked
                  ? `${threeStars}/${livery.unlockThreeStars} 3★ levels`
                  : `${livery.cost} coins`;
            return (
              <PressableScale
                key={livery.id}
                onPress={onPress}
                disabled={equipped || starLocked || (!owned && !affordable)}
                accessibilityRole="button"
                accessibilityState={{ selected: equipped }}
                accessibilityLabel={`${livery.name} livery, ${status}`}
                style={[styles.liveryCard, equipped && styles.liveryEquipped, (starLocked || (!owned && !affordable)) && styles.entryLocked]}
              >
                <LiveryPreview livery={livery} />
                <Text style={styles.upgradeName} numberOfLines={1}>{livery.name}</Text>
                <View style={styles.liveryStatus}>
                  {equipped ? (
                    <Check size={iconSizes.xs} color={colors.success} />
                  ) : owned ? null : starLocked ? (
                    <Star size={iconSizes.xs} color={colors.warning} />
                  ) : (
                    <Coins size={iconSizes.xs} color={colors.primary} />
                  )}
                  <Text style={styles.upgradeDesc} numberOfLines={1}>{status}</Text>
                </View>
              </PressableScale>
            );
          })}
        </View>

        <Text style={styles.sectionTitle}>Trucks</Text>
        {EQUIPMENT_CATALOG.filter((e) => e.kind === 'truck').map(renderEntry)}

        <Text style={styles.sectionTitle}>Excavators</Text>
        {EQUIPMENT_CATALOG.filter((e) => e.kind === 'excavator').map(renderEntry)}
      </ScrollView>
    </SafeAreaView>
  );
}

function LiveryPreview({ livery }: { livery: Livery }) {
  return (
    <Svg width={72} height={44} viewBox="-11 -6 22 13">
      <Path d="M-9.5 -4 L3 -4 L3 3 L-8 3 Z" fill={livery.bed} />
      <Path d="M3.8 -3 L7 -3 L9.5 0.5 L9.5 3 L3.8 3 Z" fill={livery.cab} stroke={colors.surfaceMuted} strokeWidth={0.3} />
      <Path d="M5 -2 L6.6 -2 L8.2 0.4 L5 0.4 Z" fill={livery.glass} />
      <Rect x={-9} y={3} width={18.5} height={1.6} fill={colors.surface} />
      <Rect x={-7.9} y={3.2} width={4.8} height={4.8} rx={2.4} fill={colors.surface} />
      <Rect x={3.6} y={3.2} width={4.8} height={4.8} rx={2.4} fill={colors.surface} />
    </Svg>
  );
}

const styles = StyleSheet.create({
  liveryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  liveryCard: {
    width: '31%',
    flexGrow: 1,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.sm,
    alignItems: 'center',
    gap: 2,
    borderWidth: 2,
    borderColor: 'transparent',
    ...shadows.soft,
  },
  liveryEquipped: { borderColor: colors.success },
  liveryStatus: { flexDirection: 'row', alignItems: 'center', gap: 4 },
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
