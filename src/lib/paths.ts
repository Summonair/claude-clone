import os from 'os';
import path from 'path';
import fs from 'fs/promises';

export function expandHome(p: string): string {
  if (p.startsWith('~/') || p === '~') {
    return path.join(os.homedir(), p.slice(1));
  }
  return p;
}

export function workspacePath(baseDir: string, name: string): string {
  return path.join(expandHome(baseDir), name);
}

export async function ensureDir(p: string): Promise<void> {
  await fs.mkdir(p, { recursive: true });
}
