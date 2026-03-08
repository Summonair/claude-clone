import { Command } from 'commander';
import { createCommand } from './commands/create.js';
import { openCommand } from './commands/open.js';
import { presetCommand } from './commands/preset.js';
import { configCommand } from './commands/config.js';

const program = new Command();

program
  .name('claude-clone')
  .description('Interactive multi-repo workspace CLI for Claude Code')
  .version('1.0.0');

program.addCommand(createCommand());
program.addCommand(openCommand());
program.addCommand(presetCommand());
program.addCommand(configCommand());

program.parse();
