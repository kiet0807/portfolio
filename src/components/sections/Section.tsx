import type { ReactNode } from 'react';
import { SECTION_IDS } from '@/components/layout/sections';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { cn } from '@/lib/cn';

interface SectionProps {
  id: string;
  kicker: string;
  title: string;
  /** Alternate background band. */
  tinted?: boolean;
  /** Extra classes for the <section>, e.g. `print:hidden`. */
  className?: string;
  children: ReactNode;
}

/** Shared section shell: landmark, numbered heading, blueprint backdrop and vertical rhythm. */
export function Section({ id, kicker, title, tinted = false, className, children }: SectionProps) {
  const headingId = `${id}-title`;
  return (
    <section
      id={id}
      aria-labelledby={headingId}
      className={cn(
        'relative isolate overflow-hidden py-20 sm:py-28 print:py-3',
        tinted && 'bg-tint',
        className,
      )}
    >
      <div
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute inset-0 -z-10 print:hidden forced-colors:hidden',
          tinted ? 'tech-dots fade-tl' : 'tech-grid fade-tr',
        )}
      />
      <div
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute -top-56 -z-10 section-glow print:hidden forced-colors:hidden',
          tinted ? '-left-64' : '-right-64',
        )}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-link/40 to-transparent print:hidden"
      />
      <div className="container-x">
        <SectionHeading id={headingId} kicker={kicker} title={title} index={SECTION_IDS.indexOf(id) + 1} />
        {children}
      </div>
    </section>
  );
}
