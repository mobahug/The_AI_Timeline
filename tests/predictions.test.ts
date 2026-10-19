import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import raw from '../data/predictions.json';
import { FORETOLD, FORETOLD_ORDER, PREDICTIONS as HEADS, predictionById, predictionInFull, predictionsBy, predictionsOf } from '../src/lib/predictions';
import type { Prediction } from '../src/lib/types';
import { leadById } from '../src/lib/leads';
import { PEOPLE } from '../src/lib/files';
import { NOW, buildGraph, projections } from '../src/lib/data';
import { hrefFor, parse } from '../src/lib/url';
import { metaFor } from '../src/lib/meta';
import { tabOf } from '../src/lib/views';
import { SOURCE_KINDS } from '../src/lib/data';

const graph = buildGraph();
/* The file as written; the pages' heads are checked against it below. */
const PREDICTIONS = (raw.predictions as Prediction[]).slice().sort((a, b) => a.said.localeCompare(b.said));
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const WHEN = /^\d{4}(-\d{2}(-\d{2})?)?$/;

describe('said in advance: predictions set beside what happened', () => {
  it('has unique, stable ids, oldest first', () => {
    expect(PREDICTIONS.length).toBeGreaterThan(0);
    expect(new Set(PREDICTIONS.map((p) => p.id)).size).toBe(PREDICTIONS.length);
    PREDICTIONS.forEach((p) => expect(p.id, p.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/));
    const said = PREDICTIONS.map((p) => p.said);
    expect(said).toEqual(said.slice().sort());
  });

  it('quotes the words, names who said them and when, and the words set the year', () => {
    PREDICTIONS.forEach((p) => {
      expect(p.title, p.id + ': a title is never dressed as a quotation').not.toMatch(/[“”"]/);
      expect(p.who.trim(), p.id).toBeTruthy();
      expect(p.said, p.id).toMatch(WHEN);
      expect(p.words.trim().length, p.id).toBeGreaterThan(10);
      expect(p.words.includes(p.byWords), p.id + ': “' + p.byWords + '” is not in the words').toBe(true);
      expect(p.by, p.id).toBeGreaterThanOrEqual(Number(p.said.slice(0, 4)));
      expect(p.sources.map((s) => s.id), p.id + ': the words have a source').toContain(p.source);
      p.people.forEach((id) => expect(PEOPLE.some((x) => x.id === id), p.id + ' → ' + id).toBe(true));
    });
  });

  it('gives a verdict the dates bear out', () => {
    PREDICTIONS.forEach((p) => {
      expect(FORETOLD_ORDER, p.id).toContain(p.verdict);
      if (p.verdict === 'open') { expect(p.by, p.id + ': not yet due').toBeGreaterThanOrEqual(NOW); expect(p.came, p.id).toBeUndefined(); }
      if (p.verdict === 'overdue') { expect(p.by, p.id + ': its year has passed').toBeLessThan(NOW); expect(p.came, p.id).toBeUndefined(); }
      if (p.verdict === 'kept') expect(p.came !== undefined && p.came <= p.by, p.id + ': came by its year').toBe(true);
      if (p.verdict === 'early') expect(p.came !== undefined && p.came < p.by, p.id + ': came before its year').toBe(true);
      if (p.verdict === 'late') expect(p.came !== undefined && p.came > p.by, p.id + ': came after its year').toBe(true);
      if (p.came !== undefined) expect(p.came, p.id).toBeLessThanOrEqual(NOW);
    });
  });

  it('answers in short and in full, and says what is not settled', () => {
    PREDICTIONS.forEach((p) => {
      expect(p.short.length, p.id).toBeGreaterThan(40);
      expect(p.short.length, p.id).toBeLessThanOrEqual(260);
      expect(p.reading.length, p.id).toBeGreaterThan(0);
      p.reading.forEach((para) => expect(para.trim().length, p.id).toBeGreaterThan(0));
      expect(p.open.trim().length, p.id).toBeGreaterThan(0);
      expect(p.checked, p.id).toMatch(ISO);
    });
  });

  it('quotes what happened, each quote from a source it names, every source dated and linked', () => {
    PREDICTIONS.forEach((p) => {
      const ids = new Set(p.sources.map((s) => s.id));
      expect(ids.size, p.id).toBe(p.sources.length);
      p.sources.forEach((s) => {
        expect(SOURCE_KINDS, p.id + ' / ' + s.id).toContain(s.kind);
        expect(s.publisher && s.title, p.id + ' / ' + s.id).toBeTruthy();
        expect(s.url, p.id + ' / ' + s.id).toMatch(/^https:\/\//);
        expect(s.date, p.id + ' / ' + s.id).toMatch(WHEN);
        expect(s.date <= p.checked, p.id + ' / ' + s.id).toBe(true);
      });
      expect(p.evidence.length, p.id).toBeGreaterThan(0);
      p.evidence.forEach((q) => {
        expect(ids.has(q.source), p.id + ' → ' + q.source).toBe(true);
        expect(q.quote.trim().length, p.id).toBeGreaterThan(10);
      });
      const used = new Set([p.source, ...p.evidence.map((q) => q.source)]);
      expect([...ids].filter((id) => !used.has(id)), p.id + ': every source is used').toEqual([]);
    });
  });

  it('rests on cards that exist, and is listed on each of them', () => {
    PREDICTIONS.forEach((p) => {
      expect(p.record.length, p.id).toBeGreaterThan(0);
      p.record.forEach((r) => {
        expect(graph.index[r.event], p.id + ' → ' + r.event).toBeTruthy();
        expect(r.note.trim().length, r.event).toBeGreaterThan(0);
        expect(predictionsOf(r.event).map((x) => x.prediction.id), r.event).toContain(p.id);
      });
      p.leads.forEach((l) => expect(leadById[l], p.id + ' → ' + l).toBeTruthy());
      p.people.forEach((person) => expect(predictionsBy(person).map((x) => x.id)).toContain(p.id));
    });
  });

  it('lists every prediction from a head taken from the file, and holds it in full on the server', () => {
    expect(HEADS.map((h) => h.id)).toEqual(PREDICTIONS.map((p) => p.id));
    HEADS.forEach((h) => {
      const p = predictionInFull(h.id) as Prediction;
      expect(p, h.id).toBeTruthy();
      (['title', 'who', 'people', 'said', 'by', 'verdict', 'came', 'short', 'record'] as const).forEach((k) => expect(h[k], h.id + '.' + k).toEqual(p[k]));
      expect((h as Record<string, unknown>).words, h.id + ': a head carries no words').toBeUndefined();
    });
  });

  it('never puts the whole file in the bundle the browser starts with', () => {
    const root = fileURLToPath(new URL('..', import.meta.url));
    const files: string[] = [];
    const walk = (dir: string) => readdirSync(dir).forEach((f) => {
      const p = join(dir, f);
      if (statSync(p).isDirectory()) walk(p); else if (/\.tsx?$/.test(f)) files.push(p);
    });
    walk(join(root, 'src'));
    const imports = files.flatMap((f) => [...readFileSync(f, 'utf8').matchAll(/(?:from|import\()\s*'([^']*predictions\.json[^']*)'/g)]
      .map((m) => ({ file: f.slice(root.length), what: m[1], dynamic: m[0].startsWith('import(') })));
    const whole = imports.filter((i) => !i.what.endsWith('?heads'));
    expect(whole.filter((i) => !i.dynamic).map((i) => i.file)).toEqual(['src/entry-server.tsx']);
    expect(whole.filter((i) => i.dynamic).map((i) => i.file)).toEqual(['src/lib/predictions.ts']);
  });

  it('has an address of its own, filed under the line', () => {
    const p = PREDICTIONS[0];
    expect(hrefFor({ view: 'predictions' })).toBe('/predictions/');
    expect(hrefFor({ view: 'prediction', id: p.id })).toBe('/prediction/' + p.id + '/');
    expect(parse('/prediction/' + p.id + '/')).toMatchObject({ view: 'prediction', id: p.id });
    expect(tabOf('prediction')).toBe('line');
    const meta = metaFor({ ...parse('/prediction/' + p.id + '/') });
    expect(meta.title.startsWith(predictionById[p.id].title)).toBe(true);
    expect(meta.title).toContain(FORETOLD[p.verdict].label);
  });
});

describe('the board’s own scenarios, checked against the record', () => {
  it('names, on a scenario overtaken in part, record cards strung to it', () => {
    const overtaken = projections.filter((e) => e.early && e.early.length);
    expect(overtaken.length).toBeGreaterThan(0);
    overtaken.forEach((e) => (e.early || []).forEach((id) => {
      const by = graph.index[id];
      expect(by, e.id + ' → ' + id).toBeTruthy();
      expect(by.future, e.id + ': ' + id + ' is on the record').toBe(false);
      expect(graph.edges.some((l) => l.from === id && l.to === e.id), e.id + ': ' + id + ' is strung to it').toBe(true);
    }));
    graph.all.filter((e) => !e.future).forEach((e) => expect(e.early, e.id + ': only a scenario can be overtaken').toBeUndefined());
  });
});
