import { SimController } from '@/game/simController';
import { getLevelByNumber } from '@/game/levels/levelFactory';
import { decodeChallenge, encodeChallenge, verifyChallenge, CHALLENGE_PREFIX } from '@/game/challenge';

/** Plays level 1 to the end headlessly and returns its run log. */
function playLevel1() {
  const level = getLevelByNumber(1)!;
  const ctrl = new SimController(level);
  ctrl.start();
  ctrl.dispose();
  for (let i = 0; i < 200_000 && ctrl.state.status === 'running'; i += 1) ctrl.stepOnce();
  return { level, ctrl, log: ctrl.runLog() };
}

describe('challenge codes', () => {
  it('round-trips level, nickname and ghost', () => {
    const { log } = playLevel1();
    const code = encodeChallenge({ levelId: '1', nickname: 'Budi ⛏', log });
    expect(code.startsWith(CHALLENGE_PREFIX)).toBe(true);
    const decoded = decodeChallenge(code);
    expect(decoded.ok).toBe(true);
    if (!decoded.ok) return;
    expect(decoded.challenge.levelId).toBe('1');
    expect(decoded.challenge.nickname).toBe('Budi ⛏');
    expect(decoded.challenge.log).toEqual(log);
  });

  it('tolerates whitespace and text around the code (chat apps)', () => {
    const { log } = playLevel1();
    const code = encodeChallenge({ levelId: '1', nickname: 'A', log });
    const pasted = `Beat my run!\n${code.slice(0, 20)}\n${code.slice(20)} \n`;
    expect(decodeChallenge(pasted).ok).toBe(true);
  });

  it('rejects corrupted, foreign and unknown-level codes', () => {
    const { log } = playLevel1();
    const code = encodeChallenge({ levelId: '1', nickname: 'A', log });
    const flipped = code.slice(0, -3) + (code.slice(-3, -2) === 'A' ? 'B' : 'A') + code.slice(-2);
    expect(decodeChallenge(flipped).ok).toBe(false);
    expect(decodeChallenge('hello').ok).toBe(false);
    expect(decodeChallenge(encodeChallenge({ levelId: '999', nickname: 'A', log })).ok).toBe(false);
  });

  it('scores the challenge by replaying it, not by trusting the sender', () => {
    const { ctrl, log } = playLevel1();
    const decoded = decodeChallenge(encodeChallenge({ levelId: '1', nickname: 'A', log }));
    if (!decoded.ok) throw new Error('decode failed');
    const result = verifyChallenge(decoded.challenge);
    expect(result.success).toBe(ctrl.state.status === 'success');
    expect(result.tons).toBeCloseTo(ctrl.state.stats.tonsMoved, 6);
    expect(result.seconds).toBeCloseTo(ctrl.state.elapsed, 6);
  });

  it('clamps inflated upgrade levels in a tampered code', () => {
    const { log } = playLevel1();
    const decoded = decodeChallenge(encodeChallenge({ levelId: '1', nickname: 'A', log: { ...log, upgrades: { 'truck:capacity': 99, fake: 3 } } }));
    expect(decoded.ok).toBe(true);
    if (decoded.ok) expect(decoded.challenge.log.upgrades).toEqual({ 'truck:capacity': 3 });
  });
});
