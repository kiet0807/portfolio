import { useCallback, useEffect, useState } from 'react';

function isTyping(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
  );
}

/**
 * Open state of the command menu, plus its global shortcuts:
 * Cmd/Ctrl + K toggles it, "/" opens it (unless the visitor is typing somewhere).
 */
export function useCommandMenu() {
  const [open, setOpen] = useState(false);
  const show = useCallback(() => setOpen(true), []);
  const hide = useCallback(() => setOpen(false), []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const combo =
        (event.metaKey || event.ctrlKey) &&
        !event.altKey &&
        !event.shiftKey &&
        event.key.toLowerCase() === 'k';
      const slash =
        event.key === '/' && !event.metaKey && !event.ctrlKey && !event.altKey && !isTyping(event.target);
      if (!combo && !slash) return;
      event.preventDefault();
      setOpen((value) => (combo ? !value : true));
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  return { open, show, hide } as const;
}
