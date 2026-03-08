#!/usr/bin/env node
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const tsxPath = join(__dirname, '..', 'node_modules', '.bin', 'tsx');
const indexPath = join(__dirname, '..', 'src', 'index.ts');

const child = spawn(tsxPath, [indexPath, ...process.argv.slice(2)], {
  stdio: 'inherit',
  env: process.env
});

child.on('exit', (code) => process.exit(code ?? 0));
