import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  QuadraticBezierCurve3,
  Vector3,
  type Group,
  type IUniform,
  type Points,
  type ShaderMaterial,
} from 'three';
import type { SceneBus } from './sceneBus';
import {
  arcFragmentShader,
  arcVertexShader,
  dotFragmentShader,
  dotVertexShader,
  shellFragmentShader,
  shellVertexShader,
} from './shaders';

/** Radius of the shell of nodes around the liquid core (the core is about 0.9 at its widest). */
const SHELL_RADIUS = 1.2;
const NODE_COUNT = 340;
const HUB_COUNT = 12;
/** Orders that go through the core (sales channel → core → warehouse), and plain hub-to-hub routes. */
const FLOWS = 6;
const TRANSFERS = 5;
const ARC_SEGMENTS = 40;
/** Where a flow's order enters and leaves the core (radius in the network's space; the core surface is ~0.72). */
const CORE_DEPTH = 0.62;
/** Share of a flow spent reaching the core, and where it comes out again. */
const ENTER_AT = 0.42;
const EXIT_AT = 0.58;
/** Each order is a bright head with a dense, tapering tail: the dots overlap into a streak. */
const TAIL = Array.from({ length: 18 }, (_, k) => ({
  lag: k * 0.006,
  size: 1.1 + 6.6 * (1 - k / 18) ** 1.4,
}));
const NODE_SIZE = 2.6;
const HUB_SIZE = 10;
/** A hub that sends or receives an order flares to this many times its size, then settles. */
const HUB_FLARE = 1.7;
const FLARE_DECAY = 3.2;
/** How strongly the core ripples when an order goes in, and for a click. */
const ENTER_RIPPLE = 0.85;
const BURST_RIPPLE = 1.6;
/** A click sends one order to every hub, from the front of the core: seconds per trip, and between departures. */
const BURST_TRIP_S = 0.95;
const BURST_STAGGER_S = 0.045;
/** Clicks in quick succession each get their own wave, up to this many at once. */
const MAX_BURSTS = 3;

/** What a node of the shell is: drawn as a soft dot, a ring (sales channel) or a diamond (warehouse). */
const KIND = { node: 0, channel: 1, warehouse: 2 } as const;

// Type aliases (not interfaces) so they are assignable to three's `{ [name: string]: IUniform }`.
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type DotUniforms = {
  uColor: IUniform<Color>;
  uPixelRatio: IUniform<number>;
};
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type ArcUniforms = {
  uColor: IUniform<Color>;
  uOpacity: IUniform<number>;
};

const createDotUniforms = (): DotUniforms => ({
  uColor: { value: new Color('#22d3ee') },
  uPixelRatio: { value: 1 },
});
const createArcUniforms = (): ArcUniforms => ({
  uColor: { value: new Color('#22d3ee') },
  uOpacity: { value: 0.42 },
});

/** Evenly spread points on a sphere (Fibonacci lattice). */
function shellPoints(count: number, radius: number): Vector3[] {
  const golden = Math.PI * (3 - Math.sqrt(5));
  return Array.from({ length: count }, (_, i) => {
    const y = 1 - (2 * (i + 0.5)) / count;
    const ring = Math.sqrt(1 - y * y);
    const angle = i * golden;
    return new Vector3(Math.cos(angle) * ring, y, Math.sin(angle) * ring).multiplyScalar(radius);
  });
}

/** Something an order can travel along, t from 0 to 1. */
interface Path {
  getPoint: (t: number, target: Vector3) => Vector3;
}

/**
 * A flow: from a sales channel down into the core, straight through it (hidden by the
 * liquid), and out to a warehouse on the far side.
 */
function flowPath(channel: Vector3, warehouse: Vector3) {
  const entry = channel.clone().setLength(CORE_DEPTH);
  const exit = warehouse.clone().setLength(CORE_DEPTH);
  // Bow each leg sideways a little, so it reads as a route and not as a spoke.
  const bow = (from: Vector3, to: Vector3) => {
    const side = new Vector3().crossVectors(from, new Vector3(0, 1, 0.3)).setLength(0.22);
    return from.clone().add(to).multiplyScalar(0.5).add(side);
  };
  const inbound = new QuadraticBezierCurve3(channel, bow(channel, entry), entry);
  const outbound = new QuadraticBezierCurve3(exit, bow(exit, warehouse), warehouse);
  const path: Path = {
    getPoint: (t, target) => {
      if (t < ENTER_AT) return inbound.getPoint(t / ENTER_AT, target);
      if (t < EXIT_AT) return target.lerpVectors(entry, exit, (t - ENTER_AT) / (EXIT_AT - ENTER_AT));
      return outbound.getPoint((t - EXIT_AT) / (1 - EXIT_AT), target);
    },
  };
  return { path, inbound, outbound, entry };
}

interface Route {
  readonly path: Path;
  readonly from: number;
  readonly to: number;
  /** For flows: the point where the order enters the core (network space). */
  readonly entry: Vector3 | null;
  /** Laps per second, and where on the lap the order starts. */
  readonly speed: number;
  readonly offset: number;
}

/**
 * The model behind the picture, the tagline in 3D: hubs are sales channels (rings) and
 * warehouses (diamonds); orders come in from the channels, go through the core (the
 * order system), and go out to the warehouses; a few plain routes link hubs directly.
 * Built once and always the same (no randomness), so the scene looks identical on every visit.
 */
function buildNetwork() {
  // The hubs are a second, coarser lattice: picking every n-th node of the fine one
  // would line them up along a single meridian. Even hubs are channels, odd ones warehouses.
  const hubs = shellPoints(HUB_COUNT, SHELL_RADIUS);
  const kindOf = (hub: number) => (hub % 2 === 0 ? KIND.channel : KIND.warehouse);
  const nodes = [...shellPoints(NODE_COUNT, SHELL_RADIUS), ...hubs];

  const routes: Route[] = [];
  const arcs: Path[] = [];

  // Each channel sends to the warehouse farthest from it that is still free, so every
  // flow crosses the core.
  const free = new Set(hubs.map((_, i) => i).filter((i) => kindOf(i) === KIND.warehouse));
  for (let c = 0; c < HUB_COUNT && routes.length < FLOWS; c += 2) {
    const channel = hubs[c];
    if (!channel) continue;
    let best = -1;
    for (const w of free) {
      const at = hubs[w];
      const current = hubs[best];
      if (at && (!current || channel.angleTo(at) > channel.angleTo(current))) best = w;
    }
    const warehouse = hubs[best];
    if (!warehouse) continue;
    free.delete(best);
    const flow = flowPath(channel, warehouse);
    routes.push({
      path: flow.path,
      from: c,
      to: best,
      entry: flow.entry,
      speed: 0.085 + 0.02 * ((c * 7) % 5),
      offset: ((c * 37) % 100) / 100,
    });
    arcs.push(flow.inbound, flow.outbound);
  }

  // Plain routes between hubs: long enough to read, short enough not to cut through the core.
  let transfers = 0;
  for (const step of [3, 5, 2, 1]) {
    for (let k = 0; k < hubs.length && transfers < TRANSFERS; k += 1) {
      const from = hubs[k];
      const to = hubs[(k + step) % hubs.length];
      if (!from || !to) continue;
      const angle = from.angleTo(to);
      if (angle < 0.7 || angle > 1.9) continue;
      // Lift the middle of the arc off the shell, more for longer trips.
      const lift = 0.1 + 0.07 * angle;
      const reach = SHELL_RADIUS * (2 * (1 + lift) - Math.cos(angle / 2));
      const control = from.clone().add(to).normalize().multiplyScalar(reach);
      const curve = new QuadraticBezierCurve3(from, control, to);
      routes.push({
        path: curve,
        from: k,
        to: (k + step) % hubs.length,
        entry: null,
        speed: 0.11 + 0.035 * ((k * 7 + step * 3) % 5),
        offset: ((k * 37 + step * 11) % 100) / 100,
      });
      arcs.push(curve);
      transfers += 1;
    }
  }

  const nodePositions = new Float32Array(nodes.length * 3);
  const nodeSizes = new Float32Array(nodes.length);
  const nodeKinds = new Float32Array(nodes.length);
  nodes.forEach((point, i) => {
    point.toArray(nodePositions, i * 3);
    const hub = i - NODE_COUNT;
    nodeSizes[i] = hub >= 0 ? HUB_SIZE : NODE_SIZE;
    nodeKinds[i] = hub >= 0 ? kindOf(hub) : KIND.node;
  });
  const shell = new BufferGeometry();
  shell.setAttribute('position', new BufferAttribute(nodePositions, 3));
  shell.setAttribute('aSize', new BufferAttribute(nodeSizes, 1));
  shell.setAttribute('aKind', new BufferAttribute(nodeKinds, 1));

  const arcPositions = new Float32Array(arcs.length * ARC_SEGMENTS * 6);
  const a = new Vector3();
  const b = new Vector3();
  arcs.forEach((arc, r) => {
    for (let s = 0; s < ARC_SEGMENTS; s += 1) {
      const at = (r * ARC_SEGMENTS + s) * 6;
      arc.getPoint(s / ARC_SEGMENTS, a).toArray(arcPositions, at);
      arc.getPoint((s + 1) / ARC_SEGMENTS, b).toArray(arcPositions, at + 3);
    }
  });
  const arcGeometry = new BufferGeometry();
  arcGeometry.setAttribute('position', new BufferAttribute(arcPositions, 3));

  const dots = (count: number) => {
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(new Float32Array(count * 3), 3));
    geometry.setAttribute('aSize', new BufferAttribute(new Float32Array(count), 1));
    return geometry;
  };
  const orders = dots(routes.length * TAIL.length);
  const burst = dots(MAX_BURSTS * hubs.length * TAIL.length);

  return { hubs, routes, shell, arcs: arcGeometry, orders, burst };
}

/** Colours follow the page theme: cyan on the dark page, deeper blues on the light one. */
function readPalette() {
  const light = document.documentElement.dataset.theme === 'light';
  return light
    ? { node: '#0e7490', arc: '#2563eb', order: '#1d4ed8' }
    : { node: '#22d3ee', arc: '#22d3ee', order: '#cffafe' };
}

const easeInOut = (t: number) => t * t * (3 - 2 * t);

interface Burst {
  start: number;
  trips: QuadraticBezierCurve3[];
  landed: boolean[];
}

/**
 * What the liquid core is surrounded by: a shell of nodes, sales channels and warehouses,
 * and orders travelling between them, most of them through the core. It is the tagline
 * drawn in 3D: orders that keep moving.
 */
export function OrderNetwork({ bus }: { bus: SceneBus }) {
  const groupRef = useRef<Group>(null);
  const shellMaterial = useRef<ShaderMaterial>(null);
  const orderMaterial = useRef<ShaderMaterial>(null);
  const burstMaterial = useRef<ShaderMaterial>(null);
  const arcMaterial = useRef<ShaderMaterial>(null);
  const ordersRef = useRef<Points>(null);
  const burstRef = useRef<Points>(null);
  const clock = useRef(0);
  const spin = useRef(0);
  const target = useRef({ x: 0, y: 0 });
  const eased = useRef({ x: 0, y: 0 });
  const point = useRef(new Vector3());
  /** Where each route's order was on its lap last frame (-1: not yet known), to notice events. */
  const laps = useRef<number[]>([]);
  /** How much each hub is still flaring, 1 → 0. */
  const flares = useRef(new Float32Array(HUB_COUNT));
  /** Waves of orders sent by clicks, oldest first. */
  const bursts = useRef<Burst[]>([]);

  const network = useMemo(() => buildNetwork(), []);
  const shellUniforms = useMemo(() => createDotUniforms(), []);
  const orderUniforms = useMemo(() => createDotUniforms(), []);
  const burstUniforms = useMemo(() => createDotUniforms(), []);
  const arcUniforms = useMemo(() => createArcUniforms(), []);

  useEffect(
    () => () => {
      network.shell.dispose();
      network.arcs.dispose();
      network.orders.dispose();
      network.burst.dispose();
    },
    [network],
  );

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      target.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      target.current.y = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, []);

  useEffect(() => {
    const apply = () => {
      const palette = readPalette();
      (shellMaterial.current?.uniforms as DotUniforms | undefined)?.uColor.value.set(palette.node);
      (orderMaterial.current?.uniforms as DotUniforms | undefined)?.uColor.value.set(palette.order);
      (burstMaterial.current?.uniforms as DotUniforms | undefined)?.uColor.value.set(palette.order);
      (arcMaterial.current?.uniforms as ArcUniforms | undefined)?.uColor.value.set(palette.arc);
    };
    apply();
    const observer = new MutationObserver(apply);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  useFrame((state, delta) => {
    const group = groupRef.current;
    const orders = ordersRef.current;
    const burstDots = burstRef.current;
    if (!group || !orders || !burstDots) return;
    const dt = Math.min(delta, 0.05); // ignore the gap after a pause
    const k = Math.min(1, dt * 2.5);
    eased.current.x += (target.current.x - eased.current.x) * k;
    eased.current.y += (target.current.y - eased.current.y) * k;
    clock.current += dt;
    spin.current += dt * 0.07;
    group.rotation.x = 0.28 - eased.current.y * 0.22;
    group.rotation.y = spin.current + eased.current.x * 0.3;

    const ratio = state.gl.getPixelRatio();
    for (const material of [shellMaterial.current, orderMaterial.current, burstMaterial.current]) {
      if (material) (material.uniforms as DotUniforms).uPixelRatio.value = ratio;
    }

    const flare = (hub: number, amount: number) => {
      flares.current[hub] = Math.max(flares.current[hub] ?? 0, amount);
    };

    // Orders on their routes. A flow's order enters the core (the core ripples from there),
    // is hidden while it goes through, and comes out toward its warehouse.
    const position = orders.geometry.getAttribute('position') as BufferAttribute;
    const size = orders.geometry.getAttribute('aSize') as BufferAttribute;
    network.routes.forEach((route, r) => {
      const lap = (clock.current * route.speed + route.offset) % 1;
      const before = laps.current[r] ?? -1;
      if (before >= 0) {
        if (lap < before) {
          flare(route.to, 1);
          flare(route.from, 0.55);
        } else if (route.entry && easeInOut(before) < ENTER_AT && easeInOut(lap) >= ENTER_AT) {
          bus.arrive({ point: group.localToWorld(route.entry.clone()), strength: ENTER_RIPPLE });
        }
      }
      laps.current[r] = lap;
      TAIL.forEach((part, p) => {
        const i = r * TAIL.length + p;
        const t = lap - part.lag;
        if (t <= 0) {
          size.setX(i, 0);
          return;
        }
        route.path.getPoint(easeInOut(t), point.current);
        position.setXYZ(i, point.current.x, point.current.y, point.current.z);
        // Orders fade in as they leave a hub and out as they arrive.
        size.setX(i, part.size * Math.min(1, Math.sin(Math.PI * t) * 2.2));
      });
    });
    position.needsUpdate = true;
    size.needsUpdate = true;

    // A click: one order leaves the front of the core for every hub, a fan of light.
    if (bus.takeBurst()) {
      const front = group.worldToLocal(new Vector3(0, 0, 0.8));
      if (bursts.current.length >= MAX_BURSTS) bursts.current.shift();
      bursts.current.push({
        start: clock.current,
        trips: network.hubs.map(
          (hub) =>
            new QuadraticBezierCurve3(
              front,
              front
                .clone()
                .add(hub)
                .normalize()
                .multiplyScalar(SHELL_RADIUS * 1.35),
              hub,
            ),
        ),
        landed: network.hubs.map(() => false),
      });
      bus.arrive({ point: new Vector3(0, 0, 1), strength: BURST_RIPPLE });
    }
    const burstPosition = burstDots.geometry.getAttribute('position') as BufferAttribute;
    const burstSize = burstDots.geometry.getAttribute('aSize') as BufferAttribute;
    if (bursts.current.length > 0) {
      for (let slot = 0; slot < MAX_BURSTS; slot += 1) {
        const wave = bursts.current[slot];
        const since = wave ? clock.current - wave.start : Infinity;
        for (let h = 0; h < HUB_COUNT; h += 1) {
          const trip = wave?.trips[h];
          const t = (since - h * BURST_STAGGER_S) / BURST_TRIP_S;
          if (wave && trip && t >= 1 && !wave.landed[h]) {
            wave.landed[h] = true;
            flare(h, 1);
          }
          TAIL.forEach((part, p) => {
            const i = (slot * HUB_COUNT + h) * TAIL.length + p;
            const u = t - part.lag * 1.6;
            if (!trip || u <= 0 || u >= 1) {
              burstSize.setX(i, 0);
              return;
            }
            trip.getPoint(easeInOut(u), point.current);
            burstPosition.setXYZ(i, point.current.x, point.current.y, point.current.z);
            burstSize.setX(i, part.size * 1.1);
          });
        }
      }
      // A wave is over once every order has landed and its tail has gone.
      bursts.current = bursts.current.filter(
        (wave) => !(wave.landed.every(Boolean) && clock.current - wave.start > BURST_TRIP_S * 2),
      );
      if (bursts.current.length === 0) burstSize.array.fill(0);
      burstPosition.needsUpdate = true;
      burstSize.needsUpdate = true;
    }

    // Hubs flare and settle.
    const shellSize = network.shell.getAttribute('aSize') as BufferAttribute;
    let flaring = false;
    for (let h = 0; h < HUB_COUNT; h += 1) {
      const level = flares.current[h] ?? 0;
      if (level <= 0) continue;
      flaring = true;
      const next = level < 0.01 ? 0 : level * Math.exp(-dt * FLARE_DECAY);
      flares.current[h] = next;
      shellSize.setX(NODE_COUNT + h, HUB_SIZE * (1 + (HUB_FLARE - 1) * next));
    }
    if (flaring) shellSize.needsUpdate = true;
  });

  return (
    <group ref={groupRef}>
      <points geometry={network.shell}>
        <shaderMaterial
          ref={shellMaterial}
          uniforms={shellUniforms}
          vertexShader={shellVertexShader}
          fragmentShader={shellFragmentShader}
          transparent
          depthWrite={false}
        />
      </points>
      <lineSegments geometry={network.arcs}>
        <shaderMaterial
          ref={arcMaterial}
          uniforms={arcUniforms}
          vertexShader={arcVertexShader}
          fragmentShader={arcFragmentShader}
          transparent
          depthWrite={false}
        />
      </lineSegments>
      <points ref={ordersRef} geometry={network.orders} frustumCulled={false}>
        <shaderMaterial
          ref={orderMaterial}
          uniforms={orderUniforms}
          vertexShader={dotVertexShader}
          fragmentShader={dotFragmentShader}
          transparent
          depthWrite={false}
        />
      </points>
      <points ref={burstRef} geometry={network.burst} frustumCulled={false}>
        <shaderMaterial
          ref={burstMaterial}
          uniforms={burstUniforms}
          vertexShader={dotVertexShader}
          fragmentShader={dotFragmentShader}
          transparent
          depthWrite={false}
        />
      </points>
    </group>
  );
}
