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
  type LineBasicMaterial,
  type Points,
  type ShaderMaterial,
} from 'three';
import type { SceneBus } from './sceneBus';
import { dotFragmentShader, dotVertexShader } from './shaders';

/** Radius of the shell of nodes around the liquid core (the core is about 0.9 at its widest). */
const SHELL_RADIUS = 1.2;
const NODE_COUNT = 340;
const HUB_COUNT = 12;
const MAX_ROUTES = 11;
const ARC_SEGMENTS = 40;
/** Each order is drawn as a bright head and a fading tail of light behind it. */
const TAIL = [
  { lag: 0, size: 7.5 },
  { lag: 0.018, size: 6 },
  { lag: 0.036, size: 4.8 },
  { lag: 0.056, size: 3.8 },
  { lag: 0.078, size: 3 },
  { lag: 0.102, size: 2.3 },
  { lag: 0.13, size: 1.7 },
] as const;
const HUB_SIZE = 6.5;
/** A hub that receives an order flares to this many times its size, then settles. */
const HUB_FLARE = 1.9;
const FLARE_DECAY = 3.2;
/** How strongly the core ripples for an ordinary arrival, and for a click. */
const ARRIVAL_RIPPLE = 0.6;
const BURST_RIPPLE = 1.6;
/** A click sends one order to every hub, from the front of the core: seconds per trip, and between departures. */
const BURST_TRIP_S = 0.95;
const BURST_STAGGER_S = 0.045;

// A type alias (not an interface) so it is assignable to three's `{ [name: string]: IUniform }`.
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type DotUniforms = {
  uColor: IUniform<Color>;
  uPixelRatio: IUniform<number>;
};

const createDotUniforms = (): DotUniforms => ({
  uColor: { value: new Color('#22d3ee') },
  uPixelRatio: { value: 1 },
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

interface Route {
  readonly curve: QuadraticBezierCurve3;
  /** The hub the orders arrive at. */
  readonly to: number;
  /** Laps per second, and where on the lap the order starts. */
  readonly speed: number;
  readonly offset: number;
}

/**
 * The model behind the picture: nodes are sales channels and warehouses, hubs are the
 * busy ones, and every route carries orders from one hub to another. Built once, and
 * always the same (no randomness), so the scene looks identical on every visit.
 */
function buildNetwork() {
  // The hubs are a second, coarser lattice: picking every n-th node of the fine one
  // would line them up along a single meridian.
  const hubs = shellPoints(HUB_COUNT, SHELL_RADIUS);
  const nodes = [...shellPoints(NODE_COUNT, SHELL_RADIUS), ...hubs];

  const routes: Route[] = [];
  for (const step of [3, 5, 2, 1]) {
    for (let k = 0; k < hubs.length && routes.length < MAX_ROUTES; k += 1) {
      const from = hubs[k];
      const to = hubs[(k + step) % hubs.length];
      if (!from || !to) continue;
      const angle = from.angleTo(to);
      // Too close reads as a dash, too far would cut through the core.
      if (angle < 0.7 || angle > 1.9) continue;
      // Lift the middle of the arc off the shell, more for longer trips.
      const lift = 0.1 + 0.07 * angle;
      const reach = SHELL_RADIUS * (2 * (1 + lift) - Math.cos(angle / 2));
      const control = from.clone().add(to).normalize().multiplyScalar(reach);
      routes.push({
        curve: new QuadraticBezierCurve3(from, control, to),
        to: (k + step) % hubs.length,
        speed: 0.11 + 0.035 * ((k * 7 + step * 3) % 5),
        offset: ((k * 37 + step * 11) % 100) / 100,
      });
    }
  }

  const nodePositions = new Float32Array(nodes.length * 3);
  const nodeSizes = new Float32Array(nodes.length);
  nodes.forEach((point, i) => {
    point.toArray(nodePositions, i * 3);
    nodeSizes[i] = i >= NODE_COUNT ? HUB_SIZE : 2.6;
  });
  const shell = new BufferGeometry();
  shell.setAttribute('position', new BufferAttribute(nodePositions, 3));
  shell.setAttribute('aSize', new BufferAttribute(nodeSizes, 1));

  const arcPositions = new Float32Array(routes.length * ARC_SEGMENTS * 6);
  routes.forEach((route, r) => {
    const points = route.curve.getPoints(ARC_SEGMENTS);
    for (let s = 0; s < ARC_SEGMENTS; s += 1) {
      const at = (r * ARC_SEGMENTS + s) * 6;
      points[s]?.toArray(arcPositions, at);
      points[s + 1]?.toArray(arcPositions, at + 3);
    }
  });
  const arcs = new BufferGeometry();
  arcs.setAttribute('position', new BufferAttribute(arcPositions, 3));

  const dots = (count: number) => {
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(new Float32Array(count * 3), 3));
    geometry.setAttribute('aSize', new BufferAttribute(new Float32Array(count), 1));
    return geometry;
  };
  const orders = dots(routes.length * TAIL.length);
  const burst = dots(hubs.length * TAIL.length);

  return { hubs, routes, shell, arcs, orders, burst };
}

/** Colours follow the page theme: cyan on the dark page, deeper blues on the light one. */
function readPalette() {
  const light = document.documentElement.dataset.theme === 'light';
  return light
    ? { node: '#0e7490', arc: '#2563eb', order: '#1d4ed8' }
    : { node: '#22d3ee', arc: '#22d3ee', order: '#cffafe' };
}

const easeInOut = (t: number) => t * t * (3 - 2 * t);

/**
 * What the liquid core is surrounded by: a shell of nodes (sales channels and
 * warehouses) and orders travelling along the routes between them. It is the tagline
 * drawn in 3D: orders that keep moving.
 */
export function OrderNetwork({ bus }: { bus: SceneBus }) {
  const groupRef = useRef<Group>(null);
  const shellMaterial = useRef<ShaderMaterial>(null);
  const orderMaterial = useRef<ShaderMaterial>(null);
  const burstMaterial = useRef<ShaderMaterial>(null);
  const arcMaterial = useRef<LineBasicMaterial>(null);
  const ordersRef = useRef<Points>(null);
  const burstRef = useRef<Points>(null);
  const clock = useRef(0);
  const spin = useRef(0);
  const target = useRef({ x: 0, y: 0 });
  const eased = useRef({ x: 0, y: 0 });
  const point = useRef(new Vector3());
  /** Where on its lap each route's order was last frame (-1: not yet known), to notice arrivals. */
  const laps = useRef<number[]>([]);
  /** How much each hub is still flaring from an arrival, 1 → 0. */
  const flares = useRef(new Float32Array(HUB_COUNT));
  /** The running burst, if any: when it started, its trips, and which have landed. */
  const burst = useRef<{ start: number; trips: QuadraticBezierCurve3[]; landed: boolean[] } | null>(null);

  const network = useMemo(() => buildNetwork(), []);
  const shellUniforms = useMemo(() => createDotUniforms(), []);
  const orderUniforms = useMemo(() => createDotUniforms(), []);
  const burstUniforms = useMemo(() => createDotUniforms(), []);

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
      arcMaterial.current?.color.set(palette.arc);
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

    // An order reaches a hub: the hub flares, and the core ripples from that side.
    const land = (hub: number, strength: number) => {
      flares.current[hub] = 1;
      const at = network.hubs[hub];
      if (at && strength > 0) bus.arrive({ point: group.localToWorld(at.clone()), strength });
    };

    const position = orders.geometry.getAttribute('position') as BufferAttribute;
    const size = orders.geometry.getAttribute('aSize') as BufferAttribute;
    network.routes.forEach((route, r) => {
      const lap = (clock.current * route.speed + route.offset) % 1;
      const before = laps.current[r] ?? -1;
      if (before >= 0 && lap < before) land(route.to, ARRIVAL_RIPPLE);
      laps.current[r] = lap;
      TAIL.forEach((part, p) => {
        const i = r * TAIL.length + p;
        const t = lap - part.lag;
        if (t <= 0) {
          size.setX(i, 0);
          return;
        }
        route.curve.getPoint(easeInOut(t), point.current);
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
      burst.current = {
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
      };
      bus.arrive({ point: new Vector3(0, 0, 1), strength: BURST_RIPPLE });
    }
    const burstPosition = burstDots.geometry.getAttribute('position') as BufferAttribute;
    const burstSize = burstDots.geometry.getAttribute('aSize') as BufferAttribute;
    const running = burst.current;
    if (running) {
      const since = clock.current - running.start;
      running.trips.forEach((trip, h) => {
        const t = (since - h * BURST_STAGGER_S) / BURST_TRIP_S;
        if (t >= 1 && !running.landed[h]) {
          running.landed[h] = true;
          land(h, 0);
        }
        TAIL.forEach((part, p) => {
          const i = h * TAIL.length + p;
          const u = t - part.lag * 1.6;
          if (u <= 0 || u >= 1) {
            burstSize.setX(i, 0);
            return;
          }
          trip.getPoint(easeInOut(u), point.current);
          burstPosition.setXYZ(i, point.current.x, point.current.y, point.current.z);
          burstSize.setX(i, part.size * 1.15);
        });
      });
      if (running.landed.every(Boolean) && since > BURST_TRIP_S * 2) burst.current = null;
      burstPosition.needsUpdate = true;
      burstSize.needsUpdate = true;
    }

    // Hubs flare and settle.
    const shellSize = network.shell.getAttribute('aSize') as BufferAttribute;
    let flaring = false;
    for (let h = 0; h < HUB_COUNT; h += 1) {
      const flare = flares.current[h] ?? 0;
      if (flare <= 0) continue;
      flaring = true;
      const next = flare < 0.01 ? 0 : flare * Math.exp(-dt * FLARE_DECAY);
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
          vertexShader={dotVertexShader}
          fragmentShader={dotFragmentShader}
          transparent
          depthWrite={false}
        />
      </points>
      <lineSegments geometry={network.arcs}>
        <lineBasicMaterial ref={arcMaterial} transparent opacity={0.3} depthWrite={false} />
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
