import { siteUrl } from './siteUrl';
import { articleOgPath, articlePath, findArticle, type ArticleMeta } from '@/content/articles';
import { allSkills, profile } from '@/data/profile';
import { t } from '@/i18n/dictionary';
import { LANGS, type Lang } from '@/i18n/types';

export type Route =
  | { kind: 'page'; lang: Lang }
  | { kind: 'article'; lang: Lang; slug: string }
  | { kind: 'notFound'; lang: Lang };

function esc(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function articleOf(route: Route): ArticleMeta | undefined {
  return route.kind === 'article' ? findArticle(route.slug) : undefined;
}

/**
 * Bump when the look of the link-preview images changes. LinkedIn and others keep an image by
 * its URL for days, even after the page is scraped again, so each image URL carries a version
 * made from what is drawn on it: a new title or job title gets a new URL, and a fresh picture.
 */
const OG_DESIGN = 3;

/** A short, stable fingerprint of the words drawn on a preview image (FNV-1a, base 36). */
function ogVersion(parts: readonly (string | number)[]): string {
  let hash = 0x811c9dc5;
  for (const char of [OG_DESIGN, ...parts].join('\u0000')) {
    hash = Math.imul(hash ^ (char.codePointAt(0) ?? 0), 0x01000193) >>> 0;
  }
  return hash.toString(36);
}

/** The home page's preview image (scripts/generate-assets.mjs draws the same words). */
function homeOgUrl(lang: Lang): string {
  const words = [profile.seo.ogLabel[lang], profile.name, profile.title[lang], profile.tagline[lang]];
  return `${siteUrl}/og-${lang}.png?v=${ogVersion(words)}`;
}

/** An article's own preview image: its title, reading time, and the author's name and title. */
function articleOgUrl(lang: Lang, article: ArticleMeta): string {
  const words = [
    t(lang, 'writing.article'),
    article.minutes[lang],
    t(lang, 'unit.minutes'),
    t(lang, 'article.read'),
    article.title[lang],
    profile.name,
    profile.title[lang],
  ];
  return `${siteUrl}${articleOgPath(lang, article.slug)}?v=${ogVersion(words)}`;
}

export function pageTitle(route: Route): string {
  const article = articleOf(route);
  if (article) return `${article.title[route.lang]} · ${profile.name}`;
  return route.kind === 'notFound'
    ? `${t(route.lang, 'notFound.pageTitle')} · ${profile.name}`
    : profile.seo.title[route.lang];
}

export function pageDescription(route: Route): string {
  return articleOf(route)?.summary[route.lang] ?? profile.seo.description[route.lang];
}

/** Path of the same page in a language: /en, or /en/writing/<slug>. Not defined for the 404 page. */
export function pathFor(route: Route, lang: Lang): string {
  return route.kind === 'article' ? articlePath(lang, route.slug) : `/${lang}`;
}

export function ogLocale(lang: Lang): string {
  return lang === 'vi' ? 'vi_VN' : 'en_US';
}

function fontPreload(file: string): string {
  return `<link rel="preload" as="font" type="font/woff2" href="/fonts/${file}.woff2" crossorigin />`;
}

/** JSON for a <script> element: "<" is escaped so the data can never close the element early. */
function jsonLd(data: object): string {
  return `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`;
}

function person(lang: Lang) {
  return {
    '@type': 'Person',
    name: profile.name,
    jobTitle: profile.title[lang],
    url: `${siteUrl}/${lang}`,
  };
}

function personJsonLd(lang: Lang): string {
  return jsonLd({
    '@context': 'https://schema.org',
    ...person(lang),
    description: profile.tagline[lang],
    email: `mailto:${profile.email}`,
    image: homeOgUrl(lang),
    address: { '@type': 'PostalAddress', addressLocality: profile.location[lang] },
    sameAs: profile.socials.map((s) => s.url),
    knowsAbout: allSkills(),
  });
}

function articleJsonLd(article: ArticleMeta, lang: Lang): string {
  const url = `${siteUrl}${articlePath(lang, article.slug)}`;
  return jsonLd({
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: article.title[lang],
    description: article.summary[lang],
    inLanguage: lang,
    datePublished: article.date,
    dateModified: article.updated ?? article.date,
    keywords: article.tags.join(', '),
    url,
    mainEntityOfPage: url,
    image: articleOgUrl(lang, article),
    author: person(lang),
  });
}

/**
 * Head markup for the prerendered HTML. It is fully static per route, so link
 * previews (Facebook, LinkedIn, Zalo) are correct without running JavaScript.
 */
export function renderHead(route: Route): string {
  const { lang } = route;
  const article = articleOf(route);
  const title = pageTitle(route);
  const description = pageDescription(route);
  const url = `${siteUrl}${pathFor(route, lang)}`;
  // An article is shared with an image that carries its own title; every other page with the profile's.
  const og = article ? articleOgUrl(lang, article) : homeOgUrl(lang);
  const ogAlt = article
    ? `${article.title[lang]} · ${profile.name}`
    : `${profile.name} · ${profile.title[lang]}`;
  const other: Lang = lang === 'en' ? 'vi' : 'en';

  const lines: string[] = [
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(description)}" />`,
    `<meta name="author" content="${esc(profile.name)}" />`,
  ];

  if (route.kind === 'notFound') {
    lines.push('<meta name="robots" content="noindex" />');
  } else {
    lines.push(
      `<link rel="canonical" href="${url}" />`,
      ...LANGS.map((l) => `<link rel="alternate" hreflang="${l}" href="${siteUrl}${pathFor(route, l)}" />`),
      `<link rel="alternate" hreflang="x-default" href="${siteUrl}${pathFor(route, 'en')}" />`,
    );
  }

  lines.push(
    `<meta property="og:type" content="${article ? 'article' : 'profile'}" />`,
    `<meta property="og:site_name" content="${esc(profile.name)}" />`,
    `<meta property="og:locale" content="${ogLocale(lang)}" />`,
    `<meta property="og:locale:alternate" content="${ogLocale(other)}" />`,
    `<meta property="og:title" content="${esc(article ? article.title[lang] : title)}" />`,
    `<meta property="og:description" content="${esc(description)}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:image" content="${og}" />`,
    '<meta property="og:image:type" content="image/png" />',
    '<meta property="og:image:width" content="1200" />',
    '<meta property="og:image:height" content="630" />',
    `<meta property="og:image:alt" content="${esc(ogAlt)}" />`,
  );
  if (article) {
    lines.push(
      `<meta property="article:published_time" content="${article.date}" />`,
      ...(article.updated ? [`<meta property="article:modified_time" content="${article.updated}" />`] : []),
      `<meta property="article:author" content="${siteUrl}/${lang}" />`,
      ...article.tags.map((tag) => `<meta property="article:tag" content="${esc(tag)}" />`),
    );
  }
  lines.push(
    '<meta name="twitter:card" content="summary_large_image" />',
    `<meta name="twitter:title" content="${esc(article ? article.title[lang] : title)}" />`,
    `<meta name="twitter:description" content="${esc(description)}" />`,
    `<meta name="twitter:image" content="${og}" />`,
    `<meta name="twitter:image:alt" content="${esc(ogAlt)}" />`,
  );

  // Above-the-fold fonts: body text and the thin display heading with its Vietnamese glyphs.
  // The home page also shows the serif accent of the name in the hero ("Kiệt", on /en too).
  lines.push(
    fontPreload('inter-latin-400-normal'),
    fontPreload('space-grotesk-latin-300-normal'),
    fontPreload('space-grotesk-vietnamese-300-normal'),
  );
  if (!article) {
    lines.push(
      fontPreload('playfair-display-latin-400-italic'),
      fontPreload('playfair-display-vietnamese-400-italic'),
    );
  }
  if (lang === 'vi') lines.push(fontPreload('inter-vietnamese-400-normal'));

  if (article) lines.push(articleJsonLd(article, lang));
  else if (route.kind === 'page') lines.push(personJsonLd(lang));

  return lines.join('\n    ');
}

/** Client-side counterpart, used when the language changes without a reload. */
export function applyDocumentHead(route: Route): void {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = route.lang;
  document.title = pageTitle(route);
  document.head
    .querySelector<HTMLMetaElement>('meta[name="description"]')
    ?.setAttribute('content', pageDescription(route));
  if (route.kind !== 'notFound') {
    document.head
      .querySelector<HTMLLinkElement>('link[rel="canonical"]')
      ?.setAttribute('href', `${siteUrl}${pathFor(route, route.lang)}`);
  }
}
