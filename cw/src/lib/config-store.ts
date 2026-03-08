import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import type { Config } from '../types.js';

const CONFIG_DIR = path.join(os.homedir(), '.config', 'cw');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

const DEFAULT_CONFIG: Config = {
  workspaceDir: '~/giterepos/claude-tasks',
  presets: {},
};

export async function loadConfig(): Promise<Config> {
  try {
    const raw = await fs.readFile(CONFIG_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<Config>;
    return {
      ...DEFAULT_CONFIG,
      ...parsed,
      presets: parsed.presets ?? {},
    };
  } catch (err: unknown) {
    if (isNodeError(err) && err.code === 'ENOENT') {
      return { ...DEFAULT_CONFIG, presets: {} };
    }
    throw err;
  }
}

export async function saveConfig(config: Config): Promise<void> {
  await fs.mkdir(CONFIG_DIR, { recursive: true });
  await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2) + '\n', 'utf-8');
  await fs.chmod(CONFIG_FILE, 0o600);
}

export async function updateConfig(partial: Partial<Config>): Promise<Config> {
  const current = await loadConfig();
  const updated: Config = {
    ...current,
    ...partial,
    presets: partial.presets !== undefined ? partial.presets : current.presets,
  };
  await saveConfig(updated);
  return updated;
}

function isNodeError(err: unknown): err is NodeJS.ErrnoException {
  return err instanceof Error && 'code' in err;
}
