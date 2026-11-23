import type { Lang } from '@/i18n/types';

/** Writes the decimal mark the way the language does: "1.6k" is "1,6k" in Vietnamese. */
export function localNumber(text: string, lang: Lang): string {
  return lang === 'vi' ? text.replace(/(\d)\.(\d)/g, '$1,$2') : text;
}
