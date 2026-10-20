import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import {
  SHARE_H, SHARE_W, cardShare, commonsFile, creditLine, creditOf, filterMatrix, fonts, leadShare, pictureSources, shareContext,
  siteChain, siteShare
} from '../scripts/share-images';
import type { ShareContext } from '../scripts/share-images';
import { buildGraph } from '../src/lib/data';
import { LEADS } from '../src/lib/leads';
import { CARD_PHOTO_FILTER } from '../src/lib/styles';

/* The share images are drawn at build time, by satori and sharp. These draw a
   few without the network — a context whose one picture comes from disk — and
   hold them to the shape a link preview asks for, and to a budget of 300KB so
   that no preview waits on a heavy image. */

const graph = buildGraph();
const fixture = readFileSync(join(__dirname, '..', 'public', 'apple-touch-icon.png'));
const offline = (pictured: boolean): ShareContext => ({
  graph,
  articleOf: (e) => (pictured && !e.future ? 'A fixture' : null),
  picture: async () => (pictured ? { bytes: fixture, drawing: false, credit: 'A. Photographer, CC BY-SA 4.0, via Wikimedia Commons' } : null)
});

const shape = async (png: Buffer) => {
  const m = await sharp(png).metadata();
  return { width: m.width, height: m.height, format: m.format, palette: m.isPalette, small: png.length < 300 * 1024 };
};
const PREVIEW = { width: SHARE_W, height: SHARE_H, format: 'png', palette: true, small: true };

describe('share images', () => {
  it('asks Wikimedia for the 500px thumbnail first, then for what the cache holds', () => {
    const thumb = 'https://thumb.wikimedia.org/wikipedia/commons/thumb/7/79/Hilbert.jpg/330px-Hilbert.jpg?utm_source=en.wikipedia.org';
    expect(pictureSources(thumb)).toEqual([
      'https://thumb.wikimedia.org/wikipedia/commons/thumb/7/79/Hilbert.jpg/500px-Hilbert.jpg',
      'https://thumb.wikimedia.org/wikipedia/commons/thumb/7/79/Hilbert.jpg/330px-Hilbert.jpg'
    ]);
    // An original smaller than any thumbnail is fetched as it is.
    expect(pictureSources('https://upload.wikimedia.org/wikipedia/en/1/1d/Donald_Hebb.gif?utm_content=thumbnail_unscaled'))
      .toEqual(['https://upload.wikimedia.org/wikipedia/en/1/1d/Donald_Hebb.gif']);
  });

  /* A share image is a copy of its photograph served from this site, so it
     only ever uses a file on Wikimedia Commons, where every file is under a
     free licence — never a local upload to the English Wikipedia, which is
     most often a poster, a cover or a logo used there as fair use. And it uses
     the picture the board shows, or none: it does not go looking for another. */
  it('uses only the board’s own picture, and only if it is on Commons', () => {
    const commons = 'https://thumb.wikimedia.org/wikipedia/commons/thumb/7/79/Hilbert.jpg/330px-Hilbert.jpg?utm_source=x';
    const local = 'https://upload.wikimedia.org/wikipedia/en/6/6d/The_Terminator.png';
    const cache = {
      'Hilbert\'s problems': { img: commons, extract: '' },
      'The Terminator': { img: local, extract: '' },
      'Arnold Schwarzenegger': { img: commons, extract: '' }
    };
    const fallbacks = { 'the-terminator': 'Arnold Schwarzenegger' };
    const ctx = shareContext(cache, fallbacks);
    expect(ctx.articleOf(graph.index['hilbert-s-23-problems'])).toBe('Hilbert\'s problems');
    expect(ctx.articleOf(graph.index['the-terminator'])).toBe(null);
    expect(commonsFile(commons)).toBe('Hilbert.jpg');
    expect(commonsFile('https://upload.wikimedia.org/wikipedia/commons/a/a1/Alan_Turing_Aged_16.jpg')).toBe('Alan Turing Aged 16.jpg');
    expect(commonsFile(local)).toBe(null);
  });

  /* Each photograph is credited on the image, as Commons gives the credit:
     its author HTML read as text, the hidden copy of a name Commons keeps for
     machines left out, and a long list of authors cut short of the licence. */
  it('credits a photograph with its author and licence, and never loses the licence', () => {
    const hilbert = creditOf({
      Artist: { value: 'Unknown author<span style="display: none;">Unknown author</span>' },
      LicenseShortName: { value: 'Public domain' }
    });
    expect(hilbert).toEqual({ artist: 'Unknown author', licence: 'Public domain' });
    if (!hilbert) throw new Error('no credit');
    expect(creditLine(hilbert)).toBe('Unknown author, Public domain, via Wikimedia Commons');
    expect(creditOf({ Artist: { value: '<a href="//x">Elliott &amp; Fry</a>' }, LicenseShortName: { value: 'Public domain' } }))
      .toEqual({ artist: 'Elliott & Fry', licence: 'Public domain' });
    // No licence named, no credit — and no photograph.
    expect(creditOf({ Artist: { value: 'Someone' } })).toBe(null);
    const many = creditLine({ artist: 'User:Verdy p, User:-xfi-, User:Paddu, User:Nightstallion, User:Funakoshi, User:Jeltz', licence: 'Public domain' });
    expect(many).toBe('User:Verdy p, User:-xfi-, User:Paddu, …, Public domain, via Wikimedia Commons');
  });

  /* satori keeps one face per name, weight and style. Given the latin and the
     latin-extended subsets under one name it dropped the second, and drew the
     ő of Erdős as an empty box. */
  it('gives every face its own name, weight and style, so no subset is dropped', async () => {
    const faces = await fonts();
    const keys = faces.map((f) => f.name + ' ' + f.weight + ' ' + f.style);
    expect(new Set(keys).size).toBe(keys.length);
    expect(faces.some((f) => f.name.startsWith('Instrument Serif') && f.name.includes('latin-ext'))).toBe(true);
  });

  it('makes the board’s print of a photograph as a browser does', () => {
    // grayscale(1) gives every channel the same luminance.
    const grey = filterMatrix('grayscale(1)').matrix;
    expect(grey[0]).toEqual(grey[1]);
    expect(grey[1]).toEqual(grey[2]);
    // Contrast pivots on mid-grey, and a percentage is a fraction.
    const c = filterMatrix('contrast(150%)');
    expect(c.matrix[0][0] * 127.5 + c.offset[0]).toBeCloseTo(127.5);
    expect(c).toEqual(filterMatrix('contrast(1.5)'));
    // The board's own filter is read; one it cannot read stops the build.
    expect(() => filterMatrix(CARD_PHOTO_FILTER)).not.toThrow();
    expect(() => filterMatrix('blur(2px)')).toThrow();
    expect(() => filterMatrix('hue-rotate(90deg)')).toThrow();
  });

  it('draws a card with no picture as type, at the size a preview asks for', async () => {
    const made = await cardShare(graph.index['turing-asks-the-question'], offline(false));
    expect(await shape(made.png)).toEqual(PREVIEW);
    expect(made.pictured).toBe(false);
    expect(made.alt).toBe('A card pinned to The AI Timeline’s board: 1950, Turing asks the question — Research.');
  });

  it('frames a card’s picture, and says which article it is from', async () => {
    const made = await cardShare(graph.index['turing-asks-the-question'], offline(true));
    expect(await shape(made.png)).toEqual(PREVIEW);
    expect(made.pictured).toBe(true);
    expect(made.alt).toContain('The picture is from Wikipedia’s article “A fixture”: A. Photographer, CC BY-SA 4.0, via Wikimedia Commons.');
  });

  it('draws a scenario on manila, with its confidence and never a photograph', async () => {
    const e = graph.all.find((x) => x.future && x.confidence);
    if (!e || !e.confidence) throw new Error('no scenario with a confidence on the board');
    const made = await cardShare(e, offline(true));
    expect(made.pictured).toBe(false);
    expect(made.alt).toContain('A manila scenario card');
    expect(made.alt).toContain('a scenario, ' + e.confidence.toLowerCase());
  });

  it('draws a lead with its question and three of its rungs', async () => {
    const lead = LEADS[0];
    const made = await leadShare(lead, offline(false));
    expect(await shape(made.png)).toEqual(PREVIEW);
    expect(made.alt).toContain(lead.question);
    expect(made.alt).toContain('3 of its ' + lead.rungs.length + ' rungs');
  });

  /* The site's own image draws three cards on two strings. They are strings
     the board has — record to record to scenario — not ones drawn for show,
     and what the image counts is what the board holds. */
  it('strings the site’s three cards with strings the board has, and counts what it holds', async () => {
    const ctx = offline(true);
    const chain = siteChain(ctx);
    if (!chain) throw new Error('no chain from the record to a scenario');
    const [a, b, c] = chain;
    expect([a.future, b.future, c.future]).toEqual([false, false, true]);
    expect(graph.edges.some((l) => l.from === a.id && l.to === b.id)).toBe(true);
    expect(graph.edges.some((l) => l.from === b.id && l.to === c.id)).toBe(true);

    const made = await siteShare(ctx);
    expect(await shape(made.png)).toEqual(PREVIEW);
    expect(made.alt).toContain(graph.all.length + ' entries, ' + graph.edges.length + ' strings, '
      + graph.edges.filter((l) => l.noted).length + ' case notes');
  });

  /* The prerenderer writes each page's image, size and alt into these tags;
     a tag missing from the shell would leave every page without it. */
  it('leaves the prerenderer a tag for every part of the share image', () => {
    const shell = readFileSync(join(__dirname, '..', 'index.html'), 'utf8');
    ['og:image', 'og:image:width', 'og:image:height', 'og:image:alt'].forEach((p) => {
      expect(shell).toMatch(new RegExp('<meta property="' + p + '" content="[^"]*" />'));
    });
    expect(shell).toMatch(/<meta name="twitter:image:alt" content="[^"]*" \/>/);
    expect(shell).toContain('content="' + SHARE_W + '"');
    expect(shell).toContain('content="' + SHARE_H + '"');
  });
});
