import { fileURLToPath, URL } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';
import { themeInlineScript } from './src/theme/theme-script.ts';

/**
 * Public site URL used for canonical / Open Graph / sitemap.
 * Precedence: SITE_URL → Vercel production domain → profile.siteUrl (see src/seo/siteUrl.ts).
 */
const vercelDomain = process.env.VERCEL_PROJECT_PRODUCTION_URL;
const siteUrl = process.env.SITE_URL ?? (vercelDomain ? `https://${vercelDomain}` : '');

/** Injects the anti-FOUC theme script into <head> in both dev and build. */
function themeScript(): Plugin {
  return {
    name: 'portfolio:theme-script',
    transformIndexHtml(html) {
      return html.replace('<!--theme-script-->', `<script>${themeInlineScript}</script>`);
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), themeScript()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  define: {
    'import.meta.env.VITE_SITE_URL': JSON.stringify(siteUrl),
    // Shown in the footer as the build stamp.
    'import.meta.env.VITE_BUILD_DATE': JSON.stringify(
      new Date().toISOString().slice(0, 10).replaceAll('-', '.'),
    ),
  },
  build: {
    target: 'es2022',
    sourcemap: false,
    reportCompressedSize: false,
    // The only large chunk is the lazy 3D scene (three.js), which is never part of the
    // initial load. The real budget is enforced by scripts/check-bundle.mjs.
    chunkSizeWarningLimit: 1000,
  },
});
