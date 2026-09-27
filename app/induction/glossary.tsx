/**
 * Site Induction — searchable glossary.
 */

import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search } from 'lucide-react-native';
import { colors, iconSizes, layout, minTouchTarget, radius, shadows, spacing, typography } from '@/theme/tokens';
import { GLOSSARY } from '@/game/induction/glossary';
import { FadeInView } from '@/components/FadeInView';
import { ScreenHeader } from '@/components/ScreenHeader';

export default function GlossaryScreen() {
  const [query, setQuery] = useState('');
  const terms = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...GLOSSARY]
      .sort((a, b) => a.term.localeCompare(b.term))
      .filter((t) => !q || t.term.toLowerCase().includes(q) || t.definition.toLowerCase().includes(q));
  }, [query]);

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title="Glossary" subtitle={`${GLOSSARY.length} site terms`} />
      <View style={styles.searchWrap}>
        <Search size={iconSizes.sm} color={colors.textMuted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search terms"
          placeholderTextColor={colors.textMuted}
          style={styles.search}
          accessibilityLabel="Search glossary"
          autoCorrect={false}
        />
      </View>
      <FlatList
        data={terms}
        keyExtractor={(t) => t.term}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={<Text style={styles.empty}>No matching terms.</Text>}
        renderItem={({ item, index }) => (
          <FadeInView index={index} style={[styles.item, shadows.soft]}>
            <Text style={styles.term}>{item.term}</Text>
            <Text style={styles.definition}>{item.definition}</Text>
          </FadeInView>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: minTouchTarget,
  },
  search: { ...typography.body, color: colors.text, flex: 1, minHeight: minTouchTarget },
  list: {
    padding: spacing.lg,
    gap: spacing.sm,
    paddingBottom: spacing.xxl,
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
  },
  item: { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.md, gap: spacing.xs },
  term: { ...typography.heading, color: colors.primaryDark },
  definition: { ...typography.body, color: colors.text },
  empty: { ...typography.body, color: colors.textMuted, textAlign: 'center' },
});
