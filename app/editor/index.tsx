/**
 * Level editor — list of the player's own levels, plus importing a level
 * shared as a code. Custom levels are for practice: no XP or coins.
 */

import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Alert, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Pencil, Play, Plus, Share2, Trash2, XCircle } from 'lucide-react-native';
import { colors, iconSizes, layout, minTouchTarget, radius, shadows, spacing, typography } from '@/theme/tokens';
import { compileDraft } from '@/game/editor/customLevel';
import { decodeLevelCode, encodeLevelCode } from '@/game/editor/draftCode';
import { MAX_CUSTOM_LEVELS, useCustomLevels } from '@/state/customLevelStore';
import { useT } from '@/i18n';
import { formatNumber } from '@/utils/format';
import { FadeInView } from '@/components/FadeInView';
import { PressableScale } from '@/components/PressableScale';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ScreenHeader } from '@/components/ScreenHeader';
import { hapticSuccess, hapticWarning } from '@/services/haptics';

export default function EditorListScreen() {
  const router = useRouter();
  const { t, tx } = useT();
  const drafts = useCustomLevels((s) => s.drafts);
  const bests = useCustomLevels((s) => s.bests);
  const create = useCustomLevels((s) => s.create);
  const remove = useCustomLevels((s) => s.remove);
  const [code, setCode] = useState('');
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const full = drafts.length >= MAX_CUSTOM_LEVELS;

  const newLevel = () => {
    const id = create();
    if (id) router.push(`/editor/${id}` as never);
    else setMessage({ ok: false, text: t('editor.list.full', { max: MAX_CUSTOM_LEVELS }) });
  };

  const importCode = () => {
    const parsed = decodeLevelCode(code);
    if (!parsed.ok) {
      hapticWarning();
      setMessage({ ok: false, text: t(`editor.import.${parsed.reason}`) });
      return;
    }
    const id = create(parsed.draft);
    if (!id) {
      setMessage({ ok: false, text: t('editor.list.full', { max: MAX_CUSTOM_LEVELS }) });
      return;
    }
    hapticSuccess();
    setCode('');
    setMessage({ ok: true, text: t('editor.import.added', { name: parsed.draft.name }) });
  };

  const confirmDelete = (id: string, name: string) => {
    Alert.alert(t('editor.list.deleteTitle'), t('editor.list.deleteBody', { name }), [
      { text: t('editor.common.cancel'), style: 'cancel' },
      { text: t('editor.common.delete'), style: 'destructive', onPress: () => remove(id) },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScreenHeader title={t('editor.list.title')} subtitle={t('editor.list.subtitle')} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <PrimaryButton
          label={t('editor.list.new')}
          icon={<Plus size={iconSizes.sm} color={colors.textOnDark} />}
          onPress={newLevel}
          disabled={full}
        />
        <Text style={styles.note}>{t('editor.list.noRewards')}</Text>

        {drafts.length === 0 ? <Text style={styles.empty}>{t('editor.list.empty')}</Text> : null}
        {drafts.map((d, i) => {
          const playable = compileDraft(d).ok;
          const best = bests[d.id];
          return (
            <FadeInView key={d.id} index={i} style={[styles.card, shadows.soft]}>
              <View style={styles.cardHead}>
                <View style={styles.flex}>
                  <Text style={styles.name} numberOfLines={1}>
                    {tx(d.name)}
                  </Text>
                  <Text style={styles.meta}>
                    {t('editor.list.stats', { trucks: d.trucks.length, tons: d.targetTons, minutes: Math.round(d.timeLimit / 60) })}
                    {best ? ` · ${t('editor.list.best', { score: formatNumber(best.bestScore) })}` : ''}
                  </Text>
                  {!playable ? <Text style={styles.warn}>{t('editor.list.notPlayable')}</Text> : null}
                </View>
                <IconAction
                  label={t('editor.list.share')}
                  onPress={() => {
                    const message = t('editor.share.message', { name: d.name, code: encodeLevelCode(d) });
                    Share.share({ message }).catch(() => undefined);
                  }}
                  icon={<Share2 size={iconSizes.sm} color={colors.info} />}
                />
                <IconAction
                  label={t('editor.list.delete')}
                  onPress={() => confirmDelete(d.id, d.name)}
                  icon={<Trash2 size={iconSizes.sm} color={colors.danger} />}
                />
              </View>
              <View style={styles.row}>
                <PrimaryButton
                  label={t('editor.list.edit')}
                  variant="outline"
                  icon={<Pencil size={iconSizes.xs} color={colors.primary} />}
                  onPress={() => router.push(`/editor/${d.id}` as never)}
                  style={styles.flex}
                />
                <PrimaryButton
                  label={t('editor.list.play')}
                  icon={<Play size={iconSizes.xs} color={colors.textOnDark} />}
                  disabled={!playable}
                  onPress={() => router.push(`/game/${d.id}` as never)}
                  style={styles.flex}
                />
              </View>
            </FadeInView>
          );
        })}

        <View style={[styles.card, shadows.soft]}>
          <Text style={styles.label}>{t('editor.import.title')}</Text>
          <TextInput
            value={code}
            onChangeText={(v) => {
              setCode(v);
              setMessage(null);
            }}
            placeholder={t('editor.import.placeholder')}
            placeholderTextColor={colors.textMuted}
            multiline
            autoCorrect={false}
            autoCapitalize="none"
            accessibilityLabel={t('editor.import.title')}
            style={styles.input}
          />
          {message ? (
            <View style={styles.message} accessibilityLiveRegion="polite">
              {message.ok ? null : <XCircle size={iconSizes.sm} color={colors.danger} />}
              <Text style={[styles.messageText, message.ok && styles.messageOk]}>{message.text}</Text>
            </View>
          ) : null}
          <PrimaryButton label={t('editor.import.add')} disabled={code.trim().length === 0} onPress={importCode} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function IconAction({ icon, label, onPress }: { icon: React.ReactNode; label: string; onPress: () => void }) {
  return (
    <PressableScale onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={styles.iconAction} hitSlop={6}>
      {icon}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: {
    padding: layout.gutter,
    gap: spacing.md,
    paddingBottom: spacing.xxl,
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
  },
  note: { ...typography.caption, color: colors.textMuted, textAlign: 'center' },
  empty: { ...typography.body, color: colors.textMuted, textAlign: 'center', paddingVertical: spacing.lg },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.md, gap: spacing.sm },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  flex: { flex: 1 },
  name: { ...typography.heading, color: colors.text },
  meta: { ...typography.caption, color: colors.textMuted },
  warn: { ...typography.caption, color: colors.warning, fontWeight: '700' },
  row: { flexDirection: 'row', gap: spacing.sm },
  iconAction: {
    width: minTouchTarget,
    height: minTouchTarget,
    borderRadius: minTouchTarget / 2,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { ...typography.caption, color: colors.textMuted, fontWeight: '800', letterSpacing: 1 },
  input: {
    ...typography.body,
    color: colors.text,
    backgroundColor: colors.background,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  message: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  messageText: { ...typography.caption, color: colors.danger, flex: 1 },
  messageOk: { color: colors.success },
});
