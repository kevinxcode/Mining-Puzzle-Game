/**
 * MINING FLOW — settings screen.
 * Audio, haptics, reset progress and about.
 */

import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Alert, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { colors, radius, shadows, spacing, typography } from '@/theme/tokens';
import { useProgression } from '@/state/progressionStore';
import { setMusicEnabled } from '@/services/audio';
import { IconButton } from '@/components/IconButton';
import { PrimaryButton } from '@/components/PrimaryButton';

export default function SettingsScreen() {
  const router = useRouter();
  const settings = useProgression((s) => s.settings);
  const toggleSetting = useProgression((s) => s.toggleSetting);
  const resetProgress = useProgression((s) => s.resetProgress);
  const [resetting, setResetting] = useState(false);

  const confirmReset = () => {
    Alert.alert('Reset Progress', 'This deletes all progress, stars, coins and upgrades. Continue?', [
      { text: 'Cancel', style: 'cancel', onPress: () => setResetting(false) },
      {
        text: 'Reset',
        style: 'destructive',
        onPress: () => {
          resetProgress();
          setResetting(false);
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <IconButton
          icon={<ChevronLeft size={20} color={colors.textOnDark} />}
          accessibilityLabel="Back"
          onPress={() => router.back()}
        />
        <Text style={styles.title}>Settings</Text>
        <View style={styles.headerSpacer} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <SettingRow
            label="Music"
            description="Soft ambient site audio"
            value={settings.music}
            onToggle={() => {
              toggleSetting('music');
              setMusicEnabled(!settings.music);
            }}
          />
          <SettingRow
            label="Sound Effects"
            description="Button taps, rewards and alerts"
            value={settings.sfx}
            onToggle={() => toggleSetting('sfx')}
          />
          <SettingRow
            label="Haptics"
            description="Vibration feedback"
            value={settings.haptics}
            onToggle={() => toggleSetting('haptics')}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.aboutTitle}>About</Text>
          <Text style={styles.aboutText}>
            MINING FLOW is a fictional logistics puzzle game about running a small mining
            operation. Manage excavators, dump trucks, routes and fuel to hit production
            targets before the shift ends.
          </Text>
          <Text style={styles.aboutVersion}>Version 1.0.0</Text>
        </View>

        <PrimaryButton label="RESET PROGRESS" variant="danger" onPress={confirmReset} disabled={resetting} />
      </ScrollView>
    </SafeAreaView>
  );
}

function SettingRow({
  label,
  description,
  value,
  onToggle,
}: {
  label: string;
  description: string;
  value: boolean;
  onToggle: () => void;
}) {
  return (
    <View style={styles.settingRow}>
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
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
    ...shadows.soft,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 48,
  },
  settingInfo: { flex: 1, gap: 2, paddingRight: spacing.md },
  settingLabel: { ...typography.body, color: colors.text },
  settingDescription: { ...typography.caption, color: colors.textMuted },
  aboutTitle: { ...typography.heading, color: colors.text },
  aboutText: { ...typography.caption, color: colors.textMuted },
  aboutVersion: { ...typography.tiny, color: colors.textMuted },
});