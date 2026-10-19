import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { INDEXNOW_KEY, changedSince } from '../scripts/indexnow';
import { ORIGIN } from '../scripts/site';

const root = fileURLToPath(new URL('..', import.meta.url));

describe('IndexNow', () => {
  it('serves its key from the site, where the engines look for it', () => {
    const file = new URL('../public/' + INDEXNOW_KEY + '.txt', import.meta.url);
    expect(existsSync(file)).toBe(true);
    expect(readFileSync(file, 'utf8').trim()).toBe(INDEXNOW_KEY);
    expect(INDEXNOW_KEY).toMatch(/^[a-f0-9]{32}$/);
  });

  it('sends the front page and the latest page when it has nothing to count from', () => {
    expect(changedSince(root, null)).toEqual([ORIGIN, ORIGIN + 'latest/']);
    expect(changedSince(root, '0000000000000000000000000000000000000000')).toEqual([ORIGIN, ORIGIN + 'latest/']);
  });

  it('sends only addresses on the site, each once', () => {
    let since: string | null = null;
    try { since = execFileSync('git', ['rev-parse', 'HEAD~3'], { cwd: root, encoding: 'utf8' }).trim(); } catch { since = null; }
    const urls = changedSince(root, since);
    expect(new Set(urls).size).toBe(urls.length);
    urls.forEach((u) => expect(u.startsWith(ORIGIN), u).toBe(true));
  });
});
