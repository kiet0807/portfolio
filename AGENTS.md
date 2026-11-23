# AGENTS.md: Portfolio (`kietnguyen.io.vn`)

Single source of truth for AI coding agents working on this repo (Claude Code imports this file via `CLAUDE.md`; Codex and Antigravity read it directly). `README.md` explains how everything works; this file holds the rules.

## Overview

- Bilingual (Vietnamese `/vi`, English `/en`) personal portfolio, technical writing, generated 2-page PDF CVs, and the Kai AI assistant (`server/chat.js`, `api/chat.js`).
- Stack: React, TypeScript, Vite, Tailwind CSS, Three.js, Vitest, a puppeteer-core QA suite (`scripts/qa.mjs`), Lighthouse.
- Live site: `https://kietnguyen.io.vn` (Vercel auto-deploys on push to `main`).

## Directory map

| Path                            | Contents                                                                                     |
| ------------------------------- | -------------------------------------------------------------------------------------------- |
| `src/data/profile.ts`           | Single source of truth for profile, experience, projects, skills, and CV data                |
| `src/content/articles.ts`       | Article registry                                                                             |
| `src/content/writing/`          | Bilingual article markdown (`<slug>.{en,vi}.md`)                                             |
| `src/i18n/dictionary.ts`        | UI copy (`vi` and `en`)                                                                      |
| `src/components/`               | UI sections, 3D hero, Kai chatbot                                                            |
| `server/chat.js`, `api/chat.js` | Server-side Kai chatbot guardrails and Gemini API handler                                    |
| `scripts/`                      | Prerender, asset/OG generation, CV PDF generation (`cv.mjs`), QA, Lighthouse, preview server |
| `.claude/skills/`               | Step-by-step procedures (see "Skills"); plain Markdown, readable by any agent                |

## Commands

| Command                       | Purpose                                                                              |
| ----------------------------- | ------------------------------------------------------------------------------------ |
| `pnpm dev`                    | Local dev server                                                                     |
| `pnpm check`                  | Typecheck, ESLint, Prettier, Vitest unit tests, build, and bundle-size budget check  |
| `pnpm qa`                     | End-to-end QA suite against built `dist/`                                            |
| `pnpm lighthouse`             | Lighthouse audit across `/en`, `/vi`, and every article page                         |
| `pnpm cv` / `pnpm cv:private` | Regenerate public (`public/cv-*.pdf`) and private (`private/cv-*.pdf`) 2-page A4 CVs |
| `pnpm format`                 | Format with Prettier                                                                 |

## Key invariants

- **Public repo:** Never commit `private/`, `.env*` (except `.env.example`), local working notes, or personal phone numbers/company secrets.
- **Commit and push:** Only commit or push when explicitly asked (`git push` publishes to production). Stage files by name.
- **Truthful profile & articles:** Never fabricate metrics, roles, or colleague quotes. Keep company details at architecture/metric level without proprietary code or internal URLs.
- **After editing `src/data/profile.ts`:** Run `pnpm build && pnpm cv && pnpm cv:private`. CVs are at the minimum 8pt font size — adding content requires trimming elsewhere so both PDFs stay 2 pages.
- **Before pushing:** Run `pnpm check`, `pnpm qa`, and `pnpm lighthouse` (if UI changed). Do not run `pnpm build` concurrently with `pnpm qa` (build wipes `dist/`).
- **Preview server:** `pnpm preview` caches compressed files in memory; restart it after each build.
- **Visual changes:** show screenshots (both languages, dark and light, phone and desktop) and get approval before committing.
- **Link previews:** bump `OG_DESIGN` in `src/seo/head.ts` when the look of the OG images changes, so their URLs change and LinkedIn fetches the new picture.
- **Domains:** the site stays on `kietnguyen.io.vn`. Do not add other domains to the Vercel project: the build takes the shortest production domain as `siteUrl`.

## Skills

Procedures with several steps live in `.claude/skills/<name>/SKILL.md`. Claude Code loads them by name; other agents can open the file and follow it.

| Skill           | Use it to                                                                       |
| --------------- | ------------------------------------------------------------------------------- |
| `release`       | Check, commit, push, and verify the live site after a change                    |
| `cv`            | Reprint the CVs after a profile change and keep both PDFs on 2 pages            |
| `write-article` | Add or update a bilingual article                                               |
| `gemini-review` | Run the outside review (Gemini CLI against a clean clone) and triage its report |

## Working notes (local only)

- `.ai/PROGRESS.md` (rolling status, ≤ 25 lines) and `HANDOFF.md` (current state, open items, conventions) stay on this machine; both are git-ignored. Read them first, update them as you go.
- Finished plans, old handoff logs and review reports go to `.ai/archive/` and `.ai/reviews/`.
- The machine is shared with other agent sessions. Before a heavy run (`pnpm qa`, `pnpm lighthouse`, `pnpm cv`, a review), ask the other sessions and check `uptime`; say when you start and when you finish.
