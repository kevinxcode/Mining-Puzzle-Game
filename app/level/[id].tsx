/**
 * MINING FLOW — mission briefing.
 * Shows level details before each mission: target, limits, challenge,
 * bonus and START.
 */

import { useLocalSearchParams, useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { colors, spacing, typography } from '@/theme/tokens';
import { getLevelById } from '@/game/levels/levelFactory';
import { useProgression } from '@/state/progressionStore';
import { formatClock } from '@/utils/format';
import { IconButton } from '@/components/IconButton';
import { PrimaryButton } from '@/components/PrimaryButton';
import { StarRating } from '@/components/StarRating';
import { playSfx } from '@/services/audio';
import { hapticMedium } from '@/services/haptics';

export default function BriefingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const level = getLevelById(String(params.id));
  const levelRecords = useProgression((s) => s.levels);
  const setLastPlayed = useProgression((s) => s.setLastPlayed);

  if (!level) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={[styles.container, styles.center]}>
          <Text style={styles.title}>Level not found</Text>
          <PrimaryButton label="BACK" onPress={() => router.back()} style={styles.startButton} />
        </View>
      </SafeAreaView>
    );
  }

  const record = levelRecords[level.id];
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
      <View style={styles.header}>
        <IconButton
          icon={<ChevronLeft size={20} color={colors.textOnDark} />}
          accessibilityLabel="Back"
          onPress={() => router.back()}
        />
        <StarRating count={record?.stars ?? 0} size={16} />
      </View>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.region}>{`LEVEL ${level.id} — ${level.regionName.toUpperCase()}`}</Text>
        <Text style={styles.title}>{level.name}</Text>
        <Text style={styles.description}>{level.description}</Text>

        <Section label="TARGET">
          <Text style={styles.value}>{`Move ${level.targetTons} tons`}</Text>
        </Section>

        <Section label="LIMITS">
          <Text style={styles.value}>
            {`${level.trucks.length} Trucks · ${level.excavators.length} Excavator${level.excavators.length > 1 ? 's' : ''}`}
          </Text>
          <Text style={styles.value}>{`Time limit: ${formatClock(level.timeLimit)}`}</Text>
          {hasFuelStation ? <Text style={styles.value}>Fuel station on site</Text> : null}
        </Section>

        {challenge.length > 0 ? (
          <Section label="CHALLENGE">
            {challenge.map((o) => (
              <Text key={o.id} style={styles.value}>
                {o.description}
              </Text>
            ))}
          </Section>
        ) : null}

        {bonus.length > 0 ? (
          <Section label="BONUS">
            {bonus.map((o) => (
              <Text key={o.id} style={styles.value}>
                {o.description}
              </Text>
            ))}
          </Section>
        ) : null}

        <Section label="FLEET">
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
        </Section>
      </ScrollView>
      <View style={styles.footer}>
        <PrimaryButton label="START" onPress={start} style={styles.startButton} />
      </View>
    </SafeAreaView>
  );
}

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{label}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
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
  container: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl },
  center: { alignItems: 'center', justifyContent: 'center', flex: 1 },
  region: { ...typography.label, color: colors.primary },
  title: { ...typography.display, color: colors.text },
  description: { ...typography.body, color: colors.textMuted },
  section: { gap: spacing.xs },
  sectionLabel: { ...typography.label, color: colors.textMuted },
  sectionBody: { gap: spacing.xs + 2 },
  value: { ...typography.body, color: colors.text },
  footer: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  startButton: { paddingVertical: spacing.lg },
});