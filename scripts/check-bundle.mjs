/**
 * Bundle budget. Fails the build when the JavaScript needed for first load
 * (entry + statically imported chunks) exceeds 150 KB gzip, or when three.js
 * leaked into it. The lazy 3D chunk is reported separately.
 */
import { readdir, readFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { fromRoot, kb } from './lib.mjs';

const BUDGET = 150 * 1024;

const html = await readFile(fromRoot('dist/en/index.html'), 'utf8');
const initialFiles = new Set(
  [...html.matchAll(/<(?:script|link)\b[^>]*?(?:src|href)="(\/assets\/[^"]+\.js)"/g)].map((m) => m[1]),
);
if (initialFiles.size === 0) throw new Error('No entry script found in dist/en/index.html');

const gzipSize = async (file) => gzipSync(await readFile(file), { level: 9 }).length;

let initialTotal = 0;
let leaked = false;
console.log('Initial JavaScript (gzip):');
for (const file of initialFiles) {
  const path = fromRoot('dist', file.slice(1));
  const size = await gzipSize(path);
  initialTotal += size;
  if ((await readFile(path, 'utf8')).includes('WebGLRenderer')) leaked = true;
  console.log(`  ${file.padEnd(44)} ${kb(size)}`);
}

const assets = await readdir(fromRoot('dist/assets'));
console.log('Lazy chunks (gzip, not counted):');
for (const name of assets.filter((n) => n.endsWith('.js') && !initialFiles.has(`/assets/${n}`))) {
  console.log(`  ${`/assets/${name}`.padEnd(44)} ${kb(await gzipSize(fromRoot('dist/assets', name)))}`);
}
console.log('CSS (gzip):');
for (const name of assets.filter((n) => n.endsWith('.css'))) {
  console.log(`  ${`/assets/${name}`.padEnd(44)} ${kb(await gzipSize(fromRoot('dist/assets', name)))}`);
}

console.log(`\nInitial JS total: ${kb(initialTotal)} / budget ${kb(BUDGET)}`);
if (leaked) {
  console.error('FAIL: three.js is part of the initial bundle. It must stay in the lazy 3D chunk.');
  process.exit(1);
}
if (initialTotal > BUDGET) {
  console.error('FAIL: initial JavaScript exceeds the budget.');
  process.exit(1);
}
console.log('OK: within budget, three.js is not in the initial bundle.');
