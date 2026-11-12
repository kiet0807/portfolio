/**
 * Static preview server that behaves like the Vercel deployment:
 * clean URLs (/en → en/index.html), 404.html with a real 404 status,
 * the headers from vercel.json, brotli/gzip compression, and the chat function
 * at /api/chat (api/chat.js). The CLI reads GEMINI_API_KEY from .env.local when present.
 *
 *   node scripts/serve.mjs [port]      (default 4173)
 */
import { existsSync, statSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { brotliCompressSync, gzipSync } from 'node:zlib';
import chat from '../api/chat.js';
import { fromRoot } from './lib.mjs';

const DIST = fromRoot('dist');
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.webmanifest': 'application/manifest+json',
  '.json': 'application/json',
  '.xml': 'application/xml',
  '.txt': 'text/plain; charset=utf-8',
  '.pdf': 'application/pdf',
};
const COMPRESSIBLE = new Set(['.html', '.js', '.css', '.svg', '.webmanifest', '.json', '.xml', '.txt']);

function resolveFile(pathname) {
  const clean = normalize(decodeURIComponent(pathname)).replace(/^(\.\.[/\\])+/, '');
  const candidates = [join(DIST, clean), join(DIST, clean, 'index.html'), join(DIST, `${clean}.html`)];
  return candidates.find((file) => file.startsWith(DIST) && existsSync(file) && statSync(file).isFile());
}

/** Runs a Web-standard function (Request in, Response out) for a Node request. */
async function runFunction(fn, req, res, url) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
  const headers = new Headers();
  for (const [name, value] of Object.entries(req.headers)) {
    if (value !== undefined) headers.set(name, Array.isArray(value) ? value.join(', ') : value);
  }
  // Vercel tells its functions who is calling; locally that is the socket.
  if (!headers.has('x-forwarded-for')) headers.set('x-forwarded-for', req.socket.remoteAddress ?? '');
  const response = await fn.fetch(
    new Request(new URL(url.pathname + url.search, `http://${req.headers.host}`), {
      method: req.method,
      headers,
      body: hasBody ? Buffer.concat(chunks) : undefined,
    }),
  );
  res.writeHead(response.status, Object.fromEntries(response.headers));
  res.end(Buffer.from(await response.arrayBuffer()));
}

export async function startServer(port = 4173) {
  const vercel = JSON.parse(await readFile(fromRoot('vercel.json'), 'utf8'));
  const headerRules = vercel.headers.map((rule) => ({
    test: new RegExp(`^${rule.source}$`),
    headers: rule.headers,
  }));
  const cache = new Map();

  const server = createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    // trailingSlash: false → /en/ redirects to /en
    if (url.pathname.length > 1 && url.pathname.endsWith('/')) {
      res.writeHead(308, { Location: url.pathname.slice(0, -1) + url.search });
      res.end();
      return;
    }
    if (url.pathname === '/api/chat') {
      await runFunction(chat, req, res, url);
      return;
    }
    let file = resolveFile(url.pathname);
    let status = 200;
    if (!file) {
      file = join(DIST, '404.html');
      status = 404;
    }
    const ext = extname(file);
    const headers = { 'Content-Type': TYPES[ext] ?? 'application/octet-stream' };
    if (ext === '.html') headers['Cache-Control'] = 'public, max-age=0, must-revalidate';
    for (const rule of headerRules) {
      if (rule.test.test(url.pathname)) for (const { key, value } of rule.headers) headers[key] = value;
    }
    // HSTS is meaningless on http://localhost and only confuses local tooling.
    delete headers['Strict-Transport-Security'];

    const accept = String(req.headers['accept-encoding'] ?? '');
    const encoding = !COMPRESSIBLE.has(ext)
      ? ''
      : accept.includes('br')
        ? 'br'
        : accept.includes('gzip')
          ? 'gzip'
          : '';
    const key = `${file}|${encoding}`;
    let body = cache.get(key);
    if (!body) {
      const raw = await readFile(file);
      body = encoding === 'br' ? brotliCompressSync(raw) : encoding === 'gzip' ? gzipSync(raw) : raw;
      cache.set(key, body);
    }
    if (encoding) headers['Content-Encoding'] = encoding;
    headers['Vary'] = 'Accept-Encoding';
    headers['Content-Length'] = body.length;
    res.writeHead(status, headers);
    res.end(req.method === 'HEAD' ? undefined : body);
  });

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', resolve);
  });
  return {
    url: `http://127.0.0.1:${port}`,
    close: () =>
      new Promise((resolve) => {
        server.close(resolve);
        // Browsers keep connections alive; without this, close() would wait for them.
        server.closeAllConnections();
      }),
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (!existsSync(join(DIST, 'en/index.html'))) {
    console.error('dist/ is missing. Run `pnpm build` first.');
    process.exit(1);
  }
  // Local secrets, never committed: GEMINI_API_KEY=... in .env.local turns the AI answers on.
  if (existsSync(fromRoot('.env.local'))) process.loadEnvFile(fromRoot('.env.local'));
  const { url } = await startServer(Number(process.argv[2] ?? 4173));
  console.log(`Preview (Vercel-like) running at ${url}`);
  console.log(
    `Chat bot: ${process.env.GEMINI_API_KEY ? 'AI answers on (GEMINI_API_KEY found)' : 'ready-made answers only (no GEMINI_API_KEY)'}`,
  );
}
