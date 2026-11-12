import { resolveInitialLang } from '@/i18n/lang';
import { isLang } from '@/i18n/types';
import type { Route } from '@/seo/head';

/**
 * Maps a pathname to a route. Only `/en` and `/vi` are real pages; everything
 * else is the 404 page, shown in the reader's saved or browser language.
 */
export function resolveRoute(input: {
  pathname: string;
  stored: string | null;
  browserLanguages: readonly string[];
}): Route {
  const segments = input.pathname.split('/').filter(Boolean);
  const [first] = segments;
  if (segments.length === 1 && isLang(first)) return { kind: 'page', lang: first };
  return {
    kind: 'notFound',
    lang: resolveInitialLang({ stored: input.stored, browserLanguages: input.browserLanguages }),
  };
}
