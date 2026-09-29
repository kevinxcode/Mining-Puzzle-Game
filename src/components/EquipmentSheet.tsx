/**
 * MINING FLOW — equipment bottom sheet.
 * Lists trucks with live status; tapping a truck opens detail actions:
 * reassign excavator, reroute, send to fuel.
 */

import type { ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  Check,
  Clock,
  Fuel,
  Pause,
  Route as RouteIcon,
  TriangleAlert,
  Truck,
  Wrench,
  X,
} from 'lucide-react-native';
import { colors, radius, shadows, spacing, typography } from '@/theme/tokens';
import { formatFuel, formatTons } from '@/utils/format';
import type { LevelConfig, TruckRuntime, TruckRuntimeState } from '@/types/game';
import { hapticLight } from '@/services/haptics';
import { playSfx } from '@/services/audio';
import { PrimaryButton } from './PrimaryButton';
import { t, useT, type MessageKey } from '@/i18n';

interface EquipmentSheetProps {
  visible: boolean;
  onClose: () => void;
  level: LevelConfig;
  trucks: TruckRuntime[];
  selectedTruckId: string | null;
  onSelectTruck: (truckId: string | null) => void;
  onSendToFuel: (truckId: string) => void;
  onAssign: (truckId: string, excavatorId: string) => void;
  onOpenRoutes: (truckId: string) => void;
}

const STATUS_KEYS: Record<TruckRuntimeState, MessageKey> = {
  idle: 'game.truckState.idle',
  'driving-to-loader': 'game.truckState.toLoader',
  queueing: 'game.truckState.queueing',
  loading: 'game.truckState.loading',
  hauling: 'game.truckState.hauling',
  dumping: 'game.truckState.dumping',
  returning: 'game.truckState.returning',
  'to-fuel': 'game.truckState.toFuel',
  refueling: 'game.truckState.refueling',
  breakdown: 'game.truckState.breakdown',
};

/** Player-facing truck state name in the current language. */
export const truckStateLabel = (state: TruckRuntimeState): string => t(STATUS_KEYS[state]);

const STATUS_ICONS: Record<TruckRuntimeState, ReactNode> = {
  idle: <Pause size={12} color={colors.textMuted} />,
  'driving-to-loader': <Truck size={12} color={colors.info} />,
  queueing: <Clock size={12} color={colors.warning} />,
  loading: <Wrench size={12} color={colors.secondary} />,
  hauling: <Truck size={12} color={colors.primary} />,
  dumping: <Check size={12} color={colors.success} />,
  returning: <Truck size={12} color={colors.info} />,
  'to-fuel': <Fuel size={12} color={colors.warning} />,
  refueling: <Fuel size={12} color={colors.info} />,
  breakdown: <TriangleAlert size={12} color={colors.danger} />,
};

export function EquipmentSheet({
  visible,
  onClose,
  level,
  trucks,
  selectedTruckId,
  onSelectTruck,
  onSendToFuel,
  onAssign,
  onOpenRoutes,
}: EquipmentSheetProps) {
  const { t, tx } = useT();
  const selected = trucks.find((t) => t.id === selectedTruckId) ?? null;

  const close = () => {
    playSfx('tap');
    onSelectTruck(null);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <Pressable style={styles.backdrop} onPress={close} accessibilityLabel={t('game.equipment.closeSheet')} />
      <View style={[styles.sheet, shadows.raised]}>
        <View style={styles.header}>
          <Text style={styles.title}>{selected ? tx(selected.spec.name) : t('game.equipment.title')}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('game.common.close')}
            onPress={close}
            style={styles.closeButton}
          >
            <X size={18} color={colors.textOnDark} />
          </Pressable>
        </View>

        {selected ? (
          <TruckDetail
            level={level}
            truck={selected}
            onSendToFuel={onSendToFuel}
            onAssign={onAssign}
            onOpenRoutes={onOpenRoutes}
            onBack={() => onSelectTruck(null)}
          />
        ) : (
          <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
            {trucks.map((truck) => (
              <Pressable
                key={truck.id}
                accessibilityRole="button"
                accessibilityLabel={t('game.equipment.rowA11y', { name: tx(truck.spec.name), status: truckStateLabel(truck.state) })}
                onPress={() => {
                  playSfx('tap');
                  hapticLight();
                  onSelectTruck(truck.id);
                }}
                style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
              >
                <View style={styles.rowIcon}>{STATUS_ICONS[truck.state]}</View>
                <View style={styles.rowInfo}>
                  <Text style={styles.rowTitle}>{tx(truck.spec.name)}</Text>
                  <Text style={styles.rowStatus}>
                    {truckStateLabel(truck.state)} · {formatTons(truck.load)} / {formatTons(truck.spec.capacity)} · {formatFuel(truck.fuel)}
                  </Text>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

function TruckDetail({
  level,
  truck,
  onSendToFuel,
  onAssign,
  onOpenRoutes,
  onBack,
}: {
  level: LevelConfig;
  truck: TruckRuntime;
  onSendToFuel: (truckId: string) => void;
  onAssign: (truckId: string, excavatorId: string) => void;
  onOpenRoutes: (truckId: string) => void;
  onBack: () => void;
}) {
  const { t, tx } = useT();
  const excavator = level.excavators.find((e) => e.id === truck.assignedExcavatorId);
  const route = level.map.routes.find((r) => r.id === truck.routeId);
  const otherExcavators = level.excavators.filter((e) => e.id !== truck.assignedExcavatorId);
  const loadFraction = truck.spec.capacity > 0 ? truck.load / truck.spec.capacity : 0;

  return (
    <ScrollView contentContainerStyle={styles.detailContent}>
      <View style={styles.detailGrid}>
        <DetailItem label={t('game.equipment.status')} value={truckStateLabel(truck.state)} />
        <DetailItem
          label={t('game.equipment.load')}
          value={`${formatTons(truck.load)} / ${formatTons(truck.spec.capacity)}`}
        />
        <DetailItem
          label={t('game.equipment.fuel')}
          value={`${Math.round((truck.fuel / Math.max(1, truck.fuelCapacity)) * 100)}%`}
        />
        <DetailItem label={t('game.equipment.assigned')} value={excavator ? tx(excavator.name) : '—'} />
        <DetailItem label={t('game.equipment.route')} value={route ? tx(route.name) : '—'} />
        <DetailItem label={t('game.equipment.trips')} value={String(truck.trips)} />
      </View>

      <View style={styles.loadTrack}>
        <View style={[styles.loadFill, { width: `${Math.round(loadFraction * 100)}%` }]} />
      </View>

      <View style={styles.actions}>
        <PrimaryButton label={t('game.equipment.reroute')} variant="secondary" onPress={() => onOpenRoutes(truck.id)} style={styles.actionButton} />
        <PrimaryButton
          label={t('game.equipment.sendToFuel')}
          variant="ghost"
          onPress={() => onSendToFuel(truck.id)}
          style={styles.actionButton}
        />
      </View>

      {otherExcavators.length > 0 ? (
        <View style={styles.reassignBlock}>
          <Text style={styles.reassignLabel}>{t('game.equipment.reassignTo')}</Text>
          <View style={styles.reassignRow}>
            {otherExcavators.map((ex) => (
              <PrimaryButton
                key={ex.id}
                label={tx(ex.name)}
                variant="ghost"
                onPress={() => onAssign(truck.id, ex.id)}
                style={styles.actionButton}
              />
            ))}
          </View>
        </View>
      ) : null}

      <PrimaryButton label={t('game.equipment.backToList')} variant="primary" onPress={onBack} style={styles.backButton} />
    </ScrollView>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailItem}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
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
    maxHeight: '78%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  title: { ...typography.title, color: colors.textOnDark },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: { flexGrow: 0 },
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
  rowPressed: { opacity: 0.8 },
  rowIcon: { width: 24, alignItems: 'center' },
  rowInfo: { flex: 1, gap: 2 },
  rowTitle: { ...typography.body, color: colors.textOnDark },
  rowStatus: { ...typography.caption, color: colors.textOnDarkMuted },
  detailContent: { gap: spacing.md, paddingBottom: spacing.sm },
  detailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  detailItem: { width: '30%', minWidth: 96, gap: 2 },
  detailLabel: { ...typography.tiny, color: colors.textOnDarkMuted },
  detailValue: { ...typography.body, color: colors.textOnDark },
  loadTrack: {
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceElevated,
    overflow: 'hidden',
  },
  loadFill: { height: '100%', backgroundColor: colors.secondary },
  actions: { flexDirection: 'row', gap: spacing.sm },
  actionButton: { flex: 1, paddingHorizontal: spacing.sm },
  reassignBlock: { gap: spacing.xs },
  reassignLabel: { ...typography.label, color: colors.textOnDarkMuted },
  reassignRow: { flexDirection: 'row', gap: spacing.sm },
  backButton: { marginTop: spacing.xs },
});