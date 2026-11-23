---
name: write-article
description: Add a new bilingual article to the portfolio's Writing section, or update a published one (with an update date). Use when the user wants to publish, draft, translate or revise an article on kietnguyen.io.vn.
---

# Write or update an article

README, section "Bài viết", describes the format. The steps and the rules that are easy to miss:

## 1. Draft outside the repo

- Draft in `../drafts/` until the user approves the text; the repo is public and every push goes live.
- Voice: professional, modern, polished. Vietnamese uses "tôi". Both languages say the same thing; neither is a loose summary of the other.
- Truthful only: every number checked against git history, CI logs or the source the user names. About Onflow (the employer): architecture and numbers only; no code, customer names or internal addresses.

## 2. Add it

1. `src/content/writing/<slug>.vi.md` and `<slug>.en.md`. No `# Title` line (the title lives in the registry). Links: `https://`, `/…` or `#…` only.
2. A new entry at the top of `ARTICLES` in `src/content/articles.ts`: slug, date, title, summary, topics, reading time.
3. `pnpm test`: it fails on a missing language, a `#` heading, or a reading time that does not match the text (230 words a minute).
4. Title too long for the preview image: `pnpm build` stops and says so. Shorten the title.
5. An article about a project: add `article: '<slug>'` to that project in `src/data/profile.ts`; its card links to the article.

## 3. Update a published article

- Edit both languages, add `updated: 'YYYY-MM-DD'` to its registry entry, and put a short dated note in the text if the change is more than a typo. The date shows beside the publication date and becomes `dateModified` and `article:modified_time`.

## 4. Ship

- `release` skill. Afterwards the user pastes the new URLs (`/en/writing/<slug>`, `/vi/writing/<slug>`) into LinkedIn Post Inspector before sharing, so LinkedIn reads the new preview image.
