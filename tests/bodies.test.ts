import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SPLITS, listed, project } from '../scripts/split-events';
import { buildGraph } from '../src/lib/data';
import { PEOPLE, TERMS } from '../src/lib/files';
import { bodyOf } from '../src/lib/bodies/files';
import { noteOf } from '../src/lib/bodies/links';
import { checksOf, pledgesOf, predictionsOf, questionsOf } from '../src/lib/notes';
import { QUESTIONS, questionById } from '../src/lib/questions';
import { CHECKS, checkById } from '../src/lib/checks';
import { PREDICTIONS, predictionById } from '../src/lib/predictions';
import { PLEDGES, pledgeById } from '../src/lib/pledges';
import { clip, metaFor } from '../src/lib/meta';
import type { LinkRaw, QuestionRecord, Route } from '../src/lib/types';

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
      const bodies = project(file, split, written, 'bodies');
      // Both parts keep the file's shape: the records under the same key.
      if (split.key) expect(Object.keys(heads as Rec), file).toEqual([split.key]);
      if (split.key) expect(Object.keys(bodies as Rec), file).toEqual([split.key]);
      const h = recordsOf(heads, split.key);
      expect(h.length, file).toBe(records.length);
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
      recordsOf(project(file, split, read(file.slice(1)), 'heads'), split.key).forEach((h) => {
        split.bodies.forEach((f) => {
          // A field of the body is not in the head; a field of a list's items, not in its items.
          if (typeof f === 'string') expect(f in h, file + ': ' + f).toBe(false);
          else ((h[f[0]] || []) as Rec[]).forEach((item) => f[1].forEach((k) => expect(k in item, file + ': ' + f[0] + '.' + k).toBe(false)));
        });
      });
    }
  });

  it('tells a card’s dossier the line each record gives the card', () => {
    const kinds = [
      { file: 'data/questions.json', key: 'questions', on: (event: string) => questionsOf(graph.index[event]).map((x) => ({ head: x.question, note: x.note })), byId: questionById },
      { file: 'data/checks.json', key: 'checks', on: (event: string) => checksOf(graph.index[event]).map((x) => ({ head: x.check, note: x.note })), byId: checkById },
      { file: 'data/predictions.json', key: 'predictions', on: (event: string) => predictionsOf(graph.index[event]).map((x) => ({ head: x.prediction, note: x.note })), byId: predictionById },
      { file: 'data/promises.json', key: 'promises', on: (event: string) => pledgesOf(graph.index[event]).map((x) => ({ head: x.pledge, note: x.note })), byId: pledgeById }
    ];
    for (const { file, key, on, byId } of kinds) {
      const records = recordsOf(read(file), key) as { id: string; record: QuestionRecord[] }[];
      expect(records.length, file).toBeGreaterThan(0);
      records.forEach((r) => r.record.forEach(({ event, note }) => {
        expect(on(event), file + ' ' + r.id + ' → ' + event).toContainEqual({ head: byId[r.id], note });
      }));
      // And no line it does not give.
      const given = records.reduce((n, r) => n + r.record.length, 0);
      expect(graph.all.reduce((n, e) => n + on(e.id).length, 0), file).toBe(given);
    }
  });

  it('files the lines on a card in the order every page lists the records', () => {
    // A dossier reads a card's lines off in the order its records are listed.
    // Said in advance lists by the day said, which data/predictions.json is not
    // written in, so the build has to list them as the page does.
    const kinds = [
      { kind: 'question', file: 'data/questions.json', key: 'questions', list: QUESTIONS },
      { kind: 'check', file: 'data/checks.json', key: 'checks', list: CHECKS },
      { kind: 'prediction', file: 'data/predictions.json', key: 'predictions', list: PREDICTIONS },
      { kind: 'promise', file: 'data/promises.json', key: 'promises', list: PLEDGES }
    ] as const;
    for (const { kind, file, key, list } of kinds) {
      expect(listed(kind, recordsOf(read(file), key)).map((r) => r.id), file).toEqual(list.map((r) => r.id));
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

  /** Every module the main script reaches by a static import, and what each imports. */
  const reachedFromMain = (): Map<string, string[]> => {
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
    return reached;
  };

  it('keeps every body out of the bundle the browser starts with', () => {
    const reached = reachedFromMain();
    expect(reached.size).toBeGreaterThan(20);
    const split = Object.keys(SPLITS).map((f) => f.slice(1));
    for (const [file, specs] of reached) {
      const at = file.slice(root.length);
      expect(at.startsWith('src/lib/bodies/'), at + ' is a body').toBe(false);
      specs.forEach((s) => {
        expect(/\?bodies\b/.test(s), at + ' imports ' + s).toBe(false);
        expect(split.some((f) => s.endsWith(f)), at + ' imports ' + s + ' whole').toBe(false);
      });
    }
  });

  it('keeps the board’s history out of it too: what changed lately, when each card was filed, and what was corrected', () => {
    for (const [file, specs] of reachedFromMain()) {
      const at = file.slice(root.length);
      expect(specs.includes('virtual:board-changes'), at + ' imports virtual:board-changes').toBe(false);
      // A card's days, the lines on it and its corrections are filed with its papers.
      expect(specs.some((s) => s.endsWith('events.json?papers')), at + ' imports the papers').toBe(false);
      // The register is read by its own pages alone, and the index that sends
      // an old address on by a page that has to.
      expect(specs.some((s) => s.includes('corrections.json')), at + ' imports the corrections').toBe(false);
      expect(specs.includes('virtual:register-index'), at + ' imports virtual:register-index').toBe(false);
    }
  });
});
