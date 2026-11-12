type ClassValue = string | false | null | undefined;

/** Tiny class-name joiner; avoids pulling in clsx for a handful of call sites. */
export function cn(...values: ClassValue[]): string {
  return values.filter(Boolean).join(' ');
}
