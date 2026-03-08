# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Run directly (no build step needed)
npx tsx src/index.ts <command>

# Or after npm link / sudo npm link
claude-clone <command>

# Type-check only (no emit)
npx tsc --noEmit
```

## Architecture

`bin/claude-clone.js` is the entry point — it spawns `tsx` to run `src/index.ts` directly, so there is no build step. TypeScript is never compiled to JS in normal usage.

**Command flow:** `src/index.ts` registers Commander commands → each command in `src/commands/` handles its own logic, calling into `src/lib/` for side effects and `src/ui/` for interactive prompts.

**Key data flow for `claude-clone create`:**
1. `commands/create.ts` resolves org + repo list (via preset, `--repos` flag, or interactive)
2. `lib/github.ts` — runs `gh repo list [org]` (no org = authenticated user's repos)
3. `ui/searchable-checkbox.ts` — custom `@inquirer/core` prompt with Fuse.js fuzzy filtering; selections persist in a `Set<string>` keyed by repo name across filter changes
4. `lib/clone.ts` — parallel `git clone` via `listr2` with `concurrent: true`; uses HTTPS (`repo.url`) by default, SSH with `--ssh`
5. `lib/claude.ts` — writes `CLAUDE.md` to workspace root, then spawns `claude --add-dir <repo>... <workspaceDir>` with `cwd` set to the workspace

**Config** is stored at `~/.config/claude-clone/config.json` and managed by `lib/config-store.ts`. The `Preset.org` field is optional — omitting it means the preset uses the authenticated user's own repos.

## ESM / Import notes

- `"type": "module"` + `"moduleResolution": "Node16"` — all internal imports must use `.js` extensions even though source files are `.ts`
- `@inquirer/core` hooks (`useState`, `useRef`, `useMemo`, `useKeypress`) work like React hooks and must only be called inside `createPrompt`
