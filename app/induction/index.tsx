/**
 * Site Induction — track overview: progress, modules, glossary and certificate.
 */

import { useState } from 'react';
import { useRouter } from 'expo-router';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { File, Paths } from 'expo-file-system';
import { Alert, ImageBackground, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Award,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Download,
  Package,
  Upload,
  RotateCcw,
  FileSpreadsheet,
  Share2,
  ShieldAlert,
} from 'lucide-react-native';
import { colors, iconSizes, layout, minTouchTarget, radius, shadows, spacing, typography } from '@/theme/tokens';
import { useActivePack, useContentStore } from '@/state/contentStore';
import { contentPackJson } from '@/game/induction/contentPack';
import * as DocumentPicker from 'expo-document-picker';
import { HAZARD_SCENES } from '@/game/induction/hazards';
import { MAX_TRAINEE_NAME, certificateExpiresAt, certificateStatus, inductionProgress } from '@/state/save';
import { useProgression } from '@/state/progressionStore';
import { MODULE_ICONS } from '@/components/InductionArt';
import { FadeInView } from '@/components/FadeInView';
import { PressableScale } from '@/components/PressableScale';
import { Scrim } from '@/components/Scrim';
import { ScreenHeader } from '@/components/ScreenHeader';
import { PrimaryButton } from '@/components/PrimaryButton';
import { buildCertificateHtml } from '@/game/induction/certificate';
import { buildTrainingReportCsv } from '@/game/induction/report';

const bgInduction = require('../../assets/images/bg-induction.png');

export default function InductionScreen() {
  const router = useRouter();
  const induction = useProgression((s) => s.induction);
  const setTraineeName = useProgression((s) => s.setTraineeName);
  const setTraineeField = useProgression((s) => s.setTraineeField);
  const renew = useProgression((s) => s.renewInduction);
  const pack = useActivePack();
  const INDUCTION_MODULES = pack.modules;
  const PRESTART_SCENARIOS = pack.prestart;
  const progress = inductionProgress(induction, INDUCTION_MODULES.map((m) => m.id));
  const [exporting, setExporting] = useState(false);

  const customPack = useContentStore((s) => s.custom);
  const importPack = useContentStore((s) => s.importPack);
  const resetPack = useContentStore((s) => s.resetToBuiltIn);

  const pickPack = async () => {
    try {
      const picked = await DocumentPicker.getDocumentAsync({ type: ['application/json', 'text/plain', '*/*'], copyToCacheDirectory: true });
      if (picked.canceled || !picked.assets?.[0]) return;
      const raw = await new File(picked.assets[0].uri).text();
      const result = importPack(raw);
      if (result.ok) {
        Alert.alert('Content pack loaded', `${result.pack.name} v${result.pack.version}: ${result.pack.modules.length} modules, ${result.pack.prestart.length} pre-start checks.`);
      } else {
        const shown = result.errors.slice(0, 8);
        if (result.errors.length > 8) shown.push(`…and ${result.errors.length - 8} more`);
        Alert.alert('Pack not loaded', shown.join(String.fromCharCode(10)));
      }
    } catch {
      Alert.alert('Import failed', 'The file could not be read.');
    }
  };

  const exportTemplate = async () => {
    try {
      const file = new File(Paths.cache, 'induction-content-pack.json');
      if (file.exists) file.delete();
      file.create();
      file.write(contentPackJson(pack));
      await Sharing.shareAsync(file.uri, { mimeType: 'application/json', dialogTitle: 'Share content pack' });
    } catch {
      Alert.alert('Export failed', 'The content pack could not be created.');
    }
  };

  const confirmResetPack = () =>
    Alert.alert('Use built-in content', 'Remove the imported content pack and go back to the built-in induction?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset', style: 'destructive', onPress: resetPack },
    ]);

  const exportReport = async () => {
    setExporting(true);
    try {
      const name = (induction.traineeName.trim() || 'trainee').replace(/[^a-z0-9]+/gi, '-').toLowerCase();
      const file = new File(Paths.cache, `training-report-${name}-${new Date().toISOString().slice(0, 10)}.csv`);
      if (file.exists) file.delete();
      file.create();
      file.write(buildTrainingReportCsv(induction, Date.now(), pack));
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, { mimeType: 'text/csv', dialogTitle: 'Share training report', UTI: 'public.comma-separated-values-text' });
      } else {
        Alert.alert('Report saved', `Saved to ${file.uri}`);
      }
    } catch {
      Alert.alert('Export failed', 'The training report could not be created. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const exportCertificate = async () => {
    setExporting(true);
    try {
      const { uri } = await Print.printToFileAsync({ html: buildCertificateHtml(induction, pack) });
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
  const certStatus = certificateStatus(induction, Date.now(), pack.version);
  const certified = certStatus === 'valid';
  const expired = certStatus === 'expired' || certStatus === 'outdated';
  const expiresAt = certificateExpiresAt(induction);
  const confirmRenew = () =>
    Alert.alert('Renew induction', 'This clears your passes so you can retake every module and practical check. Your details and history are kept.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Renew', onPress: renew },
    ]);

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

          <Text style={styles.hazardHeading}>PRE-START CHECK (P2H)</Text>
          {PRESTART_SCENARIOS.map((scenario, i) => {
            const rec = induction.prestart[scenario.id];
            const passedCheck = Boolean(rec?.passedAt);
            return (
              <FadeInView key={scenario.id} index={INDUCTION_MODULES.length + 4 + i}>
                <PressableScale
                  accessibilityRole="button"
                  accessibilityLabel={`Pre-start check: ${scenario.title}${passedCheck ? ', passed' : ''}`}
                  onPress={() => router.push(`/induction/prestart/${scenario.id}`)}
                  style={[styles.glossaryCard, shadows.soft]}
                >
                  {passedCheck ? (
                    <CheckCircle2 size={iconSizes.md} color={colors.success} />
                  ) : (
                    <ClipboardCheck size={iconSizes.md} color={colors.info} />
                  )}
                  <View style={styles.moduleInfo}>
                    <Text style={styles.moduleTitle}>{scenario.title}</Text>
                    <Text style={styles.moduleSummary}>
                      {rec ? `${passedCheck ? 'Passed' : 'Try again'} · best ${rec.bestCorrect}/${rec.total}` : `${scenario.items.length}-point inspection`}
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

          <FadeInView index={INDUCTION_MODULES.length + 2} style={[styles.packCard, shadows.soft]}>
            <View style={styles.packHead}>
              <Package size={iconSizes.md} color={colors.info} />
              <View style={styles.moduleInfo}>
                <Text style={styles.moduleTitle}>Content pack</Text>
                <Text style={styles.moduleSummary}>
                  {pack.name} · v{pack.version}
                  {customPack ? ' · imported' : ' · built-in'}
                </Text>
              </View>
            </View>
            <Text style={styles.packHint}>
              HSE teams can export the template, edit modules, glossary and pre-start checks, then import it here.
            </Text>
            <View style={styles.packButtons}>
              <PrimaryButton label="IMPORT" variant="outline" icon={<Upload size={iconSizes.sm} color={colors.text} />} onPress={pickPack} style={styles.packButton} />
              <PrimaryButton label="TEMPLATE" variant="outline" icon={<Download size={iconSizes.sm} color={colors.text} />} onPress={exportTemplate} style={styles.packButton} />
            </View>
            {customPack ? <PrimaryButton label="USE BUILT-IN CONTENT" variant="ghost" onPress={confirmResetPack} /> : null}
          </FadeInView>

          <FadeInView index={INDUCTION_MODULES.length + 2}>
            <PrimaryButton
              label={exporting ? 'PREPARING…' : 'EXPORT TRAINING REPORT (CSV)'}
              variant="outline"
              icon={<FileSpreadsheet size={iconSizes.sm} color={colors.text} />}
              accessibilityHint="Creates a spreadsheet of all induction results to send to your supervisor or HSE"
              onPress={exportReport}
              disabled={exporting}
              style={styles.reportButton}
            />
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
            {(
              [
                ['employeeId', 'EMPLOYEE ID', 'e.g. ID-1042'],
                ['site', 'SITE', 'e.g. North Pit'],
                ['company', 'COMPANY / CONTRACTOR', 'e.g. Contractor A'],
              ] as const
            ).map(([field, label, placeholder]) => (
              <View key={field}>
                <Text style={styles.certLabel}>{label}</Text>
                <TextInput
                  value={induction[field]}
                  onChangeText={(v) => setTraineeField(field, v)}
                  placeholder={placeholder}
                  placeholderTextColor={colors.textOnDarkMuted}
                  maxLength={MAX_TRAINEE_NAME}
                  accessibilityLabel={label.toLowerCase()}
                  style={styles.input}
                  autoCorrect={false}
                  returnKeyType="done"
                />
              </View>
            ))}
            {certified ? (
              <View style={styles.certBody}>
                <Text style={styles.certName}>{induction.traineeName.trim() || 'Trainee'}</Text>
                <Text style={styles.certText}>
                  has completed all {progress.total} Site Induction modules: haul cycle, truck matching,
                  queueing, routes, fuel planning and site safety basics.
                </Text>
                <Text style={styles.certDate}>
                  Issued {new Date(induction.certifiedAt!).toLocaleDateString()} · valid until{' '}
                  {new Date(expiresAt!).toLocaleDateString()}
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
            ) : expired ? (
              <View style={styles.certBody}>
                <Text style={styles.certExpired}>
                  {certStatus === 'outdated'
                    ? `Content updated to v${pack.version}`
                    : `Certificate expired on ${new Date(expiresAt!).toLocaleDateString()}`}
                </Text>
                <Text style={styles.certText}>
                  {certStatus === 'outdated'
                    ? 'The site induction content has changed since you were certified. Renew to retake it.'
                    : 'Inductions must be renewed every year. Renew to retake the modules and practical checks.'}
                </Text>
                <PrimaryButton label="RENEW INDUCTION" icon={<RotateCcw size={iconSizes.sm} color={colors.textOnDark} />} onPress={confirmRenew} />
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
  packCard: { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.md, gap: spacing.sm },
  packHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  packHint: { ...typography.caption, color: colors.textMuted },
  packButtons: { flexDirection: 'row', gap: spacing.sm },
  packButton: { flex: 1 },
  certExpired: { ...typography.label, color: colors.warning },
  reportButton: { backgroundColor: colors.card },
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
