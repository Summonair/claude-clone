import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { Listr, type ListrTaskWrapper, type ListrRendererFactory } from 'listr2';
import type { Repo } from '../types.js';

const execFileAsync = promisify(execFile);

interface CloneOptions {
  shallow?: boolean;
  branch?: string;
  ssh?: boolean;
}

export async function cloneRepos(
  repos: Repo[],
  targetDir: string,
  opts: CloneOptions
): Promise<void> {
  const tasks = new Listr(
    repos.map((repo) => ({
      title: repo.name,
      task: async (_ctx: object, task: ListrTaskWrapper<object, ListrRendererFactory, ListrRendererFactory>) => {
        const repoDir = path.resolve(targetDir, repo.name);
        if (!repoDir.startsWith(targetDir + path.sep)) {
          throw new Error(`Invalid repo name: ${repo.name}`);
        }

        // Check if dir already exists
        try {
          const stat = await fs.stat(repoDir);
          if (stat.isDirectory()) {
            task.title = `${repo.name} — skipped (already exists)`;
            return;
          }
        } catch {
          // Dir does not exist, proceed with cloning
        }

        task.title = `${repo.name} — cloning...`;

        const args = ['clone'];
        if (opts.shallow) {
          args.push('--depth', '1');
        }
        if (opts.branch) {
          if (opts.branch.startsWith('-')) {
            throw new Error(`Invalid branch name: ${opts.branch}`);
          }
          args.push('--branch', opts.branch);
        }
        const cloneUrl = opts.ssh ? repo.sshUrl : repo.url;
        args.push(cloneUrl, repoDir);

        try {
          await execFileAsync('git', args);
          task.title = `${repo.name} — done`;
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          throw new Error(`Failed to clone ${repo.name}: ${msg}`);
        }
      },
    })),
    {
      concurrent: true,
      rendererOptions: {
        collapseErrors: false,
      },
    }
  );

  await tasks.run();
}
