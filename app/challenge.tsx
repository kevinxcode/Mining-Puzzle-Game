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

const formatTime = (seconds: number) => {
  const s = Math.round(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

export default function ChallengeScreen() {
  const router = useRouter();
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
      <ScreenHeader title="Friend Challenge" subtitle="Beat a friend's run — no internet needed" />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={[styles.card, shadows.soft]}>
          <Text style={styles.label}>YOUR NICKNAME</Text>
          <TextInput
            value={nickname}
            onChangeText={setNickname}
            placeholder="Shown to friends, e.g. Pit Boss"
            placeholderTextColor={colors.textMuted}
            maxLength={20}
            autoCorrect={false}
            accessibilityLabel="Your nickname"
            style={styles.input}
          />
          <Text style={styles.hint}>
            Share a challenge from any level you have finished: open the level and tap SHARE CHALLENGE. Only your
            nickname and moves are included.
          </Text>
        </View>

        <View style={[styles.card, shadows.soft]}>
          <Text style={styles.label}>PASTE A CHALLENGE CODE</Text>
          <TextInput
            value={code}
            onChangeText={(t) => {
              setCode(t);
              setError(null);
            }}
            placeholder="MPG1.…"
            placeholderTextColor={colors.textMuted}
            multiline
            autoCorrect={false}
            autoCapitalize="none"
            accessibilityLabel="Challenge code"
            style={[styles.input, styles.codeInput]}
          />
          {error ? (
            <View style={styles.error} accessibilityLiveRegion="polite">
              <XCircle size={iconSizes.sm} color={colors.danger} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}
          <PrimaryButton label="CHECK CODE" disabled={code.trim().length === 0} onPress={check} />
        </View>

        {loaded && level ? (
          <Animated.View entering={FadeInUp} style={[styles.card, shadows.raised]}>
            <View style={styles.resultHead}>
              <Swords size={iconSizes.md} color={colors.primary} />
              <View style={styles.flex}>
                <Text style={styles.eyebrow}>{loaded.challenge.nickname.toUpperCase()} CHALLENGES YOU</Text>
                <Text style={styles.title}>
                  Level {level.id} · {level.name}
                </Text>
              </View>
            </View>
            {loaded.result.success ? (
              <>
                <StarRating count={loaded.result.stars} size={iconSizes.md} />
                <Text style={styles.score}>{formatNumber(loaded.result.score)} pts</Text>
                <Text style={styles.body}>
                  {Math.round(loaded.result.tons)} / {loaded.result.targetTons} t in {formatTime(loaded.result.seconds)}
                  {myBest > 0 ? ` · your best: ${formatNumber(myBest)} pts` : ''}
                </Text>
              </>
            ) : (
              <Text style={styles.body}>This run did not complete the mission — an easy one to beat.</Text>
            )}
            <View style={styles.verified}>
              <ShieldCheck size={iconSizes.sm} color={colors.success} />
              <Text style={styles.verifiedText}>Score verified by replaying the run on this phone.</Text>
            </View>
            <PrimaryButton
              label="WATCH THEIR RUN"
              variant="outline"
              icon={<Ghost size={iconSizes.sm} color={colors.primary} />}
              onPress={() => {
                setActive(loaded.challenge);
                router.push(`/game/${level.id}?ghost=challenge` as never);
              }}
            />
            <PrimaryButton
              label={playable ? 'PLAY TO BEAT IT' : `FINISH LEVEL ${levelNumber - 1} TO UNLOCK`}
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
