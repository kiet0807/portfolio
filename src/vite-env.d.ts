/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Injected at build time by vite.config.ts. Empty string when not configured. */
  readonly VITE_SITE_URL?: string;
  /** Injected at build time by vite.config.ts, e.g. "2026.11.11". Undefined in tests. */
  readonly VITE_BUILD_DATE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
