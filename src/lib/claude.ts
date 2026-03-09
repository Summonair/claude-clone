import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import type { Repo } from '../types.js';

export async function writeClaudeMd(
  workspaceDir: string,
  workspaceName: string,
  repos: Repo[]
): Promise<void> {
  const repoList = repos
    .map((r) => `- **${r.name}**: ${r.description || '(no description)'}`)
    .join('\n');

  const content = `# ${workspaceName}

This is a multi-repo workspace created by \`claude-clone\` (Claude Code Workspace CLI).

## Repos in this workspace

${repoList}

## Layout

Each repository is cloned as a subdirectory of this workspace:

\`\`\`
${workspaceName}/
${repos.map((r) => `  ${r.name}/`).join('\n')}
\`\`\`

## Notes

- This workspace was set up for use with Claude Code.
- Each subdirectory is an independent git repository.
- Use \`claude-clone open ${workspaceName}\` to reopen this workspace in Claude Code.
`;

  await fs.writeFile(path.join(workspaceDir, 'CLAUDE.md'), content, 'utf-8');
}

export function launchClaude(workspaceDir: string): void {
  const child = spawn('claude', [], {
    stdio: 'inherit',
    env: process.env,
    cwd: workspaceDir,
  });

  child.on('error', (err) => {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      console.error(
        'Error: `claude` CLI not found. Make sure Claude Code is installed and available in your PATH.'
      );
    } else {
      console.error(`Error launching Claude: ${err.message}`);
    }
    process.exit(1);
  });

  child.on('exit', (code) => {
    process.exit(code ?? 0);
  });
}
