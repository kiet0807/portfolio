import { SECTIONS, TOP_ID } from './sections';
import { profile } from '@/data/profile';
import { useLang } from '@/i18n/useLang';
import { cn } from '@/lib/cn';

const pad = (n: number) => String(n).padStart(2, '0');

interface SectionRailProps {
  activeId: string | null;
}

/**
 * Vertical index of the page on the right edge of wide screens: 00 for the top, then one
 * tick per section, with the one being read lit up. It appears once the hero is left.
 *
 * Like the status bar it only repeats the header navigation, so it is hidden from
 * assistive technology and its links are kept out of the tab order.
 */
export function SectionRail({ activeId }: SectionRailProps) {
  const { t } = useLang();
  const entries = [
    { id: TOP_ID, label: profile.givenName },
    ...SECTIONS.map((s) => ({ id: s.id, label: t(s.key) })),
  ];
  return (
    <div
      aria-hidden="true"
      data-section-rail=""
      className={cn(
        'fixed top-1/2 right-4 z-30 hidden -translate-y-1/2 transition-opacity duration-500 xl:block print:hidden',
        activeId === null ? 'pointer-events-none opacity-0' : 'opacity-100',
      )}
    >
      <ol className="flex flex-col items-end font-mono text-[0.6875rem] tracking-[0.08em] uppercase">
        {entries.map((entry, i) => {
          const active = entry.id === activeId;
          return (
            <li key={entry.id}>
              <a
                href={`#${entry.id}`}
                tabIndex={-1}
                data-active={active ? '' : undefined}
                className={cn(
                  'group flex h-7 items-center justify-end gap-2 transition-colors duration-300',
                  active ? 'text-link' : 'text-muted hover:text-fg',
                )}
              >
                <span className="rounded-full border border-line bg-surface px-2 py-0.5 whitespace-nowrap text-fg opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                  {entry.label}
                </span>
                <span className="tabular-nums">{pad(i)}</span>
                <span
                  className={cn(
                    'h-px transition-[width,background-color] duration-500 ease-water',
                    active ? 'w-6 bg-link shadow-[0_0_8px_var(--link)]' : 'w-3 bg-muted/50 group-hover:bg-fg',
                  )}
                />
              </a>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
