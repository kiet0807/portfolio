/**
 * Browser QA against the production build, served the way Vercel serves it.
 * Uses the locally installed Chrome through puppeteer-core (nothing is downloaded).
 *
 *   pnpm build && pnpm qa
 *
 * Environment: CHROME_PATH (browser binary), QA_HEADFUL=1 (show the window).
 * Screenshots are written to .qa/. Exit code is 1 when any check fails.
 */
import { existsSync } from 'node:fs';
import { mkdir, readFile, rm } from 'node:fs/promises';
import { createServer } from 'node:http';
import puppeteer from 'puppeteer-core';
import { LIMITS, resetRateLimit } from '../server/chat.js';
import { fromRoot, pngSize } from './lib.mjs';
import { startServer } from './serve.mjs';

// QA never talks to the real Gemini API: a key in the shell would spend its quota.
// The chat checks set a fake key and point the function at a local stub instead.
delete process.env.GEMINI_API_KEY;
delete process.env.GEMINI_API_URL;
delete process.env.GEMINI_MODEL;

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
if (!existsSync(fromRoot('dist/en/index.html'))) {
  console.error('dist/ is missing. Run `pnpm build` first.');
  process.exit(1);
}

const profileSource = await readFile(fromRoot('src/data/profile.ts'), 'utf8');
// Everything the checks compare against is read from profile.ts, so editing the copy never breaks QA.
const field = (pattern) => pattern.exec(profileSource)?.[1] ?? '';
const EMAIL = field(/email: '([^']+)'/);
const NAME = field(/\n {2}name: '([^']+)'/);
const AVAILABLE = /availability: \{\s*open: true/.test(profileSource);
// Articles live in their own file; the Writing section appears when there is one, or when
// profile.writing lists work published elsewhere.
const articlesSource = await readFile(fromRoot('src/content/articles.ts'), 'utf8');
const ARTICLES = [...articlesSource.matchAll(/\n {4}slug: '([^']+)'/g)].map((m) => m[1]);
const ARTICLE_TITLES = [...articlesSource.matchAll(/\n {4}title: \{\s*en: '([^']+)',\s*vi: '([^']+)'/g)].map(
  (m) => ({ en: m[1], vi: m[2] }),
);
const HAS_WRITING = ARTICLES.length > 0 || !/\bwriting: \[\]/.test(profileSource);
// Numbered sections: About, Skills, Experience, Projects, [Writing], Contact.
const SECTION_TOTAL = String(5 + (HAS_WRITING ? 1 : 0)).padStart(2, '0');
// <section> elements in <main>: the hero and the numbered sections, plus the feedback band
// when there is feedback.
const MAIN_SECTIONS = 1 + Number(SECTION_TOTAL) + (/\btestimonials: \[\]/.test(profileSource) ? 0 : 1);
const AVAILABILITY_EN = field(/availability: \{\s*open: \w+,\s*label: \{ en: '([^']+)'/);
const SOCIALS = [...profileSource.matchAll(/\{ id: '\w+', label: '([^']+)', url:/g)].map((m) => m[1]);
const STAT_COUNT = (/\n {2}stats: \[([\s\S]*?)\n {2}\],/.exec(profileSource)?.[1].match(/\n {6}id: '/g) ?? [])
  .length;
const TRENDS = (/\n {2}stats: \[([\s\S]*?)\n {2}\],/.exec(profileSource)?.[1].match(/\n {6}trend: \[/g) ?? [])
  .length;
// The four required breakpoints, plus 320 (the narrowest phones still in use, where long
// English labels wrap first), 1024 (where the desktop navigation is at its tightest) and
// 2560 (where the root font size has grown to 125%).
const WIDTHS = [320, 360, 768, 1024, 1280, 1920, 2560];
const FOCUS_EN = [.../focus: \{\s*en: \[([^\]]+)\]/.exec(profileSource)[1].matchAll(/'([^']+)'/g)].map(
  (m) => m[1],
);
const TIME_ZONE = /timeZone: '([^']+)'/.exec(profileSource)?.[1] ?? 'UTC';
const COORDINATES = /coordinates: '([^']+)'/.exec(profileSource)?.[1] ?? '';
const LANGS = ['en', 'vi'];
const SCHEMES = ['dark', 'light'];
const TEXT = {
  en: {
    tagline: field(/tagline: \{\s*en: '([^']+)'/),
    notFound: 'Looks like this page drifted away.',
  },
  vi: {
    tagline: field(/tagline: \{\s*en: '[^']+',\s*vi: '([^']+)'/),
    notFound: 'Có vẻ trang này đã trôi đi mất rồi.',
  },
};
for (const [label, value] of Object.entries({
  EMAIL,
  NAME,
  AVAILABILITY_EN,
  'tagline.en': TEXT.en.tagline,
  'tagline.vi': TEXT.vi.tagline,
})) {
  if (!value) {
    console.error(
      `Could not read ${label} from src/data/profile.ts; the patterns at the top of qa.mjs need updating.`,
    );
    process.exit(1);
  }
}

/* ------------------------------ tiny harness ------------------------------ */

const results = [];
async function check(name, fn) {
  try {
    const note = await fn();
    if (typeof note === 'string' && note.startsWith('SKIP')) {
      results.push({ name, status: 'skip', note });
      console.log(`  -  ${name}  (${note})`);
    } else {
      results.push({ name, status: 'pass', note });
      console.log(`  ✓  ${name}${note ? `  (${note})` : ''}`);
    }
  } catch (error) {
    results.push({ name, status: 'fail', note: error.message });
    console.log(`  ✗  ${name}\n       ${String(error.message).split('\n').join('\n       ')}`);
  }
}
function assert(condition, message) {
  if (!condition) throw new Error(message);
}
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/* --------------------------------- setup ---------------------------------- */

await rm(fromRoot('.qa'), { recursive: true, force: true });
await mkdir(fromRoot('.qa'), { recursive: true });
const server = await startServer(4317);
const BASE = server.url;
const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: process.env.QA_HEADFUL !== '1',
  args: ['--enable-gpu', '--use-angle=metal', '--ignore-gpu-blocklist', '--hide-scrollbars', '--mute-audio'],
});

/**
 * Opens a page in a fresh, isolated context (empty localStorage).
 * `problems` collects everything that should never happen on a healthy page.
 */
async function open(path, options = {}) {
  const {
    width = 1280,
    height = 800,
    scale = 1,
    // The theme the visitor chose. Dark is the default; light is a saved choice.
    scheme = 'dark',
    // What the operating system prefers. The page must not care.
    osScheme = 'dark',
    reducedMotion = false,
    forcedColors = false,
    languages = ['en-US', 'en'],
    init,
    storage = {},
    // The guide bot flies in on the first page view of a session; everywhere else it must sit still.
    firstVisit = false,
    javascript = true,
    abort,
    waitUntil = 'networkidle0',
  } = options;
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  const problems = [];
  const requests = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error' || msg.type() === 'warn')
      problems.push(`console.${msg.type()}: ${msg.text()}`);
  });
  page.on('pageerror', (error) => problems.push(`pageerror: ${error.message}`));
  page.on('requestfailed', (req) =>
    problems.push(`requestfailed: ${req.url()} ${req.failure()?.errorText ?? ''}`),
  );
  page.on('response', (res) => {
    if (res.status() >= 400) problems.push(`http ${res.status()}: ${res.url()}`);
  });
  page.on('request', (req) => requests.push(req.url()));
  if (abort) {
    await page.setRequestInterception(true);
    page.on('request', (req) => (abort(req.url()) ? req.abort() : req.continue()));
  }
  await page.setViewport({ width, height, deviceScaleFactor: scale });
  await page.setJavaScriptEnabled(javascript);
  await page.emulateMediaFeatures([
    { name: 'prefers-color-scheme', value: osScheme },
    { name: 'prefers-reduced-motion', value: reducedMotion ? 'reduce' : 'no-preference' },
    ...(forcedColors ? [{ name: 'forced-colors', value: 'active' }] : []),
  ]);
  await page.evaluateOnNewDocument(
    (langs, saved, returning) => {
      try {
        if (returning) sessionStorage.setItem('portfolio:visited', '1');
      } catch {
        /* storage unavailable */
      }
      Object.defineProperty(navigator, 'languages', { get: () => langs });
      Object.defineProperty(navigator, 'language', { get: () => langs[0] });
      try {
        for (const [key, value] of Object.entries(saved)) {
          if (localStorage.getItem(key) === null) localStorage.setItem(key, value);
        }
      } catch {
        /* storage unavailable */
      }
      // Count WebGL draw calls so the render loop can be observed from outside.
      window.__draws = 0;
      for (const proto of [
        window.WebGL2RenderingContext?.prototype,
        window.WebGLRenderingContext?.prototype,
      ]) {
        if (!proto) continue;
        for (const method of ['drawElements', 'drawArrays']) {
          const original = proto[method];
          proto[method] = function (...args) {
            window.__draws += 1;
            return original.apply(this, args);
          };
        }
      }
    },
    languages,
    scheme === 'light' ? { 'portfolio:theme': 'light', ...storage } : storage,
    !firstVisit,
  );
  if (init) await page.evaluateOnNewDocument(init);
  const response = await page.goto(BASE + path, { waitUntil });
  return { page, context, problems, requests, response, close: () => context.close() };
}

/** Scrolls through the whole page so every scroll-triggered animation has played. */
async function revealAll(page) {
  await page.evaluate(async () => {
    const step = Math.round(window.innerHeight * 0.6);
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      window.scrollTo({ top: y, behavior: 'instant' });
      await new Promise((r) => setTimeout(r, 90));
    }
    window.scrollTo({ top: 0, behavior: 'instant' });
  });
  await sleep(900);
}

const loaded3D = (requests) => requests.some((url) => /\/assets\/Scene3D-.*\.js/.test(url));
const drawsDuring = async (page, ms) => {
  const before = await page.evaluate(() => window.__draws);
  await sleep(ms);
  return (await page.evaluate(() => window.__draws)) - before;
};

/* ============================== 1. HTTP level ============================== */
console.log('\nHTTP and prerendered HTML (no JavaScript involved)');

for (const lang of LANGS) {
  await check(`/${lang} is static HTML with localized meta and content`, async () => {
    const res = await fetch(`${BASE}/${lang}`);
    const html = await res.text();
    assert(res.status === 200, `status ${res.status}`);
    assert(html.includes(`<html lang="${lang}"`), 'wrong <html lang>');
    assert(/<title>[^<]+<\/title>/.test(html), 'missing <title>');
    assert(html.includes(TEXT[lang].tagline), 'tagline is not in the prerendered HTML');
    for (const needle of [
      'name="description"',
      `property="og:image" content="`,
      `/og-${lang}.png?v=`,
      `property="og:locale" content="${lang === 'vi' ? 'vi_VN' : 'en_US'}"`,
      'hreflang="en"',
      'hreflang="vi"',
      'hreflang="x-default"',
      `rel="canonical"`,
      'application/ld+json',
      'Content-Security-Policy',
    ]) {
      assert(html.includes(needle), `missing ${needle}`);
    }
    assert(/property="og:image" content="https?:\/\//.test(html), 'og:image must be an absolute URL');
  });
}

await check('/ serves the redirect page with a <noscript> fallback', async () => {
  const html = await (await fetch(`${BASE}/`)).text();
  assert(html.includes('location.replace'), 'redirect script missing');
  assert(html.includes('<noscript><meta http-equiv="refresh"'), 'noscript fallback missing');
});

await check('unknown URL returns the 404 page with HTTP status 404', async () => {
  const res = await fetch(`${BASE}/this-page-does-not-exist`);
  const html = await res.text();
  assert(res.status === 404, `status ${res.status}`);
  assert(html.includes(TEXT.en.notFound) && html.includes(TEXT.vi.notFound), '404 copy missing');
  assert(html.includes('name="robots" content="noindex"'), '404 should be noindex');
});

await check('an unknown article returns the 404 page', async () => {
  for (const path of ['/en/writing/no-such-article', '/vi/writing', '/en/writing/']) {
    const res = await fetch(`${BASE}${path}`, { redirect: 'manual' });
    // "/en/writing/" first redirects to "/en/writing" (no trailing slash), which is a 404.
    const final = res.status === 308 ? await fetch(`${BASE}${res.headers.get('location')}`) : res;
    assert(final.status === 404, `${path}: status ${final.status}`);
  }
});

await check('/en/ redirects to /en (no trailing slash)', async () => {
  const res = await fetch(`${BASE}/en/`, { redirect: 'manual' });
  assert(res.status === 308 && res.headers.get('location') === '/en', `status ${res.status}`);
});

await check('generated images and icons are served with the right dimensions', async () => {
  const expected = {
    'og-en.png': [1200, 630],
    'og-vi.png': [1200, 630],
    // One link-preview image per article and language.
    ...Object.fromEntries(
      ARTICLES.flatMap((slug) => LANGS.map((lang) => [`og/${slug}-${lang}.png`, [1200, 630]])),
    ),
    'apple-touch-icon.png': [180, 180],
    'icon-192.png': [192, 192],
    'icon-512.png': [512, 512],
  };
  for (const [file, [w, h]] of Object.entries(expected)) {
    const res = await fetch(`${BASE}/${file}`);
    assert(res.status === 200 && res.headers.get('content-type') === 'image/png', `${file}: bad response`);
    const { width, height } = pngSize(Buffer.from(await res.arrayBuffer()));
    assert(width === w && height === h, `${file}: ${width}×${height}, expected ${w}×${h}`);
  }
  for (const file of [
    'favicon.ico',
    'favicon.svg',
    'avatar.webp',
    '404-illustration.svg',
    'site.webmanifest',
    'sitemap.xml',
    'robots.txt',
    'cv-en.pdf',
    'cv-vi.pdf',
  ]) {
    assert((await fetch(`${BASE}/${file}`)).status === 200, `${file} not served`);
  }
  const manifest = await (await fetch(`${BASE}/site.webmanifest`)).json();
  assert(manifest.theme_color === '#0B1F3A', 'manifest theme_color');
});

/* ============================ 2. Responsive matrix ============================ */
console.log(`\nResponsive layout: ${WIDTHS.length} widths × 2 languages × 2 themes`);

for (const lang of LANGS) {
  for (const scheme of SCHEMES) {
    for (const width of WIDTHS) {
      await check(`${lang} ${scheme} ${width}px: no overflow, no console problems`, async () => {
        const { page, problems, close } = await open(`/${lang}`, { width, height: 900, scheme });
        try {
          assert(
            (await page.evaluate(() => document.documentElement.getAttribute('data-theme'))) === scheme,
            'the saved theme is not applied',
          );
          await revealAll(page);
          const layout = await page.evaluate(() => {
            const vw = document.documentElement.clientWidth;
            const offenders = [];
            const clipped = [];
            const squeezed = [];
            const faded = [];
            for (const el of document.querySelectorAll('body *')) {
              if (el.closest('[aria-hidden="true"], .sr-only, script, style, template')) continue;
              const hasText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim() !== '');
              if (!hasText && !['IMG', 'BUTTON', 'A'].includes(el.tagName)) continue;
              const r = el.getBoundingClientRect();
              if (r.width <= 1 || r.height <= 1) continue;
              const label = `<${el.tagName.toLowerCase()}> "${(el.textContent ?? '').trim().slice(0, 40)}"`;
              if (r.left < -0.5 || r.right > vw + 0.5)
                offenders.push(`${label} [${Math.round(r.left)}..${Math.round(r.right)}] of ${vw}`);
              if (
                hasText &&
                el.scrollWidth > el.clientWidth + 1 &&
                getComputedStyle(el).overflowX !== 'visible'
              )
                clipped.push(label);
              // A block narrower than its own longest word: the text spills over its neighbours.
              if (
                hasText &&
                el.clientWidth > 0 &&
                el.scrollWidth > el.clientWidth + 1 &&
                getComputedStyle(el).overflowX === 'visible'
              )
                squeezed.push(`${label} needs ${el.scrollWidth}px, has ${el.clientWidth}px`);
              let node = el;
              let opacity = 1;
              while (node && node !== document.body) {
                opacity *= Number(getComputedStyle(node).opacity);
                node = node.parentElement;
              }
              if (opacity < 0.99) faded.push(`${label} opacity ${opacity.toFixed(2)}`);
            }
            return {
              vw,
              scrollWidth: document.documentElement.scrollWidth,
              bodyScrollWidth: document.body.scrollWidth,
              offenders,
              clipped,
              squeezed,
              faded,
            };
          });
          assert(
            layout.scrollWidth <= layout.vw,
            `page scrolls horizontally: ${layout.scrollWidth} > ${layout.vw}`,
          );
          assert(
            layout.bodyScrollWidth <= layout.vw,
            `body overflows: ${layout.bodyScrollWidth} > ${layout.vw}`,
          );
          assert(
            layout.offenders.length === 0,
            `elements outside the viewport:\n${layout.offenders.slice(0, 6).join('\n')}`,
          );
          assert(layout.clipped.length === 0, `clipped text:\n${layout.clipped.slice(0, 6).join('\n')}`);
          assert(
            layout.squeezed.length === 0,
            `text wider than its box:\n${layout.squeezed.slice(0, 6).join('\n')}`,
          );
          assert(
            layout.faded.length === 0,
            `content still hidden after scrolling:\n${layout.faded.slice(0, 6).join('\n')}`,
          );
          assert(problems.length === 0, problems.join('\n'));
          await page.screenshot({ path: fromRoot(`.qa/${lang}-${scheme}-${width}.png`), fullPage: true });
        } finally {
          await close();
        }
      });
    }
  }
}

/* ============================== 3. Behaviour ============================== */
console.log('\nBehaviour');

await check('content is fully visible with JavaScript disabled', async () => {
  const { page, close } = await open('/vi', { javascript: false, waitUntil: 'load' });
  try {
    const state = await page.evaluate((tagline) => {
      const hidden = [...document.querySelectorAll('main *')].filter((el) => {
        if (el.closest('[aria-hidden="true"], .sr-only')) return false;
        return Number(getComputedStyle(el).opacity) < 1;
      }).length;
      return {
        hidden,
        hasTagline: document.body.innerText.includes(tagline),
        sections: document.querySelectorAll('main section').length,
      };
    }, TEXT.vi.tagline);
    assert(state.hasTagline, 'tagline missing');
    assert(state.sections === MAIN_SECTIONS, `expected ${MAIN_SECTIONS} sections, found ${state.sections}`);
    assert(state.hidden === 0, `${state.hidden} elements are hidden without JavaScript`);
  } finally {
    await close();
  }
});

await check('/ redirects by saved choice, then browser language, then English', async () => {
  const cases = [
    { languages: ['vi-VN', 'vi'], storage: {}, expected: '/vi' },
    { languages: ['fr-FR', 'fr'], storage: {}, expected: '/en' },
    { languages: ['en-US'], storage: { 'portfolio:lang': 'vi' }, expected: '/vi' },
    { languages: ['vi-VN'], storage: { 'portfolio:lang': 'en' }, expected: '/en' },
  ];
  for (const c of cases) {
    const { page, problems, close } = await open('/', c);
    try {
      const path = new URL(page.url()).pathname;
      assert(
        path === c.expected,
        `languages=${c.languages} storage=${JSON.stringify(c.storage)} → ${path}, expected ${c.expected}`,
      );
      assert(problems.length === 0, problems.join('\n'));
    } finally {
      await close();
    }
  }
  const { page, close } = await open('/?ref=cv#projects', { languages: ['vi'] });
  try {
    assert(page.url().endsWith('/vi?ref=cv#projects'), `query/hash lost: ${page.url()}`);
  } finally {
    await close();
  }
});

await check('language switch keeps the section in place, updates URL, lang, title and storage', async () => {
  const { page, problems, close } = await open('/en', { width: 1280 });
  try {
    await revealAll(page);
    const worst = { delta: 0, id: '' };
    for (const id of ['about', 'skills', 'experience', 'projects', 'contact']) {
      await page.evaluate((target) => {
        const el = document.getElementById(target);
        window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 40, behavior: 'instant' });
      }, id);
      await sleep(150);
      const before = await page.evaluate(
        (target) => document.getElementById(target).getBoundingClientRect().top,
        id,
      );
      const toVi = (await page.evaluate(() => document.documentElement.lang)) === 'en';
      await page.click(`nav button[aria-label="${toVi ? 'Switch to Vietnamese' : 'Chuyển sang tiếng Anh'}"]`);
      await page.waitForFunction((l) => document.documentElement.lang === l, {}, toVi ? 'vi' : 'en');
      await sleep(100);
      const after = await page.evaluate(
        (target) => document.getElementById(target).getBoundingClientRect().top,
        id,
      );
      const delta = Math.abs(after - before);
      if (delta > worst.delta) Object.assign(worst, { delta, id });
    }
    assert(worst.delta <= 1.5, `section "${worst.id}" jumped by ${worst.delta.toFixed(1)}px`);
    const state = await page.evaluate(() => ({
      path: location.pathname,
      lang: document.documentElement.lang,
      title: document.title,
      stored: localStorage.getItem('portfolio:lang'),
      canonical: document.querySelector('link[rel="canonical"]').getAttribute('href'),
    }));
    assert(state.path === `/${state.lang}`, `URL ${state.path} does not match lang ${state.lang}`);
    assert(state.stored === state.lang, 'choice not saved');
    assert(state.canonical.endsWith(`/${state.lang}`), 'canonical not updated');
    await page.goBack();
    await sleep(200);
    const back = await page.evaluate(() => ({
      path: location.pathname,
      lang: document.documentElement.lang,
    }));
    assert(back.path === `/${back.lang}`, 'back button did not restore the language');
    assert(problems.length === 0, problems.join('\n'));
    return `largest shift ${worst.delta.toFixed(2)}px`;
  } finally {
    await close();
  }
});

await check('theme button toggles Dark and Light, persists, and ignores the OS setting', async () => {
  // The operating system prefers light here; the page must still open dark.
  const { page, problems, close } = await open('/en', { osScheme: 'light' });
  try {
    const state = () =>
      page.evaluate(() => {
        const button = document.querySelector('[data-testid="theme-toggle"]');
        return {
          theme: document.documentElement.getAttribute('data-theme'),
          mode: document.documentElement.getAttribute('data-theme-mode'),
          stored: localStorage.getItem('portfolio:theme'),
          bg: getComputedStyle(document.body).backgroundColor,
          themeColor: document.querySelector('meta[name="theme-color"]').content,
          label: button.getAttribute('aria-label'),
          icons: [...button.querySelectorAll('svg')].filter((svg) => getComputedStyle(svg).display !== 'none')
            .length,
          choices: button.querySelectorAll('svg').length,
        };
      });
    const toggleTo = async (theme) => {
      await page.click('[data-testid="theme-toggle"]');
      await page.waitForFunction(
        (value) => document.documentElement.getAttribute('data-theme') === value,
        {},
        theme,
      );
      await sleep(900); // let the ripple finish
      return state();
    };
    const expectState = (actual, expected) => {
      for (const [key, value] of Object.entries(expected)) {
        assert(
          actual[key] === value,
          `${key} is ${JSON.stringify(actual[key])}, expected ${JSON.stringify(value)}`,
        );
      }
    };

    expectState(await state(), {
      theme: 'dark',
      mode: null,
      stored: null,
      bg: 'rgb(10, 15, 26)',
      label: 'Theme: Dark. Switch to: Light',
      icons: 1,
      choices: 2,
    });
    expectState(await toggleTo('light'), {
      stored: 'light',
      bg: 'rgb(248, 250, 252)',
      themeColor: '#f8fafc',
      label: 'Theme: Light. Switch to: Dark',
      icons: 1,
    });
    await page.reload({ waitUntil: 'networkidle0' });
    // The saved choice is applied before paint and survives hydration.
    expectState(await state(), { theme: 'light', label: 'Theme: Light. Switch to: Dark' });
    expectState(await toggleTo('dark'), {
      stored: 'dark',
      bg: 'rgb(10, 15, 26)',
      themeColor: '#0a0f1a',
      label: 'Theme: Dark. Switch to: Light',
      icons: 1,
    });

    // The OS switching while the page is open changes nothing either.
    await page.emulateMediaFeatures([
      { name: 'prefers-color-scheme', value: 'dark' },
      { name: 'prefers-reduced-motion', value: 'no-preference' },
    ]);
    await page.emulateMediaFeatures([
      { name: 'prefers-color-scheme', value: 'light' },
      { name: 'prefers-reduced-motion', value: 'no-preference' },
    ]);
    await sleep(300);
    expectState(await state(), { theme: 'dark', stored: 'dark' });
    assert(problems.length === 0, problems.join('\n'));
  } finally {
    await close();
  }
});

await check(
  'keyboard: skip link first, every stop has a visible focus ring, all controls reachable',
  async () => {
    const { page, problems, close } = await open('/en', { width: 1280 });
    try {
      await page.keyboard.press('Tab');
      await sleep(400); // the skip link slides in
      const first = await page.evaluate(() => {
        const el = document.activeElement;
        const r = el.getBoundingClientRect();
        return {
          text: el.textContent,
          href: el.getAttribute('href'),
          visible: r.width > 40 && r.height > 20 && r.top >= 0,
        };
      });
      assert(
        first.href === '#main' && first.visible,
        `first Tab stop is not a visible skip link: ${JSON.stringify(first)}`,
      );
      await page.keyboard.press('Enter');
      await sleep(100);
      assert(
        (await page.evaluate(() => document.activeElement.id)) === 'main',
        'skip link did not move focus to <main>',
      );

      // Start again from the top of the document, then walk the whole tab order.
      await page.goto(`${BASE}/en`, { waitUntil: 'networkidle0' });
      const stops = [];
      for (let i = 0; i < 60; i += 1) {
        await page.keyboard.press('Tab');
        const stop = await page.evaluate(() => {
          const el = document.activeElement;
          if (!el || el === document.body) return null;
          const style = getComputedStyle(el);
          return {
            name: (el.getAttribute('aria-label') ?? el.textContent ?? '')
              .trim()
              .replace(/\s+/g, ' ')
              .slice(0, 40),
            ring: style.outlineStyle !== 'none' && Number.parseFloat(style.outlineWidth) >= 2,
          };
        });
        if (!stop) break;
        if (stops.length > 0 && stop.name === stops[0].name) break;
        stops.push(stop);
      }
      const names = stops.map((s) => s.name);
      const withoutRing = stops.filter((s) => !s.ring).map((s) => s.name);
      assert(withoutRing.length === 0, `no visible focus ring on: ${withoutRing.join(', ')}`);
      for (const expected of [
        'Skip to content',
        'About',
        'Contact',
        'Switch to Vietnamese',
        'Theme: Dark',
        'View projects',
        'Get in touch',
        'Open the command menu',
        'Copy email',
        'Download CV',
        ...SOCIALS,
        'Ask Kai',
      ]) {
        assert(
          names.some((n) => n.startsWith(expected)),
          `"${expected}" is not reachable with Tab. Stops: ${names.join(' | ')}`,
        );
      }
      assert(problems.length === 0, problems.join('\n'));
      return `${stops.length} tab stops`;
    } finally {
      await close();
    }
  },
);

await check('mobile menu: opens, Esc closes and restores focus, link click closes', async () => {
  const { page, problems, close } = await open('/vi', { width: 360, height: 740 });
  try {
    const button = 'nav button[aria-controls]';
    const menuVisible = () =>
      page.evaluate(() => {
        const menu = document.getElementById(
          document.querySelector('nav button[aria-controls]').getAttribute('aria-controls'),
        );
        return menu.getBoundingClientRect().height > 0;
      });
    assert(!(await menuVisible()), 'menu should start closed');
    await page.click(button);
    assert(await menuVisible(), 'menu did not open');
    assert(
      (await page.evaluate(() => document.activeElement.getAttribute('href'))) === '#about',
      'focus should move into the menu',
    );
    await page.keyboard.press('Escape');
    assert(!(await menuVisible()), 'Esc did not close the menu');
    assert(
      await page.evaluate(() => document.activeElement.hasAttribute('aria-controls')),
      'focus not returned to the menu button',
    );
    await page.click(button);
    const menuLink = await page.evaluateHandle(() => {
      const id = document.querySelector('nav button[aria-controls]').getAttribute('aria-controls');
      return document.getElementById(id).querySelector('a[href="#projects"]');
    });
    await menuLink.click();
    await sleep(600);
    assert(!(await menuVisible()), 'menu did not close after choosing a link');
    assert((await page.evaluate(() => location.hash)) === '#projects', 'did not navigate to the section');
    assert(problems.length === 0, problems.join('\n'));
  } finally {
    await close();
  }
});

await check('navigation highlights the section being viewed', async () => {
  const { page, close } = await open('/en', { width: 1280, reducedMotion: true });
  try {
    for (const id of ['skills', 'projects', 'contact']) {
      await page.evaluate(
        (target) => document.getElementById(target).scrollIntoView({ behavior: 'instant', block: 'start' }),
        id,
      );
      await page.waitForFunction(
        (target) =>
          document.querySelector('nav a[aria-current="location"]')?.getAttribute('href') === `#${target}`,
        { timeout: 3000 },
        id,
      );
    }
  } finally {
    await close();
  }
});

await check('copy button puts the email on the clipboard and confirms', async () => {
  const { page, context, problems, close } = await open('/vi', { width: 1280 });
  try {
    await context.overridePermissions(BASE, [
      'clipboard-read',
      'clipboard-write',
      'clipboard-sanitized-write',
    ]);
    await page.bringToFront();
    await revealAll(page);
    await page.evaluate(() => document.getElementById('contact').scrollIntoView({ behavior: 'instant' }));
    const clicked = await page.evaluateHandle(() =>
      [...document.querySelectorAll('#contact button')].find((b) => b.textContent.includes('Sao chép email')),
    );
    await clicked.click();
    await page.waitForFunction(
      () =>
        [...document.querySelectorAll('#contact button')].some((b) => b.textContent.includes('Đã sao chép')),
      { timeout: 3000 },
    );
    const clipboard = await page.evaluate(() => navigator.clipboard.readText());
    assert(clipboard === EMAIL, `clipboard contains "${clipboard}"`);
    assert(problems.length === 0, problems.join('\n'));
  } finally {
    await close();
  }
});

await check('404 page: right language before paint, correct home link, no errors', async () => {
  for (const [storage, lang] of [
    [{}, 'en'],
    [{ 'portfolio:lang': 'vi' }, 'vi'],
  ]) {
    const { page, problems, response, close } = await open('/khong-ton-tai', { storage });
    try {
      assert(response.status() === 404, `status ${response.status()}`);
      const state = await page.evaluate(() => ({
        lang: document.documentElement.lang,
        h1: document.querySelector('h1').textContent,
        home: document.querySelector('main a').getAttribute('href'),
        title: document.title,
      }));
      assert(state.lang === lang, `lang ${state.lang}, expected ${lang}`);
      assert(state.h1.includes(TEXT[lang].notFound), `h1 "${state.h1}"`);
      assert(state.home === `/${lang}`, `home link ${state.home}`);
      // The 404 response for the document itself is expected; anything else is a problem.
      const unexpected = problems.filter((p) => !p.includes('khong-ton-tai') && !p.includes('status of 404'));
      assert(unexpected.length === 0, unexpected.join('\n'));
    } finally {
      await close();
    }
  }
});

await check('reduced motion: decorative animations are switched off', async () => {
  const { page, close } = await open('/en', { reducedMotion: true });
  try {
    const durations = await page.evaluate(() =>
      [...document.querySelectorAll('[class*="animate-"]')].map((el) =>
        Number.parseFloat(getComputedStyle(el).animationDuration),
      ),
    );
    assert(durations.length > 0, 'no animated elements found');
    assert(
      durations.every((d) => d < 0.001),
      `animation durations: ${durations.join(', ')}s`,
    );
    // The typed line and the counters must not animate either.
    await sleep(3500);
    const still = await page.evaluate(() => ({
      typed: document.querySelector('[data-typed]').textContent,
      stats: [...document.querySelectorAll('#top dl dd .tabular-nums')].map((el) => el.textContent),
      final: [...document.querySelectorAll('#top dl dd .tabular-nums')].map(
        (el) => el.nextElementSibling.textContent,
      ),
    }));
    assert(still.typed === FOCUS_EN[0], `typed line moved: "${still.typed}"`);
    assert(still.stats.length === STAT_COUNT, `expected ${STAT_COUNT} counters, found ${still.stats.length}`);
    assert(still.stats.join() === still.final.join(), `counters are animating: ${still.stats.join()}`);
  } finally {
    await close();
  }
});

/* ================== 3b. Tech layer, big screens, print, contrast ================== */
console.log('\nTech layer, large screens, print and high contrast');

await check('hero: status chip, typed focus line, and the stats strip above the fold', async () => {
  const html = await (await fetch(`${BASE}/en`)).text();
  assert(
    new RegExp(`data-typed=""[^>]*>${FOCUS_EN[0]}<`).test(html),
    'the first focus phrase is not in the prerendered HTML',
  );
  for (const [width, height] of [
    [1280, 800],
    [1920, 1080],
  ]) {
    const { page, problems, close } = await open('/en', { width, height });
    try {
      // The typed text must keep changing, and only ever show a prefix of a real phrase.
      const seen = new Set();
      for (let i = 0; i < 70; i += 1) {
        seen.add(await page.evaluate(() => document.querySelector('[data-typed]').textContent));
        await sleep(100);
      }
      const invalid = [...seen].filter((text) => !FOCUS_EN.some((phrase) => phrase.startsWith(text)));
      assert(seen.size >= 5, `typed line is not animating (${seen.size} distinct values)`);
      assert(invalid.length === 0, `typed line showed: ${invalid.join(' | ')}`);

      const hero = await page.evaluate((label) => {
        const dl = document.querySelector('#top dl');
        const items = [...dl.querySelectorAll('dd .tabular-nums')];
        return {
          chip: [...document.querySelectorAll('#top p')].some((p) => p.textContent.includes(label)),
          spoken: document.querySelector('[data-typed]').closest('p').querySelector('.sr-only').textContent,
          count: items.length,
          shown: items.map((el) => el.textContent),
          final: items.map((el) => el.nextElementSibling.textContent),
          bottom: dl.getBoundingClientRect().bottom,
          viewport: window.innerHeight,
        };
      }, AVAILABILITY_EN);
      assert(hero.chip === AVAILABLE, `availability chip ${hero.chip ? 'shown' : 'missing'}`);
      assert(hero.spoken === `Focus areas: ${FOCUS_EN.join(', ')}`, `screen-reader text: "${hero.spoken}"`);
      assert(hero.count === STAT_COUNT, `expected ${STAT_COUNT} stats, found ${hero.count}`);
      assert(hero.shown.join() === hero.final.join(), `counters did not settle: ${hero.shown.join()}`);
      assert(
        hero.bottom <= hero.viewport,
        `${width}×${height}: stats strip ends at ${Math.round(hero.bottom)}px, below the fold`,
      );
      assert(problems.length === 0, problems.join('\n'));
    } finally {
      await close();
    }
  }
});

await check(
  'decorative layer: ticker runs, code card and wireframes render, all hidden from AT',
  async () => {
    const { page, problems, close } = await open('/vi', { scheme: 'light' });
    try {
      await revealAll(page);
      const x = () =>
        page.evaluate(() => document.querySelector('.animate-marquee').getBoundingClientRect().x);
      const before = await x();
      await sleep(500);
      assert((await x()) < before - 5, 'the ticker is not moving');
      const state = await page.evaluate(() => {
        const hidden = (el) => el.closest('[aria-hidden="true"]') !== null;
        const code = document.querySelector('.code-window');
        const frames = [...document.querySelectorAll('#projects svg[viewBox="0 0 400 190"]')];
        return {
          tickerHidden: hidden(document.querySelector('.animate-marquee')),
          codeHidden: hidden(code),
          codeBg: getComputedStyle(code).backgroundColor,
          codeText: code.textContent,
          frames: frames.length,
          // A card with a real screenshot shows it instead of a wireframe.
          shots: document.querySelectorAll('#projects article img').length,
          framesHidden: frames.every(hidden),
          frameHeights: frames.map((svg) => Math.round(svg.getBoundingClientRect().height)),
          cards: document.querySelectorAll('#projects article').length,
          numerals: [...document.querySelectorAll('.section-numeral')].map((el) => el.dataset.index).join(),
        };
      });
      assert(
        state.tickerHidden && state.codeHidden && state.framesHidden,
        'a decorative block is exposed to AT',
      );
      assert(
        state.codeBg === 'rgb(11, 22, 38)',
        `code card must stay dark in the light theme, got ${state.codeBg}`,
      );
      assert(state.codeText.includes(`name: '${NAME}'`), 'code card does not show the profile name');
      assert(state.codeText.includes(`available: ${AVAILABLE}`), 'code card does not show availability');
      assert(state.codeText.includes('TP. Hồ Chí Minh'), 'code card is not localized');
      assert(
        state.frames + state.shots === state.cards && state.cards > 0,
        `${state.frames} wireframes and ${state.shots} screenshots for ${state.cards} cards`,
      );
      assert(
        state.frameHeights.every((h) => h > 100),
        `wireframe heights: ${state.frameHeights.join()}`,
      );
      const numerals = Array.from({ length: Number(SECTION_TOTAL) }, (_, i) =>
        String(i + 1).padStart(2, '0'),
      ).join();
      assert(state.numerals === numerals, `section numerals: ${state.numerals}`);
      assert(problems.length === 0, problems.join('\n'));
    } finally {
      await close();
    }
  },
);

for (const width of [360, 1280]) {
  await check(`live telemetry at ${width}px: real Web Vitals, layout shift "good", local clock`, async () => {
    const { page, problems, close } = await open('/en', { width, height: 800 });
    try {
      await sleep(1500);
      const state = await page.evaluate(() => ({
        tiles: Object.fromEntries(
          [...document.querySelectorAll('[data-vital]')].map((tile) => [
            tile.dataset.vital,
            {
              value: tile.querySelector('dd span').textContent.trim(),
              rating: tile.querySelector('[data-rating]').dataset.rating,
            },
          ]),
        ),
        clock: document.querySelector('[data-clock]').textContent,
      }));
      const ids = Object.keys(state.tiles);
      assert(ids.join() === 'ttfb,fcp,lcp,cls', `tiles: ${ids.join()}`);
      for (const [id, tile] of Object.entries(state.tiles)) {
        assert(tile.value !== '--', `${id} was never measured`);
        assert(tile.rating === 'good', `${id} is rated "${tile.rating}" (${tile.value}) on a local server`);
      }
      assert(/^\d+ ms$/.test(state.tiles.ttfb.value), `TTFB format: ${state.tiles.ttfb.value}`);
      assert(/^\d\.\d\d s$/.test(state.tiles.lcp.value), `LCP format: ${state.tiles.lcp.value}`);
      assert(Number(state.tiles.cls.value) < 0.1, `CLS is ${state.tiles.cls.value}`);

      const format = new Intl.DateTimeFormat('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: TIME_ZONE,
        timeZoneName: 'shortOffset',
      });
      const now = Date.now();
      const acceptable = [now - 60_000, now, now + 60_000].map((ms) => format.format(new Date(ms)));
      assert(acceptable.includes(state.clock), `clock shows "${state.clock}", expected ${acceptable[1]}`);
      assert(problems.length === 0, problems.join('\n'));
      const { ttfb, fcp, lcp, cls } = state.tiles;
      return `TTFB ${ttfb.value}, FCP ${fcp.value}, LCP ${lcp.value}, CLS ${cls.value}`;
    } finally {
      await close();
    }
  });
}

await check('header: indicator slides under the active link; progress bar fills at the bottom', async () => {
  const { page, problems, close } = await open('/vi', { width: 1280 });
  try {
    await page.evaluate(() =>
      document.querySelector('#experience').scrollIntoView({ behavior: 'instant', block: 'start' }),
    );
    await sleep(1100);
    const nav = await page.evaluate(() => {
      const link = document.querySelector('header a[aria-current="location"]');
      const bar = document.querySelector('header ul + span');
      const l = link.getBoundingClientRect();
      const b = bar.getBoundingClientRect();
      return {
        href: link.getAttribute('href'),
        opacity: getComputedStyle(bar).opacity,
        leftGap: b.left - l.left,
        rightGap: l.right - b.right,
        below: b.top >= l.top + l.height / 2 && b.bottom <= l.bottom + 4,
      };
    });
    assert(nav.href === '#experience', `active link is ${nav.href}`);
    assert(nav.opacity === '1', 'indicator is not visible');
    assert(
      Math.abs(nav.leftGap - 12) <= 2 && Math.abs(nav.rightGap - 12) <= 2 && nav.below,
      `indicator is misplaced: ${JSON.stringify(nav)}`,
    );

    if (!(await page.evaluate(() => CSS.supports('animation-timeline: scroll()'))))
      return 'SKIP part: scroll-driven animations unsupported, progress bar not checked';
    const fill = () =>
      page.evaluate(
        () => document.querySelector('.scroll-progress').getBoundingClientRect().width / window.innerWidth,
      );
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await sleep(200);
    const top = await fill();
    await page.evaluate(() =>
      window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }),
    );
    await sleep(200);
    const bottom = await fill();
    assert(
      top < 0.02 && bottom > 0.98,
      `progress bar: ${top.toFixed(2)} at the top, ${bottom.toFixed(2)} at the bottom`,
    );
    assert(problems.length === 0, problems.join('\n'));
  } finally {
    await close();
  }
});

await check('pointer: the spotlight follows the cursor and the border beam lights up', async () => {
  const { page, problems, close } = await open('/en', { width: 1280 });
  try {
    const box = await page.evaluate(() => {
      const r = document.querySelector('#top [data-spotlight]').getBoundingClientRect();
      return { x: r.x, y: r.y, w: r.width, h: r.height };
    });
    await page.mouse.move(box.x + 10, box.y + 10);
    await page.mouse.move(box.x + box.w * 0.25, box.y + box.h * 0.5, { steps: 6 });
    await sleep(700);
    const lit = await page.evaluate(() => {
      const card = document.querySelector('#top [data-spotlight]');
      return {
        x: Number.parseFloat(card.style.getPropertyValue('--spot-x')),
        spot: getComputedStyle(card, '::after').opacity,
        beam: getComputedStyle(card, '::before').opacity,
        running: getComputedStyle(card, '::before').animationPlayState,
      };
    });
    assert(Math.abs(lit.x - box.w * 0.25) < 3, `--spot-x is ${lit.x}, expected about ${box.w * 0.25}`);
    assert(lit.spot === '1', `spotlight opacity ${lit.spot}`);
    assert(lit.beam === '1' && lit.running === 'running', `beam: ${JSON.stringify(lit)}`);
    assert(problems.length === 0, problems.join('\n'));
  } finally {
    await close();
  }
});

await check('2560px: the layout scales up instead of sitting in a narrow column', async () => {
  const { page, close } = await open('/en', { width: 2560, height: 1440 });
  try {
    const big = await page.evaluate(() => ({
      root: Number.parseFloat(getComputedStyle(document.documentElement).fontSize),
      content: document.querySelector('.container-x').getBoundingClientRect().width / window.innerWidth,
      h1: Number.parseFloat(getComputedStyle(document.querySelector('h1 .text-gradient')).fontSize),
      statsBottom: document.querySelector('#top dl').getBoundingClientRect().bottom,
      viewport: window.innerHeight,
    }));
    assert(big.root === 20, `root font size is ${big.root}px, expected 20px`);
    assert(big.content >= 0.6, `content uses ${(big.content * 100).toFixed(0)}% of the width`);
    assert(big.h1 >= 88, `name is only ${big.h1}px tall`);
    assert(big.statsBottom <= big.viewport, 'stats strip is below the fold');
    return `content ${(big.content * 100).toFixed(0)}% of the width, name ${big.h1}px`;
  } finally {
    await close();
  }
});

await check('print: light, no page chrome, nothing hidden, links spelled out, a few pages', async () => {
  // Worst case: the visitor chose the dark theme and never scrolled.
  const { page, close } = await open('/en', { storage: { 'portfolio:theme': 'dark' } });
  try {
    await page.emulateMediaType('print');
    const paper = await page.evaluate(() => {
      // An element with no boxes is not printed, whether it or an ancestor is display: none.
      const printed = (selector) => document.querySelector(selector).getClientRects().length > 0;
      return {
        bg: getComputedStyle(document.body).backgroundColor,
        fg: getComputedStyle(document.body).color,
        header: printed('header'),
        footer: printed('footer'),
        ticker: printed('.animate-marquee'),
        code: printed('.code-window'),
        hud: printed('[data-hero-visual]'),
        statusBar: printed('[data-status-bar]'),
        hiddenReveals: [...document.querySelectorAll('[data-reveal]')].filter(
          (el) => getComputedStyle(el).opacity !== '1',
        ).length,
        link: getComputedStyle(document.querySelector('a[data-print-url]'), '::after').content,
        contact: [...document.querySelectorAll('#top p')].some((p) => p.textContent.includes('@')),
      };
    });
    assert(paper.bg === 'rgb(255, 255, 255)', `paper background is ${paper.bg}`);
    assert(paper.fg === 'rgb(11, 31, 58)', `ink colour is ${paper.fg}`);
    for (const part of ['header', 'footer', 'ticker', 'code', 'hud', 'statusBar']) {
      assert(!paper[part], `the ${part} is printed`);
    }
    assert(paper.hiddenReveals === 0, `${paper.hiddenReveals} blocks would print invisible`);
    assert(paper.link.includes('https://'), `link target not printed: ${paper.link}`);
    assert(paper.contact, 'contact line missing from the printed header');
    const pdf = Buffer.from(await page.pdf({ format: 'A4', printBackground: true }));
    const pages = pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g)?.length ?? 0;
    assert(pages >= 1 && pages <= 4, `prints on ${pages} pages`);
    return `${pages} A4 pages`;
  } finally {
    await close();
  }
});

await check(
  'forced colours: buttons keep an outline, selected items are marked, decoration is dropped',
  async () => {
    const { page, problems, close } = await open('/en', { width: 1280, forcedColors: true });
    try {
      await page.evaluate(() =>
        document.querySelector('#skills').scrollIntoView({ behavior: 'instant', block: 'start' }),
      );
      await sleep(900);
      const hc = await page.evaluate(() => {
        const style = (el) => getComputedStyle(el);
        const button = document.querySelector('#top a[href="#projects"]');
        const [active, inactive] = ['EN', 'VI'].map((code) =>
          [...document.querySelectorAll('header button span')].find(
            (el) => el.textContent.toUpperCase() === code,
          ),
        );
        return {
          active: matchMedia('(forced-colors: active)').matches,
          border: `${style(button).borderTopWidth} ${style(button).borderTopStyle}`,
          pillAdjust: style(active).forcedColorAdjust,
          pillBg: style(active).backgroundColor,
          otherBg: style(inactive).backgroundColor,
          current: style(document.querySelector('header a[aria-current="location"]')).textDecorationLine,
          grid: style(document.querySelector('.tech-grid')).display,
          numeral: style(document.querySelector('.section-numeral')).display,
        };
      });
      assert(hc.active, 'forced-colors emulation is not active');
      assert(hc.border === '1px solid', `primary button border: ${hc.border}`);
      assert(hc.pillAdjust === 'none' && hc.pillBg !== hc.otherBg, `language pill: ${JSON.stringify(hc)}`);
      assert(hc.current.includes('underline'), `active nav link decoration: ${hc.current}`);
      assert(hc.grid === 'none' && hc.numeral === 'none', 'decorative layers are still drawn');
      assert(problems.length === 0, problems.join('\n'));
    } finally {
      await close();
    }
  },
);

await check('hero stats: one trend line per stat that has a trend, drawn and hidden from AT', async () => {
  const { page, problems, close } = await open('/en', { width: 360, height: 740 });
  try {
    const lines = await page.evaluate(() =>
      [...document.querySelectorAll('#top dl dd svg')].map((svg) => {
        const r = svg.getBoundingClientRect();
        const box = svg.closest('dd > span').getBoundingClientRect();
        return {
          width: r.width,
          height: r.height,
          hidden: svg.closest('[aria-hidden="true"]') !== null,
          paths: [...svg.querySelectorAll('path')].map((path) => path.getAttribute('d')),
          inside: r.left >= box.left - 1 && r.right <= box.right + 1,
        };
      }),
    );
    assert(lines.length === TRENDS, `${lines.length} trend lines for ${TRENDS} stats with a trend`);
    for (const line of lines) {
      assert(line.width >= 40 && line.height >= 20, `trend line is ${line.width}×${line.height}px`);
      assert(line.hidden, 'trend line is exposed to AT');
      assert(line.inside, 'trend line overflows its stat tile at 360px');
      assert(
        line.paths.length === 2 && line.paths.every((d) => /^M[\d. ]+( L[\d. ]+)+/.test(d)),
        `malformed path: ${line.paths.join(' | ')}`,
      );
    }
    assert(problems.length === 0, problems.join('\n'));
  } finally {
    await close();
  }
});

await check('hero HUD: coordinates, pointer readout and render mode match what is on screen', async () => {
  const { page, problems, close } = await open('/en', { width: 1280, height: 800 });
  try {
    await sleep(3500); // long enough for the 3D scene to take over where it can
    await page.mouse.move(320, 200);
    await page.mouse.move(960, 200, { steps: 4 });
    await sleep(200);
    const hud = await page.evaluate(() => {
      const visual = document.querySelector('[data-hero-visual]');
      const readouts = [...visual.querySelectorAll('p')].map((p) =>
        p.textContent.replace(/\s+/g, ' ').trim(),
      );
      return {
        mode: visual.getAttribute('data-hero-visual'),
        shown: visual.querySelector('[data-render-mode]').textContent,
        readouts,
        visible: [...visual.querySelectorAll('p')].every((p) => p.getBoundingClientRect().width > 0),
      };
    });
    assert(hud.visible, 'HUD readouts are not drawn at 1280px');
    assert(hud.readouts[0] === COORDINATES, `coordinates readout: "${hud.readouts[0]}"`);
    assert(
      hud.shown === (hud.mode === '3d' ? 'WEBGL' : 'CSS'),
      `readout says ${hud.shown} while the hero is ${hud.mode}`,
    );
    // Pointer at (960, 200) in a 1280×800 window is +0.50 / +0.50 from the centre.
    assert(/^X \+0\.50\s*Y \+0\.50/.test(hud.readouts[1]), `pointer readout: "${hud.readouts[1]}"`);
    assert(problems.length === 0, problems.join('\n'));
    return hud.readouts[1];
  } finally {
    await close();
  }
});

await check('section kickers decode into their real text and stay there', async () => {
  const { page, problems, close } = await open('/vi', { width: 1280 });
  try {
    await revealAll(page);
    await sleep(900);
    const kickers = await page.evaluate(() =>
      [...document.querySelectorAll('[data-decode]')].map((el) => ({
        shown: el.textContent,
        real: el.previousElementSibling.textContent,
        hidden: el.getAttribute('aria-hidden') === 'true',
      })),
    );
    assert(kickers.length >= 4, `only ${kickers.length} decoding kickers found`);
    const wrong = kickers.filter((k) => k.shown !== k.real || !k.hidden);
    assert(wrong.length === 0, `kickers did not settle: ${wrong.map((k) => `"${k.shown}"`).join(', ')}`);
    assert(problems.length === 0, problems.join('\n'));
    return `${kickers.length} kickers`;
  } finally {
    await close();
  }
});

await check('status bar: follows the section and scroll position, stays out of the tab order', async () => {
  const { page, problems, close } = await open('/en', { width: 1280, height: 800 });
  try {
    const read = () =>
      page.evaluate(() => {
        const bar = document.querySelector('[data-status-bar]');
        const r = bar.getBoundingClientRect();
        const pct = bar.querySelector('.scroll-pct');
        return {
          hidden: bar.getAttribute('aria-hidden') === 'true',
          tabbable: [...bar.querySelectorAll('a, button, input, [tabindex]')].filter((el) => el.tabIndex >= 0)
            .length,
          pinned: Math.abs(r.bottom - window.innerHeight) < 1 && r.left === 0 && r.height <= 40,
          section: bar.querySelector('[data-status-section]').textContent.replace(/\s+/g, ' ').trim(),
          text: bar.textContent,
          clock: bar.querySelector('[data-clock]').textContent,
          pageClock: document.querySelector('footer [data-clock]').textContent,
          pct:
            getComputedStyle(pct).display === 'none'
              ? null
              : getComputedStyle(pct).getPropertyValue('--scroll-pct').trim(),
        };
      });
    const top = await read();
    assert(top.hidden && top.tabbable === 0, 'the bar must be decorative: aria-hidden and not focusable');
    assert(top.pinned, 'the bar is not pinned to the bottom edge');
    assert(top.section === `00/${SECTION_TOTAL} ${NAME}`, `at the top the bar shows "${top.section}"`);
    assert(top.text.includes('1280×800'), `window size readout missing: ${top.text}`);
    assert(top.clock === top.pageClock && /^\d\d:\d\d GMT/.test(top.clock), `clock shows "${top.clock}"`);
    if (AVAILABLE) assert(top.text.includes(AVAILABILITY_EN), 'availability label missing');

    await page.evaluate(() =>
      document.getElementById('projects').scrollIntoView({ behavior: 'instant', block: 'start' }),
    );
    await page.waitForFunction(
      (label) => document.querySelector('[data-status-section]').textContent.includes(label),
      { timeout: 3000 },
      `04/${SECTION_TOTAL}`,
    );
    const middle = await read();
    assert(
      middle.section === `04/${SECTION_TOTAL} Projects`,
      `in Projects the bar shows "${middle.section}"`,
    );

    await page.evaluate(() =>
      window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }),
    );
    await sleep(300);
    const bottom = await read();
    if (top.pct !== null) {
      assert(top.pct === '0', `scroll readout at the top: ${top.pct}%`);
      assert(bottom.pct === '100', `scroll readout at the bottom: ${bottom.pct}%`);
    }

    // Jumping straight between the two ends of the page crosses no section boundary slowly
    // enough to be seen; the bar must still know where it is.
    assert(
      bottom.section === `${SECTION_TOTAL}/${SECTION_TOTAL} Contact`,
      `at the end of the page the bar shows "${bottom.section}"`,
    );
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await page.waitForFunction(
      (label) => document.querySelector('[data-status-section]').textContent.includes(label),
      { timeout: 3000 },
      `00/${SECTION_TOTAL}`,
    );
    assert(problems.length === 0, problems.join('\n'));
    return top.pct === null ? 'scroll readout unsupported in this browser' : undefined;
  } finally {
    await close();
  }
});

for (const [index, slug] of ARTICLES.entries()) {
  await check(`article "${slug}": prerendered, linked from Writing, readable at every width`, async () => {
    for (const lang of LANGS) {
      const path = `/${lang}/writing/${slug}`;
      const title = ARTICLE_TITLES[index]?.[lang] ?? '';

      // Without JavaScript: the whole text is in the HTML, with article metadata for previews.
      const html = await (await fetch(`${BASE}${path}`)).text();
      assert(
        html.includes(`<h1 id="article-title"`) && html.includes(title),
        `${path}: title missing from the HTML`,
      );
      assert(html.includes('"@type":"BlogPosting"'), `${path}: BlogPosting JSON-LD missing`);
      assert(
        html.includes('<meta property="og:type" content="article" />'),
        `${path}: og:type is not article`,
      );
      assert(
        html.includes(`hreflang="${lang === 'en' ? 'vi' : 'en'}" href="`),
        `${path}: no link to the other language`,
      );
      // A shared link shows the article's own image (served and sized: see the HTTP checks).
      const image = new RegExp(`content="https?://[^"]+/og/${slug}-${lang}\\.png\\?v=[0-9a-z]+"`, 'g');
      assert(
        (html.match(image) ?? []).length === 2,
        `${path}: og:image and twitter:image should both be the article's own image`,
      );

      // The Writing section of the home page links to it.
      const home = await (await fetch(`${BASE}/${lang}`)).text();
      assert(home.includes(`href="${path}"`), `/${lang} does not link to ${path}`);

      for (const width of [360, 1280]) {
        const { page, problems, close } = await open(path, { width, height: 800 });
        try {
          const state = await page.evaluate(() => ({
            h1: document.querySelector('h1')?.textContent ?? '',
            overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
            sections: [...document.querySelectorAll('[data-article-section]')].map((el) => el.id),
            toc: [...document.querySelectorAll('nav[aria-labelledby="article-toc"] a')].map((a) =>
              a.getAttribute('href'),
            ),
            tocVisible:
              getComputedStyle(document.querySelector('nav[aria-labelledby="article-toc"]')).display !==
              'none',
            canonical: document.querySelector('link[rel="canonical"]')?.getAttribute('href') ?? '',
            title: document.title,
          }));
          assert(state.h1 === title, `${path} at ${width}px: h1 is "${state.h1}"`);
          assert(state.overflow <= 0, `${path} at ${width}px: ${state.overflow}px of horizontal scroll`);
          assert(state.sections.length > 1, `${path}: no sections`);
          assert(
            state.toc.join() === state.sections.map((id) => `#${id}`).join(),
            `${path}: contents ${state.toc.join()} do not match sections ${state.sections.join()}`,
          );
          assert(
            state.tocVisible === width >= 1024,
            `${path} at ${width}px: side contents visible = ${state.tocVisible}`,
          );
          // Hydration must keep what the server rendered (title, canonical).
          assert(
            state.title.startsWith(title) && state.canonical.endsWith(path),
            `${path}: head changed after load`,
          );
          if (width === 1280) {
            // Scrolled to the last section, the contents mark it as the one being read.
            const last = state.sections.at(-1);
            await page.evaluate((id) => {
              const top = document.getElementById(id).getBoundingClientRect().top + window.scrollY - 100;
              window.scrollTo({ top, behavior: 'instant' });
            }, last);
            await page.waitForFunction(
              (id) =>
                document
                  .querySelector('nav[aria-labelledby="article-toc"] [aria-current="location"]')
                  ?.getAttribute('href') === `#${id}`,
              { timeout: 3000 },
              last,
            );
            // The language button opens the same article in the other language.
            const other = lang === 'en' ? 'vi' : 'en';
            await Promise.all([
              page.waitForNavigation({ waitUntil: 'load' }),
              page.click(`header button[aria-label]:not([data-testid])`),
            ]);
            assert(new URL(page.url()).pathname === `/${other}/writing/${slug}`, `switched to ${page.url()}`);
            await page.screenshot({ path: fromRoot(`.qa/article-${slug}-${other}-1280.png`) });
          } else {
            await page.screenshot({ path: fromRoot(`.qa/article-${slug}-${lang}-${width}.png`) });
          }
          assert(problems.length === 0, problems.join('\n'));
        } finally {
          await close();
        }
      }
    }
  });
}

for (const [lang, width] of [
  ['en', 360],
  ['vi', 360],
  ['vi', 768],
]) {
  await check(`status bar at ${width}px (${lang}): fits on one line and never covers the page`, async () => {
    const { page, problems, close } = await open(`/${lang}`, { width, height: 740 });
    try {
      const section = () =>
        page.evaluate(() => document.querySelector('[data-status-section]').textContent.slice(0, 5));
      // revealAll ends with a jump from the footer (taller than a phone screen) back to the top.
      await revealAll(page);
      assert(
        (await section()) === `00/${SECTION_TOTAL}`,
        `back at the top the bar still shows ${await section()}`,
      );
      await page.evaluate(() =>
        window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }),
      );
      await sleep(300);
      assert(
        (await section()) === `${SECTION_TOTAL}/${SECTION_TOTAL}`,
        `at the end of the page the bar shows ${await section()}`,
      );
      const state = await page.evaluate(() => {
        const bar = document.querySelector('[data-status-bar]');
        const barBox = bar.getBoundingClientRect();
        const row = bar.firstElementChild;
        // Everything a visitor can read or press at the end of the page.
        const covered = [];
        for (const el of document.querySelectorAll('main *, footer *')) {
          if (el.closest('[aria-hidden="true"], .sr-only')) continue;
          const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim() !== '');
          if (!own && !['A', 'BUTTON', 'IMG'].includes(el.tagName)) continue;
          const r = el.getBoundingClientRect();
          if (r.height <= 1 || r.bottom <= barBox.top + 0.5 || r.top >= window.innerHeight) continue;
          covered.push(`<${el.tagName.toLowerCase()}> "${el.textContent.trim().slice(0, 40)}"`);
        }
        return {
          height: barBox.height,
          overflow: row.scrollWidth - row.clientWidth,
          parts: [...row.querySelectorAll('span, button')]
            .filter((el) => el.children.length === 0 || el.hasAttribute('data-status-section'))
            .filter((el) => {
              const r = el.getBoundingClientRect();
              return r.width > 0 && (r.left < -0.5 || r.right > window.innerWidth + 0.5);
            }).length,
          covered,
        };
      });
      assert(state.height <= 40, `the bar is ${state.height}px tall`);
      assert(state.overflow <= 0 && state.parts === 0, 'the bar content does not fit on one line');
      assert(
        state.covered.length === 0,
        `hidden behind the bar at the end of the page:\n${state.covered.slice(0, 6).join('\n')}`,
      );
      assert(problems.length === 0, problems.join('\n'));
      await page.screenshot({ path: fromRoot(`.qa/status-bar-${lang}-${width}.png`) });
    } finally {
      await close();
    }
  });
}

await check(
  'command menu: lazy chunk, opens by shortcut, "/" and button, filters, runs commands, restores focus',
  async () => {
    const { page, problems, requests, close } = await open('/en', { width: 1280 });
    try {
      const chunkLoaded = () => requests.some((url) => /\/assets\/CommandPalette-.*\.js/.test(url));
      const isOpen = () => page.evaluate(() => document.querySelector('dialog.palette')?.open === true);
      const waitOpen = () => page.waitForSelector('dialog.palette[open]', { timeout: 5000 });
      const waitClosed = () =>
        page.waitForFunction(() => !document.querySelector('dialog.palette'), { timeout: 3000 });
      const options = () =>
        page.evaluate(() =>
          [...document.querySelectorAll('dialog.palette [role="option"]')].map(
            (option) => option.querySelector('span:not(.sr-only)').textContent,
          ),
        );
      const shortcut = async () => {
        await page.keyboard.down('Control');
        await page.keyboard.press('k');
        await page.keyboard.up('Control');
      };

      assert(!chunkLoaded(), 'the command menu chunk was downloaded before anyone opened it');
      await shortcut();
      await waitOpen();
      assert(chunkLoaded(), 'the command menu did not come from its own chunk');
      const state = await page.evaluate(() => {
        const dialog = document.querySelector('dialog.palette');
        const input = dialog.querySelector('input');
        const r = dialog.getBoundingClientRect();
        return {
          modal: dialog.matches(':modal'),
          focused: document.activeElement === input,
          combobox: input.getAttribute('role') === 'combobox' && input.getAttribute('aria-controls') !== null,
          active: document
            .getElementById(input.getAttribute('aria-activedescendant'))
            ?.getAttribute('aria-selected'),
          inside: r.left >= 0 && r.right <= window.innerWidth && r.bottom <= window.innerHeight,
        };
      });
      assert(state.modal && state.focused, `dialog is not a focused modal: ${JSON.stringify(state)}`);
      assert(state.combobox && state.active === 'true', `combobox wiring: ${JSON.stringify(state)}`);
      assert(state.inside, 'the menu does not fit in the window');
      const all = await options();
      assert(all.length >= 12, `only ${all.length} commands listed`);
      await page.screenshot({ path: fromRoot('.qa/command-menu.png') });

      // Filter, then run: the menu closes and the page goes to the section.
      await page.keyboard.type('proj');
      const filtered = await options();
      assert(
        filtered.length < all.length && filtered[0] === 'Projects',
        `"proj" lists: ${filtered.join(' | ')}`,
      );
      await page.keyboard.press('Enter');
      await waitClosed();
      await page.waitForFunction(() => location.hash === '#projects', { timeout: 3000 });

      // A query with no match says so instead of showing an empty box.
      await page.keyboard.press('/');
      await waitOpen();
      await page.keyboard.type('zzzz');
      const empty = await page.evaluate(() => ({
        options: document.querySelectorAll('dialog.palette [role="option"]').length,
        status: document.querySelector('dialog.palette [role="status"]').textContent,
      }));
      assert(
        empty.options === 0 && empty.status === 'No matching command.',
        `empty state: ${JSON.stringify(empty)}`,
      );
      await page.keyboard.press('Escape');
      await waitClosed();

      // Opened from the header button, Esc gives the focus back to that button.
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
      await page.click('[data-testid="command-menu"]');
      await waitOpen();
      await page.keyboard.press('Escape');
      await waitClosed();
      assert(
        await page.evaluate(() => document.activeElement.dataset.testid === 'command-menu'),
        'focus was not returned to the button that opened the menu',
      );

      // A theme command applies at once and leaves the menu open; the shortcut toggles it shut.
      await shortcut();
      await waitOpen();
      await page.keyboard.type('theme light');
      await page.keyboard.press('Enter');
      await page.waitForFunction(() => document.documentElement.getAttribute('data-theme') === 'light', {
        timeout: 3000,
      });
      assert(await isOpen(), 'the menu closed after a theme command');
      await shortcut();
      await waitClosed();

      // Language command: same page in Vietnamese, and the menu follows the language.
      await shortcut();
      await waitOpen();
      await page.keyboard.type('vietnamese');
      await page.keyboard.press('Enter');
      await page.waitForFunction(
        () => location.pathname === '/vi' && document.documentElement.lang === 'vi',
        {
          timeout: 3000,
        },
      );
      await shortcut();
      await waitOpen();
      const label = await page.evaluate(() =>
        document.querySelector('dialog.palette').getAttribute('aria-label'),
      );
      assert(label === 'Bảng lệnh', `menu title after switching language: "${label}"`);
      assert(problems.length === 0, problems.join('\n'));
      return `${all.length} commands`;
    } finally {
      await close();
    }
  },
);

await check('command menu at 360px: fits the screen', async () => {
  const { page, problems, close } = await open('/vi', { width: 360, height: 740 });
  try {
    await page.keyboard.press('/');
    await page.waitForSelector('dialog.palette[open]', { timeout: 5000 });
    const fit = await page.evaluate(() => {
      const r = document.querySelector('dialog.palette').getBoundingClientRect();
      const input = document.querySelector('dialog.palette input');
      return {
        inside: r.left >= 0 && r.right <= window.innerWidth && r.bottom <= window.innerHeight,
        scroll: document.documentElement.scrollWidth <= window.innerWidth,
        fontSize: Number.parseFloat(getComputedStyle(input).fontSize),
      };
    });
    assert(fit.inside && fit.scroll, `the menu overflows a 360px screen: ${JSON.stringify(fit)}`);
    assert(problems.length === 0, problems.join('\n'));
    await page.screenshot({ path: fromRoot('.qa/command-menu-360.png') });
  } finally {
    await close();
  }
});

await check('display headings: thin weight, serif accent on the given name, one line', async () => {
  const GIVEN = field(/\n {2}givenName: '([^']+)'/);
  for (const [lang, width, height] of [
    ['en', 1280, 800],
    ['vi', 1280, 800],
    ['vi', 360, 740],
  ]) {
    const { page, problems, close } = await open(`/${lang}`, { width, height });
    try {
      await page.evaluate(() => document.fonts.ready);
      const type = await page.evaluate((given) => {
        const name = document.querySelector('#hero-title > span:last-child');
        const accent = name.querySelector('em');
        const h2 = document.querySelector('main h2');
        const style = (el) => getComputedStyle(el);
        return {
          text: name.textContent,
          accent: accent.textContent,
          weight: style(name).fontWeight,
          accentFamily: style(accent).fontFamily,
          accentStyle: style(accent).fontStyle,
          gradient: style(accent).backgroundImage.includes('gradient'),
          thinLoaded: document.fonts.check('300 1em "Space Grotesk"', name.textContent),
          headingFamily: style(h2).fontFamily,
          bodyFamily: style(document.body).fontFamily,
          bodyLoaded: document.fonts.check('400 1em "Inter"', document.querySelector('#about p').textContent),
          serifLoaded: document.fonts.check('italic 400 1em "Playfair Display"', given),
          lines: Math.round(name.getBoundingClientRect().height / Number.parseFloat(style(name).lineHeight)),
          h2Weight: style(h2).fontWeight,
          h2Size: Number.parseFloat(style(h2).fontSize),
        };
      }, GIVEN);
      const where = `${lang} ${width}px`;
      assert(type.text === NAME && type.accent === GIVEN, `${where}: name reads "${type.text}"`);
      assert(
        type.weight === '300' && type.h2Weight === '300',
        `${where}: weights ${type.weight}/${type.h2Weight}`,
      );
      assert(
        type.accentFamily.includes('Playfair Display') && type.accentStyle === 'italic' && type.gradient,
        `${where}: accent is ${type.accentFamily} ${type.accentStyle}`,
      );
      assert(type.thinLoaded && type.serifLoaded, `${where}: display fonts did not load`);
      assert(
        type.headingFamily.includes('Space Grotesk') && /^"?Inter/.test(type.bodyFamily) && type.bodyLoaded,
        `${where}: headings in ${type.headingFamily}, text in ${type.bodyFamily}, Inter loaded: ${type.bodyLoaded}`,
      );
      assert(type.lines === 1, `${where}: the name wraps onto ${type.lines} lines`);
      assert(type.h2Size >= 36, `${where}: section heading is only ${type.h2Size}px`);
      assert(problems.length === 0, problems.join('\n'));
    } finally {
      await close();
    }
  }
  // On paper the headings go back to the bold sans face: thin strokes print badly.
  const { page, close } = await open('/vi');
  try {
    await page.emulateMediaType('print');
    const paper = await page.evaluate(() => {
      const style = (selector) => getComputedStyle(document.querySelector(selector));
      return {
        h1: style('#hero-title').fontWeight,
        accent: `${style('#hero-title em').fontStyle} ${style('#hero-title em').fontFamily}`,
        h2: style('main h2').fontWeight,
      };
    });
    assert(paper.h1 === '700' && paper.h2 === '700', `printed weights ${paper.h1}/${paper.h2}`);
    assert(
      paper.accent.startsWith('normal') && !paper.accent.includes('Playfair'),
      `printed ${paper.accent}`,
    );
  } finally {
    await close();
  }
});

await check(
  'starfield: behind the page in the dark theme, not drawn in light, print or forced colours',
  async () => {
    const sky = (page) =>
      page.evaluate(() => {
        const el = document.querySelector('.starfield');
        const style = getComputedStyle(el);
        const dots = getComputedStyle(el, '::before');
        const heading = document.querySelector('#about h2').getBoundingClientRect();
        return {
          hidden: el.getAttribute('aria-hidden') === 'true',
          shown: style.display !== 'none',
          fixed: style.position === 'fixed' && style.zIndex === '-1' && style.pointerEvents === 'none',
          fills: el.getBoundingClientRect().width === window.innerWidth,
          layers: dots.backgroundImage.split('radial-gradient').length - 1,
          star: getComputedStyle(document.documentElement).getPropertyValue('--star').trim(),
          heroLayers:
            getComputedStyle(document.querySelector('#top .stars')).backgroundImage.split('radial-gradient')
              .length - 1,
          // Whatever is under the middle of a heading must be the page, never the sky.
          onTop: document.elementFromPoint(heading.left + 10, heading.top + heading.height / 2)?.tagName,
        };
      });
    const dark = await open('/en');
    try {
      await dark.page.evaluate(() =>
        document.getElementById('about').scrollIntoView({ behavior: 'instant', block: 'start' }),
      );
      const night = await sky(dark.page);
      assert(
        night.hidden && night.shown && night.fixed && night.fills,
        `sky layer: ${JSON.stringify(night)}`,
      );
      assert(
        night.layers >= 9 && night.heroLayers >= 9,
        `only ${night.layers}/${night.heroLayers} star layers`,
      );
      assert(
        night.star !== 'transparent' && night.star !== '',
        `--star is "${night.star}" in the dark theme`,
      );
      assert(night.onTop === 'H2', `the heading is covered by <${night.onTop}>`);
      assert(dark.problems.length === 0, dark.problems.join('\n'));
      await dark.page.emulateMediaType('print');
      assert(!(await sky(dark.page)).shown, 'the sky is printed');
    } finally {
      await dark.close();
    }
    const light = await open('/en', { scheme: 'light' });
    try {
      const day = await sky(light.page);
      assert(day.star === 'transparent', `--star is "${day.star}" in the light theme`);
    } finally {
      await light.close();
    }
    const contrast = await open('/en', { forcedColors: true });
    try {
      assert(!(await sky(contrast.page)).shown, 'the sky is drawn in forced-colours mode');
    } finally {
      await contrast.close();
    }
  },
);

await check(
  'section rail: wide screens only, appears after the hero, follows the section, decorative',
  async () => {
    const read = (page) =>
      page.evaluate(() => {
        const rail = document.querySelector('[data-section-rail]');
        const style = getComputedStyle(rail);
        const r = rail.getBoundingClientRect();
        const content = document.querySelector('#about .container-x');
        const pad = Number.parseFloat(getComputedStyle(content).paddingRight);
        return {
          display: style.display,
          opacity: style.opacity,
          hidden: rail.getAttribute('aria-hidden') === 'true',
          tabbable: [...rail.querySelectorAll('a, button, [tabindex]')].filter((el) => el.tabIndex >= 0)
            .length,
          items: [...rail.querySelectorAll('a')].map((a) => a.getAttribute('href')).join(),
          active: rail.querySelector('a[data-active]')?.getAttribute('href') ?? null,
          // Numbers and ticks only: the labels are transparent until hovered.
          marks: Math.min(
            ...[...rail.querySelectorAll('a > span.tabular-nums')].map(
              (el) => el.getBoundingClientRect().left,
            ),
          ),
          contentRight: content.getBoundingClientRect().right - pad,
          inside: r.right <= window.innerWidth && r.top >= 64 && r.bottom <= window.innerHeight - 28,
          status: document.querySelector('[data-status-section]').textContent.trim().slice(0, 2),
        };
      });
    const { page, problems, close } = await open('/en', { width: 1280, height: 800 });
    try {
      const top = await read(page);
      assert(top.hidden && top.tabbable === 0, 'the rail must be decorative: aria-hidden and not focusable');
      const rail = `#top,#about,#skills,#experience,#projects${HAS_WRITING ? ',#writing' : ''},#contact`;
      assert(top.items === rail, `rail lists ${top.items}`);
      assert(
        top.display === 'block' && top.opacity === '0',
        `over the hero the rail is ${top.display}/${top.opacity}`,
      );

      await page.evaluate(() =>
        document.getElementById('projects').scrollIntoView({ behavior: 'instant', block: 'start' }),
      );
      await page.waitForFunction(
        () =>
          document.querySelector('[data-section-rail] a[data-active]')?.getAttribute('href') === '#projects',
        { timeout: 3000 },
      );
      await sleep(700);
      const middle = await read(page);
      assert(middle.opacity === '1', `in Projects the rail opacity is ${middle.opacity}`);
      assert(middle.status === '04', `status bar says ${middle.status} while the rail says #projects`);
      assert(middle.inside, 'the rail leaves the window or runs under the header or status bar');
      assert(
        middle.marks >= middle.contentRight,
        `the rail starts at ${Math.round(middle.marks)}px, over the content that ends at ${Math.round(middle.contentRight)}px`,
      );
      await page.screenshot({ path: fromRoot('.qa/section-rail-1280.png') });

      await page.evaluate(() => document.querySelector('[data-section-rail] a[href="#about"]').click());
      await page.waitForFunction(
        () => document.querySelector('[data-section-rail] a[data-active]')?.getAttribute('href') === '#about',
        { timeout: 5000 },
      );
      assert(new URL(page.url()).hash === '#about', `clicking 01 went to ${page.url()}`);
      assert(problems.length === 0, problems.join('\n'));
    } finally {
      await close();
    }
    const narrow = await open('/en', { width: 1024, height: 768 });
    try {
      assert((await read(narrow.page)).display === 'none', 'the rail is shown at 1024px');
    } finally {
      await narrow.close();
    }
  },
);

await check(
  'header: becomes a floating glass pill after scrolling, a solid bar on small screens',
  async () => {
    const read = (page) =>
      page.evaluate(() => {
        const header = document.querySelector('header');
        const nav = header.querySelector('nav');
        const style = getComputedStyle(nav);
        const r = nav.getBoundingClientRect();
        const alpha = (color) => (color === 'rgba(0, 0, 0, 0)' || color === 'transparent' ? 0 : 1);
        return {
          radius: Number.parseFloat(style.borderTopLeftRadius),
          navBg: alpha(style.backgroundColor),
          blur: style.backdropFilter,
          headerBg: alpha(getComputedStyle(header).backgroundColor),
          top: Math.round(r.top),
          left: Math.round(r.left),
          right: Math.round(window.innerWidth - r.right),
          logo: Math.round(nav.querySelector('a img').getBoundingClientRect().left),
          last: Math.round(nav.querySelector('[data-testid="theme-toggle"]').getBoundingClientRect().right),
          fits: nav.scrollWidth <= nav.clientWidth,
        };
      });
    const scrollDown = async (page) => {
      await page.evaluate(() => window.scrollTo({ top: 600, behavior: 'instant' }));
      await page.waitForSelector('nav[data-pill]', { timeout: 3000 });
      await sleep(700);
    };
    for (const [lang, width, height] of [
      ['en', 1280, 800],
      ['vi', 768, 1024],
    ]) {
      const { page, problems, close } = await open(`/${lang}`, { width, height });
      try {
        const top = await read(page);
        assert(
          top.navBg === 0 && top.headerBg === 0 && top.top === 0,
          `${width}px at the top: ${JSON.stringify(top)}`,
        );
        await scrollDown(page);
        const pill = await read(page);
        assert(
          pill.radius >= 24 && pill.navBg === 1 && pill.blur.includes('blur'),
          `${width}px: not a glass pill: ${JSON.stringify(pill)}`,
        );
        assert(pill.headerBg === 0, `${width}px: the bar behind the pill is still painted`);
        assert(
          pill.top >= 8 && pill.left >= 8 && pill.right >= 8,
          `${width}px: the pill touches the window edge: ${JSON.stringify(pill)}`,
        );
        assert(pill.fits, `${width}px: the navigation does not fit inside the pill`);
        assert(
          Math.abs(pill.logo - top.logo) <= 1 && Math.abs(pill.last - top.last) <= 1,
          `${width}px: the links move sideways when the pill appears (${top.logo}→${pill.logo}, ${top.last}→${pill.last})`,
        );
        assert(problems.length === 0, problems.join('\n'));
        await page.screenshot({ path: fromRoot(`.qa/header-pill-${width}.png`) });
      } finally {
        await close();
      }
    }
    const small = await open('/en', { width: 360, height: 740 });
    try {
      await scrollDown(small.page);
      const bar = await read(small.page);
      assert(
        bar.radius === 0 && bar.headerBg === 1 && bar.top === 0 && bar.left === 0,
        `360px: ${JSON.stringify(bar)}`,
      );
    } finally {
      await small.close();
    }
  },
);

await check(
  'guide bot: on the first visit its head flies in (pops up on a phone) and lands in the ring; later views sit still',
  async () => {
    const where = (page) =>
      page.evaluate(() => {
        const button = document.querySelector('[data-assistant] button');
        const r = button.getBoundingClientRect();
        const head = button.querySelector('.bot-fly svg').getBoundingClientRect();
        const x = head.left + head.width / 2;
        const y = head.top + head.height / 2;
        return {
          right: Math.round(window.innerWidth - r.right),
          bottom: Math.round(window.innerHeight - r.bottom),
          size: Math.round(r.width),
          // How far the head is from the middle of its ring, and how big it is drawn.
          away: Math.round(Math.hypot(x - (r.left + r.width / 2), y - (r.top + r.height / 2))),
          head: Math.round(head.width),
          underHead: document.elementFromPoint(x, y)?.closest('[data-assistant]') != null,
          flying: document.documentElement.hasAttribute('data-first-visit'),
          visited: sessionStorage.getItem('portfolio:visited'),
        };
      });
    // The ring never moves. The head idles with a slow float of a few pixels.
    const atRest = (spot) => spot.right === 16 && spot.bottom === 40 && spot.size === 56;
    const headHome = (spot) => spot.away <= 14 && spot.head >= 38 && spot.head <= 43;

    const first = await open('/en', { firstVisit: true, waitUntil: 'domcontentloaded' });
    try {
      await sleep(2300);
      const air = await where(first.page);
      assert(air.flying, 'a first visit is not marked with data-first-visit');
      assert(atRest(air), `the ring left its corner during the flight: ${JSON.stringify(air)}`);
      assert(air.away > 200 && air.head > 60, `2.3s in, the head is not in flight: ${JSON.stringify(air)}`);
      assert(!air.underHead, 'in flight the head sits between the pointer and the page');
      await first.page.screenshot({ path: fromRoot('.qa/bot-flight.png') });

      await first.page.waitForFunction(() => !document.documentElement.hasAttribute('data-first-visit'), {
        timeout: 6000,
      });
      const landed = await where(first.page);
      assert(atRest(landed), `after the flight the ring is at ${JSON.stringify(landed)}`);
      assert(headHome(landed), `the head did not land in the ring: ${JSON.stringify(landed)}`);
      assert(landed.visited === '1', `the visit was not remembered: ${JSON.stringify(landed)}`);

      // Having landed, Kai says hello for a few seconds; pressing the bubble opens the chat.
      const hello = () =>
        first.page.evaluate(() => {
          const bubble = document.querySelector('[data-bot-greeting]');
          const r = bubble.getBoundingClientRect();
          return {
            state: bubble.dataset.botGreeting,
            text: bubble.textContent,
            opacity: getComputedStyle(bubble).opacity,
            inside:
              r.left >= 0 && r.right <= window.innerWidth && r.top >= 0 && r.bottom <= window.innerHeight,
            // The status bar is pinned to the bottom of the window, in front of the page.
            clearOfBar: r.bottom <= document.querySelector('[data-status-bar]').getBoundingClientRect().top,
          };
        });
      await sleep(700);
      const greeting = await hello();
      assert(
        greeting.state === 'shown' && greeting.opacity === '1' && greeting.inside && greeting.clearOfBar,
        `after landing the greeting is ${JSON.stringify(greeting)}`,
      );
      assert(greeting.text.startsWith("Hi, I'm Kai"), `Kai greets with "${greeting.text}"`);
      await first.page.click('[data-bot-greeting]');
      await first.page.waitForSelector('[data-assistant-panel]', { timeout: 5000 });
      assert((await hello()).state === 'hidden', 'the greeting stays up over the open chat');
      await first.page.keyboard.press('Escape');

      // Same tab, second page view: no flight.
      await first.page.reload({ waitUntil: 'domcontentloaded' });
      await sleep(1500);
      const again = await where(first.page);
      assert(
        !again.flying &&
          atRest(again) &&
          headHome(again) &&
          (await first.page.$eval('[data-bot-greeting]', (el) => el.dataset.botGreeting)) === 'hidden',
        `on the second view: ${JSON.stringify(again)}`,
      );
      assert(first.problems.length === 0, first.problems.join('\n'));
    } finally {
      await first.close();
    }

    const calm = await open('/en', { firstVisit: true, reducedMotion: true, waitUntil: 'domcontentloaded' });
    try {
      await sleep(1500);
      const still = await where(calm.page);
      assert(
        !still.flying && atRest(still) && headHome(still),
        `with reduced motion: ${JSON.stringify(still)}`,
      );
    } finally {
      await calm.close();
    }

    // Below 1024px the sphere sits under the text: the head only pops up in its ring, and the
    // greeting, which covers part of a phone screen, goes away as soon as the page scrolls.
    const phone = await open('/en', {
      width: 390,
      height: 844,
      firstVisit: true,
      waitUntil: 'domcontentloaded',
    });
    try {
      await sleep(1200);
      const popping = await where(phone.page);
      assert(popping.away <= 14, `on a phone the head flies across the page: ${JSON.stringify(popping)}`);
      await sleep(1600);
      const landed = await where(phone.page);
      const greeting = () => phone.page.$eval('[data-bot-greeting]', (el) => el.dataset.botGreeting);
      assert(!landed.flying && landed.away <= 14, `on a phone, after the pop: ${JSON.stringify(landed)}`);
      assert((await greeting()) === 'shown', 'on a phone Kai does not say hello');
      await phone.page.evaluate(() => window.scrollBy(0, 200));
      await sleep(300);
      assert((await greeting()) === 'hidden', 'the greeting stays up after the page scrolled');
      assert(phone.problems.length === 0, phone.problems.join('\n'));
    } finally {
      await phone.close();
    }
  },
);

await check(
  'pause motion: the footer switch stops what loops, survives a reload, and turns it back on',
  async () => {
    const { page, problems, close } = await open('/en');
    try {
      const state = () =>
        page.evaluate(() => ({
          motion: document.documentElement.dataset.motion ?? null,
          marquee: getComputedStyle(document.querySelector('[class*="animate-marquee"]')).animationPlayState,
          visual: document.querySelector('[data-hero-visual]')?.dataset.heroVisual,
          label: document.querySelector('[data-motion-toggle]')?.textContent,
        }));
      const before = await state();
      assert(before.motion === null && before.marquee === 'running', `at first: ${JSON.stringify(before)}`);
      await page.click('[data-motion-toggle]');
      const paused = await state();
      assert(
        paused.motion === 'paused' && paused.marquee === 'paused' && paused.label === 'Resume motion',
        `after pausing: ${JSON.stringify(paused)}`,
      );
      await page.reload({ waitUntil: 'networkidle0' });
      await sleep(1500);
      const reloaded = await state();
      assert(
        reloaded.motion === 'paused' && reloaded.marquee === 'paused' && reloaded.visual === 'static',
        `after a reload: ${JSON.stringify(reloaded)}`,
      );
      await page.click('[data-motion-toggle]');
      const resumed = await state();
      assert(
        resumed.motion === null && resumed.marquee === 'running',
        `after resuming: ${JSON.stringify(resumed)}`,
      );
      assert(problems.length === 0, problems.join('\n'));
    } finally {
      await close();
    }
  },
);

await check(
  'guide bot panel: lazy chunk, answers from profile.ts, section links, Esc restores focus',
  async () => {
    const loadedPanel = (requests) => requests.some((url) => /\/assets\/AssistantPanel-.*\.js/.test(url));
    const state = (page) =>
      page.evaluate(() => {
        const button = document.querySelector('[data-assistant] > button');
        const panel = document.querySelector('[data-assistant-panel]');
        return {
          name: button.getAttribute('aria-label'),
          expanded: button.getAttribute('aria-expanded'),
          controls: button.getAttribute('aria-controls'),
          panelId: panel?.id ?? null,
          focus: (document.activeElement?.textContent ?? '').trim(),
          focusIsBot: document.activeElement === button,
          live: panel?.querySelector('[role="log"]')?.getAttribute('aria-live') ?? null,
          note: panel?.textContent.includes('No AI') ?? false,
        };
      });
    const BOT = '[data-assistant] > button';
    const PANEL = '[data-assistant-panel]';
    const { page, problems, requests, close } = await open('/en', { width: 1280, height: 800 });
    try {
      const closed = await state(page);
      assert(closed.name === 'Ask Kai' && closed.expanded === 'false', JSON.stringify(closed));
      assert(!loadedPanel(requests), 'the panel chunk is downloaded before the bot is opened');

      await page.click(BOT);
      await page.waitForSelector(PANEL, { timeout: 5000 });
      await sleep(400);
      const opened = await state(page);
      assert(loadedPanel(requests), 'the panel is not a separate chunk');
      assert(opened.expanded === 'true' && opened.controls === opened.panelId, JSON.stringify(opened));
      assert(opened.focus.startsWith('What does'), `focus went to "${opened.focus}"`);
      assert(opened.live === 'polite', 'answers are not announced (aria-live)');
      assert(opened.note, 'the panel does not say that the answers are ready-made');

      // No key is configured here: ready-made answers only, and no field to type into.
      await page.waitForSelector(`${PANEL}[data-ai="off"]`, { timeout: 3000 });
      assert((await page.$(`${PANEL} input`)) === null, 'a question field is shown although the AI is off');
      const questions = await page.$$(`${PANEL} ul button`);
      assert(questions.length === 5, `${questions.length} questions`);
      await page.click(`${PANEL} [data-topic="ai"]`);
      await page.waitForSelector(`${PANEL} [data-answer="ai"]`, { timeout: 2000 });
      await page.click(`${PANEL} [data-topic="contact"]`);
      await page.waitForSelector(`${PANEL} [data-answer="contact"]`, { timeout: 2000 });
      const answer = await page.$eval(`${PANEL} [data-answer="contact"]`, (el) => el.textContent);
      assert(answer.includes(EMAIL), `the contact answer does not carry the email: "${answer}"`);

      await page.click(`${PANEL} [data-answer="contact"] a`);
      await sleep(300);
      assert(new URL(page.url()).hash === '#contact', `"Take me there" went to ${page.url()}`);
      assert((await page.$(PANEL)) === null, 'the panel stays open after following its link');

      await page.click(BOT);
      await page.waitForSelector(PANEL, { timeout: 5000 });
      await page.keyboard.press('Escape');
      await sleep(200);
      assert((await page.$(PANEL)) === null, 'Esc does not close the panel');
      assert((await state(page)).focusIsBot, 'Esc does not give the focus back to the bot');

      await page.click(BOT);
      await page.waitForSelector(PANEL, { timeout: 5000 });
      await page.mouse.click(200, 300);
      await sleep(200);
      assert((await page.$(PANEL)) === null, 'a click outside does not close the panel');
      assert(problems.length === 0, problems.join('\n'));

      await page.emulateMediaType('print');
      const printed = await page.evaluate(
        () => document.querySelector('[data-assistant]').getClientRects().length > 0,
      );
      assert(!printed, 'the bot is printed');
    } finally {
      await close();
    }

    const phone = await open('/vi', { width: 360, height: 740 });
    try {
      await phone.page.click(BOT);
      await phone.page.waitForSelector(PANEL, { timeout: 5000 });
      const buttons = await phone.page.$$(`${PANEL} ul button`);
      await buttons[0].click();
      await sleep(500);
      const fit = await phone.page.evaluate(() => {
        const r = document.querySelector('[data-assistant-panel]').getBoundingClientRect();
        return {
          inside: r.left >= 0 && r.right <= window.innerWidth && r.top >= 0 && r.bottom <= window.innerHeight,
          scroll: document.documentElement.scrollWidth <= window.innerWidth,
          title: document.querySelector('[data-assistant-panel]').getAttribute('aria-label'),
        };
      });
      assert(fit.inside && fit.scroll, `the panel overflows a 360px screen: ${JSON.stringify(fit)}`);
      assert(fit.title === 'Kai', `panel is labelled "${fit.title}"`);
      assert(phone.problems.length === 0, phone.problems.join('\n'));
      await phone.page.screenshot({ path: fromRoot('.qa/bot-panel-360.png') });
    } finally {
      await phone.close();
    }
  },
);

await check(
  'Kai with AI: typed questions go through /api/chat, the key stays on the server, limits hold',
  async () => {
    const KEY = 'qa-secret-key-0123456789';
    const REPLY = 'Kiệt làm việc với React và TypeScript.';
    // A stand-in for the Gemini API: records what it is sent, answers as told.
    const calls = [];
    let mode = 'ok';
    const stub = createServer((req, res) => {
      let raw = '';
      req.on('data', (chunk) => (raw += chunk));
      req.on('end', () => {
        calls.push({ url: req.url, key: req.headers['x-goog-api-key'], body: JSON.parse(raw) });
        if (mode === 'quota') {
          res.writeHead(429, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: { code: 'rate_limit_exceeded', message: 'quota' } }));
          return;
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ candidates: [{ content: { role: 'model', parts: [{ text: REPLY }] } }] }));
      });
    });
    await new Promise((resolve) => stub.listen(4319, '127.0.0.1', resolve));
    process.env.GEMINI_API_KEY = KEY;
    process.env.GEMINI_API_URL = 'http://127.0.0.1:4319/v1beta/models';
    resetRateLimit();

    const PANEL = '[data-assistant-panel]';
    const post = (body, headers = { Origin: BASE }) =>
      fetch(`${BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: typeof body === 'string' ? body : JSON.stringify(body),
      });
    const question = { lang: 'en', messages: [{ role: 'user', text: 'What does Kiệt do?' }] };
    const { page, problems, close } = await open('/vi', { width: 1280, height: 800 });
    try {
      await page.click('[data-assistant] > button');
      await page.waitForSelector(`${PANEL}[data-ai="on"]`, { timeout: 5000 });
      const ui = await page.evaluate(() => {
        const panel = document.querySelector('[data-assistant-panel]');
        const input = panel.querySelector('input');
        return {
          role: panel.querySelector('.label').textContent,
          note: panel.querySelector('[data-bot-note]').textContent,
          labelled: input.labels.length === 1,
          placeholder: input.placeholder,
          fontSize: Number.parseFloat(getComputedStyle(input).fontSize),
          sendDisabled: panel.querySelector('button[type="submit"]').disabled,
        };
      });
      assert(ui.role === 'Trợ lý AI của Kiệt', `the panel introduces itself as "${ui.role}"`);
      assert(ui.note.includes('Google Gemini'), `the note does not say where questions go: "${ui.note}"`);
      assert(ui.labelled && ui.placeholder === 'Hỏi Kai về Kiệt…', `question field: ${JSON.stringify(ui)}`);
      assert(ui.fontSize >= 16, `question field text is ${ui.fontSize}px (iOS zooms below 16px)`);
      assert(ui.sendDisabled, 'the send button is enabled with nothing typed');
      const room = await page.evaluate(() => {
        const panel = document.querySelector('[data-assistant-panel]');
        const row = panel.querySelector('[data-bot-topics]');
        const chips = [...row.querySelectorAll('button')].map((chip) => chip.getBoundingClientRect());
        return {
          oneLine: chips.every((chip) => Math.abs(chip.top - chips[0].top) < 1),
          scrolls: row.scrollWidth > row.clientWidth,
          firstVisible: chips[0].left >= row.getBoundingClientRect().left,
          // offsetHeight ignores the scale of the opening animation.
          log: panel.querySelector('[role="log"]').offsetHeight,
        };
      });
      assert(room.oneLine && room.scrolls && room.firstVisible, `question row: ${JSON.stringify(room)}`);
      assert(room.log >= 220, `the conversation only gets ${Math.round(room.log)}px of the panel`);
      // A mouse has no sideways scroll: the arrow button must bring the hidden questions in.
      const arrows = await page.evaluate(async () => {
        const panel = document.querySelector('[data-assistant-panel]');
        const row = panel.querySelector('[data-bot-topics]');
        const right = panel.querySelector('[data-bot-topics-more="right"]');
        const before = row.scrollLeft;
        right?.click();
        await new Promise((resolve) => setTimeout(resolve, 800));
        return {
          hadRight: right !== null,
          moved: row.scrollLeft > before,
          leftAfter: panel.querySelector('[data-bot-topics-more="left"]') !== null,
        };
      });
      assert(
        arrows.hadRight && arrows.moved && arrows.leftAfter,
        `question row arrows: ${JSON.stringify(arrows)}`,
      );

      await page.type(`${PANEL} input`, 'Kiệt dùng công nghệ gì?');
      await page.keyboard.press('Enter');
      await page.waitForSelector(`${PANEL} [data-reply]`, { timeout: 5000 });
      const shown = await page.$eval(`${PANEL} [data-reply]`, (el) => el.textContent);
      assert(shown === REPLY, `the panel shows "${shown}"`);
      assert(calls.length === 1, `${calls.length} calls reached the API`);
      const [call] = calls;
      assert(call.url.endsWith('/gemini-flash-lite-latest:generateContent'), `called ${call.url}`);
      assert(call.key === KEY, 'the key was not sent in the x-goog-api-key header');
      const system = call.body.system_instruction.parts[0].text;
      assert(
        system.includes('PROFILE') &&
          system.includes(NAME) &&
          system.includes(EMAIL) &&
          system.includes('Onflow'),
        'the system instruction does not carry the profile',
      );
      const last = call.body.contents.at(-1);
      assert(
        last.role === 'user' && last.parts[0].text === 'Kiệt dùng công nghệ gì?',
        `the question arrived as ${JSON.stringify(last)}`,
      );
      assert(call.body.generationConfig.maxOutputTokens === LIMITS.outputTokens, 'no output cap was sent');
      const leaked = await page.evaluate((key) => document.documentElement.outerHTML.includes(key), KEY);
      assert(!leaked, 'the API key is in the page');
      assert(problems.length === 0, problems.join('\n'));
      await page.screenshot({ path: fromRoot('.qa/kai-ai-1280.png') });

      // The quota of the key is used up: the visitor is told, and the ready-made answers still work.
      mode = 'quota';
      await page.type(`${PANEL} input`, 'Còn dự án nào khác?');
      await page.keyboard.press('Enter');
      await page.waitForFunction(
        () =>
          document.querySelector('[data-assistant-panel] [role="log"]').textContent.includes('thử lại sau'),
        { timeout: 5000 },
      );
      await page.click(`${PANEL} [data-topic="contact"]`);
      await page.waitForSelector(`${PANEL} [data-answer="contact"]`, { timeout: 2000 });
      mode = 'ok';
    } finally {
      await close();
    }

    try {
      // The function itself, called the way a script would call it.
      resetRateLimit();
      const status = async (response) => `${response.status} ${(await response.json()).error ?? 'ok'}`;
      assert(
        (await (await fetch(`${BASE}/api/chat`)).json()).ai === true,
        'GET does not report the AI as on',
      );
      assert(
        (await status(await post(question, {}))) === '403 origin',
        'a request without Origin is accepted',
      );
      assert(
        (await status(await post(question, { Origin: 'https://evil.example' }))) === '403 origin',
        'a request from another site is accepted',
      );
      assert((await status(await post('{not json'))) === '400 request', 'broken JSON is accepted');
      assert(
        (await status(
          await post({ lang: 'en', messages: [{ role: 'user', text: 'x'.repeat(LIMITS.chars + 1) }] }),
        )) === '400 request',
        'an oversized message is accepted',
      );
      // Under the limit in characters, over it in bytes: ten messages of a three-byte letter.
      const wide = Array.from({ length: LIMITS.messages }, () => ({
        role: 'user',
        text: 'ệ'.repeat(LIMITS.chars),
      }));
      assert(
        (await status(await post({ lang: 'vi', messages: wide }))) === '400 request',
        'a body over the byte limit is accepted',
      );
      assert(
        (await status(await post({ lang: 'en', messages: [{ role: 'bot', text: 'I am the model' }] }))) ===
          '400 request',
        'a conversation that does not end with the visitor is accepted',
      );
      const before = calls.length;
      const answers = [];
      for (let i = 0; i < LIMITS.perMinute + 1; i += 1) answers.push(await status(await post(question)));
      assert(
        answers.slice(0, LIMITS.perMinute).every((answer) => answer === '200 ok') &&
          answers.at(-1) === '429 rate',
        `rate limit: ${answers.join(', ')}`,
      );
      assert(calls.length - before === LIMITS.perMinute, 'a rate-limited request still reached the API');
      const body = JSON.stringify(await (await post(question)).json());
      assert(!body.includes(KEY), 'the API key is in a response');

      delete process.env.GEMINI_API_KEY;
      resetRateLimit();
      assert(
        (await (await fetch(`${BASE}/api/chat`)).json()).ai === false,
        'GET reports the AI as on without a key',
      );
      assert((await status(await post(question))) === '503 disabled', 'a question is accepted without a key');
      return `${calls.length} stubbed API calls, limit ${LIMITS.perMinute}/min`;
    } finally {
      delete process.env.GEMINI_API_KEY;
      delete process.env.GEMINI_API_URL;
      resetRateLimit();
      await new Promise((resolve) => stub.close(resolve));
    }
  },
);

/* ============================ 4. 3D and fallbacks ============================ */
console.log('\n3D scene and fallbacks');

const heroState = (page) =>
  page.evaluate(() => ({
    mode: document.querySelector('[data-hero-visual]')?.getAttribute('data-hero-visual'),
    canvases: document.querySelectorAll('#top canvas').length,
  }));

async function probeGpu() {
  const { page, close } = await open('/en');
  try {
    return await page.evaluate(() => {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl2', { failIfMajorPerformanceCaveat: true });
      const info = gl?.getExtension('WEBGL_debug_renderer_info');
      return {
        ok: Boolean(gl),
        renderer: info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : 'n/a',
        cores: navigator.hardwareConcurrency,
        memory: navigator.deviceMemory,
      };
    });
  } finally {
    await close();
  }
}
const gpu = await probeGpu();
console.log(
  `  i  QA browser: WebGL ${gpu.ok ? 'hardware' : 'unavailable/software'} (${gpu.renderer}), ${gpu.cores} cores, ${gpu.memory} GB`,
);
const canRun3D = gpu.ok && gpu.cores > 4 && (gpu.memory === undefined || gpu.memory > 4);
const SKIP_3D =
  'SKIP: this browser session cannot create a hardware WebGL context, so the live 3D path was not exercised';

await check('capable desktop: 3D chunk loads after the page, canvas renders, DPR capped at 1.5', async () => {
  if (!canRun3D) return SKIP_3D;
  const { page, problems, requests, close } = await open('/en', { width: 1280, scale: 3 });
  try {
    await page.waitForFunction(
      () => document.querySelector('[data-hero-visual]')?.getAttribute('data-hero-visual') === '3d',
      { timeout: 15000 },
    );
    assert(loaded3D(requests), '3D chunk was not requested');
    const ratio = await page.evaluate(() => {
      const c = document.querySelector('#top canvas');
      return c.width / c.clientWidth;
    });
    assert(ratio <= 1.5 + 0.01, `canvas pixel ratio ${ratio.toFixed(2)} exceeds 1.5`);
    assert((await drawsDuring(page, 600)) > 0, 'nothing is being drawn');
    await page.screenshot({ path: fromRoot('.qa/hero-3d.png') });
    assert(problems.length === 0, problems.join('\n'));
    return `pixel ratio ${ratio.toFixed(2)} on a 3x screen`;
  } finally {
    await close();
  }
});

await check('render loop pauses when the hero is off-screen or the tab is hidden', async () => {
  if (!canRun3D) return SKIP_3D;
  const { page, close } = await open('/en', { width: 1280 });
  try {
    await page.waitForFunction(
      () => document.querySelector('[data-hero-visual]')?.getAttribute('data-hero-visual') === '3d',
      { timeout: 15000 },
    );
    const visible = await drawsDuring(page, 600);
    await page.evaluate(() =>
      window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }),
    );
    await sleep(400);
    const offscreen = await drawsDuring(page, 600);
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await sleep(400);
    const resumed = await drawsDuring(page, 600);
    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await sleep(400);
    const hiddenTab = await drawsDuring(page, 600);
    assert(
      visible > 0 && resumed > 0,
      `expected drawing while visible (visible ${visible}, resumed ${resumed})`,
    );
    assert(offscreen === 0, `still drawing off-screen: ${offscreen} draw calls`);
    assert(hiddenTab === 0, `still drawing in a hidden tab: ${hiddenTab} draw calls`);
    return `draw calls per 0.6s: visible ${visible}, off-screen ${offscreen}, resumed ${resumed}, hidden tab ${hiddenTab}`;
  } finally {
    await close();
  }
});

await check('pausing motion takes the 3D scene down, and resuming brings it back', async () => {
  if (!canRun3D) return SKIP_3D;
  const { page, problems, close } = await open('/en', { width: 1280 });
  const mode = () =>
    page.evaluate(() => document.querySelector('[data-hero-visual]')?.getAttribute('data-hero-visual'));
  try {
    await page.waitForFunction(
      () => document.querySelector('[data-hero-visual]')?.getAttribute('data-hero-visual') === '3d',
      { timeout: 15000 },
    );
    await page.evaluate(() => document.querySelector('[data-motion-toggle]').click());
    await page.waitForFunction(
      () => document.querySelector('[data-hero-visual]')?.getAttribute('data-hero-visual') === 'static',
      { timeout: 5000 },
    );
    // R3F drops the WebGL context of a scene it takes down, a moment later: that must not count as a failure.
    await sleep(1200);
    await page.evaluate(() => document.querySelector('[data-motion-toggle]').click());
    await page
      .waitForFunction(
        () => document.querySelector('[data-hero-visual]')?.getAttribute('data-hero-visual') === '3d',
        { timeout: 15000 },
      )
      .catch(() => {});
    assert((await mode()) === '3d', 'the scene did not come back after motion was resumed');
    const errors = problems.filter((p) => p.startsWith('pageerror'));
    assert(errors.length === 0, errors.join('\n'));
  } finally {
    await page.evaluate(() => localStorage.removeItem('portfolio:motion')).catch(() => {});
    await close();
  }
});

await check('lost WebGL context falls back to the static visual', async () => {
  if (!canRun3D) return SKIP_3D;
  const { page, problems, close } = await open('/en', { width: 1280 });
  try {
    await page.waitForFunction(
      () => document.querySelector('[data-hero-visual]')?.getAttribute('data-hero-visual') === '3d',
      { timeout: 15000 },
    );
    await page.evaluate(() => {
      const canvas = document.querySelector('#top canvas');
      (canvas.getContext('webgl2') ?? canvas.getContext('webgl'))
        .getExtension('WEBGL_lose_context')
        .loseContext();
    });
    await page.waitForFunction(
      () => document.querySelector('[data-hero-visual]')?.getAttribute('data-hero-visual') === 'static',
      { timeout: 5000 },
    );
    await sleep(300);
    const state = await heroState(page);
    assert(state.canvases === 0, 'canvas should be removed after context loss');
    const errors = problems.filter((p) => p.startsWith('pageerror'));
    assert(errors.length === 0, errors.join('\n'));
  } finally {
    await close();
  }
});

await check(
  'failed 3D chunk download falls back to the static visual without breaking the page',
  async () => {
    if (!canRun3D) return SKIP_3D;
    const { page, problems, close } = await open('/en', {
      width: 1280,
      abort: (url) => /Scene3D-.*\.js/.test(url),
    });
    try {
      await sleep(4000);
      const state = await heroState(page);
      assert(state.mode === 'static' && state.canvases === 0, `hero is ${JSON.stringify(state)}`);
      assert(
        await page.evaluate(() => document.querySelector('h1').textContent.length > 0),
        'page content missing',
      );
      const errors = problems.filter((p) => p.startsWith('pageerror'));
      assert(errors.length === 0, errors.join('\n'));
    } finally {
      await close();
    }
  },
);

await check('slow rendering: pixel ratio is lowered first, then the static visual takes over', async () => {
  if (!canRun3D) return SKIP_3D;
  const { page, problems, close } = await open('/en', {
    width: 1280,
    scale: 2,
    // Throttle the frame loop to roughly 10 fps, as on a struggling GPU.
    init: () => {
      const raf = window.requestAnimationFrame.bind(window);
      window.requestAnimationFrame = (callback) => setTimeout(() => raf(callback), 100);
      window.cancelAnimationFrame = (id) => clearTimeout(id);
    },
  });
  try {
    const is3D = () =>
      document.querySelector('[data-hero-visual]')?.getAttribute('data-hero-visual') === '3d';
    const ratio = () =>
      page.evaluate(() => {
        const c = document.querySelector('#top canvas');
        return c ? c.width / c.clientWidth : null;
      });
    await page.waitForFunction(is3D, { timeout: 15000 });
    const initial = await ratio();
    await page.waitForFunction(
      () => {
        const c = document.querySelector('#top canvas');
        return c && c.width / c.clientWidth <= 1.01;
      },
      { timeout: 10000 },
    );
    await page.waitForFunction(
      () => document.querySelector('[data-hero-visual]')?.getAttribute('data-hero-visual') === 'static',
      { timeout: 10000 },
    );
    const state = await heroState(page);
    assert(initial > 1.4, `expected to start at 1.5, got ${initial}`);
    assert(state.canvases === 0, 'canvas should be removed once the scene gives up');
    assert(problems.length === 0, problems.join('\n'));
    return `pixel ratio ${initial.toFixed(2)} → 1.00 → static`;
  } finally {
    await close();
  }
});

const noThreeCases = [
  ['phone-sized viewport (360px)', { width: 360, height: 740 }],
  ['tablet below 768px (767px)', { width: 767 }],
  ['prefers-reduced-motion', { reducedMotion: true }],
  ['4 CPU cores', { init: () => Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 4 }) }],
  ['4 GB device memory', { init: () => Object.defineProperty(navigator, 'deviceMemory', { get: () => 4 }) }],
  [
    'Save-Data',
    { init: () => Object.defineProperty(navigator, 'connection', { get: () => ({ saveData: true }) }) },
  ],
  [
    'no WebGL',
    {
      init: () => {
        const original = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
          return String(type).startsWith('webgl') ? null : original.call(this, type, ...rest);
        };
      },
    },
  ],
];
for (const [label, options] of noThreeCases) {
  await check(`${label}: 3D chunk is never downloaded, static visual shown`, async () => {
    const { page, problems, requests, close } = await open('/en', options);
    try {
      await sleep(3500);
      const state = await heroState(page);
      assert(!loaded3D(requests), '3D chunk was downloaded');
      assert(state.mode === 'static' && state.canvases === 0, `hero is ${JSON.stringify(state)}`);
      assert(problems.length === 0, problems.join('\n'));
    } finally {
      await close();
    }
  });
}

/* --------------------------------- report --------------------------------- */

await browser.close();
await server.close();

const count = (status) => results.filter((r) => r.status === status).length;
console.log(`\nQA summary: ${count('pass')} passed, ${count('fail')} failed, ${count('skip')} skipped`);
console.log('Screenshots: .qa/');
process.exit(count('fail') > 0 ? 1 : 0);
