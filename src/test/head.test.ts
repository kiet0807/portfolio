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
    expect(head).toContain(`<meta property="og:image" content="${siteUrl}/og-${lang}.png" />`);
    expect(head).toContain(`<meta property="og:locale" content="${lang === 'vi' ? 'vi_VN' : 'en_US'}" />`);
    expect(head).toContain('application/ld+json');
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
    const image = `${siteUrl}/og/${article.slug}-${lang}.png`;
    expect(head).toContain(`<meta property="og:image" content="${image}" />`);
    expect(head).toContain(`<meta name="twitter:image" content="${image}" />`);
    expect(head).toContain(`"image":"${image}"`);
    expect(head).toContain(
      `<meta property="og:image:alt" content="${article.title[lang]} · ${profile.name}" />`,
    );
    expect(head).not.toContain(`/og-${lang}.png`);
    // The article page describes the article; the full profile (Person) is the home page's.
    expect(head).not.toContain('knowsAbout');
  });

  it('keeps the 404 page out of search indexes', () => {
    const head = renderHead({ kind: 'notFound', lang: 'en' });
    expect(head).toContain('<meta name="robots" content="noindex" />');
    expect(head).not.toContain('rel="canonical"');
    expect(head).not.toContain('hreflang');
  });
});
