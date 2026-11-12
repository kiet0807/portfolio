import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { t as translate } from './dictionary';
import { langFromPathname, pathForLang, persistLang } from './lang';
import type { Lang } from './types';
import { LangContext, type LangContextValue } from './useLang';
import { applyDocumentHead } from '@/seo/head';

interface LangProviderProps {
  initialLang: Lang;
  /** The 404 page has no per-language URL, so switching there does not touch history. */
  notFound?: boolean;
  children: ReactNode;
}

export function LangProvider({ initialLang, notFound = false, children }: LangProviderProps) {
  const [lang, setLangState] = useState<Lang>(initialLang);

  const setLang = useCallback(
    (next: Lang) => {
      if (next === lang) return;
      persistLang(next);
      if (!notFound) {
        const { search, hash } = window.location;
        window.history.pushState({ lang: next }, '', pathForLang(next) + search + hash);
      }
      setLangState(next);
    },
    [lang, notFound],
  );

  // Keep <html lang>, <title>, description and canonical in sync after an in-place switch.
  useEffect(() => {
    applyDocumentHead({ kind: notFound ? 'notFound' : 'page', lang });
  }, [lang, notFound]);

  // Browser back/forward between /en and /vi.
  useEffect(() => {
    if (notFound) return;
    const onPop = () => {
      const fromPath = langFromPathname(window.location.pathname);
      if (fromPath) setLangState(fromPath);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [notFound]);

  const value = useMemo<LangContextValue>(
    () => ({ lang, setLang, t: (key) => translate(lang, key) }),
    [lang, setLang],
  );

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}
