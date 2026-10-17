import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { FEED_FILES, FEED_SIZE, ORIGIN, atom, dateRecords, dayOf, feedEntries, itemsOf, noteOf, readHistory } from '../scripts/feed';
import type { Commit, FeedKind, Item, Snapshot } from '../scripts/feed';

/* The feed is dated from the history, not from the data. These hold the dating
   to a small invented history — added, revised, reformatted, removed — and then
   build the real feed from this repository's own history, which must agree
   with what git says was committed last. */

const commit = (n: number, subject: string): Commit => ({ sha: 'c' + n, date: '2026-10-0' + n + 'T12:00:00+03:00', subject });
const files = (cards: object[], leads: object[] = [], questions: object[] | null = null, checks: object[] | null = null): Snapshot['files'] => ({
  card: JSON.stringify(cards),
  lead: JSON.stringify({ leads }),
  question: questions === null ? null : JSON.stringify({ questions }),
  check: checks === null ? null : JSON.stringify({ checks })
});
const card = (id: string, summary = 'As first written.') => ({ id, year: 1966, title: 'Card ' + id, summary });

describe('the feed', () => {
  const history: Snapshot[] = [
    { commit: commit(1, 'The first cards'), files: files([card('a'), card('b')]) },
    { commit: commit(2, 'A lead'), files: files([card('a'), card('b')], [{ id: 'l', title: 'A lead', blurb: 'Rung by rung.' }]) },
    // The same records, written out differently: nothing changed.
    { commit: commit(3, 'Reformat'), files: { ...files([card('a'), card('b')], [{ id: 'l', title: 'A lead', blurb: 'Rung by rung.' }]), card: JSON.stringify([card('a'), card('b')], null, 2) } },
    { commit: commit(4, 'Card b says what its source says.'), files: files([card('a'), card('b', 'As corrected.')], [{ id: 'l', title: 'A lead', blurb: 'Rung by rung.' }]) },
    { commit: commit(5, 'Questions'), files: files([card('a'), card('b', 'As corrected.')], [{ id: 'l', title: 'A lead', blurb: 'Rung by rung.' }], [{ id: 'q', question: 'Why?', short: 'Because.' }]) },
    { commit: commit(6, 'A headline, checked'), files: files([card('a'), card('b', 'As corrected.')], [{ id: 'l', title: 'A lead', blurb: 'Rung by rung.' }], [{ id: 'q', question: 'Why?', short: 'Because.' }], [{ id: 'h', title: 'Did it?', short: 'Not quite.' }]) }
  ];
  const dated = dateRecords(history);

  it('dates a record by the commit that added it and the last that changed it', () => {
    expect(dated.get('card/a')).toMatchObject({ added: { sha: 'c1' }, changed: { sha: 'c1' } });
    expect(dated.get('card/b')).toMatchObject({ added: { sha: 'c1' }, changed: { sha: 'c4' } });
    expect(dated.get('lead/l')).toMatchObject({ added: { sha: 'c2' }, changed: { sha: 'c2' } });
    expect(dated.get('question/q')).toMatchObject({ added: { sha: 'c5' }, changed: { sha: 'c5' } });
    expect(dated.get('check/h')).toMatchObject({ added: { sha: 'c6' }, changed: { sha: 'c6' } });
  });

  it('does not date anything by a commit that only rewrote the file', () => {
    expect([...dated.values()].some((d) => d.changed.sha === 'c3')).toBe(false);
  });

  it('counts a record taken off and put back as a change, not as new', () => {
    const back = dateRecords([
      { commit: commit(1, 'Added'), files: files([card('a')]) },
      { commit: commit(2, 'Removed'), files: files([]) },
      { commit: commit(3, 'Restored'), files: files([card('a')]) }
    ]);
    expect(back.get('card/a')).toMatchObject({ added: { sha: 'c1' }, changed: { sha: 'c3' } });
  });

  it('lists newest first, questions before checks before leads before cards within a commit, and leaves out what is not committed', () => {
    const items: Item[] = [
      ...itemsOf({
        card: JSON.stringify([card('a'), card('b'), card('unsaved')]),
        lead: JSON.stringify({ leads: [{ id: 'l', title: 'A lead', blurb: 'Rung by rung.' }] }),
        question: JSON.stringify({ questions: [{ id: 'q', question: 'Why?', short: 'Because.' }] }),
        check: JSON.stringify({ checks: [{ id: 'h', title: 'Did it?', short: 'Not quite.' }] })
      })
    ];
    const entries = feedEntries(items, dated);
    expect(entries.map((e) => e.kind + '/' + e.id)).toEqual(['check/h', 'question/q', 'card/b', 'lead/l', 'card/a']);
    expect(feedEntries(items, dated, 2)).toHaveLength(2);
    expect(entries[0].url).toBe(ORIGIN + 'check/h/');
    expect(entries[0]).toMatchObject({ title: 'Did it?', summary: 'Not quite.' });
  });

  it('says whether an entry is new or what changed, and when', () => {
    const [h, q, b] = feedEntries(itemsOf({ card: JSON.stringify([card('b')]), lead: '{"leads":[]}', question: JSON.stringify({ questions: [{ id: 'q', question: 'Why?', short: 'Because.' }] }), check: JSON.stringify({ checks: [{ id: 'h', title: 'Did it?', short: 'Not quite.' }] }) }), dated);
    expect(noteOf(h)).toBe('A new headline check, added on 6 October 2026.');
    expect(noteOf(q)).toBe('A new plain question, added on 5 October 2026.');
    expect(noteOf(b)).toBe('Revised on 4 October 2026: Card b says what its source says. On the board since 1 October 2026.');
    expect(dayOf('2026-12-31T23:59:59-05:00')).toBe('31 December 2026');
  });

  it('escapes what it prints, and dates itself by its newest entry', () => {
    const odd: Item = { kind: 'card', id: 'r&d', title: 'Research & development <draft>', summary: 'A "quoted" summary.' };
    const xml = atom(feedEntries([odd], new Map([['card/r&d', { added: commit(1, 'x'), changed: commit(2, 'y & z'), seq: 1 }]])));
    expect(xml).toContain('<title>Research &amp; development &lt;draft&gt;</title>');
    expect(xml).toContain('<id>' + ORIGIN + 'card/r%26d/</id>');
    expect(xml).toContain('<updated>2026-10-02T12:00:00+03:00</updated>\n  <entry>');
    // Every & in the document begins an entity; no tag is opened inside text.
    expect(xml.replace(/&(amp|lt|gt|quot|apos);/g, '')).not.toContain('&');
    expect(atom([])).toContain('<feed xmlns="http://www.w3.org/2005/Atom"');
  });
});

describe('the feed, from this repository', () => {
  const root = fileURLToPath(new URL('..', import.meta.url));
  const read = (path: string) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
  const kinds = Object.keys(FEED_FILES) as FeedKind[];
  const items = itemsOf(Object.fromEntries(kinds.map((k) => [k, read(FEED_FILES[k].path)])) as Record<FeedKind, string>);
  const dated = dateRecords(readHistory(root));
  const entries = feedEntries(items, dated);

  it('leads with the last commit that changed the data', () => {
    const last = execFileSync('git', ['log', '--first-parent', '-1', '--format=%H', 'HEAD', '--', ...kinds.map((k) => FEED_FILES[k].path)], { cwd: root, encoding: 'utf8' }).trim();
    expect(entries.length).toBeGreaterThan(0);
    expect(entries.length).toBeLessThanOrEqual(FEED_SIZE);
    // A commit that only took records off the board leaves nothing to list.
    if ([...dated.values()].some((d) => d.changed.sha === last)) expect(entries[0].changed.sha).toBe(last);
    for (let i = 1; i < entries.length; i++) expect(entries[i].seq).toBeLessThanOrEqual(entries[i - 1].seq);
  });

  it('points every entry at a page the sitemap lists', () => {
    const sitemap = read('public/sitemap.xml');
    for (const e of entries) expect(sitemap, e.url).toContain('<loc>' + e.url + '</loc>');
  });
});
