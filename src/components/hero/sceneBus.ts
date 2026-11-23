import type { Vector3 } from 'three';

export interface Arrival {
  /** Where the order landed, in world space. */
  readonly point: Vector3;
  /** How strongly the core answers: about 0.5 for an ordinary arrival, more for a click. */
  readonly strength: number;
}

/**
 * What the parts of the hero scene tell each other, frame by frame: the network reports
 * where orders arrive (the liquid core ripples from there), and a click on the scene asks
 * the network for a burst of orders. Created once per scene; nothing here re-renders.
 */
export interface SceneBus {
  arrive: (arrival: Arrival) => void;
  /** The arrivals since the last call. */
  takeArrivals: () => readonly Arrival[];
  requestBurst: () => void;
  /** True once after each click. */
  takeBurst: () => boolean;
}

const NONE: readonly Arrival[] = [];

export function createSceneBus(): SceneBus {
  let arrivals: Arrival[] = [];
  let burst = false;
  return {
    arrive: (arrival) => {
      arrivals.push(arrival);
    },
    takeArrivals: () => {
      if (arrivals.length === 0) return NONE;
      const taken = arrivals;
      arrivals = [];
      return taken;
    },
    requestBurst: () => {
      burst = true;
    },
    takeBurst: () => {
      const taken = burst;
      burst = false;
      return taken;
    },
  };
}
