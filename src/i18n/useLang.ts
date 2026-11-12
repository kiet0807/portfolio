import { createContext, useContext } from 'react';
import type { DictKey } from './dictionary';
import type { Lang } from './types';

export interface LangContextValue {
  lang: Lang;
  /** Switch language in place: pushState + head update, no reload. */
  setLang: (next: Lang) => void;
  t: (key: DictKey) => string;
}

export const LangContext = createContext<LangContextValue | null>(null);

export function useLang(): LangContextValue {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error('useLang must be used inside <LangProvider>');
  return ctx;
}
