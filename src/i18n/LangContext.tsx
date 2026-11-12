import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { t as translate } from './dictionary';
import { langFromPathname, persistLang } from './lang';
import type { Lang } from './types';
import { LangContext, type LangContextValue } from './useLang';
import { applyDocumentHead, pathFor, type Route } from '@/seo/head';

interface LangProviderProps {
  /** The page being shown, in the language it was opened in. */
  route: Route;
  children: ReactNode;
}

/**
 * The home page switches language in place (and pushes /en or /vi onto the history).
 * An article loads its text for one language only, so switching there opens the other
 * language's page. The 404 page has no per-language URL: it switches in place and leaves
 * the history alone.
 */
export function LangProvider({ route, children }: LangProviderProps) {
  const [lang, setLangState] = useState<Lang>(route.lang);

  const setLang = useCallback(
    (next: Lang) => {
      if (next === lang) return;
      persistLang(next);
      if (route.kind === 'article') {
        window.location.assign(pathFor(route, next));
        return;
      }
      if (route.kind === 'page') {
        const { search, hash } = window.location;
        window.history.pushState({ lang: next }, '', pathFor(route, next) + search + hash);
      }
      setLangState(next);
    },
    [lang, route],
  );

  // Keep <html lang>, <title>, description and canonical in sync after an in-place switch.
  useEffect(() => {
    applyDocumentHead({ ...route, lang });
  }, [lang, route]);

  // Browser back/forward between /en and /vi.
  useEffect(() => {
    if (route.kind !== 'page') return;
    const onPop = () => {
      const fromPath = langFromPathname(window.location.pathname);
      if (fromPath) setLangState(fromPath);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [route.kind]);

  const value = useMemo<LangContextValue>(
    () => ({ lang, setLang, t: (key) => translate(lang, key) }),
    [lang, setLang],
  );

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}
