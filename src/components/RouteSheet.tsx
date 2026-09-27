/**
 * MINING FLOW — route selection bottom sheet.
 * Shows the valid routes for a truck's assigned excavator with hints.
 */

import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Check } from 'lucide-react-native';
import { colors, radius, shadows, spacing, typography } from '@/theme/tokens';
import type { LevelConfig, NamedRoute, TruckRuntime } from '@/types/game';
import { hapticSelection } from '@/services/haptics';
import { playSfx } from '@/services/audio';

interface RouteSheetProps {
  visible: boolean;
  onClose: () => void;
  level: LevelConfig;
  truck: TruckRuntime | null;
  onChoose: (routeId: string) => void;
}

function routeHints(level: LevelConfig, route: NamedRoute): string {
  const lengths: string[] = [];
  let total = 0;
  let narrow = false;
  let mud = false;
  let maxSpeed = 0;
  for (let i = 0; i < route.nodePath.length - 1; i += 1) {
    const road = level.map.roads.find(
      (r) => r.from === route.nodePath[i] && r.to === route.nodePath[i + 1],
    );
    if (!road) continue;
    total += road.length;
    narrow = narrow || Boolean(road.narrow);
    mud = mud || Boolean(road.mud);
    maxSpeed = Math.max(maxSpeed, road.speedLimit);
  }
  lengths.push(`${Math.round(total)} units`);
  if (maxSpeed > 1.05) lengths.push('fast');
  if (narrow) lengths.push('narrow — one truck at a time');
  if (mud) lengths.push('mud — slow + extra fuel');
  return lengths.join(' · ');
}

export function RouteSheet({ visible, onClose, level, truck, onChoose }: RouteSheetProps) {
  const excavator = truck ? level.excavators.find((e) => e.id === truck.assignedExcavatorId) : null;
  const validRoutes = excavator
    ? level.map.routes.filter((r) => r.nodePath[0] === excavator.nodeId)
    : [];

  const close = () => {
    playSfx('tap');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <Pressable style={styles.backdrop} onPress={close} accessibilityLabel="Close route sheet" />
      <View style={[styles.sheet, shadows.raised]}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Choose Route</Text>
            {truck ? (
              <Text style={styles.subtitle}>
                {truck.spec.name} · {excavator?.name ?? '—'}
              </Text>
            ) : null}
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close"
            onPress={close}
            style={styles.closeButton}
          >
            <Check size={18} color={colors.textOnDark} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.listContent}>
          {validRoutes.map((route) => {
            const active = truck?.routeId === route.id;
            return (
              <Pressable
                key={route.id}
                accessibilityRole="button"
                accessibilityLabel={`Route ${route.name}${active ? ' (current)' : ''}`}
                onPress={() => {
                  playSfx('tap');
                  hapticSelection();
                  onChoose(route.id);
                  onClose();
                }}
                style={({ pressed }) => [
                  styles.row,
                  active && styles.rowActive,
                  pressed && styles.rowPressed,
                ]}
              >
                <View style={styles.rowInfo}>
                  <Text style={styles.rowTitle}>{route.name}</Text>
                  <Text style={styles.rowHints}>{routeHints(level, route)}</Text>
                </View>
                {active ? <Check size={18} color={colors.primary} /> : null}
              </Pressable>
            );
          })}
          {validRoutes.length === 0 ? (
            <Text style={styles.empty}>No routes available for this excavator.</Text>
          ) : null}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(15, 17, 20, 0.55)' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    maxHeight: '70%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  title: { ...typography.title, color: colors.textOnDark },
  subtitle: { ...typography.caption, color: colors.textOnDarkMuted },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: { gap: spacing.sm, paddingBottom: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.md,
    padding: spacing.md,
    minHeight: 56,
  },
  rowActive: { borderWidth: 2, borderColor: colors.primary },
  rowPressed: { opacity: 0.8 },
  rowInfo: { flex: 1, gap: 2 },
  rowTitle: { ...typography.body, color: colors.textOnDark },
  rowHints: { ...typography.caption, color: colors.textOnDarkMuted },
  empty: { ...typography.body, color: colors.textOnDarkMuted, textAlign: 'center', padding: spacing.lg },
});