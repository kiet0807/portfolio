/**
 * Generates every derived asset in public/ from src/data/profile.ts and the SVG sources:
 *   - fonts/            woff2, latin + vietnamese: Inter (text), Space Grotesk (headings)
 *                       and Playfair Display italic (the accent of the hero heading)
 *   - og-en.png, og-vi.png            1200×630 Open Graph images
 *   - favicon.ico (16, 32), apple-touch-icon.png (180), icon-192.png, icon-512.png
 *   - site.webmanifest
 * and, outside public/, server/knowledge.js: the profile as plain text, which is all the
 * chat bot's AI model is allowed to talk about (see server/chat.js).
 *   - cv-en.pdf, cv-vi.pdf            placeholders, only created when missing
 *
 * Runs automatically before `pnpm dev` and `pnpm build`.
 */
import { existsSync } from 'node:fs';
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { Resvg } from '@resvg/resvg-js';
import satori from 'satori';
import { runnerImport } from 'vite';
import { fromRoot, kb, pngSize } from './lib.mjs';

const PUBLIC = fromRoot('public');
const FONT_SRC = fromRoot('node_modules/@fontsource/space-grotesk/files');
/** Weights of the Open Graph image, which is set in the display face. */
const WEIGHTS = [400, 500, 700];
/** What the page itself loads (see the @font-face rules in src/styles.css). */
const PAGE_FONTS = [
  { slug: 'inter', weights: [400, 500, 700] },
  { slug: 'space-grotesk', weights: [300, 500, 700] },
];
const fontSource = (slug) => fromRoot('node_modules/@fontsource', slug);
const SUBSETS = ['latin', 'vietnamese'];
const fontFile = (subset, weight, ext) => `space-grotesk-${subset}-${weight}-normal.${ext}`;
const ACCENT_SRC = fromRoot('node_modules/@fontsource/playfair-display/files');
const accentFile = (subset) => `playfair-display-${subset}-400-italic.woff2`;

const COLORS = {
  bg: '#0A0F1A',
  navy: '#0B1F3A',
  primary: '#2563EB',
  accent: '#22D3EE',
  text: '#E6EDF5',
  silver: '#C0C7D1',
};

/* ------------------------------- profile -------------------------------- */

async function loadProfile() {
  // Vite's module runner understands TypeScript and the "@/..." alias.
  const { module } = await runnerImport('/src/data/profile.ts', { logLevel: 'error' });
  return module.profile;
}

/* -------------------------------- fonts --------------------------------- */

async function copyFonts() {
  await mkdir(fromRoot('public/fonts'), { recursive: true });
  for (const subset of SUBSETS) {
    for (const { slug, weights } of PAGE_FONTS) {
      for (const weight of weights) {
        const name = `${slug}-${subset}-${weight}-normal.woff2`;
        await copyFile(`${fontSource(slug)}/files/${name}`, fromRoot('public/fonts', name));
      }
    }
    await copyFile(`${ACCENT_SRC}/${accentFile(subset)}`, fromRoot('public/fonts', accentFile(subset)));
  }
  // Every family is under the SIL Open Font License 1.1, which asks for the licence
  // text to travel with every copy of the fonts.
  for (const { slug } of PAGE_FONTS) {
    await copyFile(`${fontSource(slug)}/LICENSE`, fromRoot(`public/fonts/LICENSE-${slug}.txt`));
  }
  await copyFile(`${ACCENT_SRC}/../LICENSE`, fromRoot('public/fonts/LICENSE-playfair-display.txt'));
}

/* -------------------------------- icons --------------------------------- */

function renderSvg(svg, width) {
  return new Resvg(svg, { fitTo: { mode: 'width', value: width } }).render().asPng();
}

/** ICO container holding PNG-compressed images (supported by every current browser). */
function encodeIco(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(images.length, 4);
  let offset = 6 + 16 * images.length;
  const entries = images.map(({ size, png }) => {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size === 256 ? 0 : size, 0);
    entry.writeUInt8(size === 256 ? 0 : size, 1);
    entry.writeUInt8(0, 2); // palette
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // colour planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(png.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += png.length;
    return entry;
  });
  return Buffer.concat([header, ...entries, ...images.map((i) => i.png)]);
}

async function generateIcons() {
  const svg = await readFile(fromRoot('public/favicon.svg'), 'utf8');
  // iOS and Android apply their own mask, so those icons need a full-bleed (square) tile.
  const fullBleed = svg.replace('rx="14"', 'rx="0"');
  if (fullBleed === svg) throw new Error('favicon.svg: expected the background tile to have rx="14"');

  const ico = encodeIco([16, 32].map((size) => ({ size, png: renderSvg(svg, size) })));
  await writeFile(fromRoot('public/favicon.ico'), ico);
  await writeFile(fromRoot('public/apple-touch-icon.png'), renderSvg(fullBleed, 180));
  await writeFile(fromRoot('public/icon-192.png'), renderSvg(svg, 192));
  await writeFile(fromRoot('public/icon-512.png'), renderSvg(svg, 512));
}

/* ------------------------------ Open Graph ------------------------------- */

const h = (type, style, children) => ({ type, props: { style, children } });

function ogTree(profile, lang) {
  const wave = (d, fill, opacity) => ({
    type: 'svg',
    props: {
      width: 1200,
      height: 190,
      viewBox: '0 0 1200 190',
      style: { position: 'absolute', left: 0, bottom: 0 },
      children: { type: 'path', props: { d, fill, 'fill-opacity': opacity } },
    },
  });

  return h(
    'div',
    {
      width: 1200,
      height: 630,
      display: 'flex',
      position: 'relative',
      backgroundColor: COLORS.bg,
      backgroundImage: `linear-gradient(135deg, ${COLORS.navy} 0%, ${COLORS.bg} 58%, #0D2A5E 100%)`,
      fontFamily: 'Sans Latin, Sans Vietnamese',
      color: COLORS.text,
    },
    [
      // glow
      h('div', {
        position: 'absolute',
        right: -160,
        top: -200,
        width: 720,
        height: 720,
        borderRadius: 720,
        backgroundImage: 'radial-gradient(circle, rgba(37,99,235,0.55) 0%, rgba(37,99,235,0) 68%)',
      }),
      // waves along the bottom
      wave(
        'M0 70 C150 20 300 20 450 70 C600 120 750 120 900 70 C1010 34 1110 30 1200 52 L1200 190 L0 190 Z',
        COLORS.primary,
        0.55,
      ),
      wave(
        'M0 112 C150 152 300 152 450 112 C600 72 750 72 900 112 C1010 142 1110 146 1200 128 L1200 190 L0 190 Z',
        COLORS.accent,
        0.7,
      ),
      wave('M0 156 C200 132 400 132 600 156 C800 180 1000 180 1200 156 L1200 190 L0 190 Z', COLORS.bg, 0.75),
      // content
      h('div', { display: 'flex', flexDirection: 'column', padding: '72px 80px', width: 1200, height: 630 }, [
        h(
          'div',
          {
            display: 'flex',
            alignSelf: 'flex-start',
            padding: '10px 24px',
            borderRadius: 999,
            border: `2px solid ${COLORS.accent}`,
            color: COLORS.accent,
            fontSize: 24,
            fontWeight: 500,
            letterSpacing: 3,
            textTransform: 'uppercase',
          },
          profile.seo.ogLabel[lang],
        ),
        h(
          'div',
          {
            display: 'flex',
            marginTop: 44,
            fontSize: 92,
            fontWeight: 700,
            lineHeight: 1.1,
            color: '#FFFFFF',
          },
          profile.name,
        ),
        h(
          'div',
          { display: 'flex', marginTop: 14, fontSize: 42, fontWeight: 500, color: COLORS.accent },
          profile.title[lang],
        ),
        h(
          'div',
          {
            display: 'flex',
            marginTop: 26,
            maxWidth: 1040,
            fontSize: 32,
            fontWeight: 400,
            lineHeight: 1.4,
            color: COLORS.silver,
          },
          profile.tagline[lang],
        ),
      ]),
    ],
  );
}

async function loadOgFonts() {
  // satori reads WOFF (not WOFF2). Each subset is registered under its own family
  // name so glyphs missing from the latin file fall back to the vietnamese one.
  const fonts = [];
  for (const weight of WEIGHTS) {
    for (const subset of SUBSETS) {
      fonts.push({
        name: subset === 'latin' ? 'Sans Latin' : 'Sans Vietnamese',
        data: await readFile(`${FONT_SRC}/${fontFile(subset, weight, 'woff')}`),
        weight,
        style: 'normal',
      });
    }
  }
  return fonts;
}

async function generateOg(profile) {
  const fonts = await loadOgFonts();
  const results = [];
  for (const lang of ['en', 'vi']) {
    const svg = await satori(ogTree(profile, lang), { width: 1200, height: 630, fonts });
    const png = renderSvg(svg, 1200);
    await writeFile(fromRoot(`public/og-${lang}.png`), png);
    results.push({ file: `og-${lang}.png`, png });
  }
  return results;
}

/* ------------------------------- manifest -------------------------------- */

async function generateManifest(profile) {
  const manifest = {
    name: `${profile.name} · ${profile.title.en}`,
    short_name: profile.givenName,
    description: profile.tagline.en,
    start_url: '/',
    display: 'standalone',
    background_color: COLORS.bg,
    theme_color: COLORS.navy,
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  };
  await writeFile(fromRoot('public/site.webmanifest'), `${JSON.stringify(manifest, null, 2)}\n`);
}

/* --------------------------- placeholder CV PDFs -------------------------- */

function minimalPdf(lines) {
  const text = lines
    .map((line, i) => `BT /F1 ${i === 0 ? 22 : 13} Tf 72 ${720 - i * 34} Td (${line}) Tj ET`)
    .join('\n');
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${text.length} >>\nstream\n${text}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = objects.map((body, i) => {
    const offset = pdf.length;
    pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
    return offset;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  pdf += offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('');
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf, 'latin1');
}

async function ensureCvPlaceholders() {
  const created = [];
  for (const [file, lines] of [
    ['cv-en.pdf', ['CV placeholder (English)', 'Replace this file: public/cv-en.pdf']],
    ['cv-vi.pdf', ['CV placeholder (Vietnamese)', 'Replace this file: public/cv-vi.pdf']],
  ]) {
    const target = fromRoot('public', file);
    if (existsSync(target)) continue;
    await writeFile(target, minimalPdf(lines));
    created.push(file);
  }
  return created;
}

/* --------------------------------- main ---------------------------------- */

/* ------------------------------ chat knowledge ---------------------------- */

/** Everything on the page, as plain text in one language. Headings are for the model, not for people. */
function knowledgeFor(profile, lang) {
  const say = (value) => value[lang];
  const period = (item) =>
    item.endYear === item.startYear ? item.startYear : `${item.startYear} to ${item.endYear ?? 'now'}`;
  return [
    `Name: ${profile.name}`,
    `Title: ${say(profile.title)}`,
    `Location: ${say(profile.location)} (time zone ${profile.timeZone})`,
    `In one sentence: ${say(profile.tagline)}`,
    `Focus: ${say(profile.focus).join(', ')}`,
    profile.availability.open
      ? `Availability: ${say(profile.availability.label)}. ${profile.availability.details.map((row) => `${say(row.label)}: ${say(row.value)}`).join('. ')}.`
      : 'Availability: not looking for new work at the moment.',
    `Email: ${profile.email}`,
    `Profiles: ${profile.socials.map((social) => `${social.label} ${social.url}`).join(', ')}`,
    `CV: a PDF can be downloaded from the Contact section of this website.`,
    '',
    'ABOUT',
    ...profile.about.map(say),
    '',
    'HOW THEY WORK',
    ...profile.principles.map((item) => `- ${say(item.title)}: ${say(item.body)}`),
    '',
    'HOW THEY WORK WITH AI',
    `${say(profile.ai.title)}. ${say(profile.ai.lead)}`,
    ...profile.ai.steps.map((step, i) => `${i + 1}. ${say(step.title)}: ${say(step.body)}`),
    ...profile.ai.facts.map((fact) => `- ${fact.value} ${say(fact.label)}`),
    '',
    'HEADLINE NUMBERS',
    ...profile.stats.map(
      (stat) => `- ${stat.prefix ?? ''}${stat.value}${stat.suffix ?? ''} ${say(stat.label)} (${stat.source})`,
    ),
    '',
    'SKILLS, WITH YEARS OF USE',
    ...profile.skills.map(
      (group) =>
        `- ${say(group.label)}: ${group.items.map((skill) => `${skill.name} (${skill.years})`).join(', ')}`,
    ),
    profile.exploring.length > 0 ? `- Learning now: ${profile.exploring.join(', ')}` : '',
    '',
    'EXPERIENCE, NEWEST FIRST',
    ...profile.experience.flatMap((job) => [
      `${period(job)}: ${say(job.role)} at ${job.company}. ${say(job.context)}`,
      ...job.highlights.map((line) => `- ${say(line)}`),
      `- Stack: ${job.stack.join(', ')}`,
    ]),
    '',
    ...(profile.testimonials.length > 0
      ? [
          'FEEDBACK FROM COLLEAGUES (SUMMARIZED, NOT VERBATIM QUOTES)',
          ...profile.testimonials.map(
            (item) => `- ${say(item.role)}, ${say(item.where)}: ${say(item.quote)}`,
          ),
          '',
        ]
      : []),
    'EDUCATION AND RECOGNITION',
    ...profile.credentials.map((item) => `- ${item.period}: ${say(item.title)}, ${say(item.issuer)}`),
    '',
    'FEATURED PROJECTS',
    ...profile.projects.flatMap((project) => [
      `${project.name} (${project.year}, ${say(project.type)}). Role: ${say(project.role)}. ${say(project.description)}`,
      `- ${project.metrics.map((metric) => `${metric.value} ${say(metric.label)}`).join('; ')}`,
      `- Tech: ${project.tech.join(', ')}${project.demoUrl ? `. Product page: ${project.demoUrl}` : ''}`,
    ]),
    '',
    'OTHER WORK',
    ...profile.archive.map(
      (item) =>
        `- ${item.name} (${item.year}): ${say(item.description)} Tech: ${item.tech.join(', ')}.${item.url ? ` ${item.url}` : ''}`,
    ),
  ]
    .filter((line, i, all) => !(line === '' && all[i - 1] === ''))
    .join('\n');
}

async function generateKnowledge(profile) {
  const source = [
    '// Generated by scripts/generate-assets.mjs from src/data/profile.ts. Do not edit by hand.',
    '// Commit this file: the chat function (api/chat.js) is deployed with it.',
    `export const OWNER = ${JSON.stringify({ name: profile.name, givenName: profile.givenName, email: profile.email }, null, 2)};`,
    '',
    `export const KNOWLEDGE = ${JSON.stringify({ en: knowledgeFor(profile, 'en'), vi: knowledgeFor(profile, 'vi') }, null, 2)};`,
    '',
  ].join('\n');
  await mkdir(fromRoot('server'), { recursive: true });
  await writeFile(fromRoot('server/knowledge.js'), source);
  return source.length;
}

const profile = await loadProfile();
const knowledgeSize = await generateKnowledge(profile);
await mkdir(PUBLIC, { recursive: true });
await copyFonts();
await generateIcons();
const og = await generateOg(profile);
await generateManifest(profile);
const cvs = await ensureCvPlaceholders();

console.log('Generated assets in public/:');
for (const { file, png } of og) {
  const { width, height } = pngSize(png);
  console.log(`  ${file.padEnd(22)} ${width}×${height}  ${kb(png.length)}`);
}
for (const file of ['apple-touch-icon.png', 'icon-192.png', 'icon-512.png']) {
  const png = await readFile(fromRoot('public', file));
  const { width, height } = pngSize(png);
  console.log(`  ${file.padEnd(22)} ${width}×${height}  ${kb(png.length)}`);
}
const ico = await readFile(fromRoot('public/favicon.ico'));
console.log(`  ${'favicon.ico'.padEnd(22)} ${ico.readUInt16LE(4)} images (16, 32)  ${kb(ico.length)}`);
console.log(
  `  fonts/                 ${(PAGE_FONTS.flatMap((font) => font.weights).length + 1) * SUBSETS.length} woff2 files`,
);
console.log('  site.webmanifest');
console.log(`  server/knowledge.js    ${kb(knowledgeSize)} (what the chat bot knows)`);
if (cvs.length > 0) console.log(`  placeholder CVs created: ${cvs.join(', ')}`);
