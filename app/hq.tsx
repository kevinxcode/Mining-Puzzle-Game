/**
 * Site HQ — spend coins on facilities that give small, permanent bonuses
 * (hints, XP, coins). Nothing here changes how the simulation plays.
 */

import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Coins, Scale, UtensilsCrossed, Wrench } from 'lucide-react-native';
import { colors, iconSizes, layout, radius, shadows, spacing, typography } from '@/theme/tokens';
import {
  HQ_FACILITIES,
  facilityLevel,
  hqCoinMultiplier,
  hqExtraHints,
  hqXpMultiplier,
  nextFacilityCost,
  type FacilityId,
} from '@/game/config/siteHq';
import { HINTS_PER_RUN } from '@/game/engine/hintEngine';
import { useProgression } from '@/state/progressionStore';
import { formatNumber } from '@/utils/format';
import { FadeInView } from '@/components/FadeInView';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ScreenHeader } from '@/components/ScreenHeader';
import { playSfx } from '@/services/audio';
import { hapticSuccess } from '@/services/haptics';
import { useT } from '@/i18n';

const ICONS: Record<FacilityId, ReactNode> = {
  workshop: <Wrench size={iconSizes.md} color={colors.primary} />,
  canteen: <UtensilsCrossed size={iconSizes.md} color={colors.success} />,
  weighbridge: <Scale size={iconSizes.md} color={colors.info} />,
};

export default function SiteHqScreen() {
  const { t, tx } = useT();
  const coins = useProgression((s) => s.coins);
  const hq = useProgression((s) => s.hq);
  const buildFacility = useProgression((s) => s.buildFacility);

  const build = (id: FacilityId) => {
    if (buildFacility(id)) {
      playSfx('complete');
      hapticSuccess();
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader
        title={t('shell.hq.title')}
        subtitle={t('shell.hq.subtitle')}
        right={
          <View style={[styles.coinsBadge, shadows.soft]} accessibilityLabel={t('shell.common.coinsA11y', { count: coins })}>
            <Coins size={iconSizes.xs} color={colors.primary} />
            <Text style={styles.coinsText}>{formatNumber(coins)}</Text>
          </View>
        }
      />
      <ScrollView contentContainerStyle={styles.content}>
        <FadeInView style={[styles.summary, shadows.soft]}>
          <Bonus label={t('shell.hq.hints')} value={`${HINTS_PER_RUN + hqExtraHints(hq)}`} />
          <Bonus label={t('shell.hq.xp')} value={`+${Math.round((hqXpMultiplier(hq) - 1) * 100)}%`} />
          <Bonus label={t('shell.hq.coins')} value={`+${Math.round((hqCoinMultiplier(hq) - 1) * 100)}%`} />
        </FadeInView>

        {HQ_FACILITIES.map((f, i) => {
          const level = facilityLevel(hq, f.id);
          const cost = nextFacilityCost(hq, f);
          const name = tx(f.name);
          return (
            <FadeInView key={f.id} index={i + 1} style={[styles.card, shadows.soft]}>
              <View style={styles.icon}>{ICONS[f.id]}</View>
              <View style={styles.info}>
                <Text style={styles.name}>{name}</Text>
                <Text style={styles.desc}>{tx(f.description)}</Text>
                <View style={styles.pips} accessible accessibilityLabel={t('shell.common.levelOf', { level, max: f.costs.length })}>
                  {f.costs.map((_, p) => (
                    <View key={p} style={[styles.pip, p < level && styles.pipOn]} />
                  ))}
                </View>
              </View>
              <PrimaryButton
                label={cost === null ? t('shell.common.max') : `${cost}`}
                accessibilityLabel={
                  cost === null ? t('shell.hq.builtA11y', { name }) : t('shell.hq.buildA11y', { name, level: level + 1, cost })
                }
                icon={cost === null ? undefined : <Coins size={iconSizes.xs} color={colors.textOnDark} />}
                disabled={cost === null || coins < cost}
                onPress={() => build(f.id)}
                style={styles.button}
              />
            </FadeInView>
          );
        })}
        <Text style={styles.note}>
          {t('shell.hq.note')}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Bonus({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.bonus} accessible accessibilityLabel={`${label}: ${value}`}>
      <Text style={styles.bonusValue}>{value}</Text>
      <Text style={styles.bonusLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
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
  summary: { flexDirection: 'row', backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.md },
  bonus: { flex: 1, alignItems: 'center', gap: 2 },
  bonusValue: { ...typography.heading, color: colors.primary },
  bonusLabel: { ...typography.caption, color: colors.textMuted },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  icon: {
    width: layout.iconBadge,
    height: layout.iconBadge,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { flex: 1, gap: 4 },
  name: { ...typography.label, color: colors.text },
  desc: { ...typography.caption, color: colors.textMuted, lineHeight: 18 },
  pips: { flexDirection: 'row', gap: 4, marginTop: 2 },
  pip: { width: 18, height: 6, borderRadius: 3, backgroundColor: colors.surfaceMuted },
  pipOn: { backgroundColor: colors.primary },
  button: { minWidth: 96 },
  note: { ...typography.caption, color: colors.textMuted, textAlign: 'center' },
});
