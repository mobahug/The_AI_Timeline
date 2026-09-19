import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { citedTitle, bearingOn, splitSentences } from '../src/lib/wiki';
import { buildGraph } from '../src/lib/data';
import type { Event, WikiCache } from '../src/lib/types';

const graph = buildGraph(null as unknown as undefined);
const record = graph.all.filter((e) => !e.future);
const cache = JSON.parse(readFileSync(new URL('../public/wiki-cache.json', import.meta.url), 'utf8')) as WikiCache;

describe('citedTitle reads the page we actually cite', () => {
  it('extracts the article from a Wikipedia URL', () => {
    expect(citedTitle('https://en.wikipedia.org/wiki/AlexNet')).toBe('AlexNet');
    expect(citedTitle('https://en.wikipedia.org/wiki/Moore%27s_law')).toBe("Moore's law");
    expect(citedTitle('https://en.wikipedia.org/wiki/Mata_v._Avianca,_Inc.')).toBe('Mata v. Avianca, Inc.');
  });

  it('returns null for non-Wikipedia sources rather than guessing', () => {
    expect(citedTitle('https://www.nature.com/articles/323533a0')).toBe(null);
    expect(citedTitle('https://arxiv.org/abs/1512.03385')).toBe(null);
    expect(citedTitle('https://9to5google.com/2022/12/21/google-code-red-chatgpt/')).toBe(null);
    expect(citedTitle('not a url')).toBe(null);
    expect(citedTitle(undefined)).toBe(null);
  });

  it('is not fooled by a lookalike hostname', () => {
    expect(citedTitle('https://en.wikipedia.org.evil.test/wiki/AlexNet')).toBe(null);
  });
});

describe('the cited page is cached for every Wikipedia citation', () => {
  it('leaves no Wikipedia-cited entry without its own page in the cache', () => {
    const missing = record
      .filter((e) => e.url && citedTitle(e.url))
      .filter((e) => !cache[citedTitle(e.url) as string]);
    expect(missing.map((e) => e.title + ' -> ' + citedTitle(e.url))).toEqual([]);
  });

  it('never shows text from a different page than the one cited', () => {
    // The three entries whose illustration and citation deliberately differ are
    // exactly the ones this must get right.
    const diverged = record.filter((e) => e.url && citedTitle(e.url) && e.wikiTitle && citedTitle(e.url) !== e.wikiTitle);
    expect(diverged.length).toBeGreaterThan(0);
    diverged.forEach((e) => {
      const cited = cache[citedTitle(e.url) as string];
      expect(cited, e.title).toBeTruthy();
      expect(cited.extract.length, e.title).toBeGreaterThan(0);
      // and it must not be the illustration page's text
      const illo = cache[e.wikiTitle as string];
      if (illo && illo.extract) expect(cited.extract, e.title).not.toBe(illo.extract);
    });
  });
});

describe('bearingOn separates a source that speaks to the entry from one that does not', () => {
  it('finds the sentence that mentions the entry', () => {
    const e = { title: 'AlexNet', year: 2012 } as Event;
    const r = bearingOn(e, 'AlexNet is a convolutional neural network architecture. It competed in the ImageNet challenge in 2012.');
    expect(r.mentions).toBe(true);
    expect(r.hits.length).toBeGreaterThan(0);
  });

  it('reports no bearing when the lead never mentions the entry', () => {
    const e = { title: 'The datacenter buildout', year: 2024 } as Event;
    const r = bearingOn(e, 'A tomato is an edible berry of the plant Solanum lycopersicum.');
    expect(r.mentions).toBe(false);
    expect(r.hits).toEqual([]);
  });

  it('handles an empty or missing extract without throwing', () => {
    expect(bearingOn({ title: 'x', year: 2000 } as Event, '').mentions).toBe(false);
    expect(bearingOn(null, 'text').mentions).toBe(false);
  });

  it('flags how many real entries their cited lead does not mention', () => {
    const withExtract = record.filter((e) => e.url && citedTitle(e.url) && cache[citedTitle(e.url) as string] && cache[citedTitle(e.url) as string].extract);
    const silent = withExtract.filter((e) => !bearingOn(e, cache[citedTitle(e.url) as string].extract).mentions);
    // This is a real property of the data, not a bug: the UI must say so rather
    // than letting the paragraph imply support it does not give.
    expect(withExtract.length).toBeGreaterThan(90);
    expect(silent.length).toBeLessThan(withExtract.length / 2);
  });
});

describe('splitSentences does not break on abbreviations', () => {
  it('keeps a case name whole', () => {
    const s = splitSentences('Mata v. Avianca, Inc. was a case in the US District Court. It became famous in 2023.');
    expect(s.length).toBe(2);
    expect(s[0]).toBe('Mata v. Avianca, Inc. was a case in the US District Court.');
  });

  it('keeps initialisms, initials and decimals whole', () => {
    expect(splitSentences('R.U.R. gave us the word robot.').length).toBe(1);
    expect(splitSentences('John A. Smith wrote it.').length).toBe(1);
    expect(splitSentences('It reached 3.57 per cent error.').length).toBe(1);
    expect(splitSentences('The U.S. Department of Commerce acted.').length).toBe(1);
  });

  it('keeps LaTeX markup whole', () => {
    const s = splitSentences('TD-Gammon used {\\displaystyle \\lambda =0.7} in training. It worked.');
    expect(s.length).toBe(2);
  });

  it('returns byte-exact slices of the original', () => {
    const text = 'Dr. Hinton left Google in May 2023. He warned about risk. Prof. Bengio agreed.';
    splitSentences(text).forEach((s) => expect(text).toContain(s));
  });

  it('still splits ordinary prose', () => {
    expect(splitSentences('One. Two. Three.').length).toBe(3);
    expect(splitSentences('')).toEqual([]);
  });

  it('every real cached extract splits into slices that exist verbatim in it', () => {
    Object.values(cache).filter((v) => v.extract).forEach((v) => {
      splitSentences(v.extract).forEach((s) => expect(v.extract.includes(s)).toBe(true));
    });
  });
});
