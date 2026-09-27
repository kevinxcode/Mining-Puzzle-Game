/**
 * MINING FLOW — scoring, stars, rewards and failure analysis.
 * Pure logic — no React imports.
 */

import type { LevelConfig, SimState } from '@/types/game';
import { balance } from './config/balance';
import { scoreWeights } from './config/rewards';
import { fleetIdlePercent } from './engine/simulationEngine';

/* ------------------------------------------------------------------ */
/* Stars                                                               */
/* ------------------------------------------------------------------ */

/**
 * 1 star: complete the target.
 * 2 stars: also finish under the target time.
 * 3 stars: also meet every efficiency requirement defined for the level.
 */
export function computeStars(state: SimState, level: LevelConfig): 1 | 2 | 3 {
  const thresholds = level.starThresholds;
  const idlePercent = fleetIdlePercent(state);

  const star3Checks: boolean[] = [];
  if (thresholds.star3IdlePercent !== undefined) {
    star3Checks.push(idlePercent <= thresholds.star3IdlePercent);
  }
  if (thresholds.star3FuelLiters !== undefined) {
    star3Checks.push(state.stats.fuelUsed <= thresholds.star3FuelLiters);
  }
  if (thresholds.star3NoJam) {
    star3Checks.push(state.stats.jamCount === 0);
  }

  const meetsStar2 =
    thresholds.star2TimeSeconds !== undefined && state.elapsed <= thresholds.star2TimeSeconds;
  if (star3Checks.length > 0 && star3Checks.every(Boolean) && meetsStar2) return 3;
  if (meetsStar2) return 2;
  return 1;
}

/* ------------------------------------------------------------------ */
/* Score                                                               */
/* ------------------------------------------------------------------ */

export function computeEfficiency(state: SimState): number {
  const idlePercent = fleetIdlePercent(state);
  const totalQueue = state.trucks.reduce((sum, t) => sum + t.queueTime, 0);
  const denominator = state.trucks.length * Math.max(0.01, state.elapsed);
  const queuePercent = (totalQueue / denominator) * 100;
  return Math.max(
    0,
    Math.min(
      100,
      Math.round(
        100 -
          idlePercent * balance.efficiencyIdleWeight -
          queuePercent * balance.efficiencyQueueWeight,
      ),
    ),
  );
}

/** Fuel budget used for the fuel bonus: star threshold or fuel objective. */
function fuelBudgetFor(level: LevelConfig): number {
  return (
    level.starThresholds.star3FuelLiters ??
    level.objectives.find((o) => o.kind === 'fuel')?.target ??
    0
  );
}

export function computeScore(state: SimState, level: LevelConfig): number {
  const w = scoreWeights;
  const productionScore = state.stats.tonsMoved * w.perTon;
  const efficiencyBonus = computeEfficiency(state) * w.efficiency;
  const timeBonus = Math.max(0, level.timeLimit - state.elapsed) * w.perSecondSaved;
  const fuelBudget = fuelBudgetFor(level);
  const fuelBonus =
    fuelBudget > 0 ? Math.max(0, fuelBudget - state.stats.fuelUsed) * w.perLiterSaved : 0;
  const trafficPenalty = state.stats.jamCount * w.perJamPenalty;
  return Math.round(productionScore + efficiencyBonus + timeBonus + fuelBonus - trafficPenalty);
}

/* ------------------------------------------------------------------ */
/* Rewards                                                             */
/* ------------------------------------------------------------------ */

export interface RewardBreakdown {
  xp: number;
  coins: number;
  stars: 1 | 2 | 3;
  score: number;
}

/** XP: +100 completion, +50 perfect stars, +25 efficiency bonus. */
export function computeRewards(
  state: SimState,
  level: LevelConfig,
  stars: 1 | 2 | 3,
): RewardBreakdown {
  let xp = balance.xpPerCompletion;
  if (stars === 3) xp += balance.xpPerfectStars;
  const efficiency = computeEfficiency(state);
  if (efficiency >= balance.efficiencyBonusThreshold) xp += balance.xpEfficiencyBonus;
  const coins = level.unlockCoins + stars * balance.coinsPerStar;
  return { xp, coins, stars, score: computeScore(state, level) };
}

/* ------------------------------------------------------------------ */
/* Failure analysis                                                    */
/* ------------------------------------------------------------------ */

export interface FailureAnalysis {
  issue: string;
  tip: string;
}

const FAILURE_TIPS: Record<string, string> = {
  fuel: 'Send trucks to refuel sooner and prefer efficient routes.',
  idle: 'Rebalance trucks across excavators to reduce waiting.',
  queue: 'Spread trucks across different routes to avoid long queues.',
  'no-jam': 'Avoid narrow roads when traffic builds up.',
  deliver: 'Check every stockpile receives its material quota.',
  trucks: 'Use fewer trucks and keep them loaded.',
  time: 'Choose faster routes and keep every truck hauling.',
  tons: 'Assign more trucks or switch to faster routes.',
};

export function analyzeFailure(
  state: SimState,
  level: LevelConfig,
  failedObjectiveId: string | null,
): FailureAnalysis {
  const objective = level.objectives.find((o) => o.id === failedObjectiveId);
  if (objective && objective.kind !== 'tons') {
    return {
      issue: objective.description,
      tip: FAILURE_TIPS[objective.kind] ?? 'Adjust your strategy and try again.',
    };
  }
  // Primary target missed (or the clock ran out): show concrete progress.
  const tonsShort = Math.max(0, Math.round(state.targetTons - state.stats.tonsMoved));
  return {
    issue: `Production ${Math.round(state.stats.tonsMoved)} / ${state.targetTons} t — ${tonsShort} t short`,
    tip: FAILURE_TIPS.tons,
  };
}

/* ------------------------------------------------------------------ */
/* Result flags (for achievements)                                     */
/* ------------------------------------------------------------------ */

export interface ResultFlags {
  noJam: boolean;
  fuelSaver: boolean;
  lowIdle: boolean;
  perfect: boolean;
}

export function computeResultFlags(
  state: SimState,
  level: LevelConfig,
  stars: 1 | 2 | 3,
): ResultFlags {
  const budget = fuelBudgetFor(level);
  return {
    noJam: state.stats.jamCount === 0,
    fuelSaver: budget > 0 && state.stats.fuelUsed <= budget * 0.8,
    lowIdle: fleetIdlePercent(state) <= 5,
    perfect: stars === 3,
  };
}