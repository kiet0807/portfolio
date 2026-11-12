import { Canvas, useFrame, type RootState } from '@react-three/fiber';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FluidSphere } from './FluidSphere';
import { OrderNetwork } from './OrderNetwork';

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
  const state = useRef({ warmup: 0, frames: 0, time: 0, stage: 0, done: false });

  useFrame((_, delta) => {
    const s = state.current;
    if (s.done) return;
    if (delta > 0.25) {
      // Loop was paused (off-screen / hidden tab): restart the measurement.
      s.warmup = 0;
      s.frames = 0;
      s.time = 0;
      return;
    }
    if (s.warmup < 1) {
      s.warmup += delta;
      return;
    }
    s.frames += 1;
    s.time += delta;
    if (s.time < 2) return;

    const fps = s.frames / s.time;
    s.warmup = 0;
    s.frames = 0;
    s.time = 0;
    if (fps >= 30) {
      s.done = true;
    } else if (s.stage === 0) {
      s.stage = 1;
      onDegrade();
    } else {
      s.done = true;
      onFail();
    }
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
