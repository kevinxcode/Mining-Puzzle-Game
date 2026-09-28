/**
 * MINING FLOW — score weights.
 * Final score = productionScore + efficiencyBonus + timeBonus + fuelBonus - trafficPenalty.
 * Weights live here so balancing never requires touching game logic.
 */

export const scoreWeights = {
  perTon: 1,
  efficiency: 2,
  perSecondSaved: 0.5,
  perLiterSaved: 0.5,
  perJamPenalty: 15,
} as const;
/** Replay-mode payouts (kept modest so modes never out-earn the campaign). */
export const modeRewards = {
  /** Paid once per calendar day for the first daily win. */
  dailyCoins: 150,
  dailyXp: 80,
  /** Extra coins per streak day, capped at dailyStreakCap days. */
  dailyStreakBonus: 25,
  dailyStreakCap: 7,
  /** Per cleared endless shift: base + shift × perShift. */
  endlessCoinsBase: 20,
  endlessCoinsPerShift: 10,
  endlessXpPerShift: 20,
  /** Paid once per ISO week for the first weekly win. */
  weeklyCoins: 400,
  weeklyXp: 150,
} as const;
