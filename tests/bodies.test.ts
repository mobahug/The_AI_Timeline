import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SPLITS, project } from '../scripts/split-events';
import { buildGraph } from '../src/lib/data';
import { PEOPLE, TERMS } from '../src/lib/files';
import { bodyOf } from '../src/lib/bodies/files';
import { noteOf } from '../src/lib/bodies/links';
import { clip, metaFor } from '../src/lib/meta';
import type { LinkRaw, Route } from '../src/lib/types';

/* The files of records are read in two parts: a head every page may read, in
   the main bundle, and a body only a record's own pages print, which travels
   in their chunks (scripts/split-events.ts, src/lib/bodies/). Cut apart, the
   two must still make the file as written, and no body may find its way into
   the bundle the browser starts with. */

const root = fileURLToPath(new URL('..', import.meta.url));
const graph = buildGraph();
type Rec = Record<string, unknown>;
const read = (file: string): unknown => JSON.parse(readFileSync(join(root, file), 'utf8'));
const recordsOf = (whole: unknown, key?: string): Rec[] => (key ? (whole as Record<string, Rec[]>)[key] : whole) as Rec[];

/** A head and a body put back together: a list field the two share, item by item. */
function whole(head: Rec, body: Rec | undefined): Rec {
  const out: Rec = { ...head };
  for (const [k, v] of Object.entries(body || {})) {
    out[k] = Array.isArray(v) && Array.isArray(head[k]) ? (head[k] as Rec[]).map((item, i) => ({ ...item, ...(v as Rec[])[i] })) : v;
  }
  return out;
}

describe('heads and bodies', () => {
  it('cuts every record into a head and a body that make it whole again', () => {
    for (const [file, split] of Object.entries(SPLITS)) {
      const written = read(file.slice(1));
      const records = recordsOf(written, split.key);
      const heads = project(file, split, written, 'heads');
      const bodies = split.bodies ? project(file, split, written, 'bodies') : null;
      // Both parts keep the file's shape: the records under the same key.
      if (split.key) expect(Object.keys(heads as Rec), file).toEqual([split.key]);
      const h = recordsOf(heads, split.key);
      expect(h.length, file).toBe(records.length);
      if (!bodies) continue;
      const name = (r: Rec) => split.id.map((k) => r[k]).join('>');
      const b = new Map(recordsOf(bodies, split.key).map((r) => [name(r), r]));
      records.forEach((r, i) => {
        const { noted, ...head } = h[i];
        Object.entries(split.marks || {}).forEach(([, field]) => expect(!!noted, file + ' ' + name(r)).toBe(r[field] !== undefined));
        expect(whole(head, b.get(name(r))), file + ' ' + name(r)).toEqual(r);
      });
    }
  });

  it('keeps out of each head every field its body carries', () => {
    for (const [file, split] of Object.entries(SPLITS)) {
      if (!split.bodies) continue;
      const fields = split.bodies.filter((f): f is string => typeof f === 'string');
      recordsOf(project(file, split, read(file.slice(1)), 'heads'), split.key).forEach((h) => {
        fields.forEach((f) => expect(f in h, file + ': ' + f).toBe(false));
      });
    }
  });

  it('stops on a field it does not place, rather than lose it from both parts', () => {
    const split = SPLITS['/data/people.json'];
    const file = { people: [{ id: 'x', name: 'X', role: 'A role.', bio: 'A bio.', born: 1900 }] };
    expect(() => project('/data/people.json', split, file, 'heads')).toThrow(/"born" of x/);
  });

  it('tells every page which strings carry a note, and the pages that print one the note', () => {
    const links = read('data/links.json') as LinkRaw[];
    links.forEach((l) => {
      const edge = graph.edges.find((e) => e.from === l.from && e.to === l.to);
      expect(edge && !!edge.noted, l.from + '>' + l.to).toBe(!!l.note);
      expect(noteOf(l.from, l.to), l.from + '>' + l.to).toBe(l.note);
    });
  });

  it('describes a name’s page and a clue with the words their chunks lend', () => {
    const p = PEOPLE[0];
    expect(metaFor({ view: 'person', id: p.id } as Route).description).toBe(clip(p.role + ' ' + bodyOf(p)));
    const t = TERMS[0];
    expect(metaFor({ view: 'term', id: t.id } as Route).description).toBe(clip(t.short + ' ' + bodyOf(t)));
    const l = graph.edges.find((e) => e.noted);
    if (!l) throw new Error('no string with a case note');
    const m = metaFor({ view: 'board', clue: { from: l.from, to: l.to } } as Route, graph);
    expect(m.description).toBe(clip(graph.index[l.from].title + ' ' + l.claim + ' ' + graph.index[l.to].title + '. ' + noteOf(l.from, l.to)));
  });

  it('keeps every body out of the bundle the browser starts with', () => {
    // Every module the main script reaches by a static import, and what each imports.
    const reached = new Map<string, string[]>();
    const walk = (file: string) => {
      if (reached.has(file)) return;
      const src = readFileSync(file, 'utf8');
      // `import … from '…'`, `import '…'` and `export … from '…'`; never a type, never `import(…)`.
      const specs = [...src.matchAll(/^(?:import|export)\s+(?!type\b)(?:[^'";]*?\bfrom\s+)?'([^']+)'/gm)].map((m) => m[1]);
      reached.set(file, specs);
      specs.filter((s) => s.startsWith('.') && !s.includes('.json')).forEach((s) => {
        const base = resolve(dirname(file), s);
        const next = [base, base + '.ts', base + '.tsx', join(base, 'index.ts')].find((f) => existsSync(f) && statSync(f).isFile());
        if (next) walk(next);
      });
    };
    walk(join(root, 'src', 'main.tsx'));
    expect(reached.size).toBeGreaterThan(20);
    const split = Object.keys(SPLITS).map((f) => f.slice(1));
    for (const [file, specs] of reached) {
      const at = file.slice(root.length);
      expect(at.startsWith('src/lib/bodies/'), at + ' is a body').toBe(false);
      specs.forEach((s) => {
        expect(s.endsWith('?bodies'), at + ' imports ' + s).toBe(false);
        expect(split.some((f) => s.endsWith(f)), at + ' imports ' + s + ' whole').toBe(false);
      });
    }
  });
});
