import {
  createPrompt,
  useState,
  useRef,
  useMemo,
  useKeypress,
  isEnterKey,
  isUpKey,
  isDownKey,
} from '@inquirer/core';
import pc from 'picocolors';
import Fuse from 'fuse.js';
import type { Repo } from '../types.js';

interface SearchableCheckboxConfig {
  message: string;
  repos: Repo[];
}

interface SearchableCheckboxResult {
  selected: Repo[];
}

const MAX_VISIBLE = 10;

function isSpaceKey(key: { name: string }): boolean {
  return key.name === 'space';
}

export const searchableCheckbox = createPrompt<
  SearchableCheckboxResult,
  SearchableCheckboxConfig
>((config, done) => {
  const { repos } = config;

  const [filter, setFilter] = useState('');
  const [selectedNames, setSelectedNames] = useState<Set<string>>(new Set());
  const [cursorIndex, setCursorIndex] = useState(0);
  const [scrollOffset, setScrollOffset] = useState(0);
  const filterRef = useRef(filter);
  filterRef.current = filter;

  // Build fuse index once
  const fuse = useMemo(
    () =>
      new Fuse(repos, {
        keys: ['name', 'description'],
        threshold: 0.4,
        includeScore: true,
      }),
    [repos]
  );

  const filteredRepos = useMemo(() => {
    if (!filter.trim()) return repos;
    return fuse.search(filter).map((r) => r.item);
  }, [filter, fuse, repos]);

  useKeypress((key, rl) => {
    const currentFilter = filterRef.current;

    if (isEnterKey(key)) {
      const result: SearchableCheckboxResult = {
        selected: repos.filter((r) => selectedNames.has(r.name)),
      };
      done(result);
      return;
    }

    if (isUpKey(key)) {
      const newCursor = Math.max(0, cursorIndex - 1);
      setCursorIndex(newCursor);
      if (newCursor < scrollOffset) {
        setScrollOffset(newCursor);
      }
      return;
    }

    if (isDownKey(key)) {
      const newCursor = Math.min(filteredRepos.length - 1, cursorIndex + 1);
      setCursorIndex(newCursor);
      if (newCursor >= scrollOffset + MAX_VISIBLE) {
        setScrollOffset(newCursor - MAX_VISIBLE + 1);
      }
      return;
    }

    if (isSpaceKey(key)) {
      const repo = filteredRepos[cursorIndex];
      if (repo) {
        const next = new Set(selectedNames);
        if (next.has(repo.name)) {
          next.delete(repo.name);
        } else {
          next.add(repo.name);
        }
        setSelectedNames(next);
      }
      return;
    }

    // Handle backspace
    if (key.name === 'backspace') {
      const newFilter = currentFilter.slice(0, -1);
      setFilter(newFilter);
      setCursorIndex(0);
      setScrollOffset(0);
      rl.clearLine(0);
      return;
    }

    // Handle printable characters (typed into filter)
    if (key.sequence && !key.ctrl && !key.meta && key.sequence.length === 1 && key.sequence.charCodeAt(0) >= 32) {
      const newFilter = currentFilter + key.sequence;
      setFilter(newFilter);
      setCursorIndex(0);
      setScrollOffset(0);
      rl.clearLine(0);
      return;
    }
  });

  // Render
  const visibleRepos = filteredRepos.slice(scrollOffset, scrollOffset + MAX_VISIBLE);

  const lines: string[] = [];

  // Header
  lines.push(
    `${pc.green('?')} ${pc.bold(config.message)}`
  );
  lines.push(`  ${pc.dim('Filter:')} ${filter}${pc.inverse(' ')}`);
  lines.push('');

  if (filteredRepos.length === 0) {
    lines.push(`  ${pc.dim('No repos match your filter.')}`);
  } else {
    for (let i = 0; i < visibleRepos.length; i++) {
      const repo = visibleRepos[i];
      const absoluteIndex = scrollOffset + i;
      const isAtCursor = absoluteIndex === cursorIndex;
      const isSelected = selectedNames.has(repo.name);

      const checkbox = isSelected ? pc.green('[x]') : '[ ]';
      const nameStr = isSelected ? pc.green(pc.bold(repo.name)) : repo.name;
      const descStr = repo.description ? pc.dim(`  ${repo.description.slice(0, 50)}`) : '';
      const prefix = isAtCursor ? pc.cyan('> ') : '  ';

      lines.push(`${prefix}${checkbox} ${nameStr}${descStr}`);
    }
  }

  lines.push('');

  const shownCount = filteredRepos.length;
  const totalCount = repos.length;
  const selectedCount = selectedNames.size;
  lines.push(
    `  ${pc.dim(`${shownCount} of ${totalCount} repos shown · ${pc.bold(String(selectedCount))} selected`)}`
  );

  // Show scroll hint if needed
  if (filteredRepos.length > MAX_VISIBLE) {
    const canScrollUp = scrollOffset > 0;
    const canScrollDown = scrollOffset + MAX_VISIBLE < filteredRepos.length;
    const hints: string[] = [];
    if (canScrollUp) hints.push('↑ more above');
    if (canScrollDown) hints.push('↓ more below');
    if (hints.length > 0) {
      lines.push(`  ${pc.dim(hints.join('  '))}`);
    }
  }

  return lines.join('\n');
});
