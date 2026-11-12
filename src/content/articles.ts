import type { Lang, Localized } from '@/i18n/types';
import type { Block } from '@/lib/markdown';

/**
 * Articles published on this site, newest first.
 *
 * To add one: write the text in src/content/writing/<slug>.en.md and <slug>.vi.md (no `#`
 * title line: the title is set here), add an entry below, and run `pnpm test` to check the
 * reading time. The article gets its own page at /<lang>/writing/<slug>, a row in the
 * Writing section, a sitemap entry and a command in the command menu.
 */
export interface ArticleMeta {
  /** URL segment: lowercase letters, digits and hyphens. */
  readonly slug: string;
  /** Publication date, "YYYY-MM-DD". */
  readonly date: string;
  readonly title: Localized;
  /** One or two sentences: the lead under the title, the search snippet and the link preview. */
  readonly summary: Localized;
  readonly tags: readonly string[];
  /** Reading time. A unit test keeps it in line with the text (230 words a minute). */
  readonly minutes: Localized<number>;
}

export interface Article {
  readonly meta: ArticleMeta;
  readonly blocks: readonly Block[];
}

export const ARTICLES: readonly ArticleMeta[] = [
  {
    slug: 'typescript-migration',
    date: '2026-11-12',
    title: {
      en: 'Moving 1,600+ JavaScript files to strict TypeScript in 10 days',
      vi: 'Chuyển hơn 1.600 file JavaScript sang TypeScript strict trong 10 ngày',
    },
    summary: {
      en: 'How a production order management frontend went from JavaScript to strict TypeScript in ten days: ten months of structure first, small batches, AI agents with guardrails, and the real bugs that typing the data layer uncovered.',
      vi: 'Cách frontend của một hệ thống quản lý đơn hàng đang chạy production chuyển từ JavaScript sang TypeScript strict trong mười ngày: mười tháng dựng cấu trúc trước, chia lô nhỏ, AI agent có kiểm soát, và những lỗi thật mà việc đặt type tìm ra.',
    },
    tags: ['TypeScript', 'React', 'Refactoring', 'AI agents'],
    minutes: { en: 5, vi: 6 },
  },
];

/** The path segment under which articles live: /en/writing/<slug>. */
export const WRITING_SEGMENT = 'writing';

export function articlePath(lang: Lang, slug: string): string {
  return `/${lang}/${WRITING_SEGMENT}/${slug}`;
}

export function findArticle(slug: string | undefined): ArticleMeta | undefined {
  return ARTICLES.find((article) => article.slug === slug);
}

// One lazy chunk per text: a page only downloads the article it shows.
const SOURCES = import.meta.glob<string>('./writing/*.md', { query: '?raw', import: 'default' });

export async function articleSource(slug: string, lang: Lang): Promise<string> {
  const load = SOURCES[`./writing/${slug}.${lang}.md`];
  if (!load) throw new Error(`There is no ${lang} text for the article "${slug}".`);
  return load();
}

/** The article's text, parsed. The Markdown reader is downloaded with it, never up front. */
export async function loadArticle(slug: string, lang: Lang): Promise<Article> {
  const meta = findArticle(slug);
  if (!meta) throw new Error(`Unknown article "${slug}".`);
  const [source, { parseMarkdown }] = await Promise.all([
    articleSource(slug, lang),
    import('@/lib/markdown'),
  ]);
  return { meta, blocks: parseMarkdown(source) };
}
