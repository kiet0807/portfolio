import { SECTION_IDS, SECTIONS } from './sections';
import { LocalTime } from '@/components/ui/LocalTime';
import { LiveDot } from '@/components/ui/StatusChip';
import { profile } from '@/data/profile';
import { useShortcutLabel, useViewportSize } from '@/hooks/usePlatform';
import { useLang } from '@/i18n/useLang';

const pad = (n: number) => String(n).padStart(2, '0');

interface StatusBarProps {
  activeId: string | null;
  onOpenMenu: () => void;
}

/**
 * Instrument strip pinned to the bottom of the window: availability, the section
 * being read, scroll position, window size, local time and the command-menu shortcut.
 *
 * Everything here repeats information that is available elsewhere on the page, so
 * the whole bar is hidden from assistive technology and its one button is kept out
 * of the tab order (the header has the real, focusable command-menu button).
 */
export function StatusBar({ activeId, onOpenMenu }: StatusBarProps) {
  const { lang, t } = useLang();
  const shortcut = useShortcutLabel();
  const viewport = useViewportSize();
  const index = activeId === null ? -1 : SECTION_IDS.indexOf(activeId);
  const section = SECTIONS[index];
  return (
    <div
      aria-hidden="true"
      data-status-bar=""
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md print:hidden"
    >
      <div className="container-x flex h-7 items-center justify-between gap-4 font-mono text-[0.6875rem] tracking-[0.08em] whitespace-nowrap text-muted uppercase">
        <div className="flex min-w-0 items-center gap-4">
          {profile.availability.open ? (
            <span className="hidden items-center gap-2 text-fg md:flex">
              <LiveDot />
              {profile.availability.label[lang]}
            </span>
          ) : null}
          <span data-status-section="" className="truncate">
            <span className="text-link">
              {pad(index + 1)}/{pad(SECTIONS.length)}
            </span>{' '}
            {section ? t(section.key) : profile.name}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-4">
          <span className="scroll-pct tabular-nums" />
          {viewport ? <span className="hidden tabular-nums lg:inline">{viewport}</span> : null}
          <LocalTime className="hidden tabular-nums sm:inline" />
          <button
            type="button"
            tabIndex={-1}
            onClick={onOpenMenu}
            className="hidden h-7 items-center border-l border-line pl-4 text-fg uppercase transition-colors hover:text-link md:inline-flex"
          >
            {shortcut}
          </button>
        </div>
      </div>
    </div>
  );
}
