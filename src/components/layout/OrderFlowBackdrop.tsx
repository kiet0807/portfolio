import { useEffect, useRef, type CSSProperties } from 'react';
import {
  poseAt,
  stageAt,
  STAGE_IDS,
  STAGES,
  SWAY_DEGREES,
  SWAY_PERIOD,
  ZONE,
  type Pose,
  type StageId,
} from './orderFlow';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useMotionPaused } from '@/lib/motion';

/*
 * The hero's order network, carried down the page as a flat line drawing behind the sections
 * (arrangements and maths in orderFlow.ts). It follows the scroll: the scroll position becomes a
 * continuous stage number, and the drawing eases toward it every frame, so it moves in proportion to
 * the scroll, backward too, and comes to rest when the page does. Between two sections the hubs
 * regroup one after the other and the figure travels to its next place; while a section is read the
 * arrangement holds, swaying a little with the scroll. Leaving the hero, the drawing comes down from
 * above, where the sphere has just gone. Nothing re-renders: the frame loop writes styles directly.
 *
 * Wide screens only (from 1280px, where the margins have room for it). Decorative: hidden from
 * assistive tech, print and forced colours. With reduced motion or paused motion, each section shows
 * its arrangement as it is, and nothing moves between them.
 */

/** How quickly the drawing catches up with the scroll (per second; higher is tighter). */
const CATCH_UP = 7;
const SETTLED = 0.0005;

const transformOf = (pose: Pose) =>
  `translate(calc(${pose.x}vw - 50%), calc(${pose.y}vh - 50%)) rotate(${pose.turn}deg) scale(${pose.scale})`;

const HERO = poseAt([STAGES.top], 0);

export function OrderFlowBackdrop() {
  const wide = useMediaQuery('(min-width: 1280px)');
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const paused = useMotionPaused();
  const rootRef = useRef<HTMLDivElement>(null);
  const still = reducedMotion || paused;

  useEffect(() => {
    const root = rootRef.current;
    if (!wide || !root) return;
    const svg = root.querySelector('svg');
    const core = root.querySelector<SVGGElement>('[data-core]');
    const hubs = Array.from(root.querySelectorAll<SVGGElement>('[data-hub]'));
    const routeGroups = new Map(
      Array.from(root.querySelectorAll<SVGGElement>('[data-routes]'), (group) => [
        group.dataset.routes,
        group,
      ]),
    );

    // The arrangements whose section is on this page (Writing is optional).
    const present = STAGE_IDS.filter((id) => document.getElementById(id));
    const stages = present.map((id) => STAGES[id]);
    let boundaries: number[] = [];
    let zone = 1;
    let target = 0;
    let current = -1;
    let sway = 0;
    let frame = 0;
    let last = 0;

    const apply = (t: number) => {
      const pose = poseAt(stages, t, still ? 0 : sway);
      root.style.transform = transformOf(pose);
      root.style.setProperty('--stage-alpha', String(pose.alpha));
      root.dataset.orderFlow = present[Math.round(t)] ?? 'top';
      svg?.setAttribute('stroke-width', String(1.4 / pose.scale));
      if (core) {
        core.style.transform = `scale(${pose.core})`;
        core.style.opacity = String(Math.min(1, pose.core * 4));
      }
      hubs.forEach((hub, i) => {
        const [x, y] = pose.hubs.at(i) ?? [0, 0];
        hub.style.transform = `translate(${x}px, ${y}px)`;
      });
      for (const [id, group] of routeGroups) {
        const index = present.indexOf(id as StageId);
        group.style.opacity = String(index === -1 ? 0 : (pose.routes.at(index) ?? 0));
      }
    };

    const tick = (now: number) => {
      frame = 0;
      const dt = last ? Math.min((now - last) / 1000, 0.05) : 1 / 60;
      last = now;
      const swayTarget = SWAY_DEGREES * Math.sin(window.scrollY / SWAY_PERIOD);
      if (still || current < 0) {
        // First frame, or nothing should glide: land on the target at once.
        current = still ? Math.round(target) : target;
        sway = swayTarget;
      } else {
        const k = 1 - Math.exp(-CATCH_UP * dt);
        current += (target - current) * k;
        sway += (swayTarget - sway) * k;
      }
      apply(current);
      if (Math.abs(target - current) > SETTLED || Math.abs(swayTarget - sway) > 0.01) {
        frame = requestAnimationFrame(tick);
      } else {
        last = 0;
      }
    };
    const schedule = () => {
      target = stageAt(window.scrollY + window.innerHeight / 2, boundaries, zone);
      if (!frame) frame = requestAnimationFrame(tick);
    };
    // Section tops are measured when a section (or the window) changes size, never while scrolling.
    const measure = () => {
      boundaries = present
        .slice(1)
        .map((id) => (document.getElementById(id)?.getBoundingClientRect().top ?? 0) + window.scrollY);
      zone = ZONE * window.innerHeight;
      schedule();
    };

    const observer = new ResizeObserver(measure);
    for (const id of present) {
      const section = document.getElementById(id);
      if (section) observer.observe(section);
    }
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', measure);
    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', measure);
      cancelAnimationFrame(frame);
    };
  }, [wide, still]);

  if (!wide) return null;
  return (
    <div
      ref={rootRef}
      aria-hidden="true"
      data-order-flow="top"
      className="order-flow print:hidden forced-colors:hidden"
      style={{ transform: transformOf(HERO), '--stage-alpha': HERO.alpha } as CSSProperties}
    >
      <svg
        viewBox="-240 -240 480 480"
        className="size-full overflow-visible"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.4 / HERO.scale}
      >
        <defs>
          {/* A soft light in the core, an echo of the sphere. */}
          <radialGradient id="order-flow-glow">
            <stop offset="0" stopColor="currentColor" stopOpacity={0.4} />
            <stop offset="1" stopColor="currentColor" stopOpacity={0} />
          </radialGradient>
        </defs>
        {STAGE_IDS.map((id) => (
          <g key={id} data-routes={id} style={{ opacity: id === 'top' ? 1 : 0 }}>
            {STAGES[id].guides.map((d) => (
              <path key={d} d={d} strokeDasharray="2 7" opacity={0.7} />
            ))}
            {STAGES[id].routes.map((d) => (
              <path key={d} d={d} />
            ))}
          </g>
        ))}
        <g data-core="">
          <circle r={110} fill="url(#order-flow-glow)" stroke="none" />
          <circle r={58} fill="currentColor" fillOpacity={0.1} />
          <circle r={44} opacity={0.6} />
          <circle r={74} strokeDasharray="2 7" opacity={0.7} />
          <circle r={3} fill="currentColor" stroke="none" />
        </g>
        {HERO.hubs.map(([x, y], i) => (
          // The hubs keep their identity across arrangements, so each one travels to its new place.
          <g key={i} data-hub="" style={{ transform: `translate(${x}px, ${y}px)` }}>
            {i < 6 ? (
              <>
                <circle r={7} />
                <circle r={2.2} fill="currentColor" stroke="none" />
              </>
            ) : (
              <path d="M 0 -8 L 8 0 L 0 8 L -8 0 Z" fill="currentColor" fillOpacity={0.25} />
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}
