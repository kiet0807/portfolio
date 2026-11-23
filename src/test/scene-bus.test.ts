import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { createSceneBus } from '@/components/hero/sceneBus';

describe('hero scene bus', () => {
  it('hands each arrival over once, in order', () => {
    const bus = createSceneBus();
    expect(bus.takeArrivals()).toEqual([]);
    bus.arrive({ point: new Vector3(1, 0, 0), strength: 0.6 });
    bus.arrive({ point: new Vector3(0, 1, 0), strength: 1.6 });
    expect(bus.takeArrivals().map((arrival) => arrival.strength)).toEqual([0.6, 1.6]);
    expect(bus.takeArrivals()).toEqual([]);
  });

  it('reports a click once, however many frames ask', () => {
    const bus = createSceneBus();
    expect(bus.takeBurst()).toBe(false);
    bus.requestBurst();
    bus.requestBurst();
    expect(bus.takeBurst()).toBe(true);
    expect(bus.takeBurst()).toBe(false);
  });
});
