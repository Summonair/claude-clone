# claude-clone — Claude Workspace CLI

Interactive multi-repo workspace tool for Claude Code. Fuzzy-search GitHub repos, select multiple, clone them in parallel, and launch Claude with full context across all of them.

## Install

```bash
npm install -g claude-clone
```

**Requirements:**
- [`gh` CLI](https://cli.github.com/) — `brew install gh && gh auth login`
- [Claude Code](https://claude.ai/code) — `claude` must be in PATH

## Usage

### `claude-clone create [name]`

Interactive workspace setup — prompts for org (or leave blank for your own repos), shows a fuzzy-searchable checkbox to pick repos, clones them in parallel, and launches Claude.

```bash
claude-clone create my-feature
```

**Flags:**

| Flag | Description |
|------|-------------|
| `--org <org>` | GitHub org to fetch repos from |
| `--repos <a,b,c>` | Skip selection, use explicit repo names |
| `--preset <name>` | Use a saved preset |
| `--shallow` | Shallow clone (`--depth 1`) |
| `--ssh` | Clone via SSH instead of HTTPS |
| `--branch <branch>` | Checkout a specific branch |
| `--no-open` | Skip launching Claude after cloning |
| `--base-dir <dir>` | Override workspace base directory |

**Examples:**

```bash
claude-clone create                                      # interactive: prompts for org, fuzzy-select repos
claude-clone create my-feature --org acme               # skip org prompt
claude-clone create my-feature --org acme --repos api,frontend  # non-interactive
claude-clone create my-feature --preset backend         # use saved preset
claude-clone create my-feature --shallow --no-open      # clone only, don't launch Claude
```

### Searchable Repo Picker

```
? Select repos (type to filter, space to select, enter to confirm):
  Filter: api█

  [x] api-service           REST API backend
  [ ] api-gateway           API gateway proxy
> [ ] api-docs              API documentation site

  3 of 142 repos shown · 1 selected
```

- Type to fuzzy-filter by name or description
- Arrow keys to navigate, space to toggle, enter to confirm
- Selections persist across filter changes

---

### `claude-clone open [name]`

Reopen an existing workspace in Claude Code.

```bash
claude-clone open                  # select from existing workspaces
claude-clone open my-feature       # open directly by name
```

---

### `claude-clone preset list|save|delete`

Save and manage named repo groups.

```bash
claude-clone preset list
claude-clone preset save backend --org acme
claude-clone preset delete backend
```

Then use them:

```bash
claude-clone create my-feature --preset backend
```

---

### `claude-clone config get|set`

Read or update global config.

```bash
claude-clone config get
claude-clone config get defaultOrg
claude-clone config set defaultOrg acme
claude-clone config set workspaceDir ~/workspaces/claude
```

---

## Config

Stored at `~/.config/claude-clone/config.json`:

```json
{
  "defaultOrg": "acme",
  "workspaceDir": "~/giterepos/claude-tasks",
  "presets": {
    "backend": {
      "org": "acme",
      "repos": ["api-service", "auth-service", "shared-lib"]
    }
  }
}
```

## Workspace layout

Each workspace gets a `CLAUDE.md` describing the repos, which Claude picks up automatically:

```
~/giterepos/claude-tasks/my-feature/
  CLAUDE.md
  api-service/
  auth-service/
  shared-lib/
```
