import { findArticle, WRITING_SEGMENT } from '@/content/articles';
import { resolveInitialLang } from '@/i18n/lang';
import { isLang } from '@/i18n/types';
import type { Route } from '@/seo/head';

/**
 * Maps a pathname to a route. The real pages are `/en`, `/vi` and one page per article,
 * `/<lang>/writing/<slug>`; everything else is the 404 page, in the language at the start of
 * the path (`/en/…` is English), or else in the reader's saved or browser language.
 */
export function resolveRoute(input: {
  pathname: string;
  stored: string | null;
  browserLanguages: readonly string[];
}): Route {
  const segments = input.pathname.split('/').filter(Boolean);
  const [first, second, third] = segments;
  if (isLang(first)) {
    if (segments.length === 1) return { kind: 'page', lang: first };
    if (segments.length === 3 && second === WRITING_SEGMENT && findArticle(third) && third) {
      return { kind: 'article', lang: first, slug: third };
    }
  }
  return {
    kind: 'notFound',
    lang: resolveInitialLang(input),
  };
}
