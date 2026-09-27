/**
 * Mission briefing — hero summary, key numbers as chips, challenge/bonus cards,
 * collapsible fleet details (progressive disclosure) and a sticky START.
 */

import { useState, type ReactNode } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ChevronDown,
  ChevronUp,
  Clock,
  Fuel,
  Gift,
  Pickaxe,
  Play,
  Target,
  Truck,
  Zap,
} from 'lucide-react-native';
import { colors, iconSizes, layout, minTouchTarget, radius, shadows, spacing, typography } from '@/theme/tokens';
import { getLevelById, regionOfLevel } from '@/game/levels/levelFactory';
import { useProgression } from '@/state/progressionStore';
import { formatClock } from '@/utils/format';
import { FadeInView } from '@/components/FadeInView';
import { PressableScale } from '@/components/PressableScale';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ScreenHeader } from '@/components/ScreenHeader';
import { StarRating } from '@/components/StarRating';
import { playSfx } from '@/services/audio';
import { hapticMedium } from '@/services/haptics';

export default function BriefingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const level = getLevelById(String(params.id));
  const levelRecords = useProgression((s) => s.levels);
  const setLastPlayed = useProgression((s) => s.setLastPlayed);
  const [fleetOpen, setFleetOpen] = useState(false);

  if (!level) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScreenHeader title="Level not found" />
      </SafeAreaView>
    );
  }

  const record = levelRecords[level.id];
  const accent = regionOfLevel(Number(level.id)).accent;
  const challenge = level.objectives.filter((o) => !o.bonus && o.kind !== 'tons');
  const bonus = level.objectives.filter((o) => o.bonus);
  const hasFuelStation = level.map.nodes.some((n) => n.type === 'fuel');

  const start = () => {
    playSfx('tap');
    hapticMedium();
    setLastPlayed(level.id);
    router.replace(`/game/${level.id}`);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader
        title={`Level ${level.id}`}
        subtitle={level.regionName}
        right={<StarRating count={record?.stars ?? 0} size={iconSizes.sm} />}
      />
      <ScrollView contentContainerStyle={styles.container}>
        <FadeInView style={[styles.hero, shadows.raised]}>
          <View style={[styles.heroAccent, { backgroundColor: accent }]} />
          <Text style={styles.region}>{level.regionName.toUpperCase()}</Text>
          <Text style={styles.title} accessibilityRole="header">
            {level.name}
          </Text>
          <Text style={styles.description}>{level.description}</Text>
          <View style={styles.chips}>
            <Chip icon={<Target size={iconSizes.sm} color={colors.primary} />} value={`${level.targetTons} t`} label="Target" />
            <Chip icon={<Clock size={iconSizes.sm} color={colors.info} />} value={formatClock(level.timeLimit)} label="Time" />
            <Chip
              icon={<Truck size={iconSizes.sm} color={colors.warning} />}
              value={`${level.trucks.length}`}
              label={level.trucks.length === 1 ? 'Truck' : 'Trucks'}
            />
            <Chip
              icon={<Pickaxe size={iconSizes.sm} color={colors.success} />}
              value={`${level.excavators.length}`}
              label={level.excavators.length === 1 ? 'Loader' : 'Loaders'}
            />
          </View>
          {hasFuelStation ? (
            <View style={styles.notice}>
              <Fuel size={iconSizes.sm} color={colors.info} />
              <Text style={styles.noticeText}>Fuel station on site — plan your refuels.</Text>
            </View>
          ) : null}
        </FadeInView>

        {challenge.length > 0 ? (
          <FadeInView index={1}>
            <Section icon={<Zap size={iconSizes.sm} color={colors.warning} />} label="CHALLENGE">
              {challenge.map((o) => (
                <Text key={o.id} style={styles.value}>
                  {o.description}
                </Text>
              ))}
            </Section>
          </FadeInView>
        ) : null}

        {bonus.length > 0 ? (
          <FadeInView index={2}>
            <Section icon={<Gift size={iconSizes.sm} color={colors.primary} />} label="BONUS">
              {bonus.map((o) => (
                <Text key={o.id} style={styles.value}>
                  {o.description}
                </Text>
              ))}
            </Section>
          </FadeInView>
        ) : null}

        <FadeInView index={3}>
          <PressableScale
            accessibilityRole="button"
            accessibilityState={{ expanded: fleetOpen }}
            accessibilityLabel={fleetOpen ? 'Hide fleet details' : 'Show fleet details'}
            onPress={() => setFleetOpen(!fleetOpen)}
            style={[styles.section, shadows.soft]}
          >
            <View style={styles.sectionHeader}>
              <Truck size={iconSizes.sm} color={colors.textMuted} />
              <Text style={styles.sectionLabel}>FLEET DETAILS</Text>
              {fleetOpen ? (
                <ChevronUp size={iconSizes.sm} color={colors.textMuted} />
              ) : (
                <ChevronDown size={iconSizes.sm} color={colors.textMuted} />
              )}
            </View>
            {fleetOpen ? (
              <View style={styles.sectionBody}>
                {level.trucks.map((t) => (
                  <Text key={t.id} style={styles.value}>
                    {`${t.name} — ${t.truckClass}, ${t.capacity} t`}
                  </Text>
                ))}
                {level.excavators.map((e) => (
                  <Text key={e.id} style={styles.value}>
                    {`${e.name} — ${e.bucketCapacity} t bucket, ${e.loadingSpeed.toFixed(1)} t/s`}
                  </Text>
                ))}
              </View>
            ) : null}
          </PressableScale>
        </FadeInView>
      </ScrollView>
      <View style={styles.footer}>
        <PrimaryButton
          label="START MISSION"
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
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    paddingTop: spacing.sm,
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
  },
  startButton: { paddingVertical: spacing.lg, borderRadius: radius.xl },
});
