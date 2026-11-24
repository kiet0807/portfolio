/**
 * Static site generation. Runs after `vite build` (client) and `vite build --ssr`.
 *
 *   dist/en/index.html   English page
 *   dist/vi/index.html   Vietnamese page
 *   dist/<lang>/writing/<slug>/index.html   one page per article and language
 *   dist/404.html        404 page (English markup + Vietnamese <template>, swapped before paint)
 *   dist/index.html      tiny redirect page for `/`
 *   dist/sitemap.xml, dist/robots.txt
 *
 * Every page gets a Content-Security-Policy <meta> whose script hashes match the
 * inline scripts it actually contains.
 */
import { createHash } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { fromRoot, kb } from './lib.mjs';

const template = await readFile(fromRoot('dist/index.html'), 'utf8');
const server = await import(pathToFileURL(fromRoot('dist-ssr/entry-server.js')).href);
const {
  render,
  profile,
  siteUrl,
  LANGS,
  ARTICLES,
  articlePath,
  loadArticle,
  themeInlineScript,
  redirectInlineScript,
  notFoundLangInlineScript,
} = server;

for (const marker of [
  '<!--csp-->',
  '<!--app-head-->',
  '<!--app-html-->',
  '<!--app-body-->',
  '<html lang="en"',
]) {
  if (!template.includes(marker)) throw new Error(`index.html template is missing ${marker}`);
}
if (!template.includes(`<script>${themeInlineScript}</script>`)) {
  throw new Error('Theme script was not injected into the template (see vite.config.ts).');
}

const sha256 = (text) => `'sha256-${createHash('sha256').update(text, 'utf8').digest('base64')}'`;

/** CSP for a page containing exactly these inline scripts. */
function cspMeta(inlineScripts) {
  const policy = [
    "default-src 'self'",
    `script-src 'self' ${inlineScripts.map(sha256).join(' ')}`,
    // React and Motion write inline style attributes.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'none'",
  ].join('; ');
  return `<meta http-equiv="Content-Security-Policy" content="${policy}" />`;
}

function fill({ lang, head, html, body = '', inlineScripts }) {
  return template
    .replace('<html lang="en"', `<html lang="${lang}"`)
    .replace('<!--csp-->', cspMeta(inlineScripts))
    .replace('<!--app-head-->', head)
    .replace('<!--app-html-->', html)
    .replace('<!--app-body-->', body);
}

const written = [];
async function emit(relativePath, content) {
  const target = fromRoot('dist', relativePath);
  await mkdir(fromRoot('dist', relativePath, '..'), { recursive: true });
  await writeFile(target, content);
  written.push([relativePath, Buffer.byteLength(content)]);
}

/* ------------------------------ /en and /vi ------------------------------ */
for (const lang of LANGS) {
  const { html, head } = render({ kind: 'page', lang });
  await emit(`${lang}/index.html`, fill({ lang, head, html, inlineScripts: [themeInlineScript] }));
}

/* ------------------------- /<lang>/writing/<slug> ------------------------- */
for (const { slug } of ARTICLES) {
  for (const lang of LANGS) {
    const article = await loadArticle(slug, lang);
    const { html, head } = render({ kind: 'article', lang, slug }, article);
    await emit(
      `${articlePath(lang, slug).slice(1)}/index.html`,
      fill({ lang, head, html, inlineScripts: [themeInlineScript] }),
    );
  }
}

/* --------------------------------- /404 ---------------------------------- */
{
  const [defaultLang, ...otherLangs] = LANGS;
  const main = render({ kind: 'notFound', lang: defaultLang });
  const templates = otherLangs
    .map((lang) => {
      const { html, title } = render({ kind: 'notFound', lang });
      return `<template id="nf-${lang}" data-title="${title.replace(/"/g, '&quot;')}">${html}</template>`;
    })
    .join('\n    ');
  await emit(
    '404.html',
    fill({
      lang: defaultLang,
      head: main.head,
      html: main.html,
      body: `${templates}\n    <script>${notFoundLangInlineScript}</script>`,
      inlineScripts: [themeInlineScript, notFoundLangInlineScript],
    }),
  );
}

/* ----------------------------------- / ----------------------------------- */
{
  const links = LANGS.map(
    (lang) => `<a href="/${lang}">${lang === 'vi' ? 'Tiếng Việt' : 'English'}</a>`,
  ).join(' · ');
  await emit(
    'index.html',
    `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    ${cspMeta([redirectInlineScript])}
    <title>${profile.seo.title.en}</title>
    <meta name="description" content="${profile.seo.description.en.replace(/"/g, '&quot;')}" />
    <meta name="robots" content="noindex, follow" />
    <link rel="canonical" href="${siteUrl}/en" />
${LANGS.map((lang) => `    <link rel="alternate" hreflang="${lang}" href="${siteUrl}/${lang}" />`).join('\n')}
    <link rel="alternate" hreflang="x-default" href="${siteUrl}/en" />
    <script>${redirectInlineScript}</script>
    <noscript><meta http-equiv="refresh" content="0; url=/en" /></noscript>
    <style>
      body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #081122; color: #e6edf5; font: 16px/1.5 system-ui, sans-serif; }
      a { color: #22d3ee; }
    </style>
  </head>
  <body>
    <p>${links}</p>
  </body>
</html>
`,
  );
}

/* --------------------------- sitemap and robots --------------------------- */
{
  // Every page exists in each language; each <url> lists all of them as alternates.
  const pages = [
    { path: (lang) => `/${lang}` },
    ...ARTICLES.map((article) => ({
      path: (lang) => articlePath(lang, article.slug),
      lastmod: article.updated ?? article.date,
    })),
  ];
  const urls = pages
    .flatMap(({ path, lastmod }) => {
      const alternates = [
        ...LANGS.map((l) => `    <xhtml:link rel="alternate" hreflang="${l}" href="${siteUrl}${path(l)}" />`),
        `    <xhtml:link rel="alternate" hreflang="x-default" href="${siteUrl}${path('en')}" />`,
      ].join('\n');
      return LANGS.map(
        (lang) =>
          `  <url>\n    <loc>${siteUrl}${path(lang)}</loc>\n${lastmod ? `    <lastmod>${lastmod}</lastmod>\n` : ''}${alternates}\n  </url>`,
      );
    })
    .join('\n');
  await emit(
    'sitemap.xml',
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls}\n</urlset>\n`,
  );
  await emit('robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}/sitemap.xml\n`);
}

await rm(fromRoot('dist-ssr'), { recursive: true, force: true });

console.log(`Prerendered (site URL: ${siteUrl}):`);
for (const [file, bytes] of written) console.log(`  dist/${file.padEnd(40)} ${kb(bytes)}`);
if (siteUrl.includes('example.com')) {
  console.log('  note: canonical/OG URLs use the placeholder domain. Set SITE_URL or deploy on Vercel.');
}
