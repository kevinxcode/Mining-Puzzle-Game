/**
 * Shown by the root error boundary instead of a red screen or a closed app.
 * Progress is saved separately, so the player can simply try again. The error
 * is logged on the device; sharing a report is the player's choice.
 */

import { useEffect } from 'react';
import { Share, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { AlertTriangle, RotateCcw, Share2 } from 'lucide-react-native';
import { colors, iconSizes, layout, radius, spacing, typography } from '@/theme/tokens';
import { crashReportText, recordCrash } from '@/services/crashLog';
import { PrimaryButton } from './PrimaryButton';
import { useT } from '@/i18n';

export function CrashScreen({ error, route, retry }: { error: Error; route: string; retry: () => void }) {
  const { t } = useT();
  useEffect(() => {
    void recordCrash(error, route);
  }, [error, route]);

  const share = async () => {
    const message = await crashReportText();
    Share.share({ message }).catch(() => undefined);
  };

  return (
    <View style={styles.safe}>
      {/* The root layout (and its status bar) is replaced while this shows. */}
      <StatusBar style="dark" />
      <View style={styles.card}>
        <AlertTriangle size={iconSizes.lg} color={colors.warning} />
        <Text style={styles.title} accessibilityRole="header">
          {t('shell.crash.title')}
        </Text>
        <Text style={styles.body}>{t('shell.crash.body')}</Text>
        <PrimaryButton
          label={t('shell.crash.retry')}
          icon={<RotateCcw size={iconSizes.sm} color={colors.textOnDark} />}
          onPress={retry}
        />
        <PrimaryButton
          label={t('shell.crash.share')}
          variant="outline"
          icon={<Share2 size={iconSizes.sm} color={colors.primary} />}
          onPress={share}
        />
        <Text style={styles.note}>{t('shell.crash.note')}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    padding: layout.gutter,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    alignItems: 'stretch',
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
  },
  title: { ...typography.title, color: colors.text },
  body: { ...typography.body, color: colors.textMuted },
  note: { ...typography.caption, color: colors.textMuted, textAlign: 'center' },
});
