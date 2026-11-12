import { useEffect, useRef } from 'react';
import { SECTIONS } from './sections';
import { useLang } from '@/i18n/useLang';
import { cn } from '@/lib/cn';

interface MobileMenuProps {
  id: string;
  open: boolean;
  activeId: string | null;
  /** `restoreFocus` is true when closed with Esc, so focus returns to the menu button. */
  onClose: (restoreFocus: boolean) => void;
}

export function MobileMenu({ id, open, activeId, onClose }: MobileMenuProps) {
  const { t } = useLang();
  const firstLink = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (!open) return;
    firstLink.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose(true);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <div id={id} hidden={!open} className="border-t border-line bg-bg md:hidden">
      <ul className="container-x flex flex-col gap-1 py-3">
        {SECTIONS.map((s, i) => (
          <li key={s.id}>
            <a
              ref={i === 0 ? firstLink : undefined}
              href={`#${s.id}`}
              onClick={() => onClose(false)}
              aria-current={activeId === s.id ? 'location' : undefined}
              className={cn(
                'block rounded-xl px-4 py-3 text-base font-medium transition-colors',
                activeId === s.id
                  ? 'bg-surface-2 text-link forced-colors:underline forced-colors:decoration-2'
                  : 'text-fg hover:bg-surface-2',
              )}
            >
              {t(s.key)}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
