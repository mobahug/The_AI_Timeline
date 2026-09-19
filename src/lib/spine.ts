import spine from '../../data/spine.json';
import { NOW, THREADS, catLabel } from './data';
import type { Finding, Graph, Joint, Line, Row } from './types';

export const FINDINGS: Finding[] = spine.findings as Finding[];

/** The last finding that starts on or before this year. Pure arithmetic, so every
 *  entry lands somewhere and a newly added entry files itself. */
export function findingFor(year: number): Finding {
  let hit = FINDINGS[0];
  for (const f of FINDINGS) { if (f.from <= year) hit = f; else break; }
  return hit;
}

export const findingByNumber = (n: string | number | null): Finding | null => FINDINGS.find((f) => f.n === Number(n)) || null;

/** The year range a finding covers, closed at the next finding's start. */
export function spanOf(finding: Finding, lastYear?: number): { from: number; to: number } {
  const next = FINDINGS.find((f) => f.n === finding.n + 1);
  return { from: finding.from, to: next ? next.from - 1 : (lastYear || finding.from) };
}

/**
 * The whole route, assembled from the graph. Every count here is derived; nothing
 * about a finding's contents is written down in spine.json.
 */
export function buildLine(graph: Graph): Line {
  const all = graph.all;
  const lastYear = all.length ? all[all.length - 1].year : NOW;

  const rows = FINDINGS.map((finding) => {
    const span = spanOf(finding, lastYear);
    const cards = all
      .filter((e) => e.year >= span.from && e.year <= span.to)
      .sort((a, b) => a.year - b.year);
    const ids = new Set(cards.map((e) => e.id));

    const inside = graph.edges.filter((l) => ids.has(l.from) && ids.has(l.to));
    const leaving = graph.edges.filter((l) => ids.has(l.from) && !ids.has(l.to));
    const arriving = graph.edges.filter((l) => !ids.has(l.from) && ids.has(l.to));

    const lead = finding.lead ? graph.index[finding.lead] : null;
    const threads = THREADS.filter((t) => cards.some((e) => e.thread === t.id));
    const unstrung = cards.filter((e) => !(graph.adjacency[e.id] || []).length);

    const row: Row = {
      finding, span, cards, lead,
      // Three states, not two. A stretch whose cards all connect outward is not
      // "background the board has not argued about" — its argument simply runs
      // forward into the next stretch, which is the normal shape here.
      kind: inside.length ? 'argued' : ((leaving.length || arriving.length) ? 'connected' : 'context'),
      inside, leaving, arriving, threads, unstrung,
      sourced: cards.filter((e) => e.url).length,
      projections: cards.filter((e) => e.future).length
    };
    return row;
  });

  // The joint between two findings: the strings that actually cross the boundary.
  const joints: Joint[] = rows.slice(0, -1).map((row, i) => {
    const next = rows[i + 1];
    const nextIds = new Set(next.cards.map((e) => e.id));
    const crossing = row.leaving.filter((l) => nextIds.has(l.to));
    return { from: row, to: next, crossing };
  });

  return { rows, joints, lastYear };
}

/**
 * One derived sentence of self-criticism per finding, in plain English rather than
 * a scoreboard. A reader can repeat a sentence; they cannot repeat "7 cards, 0 strings".
 */
export function readingOf(row: Row): string {
  const n = row.cards.length;
  if (!n) return 'Nothing on the board falls in these years.';

  const entries = (k: number) => k + (k === 1 ? ' entry' : ' entries');
  const strings = (k: number) => k + (k === 1 ? ' string' : ' strings');

  if (row.kind === 'context') {
    return entries(n) + ' fall in these years and not one carries a string, in either direction — '
      + 'this stretch is background the board has never argued about.';
  }

  if (row.kind === 'connected') {
    const out = row.leaving.length;
    const inn = row.arriving.length;
    const ways: string[] = [];
    if (out) ways.push(strings(out) + ' running forward out of it');
    if (inn) ways.push(strings(inn) + ' arriving from earlier');
    return 'No string runs between these ' + n + ' entries, but the stretch is not isolated: '
      + ways.join(' and ') + '. Its argument is with the years around it, not within itself.';
  }

  const byCat: Record<string, number> = {};
  row.inside.forEach((l) => {
    const from = row.cards.find((e) => e.id === l.from);
    if (from) byCat[from.category] = (byCat[from.category] || 0) + 1;
  });
  const top = Object.entries(byCat).sort((a, b) => b[1] - a[1])[0];

  const parts = [strings(row.inside.length) + ' ' + (row.inside.length === 1 ? 'runs' : 'run') + ' between these ' + n + ' entries'];
  if (top && row.inside.length > 1 && top[1] > 1) {
    parts.push(top[1] === row.inside.length
      ? 'every one of them leaves a ' + catLabel(top[0]).toLowerCase() + ' entry'
      : top[1] + ' of them leave a ' + catLabel(top[0]).toLowerCase() + ' entry');
  }
  if (row.leaving.length) parts.push(strings(row.leaving.length) + ' carry forward into later years');
  if (row.unstrung.length) {
    parts.push(row.unstrung.length + ' of the ' + n + ' ' + (row.unstrung.length === 1 ? 'carries' : 'carry') + ' no string at all');
  }
  return parts.join(', ') + '.';
}
