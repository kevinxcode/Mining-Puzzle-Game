/**
 * Level editor canvas. Tap-based so it works one-handed on a phone:
 * pick a tool, tap the grid. Changes save automatically; the level is
 * re-validated on every edit so problems show up right away.
 */

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View, type GestureResponderEvent } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, G, Line, Path, Text as SvgText } from 'react-native-svg';
import {
  AlertTriangle,
  CheckCircle2,
  Eraser,
  Fuel,
  GitCommitHorizontal,
  Minus,
  Mountain,
  Move,
  Pickaxe,
  Play,
  Plus,
  Route as RouteIcon,
  Share2,
  Truck,
} from 'lucide-react-native';
import { colors, iconSizes, layout, minTouchTarget, radius, shadows, spacing, typography } from '@/theme/tokens';
import {
  GRID_MAX,
  GRID_MIN,
  GRID_STEP,
  MAX_TRUCKS,
  TIME_OPTIONS,
  addNode,
  compileDraft,
  cycleRoadKind,
  moveNode,
  nodeDisplayName,
  removeNode,
  roadKind,
  setNodeMaterial,
  toggleRoad,
  type CompileIssue,
  type DraftNode,
  type LevelDraft,
} from '@/game/editor/customLevel';
import { encodeLevelCode } from '@/game/editor/draftCode';
import { MATERIAL_LIST, getMaterial } from '@/game/config/materials';
import { unlockedTruckClasses } from '@/game/config/equipment';
import { makeProjection } from '@/components/map/projection';
import { distanceToSegment } from '@/components/map/hitTest';
import { useCustomLevels } from '@/state/customLevelStore';
import { useProgression } from '@/state/progressionStore';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import type { MaterialTypeId, TruckClass } from '@/types/game';
import { PressableScale } from '@/components/PressableScale';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ScreenHeader } from '@/components/ScreenHeader';
import { hapticSelection, hapticWarning } from '@/services/haptics';

type Tool = 'select' | 'excavator' | 'dump' | 'fuel' | 'junction' | 'road' | 'erase';

const TOOLS: { id: Tool; icon: (c: string) => ReactNode }[] = [
  { id: 'select', icon: (c) => <Move size={iconSizes.sm} color={c} /> },
  { id: 'excavator', icon: (c) => <Pickaxe size={iconSizes.sm} color={c} /> },
  { id: 'dump', icon: (c) => <Mountain size={iconSizes.sm} color={c} /> },
  { id: 'junction', icon: (c) => <GitCommitHorizontal size={iconSizes.sm} color={c} /> },
  { id: 'road', icon: (c) => <RouteIcon size={iconSizes.sm} color={c} /> },
  { id: 'fuel', icon: (c) => <Fuel size={iconSizes.sm} color={c} /> },
  { id: 'erase', icon: (c) => <Eraser size={iconSizes.sm} color={c} /> },
];

const NODE_FILL: Record<DraftNode['type'], string> = {
  parking: '#8C8577',
  excavator: colors.primary,
  dump: colors.secondary,
  fuel: colors.info,
  junction: '#D8C7A3',
};
const NODE_GLYPH: Record<DraftNode['type'], string> = { parking: 'P', excavator: 'EX', dump: 'ST', fuel: 'F', junction: '' };
const MAP_PAD = 16;
const NODE_HIT = 6; // map units
const ROAD_HIT = 3;
const TARGET_STEP = 20;

export default function EditorScreen() {
  const router = useRouter();
  const { t, tx } = useT();
  const { id } = useLocalSearchParams<{ id: string }>();
  const stored = useCustomLevels((s) => s.drafts.find((d) => d.id === String(id)));
  const save = useCustomLevels((s) => s.save);
  const levelsCompleted = useProgression((s) => s.statistics.levelsCompleted);

  const [draft, setDraft] = useState<LevelDraft | undefined>(stored);
  const [tool, setTool] = useState<Tool>('select');
  const [selected, setSelected] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [side, setSide] = useState(0);

  // Autosave every edit (skipping the initial load).
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (draft) save(draft);
  }, [draft, save]);

  const proj = useMemo(() => makeProjection('top', side, side, 100, MAP_PAD), [side]);
  const compiled = useMemo(() => (draft ? compileDraft(draft) : null), [draft]);

  if (!draft) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScreenHeader title={t('editor.edit.title')} />
      </SafeAreaView>
    );
  }

  const update = (next: LevelDraft) => {
    if (next === draft) {
      hapticWarning();
      return;
    }
    hapticSelection();
    setDraft(next);
  };

  const nodeName = (n: DraftNode) => tx(nodeDisplayName(draft, n));
  const nodeById = (nid: string) => draft.nodes.find((n) => n.id === nid);

  const onCanvasPress = (e: GestureResponderEvent) => {
    const p = proj.toMap({ x: e.nativeEvent.locationX, y: e.nativeEvent.locationY });
    let hitNode: DraftNode | null = null;
    let best = NODE_HIT;
    for (const n of draft.nodes) {
      const d = Math.hypot(n.x - p.x, n.y - p.y);
      if (d <= best) {
        best = d;
        hitNode = n;
      }
    }
    const hitRoad = hitNode
      ? null
      : draft.roads.find((r) => {
          const a = nodeById(r.from);
          const b = nodeById(r.to);
          return a && b && distanceToSegment(p, a, b) <= ROAD_HIT;
        }) ?? null;

    switch (tool) {
      case 'select':
        if (hitNode) {
          setSelected(hitNode.id);
          hapticSelection();
        } else if (selected) update(moveNode(draft, selected, p.x, p.y));
        return;
      case 'road':
        if (hitNode) {
          if (!pending) {
            setPending(hitNode.id);
            hapticSelection();
          } else {
            update(toggleRoad(draft, pending, hitNode.id));
            setPending(null);
          }
        } else if (hitRoad) update(cycleRoadKind(draft, hitRoad.id));
        else setPending(null);
        return;
      case 'erase':
        if (hitNode) {
          update(removeNode(draft, hitNode.id));
          if (selected === hitNode.id) setSelected(null);
        } else if (hitRoad) update(toggleRoad(draft, hitRoad.from, hitRoad.to));
        return;
      default:
        if (hitNode) {
          setSelected(hitNode.id);
          hapticSelection();
          return;
        }
        {
          const next = addNode(draft, tool, p.x, p.y);
          update(next);
          if (next !== draft) setSelected(next.nodes[next.nodes.length - 1].id);
        }
    }
  };

  const selectedNode = selected ? nodeById(selected) : undefined;
  const hint =
    tool === 'road' && pending
      ? t('editor.hint.roadPending', { name: nodeName(nodeById(pending)!) })
      : t(`editor.hint.${tool}` as MessageKey);
  const classes = unlockedTruckClasses(levelsCompleted);
  const issueText = (issue: CompileIssue) => {
    const name = 'nodeId' in issue ? nodeName(nodeById(issue.nodeId)!) : '';
    return t(`editor.issue.${issue.code}` as MessageKey, { name });
  };
  const gridPoints: { x: number; y: number }[] = [];
  for (let gx = GRID_MIN; gx <= GRID_MAX; gx += GRID_STEP) {
    for (let gy = GRID_MIN; gy <= GRID_MAX; gy += GRID_STEP) gridPoints.push({ x: gx, y: gy });
  }
  const r = 4.2 * proj.scale;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScreenHeader title={t('editor.edit.title')} subtitle={t('editor.edit.saved')} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Tools */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tools}>
          {TOOLS.map((tl) => {
            const active = tool === tl.id;
            return (
              <PressableScale
                key={tl.id}
                onPress={() => {
                  setTool(tl.id);
                  setPending(null);
                  hapticSelection();
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={t(`editor.tool.${tl.id}` as MessageKey)}
                style={[styles.tool, active && styles.toolActive]}
              >
                {tl.icon(active ? colors.textOnDark : colors.text)}
                <Text style={[styles.toolText, active && styles.toolTextActive]}>{t(`editor.tool.${tl.id}` as MessageKey)}</Text>
              </PressableScale>
            );
          })}
        </ScrollView>
        <Text style={styles.hint} accessibilityLiveRegion="polite">
          {hint}
        </Text>

        {/* Canvas */}
        <View
          style={[styles.canvas, shadows.soft]}
          onLayout={(e) => setSide(Math.round(e.nativeEvent.layout.width))}
        >
          {side > 0 ? (
            <Pressable onPress={onCanvasPress} accessibilityLabel={t('editor.a11y.grid', { hint })} style={{ width: side, height: side }}>
              <Svg width={side} height={side} pointerEvents="none">
                {gridPoints.map((g) => {
                  const s = proj.toScreen(g);
                  return <Circle key={`${g.x}-${g.y}`} cx={s.x} cy={s.y} r={0.7 * proj.scale} fill="rgba(90,66,40,0.25)" />;
                })}
                {draft.roads.map((road) => {
                  const a = nodeById(road.from);
                  const b = nodeById(road.to);
                  if (!a || !b) return null;
                  const sa = proj.toScreen(a);
                  const sb = proj.toScreen(b);
                  const kind = roadKind(road);
                  const mx = (sa.x + sb.x) / 2;
                  const my = (sa.y + sb.y) / 2;
                  const angle = (Math.atan2(sb.y - sa.y, sb.x - sa.x) * 180) / Math.PI;
                  const c = 1.8 * proj.scale;
                  return (
                    <G key={road.id}>
                      <Line x1={sa.x} y1={sa.y} x2={sb.x} y2={sb.y} stroke="#A99571" strokeWidth={(kind === 'narrow' ? 3 : 5) * proj.scale} strokeLinecap="round" />
                      <Line
                        x1={sa.x}
                        y1={sa.y}
                        x2={sb.x}
                        y2={sb.y}
                        stroke={kind === 'mud' ? '#8C6E4A' : '#D8C7A3'}
                        strokeWidth={(kind === 'narrow' ? 1.8 : 3.6) * proj.scale}
                        strokeLinecap="round"
                        strokeDasharray={kind === 'mud' ? `${1.5 * proj.scale} ${1.2 * proj.scale}` : undefined}
                      />
                      {kind === 'one-way' ? (
                        <Path
                          d={`M${-c} ${-c} L${c * 0.6} 0 L${-c} ${c}`}
                          fill="none"
                          stroke={colors.surface}
                          strokeWidth={0.9 * proj.scale}
                          strokeLinecap="round"
                          transform={`translate(${mx} ${my}) rotate(${angle})`}
                        />
                      ) : null}
                    </G>
                  );
                })}
                {draft.nodes.map((n) => {
                  const s = proj.toScreen(n);
                  const isSel = n.id === selected || n.id === pending;
                  const fill = n.type === 'excavator' || n.type === 'dump' ? getMaterial(n.materialId)?.color ?? NODE_FILL[n.type] : NODE_FILL[n.type];
                  const rr = n.type === 'junction' ? r * 0.55 : r;
                  return (
                    <G key={n.id}>
                      {isSel ? <Circle cx={s.x} cy={s.y} r={rr + 1.6 * proj.scale} fill="none" stroke={colors.primary} strokeWidth={1.2 * proj.scale} /> : null}
                      <Circle cx={s.x} cy={s.y} r={rr} fill={fill} stroke={n.type === 'excavator' ? colors.primary : colors.card} strokeWidth={0.8 * proj.scale} />
                      {NODE_GLYPH[n.type] ? (
                        <SvgText x={s.x} y={s.y + 1.2 * proj.scale} fontSize={3.2 * proj.scale} fontWeight="800" fill={colors.textOnDark} textAnchor="middle">
                          {NODE_GLYPH[n.type]}
                        </SvgText>
                      ) : null}
                      {n.type !== 'junction' ? (
                        <SvgText x={s.x} y={s.y + rr + 3.6 * proj.scale} fontSize={2.8 * proj.scale} fontWeight="700" fill={colors.text} textAnchor="middle">
                          {nodeName(n)}
                        </SvgText>
                      ) : null}
                    </G>
                  );
                })}
              </Svg>
            </Pressable>
          ) : null}
        </View>

        {/* Material of the selected pit / stockpile */}
        {selectedNode && (selectedNode.type === 'excavator' || selectedNode.type === 'dump') ? (
          <View style={[styles.card, shadows.soft]}>
            <Text style={styles.label}>
              {t('editor.field.material')} · {nodeName(selectedNode)}
            </Text>
            <View style={styles.chips}>
              {MATERIAL_LIST.map((m) => (
                <Chip
                  key={m.id}
                  label={tx(m.name)}
                  active={selectedNode.materialId === m.id}
                  dot={m.color}
                  onPress={() => update(setNodeMaterial(draft, selectedNode.id, m.id as MaterialTypeId))}
                />
              ))}
            </View>
          </View>
        ) : null}

        {/* Settings */}
        <View style={[styles.card, shadows.soft]}>
          <Text style={styles.label}>{t('editor.field.name')}</Text>
          <TextInput
            value={draft.name}
            onChangeText={(name) => setDraft({ ...draft, name: name.slice(0, 40) })}
            maxLength={40}
            accessibilityLabel={t('editor.field.name')}
            style={styles.input}
          />

          <Text style={styles.label}>{t('editor.field.target')}</Text>
          <View style={styles.stepper}>
            <StepButton
              label={t('editor.a11y.decrease')}
              disabled={draft.targetTons <= TARGET_STEP}
              onPress={() => setDraft({ ...draft, targetTons: Math.max(TARGET_STEP, draft.targetTons - TARGET_STEP) })}
              icon={<Minus size={iconSizes.sm} color={colors.text} />}
            />
            <Text style={styles.stepValue}>{t('editor.unit.tons', { n: draft.targetTons })}</Text>
            <StepButton
              label={t('editor.a11y.increase')}
              disabled={draft.targetTons >= 2000}
              onPress={() => setDraft({ ...draft, targetTons: Math.min(2000, draft.targetTons + TARGET_STEP) })}
              icon={<Plus size={iconSizes.sm} color={colors.text} />}
            />
          </View>

          <Text style={styles.label}>{t('editor.field.time')}</Text>
          <View style={styles.chips}>
            {TIME_OPTIONS.map((sec) => (
              <Chip
                key={sec}
                label={t('editor.unit.minutes', { n: sec / 60 })}
                active={draft.timeLimit === sec}
                onPress={() => setDraft({ ...draft, timeLimit: sec })}
              />
            ))}
          </View>

          <Text style={styles.label}>{t('editor.field.trucks', { count: draft.trucks.length, max: MAX_TRUCKS })}</Text>
          <View style={styles.chips}>
            {draft.trucks.map((cls, i) => (
              <Chip
                key={`${cls}-${i}`}
                label={`${t(`editor.class.${cls}` as MessageKey)} ✕`}
                accessibilityLabel={t('editor.truck.remove', { name: t(`editor.class.${cls}` as MessageKey) })}
                active
                icon={<Truck size={iconSizes.xs} color={colors.textOnDark} />}
                onPress={() => setDraft({ ...draft, trucks: draft.trucks.filter((_, j) => j !== i) })}
              />
            ))}
          </View>
          <View style={styles.chips}>
            {classes.map((cls: TruckClass) => (
              <Chip
                key={cls}
                label={`+ ${t(`editor.class.${cls}` as MessageKey)}`}
                accessibilityLabel={t('editor.truck.add', { name: t(`editor.class.${cls}` as MessageKey) })}
                disabled={draft.trucks.length >= MAX_TRUCKS}
                onPress={() => setDraft({ ...draft, trucks: [...draft.trucks, cls] })}
              />
            ))}
          </View>
        </View>

        {/* Validation + actions */}
        {compiled && !compiled.ok ? (
          <View style={[styles.card, styles.issues]} accessibilityLiveRegion="polite">
            <View style={styles.issueHead}>
              <AlertTriangle size={iconSizes.sm} color={colors.warning} />
              <Text style={styles.issueTitle}>{t('editor.issues.title')}</Text>
            </View>
            {compiled.issues.map((issue, i) => (
              <Text key={i} style={styles.issueText}>
                • {issueText(issue)}
              </Text>
            ))}
          </View>
        ) : compiled?.ok ? (
          <View style={styles.ready}>
            <CheckCircle2 size={iconSizes.sm} color={colors.success} />
            <Text style={styles.readyText}>{t('editor.ready', { routes: compiled.level.map.routes.length })}</Text>
          </View>
        ) : null}
        <PrimaryButton
          label={t('editor.play')}
          icon={<Play size={iconSizes.sm} color={colors.textOnDark} />}
          disabled={!compiled?.ok}
          onPress={() => {
            save(draft);
            router.push(`/game/${draft.id}` as never);
          }}
        />
        <PrimaryButton
          label={t('editor.shareCode')}
          variant="outline"
          icon={<Share2 size={iconSizes.sm} color={colors.primary} />}
          onPress={() => {
            const message = t('editor.share.message', { name: draft.name, code: encodeLevelCode(draft) });
            Share.share({ message }).catch(() => undefined);
          }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function Chip({
  label,
  active = false,
  disabled = false,
  dot,
  icon,
  accessibilityLabel,
  onPress,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  dot?: string;
  icon?: ReactNode;
  accessibilityLabel?: string;
  onPress: () => void;
}) {
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ selected: active, disabled }}
      accessibilityLabel={accessibilityLabel ?? label}
      style={[styles.chip, active && styles.chipActive, disabled && styles.chipDisabled]}
    >
      {dot ? <View style={[styles.dot, { backgroundColor: dot }]} /> : null}
      {icon}
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </PressableScale>
  );
}

function StepButton({ icon, label, disabled, onPress }: { icon: ReactNode; label: string; disabled: boolean; onPress: () => void }) {
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[styles.stepButton, disabled && styles.chipDisabled]}
    >
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
  tools: { gap: spacing.sm, paddingVertical: 2 },
  tool: {
    minWidth: 64,
    minHeight: minTouchTarget + 8,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  toolActive: { backgroundColor: colors.primary },
  toolText: { ...typography.caption, color: colors.text, fontWeight: '700' },
  toolTextActive: { color: colors.textOnDark },
  hint: { ...typography.caption, color: colors.textMuted, lineHeight: 18 },
  canvas: { width: '100%', aspectRatio: 1, borderRadius: radius.lg, backgroundColor: '#E6D5B5', overflow: 'hidden' },
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
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: minTouchTarget,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipDisabled: { opacity: 0.45 },
  chipText: { ...typography.label, color: colors.text },
  chipTextActive: { color: colors.textOnDark },
  dot: { width: 12, height: 12, borderRadius: 6 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  stepButton: {
    width: minTouchTarget,
    height: minTouchTarget,
    borderRadius: minTouchTarget / 2,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepValue: { ...typography.heading, color: colors.text, minWidth: 90, textAlign: 'center' },
  issues: { borderLeftWidth: 4, borderLeftColor: colors.warning },
  issueHead: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  issueTitle: { ...typography.label, color: colors.text },
  issueText: { ...typography.caption, color: colors.textMuted, lineHeight: 18 },
  ready: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center', justifyContent: 'center' },
  readyText: { ...typography.label, color: colors.success },
});
