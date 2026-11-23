import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import {
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  IcosahedronGeometry,
  Quaternion,
  Vector3,
  Vector4,
  type IUniform,
  type Mesh,
  type ShaderMaterial,
} from 'three';
import type { SceneBus } from './sceneBus';
import { fragmentShader, PULSE_SLOTS, vertexShader } from './shaders';

// A type alias (not an interface) so it is assignable to three's `{ [name: string]: IUniform }`.
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type SphereUniforms = {
  uTime: IUniform<number>;
  uToward: IUniform<Vector3>;
  uPulses: IUniform<Vector4[]>;
  uDeep: IUniform<Color>;
  uMid: IUniform<Color>;
  uLight: IUniform<Color>;
};

/** Ordinary arrivals ripple the core at most this often; a click always does. */
const RIPPLE_GAP_S = 0.9;

function createUniforms(): SphereUniforms {
  return {
    uTime: { value: 0 },
    uToward: { value: new Vector3(0, 0, 1) },
    uPulses: { value: Array.from({ length: PULSE_SLOTS }, () => new Vector4(0, 0, 0, -100)) },
    // Water palette: navy → primary blue → cyan.
    uDeep: { value: new Color('#0b1f3a') },
    uMid: { value: new Color('#2563eb') },
    uLight: { value: new Color('#22d3ee') },
  };
}

/**
 * The icosphere with its shared corners merged: three builds it as separate triangles
 * (65,340 vertices at detail 32), so every vertex would run the noise shader six times.
 * Indexed, the same surface has about 10,000. Only positions are kept: the shader
 * derives everything else.
 */
function indexedIcosphere(detail: number): BufferGeometry {
  const source = new IcosahedronGeometry(1, detail);
  const position = source.getAttribute('position');
  const seen = new Map<string, number>();
  const points: number[] = [];
  const index: number[] = [];
  for (let i = 0; i < position.count; i += 1) {
    const x = position.getX(i);
    const y = position.getY(i);
    const z = position.getZ(i);
    const key = `${Math.round(x * 1e5)},${Math.round(y * 1e5)},${Math.round(z * 1e5)}`;
    let at = seen.get(key);
    if (at === undefined) {
      at = points.length / 3;
      seen.set(key, at);
      points.push(x, y, z);
    }
    index.push(at);
  }
  source.dispose();
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(points, 3));
  geometry.setIndex(index);
  return geometry;
}

/**
 * Liquid-looking sphere: noise-displaced, slowly turning, leaning toward the pointer.
 * Where the network reports an arriving order, a faint ring of light travels over it.
 */
export function FluidSphere({ bus }: { bus: SceneBus }) {
  const meshRef = useRef<Mesh>(null);
  const materialRef = useRef<ShaderMaterial>(null);
  const target = useRef({ x: 0, y: 0 });
  const eased = useRef({ x: 0, y: 0 });
  const lastRipple = useRef(-100);
  const local = useRef(new Vector3());
  const turn = useRef(new Quaternion());

  const uniforms = useMemo(() => createUniforms(), []);
  const geometry = useMemo(() => indexedIcosphere(32), []);
  useEffect(() => () => geometry.dispose(), [geometry]);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      target.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      target.current.y = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, []);

  useFrame((_, delta) => {
    const mesh = meshRef.current;
    const material = materialRef.current;
    if (!mesh || !material) return;
    // Read the uniforms back from the material: the memoised object above is treated as immutable.
    const live = material.uniforms as SphereUniforms;
    const dt = Math.min(delta, 0.05); // ignore the gap after a pause
    const k = Math.min(1, dt * 2.5);
    eased.current.x += (target.current.x - eased.current.x) * k;
    eased.current.y += (target.current.y - eased.current.y) * k;

    const now = live.uTime.value + dt;
    live.uTime.value = now;
    mesh.rotation.x = -eased.current.y * 0.22;
    mesh.rotation.y = eased.current.x * 0.3;
    // The pointer, seen from the camera, turned into the sphere's own space (it may have been spun).
    mesh.getWorldQuaternion(turn.current).invert();
    live.uToward.value
      .set(eased.current.x * 1.1, eased.current.y * 1.1, 1)
      .normalize()
      .applyQuaternion(turn.current);

    // Arrivals become ripples, from the point of the core nearest to where the order landed.
    const pulses = live.uPulses.value;
    for (const arrival of bus.takeArrivals()) {
      const strong = arrival.strength >= 1;
      if (!strong && now - lastRipple.current < RIPPLE_GAP_S) continue;
      lastRipple.current = now;
      const slot = pulses.reduce((oldest, pulse) => (pulse.w < oldest.w ? pulse : oldest));
      const direction = mesh.worldToLocal(local.current.copy(arrival.point)).normalize();
      slot.set(
        direction.x * arrival.strength,
        direction.y * arrival.strength,
        direction.z * arrival.strength,
        now,
      );
    }
  });

  return (
    <mesh ref={meshRef} geometry={geometry}>
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
      />
    </mesh>
  );
}
