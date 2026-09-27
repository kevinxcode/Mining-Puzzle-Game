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