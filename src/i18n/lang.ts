import { DEFAULT_LANG, isLang, type Lang } from './types';
import { safeStorage, STORAGE_KEYS } from '@/lib/storage';

/** Order of precedence: URL → saved preference → browser languages → default. */
export function resolveInitialLang(input: {
  pathname?: string;
  stored?: string | null;
  browserLanguages?: readonly string[];
}): Lang {
  const fromPath = langFromPathname(input.pathname ?? '');
  if (fromPath) return fromPath;
  if (isLang(input.stored)) return input.stored;
  for (const tag of input.browserLanguages ?? []) {
    const base = tag.toLowerCase().split('-')[0];
    if (isLang(base)) return base;
  }
  return DEFAULT_LANG;
}

export function langFromPathname(pathname: string): Lang | null {
  const first = pathname.split('/').find((segment) => segment !== '');
  return isLang(first) ? first : null;
}

export function pathForLang(lang: Lang): string {
  return `/${lang}`;
}

export function readStoredLang(): string | null {
  return safeStorage.get(STORAGE_KEYS.lang);
}

export function persistLang(lang: Lang): void {
  safeStorage.set(STORAGE_KEYS.lang, lang);
}
