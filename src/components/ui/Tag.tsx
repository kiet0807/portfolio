import type { ReactNode } from 'react';

/** Pill used for skills and tech stacks; plain text on paper. Must be a child of a list. */
export function Tag({ children }: { children: ReactNode }) {
  return (
    <li className="inline-flex items-center rounded-full border border-line bg-surface-2 px-3 py-1 text-sm text-fg print:rounded-none print:border-0 print:bg-transparent print:p-0">
      {children}
    </li>
  );
}
