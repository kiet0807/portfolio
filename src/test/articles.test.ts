import { describe, expect, it } from 'vitest';
import { ARTICLES, articlePath, articleSource, findArticle, loadArticle } from '@/content/articles';
import { LANGS } from '@/i18n/types';
import { readingMinutes } from '@/lib/markdown';

describe('articles', () => {
  it('has unique, URL-safe slugs and real dates, newest first', () => {
    const slugs = ARTICLES.map((article) => article.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const article of ARTICLES) {
      expect(article.slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      expect(article.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(Number.isNaN(Date.parse(article.date)), article.slug).toBe(false);
      expect(article.tags.length).toBeGreaterThan(0);
    }
    const dates = ARTICLES.map((article) => article.date);
    expect(dates).toEqual([...dates].sort().reverse());
  });

  it.each(ARTICLES.flatMap((article) => LANGS.map((lang) => [article.slug, lang] as const)))(
    '%s (%s): has its text, no title line, and the declared reading time',
    async (slug, lang) => {
      const source = await articleSource(slug, lang);
      expect(source.trim().length).toBeGreaterThan(200);
      // The title comes from articles.ts; a "# " line would print it twice. Code blocks may
      // hold "# " lines of their own (Markdown files, shell comments), so they are left out.
      expect(source.replace(/^```[\s\S]*?^```/gm, '')).not.toMatch(/^# /m);
      expect(findArticle(slug)?.minutes[lang]).toBe(readingMinutes(source));
    },
  );

  it('loads an article as blocks with a table of contents', async () => {
    const [first] = ARTICLES;
    if (!first) return;
    const article = await loadArticle(first.slug, 'en');
    expect(article.meta).toBe(first);
    const headings = article.blocks.filter((block) => block.kind === 'heading' && block.level === 2);
    expect(headings.length).toBeGreaterThan(1);
  });

  it('builds the article address', () => {
    expect(articlePath('vi', 'abc')).toBe('/vi/writing/abc');
  });
});
