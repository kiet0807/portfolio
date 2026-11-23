import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Absolute path of the project root (parent of /scripts). */
export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export const fromRoot = (...segments) => resolve(ROOT, ...segments);

/** The decimal mark of the language, as src/lib/number.ts does on the page. */
export const localNumber = (text, lang) => (lang === 'vi' ? text.replace(/(\d)\.(\d)/g, '$1,$2') : text);

export const kb = (bytes) => `${(bytes / 1024).toFixed(1)} KB`;

/** Width/height of a PNG, read from its IHDR chunk. */
export function pngSize(buffer) {
  const signature = buffer.subarray(0, 8).toString('hex');
  if (signature !== '89504e470d0a1a0a') throw new Error('Not a PNG file');
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}
