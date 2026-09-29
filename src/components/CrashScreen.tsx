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

export function CrashScreen({ error, route, retry }: { error: Error; route: string; retry: () => void }) {
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
          Something went wrong
        </Text>
        <Text style={styles.body}>
          Your progress is saved. Try again — if it keeps happening, share the error report with the person who gave
          you the app.
        </Text>
        <PrimaryButton
          label="TRY AGAIN"
          icon={<RotateCcw size={iconSizes.sm} color={colors.textOnDark} />}
          onPress={retry}
        />
        <PrimaryButton
          label="SHARE ERROR REPORT"
          variant="outline"
          icon={<Share2 size={iconSizes.sm} color={colors.primary} />}
          onPress={share}
        />
        <Text style={styles.note}>The report contains only the error, screen and app version.</Text>
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
