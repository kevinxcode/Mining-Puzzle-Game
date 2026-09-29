/**
 * Friend challenge — paste a code from chat, see the run's score as verified
 * by replaying it locally, then watch the ghost or play the level to beat it.
 */

import { useState } from 'react';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Ghost, Play, ShieldCheck, Swords, XCircle } from 'lucide-react-native';
import { colors, iconSizes, layout, minTouchTarget, radius, shadows, spacing, typography } from '@/theme/tokens';
import { decodeChallenge, verifyChallenge, type Challenge, type ChallengeResult } from '@/game/challenge';
import { resolveLevel } from '@/game/levels/modeLevels';
import { useChallengeStore } from '@/state/challengeStore';
import { useProgression } from '@/state/progressionStore';
import { formatNumber } from '@/utils/format';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ScreenHeader } from '@/components/ScreenHeader';
import { StarRating } from '@/components/StarRating';
import { hapticSuccess, hapticWarning } from '@/services/haptics';
import { useT } from '@/i18n';
import { levelDisplayName } from '@/game/levels/levelText';

const formatTime = (seconds: number) => {
  const s = Math.round(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

export default function ChallengeScreen() {
  const router = useRouter();
  const { t } = useT();
  const nickname = useChallengeStore((s) => s.nickname);
  const setNickname = useChallengeStore((s) => s.setNickname);
  const setActive = useChallengeStore((s) => s.setActive);
  const levels = useProgression((s) => s.levels);

  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState<{ challenge: Challenge; result: ChallengeResult } | null>(null);

  const check = () => {
    const decoded = decodeChallenge(code);
    if (!decoded.ok) {
      setLoaded(null);
      setError(decoded.error);
      hapticWarning();
      return;
    }
    setError(null);
    setLoaded({ challenge: decoded.challenge, result: verifyChallenge(decoded.challenge) });
    hapticSuccess();
  };

  const level = loaded ? resolveLevel(loaded.challenge.levelId) : undefined;
  const myBest = loaded ? levels[loaded.challenge.levelId]?.bestScore ?? 0 : 0;
  // Same rule as the campaign map: a level opens once the previous one is completed.
  const levelNumber = level ? Number(level.id) : NaN;
  const playable = !Number.isInteger(levelNumber) || levelNumber <= 1 || Boolean(levels[String(levelNumber - 1)]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScreenHeader title={t('shell.challenge.title')} subtitle={t('shell.challenge.subtitle')} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={[styles.card, shadows.soft]}>
          <Text style={styles.label}>{t('shell.challenge.nickname')}</Text>
          <TextInput
            value={nickname}
            onChangeText={setNickname}
            placeholder={t('shell.challenge.nicknamePlaceholder')}
            placeholderTextColor={colors.textMuted}
            maxLength={20}
            autoCorrect={false}
            accessibilityLabel={t('shell.challenge.nicknameA11y')}
            style={styles.input}
          />
          <Text style={styles.hint}>{t('shell.challenge.shareHint')}</Text>
        </View>

        <View style={[styles.card, shadows.soft]}>
          <Text style={styles.label}>{t('shell.challenge.paste')}</Text>
          <TextInput
            value={code}
            onChangeText={(text) => {
              setCode(text);
              setError(null);
            }}
            placeholder="MPG1.…"
            placeholderTextColor={colors.textMuted}
            multiline
            autoCorrect={false}
            autoCapitalize="none"
            accessibilityLabel={t('shell.challenge.codeA11y')}
            style={[styles.input, styles.codeInput]}
          />
          {error ? (
            <View style={styles.error} accessibilityLiveRegion="polite">
              <XCircle size={iconSizes.sm} color={colors.danger} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}
          <PrimaryButton label={t('shell.challenge.check')} disabled={code.trim().length === 0} onPress={check} />
        </View>

        {loaded && level ? (
          <Animated.View entering={FadeInUp} style={[styles.card, shadows.raised]}>
            <View style={styles.resultHead}>
              <Swords size={iconSizes.md} color={colors.primary} />
              <View style={styles.flex}>
                <Text style={styles.eyebrow}>{t('shell.challenge.challengesYou', { name: loaded.challenge.nickname.toUpperCase() })}</Text>
                <Text style={styles.title}>{t('shell.challenge.level', { id: level.id, name: levelDisplayName(level) })}</Text>
              </View>
            </View>
            {loaded.result.success ? (
              <>
                <StarRating count={loaded.result.stars} size={iconSizes.md} />
                <Text style={styles.score}>{t('shell.challenge.points', { score: formatNumber(loaded.result.score) })}</Text>
                <Text style={styles.body}>
                  {t('shell.challenge.summary', { tons: Math.round(loaded.result.tons), target: loaded.result.targetTons, time: formatTime(loaded.result.seconds) })}
                  {myBest > 0 ? t('shell.challenge.yourBest', { score: formatNumber(myBest) }) : ''}
                </Text>
              </>
            ) : (
              <Text style={styles.body}>{t('shell.challenge.failed')}</Text>
            )}
            <View style={styles.verified}>
              <ShieldCheck size={iconSizes.sm} color={colors.success} />
              <Text style={styles.verifiedText}>{t('shell.challenge.verified')}</Text>
            </View>
            <PrimaryButton
              label={t('shell.challenge.watch')}
              variant="outline"
              icon={<Ghost size={iconSizes.sm} color={colors.primary} />}
              onPress={() => {
                setActive(loaded.challenge);
                router.push(`/game/${level.id}?ghost=challenge` as never);
              }}
            />
            <PrimaryButton
              label={playable ? t('shell.challenge.play') : t('shell.challenge.finishToUnlock', { level: levelNumber - 1 })}
              disabled={!playable}
              icon={playable ? <Play size={iconSizes.sm} color={colors.textOnDark} /> : undefined}
              onPress={() => router.push(`/level/${level.id}` as never)}
            />
          </Animated.View>
        ) : null}
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
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
  },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.md, gap: spacing.sm },
  label: { ...typography.caption, color: colors.textMuted, fontWeight: '800', letterSpacing: 1 },
  input: {
    ...typography.body,
    color: colors.text,
    backgroundColor: colors.background,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    minHeight: minTouchTarget,
  },
  codeInput: { minHeight: 96, paddingVertical: spacing.sm, textAlignVertical: 'top' },
  hint: { ...typography.caption, color: colors.textMuted, lineHeight: 18 },
  error: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  errorText: { ...typography.caption, color: colors.danger, flex: 1 },
  resultHead: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  flex: { flex: 1 },
  eyebrow: { ...typography.caption, color: colors.primary, fontWeight: '800', letterSpacing: 1 },
  title: { ...typography.heading, color: colors.text },
  score: { ...typography.title, color: colors.text },
  body: { ...typography.body, color: colors.textMuted },
  verified: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  verifiedText: { ...typography.caption, color: colors.success, flex: 1 },
});
