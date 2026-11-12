import { describe, expect, it } from 'vitest';
import { detectLangExpression } from '@/i18n/inline-scripts';
import { resolveInitialLang } from '@/i18n/lang';
import { STORAGE_KEYS } from '@/lib/storage';
import { resolveRoute } from '@/routing';
import { ARTICLES } from '@/content/articles';

describe('resolveInitialLang', () => {
  it('prefers the language in the URL', () => {
    expect(resolveInitialLang({ pathname: '/vi', stored: 'en', browserLanguages: ['en-US'] })).toBe('vi');
  });
  it('falls back to the saved choice', () => {
    expect(resolveInitialLang({ pathname: '/', stored: 'vi', browserLanguages: ['en-US'] })).toBe('vi');
  });
  it('then to the first supported browser language', () => {
    expect(resolveInitialLang({ stored: null, browserLanguages: ['fr-FR', 'vi-VN', 'en'] })).toBe('vi');
  });
  it('ignores invalid saved values', () => {
    expect(resolveInitialLang({ stored: 'de', browserLanguages: ['vi'] })).toBe('vi');
  });
  it('defaults to English', () => {
    expect(resolveInitialLang({ stored: null, browserLanguages: ['fr', 'ja'] })).toBe('en');
    expect(resolveInitialLang({})).toBe('en');
  });
});

describe('resolveRoute', () => {
  const base = { stored: null, browserLanguages: ['en'] };
  it('maps /en and /vi to pages', () => {
    expect(resolveRoute({ ...base, pathname: '/en' })).toEqual({ kind: 'page', lang: 'en' });
    expect(resolveRoute({ ...base, pathname: '/vi/' })).toEqual({ kind: 'page', lang: 'vi' });
  });
  it('treats everything else as not found, in the saved or browser language', () => {
    expect(resolveRoute({ ...base, pathname: '/nope' })).toEqual({ kind: 'notFound', lang: 'en' });
    expect(resolveRoute({ ...base, pathname: '/en/extra' })).toEqual({ kind: 'notFound', lang: 'en' });
    expect(resolveRoute({ pathname: '/x', stored: 'vi', browserLanguages: ['en'] })).toEqual({
      kind: 'notFound',
      lang: 'vi',
    });
  });
  it('maps /<lang>/writing/<slug> to an article, and an unknown slug to not found', () => {
    const [article] = ARTICLES;
    if (!article) return;
    expect(resolveRoute({ ...base, pathname: `/vi/writing/${article.slug}` })).toEqual({
      kind: 'article',
      lang: 'vi',
      slug: article.slug,
    });
    expect(resolveRoute({ ...base, pathname: '/en/writing/no-such-article' }).kind).toBe('notFound');
    expect(resolveRoute({ ...base, pathname: '/en/writing' }).kind).toBe('notFound');
    expect(resolveRoute({ ...base, pathname: `/fr/writing/${article.slug}` }).kind).toBe('notFound');
  });
});

describe('inline language detection script', () => {
  // The inline script cannot import TypeScript, so make sure it never drifts from resolveInitialLang.
  const cases: { stored: string | null; languages: string[] }[] = [
    { stored: null, languages: ['en-US'] },
    { stored: null, languages: ['vi-VN', 'en'] },
    { stored: null, languages: ['fr-FR', 'vi'] },
    { stored: null, languages: ['ja', 'ko'] },
    { stored: 'vi', languages: ['en-US'] },
    { stored: 'en', languages: ['vi-VN'] },
    { stored: 'xx', languages: ['vi-VN'] },
  ];

  it.each(cases)('matches resolveInitialLang for %j', ({ stored, languages }) => {
    if (stored === null) window.localStorage.removeItem(STORAGE_KEYS.lang);
    else window.localStorage.setItem(STORAGE_KEYS.lang, stored);
    Object.defineProperty(window.navigator, 'languages', { configurable: true, get: () => languages });

    // eslint-disable-next-line @typescript-eslint/no-implied-eval -- evaluating our own inline script is the point of this test
    const detect = new Function(`return ${detectLangExpression}`) as () => unknown;
    expect(detect()).toBe(resolveInitialLang({ stored, browserLanguages: languages }));
  });
});
