@AGENTS.md

Every project rule lives in `AGENTS.md`, imported above. Add or update rules there so Claude Code, Codex, and Antigravity stay in sync.

## Claude Code only

- Project skills in `.claude/skills/`: `release`, `cv`, `write-article`, `gemini-review`.
- Shared machine: find the other sessions with `ListAgents` and tell them with `SendMessage` before a heavy run. Sessions signed in to another Claude account do not show up there, so also check `uptime`.
