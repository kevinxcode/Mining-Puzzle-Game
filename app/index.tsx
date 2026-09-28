/**
 * Mining Puzzle Game — home screen.
 * Full-bleed pit art + scrim, emblem + title, player level/XP, primary CONTINUE,
 * icon menu (campaign, induction, equipment, statistics, achievements) and totals.
 */

import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { Image, ImageBackground, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  BarChart3,
  ChevronRight,
  CalendarDays,
  Coins,
  GraduationCap,
  Map as MapIcon,
  Play,
  Settings,
  Star,
  Trophy,
  Wrench,
} from 'lucide-react-native';
import { colors, iconSizes, layout, minTouchTarget, radius, shadows, spacing, typography } from '@/theme/tokens';
import { LEVELS, getLevelByNumber } from '@/game/levels/levelFactory';
import { INDUCTION_MODULE_IDS } from '@/game/induction/modules';
import { inductionProgress, xpProgress } from '@/state/save';
import { localDateKey } from '@/game/levels/modeLevels';
import { useProgression } from '@/state/progressionStore';
import { formatNumber } from '@/utils/format';
import { FadeInView } from '@/components/FadeInView';
import { IconButton } from '@/components/IconButton';
import { PressableScale } from '@/components/PressableScale';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Scrim } from '@/components/Scrim';
import { XPBar } from '@/components/XPBar';
import { playSfx, updateMusicPlayback } from '@/services/audio';
import { hapticLight } from '@/services/haptics';

const bgHome = require('../assets/images/bg-home.png');
const logo = require('../assets/images/logo.png');

export default function HomeScreen() {
  const router = useRouter();
  const xp = useProgression((s) => s.xp);
  const coins = useProgression((s) => s.coins);
  const levelRecords = useProgression((s) => s.levels);
  const lastPlayedLevelId = useProgression((s) => s.lastPlayedLevelId);
  const induction = useProgression((s) => s.induction);

  useEffect(() => {
    updateMusicPlayback();
  }, []);

  const totalStars = Object.values(levelRecords).reduce((sum, r) => sum + r.stars, 0);
  const xpInfo = xpProgress(xp);
  const training = inductionProgress(induction, INDUCTION_MODULE_IDS);

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

  const modes = useProgression((s) => s.modes);
  const dailyDoneToday = modes.daily.lastWinDate === localDateKey();

  const menu = [
    { label: 'CAMPAIGN', detail: `${Object.keys(levelRecords).length} / ${LEVELS.length} levels`, Icon: MapIcon, tint: colors.secondary, path: '/campaign' },
    {
      label: 'SITE INDUCTION',
      detail: training.completed === training.total ? 'Certified' : `${training.completed} / ${training.total} modules`,
      Icon: GraduationCap,
      tint: colors.info,
      path: '/induction',
    },
    {
      label: 'PLAY MODES',
      detail: dailyDoneToday ? `Daily done · streak ${modes.daily.streak}` : 'Daily challenge ready',
      Icon: CalendarDays,
      tint: colors.info,
      path: '/modes',
    },
    { label: 'EQUIPMENT', detail: 'Fleet & upgrades', Icon: Wrench, tint: colors.primary, path: '/equipment' },
    { label: 'STATISTICS', detail: 'Career totals', Icon: BarChart3, tint: colors.success, path: '/statistics' },
    { label: 'ACHIEVEMENTS', detail: 'Milestones', Icon: Trophy, tint: colors.secondary, path: '/achievements' },
  ] as const;

  return (
    <ImageBackground source={bgHome} style={styles.bg} resizeMode="cover">
      <Scrim topOpacity={0.45} bottomOpacity={0.92} />
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.container} bounces={false}>
          {/* Top bar */}
          <FadeInView style={styles.topBar}>
            <View style={[styles.xpPill, shadows.soft]}>
              <XPBar
                level={xpInfo.level}
                xp={xp}
                currentLevelXp={xpInfo.currentLevelXp}
                nextLevelXp={xpInfo.nextLevelXp}
              />
            </View>
            <IconButton
              icon={<Settings size={iconSizes.md} color={colors.textOnDark} />}
              accessibilityLabel="Settings"
              onPress={() => go('/settings')}
            />
          </FadeInView>

          {/* Emblem + title */}
          <FadeInView index={1} style={styles.titleBlock}>
            <Image source={logo} style={styles.logo} resizeMode="contain" accessibilityIgnoresInvertColors accessible={false} />
            <Text style={styles.title} accessibilityRole="header">
              MINING PUZZLE
            </Text>
            <Text style={styles.subtitle}>LOAD · HAUL · DUMP · REPEAT</Text>
          </FadeInView>

          {/* Primary action */}
          <FadeInView index={2}>
            <PrimaryButton
              label={`CONTINUE · LEVEL ${continueLevel.id}`}
              accessibilityLabel={`Continue, level ${continueLevel.id}: ${continueLevel.name}`}
              icon={<Play size={iconSizes.md} color={colors.textOnDark} fill={colors.textOnDark} />}
              onPress={() => go(`/level/${continueLevel.id}`)}
              style={styles.continueButton}
            />
            <Text style={styles.continueName} numberOfLines={1}>
              {continueLevel.name} · {continueLevel.regionName}
            </Text>
          </FadeInView>

          {/* Menu */}
          <View style={styles.menu}>
            {menu.map((item, i) => (
              <FadeInView key={item.label} index={3 + i}>
                <PressableScale
                  accessibilityRole="button"
                  accessibilityLabel={`${item.label}, ${item.detail}`}
                  onPress={() => go(item.path)}
                  style={styles.menuItem}
                >
                  <View style={[styles.menuIcon, { backgroundColor: item.tint }]}>
                    <item.Icon size={iconSizes.md} color={colors.surface} />
                  </View>
                  <View style={styles.menuText}>
                    <Text style={styles.menuLabel}>{item.label}</Text>
                    <Text style={styles.menuDetail}>{item.detail}</Text>
                  </View>
                  <ChevronRight size={iconSizes.md} color={colors.textOnDarkMuted} />
                </PressableScale>
              </FadeInView>
            ))}
          </View>

          {/* Totals */}
          <FadeInView index={9} style={styles.footer}>
            <View style={styles.footerItem} accessibilityLabel={`${totalStars} stars`}>
              <Star size={iconSizes.sm} color={colors.secondary} fill={colors.secondary} />
              <Text style={styles.footerText}>{formatNumber(totalStars)}</Text>
            </View>
            <View style={styles.footerDivider} />
            <View style={styles.footerItem} accessibilityLabel={`${coins} coins`}>
              <Coins size={iconSizes.sm} color={colors.primary} />
              <Text style={styles.footerText}>{formatNumber(coins)}</Text>
            </View>
          </FadeInView>
        </ScrollView>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: colors.surface },
  safe: { flex: 1 },
  container: {
    flexGrow: 1,
    paddingHorizontal: layout.gutter,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    gap: spacing.lg,
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
  },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  xpPill: {
    flex: 1,
    backgroundColor: colors.glassDark,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderOnDark,
  },
  titleBlock: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.xs, paddingVertical: spacing.md },
  logo: { width: layout.logoSize, height: layout.logoSize, marginBottom: spacing.sm },
  title: {
    ...typography.hero,
    color: colors.textOnDark,
    textAlign: 'center',
    textShadowColor: colors.scrim,
    textShadowRadius: 12,
  },
  subtitle: { ...typography.label, color: colors.secondary, letterSpacing: 2.5 },
  continueButton: { paddingVertical: spacing.lg, borderRadius: radius.xl },
  continueName: { ...typography.caption, color: colors.textOnDarkMuted, textAlign: 'center', marginTop: spacing.sm },
  menu: { gap: spacing.sm },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.glassDark,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderOnDark,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: minTouchTarget + spacing.sm,
  },
  menuIcon: {
    width: layout.iconBadge,
    height: layout.iconBadge,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuText: { flex: 1, gap: 2 },
  menuLabel: { ...typography.button, color: colors.textOnDark },
  menuDetail: { ...typography.caption, color: colors.textOnDarkMuted },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xl,
    backgroundColor: colors.glassDark,
    borderRadius: radius.pill,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
    alignSelf: 'center',
  },
  footerItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  footerDivider: { width: 1, height: spacing.lg, backgroundColor: colors.borderOnDark },
  footerText: { ...typography.heading, color: colors.textOnDark },
});
