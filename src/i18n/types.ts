export const LANGS = ['en', 'vi'] as const;
export type Lang = (typeof LANGS)[number];
export const DEFAULT_LANG: Lang = 'en';

/** Every user-facing text field in profile data has both languages. */
export type Localized<T = string> = Readonly<Record<Lang, T>>;

export function isLang(value: unknown): value is Lang {
  return typeof value === 'string' && (LANGS as readonly string[]).includes(value);
}
