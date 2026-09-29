/**
 * Settings — audio, haptics, about and reset (with confirmation).
 */

import { useChallengeStore } from '@/state/challengeStore';
import { clearCrashLog } from '@/services/crashLog';
import { useState, type ReactNode } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronRight, Info, Music, RotateCcw, Shield, Smartphone, Volume2 } from 'lucide-react-native';
import { colors, iconSizes, layout, minTouchTarget, radius, shadows, spacing, typography } from '@/theme/tokens';
import { useProgression } from '@/state/progressionStore';
import { setMusicEnabled } from '@/services/audio';
import { FadeInView } from '@/components/FadeInView';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ScreenHeader } from '@/components/ScreenHeader';

export default function SettingsScreen() {
  const settings = useProgression((s) => s.settings);
  const toggleSetting = useProgression((s) => s.toggleSetting);
  const resetProgress = useProgression((s) => s.resetProgress);
  const [resetting, setResetting] = useState(false);
  const router = useRouter();
  const appVersion = Constants.expoConfig?.version ?? '1.0.0';

  const confirmReset = () => {
    Alert.alert('Reset Progress', 'This deletes all progress, stars, coins, upgrades, induction records, your nickname and the error log. An imported content pack is kept. Continue?', [
      { text: 'Cancel', style: 'cancel', onPress: () => setResetting(false) },
      {
        text: 'Reset',
        style: 'destructive',
        onPress: () => {
          resetProgress();
          // Personal data kept outside the save: friend-challenge nickname and error log.
          useChallengeStore.getState().setNickname('');
          void clearCrashLog();
          setResetting(false);
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title="Settings" />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionLabel}>AUDIO & FEEDBACK</Text>
        <FadeInView style={styles.card}>
          <SettingRow
            icon={<Music size={iconSizes.sm} color={colors.primary} />}
            label="Music"
            description="Soft ambient site audio"
            value={settings.music}
            onToggle={() => {
              toggleSetting('music');
              setMusicEnabled(!settings.music);
            }}
          />
          <SettingRow
            icon={<Volume2 size={iconSizes.sm} color={colors.info} />}
            label="Sound Effects"
            description="Button taps, rewards and alerts"
            value={settings.sfx}
            onToggle={() => toggleSetting('sfx')}
          />
          <SettingRow
            icon={<Smartphone size={iconSizes.sm} color={colors.success} />}
            label="Haptics"
            description="Vibration feedback"
            value={settings.haptics}
            onToggle={() => toggleSetting('haptics')}
          />
        </FadeInView>

        <Text style={styles.sectionLabel}>ABOUT</Text>
        <FadeInView index={1} style={styles.card}>
          <View style={styles.aboutHeader}>
            <Info size={iconSizes.sm} color={colors.textMuted} />
            <Text style={styles.aboutTitle}>Mining Puzzle Game</Text>
          </View>
          <Text style={styles.aboutText}>
            A fictional logistics puzzle game about running a small mining operation. Manage
            excavators, dump trucks, routes and fuel to hit production targets before the shift
            ends. The Site Induction track is generic training content, not any real site’s procedures.
          </Text>
          <Text style={styles.aboutVersion}>Version {appVersion}</Text>
          <Pressable
            style={styles.linkRow}
            accessibilityRole="link"
            accessibilityLabel="Privacy policy"
            onPress={() => router.push('/privacy')}
          >
            <Shield size={iconSizes.sm} color={colors.info} />
            <Text style={styles.linkText}>Privacy Policy</Text>
            <ChevronRight size={iconSizes.sm} color={colors.textMuted} />
          </Pressable>
        </FadeInView>

        <Text style={styles.sectionLabel}>DANGER ZONE</Text>
        <FadeInView index={2}>
          <PrimaryButton
            label="RESET PROGRESS"
            variant="danger"
            icon={<RotateCcw size={iconSizes.sm} color={colors.textOnDark} />}
            accessibilityHint="Deletes all progress after confirmation"
            onPress={confirmReset}
            disabled={resetting}
          />
        </FadeInView>
      </ScrollView>
    </SafeAreaView>
  );
}

function SettingRow({
  icon,
  label,
  description,
  value,
  onToggle,
}: {
  icon: ReactNode;
  label: string;
  description: string;
  value: boolean;
  onToggle: () => void;
}) {
  return (
    <View style={styles.settingRow}>
      <View style={styles.settingIcon}>{icon}</View>
      <View style={styles.settingInfo}>
        <Text style={styles.settingLabel}>{label}</Text>
        <Text style={styles.settingDescription}>{description}</Text>
      </View>
      <Switch
        accessibilityLabel={label}
        trackColor={{ false: colors.surfaceMuted, true: colors.primary }}
        thumbColor={colors.card}
        value={value}
        onValueChange={onToggle}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: minTouchTarget,
    marginTop: spacing.sm,
  },
  linkText: { ...typography.body, color: colors.text, flex: 1, fontWeight: '600' },
  safe: { flex: 1, backgroundColor: colors.background },
  content: {
    padding: spacing.lg,
    gap: spacing.sm,
    paddingBottom: spacing.xxl,
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
  },
  sectionLabel: { ...typography.label, color: colors.textMuted, marginTop: spacing.md, marginLeft: spacing.xs },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.sm,
    ...shadows.soft,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: minTouchTarget + spacing.sm,
  },
  settingIcon: {
    width: layout.iconBadge - spacing.xs,
    height: layout.iconBadge - spacing.xs,
    borderRadius: radius.md,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  settingInfo: { flex: 1, gap: 2, paddingRight: spacing.md },
  settingLabel: { ...typography.body, fontWeight: '700', color: colors.text },
  settingDescription: { ...typography.caption, color: colors.textMuted },
  aboutHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  aboutTitle: { ...typography.heading, color: colors.text },
  aboutText: { ...typography.body, color: colors.textMuted },
  aboutVersion: { ...typography.tiny, color: colors.textMuted },
});
