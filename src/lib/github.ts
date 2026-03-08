import { execFile } from 'child_process';
import { promisify } from 'util';
import type { Repo } from '../types.js';

const execFileAsync = promisify(execFile);

interface GhRepoItem {
  name: string;
  description: string | null;
  url: string;
  sshUrl: string;
}

export async function fetchRepos(org?: string): Promise<Repo[]> {
  // First verify gh CLI is available and authenticated
  await checkGhAuth();

  const args = ['repo', 'list'];
  if (org) args.push(org);
  args.push('--json', 'name,description,url,sshUrl', '--limit', '1000');

  let stdout: string;
  try {
    const result = await execFileAsync('gh', args);
    stdout = result.stdout;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to fetch repos${org ? ` for org "${org}"` : ''}: ${msg}`);
  }

  let parsed: GhRepoItem[];
  try {
    parsed = JSON.parse(stdout) as GhRepoItem[];
  } catch {
    throw new Error(`Failed to parse gh CLI output. Got: ${stdout.slice(0, 200)}`);
  }

  return parsed.map((item) => ({
    name: item.name,
    description: item.description ?? '',
    url: item.url,
    sshUrl: item.sshUrl,
  }));
}

async function checkGhAuth(): Promise<void> {
  try {
    await execFileAsync('gh', ['auth', 'status']);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('command not found') || msg.includes('ENOENT')) {
      throw new Error(
        'gh CLI not found. Install it from https://cli.github.com/ and run `gh auth login`.'
      );
    }
    throw new Error(
      'gh CLI is not authenticated. Run `gh auth login` to authenticate with GitHub.'
    );
  }
}
