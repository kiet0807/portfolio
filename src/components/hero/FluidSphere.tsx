import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { Color, Vector2, type IUniform, type Mesh, type ShaderMaterial } from 'three';
import { fragmentShader, vertexShader } from './shaders';

// A type alias (not an interface) so it is assignable to three's `{ [name: string]: IUniform }`.
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type SphereUniforms = {
  uTime: IUniform<number>;
  uPointer: IUniform<Vector2>;
  uDeep: IUniform<Color>;
  uMid: IUniform<Color>;
  uLight: IUniform<Color>;
  uAccent: IUniform<Color>;
};

function createUniforms(): SphereUniforms {
  return {
    uTime: { value: 0 },
    uPointer: { value: new Vector2(0, 0) },
    // Water palette: navy → primary blue → cyan.
    uDeep: { value: new Color('#0b1f3a') },
    uMid: { value: new Color('#2563eb') },
    uLight: { value: new Color('#22d3ee') },
    // The site's AI violet, for the thin-film sheen at the rim.
    uAccent: { value: new Color('#a78bfa') },
  };
}

/** Liquid-looking sphere: noise-displaced, slowly turning, leaning toward the pointer. */
export function FluidSphere() {
  const meshRef = useRef<Mesh>(null);
  const materialRef = useRef<ShaderMaterial>(null);
  const target = useRef({ x: 0, y: 0 });
  const eased = useRef({ x: 0, y: 0 });

  const uniforms = useMemo(() => createUniforms(), []);

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

    live.uTime.value += dt;
    live.uPointer.value.set(eased.current.x, eased.current.y);
    mesh.rotation.x = -eased.current.y * 0.22;
    mesh.rotation.y = eased.current.x * 0.3;
  });

  return (
    <mesh ref={meshRef}>
      <icosahedronGeometry args={[1, 32]} />
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
      />
    </mesh>
  );
}
