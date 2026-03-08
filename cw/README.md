# cw — Claude Workspace CLI

Interactive multi-repo workspace tool for Claude Code. Fuzzy-search GitHub repos, select multiple, clone them in parallel, and launch Claude with full context across all of them.

## Install

```bash
git clone https://github.com/yourname/cw
cd cw
npm install
sudo npm link   # makes `cw` available globally
```

Or run directly with:

```bash
npx tsx src/index.ts <command>
```

**Requirements:** [`gh` CLI](https://cli.github.com/) installed and authenticated (`gh auth login`), `claude` CLI in PATH.

## Usage

### `cw create [name]`

Interactive workspace setup — prompts for org (or leave blank for your own repos), shows a fuzzy-searchable checkbox to pick repos, clones them in parallel, and launches Claude.

```bash
cw create my-feature
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
cw create                                      # interactive: prompts for org, fuzzy-select repos
cw create my-feature --org acme               # skip org prompt
cw create my-feature --org acme --repos api,frontend  # non-interactive
cw create my-feature --preset backend         # use saved preset
cw create my-feature --shallow --no-open      # clone only, don't launch Claude
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

### `cw open [name]`

Reopen an existing workspace in Claude Code.

```bash
cw open                  # select from existing workspaces
cw open my-feature       # open directly by name
```

---

### `cw preset list|save|delete`

Save and manage named repo groups.

```bash
cw preset list
cw preset save backend --org acme
cw preset delete backend
```

Then use them:

```bash
cw create my-feature --preset backend
```

---

### `cw config get|set`

Read or update global config.

```bash
cw config get
cw config get defaultOrg
cw config set defaultOrg acme
cw config set workspaceDir ~/workspaces/claude
```

---

## Config

Stored at `~/.config/cw/config.json`:

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
