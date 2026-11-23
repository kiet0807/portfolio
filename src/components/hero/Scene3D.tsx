import { Canvas, useFrame, useThree, type RootState } from '@react-three/fiber';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import type { Group } from 'three';
import { FluidSphere } from './FluidSphere';
import { OrderNetwork } from './OrderNetwork';
import { createSceneBus, type SceneBus } from './sceneBus';
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

/** Radians of turn per CSS pixel dragged. */
const DRAG_TURN = 0.008;
/** Share of the spin kept after one 60 fps frame once the pointer lets go. */
const SPIN_KEEP = 0.94;
/** A press that moves less than this (CSS pixels) and is let go within this time is a click. */
const CLICK_SLOP_PX = 5;
const CLICK_MS = 450;

/**
 * Drag across the scene to spin it (the sphere and the network together); let go and it
 * keeps turning for a moment, then settles. A click sends a burst of orders out of the
 * core. Pointer aids on a decorative picture: the page reads the same without them.
 * Vertical swipes still scroll the page on touch screens.
 */
function DragSpin({ bus, children }: { bus: SceneBus; children: ReactNode }) {
  const groupRef = useRef<Group>(null);
  const canvas = useThree((state) => state.gl.domElement);
  const drag = useRef({
    pointer: null as number | null,
    lastX: 0,
    downX: 0,
    downY: 0,
    downAt: 0,
    yaw: 0,
    speed: 0,
  });

  useEffect(() => {
    const state = drag.current;
    const onDown = (event: PointerEvent) => {
      if (event.button !== 0 || state.pointer !== null) return;
      state.pointer = event.pointerId;
      state.lastX = event.clientX;
      state.downX = event.clientX;
      state.downY = event.clientY;
      state.downAt = event.timeStamp;
      state.speed = 0;
      canvas.setPointerCapture(event.pointerId);
    };
    const onMove = (event: PointerEvent) => {
      if (event.pointerId !== state.pointer) return;
      const turn = (event.clientX - state.lastX) * DRAG_TURN;
      state.lastX = event.clientX;
      state.yaw += turn;
      state.speed = turn;
    };
    const onUp = (event: PointerEvent) => {
      if (event.pointerId !== state.pointer) return;
      state.pointer = null;
      const still =
        Math.hypot(event.clientX - state.downX, event.clientY - state.downY) < CLICK_SLOP_PX &&
        event.timeStamp - state.downAt < CLICK_MS;
      if (event.type === 'pointerup' && still) bus.requestBurst();
    };
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', onUp);
    return () => {
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onUp);
    };
  }, [bus, canvas]);

  useFrame((_, delta) => {
    const group = groupRef.current;
    if (!group) return;
    const state = drag.current;
    if (state.pointer === null && state.speed !== 0) {
      const frames = Math.min(delta, 0.05) * 60;
      state.yaw += state.speed * frames;
      state.speed *= SPIN_KEEP ** frames;
      if (Math.abs(state.speed) < 1e-4) state.speed = 0;
    }
    group.rotation.y = state.yaw;
  });

  return <group ref={groupRef}>{children}</group>;
}

/** Lazy-loaded WebGL scene. Default export so React.lazy can split it (with three.js) into its own chunk. */
export default function Scene3D({ active, onReady, onFail }: Scene3DProps) {
  const [maxDpr, setMaxDpr] = useState(MAX_DPR);
  const [bus] = useState(createSceneBus);

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
      // The grab cursor and vertical-only touch panning belong to DragSpin.
      className="cursor-grab touch-pan-y active:cursor-grabbing"
      flat
      dpr={[1, maxDpr]}
      frameloop={active ? 'always' : 'never'}
      camera={{ position: [0, 0, 4.6], fov: 38 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'low-power', failIfMajorPerformanceCaveat: true }}
      resize={{ scroll: false, debounce: { scroll: 0, resize: 100 } }}
      onCreated={onCreated}
    >
      {/* The liquid core, with the network of nodes and travelling orders around it. */}
      <DragSpin bus={bus}>
        <group scale={0.72}>
          <FluidSphere bus={bus} />
        </group>
        <OrderNetwork bus={bus} />
      </DragSpin>
      <FpsGuard onDegrade={() => setMaxDpr(1)} onFail={onFail} />
    </Canvas>
  );
}
