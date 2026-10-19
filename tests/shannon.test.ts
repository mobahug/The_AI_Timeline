import { describe, it, expect } from 'vitest';
import BOOK from '../src/lib/machines/book-of-the-machines.txt?raw';
import { ALPHABET, ORDERS, approximate, readBook } from '../src/lib/machines/shannon';
import { seeded } from '../src/lib/machines/menace';

/* Shannon's approximations, made by his book method: every run of letters or
   words a sample is built from must be one the book contains. */

const book = readBook(BOOK);

describe('Shannon’s series of approximations, run on the Book of the Machines', () => {
  it('reads the book in his 27-symbol alphabet, and only what is below the line', () => {
    expect(book.letters).toMatch(/^[A-Z ]+$/);
    expect(book.letters).not.toMatch(/  /);
    expect(book.letters.startsWith('CHAPTER XXIII THE BOOK OF THE MACHINES')).toBe(true);
    expect(book.letters).not.toContain('PUBLIC DOMAIN');
    expect(book.words.length).toBeGreaterThan(9000);
  });

  it('keeps Shannon’s six in his order, and adds the next stage of each', () => {
    expect(ORDERS.filter((o) => o.shannon).map((o) => o.unit + o.n)).toEqual(['letter0', 'letter1', 'letter2', 'letter3', 'word1', 'word2']);
    expect(ORDERS.filter((o) => !o.shannon).map((o) => o.unit + o.n)).toEqual(['letter4', 'word3']);
  });

  it('makes letters from the alphabet, and words from the book', () => {
    const chance = seeded(9);
    for (const o of ORDERS) {
      const s = approximate(book, o, o.unit === 'letter' ? 120 : 24, chance);
      if (o.unit === 'letter') {
        expect(s).toHaveLength(120);
        expect(s.split('').every((c) => ALPHABET.includes(c))).toBe(true);
      } else {
        const words = s.split(' ');
        expect(words).toHaveLength(24);
        const known = new Set(book.words);
        words.forEach((w) => expect(known.has(w), w).toBe(true));
      }
    }
  });

  it('takes every run it is built from out of the book, as Shannon’s method does', () => {
    const chance = seeded(10);
    for (const n of [2, 3, 4]) {
      const s = approximate(book, { unit: 'letter', n }, 200, chance);
      for (let i = 0; i + n <= s.length; i++) expect(book.letters.includes(s.slice(i, i + n)), n + ': ' + s.slice(i, i + n)).toBe(true);
    }
    const text = ' ' + book.letters + ' ';
    for (const n of [2, 3]) {
      const w = approximate(book, { unit: 'word', n }, 40, chance).split(' ');
      for (let i = 0; i + n <= w.length; i++) expect(text.includes(' ' + w.slice(i, i + n).join(' ') + ' '), n + ': ' + w.slice(i, i + n).join(' ')).toBe(true);
    }
  });

  it('gives the same sample for the same chance', () => {
    const o = { unit: 'letter' as const, n: 3 };
    expect(approximate(book, o, 80, seeded(11))).toBe(approximate(book, o, 80, seeded(11)));
  });
});
