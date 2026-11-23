/**
 * Builds the downloadable CV: one A4 PDF per language, laid out as a CV (see
 * scripts/cv-template.mjs) and filled from src/data/profile.ts, so it always says what
 * the website says.
 *
 *   pnpm cv            the public CV
 *   pnpm cv:private    a copy with the phone number from private/contact.json, written to
 *                      private/ only (git-ignored, never built or deployed), to send by hand
 *
 * Writes public/cv-<lang>.pdf (the source of truth, picked up by the next build) and,
 * when a build exists, dist/cv-<lang>.pdf (so that build already serves the new file).
 * The text size is lowered step by step until the CV fits on MAX_PAGES sheets.
 * Environment: CHROME_PATH (browser binary), CV_KEEP_HTML=1 (keep .cv/cv-<lang>.html to inspect).
 */
import { existsSync, readFileSync } from 'node:fs';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer-core';
import { runnerImport } from 'vite';
import { renderCv } from './cv-template.mjs';
import { fromRoot, kb } from './lib.mjs';

const MAX_PAGES = 2;
/** Text sizes to try, in points, largest first. */
const SIZES = [9.2, 9.1, 9, 8.9, 8.8, 8.7, 8.6, 8.5, 8.4, 8.3, 8.2, 8.1, 8];
const WORK_DIR = fromRoot('.cv');
/** `--private`: add the phone number and keep the result out of public/ and dist/. */
const PRIVATE = process.argv.includes('--private');
const PRIVATE_DIR = fromRoot('private');
let phone = null;
if (PRIVATE) {
  const file = fromRoot('private/contact.json');
  phone = existsSync(file) ? (JSON.parse(readFileSync(file, 'utf8')).phone ?? null) : null;
  if (!phone) {
    console.error('private/contact.json with a "phone" field is missing.');
    process.exit(1);
  }
}

const CHROME =
  process.env.CHROME_PATH ??
  [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
  ].find((p) => existsSync(p));
if (!CHROME) {
  console.error('Chrome not found. Set CHROME_PATH to a Chrome/Chromium binary.');
  process.exit(1);
}
if (!existsSync(fromRoot('public/fonts/inter-latin-400-normal.woff2'))) {
  console.error('public/fonts/ is missing. Run `pnpm assets` (or `pnpm build`) first.');
  process.exit(1);
}

// Vite's module runner understands TypeScript and the "@/..." alias.
const load = async (file) => (await runnerImport(file, { logLevel: 'error' })).module;
const { profile } = await load('/src/data/profile.ts');
const { t } = await load('/src/i18n/dictionary.ts');
// The same order as the build: SITE_URL first, then the fallback in profile.ts.
const siteUrl = (process.env.SITE_URL || profile.siteUrl).replace(/\/+$/, '');

const pageCount = (pdf) => pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g)?.length ?? 0;

/** Width of the avatar in the CV, in pixels: printed 24 mm wide, this is about 340 dpi. */
const AVATAR_PX = 320;

/**
 * The site's avatar is WebP, which Chrome's PDF writer can only store as raw pixels
 * (over 200 KB for 512×512). A JPEG goes into the PDF as it is, so the CV gets a small
 * JPEG made from the same picture. Drawn from a data URL, so the canvas is not tainted.
 */
async function cvAvatar(browser) {
  const file = fromRoot('public', profile.avatar.src.replace(/^\//, ''));
  const source = `data:image/webp;base64,${readFileSync(file).toString('base64')}`;
  const page = await browser.newPage();
  try {
    return await page.evaluate(
      async (src, size) => {
        const image = new Image();
        image.src = src;
        await image.decode();
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const context = canvas.getContext('2d');
        context.imageSmoothingQuality = 'high';
        context.drawImage(image, 0, 0, size, size);
        return canvas.toDataURL('image/jpeg', 0.9);
      },
      source,
      AVATAR_PX,
    );
  } finally {
    await page.close();
  }
}

await mkdir(WORK_DIR, { recursive: true });
const browser = await puppeteer.launch({ executablePath: CHROME });
let failed = false;
try {
  const avatarUrl = await cvAvatar(browser);
  for (const lang of ['en', 'vi']) {
    const html = renderCv({
      profile,
      lang,
      t: (key) => t(lang, key),
      fontUrl: (file) => pathToFileURL(fromRoot('public/fonts', file)).href,
      avatarUrl,
      phone,
      // The placeholder domain is not an address anyone should be sent to.
      siteUrl: siteUrl.includes('example.com') ? null : `${siteUrl}/${lang}`,
    });
    const htmlPath = `${WORK_DIR}/cv-${lang}.html`;
    await writeFile(htmlPath, html);

    const page = await browser.newPage();
    await page.goto(pathToFileURL(htmlPath).href, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    const missing = await page.evaluate(() =>
      ['400 10px "Inter"', '300 10px "Space Grotesk"', 'italic 400 10px "Playfair Display"'].filter(
        (font) => !document.fonts.check(font, 'Senior'),
      ),
    );
    if (missing.length > 0) throw new Error(`cv-${lang}: fonts did not load: ${missing.join(', ')}`);

    let pdf = null;
    let pages = 0;
    let used = 0;
    for (const size of SIZES) {
      await page.evaluate((value) => {
        document.documentElement.style.setProperty('--cv-size', `${value}pt`);
      }, size);
      // Paper size and margins come from the @page rules of the template.
      pdf = Buffer.from(
        await page.pdf({
          preferCSSPageSize: true,
          printBackground: true,
          tagged: true,
          // Name and page number in the bottom margin of every sheet.
          displayHeaderFooter: true,
          headerTemplate: '<span></span>',
          footerTemplate: `<div style="width:100%;padding:0 13mm;display:flex;justify-content:space-between;font:6.5pt Arial,sans-serif;color:#7b8798;letter-spacing:0.06em"><span>${profile.name} · ${profile.title[lang]}</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>`,
        }),
      );
      pages = pageCount(pdf);
      used = size;
      if (pages <= MAX_PAGES) break;
    }
    await page.close();

    if (pages > MAX_PAGES) {
      failed = true;
      console.error(
        `  cv-${lang}.pdf    still ${pages} pages at ${used}pt (limit ${MAX_PAGES}). Shorten the experience or the project texts in profile.ts. Nothing was written.`,
      );
      continue;
    }
    if (PRIVATE) {
      await mkdir(PRIVATE_DIR, { recursive: true });
      await writeFile(`${PRIVATE_DIR}/cv-${lang}.pdf`, pdf);
    } else {
      for (const dir of ['public', 'dist']) {
        if (existsSync(fromRoot(dir))) await writeFile(fromRoot(dir, `cv-${lang}.pdf`), pdf);
      }
    }
    console.log(
      `  ${PRIVATE ? 'private/' : ''}cv-${lang}.pdf    ${kb(pdf.length)}, ${pages} pages, text ${used}pt`,
    );
  }
} finally {
  await browser.close();
  if (process.env.CV_KEEP_HTML !== '1') await rm(WORK_DIR, { recursive: true, force: true });
}
if (failed) process.exit(1);
