/**
 * MINING FLOW — global balance constants.
 * Central tuning knobs for the simulation engine and progression.
 * Avoid magic numbers in engine or UI code.
 */

export const balance = {
  /** Fixed simulation step in seconds. Speed multiplies sub-ticks per frame. */
  baseTickSeconds: 0.1,
  /** Real-time interval between simulation frames (ms). */
  simIntervalMs: 100,

  /* Movement */
  mudSpeedFactor: 0.5,
  rainSpeedFactor: 0.7,
  mudFuelFactor: 1.6,

  /* Loading / dumping */
  dumpBaseSeconds: 1.5,
  dumpSecondsPerTon: 0.04,
  /** Fixed swing time per excavator pass — bigger buckets mean fewer passes. */
  passSwingSeconds: 0.8,

  /* Fuel */
  refuelLitersPerSecond: 6,
  /** Refuel when fuel drops below this factor of the round-trip need. */
  refuelSafetyFactor: 1.2,
  /** Headroom on the estimated ideal fuel use when deriving fuel budgets. */
  fuelBudgetSlack: 1.65,
  breakdownRecoverySeconds: 15,
  /** Tank fraction restored after a breakdown tow. */
  towRefillFraction: 0.3,

  /* Traffic */
  /** Queue seconds after which an episode counts as a traffic jam. */
  jamQueueSeconds: 12,

  /* Events */
  eventFeedMax: 6,
  efficiencyDropMagnitude: 0.3,

  /* Scoring */
  efficiencyIdleWeight: 0.6,
  efficiencyQueueWeight: 0.4,

  /* Progression */
  xpPerCompletion: 100,
  xpPerfectStars: 50,
  xpEfficiencyBonus: 25,
  efficiencyBonusThreshold: 85,
  coinsPerStar: 10,
  playerLevelXpBase: 100,
  maxUpgradeLevel: 3,
  achievementTons: 10000,
} as const;