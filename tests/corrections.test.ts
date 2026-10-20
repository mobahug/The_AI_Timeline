import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import raw from '../data/corrections.json';
import { CORRECTIONS, CORRECTION_KIND, correctionsOf } from '../src/lib/corrections';
import type { Correction } from '../src/lib/types';
import { buildGraph } from '../src/lib/data';
import { leadById } from '../src/lib/leads';
import { entityById } from '../src/lib/files';
import linksFile from '../data/links.json';
import { questionById } from '../src/lib/questions';
import { findingByNumber } from '../src/lib/spine';

const graph = buildGraph();
const ALL = raw.corrections as Correction[];
const root = fileURLToPath(new URL('..', import.meta.url));
const shallow = (() => { try { return execFileSync('git', ['rev-parse', '--is-shallow-repository'], { cwd: root, encoding: 'utf8' }).trim() === 'true'; } catch { return true; } })();
const links = new Set((linksFile as { from: string; to: string }[]).map((l) => l.from + '>' + l.to));

/** Whether a record a correction points at is still on the board. */
const exists = (file: string, id: string): boolean =>
  file === 'data/events.json' ? !!graph.index[id]
  : file === 'data/leads.json' ? !!leadById[id]
  : file === 'data/links.json' ? links.has(id)
  : file === 'data/people.json' ? !!entityById('person', id)
  : file === 'data/orgs.json' ? !!entityById('org', id)
  : file === 'data/glossary.json' ? !!entityById('term', id)
  : file === 'data/questions.json' ? !!questionById[id]
  : file === 'data/spine.json' ? !!findingByNumber(id)
  : file === 'data/watch.json';

describe('corrections: every change of fact, as the history has it', () => {
  it('has unique ids and says, of each, what it said, what it says and why', () => {
    expect(ALL.length).toBeGreaterThan(0);
    expect(new Set(ALL.map((c) => c.id)).size).toBe(ALL.length);
    ALL.forEach((c) => {
      expect(c.id, c.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      expect(c.date, c.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(c.commit, c.id).toMatch(/^[0-9a-f]{7,40}$/);
      expect(Object.keys(CORRECTION_KIND), c.id).toContain(c.kind);
      expect(c.was.trim() && c.now.trim(), c.id).toBeTruthy();
      expect(c.was, c.id + ': nothing changed').not.toBe(c.now);
      expect(c.why.trim().length, c.id).toBeGreaterThan(20);
      if (c.source) expect(c.source.url, c.id).toMatch(/^https:\/\//);
    });
  });

  it('points at records still on the board', () => {
    ALL.forEach((c) => {
      expect(!!c.event !== !!c.where, c.id + ': a card or a place, not both').toBe(true);
      if (c.event) expect(graph.index[c.event], c.id + ' → ' + c.event).toBeTruthy();
      if (c.where) expect(exists(c.where.file, c.where.id), c.id + ' → ' + c.where.file + ' ' + c.where.id).toBe(true);
      (c.alsoIn || []).forEach((a) => expect(exists(a.file, a.id), c.id + ' → ' + a.file + ' ' + a.id).toBe(true));
    });
  });

  it('lists the newest first, and each card its own', () => {
    const dates = CORRECTIONS.map((c) => c.date);
    expect(dates).toEqual(dates.slice().sort().reverse());
    ALL.filter((c) => c.event).forEach((c) => expect(correctionsOf(c.event as string).map((x) => x.id), c.id).toContain(c.id));
  });

  it.skipIf(shallow)('is dated by commits that are in the history, on the days they were made', () => {
    // One lookup per commit: many corrections share one.
    const days = new Map<string, string>();
    ALL.forEach((c) => {
      if (!days.has(c.commit)) days.set(c.commit, execFileSync('git', ['show', '-s', '--format=%ad', '--date=short', c.commit], { cwd: root, encoding: 'utf8' }).trim());
      expect(days.get(c.commit), c.id + ' @ ' + c.commit).toBe(c.date);
    });
  });
});

describe('a dossier, on its corrections', () => {
  it('counts each card’s corrections from its papers, and links the newest the register lists', async () => {
    const { correctedOf } = await import('../src/lib/corrected');
    const cards = new Set(ALL.map((c) => c.event).filter(Boolean) as string[]);
    cards.forEach((id) => {
      const full = correctionsOf(id);
      const seen = correctedOf(graph.index[id]);
      expect(seen, id).not.toBeNull();
      expect(seen && seen.n, id).toBe(full.length);
      expect(seen && seen.id, id).toBe(full[0].id);
      expect(seen && seen.date, id).toBe(full[0].date);
    });
    graph.all.filter((e) => !cards.has(e.id)).forEach((e) => expect(correctedOf(e), e.id).toBeNull());
  });
});
