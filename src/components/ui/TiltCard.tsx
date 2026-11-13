import { m, useMotionValue, useReducedMotion, useSpring, useTransform } from 'motion/react';
import type { PointerEvent, ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface TiltCardProps {
  children: ReactNode;
  className?: string;
  /** 'ai': a violet border and glow instead of the cyan one, for work about AI. */
  accent?: 'ai';
}

const spring = { stiffness: 180, damping: 20 };

/** Card with a subtle pointer-following tilt and a cyan glow. Static with reduced motion or touch. */
export function TiltCard({ children, className, accent }: TiltCardProps) {
  const reduce = useReducedMotion();
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const rotateX = useSpring(useTransform(py, [0, 1], [4, -4]), spring);
  const rotateY = useSpring(useTransform(px, [0, 1], [-4, 4]), spring);

  const onMove = (e: PointerEvent<HTMLElement>) => {
    if (reduce === true || e.pointerType !== 'mouse') return;
    const r = e.currentTarget.getBoundingClientRect();
    px.set((e.clientX - r.left) / r.width);
    py.set((e.clientY - r.top) / r.height);
  };
  const onLeave = () => {
    px.set(0.5);
    py.set(0.5);
  };

  return (
    <m.article
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      data-spotlight=""
      style={{ rotateX, rotateY, transformPerspective: 900 }}
      className={cn(
        'relative h-full card',
        accent === 'ai'
          ? 'border-ai/40 shadow-glow-ai hover:border-ai/70'
          : 'hover:border-accent/50 hover:shadow-glow',
        className,
      )}
    >
      {children}
    </m.article>
  );
}
