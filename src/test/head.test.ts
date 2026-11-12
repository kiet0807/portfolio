import { describe, expect, it } from 'vitest';
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

  it('keeps the 404 page out of search indexes', () => {
    const head = renderHead({ kind: 'notFound', lang: 'en' });
    expect(head).toContain('<meta name="robots" content="noindex" />');
    expect(head).not.toContain('rel="canonical"');
    expect(head).not.toContain('hreflang');
  });
});
