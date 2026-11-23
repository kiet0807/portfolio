---
name: cv
description: Reprint the downloadable CVs (public and private, English and Vietnamese) after a change to src/data/profile.ts, scripts/cv-template.mjs or the fonts, and keep every PDF on two A4 pages. Use when the profile, experience, projects or CV layout change, or when the user asks for a new CV.
---

# Reprint the CVs

`scripts/cv.mjs` renders `scripts/cv-template.mjs` from `src/data/profile.ts` in Chrome and lowers the text size step by step (9.2pt down to 8pt) until the CV fits on two pages. Below 8pt it fails and writes nothing.

## 1. Build and print

1. `pnpm build` first (or `pnpm check`): the CV needs `public/fonts/`, and the run also refreshes `dist/cv-*.pdf`.
2. `pnpm cv`, then `pnpm cv:private` (adds the phone number from `private/contact.json`; writes only to `private/`, never committed).
3. Each line of output gives size, pages and text size, e.g. `cv-en.pdf <size> KB, 2 pages, text 8pt`. All four must say 2 pages.

## 2. When it does not fit

- The Vietnamese CV is usually the longer one. Trim words in the field you added, or elsewhere, rather than dropping a section.
- A project with `cvLine` takes one row instead of a card. (`print: false` only concerns the website's own printed version, not the CV.)
- Never fake brevity by cutting facts that make a claim true (numbers keep their context).

## 3. Look at the result

- Open both public PDFs (Read tool or Preview): header band, avatar, name accent, no orphaned heading at the top of page 2.
- If only the print date changed: `cmp -l <(git show HEAD:public/cv-en.pdf) public/cv-en.pdf | wc -l` gives 12 (the `CreationDate` and `ModDate` digits). Then restore with `git checkout -- public/cv-en.pdf public/cv-vi.pdf` so the commit carries no empty change.

## 4. The plain CV

`../cv-plain` (outside this repo) prints a one-column, ATS-friendly CV from the same `profile.ts` (`node build.mjs` there). Reprint it when contact details, titles or experience change, and tell the user, who uploads it to job sites by hand.
