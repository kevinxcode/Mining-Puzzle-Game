/**
 * Campaign — regional sections with level nodes, lock states, stars and progress.
 */

import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Star } from 'lucide-react-native';
import { colors, iconSizes, layout, radius, shadows, spacing, typography } from '@/theme/tokens';
import { LEVELS, REGIONS } from '@/game/levels/levelFactory';
import { useProgression } from '@/state/progressionStore';
import { FadeInView } from '@/components/FadeInView';
import { LevelCard } from '@/components/LevelCard';
import { RegionCard } from '@/components/RegionCard';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useT } from '@/i18n';
import { levelDisplayName } from '@/game/levels/levelText';

export default function CampaignScreen() {
  const router = useRouter();
  const { t, tx } = useT();
  const levelRecords = useProgression((s) => s.levels);

  // A level unlocks when the previous one is completed (level 1 always open).
  const isUnlocked = (levelNumber: number) =>
    levelNumber === 1 || Boolean(levelRecords[String(levelNumber - 1)]);
  const nextId = LEVELS.find((l) => !levelRecords[l.id])?.id;
  const totalStars = Object.values(levelRecords).reduce((sum, r) => sum + r.stars, 0);

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader
        title={t('shell.campaign.title')}
        subtitle={t('shell.campaign.subtitle', { done: Object.keys(levelRecords).length, total: LEVELS.length })}
        right={
          <View style={[styles.starPill, shadows.soft]} accessibilityLabel={t('shell.campaign.starsA11y', { count: totalStars })}>
            <Star size={iconSizes.xs} color={colors.secondary} fill={colors.secondary} />
            <Text style={styles.starText}>{totalStars}</Text>
          </View>
        }
      />
      <ScrollView contentContainerStyle={styles.content}>
        {REGIONS.map((region, i) => {
          const levels = LEVELS.filter((l) => l.regionId === region.id);
          const completed = levels.filter((l) => levelRecords[l.id]).length;
          return (
            <FadeInView key={region.id} index={i}>
              <RegionCard
                name={tx(region.name)}
                tagline={tx(region.tagline)}
                accent={region.accent}
                completed={completed}
                total={levels.length}
                locked={!isUnlocked(region.startLevel)}
              >
                <View style={styles.levelList}>
                  {levels.map((level) => (
                    <LevelCard
                      key={level.id}
                      levelNumber={Number(level.id)}
                      name={levelDisplayName(level)}
                      accent={region.accent}
                      stars={levelRecords[level.id]?.stars ?? 0}
                      locked={!isUnlocked(Number(level.id))}
                      isNext={level.id === nextId}
                      onPress={() => router.push(`/level/${level.id}`)}
                    />
                  ))}
                </View>
              </RegionCard>
            </FadeInView>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  starPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.card,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
  },
  starText: { ...typography.label, color: colors.text },
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
    paddingBottom: spacing.xxl,
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
  },
  levelList: { gap: spacing.sm },
});
