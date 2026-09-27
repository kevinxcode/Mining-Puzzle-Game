/**
 * MINING FLOW — core game type definitions.
 * All gameplay data models live here. Keep strongly typed, data-driven.
 */

export interface Point {
  x: number;
  y: number;
}

export type MaterialTypeId = 'ore' | 'overburden' | 'coal' | 'gravel';

export interface MaterialType {
  id: MaterialTypeId;
  name: string;
  color: string;
}

export type NodeType = 'excavator' | 'dump' | 'fuel' | 'workshop' | 'parking' | 'junction';

export interface MapNode {
  id: string;
  type: NodeType;
  name: string;
  position: Point;
  materialId?: MaterialTypeId;
}

export interface Road {
  id: string;
  from: string;
  to: string;
  /** Haul distance in abstract units (used for fuel + travel time). */
  length: number;
  /** Max speed multiplier on this road (1 = truck base speed). */
  speedLimit: number;
  oneWay?: boolean;
  /** Narrow roads allow only one truck at a time (extra queueing). */
  narrow?: boolean;
  /** Mud zones slow trucks down and burn extra fuel. */
  mud?: boolean;
  closed?: boolean;
}

export interface NamedRoute {
  id: string;
  name: string;
  /** Ordered node ids from loader-side start to dump (or fuel) node. */
  nodePath: string[];
}

export interface ExcavatorSpec {
  id: string;
  name: string;
  nodeId: string;
  bucketCapacity: number;
  /** Tons per second. */
  loadingSpeed: number;
  /** Liters of fuel burned per second while loading. */
  fuelEfficiency: number;
  condition: number;
}

export type TruckClass = 'Compact' | 'Standard' | 'Heavy' | 'Ultra';

export interface TruckSpec {
  id: string;
  name: string;
  truckClass: TruckClass;
  capacity: number;
  /** Road units per second at speed limit 1. */
  speed: number;
  /** Liters of fuel burned per road unit traveled. */
  fuelEfficiency: number;
  condition: number;
  /** Tank capacity in liters (derived from haul distance by the level factory). */
  fuelCapacity: number;
  assignedExcavatorId: string;
  routeId: string;
  startNodeId: string;
}

export type GameEventType =
  | 'road-closure'
  | 'road-open'
  | 'breakdown'
  | 'rain'
  | 'target-increase'
  | 'shortcut-open'
  | 'efficiency-drop'
  | 'fuel-outage';

export interface GameEvent {
  id: string;
  /** Simulation time (seconds) when the event fires. */
  timeSeconds: number;
  type: GameEventType;
  /** Road id, truck id or excavator id the event applies to. */
  target?: string;
  /** Duration in seconds for timed effects (rain, breakdown, efficiency drop). */
  durationSeconds?: number;
  /** Additional tons for target-increase. */
  amount?: number;
  message: string;
}

export type ObjectiveKind =
  | 'tons'
  | 'time'
  | 'idle'
  | 'fuel'
  | 'queue'
  | 'deliver'
  | 'no-jam'
  | 'trucks';

export interface LevelObjective {
  id: string;
  kind: ObjectiveKind;
  /** Required value (tons, seconds, percent, liters, truck count). */
  target?: number;
  materialId?: MaterialTypeId;
  description: string;
  /** Bonus objectives never fail the mission. */
  bonus?: boolean;
}

export interface StarThresholds {
  /** Finish at or under this time for 2 stars. */
  star2TimeSeconds?: number;
  /** Finish with idle% at or under this for 3 stars. */
  star3IdlePercent?: number;
  /** Finish using at or under this fuel (liters) for 3 stars. */
  star3FuelLiters?: number;
  /** Finish without any traffic jam for 3 stars. */
  star3NoJam?: boolean;
}

export interface MapConfig {
  nodes: MapNode[];
  roads: Road[];
  routes: NamedRoute[];
  materials: MaterialType[];
}

export interface LevelConfig {
  id: string;
  name: string;
  regionId: number;
  regionName: string;
  difficulty: number;
  description: string;
  /** Mission time limit in seconds. */
  timeLimit: number;
  targetTons: number;
  objectives: LevelObjective[];
  starThresholds: StarThresholds;
  map: MapConfig;
  excavators: ExcavatorSpec[];
  trucks: TruckSpec[];
  events: GameEvent[];
  unlockCoins: number;
  tutorialSteps?: string[];
}

/* ------------------------------------------------------------------ */
/* Runtime simulation types                                            */
/* ------------------------------------------------------------------ */

export type TruckRuntimeState =
  | 'idle'
  | 'driving-to-loader'
  | 'queueing'
  | 'loading'
  | 'hauling'
  | 'dumping'
  | 'returning'
  | 'to-fuel'
  | 'refueling'
  | 'breakdown';

export interface TruckRuntime {
  id: string;
  spec: TruckSpec;
  state: TruckRuntimeState;
  assignedExcavatorId: string;
  routeId: string;
  nodePath: string[];
  pathIndex: number;
  /** 0..1 progress along the current segment. */
  segmentProgress: number;
  load: number;
  /** Liters remaining in the tank. */
  fuel: number;
  fuelCapacity: number;
  /** Seconds spent queueing during the current or last queue episode. */
  queueTime: number;
  maxQueueTime: number;
  idleTime: number;
  trips: number;
  tonsHauled: number;
  breakdownUntil: number;
  targetNodeId: string | null;
}

export interface ExcavatorRuntime {
  id: string;
  spec: ExcavatorSpec;
  queue: string[];
  loadingTruckId: string | null;
  /** Progress (0..1) of the current bucket pass for the truck being loaded. */
  passProgress?: number;
  efficiencyModifier: number;
  modifierUntil: number;
}

export type SimStatus = 'ready' | 'running' | 'paused' | 'success' | 'failed';

export interface SimStats {
  tonsMoved: number;
  tonsByMaterial: Record<MaterialTypeId, number>;
  fuelUsed: number;
  trips: number;
  jamCount: number;
  maxQueueTime: number;
  avgProductionRate: number;
  efficiency: number;
  breakdowns: number;
}

export interface SimState {
  levelId: string;
  elapsed: number;
  speed: 1 | 2 | 3;
  status: SimStatus;
  targetTons: number;
  trucks: TruckRuntime[];
  excavators: ExcavatorRuntime[];
  roads: Road[];
  stats: SimStats;
  eventsFired: string[];
  eventFeed: { id: string; message: string; time: number }[];
  /** Assigned once — guards double rewards. */
  rewarded: boolean;
}
