import { Command } from 'commander';
import { select } from '@inquirer/prompts';
import fs from 'fs/promises';
import type { Dirent } from 'fs';
import path from 'path';
import pc from 'picocolors';
import { loadConfig } from '../lib/config-store.js';
import { expandHome } from '../lib/paths.js';
import { launchClaude } from '../lib/claude.js';

async function getWorkspaceDirs(baseDir: string): Promise<string[]> {
  const expanded = expandHome(baseDir);
  let entries: Dirent[];
  try {
    entries = await fs.readdir(expanded, { withFileTypes: true });
  } catch (err: unknown) {
    if (isNodeError(err) && err.code === 'ENOENT') {
      return [];
    }
    throw err;
  }
  return entries
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
}

async function findGitRepoDirs(workspaceDir: string): Promise<string[]> {
  let entries: Dirent[];
  try {
    entries = await fs.readdir(workspaceDir, { withFileTypes: true });
  } catch {
    return [];
  }

  const repoDirs: string[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const subDir = path.join(workspaceDir, entry.name);
    const gitDir = path.join(subDir, '.git');
    try {
      await fs.stat(gitDir);
      repoDirs.push(subDir);
    } catch {
      // not a git repo
    }
  }
  return repoDirs;
}

function isNodeError(err: unknown): err is NodeJS.ErrnoException {
  return err instanceof Error && 'code' in err;
}

export function openCommand(): Command {
  const cmd = new Command('open');

  cmd
    .description('Reopen an existing workspace in Claude Code')
    .argument('[name]', 'Workspace name to open')
    .option('--base-dir <dir>', 'Override workspace base directory')
    .action(async (name: string | undefined, opts: { baseDir?: string }) => {
      try {
        const config = await loadConfig();
        const baseDir = opts.baseDir ?? config.workspaceDir;
        const expanded = expandHome(baseDir);

        let workspaceName: string;

        if (name) {
          workspaceName = name;
        } else {
          const workspaces = await getWorkspaceDirs(baseDir);
          if (workspaces.length === 0) {
            console.log(pc.yellow(`No workspaces found in ${expanded}.`));
            console.log(pc.dim('Run `claude-clone create` to create one.'));
            process.exit(0);
          }

          workspaceName = await select({
            message: 'Select a workspace to open:',
            choices: workspaces.map((w) => ({ name: w, value: w })),
          });
        }

        const workspaceDir = path.resolve(expanded, workspaceName);

        // Prevent path traversal outside base dir
        if (!workspaceDir.startsWith(expanded + path.sep) && workspaceDir !== expanded) {
          console.error(pc.red('Invalid workspace name.'));
          process.exit(1);
        }

        // Verify it exists
        try {
          await fs.stat(workspaceDir);
        } catch {
          console.error(pc.red(`Workspace "${workspaceName}" not found at ${workspaceDir}`));
          process.exit(1);
        }

        const repoDirs = await findGitRepoDirs(workspaceDir);

        if (repoDirs.length === 0) {
          console.warn(pc.yellow(`No git repositories found in ${workspaceDir}.`));
          console.log(pc.dim('Launching Claude with just the workspace directory.'));
          launchClaude(workspaceDir, []);
        } else {
          console.log(pc.dim(`Opening workspace "${workspaceName}" with ${repoDirs.length} repo(s)...`));
          launchClaude(workspaceDir, repoDirs);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(pc.red(`Error: ${msg}`));
        process.exit(1);
      }
    });

  return cmd;
}
