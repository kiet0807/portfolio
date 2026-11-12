In September 2026 I moved the entire frontend of a production order management system (OMS) from JavaScript to TypeScript. From adding `tsconfig.json` to switching off `allowJs` took 10 days. As of November 2026, the codebase has more than 2,100 TypeScript files, not a single JavaScript file, `strict` turned on, and just 3 `@ts-expect-error` lines in the whole repository.

Ten days sounds reckless. In truth, the conversion was the easy part. What decided it were the ten months of cleanup that came before, and the way the work was split up during those ten days. This post covers both, with the actual configuration and order of work so you can apply them to your own codebase.

| Measure          | First day (Sep 10)                   | `allowJs` off (Sep 20)    |
| ---------------- | ------------------------------------ | ------------------------- |
| JavaScript files | 1,687                                | 0                         |
| TypeScript files | 0                                    | 1,719                     |
| `strict` mode    | On for every `.ts` file from day one | Covers the whole codebase |

## Why not convert from the start

When I took over the repository it had about 1,400 JavaScript files, built with Create React App, state kept in Redux, and folders organized by file type (components, pages, actions) rather than by business domain. Adding TypeScript to a codebase like that gives you types for each file, but the types say nothing about the boundaries between parts, because there are no boundaries yet.

So I went the other way round: structure first, types second.

1. **Moved the build from Create React App to Vite** (November 2025). Builds and deployments became much faster, and more importantly, the feedback loop shrank for everything that came after.
2. **Reorganized the code by business module** (November 2025 to early 2026). Seven modules: auth, account, product, inbound, outbound, report, service. Each has its own pages, components, queries and routes, and exposes itself through a single entry point.
3. **Moved server state from Redux to TanStack Query** (April 2026). Every data domain has one API function, one query and one set of keys. This is exactly where types would later pay off the most.
4. **Let lint guard the architecture instead of memory.** Eight check scripts run in CI: no module may import another module's internals, no import cycles, and query keys must match on both sides. On September 1 I removed the last 18 import cycles.

After these four steps, each module was a block with clear edges. Converting to TypeScript then became a matter of repeating one recipe, block by block.

## Ten days

**Day one: infrastructure only.** I replaced `jsconfig.json` with `tsconfig.json`, taught ESLint, Vite, Vitest and the eight architecture scripts about `.ts`/`.tsx`, added a type-check step to CI, and wrote the conversion rules into the repository's guide. The most important part of that day fits in a few lines of configuration:

```json
{
  "compilerOptions": {
    "strict": true,
    "allowJs": true,
    "checkJs": false,
    "noEmit": true,
    "isolatedModules": true
  }
}
```

The first three flags are the whole strategy. `strict` is on from day one, so every file is strict the moment it becomes `.ts`. There is no "loose for now, tighten later" phase, which in practice rarely gets tightened. `allowJs` lets both worlds live side by side during the move. `checkJs: false` keeps 1,687 JavaScript files from producing thousands of errors at once: each one is checked only when its turn comes.

At the end of the day I converted exactly one file to `.tsx`, a canary, to prove the whole toolchain worked from the editor to CI. No business code was touched.

**Day two: a pilot module.** I picked a small module (service, about 60 files) and converted all of it. The point was not to finish a module but to test the recipe. The recipe held up, and it works from the leaves inward:

1. The module's root: routes, constants and the API functions.
2. Utilities and validation rules.
3. Queries: types for requests, responses and query keys.
4. Hooks.
5. Components.
6. Pages, last.

Each layer depends only on layers that are already typed, so type errors show up in the layer being converted instead of spreading upward. The same day, I applied the recipe to auth, report, inbound and the shared components.

**The days after: repeat in small batches.** Each commit was one folder: a page, a group of components, a queries layer. Small batches are easy to review, and when a batch breaks types somewhere else, you know immediately which batch it was. Twice I had to stop and clean up type errors that earlier batches had left behind; with big batches, those two stops would have been two days of digging.

**The last day (September 20): close the door.** When the last `.js` file was gone, I switched off `allowJs`. From then on nobody, me included, could add a JavaScript file back to the repository.

## Doing it with AI agents

Most of the conversion batches were drafted by AI agents, and I reviewed every diff. Three things made that work:

- **The recipe lives in the repository, not in the prompt.** The conversion rules were written into `AGENTS.md`, so every agent session started from the same standard.
- **Hand-off notes between sessions.** A `notes/` folder recorded which batches were done, which were in progress, and what had been decided. Agents don't remember the previous session; files do.
- **CI is the referee.** Type-checking, architecture lint and the test suite run on every pull request. When an agent gets it wrong, CI stops it; I don't have to catch it by eye.

Without these three, an agent's speed only produces mistakes faster.

## Types found real bugs

After ten days every file was TypeScript, but many API responses were still loosely typed. Over the next two days I typed the data layer domain by domain, from the real API payloads rather than from guesses. Where an endpoint had no sample response yet, I wrote it down as an open question and waited for real data instead of filling in a plausible shape. That is where TypeScript paid for itself:

- three cache bugs and two crashes in the inbound and returns flows;
- two "success" messages that appeared even when the request had failed;
- 88 queries that showed every error message twice;
- several queries that swallowed their own errors, leaving an empty screen with no explanation.

None of these were "wrong type" bugs in the narrow sense. They surfaced because typing forced me to reread every data flow and answer the same questions each time: what comes in here, what goes out, and what happens when it fails.

## If I did it again

- **Draw the boundaries before adding types.** If I could keep only one lesson, it would be this one.
- **Turn on `strict` from day one, for converted files only.** A temporary loose mode tends to become permanent.
- **One day for infrastructure and a canary file.** Far cheaper than finding out halfway through that CI never ran the type-check.
- **Pilot on a small module**, and write the recipe down before scaling it.
- **Leaves first, small batches, one folder per commit.**
- **Switch off `allowJs` as soon as you can.** A migration without an end date never ends.
- **Type data from real payloads.** A wrong type is worse than no type, because it looks trustworthy.

The result is more than file extensions changing from `.js` to `.ts`. Together with the restructuring that came before it, the release cycle is now half as long, production hotfixes have nearly disappeared, and a new teammate, or a new agent, can open the repository and know where everything lives.
