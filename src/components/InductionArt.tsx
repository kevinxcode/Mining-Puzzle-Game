/**
 * Site Induction — simple illustrations for concept cards.
 * Diagram ids render small SVG schematics; others render a lucide icon in a tinted disc.
 */

import { StyleSheet, View } from 'react-native';
import Svg, { Circle, G, Line, Path, Polygon, Rect, Text as SvgText } from 'react-native-svg';
import {
  AlertTriangle,
  ArrowRightLeft,
  CalendarClock,
  ClipboardCheck,
  Fuel,
  Gauge,
  HardHat,
  Hourglass,
  Layers,
  Repeat,
  Route,
  Users,
  MoveRight,
  Scale,
  Timer,
  TrafficCone,
  Weight,
  Wrench,
} from 'lucide-react-native';
import type { InductionArt as ArtId, InductionModule } from '@/game/induction/types';
import { colors, radius, typography } from '@/theme/tokens';

const ART_HEIGHT = 150;
const W = 280;
const H = 150;

/** Module list icons. */
export const MODULE_ICONS: Record<InductionModule['icon'], typeof Repeat> = {
  cycle: Repeat,
  bucket: Layers,
  queue: Users,
  route: Route,
  fuel: Fuel,
  safety: HardHat,
};

const ICONS = {
  'icon-timer': { Icon: Timer, tint: colors.infoSoft, color: colors.info },
  'icon-payload': { Icon: Weight, tint: colors.primarySoft, color: colors.primary },
  'icon-match': { Icon: Scale, tint: colors.secondarySoft, color: colors.warning },
  'icon-warning': { Icon: AlertTriangle, tint: colors.dangerSoft, color: colors.danger },
  'icon-idle': { Icon: Hourglass, tint: colors.secondarySoft, color: colors.warning },
  'icon-balance': { Icon: ArrowRightLeft, tint: colors.successSoft, color: colors.success },
  'icon-traffic': { Icon: TrafficCone, tint: colors.primarySoft, color: colors.primary },
  'icon-plan': { Icon: CalendarClock, tint: colors.infoSoft, color: colors.info },
  'icon-speed': { Icon: Gauge, tint: colors.dangerSoft, color: colors.danger },
  'icon-one-way': { Icon: MoveRight, tint: colors.infoSoft, color: colors.info },
  'icon-breakdown': { Icon: Wrench, tint: colors.dangerSoft, color: colors.danger },
  'icon-checklist': { Icon: ClipboardCheck, tint: colors.successSoft, color: colors.success },
} as const;

export function InductionArt({ art }: { art: ArtId }) {
  if (art in ICONS) {
    const { Icon, tint, color } = ICONS[art as keyof typeof ICONS];
    return (
      <View style={styles.frame} accessible={false}>
        <View style={[styles.disc, { backgroundColor: tint }]}>
          <Icon size={56} color={color} strokeWidth={2} />
        </View>
      </View>
    );
  }
  return (
    <View style={styles.frame} accessible={false}>
      <Svg width="100%" height={ART_HEIGHT} viewBox={`0 0 ${W} ${H}`}>
        {renderDiagram(art)}
      </Svg>
    </View>
  );
}

function MiniTruck({ x, y, loaded, color = colors.secondary }: { x: number; y: number; loaded?: boolean; color?: string }) {
  return (
    <G x={x} y={y}>
      <Rect x={0} y={4} width={26} height={12} rx={2} fill={color} />
      {loaded ? <Path d="M2 4 Q13 -6 24 4 Z" fill={colors.ore} /> : null}
      <Rect x={26} y={7} width={10} height={9} rx={2} fill={colors.surface} />
      <Circle cx={7} cy={18} r={4} fill={colors.surface} />
      <Circle cx={29} cy={18} r={4} fill={colors.surface} />
    </G>
  );
}

function Label({ x, y, text, color = colors.text }: { x: number; y: number; text: string; color?: string }) {
  return (
    <SvgText x={x} y={y} fontSize={typography.tiny.fontSize + 1} fontWeight="700" fill={color} textAnchor="middle">
      {text}
    </SvgText>
  );
}

function renderDiagram(art: ArtId) {
  switch (art) {
    case 'diagram-cycle':
      return (
        <G>
          <Rect x={50} y={30} width={180} height={90} rx={45} fill="none" stroke={colors.mapRoad} strokeWidth={14} />
          <Rect x={50} y={30} width={180} height={90} rx={45} fill="none" stroke={colors.mapRoadActive} strokeWidth={2} strokeDasharray="6 6" />
          <Circle cx={50} cy={75} r={18} fill={colors.primary} />
          <Label x={50} y={79} text="LOAD" color={colors.textOnDark} />
          <Circle cx={230} cy={75} r={18} fill={colors.info} />
          <Label x={230} y={79} text="DUMP" color={colors.textOnDark} />
          <MiniTruck x={120} y={13} loaded />
          <Label x={140} y={60} text="HAUL →" />
          <MiniTruck x={120} y={108} />
          <Label x={140} y={100} text="← RETURN" />
        </G>
      );
    case 'diagram-passes':
      return (
        <G>
          <Rect x={20} y={100} width={240} height={6} fill={colors.mapRoad} />
          <Rect x={40} y={60} width={120} height={40} rx={4} fill={colors.secondary} />
          {[0, 1, 2, 3].map((i) => (
            <Rect key={i} x={46 + i * 28} y={66} width={24} height={28} rx={3} fill={i < 3 ? colors.ore : colors.surfaceMuted} />
          ))}
          <Rect x={160} y={70} width={36} height={30} rx={4} fill={colors.surface} />
          <Circle cx={65} cy={112} r={9} fill={colors.surface} />
          <Circle cx={180} cy={112} r={9} fill={colors.surface} />
          <Path d="M230 20 L200 40 L150 34" stroke={colors.surfaceElevated} strokeWidth={6} fill="none" strokeLinecap="round" />
          <Path d="M130 30 L152 26 L150 46 Z" fill={colors.primary} />
          <Label x={100} y={52} text="PASS 3 OF 4" />
        </G>
      );
    case 'diagram-queue':
      return (
        <G>
          <Rect x={10} y={88} width={260} height={16} fill={colors.mapRoad} />
          <Circle cx={240} cy={70} r={22} fill={colors.primary} />
          <Label x={240} y={74} text="LOADER" color={colors.textOnDark} />
          <MiniTruck x={180} y={74} color={colors.success} />
          <MiniTruck x={130} y={74} color={colors.warning} />
          <MiniTruck x={80} y={74} color={colors.warning} />
          <MiniTruck x={30} y={74} color={colors.warning} />
          <Label x={90} y={60} text="WAITING = IDLE" color={colors.warning} />
          <Label x={198} y={124} text="LOADING" color={colors.success} />
        </G>
      );
    case 'diagram-routes':
      return (
        <G>
          <Path d="M30 110 L250 110" stroke={colors.mapRoad} strokeWidth={12} />
          <Path d="M30 110 Q140 10 250 110" stroke={colors.mapRoad} strokeWidth={12} fill="none" />
          <Circle cx={30} cy={110} r={14} fill={colors.primary} />
          <Circle cx={250} cy={110} r={14} fill={colors.info} />
          <Circle cx={120} cy={110} r={8} fill={colors.overburden} />
          <Circle cx={150} cy={110} r={10} fill={colors.overburden} />
          <Label x={140} y={134} text="SHORT · MUD + TRAFFIC" color={colors.danger} />
          <Label x={140} y={48} text="LONGER · CLEAR · FASTER" color={colors.success} />
        </G>
      );
    case 'diagram-fuel':
      return (
        <G>
          <Rect x={60} y={40} width={50} height={80} rx={8} fill={colors.surface} />
          <Rect x={68} y={48} width={34} height={64} rx={4} fill={colors.surfaceMuted} />
          <Rect x={68} y={92} width={34} height={20} rx={4} fill={colors.danger} />
          <Label x={85} y={34} text="FUEL" />
          <Line x1={68} y1={80} x2={102} y2={80} stroke={colors.warning} strokeWidth={2} strokeDasharray="4 3" />
          <Label x={170} y={70} text="REFUEL HERE" color={colors.warning} />
          <Path d="M120 80 L130 76 L130 84 Z" fill={colors.warning} />
          <Label x={170} y={106} text="TOO LATE" color={colors.danger} />
        </G>
      );
    case 'diagram-right-of-way':
      return (
        <G>
          <Polygon points="20,120 260,60 260,80 20,140" fill={colors.mapRoad} />
          <MiniTruck x={170} y={56} loaded color={colors.secondary} />
          <Rect x={60} y={108} width={22} height={11} rx={3} fill={colors.info} />
          <Circle cx={65} cy={121} r={3} fill={colors.surface} />
          <Circle cx={77} cy={121} r={3} fill={colors.surface} />
          <Label x={190} y={46} text="LOADED · GOES FIRST" color={colors.success} />
          <Label x={72} y={98} text="GIVE WAY" color={colors.danger} />
        </G>
      );
    default:
      return null;
  }
}

const styles = StyleSheet.create({
  frame: {
    height: ART_HEIGHT,
    borderRadius: radius.lg,
    backgroundColor: colors.mapGround,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  disc: {
    width: 104,
    height: 104,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
