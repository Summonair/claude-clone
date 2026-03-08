import { Command } from 'commander';
import { input } from '@inquirer/prompts';
import pc from 'picocolors';
import path from 'path';
import { fetchRepos } from '../lib/github.js';
import { cloneRepos } from '../lib/clone.js';
import { writeClaudeMd, launchClaude } from '../lib/claude.js';
import { loadConfig } from '../lib/config-store.js';
import { workspacePath, ensureDir } from '../lib/paths.js';
import { searchableCheckbox } from '../ui/searchable-checkbox.js';
import type { Repo } from '../types.js';

export function createCommand(): Command {
  const cmd = new Command('create');

  cmd
    .description('Create a new multi-repo workspace and launch Claude Code')
    .option('-o, --org <org>', 'GitHub organization to fetch repos from')
    .option('-p, --preset <name>', 'Use a saved preset')
    .option('-r, --repos <repos>', 'Comma-separated list of repo names to include')
    .option('-s, --shallow', 'Shallow clone (--depth 1)', false)
    .option('--ssh', 'Clone via SSH instead of HTTPS', false)
    .option('-b, --branch <branch>', 'Checkout a specific branch')
    .option('--no-open', 'Skip launching Claude Code after cloning')
    .option('--base-dir <dir>', 'Override workspace base directory')
    .argument('[name]', 'Workspace name (defaults to org name or timestamp)')
    .action(async (name: string | undefined, opts: {
      org?: string;
      preset?: string;
      repos?: string;
      shallow: boolean;
      ssh: boolean;
      branch?: string;
      open: boolean;
      baseDir?: string;
    }) => {
      try {
        const config = await loadConfig();
        const baseDir = opts.baseDir ?? config.workspaceDir;

        let org = opts.org;
        let selectedRepos: Repo[] = [];

        // --- Resolve via preset ---
        if (opts.preset) {
          const preset = Object.hasOwn(config.presets, opts.preset) ? config.presets[opts.preset] : undefined;
          if (!preset) {
            console.error(pc.red(`Preset "${opts.preset}" not found. Run \`cw preset list\` to see available presets.`));
            process.exit(1);
          }
          org = preset.org || undefined;

          const source = org ?? 'your account';
          console.log(pc.dim(`Fetching repos from ${source}...`));
          const allRepos = await fetchRepos(org);
          const repoSet = new Set(preset.repos);
          selectedRepos = allRepos.filter((r) => repoSet.has(r.name));

          if (selectedRepos.length === 0) {
            console.error(pc.red('No matching repos found for preset.'));
            process.exit(1);
          }

          console.log(pc.dim(`Using preset "${opts.preset}" with ${selectedRepos.length} repo(s).`));
        }
        // --- Resolve via --repos flag ---
        else if (opts.repos) {
          const repoNames = opts.repos.split(',').map((r) => r.trim()).filter(Boolean);

          if (!org) {
            org = config.defaultOrg;
          }

          const source = org ?? 'your account';
          console.log(pc.dim(`Fetching repos from ${source}...`));
          const allRepos = await fetchRepos(org);
          const repoSet = new Set(repoNames);
          selectedRepos = allRepos.filter((r) => repoSet.has(r.name));

          const missing = repoNames.filter((n) => !allRepos.find((r) => r.name === n));
          if (missing.length > 0) {
            console.warn(pc.yellow(`Warning: these repos were not found: ${missing.join(', ')}`));
          }

          if (selectedRepos.length === 0) {
            console.error(pc.red('No matching repos found.'));
            process.exit(1);
          }
        }
        // --- Interactive flow ---
        else {
          if (!org) {
            org = await input({
              message: 'GitHub org (leave blank for your repos):',
              default: config.defaultOrg ?? '',
            });
            if (org === '') org = undefined;
          }

          const source = org ?? 'your account';
          process.stdout.write(pc.dim(`Fetching repos from ${source}...\n`));
          const allRepos = await fetchRepos(org);
          process.stdout.write(pc.green(`✓ ${allRepos.length} repos fetched\n\n`));

          const result = await searchableCheckbox({
            message: 'Select repos (type to filter, space to select, enter to confirm):',
            repos: allRepos,
          });

          selectedRepos = result.selected;

          if (selectedRepos.length === 0) {
            console.log(pc.yellow('No repos selected. Exiting.'));
            process.exit(0);
          }
        }

        // Determine workspace name
        const workspaceName =
          name ??
          `${org ?? 'workspace'}-${new Date().toISOString().slice(0, 10)}`;

        const wsDir = workspacePath(baseDir, workspaceName);

        console.log('');
        console.log(pc.dim(`Creating workspace at ${wsDir}...`));
        await ensureDir(wsDir);

        // Clone repos
        await cloneRepos(selectedRepos, wsDir, {
          shallow: opts.shallow,
          ssh: opts.ssh,
          branch: opts.branch,
        });

        // Write CLAUDE.md
        await writeClaudeMd(wsDir, workspaceName, selectedRepos);
        console.log('');
        console.log(pc.green(`✓ Workspace "${workspaceName}" ready at ${wsDir}`));

        if (opts.open) {
          const repoDirs = selectedRepos.map((r) => path.join(wsDir, r.name));
          console.log(pc.dim('Launching Claude Code...'));
          launchClaude(wsDir, repoDirs);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(pc.red(`Error: ${msg}`));
        process.exit(1);
      }
    });

  return cmd;
}
