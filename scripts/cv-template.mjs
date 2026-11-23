/**
 * The CV as a standalone HTML document, laid out for A4 paper: a dark header band with
 * the name and the contact details, then one column of numbered sections. The smaller
 * projects of the website ("More work") are left out: the experience already names them. It is built
 * from src/data/profile.ts, so the CV always says what the website says, but it does not
 * share the website's layout: a CV is read on one or two sheets, top to bottom.
 *
 * Used by scripts/cv.mjs, which prints it to PDF.
 */
import { localNumber } from './lib.mjs';

const LATIN =
  'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD';
const VIETNAMESE =
  'U+0102-0103,U+0110-0111,U+0128-0129,U+0168-0169,U+01A0-01A1,U+01AF-01B0,U+0300-0301,U+0303-0304,U+0308-0309,U+0323,U+0329,U+1EA0-1EF9,U+20AB';

/** The same self-hosted fonts as the website (public/fonts). */
const FONTS = [
  ['Inter', 'inter', 'normal', [400, 500, 700]],
  ['Space Grotesk', 'space-grotesk', 'normal', [300, 500, 700]],
  ['Playfair Display', 'playfair-display', 'italic', [400]],
];

/** Headings that exist only on the CV. Everything else comes from the site's dictionary. */
const LABELS = {
  en: { profile: 'Summary', ai: 'How I work with AI' },
  vi: { profile: 'Tóm tắt', ai: 'Cách tôi làm việc với AI' },
};

const ICONS = {
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
  phone:
    '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z"/>',
  pin: '<path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11Z"/><circle cx="12" cy="10" r="2.5"/>',
  github:
    '<path d="M9 19c-4.3 1.4-4.3-2.5-6-3m12 5v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.2 4.2 0 0 0-.1-3.2s-1.1-.3-3.5 1.3a12.3 12.3 0 0 0-6.2 0C6.5 2.8 5.4 3.1 5.4 3.1a4.2 4.2 0 0 0-.1 3.2A4.6 4.6 0 0 0 4 9.5c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V21"/>',
  gitlab:
    '<path d="m12 20.5 3.6-11H8.4L12 20.5Zm0 0L3 13.9l1.6-5.2 2-6.2 1.8 6.9M12 20.5l9-6.6-1.6-5.2-2-6.2-1.8 6.9"/>',
  linkedin:
    '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 10v7M8 7v.01M12 17v-4a2 2 0 0 1 4 0v4M12 10v7"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
  spark: '<path d="M12 3l2.1 6.4L20.5 11.5l-6.4 2.1L12 20l-2.1-6.4L3.5 11.5l6.4-2.1z"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
};
const icon = (name) =>
  `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`;

const esc = (value) =>
  String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function fontFaces(fontUrl) {
  return FONTS.flatMap(([family, slug, style, weights]) =>
    weights.flatMap((weight) =>
      [
        ['latin', LATIN],
        ['vietnamese', VIETNAMESE],
      ].map(
        ([subset, range]) =>
          `@font-face{font-family:'${family}';font-style:${style};font-weight:${weight};src:url('${fontUrl(`${slug}-${subset}-${weight}-${style}.woff2`)}') format('woff2');unicode-range:${range}}`,
      ),
    ),
  ).join('\n');
}

const STYLES = /* css */ `
@page { size: A4; margin: 10mm 0 10mm; }
/* The header band runs to the top edge of the first sheet. */
@page :first { margin-top: 0; }
* { box-sizing: border-box; margin: 0; padding: 0; }
:root {
  --ink: #0b1f3a; --muted: #4b5a70; --line: rgb(11 31 58 / 0.16); --soft: #f1f5fb;
  --primary: #2563eb; --link: #0e7490; --ai: #6d28d9; --gutter: 13mm;
}
/* Everything is sized in rem; cv.mjs lowers --cv-size until the CV fits on two sheets. */
html { font-size: var(--cv-size, 9pt); -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body { font-family: 'Inter', Arial, sans-serif; color: var(--ink); line-height: 1.42; background: #fff; }
a { color: inherit; text-decoration: none; }
ul, ol { list-style: none; }
.icon { width: 1.05em; height: 1.05em; flex: none; }
.nb { white-space: nowrap; }
.mono { font-family: ui-monospace, 'SF Mono', Menlo, Consolas, monospace; }
h1, h2, h3, .display { font-family: 'Space Grotesk', Arial, sans-serif; }

/* ------------------------------- header band ------------------------------- */
.band {
  color: #e6edf5; padding: 7.5mm var(--gutter) 6.5mm;
  background:
    radial-gradient(60% 120% at 88% 0%, rgb(37 99 235 / 0.55), transparent 70%),
    radial-gradient(40% 90% at 0% 100%, rgb(34 211 238 / 0.2), transparent 70%),
    linear-gradient(to right, rgb(96 165 250 / 0.07) 1px, transparent 1px) 0 0 / 9mm 9mm,
    linear-gradient(to bottom, rgb(96 165 250 / 0.07) 1px, transparent 1px) 0 0 / 9mm 9mm,
    linear-gradient(150deg, #0b1f3a, #0a0f1a 75%);
  display: grid; grid-template-columns: auto minmax(0, 1fr) auto; column-gap: 7mm; align-items: center;
}
.avatar { width: 24mm; height: 24mm; border-radius: 5.5mm; border: 0.3mm solid rgb(165 243 252 / 0.5); object-fit: cover; display: block; }
.band h1 { font-size: 3.5rem; font-weight: 300; letter-spacing: -0.025em; line-height: 1.02; }
.band h1 em { font-family: 'Playfair Display', Georgia, serif; font-style: italic; font-weight: 400; color: #67e8f9; }
.role { margin-top: 2mm; font-size: 1.35rem; font-weight: 500; display: flex; align-items: center; gap: 3mm; flex-wrap: wrap; }
.pill {
  display: inline-flex; align-items: center; gap: 1.2mm; padding: 0.7mm 2.6mm; border-radius: 99mm;
  font-size: 0.72rem; letter-spacing: 0.12em; text-transform: uppercase; font-weight: 500;
  color: #c4b5fd; border: 0.25mm solid rgb(167 139 250 / 0.6); background: rgb(167 139 250 / 0.12);
}
.tagline { margin-top: 2.2mm; font-size: 1rem; color: #a3b1c2; max-width: 32em; }
.contact { font-size: 0.9rem; display: grid; row-gap: 1.6mm; }
/* Six lines (the private copy with a phone number and a site address) must not make the band taller. */
.contact.dense { row-gap: 0.5mm; }
.contact li { display: flex; align-items: center; gap: 2mm; white-space: nowrap; }
.contact .icon { color: #67e8f9; }

/* --------------------------------- sections -------------------------------- */
main { padding: 0 var(--gutter); }
section { margin-top: 4.2mm; }
/*
 * Nothing that carries text is positioned: positioned boxes are painted last, which would
 * put their text out of reading order for whatever extracts it from the PDF (applicant
 * tracking systems, copy and paste). The rule under a heading is two backgrounds instead.
 */
h2 {
  display: flex; align-items: baseline; gap: 2.5mm; margin-bottom: 2.6mm; padding-bottom: 1.6mm;
  font-size: 1.22rem; font-weight: 700; letter-spacing: -0.01em; break-after: avoid;
  background:
    linear-gradient(90deg, var(--primary), #22d3ee) left bottom / 15mm 0.7mm no-repeat,
    linear-gradient(var(--line), var(--line)) left bottom 0.2mm / 100% 0.25mm no-repeat;
}
h2 .mono { font-size: 0.72rem; font-weight: 400; color: var(--link); letter-spacing: 0.08em; }
h3 { font-size: 1.08rem; font-weight: 700; break-after: avoid; }
.label { font-size: 0.7rem; letter-spacing: 0.1em; text-transform: uppercase; color: var(--muted); }

.summary p + p { margin-top: 1.6mm; }


/* Experience: dates in a rail on the left, like a timeline. */
/* A role is never split between two sheets. */
.job { display: grid; grid-template-columns: 25mm minmax(0, 1fr); column-gap: 4mm; break-inside: avoid; }
.job + .job { margin-top: 3.6mm; }
.when { font-size: 0.8rem; color: var(--link); padding-top: 0.5mm; }
.company { font-weight: 500; }
.context { font-size: 0.88rem; color: var(--muted); margin-top: 0.4mm; }
.bullets { margin-top: 1mm; }
.bullets { list-style: disc; padding-left: 3.6mm; }
.bullets li { padding-left: 0.4mm; }
.bullets li::marker { color: var(--link); }
.bullets li + li { margin-top: 0.3mm; }
.stack { margin-top: 1mm; font-size: 0.76rem; color: var(--muted); }

.projects { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 3.4mm; }
.card { border: 0.25mm solid var(--line); border-radius: 3mm; padding: 2.8mm 3.2mm; break-inside: avoid; display: flex; flex-direction: column; }
.card .top { display: flex; justify-content: space-between; gap: 2mm; color: var(--link); }
.card h3 { margin-top: 0.8mm; }
.card .who { font-size: 0.84rem; color: var(--muted); }
.card .what { margin-top: 1.3mm; font-size: 0.88rem; }
.metrics { margin-top: auto; padding-top: 2mm; display: grid; grid-template-columns: repeat(3, 1fr); gap: 2mm; }
.metrics dd { font-family: ui-monospace, 'SF Mono', Menlo, monospace; font-weight: 700; font-size: 0.98rem; }
.metrics dt { font-size: 0.7rem; color: var(--muted); line-height: 1.25; }
.metrics div { display: flex; flex-direction: column-reverse; justify-content: flex-end; }
.card .stack { border-top: 0.25mm solid var(--line); padding-top: 1.4mm; margin-top: 2mm; }
/* A project about AI: one row across the grid, with the violet accent of the AI block. */
.row { grid-column: 1 / -1; display: grid; grid-template-columns: auto minmax(0, 1fr) auto; grid-template-rows: auto auto; column-gap: 4mm; row-gap: 0.4mm; align-items: baseline; border: 0.25mm solid rgb(109 40 217 / 0.35); border-radius: 3mm; padding: 2.2mm 3.4mm; background: linear-gradient(120deg, rgb(109 40 217 / 0.07), rgb(37 99 235 / 0.04)); break-inside: avoid; }
.row .label { grid-column: 1; grid-row: 1; display: inline-flex; align-items: center; gap: 1mm; color: var(--ai); white-space: nowrap; }
.row .label .icon { width: 2.6mm; height: 2.6mm; }
.row h3 { grid-column: 1; grid-row: 2; white-space: nowrap; }
.row .what { grid-column: 2; grid-row: 1 / span 2; align-self: center; font-size: 0.88rem; }
.row .repo { font-size: 0.78rem; color: var(--link); white-space: nowrap; }
.row .metrics { grid-column: 3; grid-row: 1 / span 2; align-self: center; margin: 0; padding: 0; display: flex; gap: 4mm; }
.row .metrics dd { color: var(--ai); }

/* The AI block wears the violet accent, as on the website. */
.ai-panel { border: 0.25mm solid rgb(109 40 217 / 0.35); border-radius: 3mm; padding: 3mm 3.6mm; background: linear-gradient(120deg, rgb(109 40 217 / 0.07), rgb(37 99 235 / 0.04)); break-inside: avoid; }
.ai-head { display: flex; align-items: baseline; justify-content: space-between; gap: 4mm; flex-wrap: wrap; }
.ai-panel h3 { font-size: 1.2rem; font-weight: 500; }
.ai-facts { display: flex; gap: 4.5mm; font-size: 0.82rem; color: var(--muted); }
.ai-facts b { color: var(--ai); font-family: 'Space Grotesk', Arial, sans-serif; font-size: 1.05rem; margin-right: 1mm; }
.steps { margin-top: 2.2mm; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 3mm; }
.steps .n { font-size: 0.7rem; color: var(--ai); margin-right: 1.2mm; }
.steps b { font-family: 'Space Grotesk', Arial, sans-serif; }
.steps p { font-size: 0.82rem; color: var(--muted); line-height: 1.32; }
.guard { margin-top: 2.2mm; padding-top: 1.9mm; border-top: 0.25mm solid rgb(109 40 217 / 0.2); display: flex; flex-wrap: wrap; gap: 0.6mm 5mm; font-size: 0.84rem; }
.guard li { display: flex; align-items: center; gap: 1.3mm; }
.guard .icon { color: var(--ai); }

.split { display: grid; grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr); column-gap: 8mm; }
/* Skills: one row per group, the years in small print after the name. */
.group { display: grid; grid-template-columns: 31mm minmax(0, 1fr); column-gap: 2mm; break-inside: avoid; }
.group + .group { margin-top: 1.1mm; }
.group .label { padding-top: 0.45mm; }
.group span { white-space: nowrap; }
.group small { font-size: 0.72rem; color: var(--muted); margin-left: 0.7mm; }

.creds li { display: grid; grid-template-columns: 18mm minmax(0, 1fr); column-gap: 2mm; break-inside: avoid; }
.creds li + li { margin-top: 1.4mm; }
.creds .when { padding-top: 0.3mm; }
.creds b { font-weight: 700; }
.creds span { display: block; font-size: 0.84rem; color: var(--muted); }
.explore { margin-top: 2.4mm; padding-top: 2mm; border-top: 0.25mm solid var(--line); break-inside: avoid; }
.explore p + p { margin-top: 0.6mm; }
.explore span { white-space: nowrap; }
`;

/**
 * @param {object} options
 * @param {object} options.profile   `profile` from src/data/profile.ts
 * @param {'en' | 'vi'} options.lang
 * @param {(key: string) => string} options.t   the site's dictionary, for this language
 * @param {(file: string) => string} options.fontUrl   URL of a file in public/fonts
 * @param {string} options.avatarUrl
 * @param {string | null} options.siteUrl   public address of the portfolio, when it has one
 */
export function renderCv({ profile, lang, t, fontUrl, avatarUrl, siteUrl, phone = null }) {
  // Hyphenated compounds ("e-commerce", "AI-first") stay on one line: a break after the
  // hyphen looks like a typo, and text extraction then glues the two halves together.
  const say = (value) =>
    esc(value[lang]).replace(/[\p{L}\d]+(?:-[\p{L}\d]+)+/gu, '<span class="nb">$&</span>');
  const labels = LABELS[lang];
  let counter = 0;
  const heading = (title) => {
    counter += 1;
    return `<h2><span class="mono">${String(counter).padStart(2, '0')}</span>${esc(title)}</h2>`;
  };
  const period = (job) =>
    job.endYear === job.startYear
      ? String(job.startYear)
      : `${job.startYear} – ${job.endYear ?? esc(t('experience.present'))}`;

  // The given name is set in the accent face, wherever it stands in the full name.
  const at = profile.name.indexOf(profile.givenName);
  const name =
    at < 0
      ? esc(profile.name)
      : `${esc(profile.name.slice(0, at))}<em>${esc(profile.givenName)}</em>${esc(profile.name.slice(at + profile.givenName.length))}`;

  const contacts = [
    `<li>${icon('mail')}<a href="mailto:${esc(profile.email)}">${esc(profile.email)}</a></li>`,
    // Only the private copy (`pnpm cv:private`) is given a phone number.
    phone
      ? `<li>${icon('phone')}<a href="tel:${esc(phone.replace(/[^+\d]/g, ''))}">${esc(phone)}</a></li>`
      : '',
    ...profile.socials.map(
      (social) => `<li>${icon(social.id)}<a href="${esc(social.url)}">${esc(social.handle)}</a></li>`,
    ),
    siteUrl
      ? `<li>${icon('globe')}<a href="${esc(siteUrl)}">${esc(siteUrl.replace(/^https?:\/\/(www\.)?/, ''))}</a></li>`
      : '',
    `<li>${icon('pin')}${say(profile.location)}</li>`,
  ].filter(Boolean);

  const summary = `<p>${say(profile.cvSummary)}</p>`;

  const jobs = profile.experience
    .map(
      (job) => `
      <article class="job">
        <p class="when mono">${period(job)}</p>
        <div>
          <h3>${say(job.role)} <span class="company">· ${esc(job.company)}</span></h3>
          <p class="context">${say(job.context)}</p>
          <ul class="bullets">${job.highlights.map((line) => `<li>${say(line)}</li>`).join('')}</ul>
          <p class="stack mono">${job.stack.map(esc).join(' · ')}</p>
        </div>
      </article>`,
    )
    .join('');

  // A project with a `cvLine` gets one row across the grid; the others get cards.
  const rows = profile.projects
    .filter((project) => project.cvLine)
    .map(
      (project) => `
      <article class="row">
        <p class="label mono">${icon('spark')}<span>${say(project.type)} · ${project.year}</span></p>
        <h3>${project.demoUrl ? `<a href="${esc(project.demoUrl)}">${esc(project.name)}</a>` : esc(project.name)}</h3>
        <p class="what">${say(project.cvLine)}${project.repoUrl ? ` <a class="mono repo" href="${esc(project.repoUrl)}">${esc(project.repoUrl.replace(/^https:\/\//, ''))}</a>` : ''}</p>
        <dl class="metrics">${project.metrics.map((metric) => `<div><dt>${say(metric.label)}</dt><dd>${esc(localNumber(metric.value, lang))}</dd></div>`).join('')}</dl>
      </article>`,
    )
    .join('');

  const projects = profile.projects
    .filter((project) => !project.cvLine)
    .map(
      (project) => `
      <article class="card">
        <p class="top label mono"><span>${say(project.type)}</span><span>${project.year}</span></p>
        <h3>${project.demoUrl ? `<a href="${esc(project.demoUrl)}">${esc(project.name)}</a>` : esc(project.name)}</h3>
        <p class="who">${esc(t('project.role'))}: ${say(project.role)}</p>
        <p class="what">${say(project.description)}</p>
        <dl class="metrics">${project.metrics.map((metric) => `<div><dt>${say(metric.label)}</dt><dd>${esc(localNumber(metric.value, lang))}</dd></div>`).join('')}</dl>
        <p class="stack mono">${project.tech.map(esc).join(' · ')}</p>
      </article>`,
    )
    .join('');

  const { ai } = profile;
  const aiPanel = `
    <div class="ai-panel">
      <div class="ai-head">
        <h3>${say(ai.title)}</h3>
        <p class="ai-facts">${ai.facts.map((fact) => `<span><b>${esc(localNumber(fact.value, lang))}</b>${say(fact.label)}</span>`).join('')}</p>
      </div>
      <ol class="steps">${ai.steps
        .map(
          (step, i) =>
            `<li><span class="n mono">${String(i + 1).padStart(2, '0')}</span><b>${say(step.title)}</b><p>${say(step.body)}</p></li>`,
        )
        .join('')}</ol>
      <ul class="guard">${ai.guardrails.map((item) => `<li>${icon('check')}${say(item)}</li>`).join('')}</ul>
    </div>`;

  const skillGroups = [
    ...profile.skills.map((group) => ({
      label: say(group.label),
      // A year count says little for a tool picked up recently: shown from two years up.
      items: group.items.map(
        (skill) =>
          `${esc(skill.name)}${skill.years >= 2 ? `<small class="mono">${skill.years} ${esc(t('unit.years'))}</small>` : ''}`,
      ),
    })),
  ]
    .map(
      (group) =>
        `<div class="group"><p class="label mono">${group.label}</p><p>${group.items.map((item, i, all) => `<span>${item}${i < all.length - 1 ? ',' : ''}</span>`).join(' ')}</p></div>`,
    )
    .join('');

  // Under the credentials rather than the skills: that column is about half as tall, and
  // what is being learned sits naturally next to the certificates.
  const exploring =
    profile.exploring.length > 0
      ? `<div class="explore"><p class="label mono">${esc(t('skills.exploring'))}</p><p>${profile.exploring.map((item, i, all) => `<span>${esc(item)}${i < all.length - 1 ? ',' : ''}</span>`).join(' ')}</p></div>`
      : '';

  const credentials = profile.credentials
    .map(
      (item) =>
        `<li><p class="when mono">${esc(item.period)}</p><p><b>${say(item.title)}</b><span>${say(item.issuer)}</span></p></li>`,
    )
    .join('');

  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<title>${esc(profile.name)} · ${esc(profile.title[lang])} · CV</title>
<meta name="author" content="${esc(profile.name)}">
<style>
${fontFaces(fontUrl)}
${STYLES}
</style>
</head>
<body>
<header class="band">
  <img class="avatar" src="${esc(avatarUrl)}" alt="">
  <div>
    <h1>${name}</h1>
    <p class="role display">${say(profile.title)}<span class="pill mono">${icon('spark')}${say(ai.badge)}</span></p>
    <p class="tagline">${say(profile.tagline)}</p>
  </div>
  <ul class="contact${contacts.length > 5 ? ' dense' : ''}">${contacts.join('')}</ul>
</header>
<main>
  <section class="summary">${heading(labels.profile)}${summary}</section>
  <section>${heading(t('section.experience'))}${jobs}</section>
  <section>${heading(t('section.projects'))}<div class="projects">${rows}${projects}</div></section>
  <section>${heading(labels.ai)}${aiPanel}</section>
  <div class="split">
    <section>${heading(t('section.skills'))}${skillGroups}</section>
    <section>${heading(t('experience.credentials'))}<ul class="creds">${credentials}</ul>${exploring}</section>
  </div>
</main>
</body>
</html>`;
}
