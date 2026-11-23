import { Canvas, useFrame, type RootState } from '@react-three/fiber';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FluidSphere } from './FluidSphere';
import { OrderNetwork } from './OrderNetwork';
import { createFpsMeter, type FpsMeter } from '@/lib/fps';

interface Scene3DProps {
  /** Render loop runs only while true (hero on screen and tab visible). */
  active: boolean;
  onReady: (ready: boolean) => void;
  onFail: () => void;
}

const MAX_DPR = 1.5;

interface FpsGuardProps {
  onDegrade: () => void;
  onFail: () => void;
}

/**
 * Watches the frame rate for the first few seconds. Too slow → lower the pixel
 * ratio once; still too slow → give up and let the static backdrop take over.
 */
function FpsGuard({ onDegrade, onFail }: FpsGuardProps) {
  const meter = useRef<FpsMeter | null>(null);

  useFrame((_, delta) => {
    meter.current ??= createFpsMeter();
    const verdict = meter.current.sample(delta);
    if (verdict === 'degrade') onDegrade();
    else if (verdict === 'fail') onFail();
  });

  return null;
}

/** Lazy-loaded WebGL scene. Default export so React.lazy can split it (with three.js) into its own chunk. */
export default function Scene3D({ active, onReady, onFail }: Scene3DProps) {
  const [maxDpr, setMaxDpr] = useState(MAX_DPR);

  useEffect(() => () => onReady(false), [onReady]);

  const onCreated = useCallback(
    ({ gl }: RootState) => {
      gl.domElement.addEventListener(
        'webglcontextlost',
        (event) => {
          event.preventDefault();
          onFail();
        },
        { once: true },
      );
      onReady(true);
    },
    [onFail, onReady],
  );

  return (
    <Canvas
      flat
      dpr={[1, maxDpr]}
      frameloop={active ? 'always' : 'never'}
      camera={{ position: [0, 0, 4.6], fov: 38 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'low-power', failIfMajorPerformanceCaveat: true }}
      resize={{ scroll: false, debounce: { scroll: 0, resize: 100 } }}
      onCreated={onCreated}
    >
      {/* The liquid core, with the network of nodes and travelling orders around it. */}
      <group scale={0.72}>
        <FluidSphere />
      </group>
      <OrderNetwork />
      <FpsGuard onDegrade={() => setMaxDpr(1)} onFail={onFail} />
    </Canvas>
  );
}
