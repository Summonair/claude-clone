import { Command } from 'commander';
import pc from 'picocolors';
import { loadConfig, updateConfig } from '../lib/config-store.js';
import type { Config } from '../types.js';

type ConfigKey = 'defaultOrg' | 'workspaceDir';

const VALID_KEYS: ConfigKey[] = ['defaultOrg', 'workspaceDir'];

function isValidKey(key: string): key is ConfigKey {
  return VALID_KEYS.includes(key as ConfigKey);
}

export function configCommand(): Command {
  const cmd = new Command('config');
  cmd.description('Get or set configuration values');

  // config get [key]
  cmd
    .command('get [key]')
    .description('Get a config value (or all config if no key given)')
    .action(async (key?: string) => {
      try {
        const config = await loadConfig();

        if (!key) {
          // Print all config as JSON (excluding presets for readability)
          const display: Partial<Config> = {
            defaultOrg: config.defaultOrg,
            workspaceDir: config.workspaceDir,
          };
          console.log(JSON.stringify(display, null, 2));
          return;
        }

        if (!isValidKey(key)) {
          console.error(pc.red(`Unknown config key: "${key}". Valid keys: ${VALID_KEYS.join(', ')}`));
          process.exit(1);
        }

        const value = config[key];
        if (value === undefined) {
          console.log(pc.dim(`(not set)`));
        } else {
          console.log(value);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(pc.red(`Error: ${msg}`));
        process.exit(1);
      }
    });

  // config set <key> <value>
  cmd
    .command('set <key> <value>')
    .description(`Set a config value. Keys: ${VALID_KEYS.join(', ')}`)
    .action(async (key: string, value: string) => {
      try {
        if (!isValidKey(key)) {
          console.error(pc.red(`Unknown config key: "${key}". Valid keys: ${VALID_KEYS.join(', ')}`));
          process.exit(1);
        }

        await updateConfig({ [key]: value });
        console.log(pc.green(`✓ Set ${key} = ${value}`));
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(pc.red(`Error: ${msg}`));
        process.exit(1);
      }
    });

  return cmd;
}
