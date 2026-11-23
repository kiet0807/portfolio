import { describe, expect, it } from 'vitest';
import { ARTICLES } from '@/content/articles';
import { profile } from '@/data/profile';
import { renderHead } from '@/seo/head';
import { siteUrl } from '@/seo/siteUrl';

describe('renderHead', () => {
  it.each(['en', 'vi'] as const)('emits localized SEO and Open Graph tags for /%s', (lang) => {
    const head = renderHead({ kind: 'page', lang });
    expect(head).toContain(`<title>${profile.seo.title[lang]}</title>`);
    expect(head).toContain(`<meta name="description" content="${profile.seo.description[lang]}" />`);
    expect(head).toContain(`<link rel="canonical" href="${siteUrl}/${lang}" />`);
    expect(head).toContain(`<link rel="alternate" hreflang="en" href="${siteUrl}/en" />`);
    expect(head).toContain(`<link rel="alternate" hreflang="vi" href="${siteUrl}/vi" />`);
    expect(head).toContain(`<link rel="alternate" hreflang="x-default" href="${siteUrl}/en" />`);
    expect(head).toMatch(
      new RegExp(`<meta property="og:image" content="${siteUrl}/og-${lang}\\.png\\?v=[0-9a-z]+" />`),
    );
    expect(head).toContain(`<meta property="og:locale" content="${lang === 'vi' ? 'vi_VN' : 'en_US'}" />`);
    expect(head).toContain('application/ld+json');
  });

  it.each(ARTICLES)('says when $slug was published and last changed', (article) => {
    const head = renderHead({ kind: 'article', lang: 'en', slug: article.slug });
    expect(head).toContain(`"datePublished":"${article.date}"`);
    expect(head).toContain(`"dateModified":"${article.updated ?? article.date}"`);
  });

  it.each(['en', 'vi'] as const)('describes an article as an article on /%s/writing/…', (lang) => {
    const [article] = ARTICLES;
    if (!article) return;
    const url = `${siteUrl}/${lang}/writing/${article.slug}`;
    const head = renderHead({ kind: 'article', lang, slug: article.slug });
    expect(head).toContain(`<title>${article.title[lang]} · ${profile.name}</title>`);
    expect(head).toContain(`<link rel="canonical" href="${url}" />`);
    expect(head).toContain(
      `<link rel="alternate" hreflang="en" href="${siteUrl}/en/writing/${article.slug}" />`,
    );
    expect(head).toContain(
      `<link rel="alternate" hreflang="vi" href="${siteUrl}/vi/writing/${article.slug}" />`,
    );
    expect(head).toContain('<meta property="og:type" content="article" />');
    expect(head).toContain(`<meta property="article:published_time" content="${article.date}" />`);
    expect(head).toContain('"@type":"BlogPosting"');
    // Shared links show the article's own image, not the profile's.
    // Its URL carries a version, so a changed image is fetched again instead of read from a cache.
    const image = /<meta property="og:image" content="([^"]+)" \/>/.exec(head)?.[1] ?? '';
    expect(image).toMatch(new RegExp(`^${siteUrl}/og/${article.slug}-${lang}\\.png\\?v=[0-9a-z]+$`));
    expect(head).toContain(`<meta name="twitter:image" content="${image}" />`);
    expect(head).toContain(`"image":"${image}"`);
    expect(head).toContain(
      `<meta property="og:image:alt" content="${article.title[lang]} · ${profile.name}" />`,
    );
    expect(head).not.toContain(`/og-${lang}.png`);
    // The article page describes the article; the full profile (Person) is the home page's.
    expect(head).not.toContain('knowsAbout');
  });

  it('gives each preview image a version that follows what is drawn on it', () => {
    const versionOf = (head: string) => /og:image" content="[^"]+\\?v=([0-9a-z]+)"/.exec(head)?.[1];
    const en = versionOf(renderHead({ kind: 'page', lang: 'en' }));
    expect(en).toBeTruthy();
    // The same words give the same URL, build after build.
    expect(versionOf(renderHead({ kind: 'page', lang: 'en' }))).toBe(en);
    // Different words (another language, another article) give another.
    expect(versionOf(renderHead({ kind: 'page', lang: 'vi' }))).not.toBe(en);
    const [first, second] = ARTICLES;
    if (!first || !second) return;
    expect(versionOf(renderHead({ kind: 'article', lang: 'en', slug: first.slug }))).not.toBe(
      versionOf(renderHead({ kind: 'article', lang: 'en', slug: second.slug })),
    );
  });

  it('keeps the 404 page out of search indexes', () => {
    const head = renderHead({ kind: 'notFound', lang: 'en' });
    expect(head).toContain('<meta name="robots" content="noindex" />');
    expect(head).not.toContain('rel="canonical"');
    expect(head).not.toContain('hreflang');
  });
});
