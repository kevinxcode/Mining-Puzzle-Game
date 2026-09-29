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
import { useT } from '@/i18n';

const bgInduction = require('../../assets/images/bg-induction.png');

export default function InductionScreen() {
  const router = useRouter();
  const { t, tx, language } = useT();
  const fmtDate = (ts: number) => new Date(ts).toLocaleDateString(language === 'id' ? 'id-ID' : undefined);
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
        Alert.alert(
          t('induction.pack.loadedTitle'),
          t('induction.pack.loadedBody', { name: result.pack.name, version: result.pack.version, modules: result.pack.modules.length, prestart: result.pack.prestart.length }),
        );
      } else {
        const shown = result.errors.slice(0, 8);
        if (result.errors.length > 8) shown.push(t('induction.pack.more', { count: result.errors.length - 8 }));
        Alert.alert(t('induction.pack.notLoaded'), shown.join(String.fromCharCode(10)));
      }
    } catch {
      Alert.alert(t('induction.pack.importFailed'), t('induction.pack.unreadable'));
    }
  };

  const exportTemplate = async () => {
    try {
      const file = new File(Paths.cache, 'induction-content-pack.json');
      if (file.exists) file.delete();
      file.create();
      file.write(contentPackJson(pack));
      await Sharing.shareAsync(file.uri, { mimeType: 'application/json', dialogTitle: t('induction.pack.share') });
    } catch {
      Alert.alert(t('induction.exportFailed'), t('induction.pack.exportFailedBody'));
    }
  };

  const confirmResetPack = () =>
    Alert.alert(t('induction.pack.resetTitle'), t('induction.pack.resetBody'), [
      { text: t('induction.cancel'), style: 'cancel' },
      { text: t('induction.pack.reset'), style: 'destructive', onPress: resetPack },
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
        await Sharing.shareAsync(file.uri, { mimeType: 'text/csv', dialogTitle: t('induction.report.share'), UTI: 'public.comma-separated-values-text' });
      } else {
        Alert.alert(t('induction.report.saved'), t('induction.savedTo', { uri: file.uri }));
      }
    } catch {
      Alert.alert(t('induction.exportFailed'), t('induction.report.failed'));
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
          dialogTitle: t('induction.cert.share'),
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert(t('induction.cert.saved'), t('induction.savedTo', { uri }));
      }
    } catch {
      Alert.alert(t('induction.exportFailed'), t('induction.cert.failed'));
    } finally {
      setExporting(false);
    }
  };
  const certStatus = certificateStatus(induction, Date.now(), pack.version);
  const certified = certStatus === 'valid';
  const expired = certStatus === 'expired' || certStatus === 'outdated';
  const expiresAt = certificateExpiresAt(induction);
  const confirmRenew = () =>
    Alert.alert(t('induction.renew.title'), t('induction.renew.body'), [
      { text: t('induction.cancel'), style: 'cancel' },
      { text: t('induction.renew.confirm'), onPress: renew },
    ]);

  return (
    <ImageBackground source={bgInduction} style={styles.bg} resizeMode="cover">
      <Scrim topOpacity={0.8} bottomOpacity={0.35} />
      <SafeAreaView style={styles.safe}>
        <ScreenHeader title={t('induction.title')} subtitle={t('induction.subtitle')} tone="dark" />
        <ScrollView contentContainerStyle={styles.content}>
          <FadeInView style={[styles.progressCard, shadows.raised]}>
            <View style={styles.progressTop}>
              <Text style={styles.progressLabel}>{t('induction.progress.label')}</Text>
              <Text style={styles.progressValue}>
                {t('induction.progress.value', { completed: progress.completed, total: progress.total })}
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
                ? t('induction.progress.done')
                : t('induction.progress.hint')}
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
                  accessibilityLabel={t('induction.module.a11y', { number: module.number, title: module.title, status: done ? t('induction.module.completed') : t('induction.module.notCompleted') })}
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
                    <Text style={styles.moduleNumber}>{t('induction.module.number', { number: module.number })}</Text>
                    <Text style={styles.moduleTitle}>{module.title}</Text>
                    <Text style={styles.moduleSummary} numberOfLines={2}>
                      {module.summary}
                    </Text>
                    {record ? (
                      <Text style={[styles.moduleScore, done ? styles.scoreDone : styles.scoreRetry]}>
                        {t('induction.status.best', { status: done ? t('induction.status.passed') : t('induction.status.tryAgain'), best: record.bestScore, total: record.total })}
                      </Text>
                    ) : null}
                  </View>
                  <ChevronRight size={iconSizes.md} color={colors.textMuted} />
                </PressableScale>
              </FadeInView>
            );
          })}

          <Text style={styles.hazardHeading}>{t('induction.hazard.heading')}</Text>
          {HAZARD_SCENES.map((scene, i) => {
            const rec = induction.hazards[scene.id];
            const passedScene = Boolean(rec?.passedAt);
            return (
              <FadeInView key={scene.id} index={INDUCTION_MODULES.length + 1 + i}>
                <PressableScale
                  accessibilityRole="button"
                  accessibilityLabel={t(passedScene ? 'induction.hazard.a11yCleared' : 'induction.hazard.a11y', { title: tx(scene.title) })}
                  onPress={() => router.push(`/induction/hazard/${scene.id}`)}
                  style={[styles.glossaryCard, shadows.soft]}
                >
                  {passedScene ? (
                    <CheckCircle2 size={iconSizes.md} color={colors.success} />
                  ) : (
                    <ShieldAlert size={iconSizes.md} color={colors.warning} />
                  )}
                  <View style={styles.moduleInfo}>
                    <Text style={styles.moduleTitle}>{tx(scene.title)}</Text>
                    <Text style={styles.moduleSummary}>
                      {rec
                        ? t('induction.status.best', { status: passedScene ? t('induction.status.cleared') : t('induction.status.tryAgain'), best: rec.bestFound, total: rec.total })
                        : t('induction.hazard.find', { count: scene.hazards.length })}
                    </Text>
                  </View>
                  <ChevronRight size={iconSizes.md} color={colors.textMuted} />
                </PressableScale>
              </FadeInView>
            );
          })}

          <Text style={styles.hazardHeading}>{t('induction.prestart.heading')}</Text>
          {PRESTART_SCENARIOS.map((scenario, i) => {
            const rec = induction.prestart[scenario.id];
            const passedCheck = Boolean(rec?.passedAt);
            return (
              <FadeInView key={scenario.id} index={INDUCTION_MODULES.length + 4 + i}>
                <PressableScale
                  accessibilityRole="button"
                  accessibilityLabel={t(passedCheck ? 'induction.prestart.a11yPassed' : 'induction.prestart.a11y', { title: scenario.title })}
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
                      {rec
                        ? t('induction.status.best', { status: passedCheck ? t('induction.status.passed') : t('induction.status.tryAgain'), best: rec.bestCorrect, total: rec.total })
                        : t('induction.prestart.points', { count: scenario.items.length })}
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
              accessibilityLabel={t('induction.glossary.open')}
              onPress={() => router.push('/induction/glossary')}
              style={[styles.glossaryCard, shadows.soft]}
            >
              <BookOpen size={iconSizes.md} color={colors.info} />
              <View style={styles.moduleInfo}>
                <Text style={styles.moduleTitle}>{t('induction.glossary.title')}</Text>
                <Text style={styles.moduleSummary}>{t('induction.glossary.teaser')}</Text>
              </View>
              <ChevronRight size={iconSizes.md} color={colors.textMuted} />
            </PressableScale>
          </FadeInView>

          <FadeInView index={INDUCTION_MODULES.length + 2} style={[styles.packCard, shadows.soft]}>
            <View style={styles.packHead}>
              <Package size={iconSizes.md} color={colors.info} />
              <View style={styles.moduleInfo}>
                <Text style={styles.moduleTitle}>{t('induction.pack.title')}</Text>
                <Text style={styles.moduleSummary}>
                  {pack.name} · v{pack.version}
                  {customPack ? t('induction.pack.imported') : t('induction.pack.builtIn')}
                </Text>
              </View>
            </View>
            <Text style={styles.packHint}>
              {t('induction.pack.hint')}
            </Text>
            <View style={styles.packButtons}>
              <PrimaryButton label={t('induction.pack.import')} variant="outline" icon={<Upload size={iconSizes.sm} color={colors.text} />} onPress={pickPack} style={styles.packButton} />
              <PrimaryButton label={t('induction.pack.template')} variant="outline" icon={<Download size={iconSizes.sm} color={colors.text} />} onPress={exportTemplate} style={styles.packButton} />
            </View>
            {customPack ? <PrimaryButton label={t('induction.pack.useBuiltIn')} variant="ghost" onPress={confirmResetPack} /> : null}
          </FadeInView>

          <FadeInView index={INDUCTION_MODULES.length + 2}>
            <PrimaryButton
              label={exporting ? t('induction.preparing') : t('induction.report.button')}
              variant="outline"
              icon={<FileSpreadsheet size={iconSizes.sm} color={colors.text} />}
              accessibilityHint={t('induction.report.hint')}
              onPress={exportReport}
              disabled={exporting}
              style={styles.reportButton}
            />
          </FadeInView>

          <FadeInView index={INDUCTION_MODULES.length + 2} style={[styles.certCard, certified && styles.certCardDone]}>
            <View style={styles.certHeader}>
              <Award size={iconSizes.lg} color={certified ? colors.secondary : colors.textOnDarkMuted} />
              <Text style={styles.certTitle}>{t('induction.cert.title')}</Text>
            </View>
            <Text style={styles.certLabel}>{t('induction.field.name')}</Text>
            <TextInput
              value={induction.traineeName}
              onChangeText={setTraineeName}
              placeholder={t('induction.field.namePlaceholder')}
              placeholderTextColor={colors.textOnDarkMuted}
              maxLength={MAX_TRAINEE_NAME}
              accessibilityLabel={t('induction.field.nameA11y')}
              style={styles.input}
              autoCorrect={false}
              returnKeyType="done"
            />
            {(
              [
                ['employeeId', t('induction.field.employeeId'), t('induction.field.employeeIdPlaceholder'), t('induction.field.employeeIdA11y')],
                ['site', t('induction.field.site'), t('induction.field.sitePlaceholder'), t('induction.field.siteA11y')],
                ['company', t('induction.field.company'), t('induction.field.companyPlaceholder'), t('induction.field.companyA11y')],
              ] as const
            ).map(([field, label, placeholder, a11y]) => (
              <View key={field}>
                <Text style={styles.certLabel}>{label}</Text>
                <TextInput
                  value={induction[field]}
                  onChangeText={(v) => setTraineeField(field, v)}
                  placeholder={placeholder}
                  placeholderTextColor={colors.textOnDarkMuted}
                  maxLength={MAX_TRAINEE_NAME}
                  accessibilityLabel={a11y}
                  style={styles.input}
                  autoCorrect={false}
                  returnKeyType="done"
                />
              </View>
            ))}
            {certified ? (
              <View style={styles.certBody}>
                <Text style={styles.certName}>{induction.traineeName.trim() || t('induction.trainee')}</Text>
                <Text style={styles.certText}>
                  {t('induction.cert.completed', { total: progress.total })}
                </Text>
                <Text style={styles.certDate}>
                  {t('induction.cert.dates', { issued: fmtDate(induction.certifiedAt!), until: fmtDate(expiresAt!) })}
                </Text>
                <Text style={styles.certNote}>
                  {t('induction.cert.gameNote')}
                </Text>
                <PrimaryButton
                  label={exporting ? t('induction.cert.preparingPdf') : t('induction.cert.exportPdf')}
                  icon={<Share2 size={iconSizes.sm} color={colors.textOnDark} />}
                  accessibilityHint={t('induction.cert.pdfHint')}
                  onPress={exportCertificate}
                  disabled={exporting}
                />
              </View>
            ) : expired ? (
              <View style={styles.certBody}>
                <Text style={styles.certExpired}>
                  {certStatus === 'outdated'
                    ? t('induction.cert.outdated', { version: pack.version })
                    : t('induction.cert.expiredOn', { date: fmtDate(expiresAt!) })}
                </Text>
                <Text style={styles.certText}>
                  {certStatus === 'outdated'
                    ? t('induction.cert.outdatedBody')
                    : t('induction.cert.expiredBody')}
                </Text>
                <PrimaryButton label={t('induction.renew.button')} icon={<RotateCcw size={iconSizes.sm} color={colors.textOnDark} />} onPress={confirmRenew} />
              </View>
            ) : (
              <Text style={styles.certLocked}>
                {t('induction.cert.locked', { total: progress.total, left: progress.total - progress.completed })}
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
