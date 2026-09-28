/**
 * Site Induction — track overview: progress, modules, glossary and certificate.
 */

import { useState } from 'react';
import { useRouter } from 'expo-router';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Alert, ImageBackground, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Award,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Share2,
  ShieldAlert,
} from 'lucide-react-native';
import { colors, iconSizes, layout, minTouchTarget, radius, shadows, spacing, typography } from '@/theme/tokens';
import { INDUCTION_MODULES, INDUCTION_MODULE_IDS } from '@/game/induction/modules';
import { HAZARD_SCENES } from '@/game/induction/hazards';
import { MAX_TRAINEE_NAME, inductionProgress } from '@/state/save';
import { useProgression } from '@/state/progressionStore';
import { MODULE_ICONS } from '@/components/InductionArt';
import { FadeInView } from '@/components/FadeInView';
import { PressableScale } from '@/components/PressableScale';
import { Scrim } from '@/components/Scrim';
import { ScreenHeader } from '@/components/ScreenHeader';
import { PrimaryButton } from '@/components/PrimaryButton';
import { buildCertificateHtml } from '@/game/induction/certificate';

const bgInduction = require('../../assets/images/bg-induction.png');

export default function InductionScreen() {
  const router = useRouter();
  const induction = useProgression((s) => s.induction);
  const setTraineeName = useProgression((s) => s.setTraineeName);
  const progress = inductionProgress(induction, INDUCTION_MODULE_IDS);
  const [exporting, setExporting] = useState(false);

  const exportCertificate = async () => {
    setExporting(true);
    try {
      const { uri } = await Print.printToFileAsync({ html: buildCertificateHtml(induction) });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Share induction certificate',
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert('Certificate saved', `Saved to ${uri}`);
      }
    } catch {
      Alert.alert('Export failed', 'The certificate could not be created. Please try again.');
    } finally {
      setExporting(false);
    }
  };
  const certified = induction.certifiedAt !== null;

  return (
    <ImageBackground source={bgInduction} style={styles.bg} resizeMode="cover">
      <Scrim topOpacity={0.8} bottomOpacity={0.35} />
      <SafeAreaView style={styles.safe}>
        <ScreenHeader title="Site Induction" subtitle="Training for new team members" tone="dark" />
        <ScrollView contentContainerStyle={styles.content}>
          <FadeInView style={[styles.progressCard, shadows.raised]}>
            <View style={styles.progressTop}>
              <Text style={styles.progressLabel}>YOUR PROGRESS</Text>
              <Text style={styles.progressValue}>
                {progress.completed} / {progress.total} modules
              </Text>
            </View>
            <View
              style={styles.track}
              accessibilityRole="progressbar"
              accessibilityValue={{ min: 0, max: progress.total, now: progress.completed }}
            >
              <View style={[styles.fill, { width: `${Math.round(progress.fraction * 100)}%` }]} />
            </View>
            <Text style={styles.progressHint}>
              {certified
                ? 'Induction complete — your certificate is below.'
                : 'Read the cards, pass the quick check, then practice in a real mission.'}
            </Text>
          </FadeInView>

          {INDUCTION_MODULES.map((module, i) => {
            const record = induction.modules[module.id];
            const done = record?.completedAt != null;
            const Icon = MODULE_ICONS[module.icon];
            return (
              <FadeInView key={module.id} index={i + 1}>
                <PressableScale
                  accessibilityRole="button"
                  accessibilityLabel={`Module ${module.number}: ${module.title}. ${done ? 'Completed' : 'Not completed'}`}
                  onPress={() => router.push(`/induction/${module.id}`)}
                  style={[styles.moduleCard, shadows.soft]}
                >
                  <View style={[styles.moduleIcon, done && styles.moduleIconDone]}>
                    {done ? (
                      <CheckCircle2 size={iconSizes.md} color={colors.textOnDark} />
                    ) : (
                      <Icon size={iconSizes.md} color={colors.primary} />
                    )}
                  </View>
                  <View style={styles.moduleInfo}>
                    <Text style={styles.moduleNumber}>MODULE {module.number}</Text>
                    <Text style={styles.moduleTitle}>{module.title}</Text>
                    <Text style={styles.moduleSummary} numberOfLines={2}>
                      {module.summary}
                    </Text>
                    {record ? (
                      <Text style={[styles.moduleScore, done ? styles.scoreDone : styles.scoreRetry]}>
                        {done ? 'Passed' : 'Try again'} · best {record.bestScore}/{record.total}
                      </Text>
                    ) : null}
                  </View>
                  <ChevronRight size={iconSizes.md} color={colors.textMuted} />
                </PressableScale>
              </FadeInView>
            );
          })}

          <Text style={styles.hazardHeading}>HAZARD SPOTTING</Text>
          {HAZARD_SCENES.map((scene, i) => {
            const rec = induction.hazards[scene.id];
            const passedScene = Boolean(rec?.passedAt);
            return (
              <FadeInView key={scene.id} index={INDUCTION_MODULES.length + 1 + i}>
                <PressableScale
                  accessibilityRole="button"
                  accessibilityLabel={`Hazard spotting: ${scene.title}${passedScene ? ', cleared' : ''}`}
                  onPress={() => router.push(`/induction/hazard/${scene.id}`)}
                  style={[styles.glossaryCard, shadows.soft]}
                >
                  {passedScene ? (
                    <CheckCircle2 size={iconSizes.md} color={colors.success} />
                  ) : (
                    <ShieldAlert size={iconSizes.md} color={colors.warning} />
                  )}
                  <View style={styles.moduleInfo}>
                    <Text style={styles.moduleTitle}>{scene.title}</Text>
                    <Text style={styles.moduleSummary}>
                      {rec ? `${passedScene ? 'Cleared' : 'Try again'} · best ${rec.bestFound}/${rec.total}` : `Find ${scene.hazards.length} hazards`}
                    </Text>
                  </View>
                  <ChevronRight size={iconSizes.md} color={colors.textMuted} />
                </PressableScale>
              </FadeInView>
            );
          })}

          <FadeInView index={INDUCTION_MODULES.length + 1}>
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel="Open glossary"
              onPress={() => router.push('/induction/glossary')}
              style={[styles.glossaryCard, shadows.soft]}
            >
              <BookOpen size={iconSizes.md} color={colors.info} />
              <View style={styles.moduleInfo}>
                <Text style={styles.moduleTitle}>Glossary</Text>
                <Text style={styles.moduleSummary}>Payload, cycle time, windrow and more</Text>
              </View>
              <ChevronRight size={iconSizes.md} color={colors.textMuted} />
            </PressableScale>
          </FadeInView>

          <FadeInView index={INDUCTION_MODULES.length + 2} style={[styles.certCard, certified && styles.certCardDone]}>
            <View style={styles.certHeader}>
              <Award size={iconSizes.lg} color={certified ? colors.secondary : colors.textOnDarkMuted} />
              <Text style={styles.certTitle}>Induction Certificate</Text>
            </View>
            <Text style={styles.certLabel}>TRAINEE NAME</Text>
            <TextInput
              value={induction.traineeName}
              onChangeText={setTraineeName}
              placeholder="Enter your name"
              placeholderTextColor={colors.textOnDarkMuted}
              maxLength={MAX_TRAINEE_NAME}
              accessibilityLabel="Trainee name for the certificate"
              style={styles.input}
              autoCorrect={false}
              returnKeyType="done"
            />
            {certified ? (
              <View style={styles.certBody}>
                <Text style={styles.certName}>{induction.traineeName.trim() || 'Trainee'}</Text>
                <Text style={styles.certText}>
                  has completed all {progress.total} Site Induction modules: haul cycle, truck matching,
                  queueing, routes, fuel planning and site safety basics.
                </Text>
                <Text style={styles.certDate}>
                  Issued {new Date(induction.certifiedAt!).toLocaleDateString()}
                </Text>
                <Text style={styles.certNote}>
                  Game training record only — always complete your site’s official induction.
                </Text>
                <PrimaryButton
                  label={exporting ? 'PREPARING PDF…' : 'EXPORT PDF'}
                  icon={<Share2 size={iconSizes.sm} color={colors.textOnDark} />}
                  accessibilityHint="Creates a PDF certificate you can share with your supervisor or HR"
                  onPress={exportCertificate}
                  disabled={exporting}
                />
              </View>
            ) : (
              <Text style={styles.certLocked}>
                Pass all {progress.total} module checks to unlock your certificate. {progress.total - progress.completed} to go.
              </Text>
            )}
          </FadeInView>
        </ScrollView>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  hazardHeading: { ...typography.caption, color: colors.textOnDark, fontWeight: '800', letterSpacing: 1, marginTop: spacing.sm },
  bg: { flex: 1, backgroundColor: colors.surface },
  safe: { flex: 1 },
  content: {
    padding: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing.xxl,
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
  },
  progressCard: { backgroundColor: colors.card, borderRadius: radius.xl, padding: spacing.lg, gap: spacing.sm },
  progressTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: spacing.xs },
  progressLabel: { ...typography.label, color: colors.textMuted },
  progressValue: { ...typography.heading, color: colors.text },
  track: { height: layout.progressHeight, borderRadius: radius.pill, backgroundColor: colors.surfaceMuted, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.pill, backgroundColor: colors.success },
  progressHint: { ...typography.caption, color: colors.textMuted },
  moduleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    minHeight: minTouchTarget + spacing.xl,
  },
  moduleIcon: {
    width: layout.iconBadge + spacing.sm,
    height: layout.iconBadge + spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moduleIconDone: { backgroundColor: colors.success },
  moduleInfo: { flex: 1, gap: 2 },
  moduleNumber: { ...typography.tiny, color: colors.primary },
  moduleTitle: { ...typography.heading, color: colors.text },
  moduleSummary: { ...typography.caption, color: colors.textMuted },
  moduleScore: { ...typography.tiny, marginTop: 2 },
  scoreDone: { color: colors.success },
  scoreRetry: { color: colors.warning },
  glossaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    minHeight: minTouchTarget + spacing.md,
  },
  certCard: {
    backgroundColor: colors.glassDark,
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderOnDark,
  },
  certCardDone: { borderColor: colors.secondary, borderWidth: 2 },
  certHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  certTitle: { ...typography.heading, color: colors.textOnDark },
  certLabel: { ...typography.tiny, color: colors.textOnDarkMuted, marginTop: spacing.xs },
  input: {
    ...typography.body,
    color: colors.textOnDark,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    minHeight: minTouchTarget,
  },
  certBody: { gap: spacing.xs, alignItems: 'center', paddingTop: spacing.sm },
  certName: { ...typography.title, color: colors.secondary, textAlign: 'center' },
  certText: { ...typography.body, color: colors.textOnDark, textAlign: 'center' },
  certDate: { ...typography.label, color: colors.textOnDarkMuted },
  certNote: { ...typography.caption, color: colors.textOnDarkMuted, textAlign: 'center' },
  certLocked: { ...typography.caption, color: colors.textOnDarkMuted },
});
