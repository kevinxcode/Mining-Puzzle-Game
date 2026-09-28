import { SimController } from '@/game/simController';
import { simulateRunLog, isRunLog } from '@/game/replay';
import { getLevelByNumber } from '@/game/levels/levelFactory';
import { balance } from '@/game/config/balance';

/** Drives a controller without timers: advance n fixed ticks. */
function run(ctrl: SimController, ticks: number) {
  for (let i = 0; i < ticks && ctrl.state.status === 'running'; i += 1) ctrl.stepOnce();
}

describe('ghost replay', () => {
  it('replaying the recorded log reproduces the live result exactly', () => {
    const level = getLevelByNumber(3)!;
    const ctrl = new SimController(level, { 'cargo-capacity': 1 });
    const [t1, t2] = ctrl.state.trucks;
    const exIds = level.excavators.map((e) => e.id);
    ctrl.assignTruck(t1.id, exIds[exIds.length - 1]);
    ctrl.start();
    ctrl.dispose(); // stop the real timer; the test steps manually
    run(ctrl, 300);
    if (t2) ctrl.assignTruck(t2.id, exIds[0]);
    run(ctrl, 400);
    ctrl.undo();
    run(ctrl, 200_000);
    expect(['success', 'failed']).toContain(ctrl.state.status);

    const log = ctrl.runLog();
    expect(isRunLog(JSON.parse(JSON.stringify(log)))).toBe(true);
    const ghost = simulateRunLog(level, log);
    expect(ghost.status).toBe(ctrl.state.status);
    expect(ghost.elapsed).toBeCloseTo(ctrl.state.elapsed, 6);
    expect(ghost.stats).toEqual(ctrl.state.stats);
  });

  it('reset clears the log', () => {
    const level = getLevelByNumber(1)!;
    const ctrl = new SimController(level);
    ctrl.start();
    ctrl.reset();
    expect(ctrl.runLog().commands).toEqual([]);
    expect(balance.baseTickSeconds).toBeGreaterThan(0);
  });
});

describe('ghost storage', () => {
  const { applyLevelResult, createDefaultSave } = jest.requireActual('@/state/save');
  const base = {
    success: true, stars: 2, elapsedSeconds: 100, score: 500, tonsMoved: 1, trips: 1, fuelUsed: 1,
    efficiency: 1, breakdowns: 0, productionRate: 1, playtimeSeconds: 100, xpGain: 0, coinsGain: 0,
  };
  const logA = { upgrades: {}, commands: [{ t: 0, kind: 'start' as const }] };
  const logB = { upgrades: { x: 1 }, commands: [] };

  it('keeps the ghost of the best-scoring run only', () => {
    let save = applyLevelResult(createDefaultSave(), '1', { ...base, ghost: logA }).save;
    expect(save.levels['1'].ghost).toEqual(logA);
    save = applyLevelResult(save, '1', { ...base, score: 400, ghost: logB }).save;
    expect(save.levels['1'].ghost).toEqual(logA);
    save = applyLevelResult(save, '1', { ...base, score: 900, ghost: logB }).save;
    expect(save.levels['1'].ghost).toEqual(logB);
  });
});

describe('ghost playback loop', () => {
  it('restarts its loop after WATCH AGAIN (reset)', () => {
    jest.useFakeTimers();
    const level = getLevelByNumber(1)!;
    const ghost = new SimController(level, {}, { upgrades: {}, commands: [{ t: 0, kind: 'start' }] });
    expect(ghost.state.status).toBe('running');
    ghost.play();
    ghost.reset();
    const before = ghost.state.elapsed;
    jest.advanceTimersByTime(2000);
    expect(ghost.state.elapsed).toBeGreaterThan(before);
    ghost.dispose();
    jest.useRealTimers();
  });
});
