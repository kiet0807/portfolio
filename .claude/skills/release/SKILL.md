---
name: release
description: Ship a change of the portfolio to kietnguyen.io.vn - run every check, commit by file name, push main, wait for Vercel and verify the live site. Use when the user asks to commit and push, publish, deploy or release a change.
---

# Release a change

`git push` to `main` is a production deploy (Vercel builds every push). Commit and push only when the user has asked for each.

## 1. Prepare

- `git status` and `git diff --stat`. Only this change's files go into the commit; files another session or the user is working on stay out unless the user says otherwise.
- Shared machine: `ListAgents`, then `SendMessage` the busy sessions with the time window of the heavy steps below, and check `uptime`.
- Visual change: screenshots approved by the user (both languages, dark and light, phone and desktop) before committing.

## 2. Check

Run one at a time; `pnpm build` wipes `dist/`, so never run it while `pnpm qa` is reading it.

1. `pnpm check`: typecheck, lint, Prettier, unit tests, build, bundle budget (initial JS under 150 KB gzip).
2. `pnpm qa` against that build (about 6 minutes).
3. `pnpm lighthouse` if anything on screen changed (8 pages, 3 runs each, about 5 minutes). All four categories must stay at their thresholds; so far every page scores 100.
4. `src/data/profile.ts` or the CV template changed: the `cv` skill.

## 3. Commit

- `git add` each file by name.
- Message in English: a summary line (`Area: what changed; other change`), bullets on what a visitor or maintainer sees differently, then a `Checks:` line with the real numbers (tests passed, initial JS, QA, Lighthouse, CV pages), then the `Co-Authored-By` trailer.

## 4. Push and wait for Vercel

1. `git fetch origin` and `git log HEAD..origin/main` must be empty; then `git push origin main`.
2. Wait for the deployment without polling by hand: a background loop on
   `gh api repos/kiet0807/portfolio/commits/<sha>/status --jq .state` until `success` (or `failure`/`error`). It takes about a minute.

## 5. Verify the live site

Use `curl`; no browser is needed for most of it, and it costs no CPU while other sessions measure.

- New text or attributes are in `/en` and `/vi` (and in article pages if they changed).
- Main bundle: take `assets/index-*.js` from the live `/vi`, compare with `dist/` ignoring chunk hashes:
  `diff <(tr ',;' '\n\n' < live.js | sed -E 's/-[A-Za-z0-9_]{8}\.js/-HASH.js/g') <(… dist/assets/index-*.js …)`.
  The only expected difference is `siteUrl`, which Vercel fills in. Avoid heavy tools such as Python `difflib` on a 450 KB file.
- `cv-en.pdf`, `cv-vi.pdf`: `shasum` of the live file equals `git show HEAD:public/cv-<lang>.pdf | shasum`.
- `/vi/khong-co` and `/en/khong-co` return 404 and the same `404.html` as the build.

## 6. Record

- `HANDOFF.md`: the top section says which commit is live and what was checked; `.ai/PROGRESS.md` likewise.
- README "measured results" table when the numbers changed (tests, initial JS, QA count).
