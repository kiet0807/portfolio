import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { SceneErrorBoundary } from './SceneErrorBoundary';
import { useInViewport } from '@/hooks/useInViewport';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { usePageVisible } from '@/hooks/usePageVisible';
import { profile } from '@/data/profile';
import { cn } from '@/lib/cn';
import { isLowEndDevice, readDeviceSignals } from '@/lib/device';
import { useMotionPaused } from '@/lib/motion';

// three.js + react-three-fiber live in this chunk only; it is never part of the initial bundle.
const Scene3D = lazy(() => import('./Scene3D'));

/** Runs `task` once the page has loaded and the browser is idle. Returns a cancel function. */
function whenLoadedAndIdle(task: () => void): () => void {
  let cancelled = false;
  const run = () => {
    if (!cancelled) task();
  };
  const schedule = () => {
    if ('requestIdleCallback' in window) window.requestIdleCallback(run, { timeout: 2500 });
    else setTimeout(run, 400);
  };
  if (document.readyState === 'complete') schedule();
  else window.addEventListener('load', schedule, { once: true });
  return () => {
    cancelled = true;
    window.removeEventListener('load', schedule);
  };
}

const BRACKETS = [
  'top-0 left-0 border-t border-l',
  'top-0 right-0 border-t border-r',
  'bottom-0 left-0 border-b border-l',
  'right-0 bottom-0 border-r border-b',
] as const;

/**
 * Orbits of the static visual: one order circling the drop on each. The wrapper is
 * squashed into an ellipse and the dot is squashed back, so only transforms animate
 * and the dot stays round.
 */
const ORBITS = [
  {
    tilt: 'rotate-[16deg]',
    spin: 'animate-[turn_15s_linear_infinite]',
    back: 'animate-[turn_15s_linear_infinite_reverse]',
  },
  {
    tilt: '-rotate-[34deg]',
    spin: 'animate-[turn_21s_linear_infinite]',
    back: 'animate-[turn_21s_linear_infinite_reverse]',
  },
  {
    tilt: 'rotate-[72deg]',
    spin: 'animate-[turn_27s_linear_infinite_reverse]',
    back: 'animate-[turn_27s_linear_infinite]',
  },
] as const;

const signed = (value: number) => `${value < 0 ? '-' : '+'}${Math.abs(value).toFixed(2)}`;

interface HudProps {
  /** What is actually on screen right now: the WebGL sphere or the CSS drop. */
  webgl: boolean;
  /** The readouts only listen to the pointer while the hero is visible. */
  live: boolean;
}

/**
 * Instrument-panel decoration around the drop: one slowly turning ring, corner brackets
 * and a few readouts. The order network already fills the space around the sphere, so
 * this stays sparse. Pure SVG/CSS, transform-only animation. The readouts are real: the
 * render mode shows what is on screen, and X / Y are the pointer vector the sphere leans toward.
 */
function Hud({ webgl, live }: HudProps) {
  const xRef = useRef<HTMLSpanElement>(null);
  const yRef = useRef<HTMLSpanElement>(null);

  // Rewrites two text nodes at most once per frame; nothing re-renders.
  useEffect(() => {
    if (!live || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    let frame = 0;
    let x = 0;
    let y = 0;
    const write = () => {
      frame = 0;
      const xNode = xRef.current?.firstChild;
      const yNode = yRef.current?.firstChild;
      if (xNode) xNode.nodeValue = signed(x);
      if (yNode) yNode.nodeValue = signed(y);
    };
    const onMove = (event: PointerEvent) => {
      x = (event.clientX / window.innerWidth) * 2 - 1;
      y = -((event.clientY / window.innerHeight) * 2 - 1);
      if (frame === 0) frame = requestAnimationFrame(write);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      cancelAnimationFrame(frame);
    };
  }, [live]);

  return (
    <div className="pointer-events-none absolute inset-0 forced-colors:hidden">
      <svg viewBox="0 0 200 200" className="absolute inset-0 size-full animate-turn-slow text-link">
        <circle
          cx="100"
          cy="100"
          r="97"
          fill="none"
          stroke="currentColor"
          strokeOpacity="0.45"
          strokeWidth="0.5"
          strokeDasharray="1 5"
        />
        <path
          d="M100 0v7M200 100h-7M100 200v-7M0 100h7"
          stroke="currentColor"
          strokeOpacity="0.8"
          strokeWidth="0.7"
        />
      </svg>
      {BRACKETS.map((position) => (
        <span key={position} className={cn('absolute size-4 border-link/70 sm:size-5', position)} />
      ))}
      {/* Readouts on the frame: where this is, and what the scene is doing. */}
      <p className="absolute top-0 left-1/2 hidden -translate-x-1/2 -translate-y-1/2 px-2 font-mono text-[0.6875rem] tracking-wider whitespace-nowrap text-muted lg:block">
        {profile.coordinates}
      </p>
      <p className="absolute bottom-0 left-1/2 hidden -translate-x-1/2 translate-y-1/2 items-center gap-3 px-2 font-mono text-[0.6875rem] tracking-wider whitespace-nowrap text-muted tabular-nums sm:flex">
        <span>
          X <span ref={xRef}>+0.00</span>
        </span>
        <span>
          Y <span ref={yRef}>+0.00</span>
        </span>
        <span className="flex items-center gap-1.5 text-link">
          <span className="size-1.5 rounded-full bg-link" />
          <span data-render-mode="">{webgl ? 'WEBGL' : 'CSS'}</span>
        </span>
      </p>
      {/* What the picture shows: orders moving between sales channels and warehouses. */}
      <p className="absolute top-1/2 left-0 hidden origin-center -translate-x-1/2 -translate-y-1/2 -rotate-90 px-2 font-mono text-[0.6875rem] tracking-[0.2em] whitespace-nowrap text-muted lg:block">
        ORDER FLOW
      </p>
    </div>
  );
}

/**
 * Right-hand hero visual. A CSS "water drop" is always rendered (it is the static
 * fallback and the loading placeholder). On capable devices the WebGL sphere is
 * loaded afterwards and cross-fades over it.
 */
export function HeroVisual() {
  const ref = useRef<HTMLDivElement>(null);
  const [capable, setCapable] = useState(false);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);

  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  // Paused motion keeps the static backdrop (its loops stopped by CSS): a live scene cannot be held still.
  const paused = useMotionPaused();
  const wide = useMediaQuery('(min-width: 768px)');
  const inView = useInViewport(ref);
  const pageVisible = usePageVisible();

  useEffect(
    () =>
      whenLoadedAndIdle(() => {
        if (!isLowEndDevice(readDeviceSignals())) setCapable(true);
      }),
    [],
  );

  const onFail = useCallback(() => setFailed(true), []);

  const show3D = capable && !failed && !reducedMotion && !paused && wide;
  const sceneVisible = show3D && ready;

  return (
    <div
      ref={ref}
      aria-hidden="true"
      data-hero-visual={sceneVisible ? '3d' : 'static'}
      className="relative mx-auto aspect-square w-full max-w-[15rem] sm:max-w-xs lg:max-w-md xl:max-w-lg print:hidden"
    >
      {/* Soft glow behind the drop */}
      <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgb(34_211_238/0.28)_0%,rgb(37_99_235/0.16)_45%,transparent_70%)]" />

      {/*
        Static water drop: the fallback, and the placeholder while the 3D chunk loads.
        Two lopsided shapes turn slowly in opposite directions, so the outline keeps
        changing like a liquid; the lighting layer on top stays still. Only `transform`
        animates, which keeps it cheap on phones (where this is what people see).
      */}
      <div
        className={cn(
          'absolute inset-[16%] animate-float transition-opacity duration-700',
          sceneVisible ? 'opacity-0' : 'opacity-100',
        )}
      >
        <div
          className="absolute inset-0 animate-turn"
          style={{
            borderRadius: '58% 42% 55% 45% / 48% 56% 44% 52%',
            background: 'radial-gradient(circle, #2563eb 0%, #1d4ed8 55%, #0b1f3a 100%)',
            boxShadow: 'inset 0 0 44px rgb(10 15 26 / 0.5), 0 0 60px -12px rgb(34 211 238 / 0.55)',
          }}
        />
        <div
          className="absolute inset-[3%] animate-turn-back"
          style={{
            borderRadius: '44% 56% 41% 59% / 57% 43% 58% 42%',
            background:
              'radial-gradient(circle, rgb(34 211 238 / 0.5) 0%, rgb(37 99 235 / 0.55) 55%, rgb(11 31 58 / 0.55) 100%)',
          }}
        />
        <div
          className="absolute inset-[7%] rounded-full"
          style={{
            background:
              'radial-gradient(circle at 30% 24%, rgb(207 250 254 / 0.95) 0%, rgb(34 211 238 / 0.5) 14%, rgb(34 211 238 / 0) 42%), radial-gradient(circle at 74% 80%, rgb(10 15 26 / 0.4) 0%, rgb(10 15 26 / 0) 46%)',
          }}
        />
      </div>

      {/* Static counterpart of the 3D order network: three orders in orbit around the drop. */}
      <div
        data-orbits=""
        className={cn(
          'absolute inset-[5%] transition-opacity duration-700 forced-colors:hidden',
          sceneVisible ? 'opacity-0' : 'opacity-100',
        )}
      >
        {ORBITS.map((orbit) => (
          <div key={orbit.tilt} className={cn('absolute inset-0', orbit.tilt)}>
            <div className="absolute inset-0 scale-y-[0.36] rounded-full border border-link/25">
              <div className={cn('absolute inset-0', orbit.spin)}>
                <div className={cn('absolute top-1/2 left-full -mt-1 -ml-1 size-2', orbit.back)}>
                  <div className="size-full scale-y-[2.78] rounded-full bg-link shadow-[0_0_10px_var(--link)]" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {show3D ? (
        <SceneErrorBoundary onError={onFail}>
          <Suspense fallback={null}>
            <div
              className={cn(
                'absolute inset-0 transition-opacity duration-700',
                sceneVisible ? 'opacity-100' : 'opacity-0',
              )}
            >
              <Scene3D active={inView && pageVisible} onReady={setReady} onFail={onFail} />
            </div>
          </Suspense>
        </SceneErrorBoundary>
      ) : null}

      {/* On top of the drop, so the labels are never covered by the canvas. */}
      <Hud webgl={sceneVisible} live={inView && pageVisible} />
    </div>
  );
}
