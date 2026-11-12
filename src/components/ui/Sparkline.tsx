import { cn } from '@/lib/cn';

interface SparklineProps {
  /** Oldest value first. */
  values: readonly number[];
  className?: string;
}

const W = 100;
const H = 32;
const PAD = 3;

/** Tiny line chart with a marker on the latest value. Decorative. */
export function Sparkline({ values, className }: SparklineProps) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const span = Math.max(...values) - min || 1;
  const points = values.map((value, i): [number, number] => [
    (i / (values.length - 1)) * W,
    H - PAD - ((value - min) / span) * (H - PAD * 2),
  ]);
  const line = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  const lastY = points.at(-1)?.[1] ?? H / 2;
  return (
    <span aria-hidden="true" className={cn('relative block text-link', className)}>
      {/* Stretched to the box; non-scaling strokes keep the line 1.5px thick. */}
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="block size-full overflow-visible">
        <path d={`${line} L${W} ${H} L0 ${H} Z`} fill="currentColor" fillOpacity="0.1" />
        <path
          d={line}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <span
        className="absolute right-0 size-1.5 translate-x-1/2 -translate-y-1/2 rounded-full bg-link shadow-[0_0_0_3px_rgb(34_211_238/0.2)]"
        style={{ top: `${((lastY / H) * 100).toFixed(1)}%` }}
      />
    </span>
  );
}
