import { Command } from 'commander';
import { input, confirm } from '@inquirer/prompts';
import pc from 'picocolors';
import { loadConfig, saveConfig } from '../lib/config-store.js';
import { fetchRepos } from '../lib/github.js';
import { searchableCheckbox } from '../ui/searchable-checkbox.js';

export function presetCommand(): Command {
  const cmd = new Command('preset');
  cmd.description('Manage repo presets');

  // preset list
  cmd
    .command('list')
    .description('List all saved presets')
    .action(async () => {
      try {
        const config = await loadConfig();
        const presets = Object.entries(config.presets);
        if (presets.length === 0) {
          console.log(pc.dim('No presets saved yet. Run `cw preset save <name>` to create one.'));
          return;
        }
        console.log(pc.bold('Saved presets:\n'));
        for (const [name, preset] of presets) {
          console.log(`  ${pc.green(pc.bold(name))}`);
          console.log(`    ${pc.dim('org:')} ${preset.org ?? pc.italic('your account')}`);
          console.log(`    ${pc.dim('repos:')} ${preset.repos.join(', ')}`);
          console.log('');
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(pc.red(`Error: ${msg}`));
        process.exit(1);
      }
    });

  // preset save <name>
  cmd
    .command('save <name>')
    .description('Save a new preset by selecting repos interactively')
    .option('-o, --org <org>', 'GitHub org to fetch repos from')
    .action(async (name: string, opts: { org?: string }) => {
      try {
        const config = await loadConfig();

        // Check if preset already exists
        if (Object.hasOwn(config.presets, name)) {
          const overwrite = await confirm({
            message: `Preset "${name}" already exists. Overwrite?`,
            default: false,
          });
          if (!overwrite) {
            console.log(pc.dim('Aborted.'));
            return;
          }
        }

        let org: string | undefined = opts.org;
        if (!org) {
          const answer = await input({
            message: 'GitHub org (leave blank for your repos):',
            default: config.defaultOrg ?? '',
          });
          org = answer.trim() || undefined;
        }

        const source = org ?? 'your account';
        process.stdout.write(pc.dim(`Fetching repos from ${source}...\n`));
        const allRepos = await fetchRepos(org);
        process.stdout.write(pc.green(`✓ ${allRepos.length} repos fetched\n\n`));

        const result = await searchableCheckbox({
          message: 'Select repos for this preset (type to filter, space to select, enter to confirm):',
          repos: allRepos,
        });

        if (result.selected.length === 0) {
          console.log(pc.yellow('No repos selected. Preset not saved.'));
          return;
        }

        config.presets[name] = {
          org,
          repos: result.selected.map((r) => r.name),
        };

        await saveConfig(config);

        console.log('');
        console.log(pc.green(`✓ Preset "${name}" saved with ${result.selected.length} repo(s) from ${org ?? 'your account'}.`));
        console.log(pc.dim(`  Run \`cw create <name> --preset ${name}\` to use it.`));
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(pc.red(`Error: ${msg}`));
        process.exit(1);
      }
    });

  // preset delete <name>
  cmd
    .command('delete <name>')
    .description('Delete a saved preset')
    .action(async (name: string) => {
      try {
        const config = await loadConfig();

        if (!Object.hasOwn(config.presets, name)) {
          console.error(pc.red(`Preset "${name}" not found.`));
          process.exit(1);
        }

        const confirmed = await confirm({
          message: `Delete preset "${name}"?`,
          default: false,
        });

        if (!confirmed) {
          console.log(pc.dim('Aborted.'));
          return;
        }

        delete config.presets[name];
        await saveConfig(config);

        console.log(pc.green(`✓ Preset "${name}" deleted.`));
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(pc.red(`Error: ${msg}`));
        process.exit(1);
      }
    });

  return cmd;
}
