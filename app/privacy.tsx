/**
 * Privacy policy — the game stores everything on-device and collects no personal data.
 */

import { ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, layout, radius, shadows, spacing, typography } from '@/theme/tokens';
import { FadeInView } from '@/components/FadeInView';
import { ScreenHeader } from '@/components/ScreenHeader';

const LAST_UPDATED = '27 September 2026';

const SECTIONS: { title: string; body: string }[] = [
  {
    title: 'What we collect',
    body:
      'Nothing is sent to us or to any third party. Mining Puzzle Game has no accounts, no ads, no analytics and no tracking.',
  },
  {
    title: 'What is stored on your device',
    body:
      'Your game progress, stars, coins, upgrades, statistics, achievements, settings and Site Induction results (including the trainee name you type for the certificate) are saved only in this app’s local storage on your device.',
  },
  {
    title: 'Sharing',
    body:
      'Data leaves your device only when you choose to export or share an induction certificate. You decide where it goes.',
  },
  {
    title: 'Deleting your data',
    body:
      'Use Settings → Reset Progress to erase all saved data, or uninstall the app.',
  },
  {
    title: 'Children',
    body: 'The app does not knowingly collect any information from anyone, including children.',
  },
  {
    title: 'Changes',
    body:
      'If this policy changes, the updated version will be published in the app and on the store listing.',
  },
];

export default function PrivacyScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScreenHeader title="Privacy Policy" subtitle={`Last updated ${LAST_UPDATED}`} />
      <ScrollView contentContainerStyle={styles.content}>
        {SECTIONS.map((section, index) => (
          <FadeInView key={section.title} index={index} style={styles.card}>
            <Text style={styles.title} accessibilityRole="header">
              {section.title}
            </Text>
            <Text style={styles.body}>{section.body}</Text>
          </FadeInView>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: {
    padding: layout.gutter,
    gap: spacing.md,
    paddingBottom: spacing.xxl,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.xs,
    ...shadows.soft,
  },
  title: { ...typography.heading, color: colors.text },
  body: { ...typography.body, color: colors.textMuted, lineHeight: 22 },
});
