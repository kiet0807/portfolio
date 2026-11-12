/**
 * Lighthouse (mobile, simulated throttling) for /en and /vi against the production
 * build, served the way Vercel serves it. Each page is measured several times and
 * the median score per category is reported, because single runs vary.
 *
 *   pnpm build && pnpm lighthouse
 *
 * Environment: LH_RUNS (default 3), CHROME_PATH. Lighthouse itself is fetched with
 * `pnpm dlx` (pinned version) so it does not weigh down the project's dependencies.
 * JSON reports are written to .lighthouse/. Exit code is 1 below the thresholds.
 */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readFile, rm } from 'node:fs/promises';
import { fromRoot } from './lib.mjs';
import { startServer } from './serve.mjs';

const LIGHTHOUSE_VERSION = '13.6.0';
const RUNS = Number(process.env.LH_RUNS ?? 3);
// The two home pages, and the two articles (one per language).
const PAGES = ['/en', '/vi', '/vi/writing/typescript-migration', '/en/writing/ai-agent-setup'];
const THRESHOLDS = { performance: 90, accessibility: 95, 'best-practices': 95, seo: 95 };
const CATEGORIES = Object.keys(THRESHOLDS);

if (!existsSync(fromRoot('dist/en/index.html'))) {
  console.error('dist/ is missing. Run `pnpm build` first.');
  process.exit(1);
}

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: fromRoot(), stdio: ['ignore', 'ignore', 'pipe'] });
    let stderr = '';
    child.stderr.on('data', (chunk) => (stderr += chunk));
    child.on('error', reject);
    child.on('close', (code) =>
      code === 0 ? resolve() : reject(new Error(stderr.trim().split('\n').slice(-5).join('\n'))),
    );
  });
}

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
};

await rm(fromRoot('.lighthouse'), { recursive: true, force: true });
await mkdir(fromRoot('.lighthouse'), { recursive: true });
const server = await startServer(4319);
let failed = false;

try {
  for (const page of PAGES) {
    const scores = Object.fromEntries(CATEGORIES.map((c) => [c, []]));
    const metrics = { lcp: [], tbt: [], cls: [], fcp: [], si: [] };
    const failing = new Map();

    for (let i = 1; i <= RUNS; i += 1) {
      const report = fromRoot(`.lighthouse/${page.slice(1).replaceAll('/', '_')}-${i}.json`);
      await run('pnpm', [
        'dlx',
        `lighthouse@${LIGHTHOUSE_VERSION}`,
        server.url + page,
        '--output=json',
        `--output-path=${report}`,
        `--only-categories=${CATEGORIES.join(',')}`,
        '--chrome-flags=--headless=new',
        '--quiet',
      ]);
      const lhr = JSON.parse(await readFile(report, 'utf8'));
      if (lhr.runtimeError) throw new Error(`Lighthouse runtime error: ${lhr.runtimeError.message}`);
      for (const category of CATEGORIES) {
        scores[category].push(Math.round(lhr.categories[category].score * 100));
        for (const ref of lhr.categories[category].auditRefs) {
          const audit = lhr.audits[ref.id];
          if (ref.weight > 0 && audit.score !== null && audit.score < 0.9 && category !== 'performance') {
            failing.set(`${category}: ${audit.title}`, audit.displayValue ?? '');
          }
        }
      }
      metrics.lcp.push(lhr.audits['largest-contentful-paint'].numericValue);
      metrics.fcp.push(lhr.audits['first-contentful-paint'].numericValue);
      metrics.tbt.push(lhr.audits['total-blocking-time'].numericValue);
      metrics.cls.push(lhr.audits['cumulative-layout-shift'].numericValue);
      metrics.si.push(lhr.audits['speed-index'].numericValue);
    }

    console.log(`\n${page}  (mobile, median of ${RUNS} run${RUNS === 1 ? '' : 's'})`);
    for (const category of CATEGORIES) {
      const value = median(scores[category]);
      const ok = value >= THRESHOLDS[category];
      if (!ok) failed = true;
      console.log(
        `  ${ok ? '✓' : '✗'} ${category.padEnd(15)} ${String(value).padStart(3)}  (need ≥ ${THRESHOLDS[category]}; runs: ${scores[category].join(', ')})`,
      );
    }
    console.log(
      `    FCP ${(median(metrics.fcp) / 1000).toFixed(2)}s · LCP ${(median(metrics.lcp) / 1000).toFixed(2)}s · TBT ${Math.round(median(metrics.tbt))}ms · CLS ${median(metrics.cls).toFixed(3)} · Speed Index ${(median(metrics.si) / 1000).toFixed(2)}s`,
    );
    for (const [title, value] of failing) console.log(`    ! ${title} ${value}`);
  }
} finally {
  await server.close();
}

console.log(`\nReports: .lighthouse/`);
process.exit(failed ? 1 : 0);
