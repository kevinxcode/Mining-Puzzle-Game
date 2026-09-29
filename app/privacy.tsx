/**
 * Privacy policy — the game stores everything on-device and collects no personal data.
 */

import { ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, layout, radius, shadows, spacing, typography } from '@/theme/tokens';
import { FadeInView } from '@/components/FadeInView';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useT, type MessageKey } from '@/i18n';

const SECTIONS: { title: MessageKey; body: MessageKey }[] = [
  { title: 'shell.privacy.collectTitle', body: 'shell.privacy.collectBody' },
  { title: 'shell.privacy.storedTitle', body: 'shell.privacy.storedBody' },
  { title: 'shell.privacy.sharingTitle', body: 'shell.privacy.sharingBody' },
  { title: 'shell.privacy.deleteTitle', body: 'shell.privacy.deleteBody' },
  { title: 'shell.privacy.childrenTitle', body: 'shell.privacy.childrenBody' },
  { title: 'shell.privacy.changesTitle', body: 'shell.privacy.changesBody' },
];

export default function PrivacyScreen() {
  const { t } = useT();
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScreenHeader title={t('shell.privacy.title')} subtitle={t('shell.privacy.updated', { date: t('shell.privacy.date') })} />
      <ScrollView contentContainerStyle={styles.content}>
        {SECTIONS.map((section, index) => (
          <FadeInView key={String(section.title)} index={index} style={styles.card}>
            <Text style={styles.title} accessibilityRole="header">
              {t(section.title)}
            </Text>
            <Text style={styles.body}>{t(section.body)}</Text>
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
