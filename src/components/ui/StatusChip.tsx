import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/** A softly pulsing "live" dot. Decorative: the text next to it carries the meaning. */
export function LiveDot({ className }: { className?: string }) {
  return (
    <span aria-hidden="true" className={cn('relative flex size-2 shrink-0', className)}>
      <span className="absolute inset-0 animate-ping-soft rounded-full bg-accent" />
      <span className="relative size-2 rounded-full bg-link" />
    </span>
  );
}

/** Pill with a softly pulsing "live" dot, used for the availability status. */
export function StatusChip({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p
      className={cn(
        'inline-flex items-center gap-2.5 rounded-full border border-link/40 bg-surface px-3.5 py-1.5 text-sm font-medium text-fg',
        className,
      )}
    >
      <LiveDot />
      {children}
    </p>
  );
}
