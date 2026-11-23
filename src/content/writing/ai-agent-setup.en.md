Most of the code I write now starts with an AI agent. Agents write fast, but they know nothing about a team's conventions: where a module goes, how a query is named, which checks a change has to pass. Everything an agent knows about a codebase, it learns from the repository itself. So for me the repository has become the most important prompt, and the most durable one: it does not disappear when the session ends.

The harder part is that this repository does not serve one agent but four: Claude Code, Codex, Gemini CLI and GitHub Copilot, each looking for instructions in a different place. Write four sets of rules, and within weeks you have four versions of the truth. Worse, when the configuration is wrong, none of these tools tells you.

This post walks through how I solved that on the Onflow OMS frontend after six months of running it, with the folder layout and configuration excerpts you need to rebuild it in your own repository. These tools change quickly; everything described here is accurate as of November 2026.

> **Update, November 23, 2026.** Copilot now reads `AGENTS.md` directly, and in some places (the coding agent, the CLI, code review) `CLAUDE.md` as well; the pointer in `.github/` is therefore a fallback, while the `applyTo:` files still do a job of their own. Gemini CLI stopped serving personal accounts on June 18, 2026, when Google moved to Antigravity CLI; it still runs with a paid API key or an enterprise plan.

## The whole picture

Before going through the parts, here is the entire setup, condensed:

```
AGENTS.md                         the rules: single source
CLAUDE.md                         15 lines, imports AGENTS.md
notes/                            state of jobs in progress
.agents/
  skills/<name>/SKILL.md          procedures, written once
  commands/                       slash commands
.claude/
  skills -> ../.agents/skills     a symlink, not a copy
  commands -> ../.agents/commands
  agents/                         3 subagents
  hooks/session-start.sh
  settings.json
.codex/config.toml                size limit for AGENTS.md
.gemini/settings.json             points Gemini at AGENTS.md
.github/
  copilot-instructions.md         points Copilot at AGENTS.md
  instructions/                   5 path-scoped rule files
scripts/check-agent-config.js     a linter for this setup itself
```

## One source of rules, many pointers

Every rule lives in a single file: `AGENTS.md` at the repository root, the open convention Codex reads natively. The other three tools need no copy, only a pointer:

| Agent       | How it loads the rules                                                                        |
| ----------- | --------------------------------------------------------------------------------------------- |
| Codex       | Reads `AGENTS.md` directly, with its size limit raised in `.codex/config.toml`                |
| Claude Code | `CLAUDE.md` imports `AGENTS.md` with a single `@AGENTS.md` line                               |
| Gemini CLI  | `context.fileName` in `.gemini/settings.json` points at `AGENTS.md`                           |
| Copilot     | `.github/copilot-instructions.md` leads back to `AGENTS.md`, plus five path-scoped rule files |

The core of `CLAUDE.md` is no more than this:

```md
# CLAUDE.md

@AGENTS.md

Every rule lives in AGENTS.md, imported above. A new rule goes there,
never here: this is the one file the other agents cannot see.
```

`CLAUDE.md` is kept short on purpose. It is loaded into every session, relevant or not, and not every agent reads it: Codex and Gemini CLI do not, and Copilot only in some places. A rule written there is a rule only part of the team of agents knows.

Copilot's five rule files cover the areas that come up most: the data layer, forms, tests, TypeScript and UI. Each declares `applyTo:`, so Copilot applies it only to the matching paths.

## Rules always loaded, procedures opened on demand

By October 2026, `AGENTS.md` had grown past 100 KB. Everything in it was correct, but not everything was needed for every task. I split it along one simple line: what most tasks need stays in `AGENTS.md`; detailed procedures become **skills**, opened only when the job calls for them. The main file shrank to about half.

The repository now has seven skills: creating a page, adding a module, writing the data layer, UI/UX, analytics, the tricky business rules, and the verification procedure. An agent fixing a form never reads the analytics guide. A leaner context keeps the agent focused, and every session spends fewer tokens.

Each skill is written **once**, in `.agents/skills/`. Codex, Gemini CLI and Copilot all scan that folder on their own. Claude Code reads only `.claude/skills/`, so that path is a symlink back to `.agents/skills/`, not a copy:

```bash
ln -s ../.agents/skills .claude/skills
ln -s ../.agents/commands .claude/commands
```

Copying a skill per agent is the fastest way to let four versions drift apart.

## Three subagents, three roles, a model for each job

Claude Code can hand work to subagents, each with its own context, its own tools and its own model. I use three, and none of them is allowed to edit code:

| Subagent | Job                                                                                         | Model               | Tools               |
| -------- | ------------------------------------------------------------------------------------------- | ------------------- | ------------------- |
| Explorer | Finds the module that owns a domain, and where its queries, pages and translation keys live | Haiku               | File reading only   |
| Reviewer | Checks a change against the repository's rules before it is committed                       | Same as the session | File reading, shell |
| Verifier | Runs exactly the checks a change needs and reports only what failed                         | Same as the session | File reading, shell |

Each subagent is a Markdown file with a short header. The explorer, condensed, looks like this:

```md
---
name: explorer
description: Finds which module owns a domain and where its code lives.
  Use before editing an unfamiliar module.
tools: Read, Grep, Glob
model: haiku
---

You locate code and hand back exact paths. You do not edit,
and you do not review.
```

Each role has its own reason. Finding code is mostly reading and very little thinking, so the explorer runs on **Haiku**, the smallest and cheapest model. The reviewer's value is a clean context: the person who wrote the code has grown used to their own diff, while the reviewer sees it for the first time. And the verifier keeps pages of test and lint output in its own context, sending back to the main session only the list of what failed.

Matching the model to the job and keeping logs out of the main context are the two most effective ways I know to save tokens. Both live in configuration, so neither depends on someone remembering to switch it on.

## Memory lives in files

Agents don't remember the previous session. A large job, like moving more than 1,600 files to TypeScript, always spans several sessions and sometimes several different agents. So I separate two kinds of information: **rules** live in `AGENTS.md`, and the **state of a job in progress** lives in a `notes/` folder, one file per job.

A rule says to read `notes/` before touching anything. But a rule is only an expectation. So there is also a **SessionStart hook**, declared in `.claude/settings.json`:

```json
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "bash \"$CLAUDE_PROJECT_DIR/.claude/hooks/session-start.sh\""
          }
        ]
      }
    ]
  }
}
```

The script it calls does one thing: it prints the title of every open note, and whatever a hook prints goes into the new session's context. Its core:

```bash
cd "$CLAUDE_PROJECT_DIR" 2>/dev/null || exit 0
shopt -s nullglob
for note in notes/*.md; do
  printf -- '- %s: %s\n' "$note" "$(grep -m1 '^# ' "$note" | sed 's/^# //')"
done
```

Reading the notes goes from hoping the agent remembers to something that simply happens. Two small details matter. The hook stays quiet when it fails, because a hook that keeps erroring is a hook someone eventually turns off. And a note is never trusted beyond what `git log` and the checks confirm: the session that wrote it may have been cut off before its last step.

## Every configuration failure is silent

This is the part that changed how I think about agent configuration. None of the following produces an error:

- `AGENTS.md` grows past Codex's default 32 KB limit (the file is still about 50 KB today). Codex cuts it off mid-file, and the part it drops is the Verification section at the end, the very part that tells an agent how to prove its change works.
- The Claude Code symlink breaks. Claude Code simply has no skills, and never says so.
- A skill is renamed, but its companion config file keeps the old name. This actually reached the main branch and survived a review: one line, in a file nobody rereads.
- A Copilot rule file is saved with the wrong extension or loses its `applyTo:`. Copilot ignores it without a word.

The first one is fixed with a single line of Codex configuration:

```toml
# .codex/config.toml
project_doc_max_bytes = 131072
```

The rest need a tool of their own: `lint:agents`, a Node script of about 400 lines with no dependencies, and the only thing in the repository that actually reads these files. It compares the size of `AGENTS.md` with the limit configured for Codex, checks that the symlinks still resolve, that every skill's name matches its folder, that Copilot's rule files are named correctly and declare `applyTo:`, and that every document only mentions skills that exist. It runs first in the architecture checks in CI. A broken configuration turns the pull request red, instead of letting an agent quietly do the wrong thing.

Agent configuration is code. It deserves review and tests like any other code.

## Two repositories, one system

Fulfillment Connect, the product I built from an empty repository, shares its architecture with OMS. Its agent setup does too: skill names, subagent names, commands, settings and the linter itself are kept identical across both repositories. A change on one side is carried to the other, never forked. Where the content differs, it is because the products differ, not because two rule sets have drifted apart.

## Where to start

You don't need to build all of this in a day. The order I recommend, each step taken only when the previous one starts to feel tight:

1. **Write a short `AGENTS.md`**: how to run the project, the folder layout, naming conventions, and how to verify a change. The last part is the one agents need most.
2. **Add a pointer** for each tool your team uses. A pointer, not a copy.
3. **Move procedures into skills** once `AGENTS.md` grows beyond what a typical task needs.
4. **Add subagents** for work that is heavy on reading and light on thinking, such as finding code and running checks, on a cheaper model.
5. **Add hand-off notes and a hook** once work starts spanning several sessions.
6. **Write a linter for the configuration** as soon as you have two pointers or more. That is when silent failures start finding places to hide.

## What I took away

- **The repository is the most durable prompt.** What an agent needs to know belongs in the repo, reviewed alongside the code, not in anyone's memory.
- **One source, many pointers.** Four tools, one set of rules. Every copy is a version of the truth waiting to diverge.
- **Keep what always loads short; open depth on demand.** Core rules in `AGENTS.md`, procedures in skills.
- **Size the model to the job.** Searching does not need the strongest model; reviewing does.
- **Test the configuration too.** Anything that can break silently needs a check that speaks up for it.
- **Don't add what nothing reads.** Two folders once added for Codex, which Codex never read, were removed, and the linter keeps them out. New tooling, MCP servers included, comes in only when there is a real need for it.

A strong agent does not produce quality on its own. The environment around it does: clear rules, procedures at the right moment, checks that cannot be skipped, and a human who reads every diff. When the repository speaks clearly, the agent does the right thing. When the repository is silent, the agent guesses.
