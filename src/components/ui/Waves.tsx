import { cn } from '@/lib/cn';

/*
 * One wave period is 1440 units and the path repeats it twice, so translating the
 * SVG by -50% loops seamlessly. Only `transform` animates (compositor-only).
 */
const WAVE_BACK =
  'M0,64 C180,24 540,24 720,64 C900,104 1260,104 1440,64 C1620,24 1980,24 2160,64 C2340,104 2700,104 2880,64 L2880,140 L0,140 Z';
const WAVE_FRONT =
  'M0,84 C240,124 480,44 720,84 C960,124 1200,44 1440,84 C1680,124 1920,44 2160,84 C2400,124 2640,44 2880,84 L2880,140 L0,140 Z';

interface WavesProps {
  className?: string;
}

/** Decorative animated water surface, anchored to the bottom of its positioned parent. */
export function Waves({ className }: WavesProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'pointer-events-none absolute inset-x-0 bottom-0 h-20 overflow-hidden sm:h-28 print:hidden',
        className,
      )}
    >
      <svg
        className="absolute bottom-0 left-0 h-full w-[200%] animate-wave-slow"
        viewBox="0 0 2880 140"
        preserveAspectRatio="none"
      >
        <path d={WAVE_BACK} className="fill-accent/15" />
      </svg>
      <svg
        className="absolute bottom-0 left-0 h-full w-[200%] animate-wave"
        viewBox="0 0 2880 140"
        preserveAspectRatio="none"
      >
        <path d={WAVE_FRONT} className="fill-bg" />
      </svg>
    </div>
  );
}
