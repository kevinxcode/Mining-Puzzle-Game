/**
 * MINING FLOW — campaign map screen.
 * Regional sections with level nodes, lock states and stars.
 */

import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { colors, spacing, typography } from '@/theme/tokens';
import { LEVELS, REGIONS } from '@/game/levels/levelFactory';
import { useProgression } from '@/state/progressionStore';
import { IconButton } from '@/components/IconButton';
import { LevelCard } from '@/components/LevelCard';
import { RegionCard } from '@/components/RegionCard';

export default function CampaignScreen() {
  const router = useRouter();
  const levelRecords = useProgression((s) => s.levels);

  // A level unlocks when the previous one is completed (level 1 always open).
  const isUnlocked = (levelNumber: number) =>
    levelNumber === 1 || Boolean(levelRecords[String(levelNumber - 1)]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <IconButton
          icon={<ChevronLeft size={20} color={colors.textOnDark} />}
          accessibilityLabel="Back"
          onPress={() => router.back()}
        />
        <Text style={styles.title}>Campaign</Text>
        <View style={styles.headerSpacer} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {REGIONS.map((region) => (
          <RegionCard
            key={region.id}
            name={region.name}
            tagline={region.tagline}
            accent={region.accent}
          >
            <View style={styles.levelList}>
              {LEVELS.filter((l) => l.regionId === region.id).map((level) => (
                <LevelCard
                  key={level.id}
                  levelNumber={Number(level.id)}
                  name={level.name}
                  accent={region.accent}
                  stars={levelRecords[level.id]?.stars ?? 0}
                  locked={!isUnlocked(Number(level.id))}
                  onPress={() => router.push(`/level/${level.id}`)}
                />
              ))}
            </View>
          </RegionCard>
        ))}
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
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
  levelList: { gap: spacing.sm },
});