import { describe, expect, it } from 'vitest';
import { createFpsMeter, type FpsMeter, type FpsVerdict } from '@/lib/fps';

/** Feeds the same frame time until the meter decides, or until `seconds` have passed. */
function run(meter: FpsMeter, delta: number, seconds: number): FpsVerdict | null {
  for (let t = 0; t < seconds; t += delta) {
    const verdict = meter.sample(delta);
    if (verdict) return verdict;
  }
  return null;
}

describe('createFpsMeter', () => {
  it('accepts a smooth scene and then stays quiet', () => {
    const meter = createFpsMeter();
    expect(run(meter, 1 / 60, 5)).toBe('ok');
    expect(run(meter, 1 / 10, 20)).toBeNull();
  });

  it('degrades a slow scene once, then gives it up', () => {
    const meter = createFpsMeter();
    expect(run(meter, 1 / 20, 5)).toBe('degrade');
    expect(run(meter, 1 / 20, 5)).toBe('fail');
    expect(run(meter, 1 / 20, 20)).toBeNull();
  });

  it('keeps a scene that is fast enough after degrading', () => {
    const meter = createFpsMeter();
    expect(run(meter, 1 / 20, 5)).toBe('degrade');
    expect(run(meter, 1 / 60, 5)).toBe('ok');
  });

  it('gives up a scene too slow to be measured (under 4 fps)', () => {
    const meter = createFpsMeter();
    expect(run(meter, 0.4, 10)).toBe('degrade');
    expect(run(meter, 0.4, 10)).toBe('fail');
  });

  it('counts long gaps even when quicker frames come in between', () => {
    const meter = createFpsMeter();
    const verdicts: FpsVerdict[] = [];
    for (let i = 0; i < 20 && verdicts.length === 0; i += 1) {
      for (const delta of [0.3, 0.1]) {
        const verdict = meter.sample(delta);
        if (verdict) verdicts.push(verdict);
      }
    }
    expect(verdicts).toEqual(['degrade']);
  });

  it('does not count pauses, such as a sleeping computer', () => {
    const meter = createFpsMeter();
    for (let i = 0; i < 10; i += 1) expect(meter.sample(30)).toBeNull();
    expect(run(meter, 1 / 60, 5)).toBe('ok');
  });

  it('forgives a few hiccups', () => {
    const meter = createFpsMeter();
    for (let i = 0; i < 3; i += 1) expect(meter.sample(0.4)).toBeNull();
    expect(run(meter, 1 / 60, 5)).toBe('ok');
  });
});
