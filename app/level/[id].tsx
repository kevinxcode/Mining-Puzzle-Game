/**
 * Mission briefing — hero summary, key numbers as chips, challenge/bonus cards,
 * collapsible fleet details (progressive disclosure) and a sticky START.
 */

import { useState, type ReactNode } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ChevronDown,
  ChevronUp,
  Clock,
  Fuel,
  Ghost,
  Gift,
  Share2,
  Pickaxe,
  Play,
  Target,
  Truck,
  Zap,
} from 'lucide-react-native';
import { colors, iconSizes, layout, minTouchTarget, radius, shadows, spacing, typography } from '@/theme/tokens';
import { regionOfLevel } from '@/game/levels/levelFactory';
import { parseModeLevelId, resolveLevel, withFleetClass } from '@/game/levels/modeLevels';
import { TRUCK_CLASSES, unlockedTruckClasses } from '@/game/config/equipment';
import type { TruckClass } from '@/types/game';
import { useProgression } from '@/state/progressionStore';
import { useChallengeStore } from '@/state/challengeStore';
import { encodeChallenge } from '@/game/challenge';
import { formatClock } from '@/utils/format';
import { FadeInView } from '@/components/FadeInView';
import { PressableScale } from '@/components/PressableScale';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ScreenHeader } from '@/components/ScreenHeader';
import { StarRating } from '@/components/StarRating';
import { playSfx } from '@/services/audio';
import { hapticMedium } from '@/services/haptics';
import { useT } from '@/i18n';
import { levelDescription, levelDisplayName, objectiveText } from '@/game/levels/levelText';

export default function BriefingScreen() {
  const { t, tx, tn } = useT();
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const level = resolveLevel(String(params.id));
  const levelRecords = useProgression((s) => s.levels);
  const setLastPlayed = useProgression((s) => s.setLastPlayed);
  const nickname = useChallengeStore((s) => s.nickname);
  const levelsCompleted = useProgression((s) => s.statistics.levelsCompleted);
  const [fleetOpen, setFleetOpen] = useState(false);

  if (!level) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScreenHeader title={t('game.briefing.notFound')} />
      </SafeAreaView>
    );
  }

  const record = levelRecords[level.id];
  const shareChallenge = () => {
    if (!record?.ghost) return;
    const code = encodeChallenge({ levelId: level.id, nickname: nickname || t('game.briefing.defaultNickname'), log: record.ghost });
    const message = t('game.briefing.shareMessage', { id: level.id, name: levelDisplayName(level), score: record.bestScore, code });
    Share.share({ message }).catch(() => undefined);
  };
  const modeRef = parseModeLevelId(level.id);
  // Mode levels reuse a campaign seed; `difficulty` holds that seed's level number.
  const accent = regionOfLevel(level.difficulty).accent;
  const baseModeId = level.id.replace(/@[A-Z]$/, '');
  const fleetChoices = modeRef ? unlockedTruckClasses(levelsCompleted) : [];
  const chooseFleet = (fleetClass: TruckClass | undefined) => {
    playSfx('tap');
    router.setParams({ id: withFleetClass(baseModeId, fleetClass) });
  };
  const challenge = level.objectives.filter((o) => !o.bonus && o.kind !== 'tons');
  const bonus = level.objectives.filter((o) => o.bonus);
  const hasFuelStation = level.map.nodes.some((n) => n.type === 'fuel');

  const start = () => {
    playSfx('tap');
    hapticMedium();
    // "Continue" on the home screen only ever points at the campaign.
    if (!modeRef) setLastPlayed(level.id);
    router.replace(`/game/${level.id}`);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader
        title={modeRef ? (modeRef.mode === 'daily' ? t('game.briefing.daily') : modeRef.mode === 'weekly' ? t('game.briefing.weekly') : t('game.briefing.endless', { shift: modeRef.shift })) : t('game.briefing.level', { id: level.id })}
        subtitle={tx(level.regionName)}
        right={<StarRating count={record?.stars ?? 0} size={iconSizes.sm} />}
      />
      <ScrollView contentContainerStyle={styles.container}>
        <FadeInView style={[styles.hero, shadows.raised]}>
          <View style={[styles.heroAccent, { backgroundColor: accent }]} />
          <Text style={styles.region}>{tx(level.regionName).toUpperCase()}</Text>
          <Text style={styles.title} accessibilityRole="header">
            {levelDisplayName(level)}
          </Text>
          <Text style={styles.description}>{levelDescription(level)}</Text>
          <View style={styles.chips}>
            <Chip icon={<Target size={iconSizes.sm} color={colors.primary} />} value={`${level.targetTons} t`} label={t('game.briefing.target')} />
            <Chip icon={<Clock size={iconSizes.sm} color={colors.info} />} value={formatClock(level.timeLimit)} label={t('game.briefing.time')} />
            <Chip
              icon={<Truck size={iconSizes.sm} color={colors.warning} />}
              value={`${level.trucks.length}`}
              label={tn('game.briefing.truck_one', 'game.briefing.truck_other', level.trucks.length)}
            />
            <Chip
              icon={<Pickaxe size={iconSizes.sm} color={colors.success} />}
              value={`${level.excavators.length}`}
              label={tn('game.briefing.loader_one', 'game.briefing.loader_other', level.excavators.length)}
            />
          </View>
          {hasFuelStation ? (
            <View style={styles.notice}>
              <Fuel size={iconSizes.sm} color={colors.info} />
              <Text style={styles.noticeText}>{t('game.briefing.fuelNotice')}</Text>
            </View>
          ) : null}
        </FadeInView>

        {modeRef ? (
          <FadeInView index={1}>
            <Section icon={<Truck size={iconSizes.sm} color={colors.info} />} label={t('game.briefing.chooseFleet')}>
              <Text style={styles.fleetHint}>
                {t('game.briefing.fleetHint')}
              </Text>
              <View style={styles.fleetChips}>
                {[undefined, ...fleetChoices].map((cls) => {
                  const active = modeRef.fleetClass === cls;
                  const label = cls ? tx(TRUCK_CLASSES[cls].name) : t('game.briefing.missionFleet');
                  return (
                    <PressableScale
                      key={cls ?? 'default'}
                      onPress={() => chooseFleet(cls)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      accessibilityLabel={t('game.briefing.fleetA11y', { label })}
                      style={[styles.fleetChip, active && styles.fleetChipActive]}
                    >
                      <Text style={[styles.fleetChipText, active && styles.fleetChipTextActive]}>{label}</Text>
                      {cls ? <Text style={[styles.fleetChipMeta, active && styles.fleetChipTextActive]}>{TRUCK_CLASSES[cls].capacity} t</Text> : null}
                    </PressableScale>
                  );
                })}
              </View>
            </Section>
          </FadeInView>
        ) : null}

        {challenge.length > 0 ? (
          <FadeInView index={1}>
            <Section icon={<Zap size={iconSizes.sm} color={colors.warning} />} label={t('game.briefing.challenge')}>
              {challenge.map((o) => (
                <Text key={o.id} style={styles.value}>
                  {objectiveText(o)}
                </Text>
              ))}
            </Section>
          </FadeInView>
        ) : null}

        {bonus.length > 0 ? (
          <FadeInView index={2}>
            <Section icon={<Gift size={iconSizes.sm} color={colors.primary} />} label={t('game.briefing.bonus')}>
              {bonus.map((o) => (
                <Text key={o.id} style={styles.value}>
                  {objectiveText(o)}
                </Text>
              ))}
            </Section>
          </FadeInView>
        ) : null}

        <FadeInView index={3}>
          <PressableScale
            accessibilityRole="button"
            accessibilityState={{ expanded: fleetOpen }}
            accessibilityLabel={fleetOpen ? t('game.briefing.hideFleet') : t('game.briefing.showFleet')}
            onPress={() => setFleetOpen(!fleetOpen)}
            style={[styles.section, shadows.soft]}
          >
            <View style={styles.sectionHeader}>
              <Truck size={iconSizes.sm} color={colors.textMuted} />
              <Text style={styles.sectionLabel}>{t('game.briefing.fleetDetails')}</Text>
              {fleetOpen ? (
                <ChevronUp size={iconSizes.sm} color={colors.textMuted} />
              ) : (
                <ChevronDown size={iconSizes.sm} color={colors.textMuted} />
              )}
            </View>
            {fleetOpen ? (
              <View style={styles.sectionBody}>
                {level.trucks.map((tr) => (
                  <Text key={tr.id} style={styles.value}>
                    {t('game.briefing.truckLine', { name: tx(tr.name), cls: tx(tr.truckClass), capacity: tr.capacity })}
                  </Text>
                ))}
                {level.excavators.map((e) => (
                  <Text key={e.id} style={styles.value}>
                    {t('game.briefing.excavatorLine', { name: tx(e.name), bucket: e.bucketCapacity, speed: e.loadingSpeed.toFixed(1) })}
                  </Text>
                ))}
              </View>
            ) : null}
          </PressableScale>
        </FadeInView>
      </ScrollView>
      <View style={styles.footer}>
        {record?.ghost ? (
          <PrimaryButton
            label={t('game.briefing.shareChallenge')}
            variant="outline"
            accessibilityLabel={t('game.briefing.shareA11y')}
            icon={<Share2 size={iconSizes.sm} color={colors.primary} />}
            onPress={shareChallenge}
          />
        ) : null}
        {record?.ghost ? (
          <PrimaryButton
            label={t('game.briefing.watchBest')}
            variant="outline"
            accessibilityLabel={t('game.briefing.watchBestA11y', { score: record.bestScore })}
            icon={<Ghost size={iconSizes.sm} color={colors.primary} />}
            onPress={() => router.push(`/game/${level.id}?ghost=1` as never)}
          />
        ) : null}
        <PrimaryButton
          label={t('game.briefing.start')}
          icon={<Play size={iconSizes.md} color={colors.textOnDark} fill={colors.textOnDark} />}
          onPress={start}
          style={styles.startButton}
        />
      </View>
    </SafeAreaView>
  );
}

function Chip({ icon, value, label }: { icon: ReactNode; value: string; label: string }) {
  return (
    <View style={styles.chip} accessible accessibilityLabel={`${label}: ${value}`}>
      {icon}
      <Text style={styles.chipValue}>{value}</Text>
      <Text style={styles.chipLabel}>{label}</Text>
    </View>
  );
}

function Section({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <View style={[styles.section, shadows.soft]}>
      <View style={styles.sectionHeader}>
        {icon}
        <Text style={styles.sectionLabel}>{label}</Text>
      </View>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  fleetHint: { ...typography.caption, color: colors.textMuted },
  fleetChips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  fleetChip: {
    minHeight: minTouchTarget,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
    justifyContent: 'center',
  },
  fleetChipActive: { backgroundColor: colors.surface },
  fleetChipText: { ...typography.label, color: colors.text },
  fleetChipMeta: { ...typography.caption, color: colors.textMuted },
  fleetChipTextActive: { color: colors.textOnDark },
  safe: { flex: 1, backgroundColor: colors.background },
  container: {
    padding: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing.xl,
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
  },
  hero: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: spacing.lg,
    paddingTop: spacing.xl,
    gap: spacing.sm,
    overflow: 'hidden',
  },
  heroAccent: { position: 'absolute', top: 0, left: 0, right: 0, height: spacing.sm },
  region: { ...typography.label, color: colors.primary },
  title: { ...typography.display, color: colors.text },
  description: { ...typography.body, color: colors.textMuted },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  chip: {
    flexGrow: 1,
    flexBasis: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    backgroundColor: colors.background,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    minHeight: minTouchTarget,
  },
  chipValue: { ...typography.heading, color: colors.text },
  chipLabel: { ...typography.caption, color: colors.textMuted },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.infoSoft,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  noticeText: { ...typography.caption, color: colors.text, flex: 1 },
  section: { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.sm },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: iconSizes.lg },
  sectionLabel: { ...typography.label, color: colors.textMuted, flex: 1 },
  sectionBody: { gap: spacing.xs + 2 },
  value: { ...typography.body, color: colors.text },
  footer: {
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    paddingTop: spacing.sm,
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
  },
  startButton: { paddingVertical: spacing.lg, borderRadius: radius.xl },
});
