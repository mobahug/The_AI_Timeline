import { describe, it, expect } from 'vitest';
import { bibtex, cardAddress, citation } from '../src/lib/cite';
import { events } from '../src/lib/data';
import { keptOf } from '../src/lib/dated';

describe('a card, cited', () => {
  const card = { id: 'chatgpt', title: 'ChatGPT', year: 2022, future: false };

  it('names the board, the card, its days and its published address', () => {
    const kept = { filed: '2026-09-10', changed: '2026-10-19' };
    expect(citation(card, kept)).toBe('The AI Timeline. “ChatGPT (2022).” An investigation board of artificial intelligence. Filed 10 Sep 2026; last revised 19 Oct 2026. ' + cardAddress('chatgpt'));
    expect(cardAddress('chatgpt')).toMatch(/^https:\/\/mobahug\.github\.io\/.*card\/chatgpt\/$/);
    // A card never revised says so once.
    expect(citation(card, { filed: '2026-09-10', changed: '2026-09-10' })).toContain('Filed 10 Sep 2026. ');
    // Without a history (a shallow clone) it still cites the page.
    expect(citation(card, null)).toContain('artificial intelligence. https://');
  });

  it('says a scenario is one', () => {
    expect(citation({ id: 'the-date-on-the-poster', title: 'The date on the poster', year: 2045, future: true }, null)).toContain('(2045, a scenario)');
  });

  it('writes BibTeX that TeX can read', () => {
    const tex = bibtex({ id: 'x', title: 'Profits & 50% of {it}_now', year: 2024, future: false }, { filed: '2026-09-10', changed: '2026-10-19' });
    expect(tex).toContain('title        = {{Profits \\& 50\\% of it\\_now (2024)}},');
    expect(tex).toContain('year         = {2026},');
    expect(tex.startsWith('@misc{aitimeline-x,')).toBe(true);
    expect(tex.endsWith('}')).toBe(true);
    // Braces balance, so the entry closes where it should.
    expect((tex.match(/{/g) || []).length).toBe((tex.match(/}/g) || []).length);
  });

  it('cites every card on the board', () => {
    for (const e of events) {
      const c = citation(e, keptOf(e));
      expect(c, e.id).toContain(e.title);
      expect(c, e.id).toContain(cardAddress(e.id));
    }
  });
});
