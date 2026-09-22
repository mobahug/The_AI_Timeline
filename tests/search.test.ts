import { describe, it, expect } from 'vitest';
import { buildGraph } from '../src/lib/data';
import { matches, searchText, PEOPLE, appearancesOf } from '../src/lib/files';

/* One index for the field in the header: what the page filters to and what the
   dropdown ranks are the same set of words. Before this the field read title +
   summary + year and the dropdown read summary + why + year, so a search for a
   name reached five cards on the archive and ten on the files page. */

const graph = buildGraph();
const find = (q: string) => graph.all.filter((e) => matches(e, q.toLowerCase()));

describe('the one search index', () => {
  it('reaches a name wherever the card says it', () => {
    const hinton = PEOPLE.find((p) => p.id === 'geoffrey-hinton')!;
    // Everything the files page counts as an appearance is findable by name.
    const onFile = appearancesOf(graph, hinton).map((e) => e.id);
    const found = find('hinton').map((e) => e.id);
    expect(onFile.filter((id) => !found.includes(id))).toEqual([]);
    expect(found.length).toBeGreaterThanOrEqual(onFile.length);
  });

  it('reads the paragraphs, not only the summary', () => {
    const withDetail = graph.all.find((e) => (e.detail || []).length > 1)!;
    const word = (withDetail.detail as string[])[1].split(/\s+/).find((w) => w.length > 9)!;
    expect(find(word).map((e) => e.id)).toContain(withDetail.id);
  });

  it('reads the figures and the date, and never the sources', () => {
    const chatgpt = graph.index['chatgpt'];
    expect(searchText(chatgpt)).toContain('research preview');   // a figure's value
    expect(searchText(chatgpt)).toContain('2022-11-30');         // the date it carries
    expect(searchText(chatgpt)).not.toContain('wikipedia');      // a source's publisher
  });

  it('answers nothing with everything', () => {
    expect(find('').length).toBe(graph.all.length);
  });
});
