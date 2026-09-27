/**
 * MINING FLOW — production engine.
 * Registers completed dumps and updates production statistics.
 * Pure simulation logic — no React imports.
 */

import type { LevelConfig, MaterialTypeId, SimState, TruckRuntime } from '@/types/game';
import { pushFeed } from './feed';

export interface DumpResult {
  credited: boolean;
  tons: number;
  materialId?: MaterialTypeId;
}

export function registerDump(
  state: SimState,
  level: LevelConfig,
  truck: TruckRuntime,
  dumpNodeId: string,
): DumpResult {
  const tons = truck.load;
  if (tons <= 0) return { credited: false, tons: 0 };

  const dumpNode = level.map.nodes.find((n) => n.id === dumpNodeId);
  const excavator = state.excavators.find((e) => e.id === truck.assignedExcavatorId);
  const loaderNode = excavator
    ? level.map.nodes.find((n) => n.id === excavator.spec.nodeId)
    : undefined;
  const cargoMaterial = loaderNode?.materialId;
  const dumpMaterial = dumpNode?.materialId;

  if (cargoMaterial && dumpMaterial && cargoMaterial === dumpMaterial) {
    state.stats.tonsMoved += tons;
    state.stats.tonsByMaterial[cargoMaterial] += tons;
    pushFeed(
      state,
      `${truck.spec.name} dumped ${Math.round(tons)} t of ${cargoMaterial}.`,
    );
    return { credited: true, tons, materialId: cargoMaterial };
  }

  pushFeed(state, `${truck.spec.name} dumped at the wrong stockpile — no credit.`);
  return { credited: false, tons, materialId: undefined };
}