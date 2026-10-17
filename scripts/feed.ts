// The feed: what is new on the board, newest first, for a reader who wants to
// know when it moves without coming back to look. An Atom document of the cards,
// leads, plain questions and headline checks, each entry dated by when it was
// added and when it last changed. The same dates are drawn on the site itself,
// on the latest page (scripts/board-changes.ts).
//
// The data carries no "added on" field, and the dates are not typed into it: a
// date kept by hand is a date someone forgets to change. They are read from the
// repository's history at build time instead — every commit on the first-parent
// line (the commits main itself is made of), each record compared with its copy
// in the commit before. A record's dates are therefore the dates its words
// actually changed, and cannot drift from them. The build needs the whole
// history for that, so a shallow clone is refused rather than dated wrongly:
// the deploy workflow checks out with `fetch-depth: 0`.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export const ORIGIN = 'https://mobahug.github.io/The_AI_Timeline/';
export const FEED_FILE = 'feed.xml';
/** Entries in the feed: enough to cover a few weeks of work, few enough to read. */
export const FEED_SIZE = 50;

export type FeedKind = 'card' | 'lead' | 'question' | 'check';
/** The files the feed reads, by kind, and the key their records sit under
 *  (`null`: the file is the array itself). */
export const FEED_FILES: Record<FeedKind, { path: string; key: string | null }> = {
  card: { path: 'data/events.json', key: null },
  lead: { path: 'data/leads.json', key: 'leads' },
  question: { path: 'data/questions.json', key: 'questions' },
  check: { path: 'data/checks.json', key: 'checks' }
};
const KINDS = Object.keys(FEED_FILES) as FeedKind[];
/** Within one commit, the questions first, then the checks, the leads, the cards. */
const RANK: Record<FeedKind, number> = { question: 0, check: 1, lead: 2, card: 3 };

export interface Commit { sha: string; date: string; subject: string }
/** One commit's copy of the data: the text of each file, or null where the
 *  file did not exist yet. */
export interface Snapshot { commit: Commit; files: Record<FeedKind, string | null> }
/** When a record was added, and when it last changed (its addition counts). */
export interface Dated { added: Commit; changed: Commit; seq: number }
/** A record as the feed prints it, read from the data being built. */
export interface Item { kind: FeedKind; id: string; title: string; summary: string }
export interface Entry extends Item, Dated { url: string }

const recordsOf = (kind: FeedKind, text: string | null): { id: string }[] => {
  if (text === null) return [];
  const json = JSON.parse(text);
  const key = FEED_FILES[kind].key;
  const list = key === null ? json : json[key];
  return Array.isArray(list) ? list : [];
};
const keyOf = (kind: FeedKind, id: string) => kind + '/' + id;

/** Every record's dates, from the snapshots oldest first. A record is compared
 *  as parsed, so a commit that only reformats a file dates nothing; a record
 *  that is removed and later restored counts the restoration as a change. */
export function dateRecords(snapshots: Snapshot[]): Map<string, Dated> {
  const dated = new Map<string, Dated>();
  let before = new Map<string, string>();
  snapshots.forEach(({ commit, files }, seq) => {
    // Most commits touch none of the files; their text is the text before.
    if (seq > 0 && KINDS.every((k) => files[k] === snapshots[seq - 1].files[k])) return;
    const now = new Map<string, string>();
    for (const kind of KINDS) for (const r of recordsOf(kind, files[kind])) now.set(keyOf(kind, r.id), JSON.stringify(r));
    for (const [key, text] of now) {
      if (before.get(key) === text) continue;
      const known = dated.get(key);
      dated.set(key, { added: known ? known.added : commit, changed: commit, seq });
    }
    before = now;
  });
  return dated;
}

/** The feed's entries: the records in the data being built that the history
 *  dates, most recently changed first, at most `size` of them. A record not yet
 *  committed has no date and is left out until it is. */
export function feedEntries(items: Item[], dated: Map<string, Dated>, size = FEED_SIZE): Entry[] {
  return items
    .map((item, i) => ({ item, i, d: dated.get(keyOf(item.kind, item.id)) }))
    .filter((x): x is { item: Item; i: number; d: Dated } => !!x.d)
    .sort((a, b) => b.d.seq - a.d.seq || RANK[a.item.kind] - RANK[b.item.kind] || a.i - b.i)
    .slice(0, size)
    .map(({ item, d }) => ({ ...item, ...d, url: ORIGIN + item.kind + '/' + encodeURIComponent(item.id) + '/' }));
}

/** What the data being built holds: every file the feed reads, from disk. */
export const readItems = (root: string): Item[] =>
  itemsOf(Object.fromEntries(KINDS.map((k) => [k, readFileSync(join(root, FEED_FILES[k].path), 'utf8')])) as Record<FeedKind, string>);

/** What the data being built holds, in the order it is written. */
export function itemsOf(files: Record<FeedKind, string>): Item[] {
  const out: Item[] = [];
  for (const r of recordsOf('question', files.question) as { id: string; question: string; short: string }[]) {
    out.push({ kind: 'question', id: r.id, title: r.question, summary: r.short });
  }
  for (const r of recordsOf('check', files.check) as { id: string; title: string; short: string }[]) {
    out.push({ kind: 'check', id: r.id, title: r.title, summary: r.short });
  }
  for (const r of recordsOf('lead', files.lead) as { id: string; title: string; blurb: string }[]) {
    out.push({ kind: 'lead', id: r.id, title: r.title, summary: r.blurb });
  }
  for (const r of recordsOf('card', files.card) as { id: string; title: string; summary: string }[]) {
    out.push({ kind: 'card', id: r.id, title: r.title, summary: r.summary });
  }
  return out;
}

const esc = (s: string): string =>
  s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
/** `2026-10-12T21:29:03+03:00` → `12 October 2026`, the day as the committer's clock had it. */
export const dayOf = (date: string): string => {
  const [y, m, d] = date.slice(0, 10).split('-').map(Number);
  return d + ' ' + MONTHS[m - 1] + ' ' + y;
};

const NOUN: Record<FeedKind, string> = { card: 'card', lead: 'lead', question: 'plain question', check: 'headline check' };
/** The line under an entry's summary: new, or what changed and when. */
export const noteOf = (e: Entry): string =>
  e.added.sha === e.changed.sha
    ? 'A new ' + NOUN[e.kind] + ', added on ' + dayOf(e.added.date) + '.'
    : 'Revised on ' + dayOf(e.changed.date) + ': ' + e.changed.subject.replace(/[.\s]*$/, '') + '. On the board since ' + dayOf(e.added.date) + '.';

/** The Atom document. Its own date is its newest entry's, so the same history
 *  always writes the same file. */
export function atom(entries: Entry[]): string {
  const updated = entries.length ? entries[0].changed.date : '1970-01-01T00:00:00Z';
  const entry = (e: Entry) => [
    '  <entry>',
    '    <id>' + esc(e.url) + '</id>',
    '    <title>' + esc(e.title) + '</title>',
    '    <link rel="alternate" type="text/html" href="' + esc(e.url) + '"/>',
    '    <category term="' + e.kind + '" label="' + esc(NOUN[e.kind]) + '"/>',
    '    <published>' + esc(e.added.date) + '</published>',
    '    <updated>' + esc(e.changed.date) + '</updated>',
    '    <summary type="text">' + esc(e.summary) + '</summary>',
    '    <content type="html">' + esc('<p>' + esc(e.summary) + '</p><p><em>' + esc(noteOf(e)) + '</em></p>') + '</content>',
    '  </entry>'
  ].join('\n');
  return '<?xml version="1.0" encoding="utf-8"?>\n'
    + '<feed xmlns="http://www.w3.org/2005/Atom" xml:lang="en">\n'
    + '  <id>' + ORIGIN + FEED_FILE + '</id>\n'
    + '  <title>The AI Timeline — what is new</title>\n'
    + '  <subtitle>New and revised cards, leads, plain questions and headline checks on the investigation board, newest first.</subtitle>\n'
    + '  <link rel="self" type="application/atom+xml" href="' + ORIGIN + FEED_FILE + '"/>\n'
    + '  <link rel="alternate" type="text/html" href="' + ORIGIN + '"/>\n'
    + '  <author><name>The AI Timeline</name><uri>' + ORIGIN + '</uri></author>\n'
    + '  <rights>Text CC BY-NC-ND 4.0; quoted sentences remain their publishers\'.</rights>\n'
    + '  <updated>' + esc(updated) + '</updated>\n'
    + entries.map(entry).join('\n') + (entries.length ? '\n' : '')
    + '</feed>\n';
}

/* ─── The history, from git ──────────────────────────────────────────────── */

const git = (root: string, args: string[]): string =>
  execFileSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });

/** The commits on HEAD's first-parent line, oldest first. */
export function firstParentLine(root: string): Commit[] {
  return git(root, ['log', '--first-parent', '--reverse', '--format=%H%x1f%cI%x1f%s%x1e', 'HEAD'])
    .split('\x1e').map((s) => s.trim()).filter(Boolean)
    .map((s) => { const [sha, date, subject] = s.split('\x1f'); return { sha, date, subject }; });
}

/** One snapshot per commit on the first-parent line. Every commit is looked at,
 *  not only those a path-limited log would name: a merge that brings data in
 *  from a branch is the commit where it reached main, and path limiting can
 *  hide it. A file's text is fetched only when its blob differs from the one
 *  before. */
export function readHistory(root: string): Snapshot[] {
  if (git(root, ['rev-parse', '--is-shallow-repository']).trim() === 'true') {
    throw new Error('feed: this clone is shallow, so the history cannot date the records. Fetch the whole history (actions/checkout with fetch-depth: 0, or git fetch --unshallow).');
  }
  const paths = KINDS.map((k) => FEED_FILES[k].path);
  const blobs = new Map<string, string>();
  const text = (oid: string) => {
    let t = blobs.get(oid);
    if (t === undefined) { t = git(root, ['cat-file', 'blob', oid]); blobs.set(oid, t); }
    return t;
  };
  return firstParentLine(root).map((commit) => {
    const oids = new Map<string, string>();
    for (const line of git(root, ['ls-tree', commit.sha, '--', ...paths]).split('\n')) {
      const m = /^\d+ blob ([0-9a-f]+)\t(.+)$/.exec(line);
      if (m) oids.set(m[2], m[1]);
    }
    const files = {} as Record<FeedKind, string | null>;
    for (const k of KINDS) { const oid = oids.get(FEED_FILES[k].path); files[k] = oid ? text(oid) : null; }
    return { commit, files };
  });
}
