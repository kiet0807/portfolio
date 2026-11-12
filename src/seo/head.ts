import { siteUrl } from './siteUrl';
import { allSkills, profile } from '@/data/profile';
import { t } from '@/i18n/dictionary';
import { LANGS, type Lang } from '@/i18n/types';

export type Route = { kind: 'page'; lang: Lang } | { kind: 'notFound'; lang: Lang };

function esc(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function pageTitle(route: Route): string {
  return route.kind === 'notFound'
    ? `${t(route.lang, 'notFound.pageTitle')} · ${profile.name}`
    : profile.seo.title[route.lang];
}

export function pageDescription(lang: Lang): string {
  return profile.seo.description[lang];
}

export function ogLocale(lang: Lang): string {
  return lang === 'vi' ? 'vi_VN' : 'en_US';
}

function fontPreload(file: string): string {
  return `<link rel="preload" as="font" type="font/woff2" href="/fonts/${file}.woff2" crossorigin />`;
}

function personJsonLd(lang: Lang): string {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: profile.name,
    jobTitle: profile.title[lang],
    description: profile.tagline[lang],
    email: `mailto:${profile.email}`,
    url: `${siteUrl}/${lang}`,
    image: `${siteUrl}/og-${lang}.png`,
    address: { '@type': 'PostalAddress', addressLocality: profile.location[lang] },
    sameAs: profile.socials.map((s) => s.url),
    knowsAbout: allSkills(),
  };
  // "<" is escaped so the JSON can never close the <script> element early.
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

/**
 * Head markup for the prerendered HTML. It is fully static per route, so link
 * previews (Facebook, LinkedIn, Zalo) are correct without running JavaScript.
 */
export function renderHead(route: Route): string {
  const { lang } = route;
  const title = pageTitle(route);
  const description = pageDescription(lang);
  const url = `${siteUrl}/${lang}`;
  const og = `${siteUrl}/og-${lang}.png`;
  const other: Lang = lang === 'en' ? 'vi' : 'en';

  const lines: string[] = [
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(description)}" />`,
    `<meta name="author" content="${esc(profile.name)}" />`,
  ];

  if (route.kind === 'page') {
    lines.push(
      `<link rel="canonical" href="${url}" />`,
      ...LANGS.map((l) => `<link rel="alternate" hreflang="${l}" href="${siteUrl}/${l}" />`),
      `<link rel="alternate" hreflang="x-default" href="${siteUrl}/en" />`,
    );
  } else {
    lines.push('<meta name="robots" content="noindex" />');
  }

  lines.push(
    '<meta property="og:type" content="profile" />',
    `<meta property="og:site_name" content="${esc(profile.name)}" />`,
    `<meta property="og:locale" content="${ogLocale(lang)}" />`,
    `<meta property="og:locale:alternate" content="${ogLocale(other)}" />`,
    `<meta property="og:title" content="${esc(title)}" />`,
    `<meta property="og:description" content="${esc(description)}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:image" content="${og}" />`,
    '<meta property="og:image:type" content="image/png" />',
    '<meta property="og:image:width" content="1200" />',
    '<meta property="og:image:height" content="630" />',
    `<meta property="og:image:alt" content="${esc(`${profile.name} · ${profile.title[lang]}`)}" />`,
    '<meta name="twitter:card" content="summary_large_image" />',
    `<meta name="twitter:title" content="${esc(title)}" />`,
    `<meta name="twitter:description" content="${esc(description)}" />`,
    `<meta name="twitter:image" content="${og}" />`,
    // Above-the-fold fonts: body text, the thin hero heading with its serif accent, and
    // the Vietnamese glyphs of the name (needed on /en too: "Trần").
    fontPreload('inter-latin-400-normal'),
    fontPreload('space-grotesk-latin-300-normal'),
    fontPreload('space-grotesk-vietnamese-300-normal'),
    fontPreload('playfair-display-latin-400-italic'),
    fontPreload('playfair-display-vietnamese-400-italic'),
  );
  if (lang === 'vi') lines.push(fontPreload('inter-vietnamese-400-normal'));
  if (route.kind === 'page') {
    lines.push(`<script type="application/ld+json">${personJsonLd(lang)}</script>`);
  }

  return lines.join('\n    ');
}

/** Client-side counterpart, used when the language changes without a reload. */
export function applyDocumentHead(route: Route): void {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = route.lang;
  document.title = pageTitle(route);
  document.head
    .querySelector<HTMLMetaElement>('meta[name="description"]')
    ?.setAttribute('content', pageDescription(route.lang));
  document.head
    .querySelector<HTMLLinkElement>('link[rel="canonical"]')
    ?.setAttribute('href', `${siteUrl}/${route.lang}`);
}
