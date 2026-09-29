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
import { Check, ChevronRight, Globe, Info, Music, RotateCcw, Shield, Smartphone, Volume2 } from 'lucide-react-native';
import { colors, iconSizes, layout, minTouchTarget, radius, shadows, spacing, typography } from '@/theme/tokens';
import { useProgression } from '@/state/progressionStore';
import { setMusicEnabled } from '@/services/audio';
import { FadeInView } from '@/components/FadeInView';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ScreenHeader } from '@/components/ScreenHeader';
import { LANGUAGES, useLanguageStore, useT } from '@/i18n';

export default function SettingsScreen() {
  const { t } = useT();
  const language = useLanguageStore((s) => s.language);
  const setLanguage = useLanguageStore((s) => s.setLanguage);
  const settings = useProgression((s) => s.settings);
  const toggleSetting = useProgression((s) => s.toggleSetting);
  const resetProgress = useProgression((s) => s.resetProgress);
  const [resetting, setResetting] = useState(false);
  const router = useRouter();
  const appVersion = Constants.expoConfig?.version ?? '1.0.0';

  const confirmReset = () => {
    Alert.alert(t('shell.settings.resetTitle'), t('shell.settings.resetMessage'), [
      { text: t('shell.settings.cancel'), style: 'cancel', onPress: () => setResetting(false) },
      {
        text: t('shell.settings.reset'),
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
      <ScreenHeader title={t('shell.settings.title')} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionLabel}>{t('shell.settings.language')}</Text>
        <FadeInView style={styles.card}>
          {LANGUAGES.map((lang) => {
            const selected = language === lang.id;
            return (
              <Pressable
                key={lang.id}
                style={styles.settingRow}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                accessibilityLabel={lang.label}
                onPress={() => setLanguage(lang.id)}
              >
                <View style={styles.settingIcon}>
                  <Globe size={iconSizes.sm} color={selected ? colors.primary : colors.textMuted} />
                </View>
                <Text style={[styles.settingLabel, styles.flex]}>{lang.label}</Text>
                <View style={[styles.radio, selected && styles.radioOn]}>
                  {selected ? <Check size={iconSizes.xs} color={colors.textOnDark} /> : null}
                </View>
              </Pressable>
            );
          })}
        </FadeInView>

        <Text style={styles.sectionLabel}>{t('shell.settings.audio')}</Text>
        <FadeInView index={1} style={styles.card}>
          <SettingRow
            icon={<Music size={iconSizes.sm} color={colors.primary} />}
            label={t('shell.settings.music')}
            description={t('shell.settings.musicDesc')}
            value={settings.music}
            onToggle={() => {
              toggleSetting('music');
              setMusicEnabled(!settings.music);
            }}
          />
          <SettingRow
            icon={<Volume2 size={iconSizes.sm} color={colors.info} />}
            label={t('shell.settings.sfx')}
            description={t('shell.settings.sfxDesc')}
            value={settings.sfx}
            onToggle={() => toggleSetting('sfx')}
          />
          <SettingRow
            icon={<Smartphone size={iconSizes.sm} color={colors.success} />}
            label={t('shell.settings.haptics')}
            description={t('shell.settings.hapticsDesc')}
            value={settings.haptics}
            onToggle={() => toggleSetting('haptics')}
          />
        </FadeInView>

        <Text style={styles.sectionLabel}>{t('shell.settings.about')}</Text>
        <FadeInView index={2} style={styles.card}>
          <View style={styles.aboutHeader}>
            <Info size={iconSizes.sm} color={colors.textMuted} />
            <Text style={styles.aboutTitle}>Mining Puzzle Game</Text>
          </View>
          <Text style={styles.aboutText}>{t('shell.settings.aboutText')}</Text>
          <Text style={styles.aboutVersion}>{t('shell.settings.version', { version: appVersion })}</Text>
          <Pressable
            style={styles.linkRow}
            accessibilityRole="link"
            accessibilityLabel={t('shell.settings.privacyA11y')}
            onPress={() => router.push('/privacy')}
          >
            <Shield size={iconSizes.sm} color={colors.info} />
            <Text style={styles.linkText}>{t('shell.settings.privacy')}</Text>
            <ChevronRight size={iconSizes.sm} color={colors.textMuted} />
          </Pressable>
        </FadeInView>

        <Text style={styles.sectionLabel}>{t('shell.settings.danger')}</Text>
        <FadeInView index={3}>
          <PrimaryButton
            label={t('shell.settings.resetButton')}
            variant="danger"
            icon={<RotateCcw size={iconSizes.sm} color={colors.textOnDark} />}
            accessibilityHint={t('shell.settings.resetHint')}
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
  flex: { flex: 1 },
  radio: {
    width: 24,
    height: 24,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOn: { backgroundColor: colors.primary, borderColor: colors.primary },
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
