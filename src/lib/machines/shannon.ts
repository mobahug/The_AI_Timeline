/* Shannon's series of approximations to English, from "A Mathematical Theory
   of Communication" (1948), section 3, made the way he made them. The first two
   need only chance and the frequency of each letter. For the rest he used a
   book: "one opens a book at random and selects a letter at random on the
   page. This letter is recorded. The book is then opened to another page and
   one reads until this letter is encountered. The succeeding letter is then
   recorded", and so on, with two letters to look for in place of one for the
   third order, and with words in place of letters for the last two.

   That is what this does, page for page, on a book of its own: the chapters of
   Samuel Butler's Erewhon called the Book of the Machines. His 27-symbol
   alphabet — 26 letters and a space — is kept. He stopped at six because "the
   labor involved becomes enormous at the next stage"; a computer does not mind,
   so the next stage for letters and for words is here too. */

export interface Book { letters: string; words: string[] }

export const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ ';

/** A book as Shannon's alphabet sees it: letters and single spaces, upper case. */
export function readBook(text: string): Book {
  const at = text.indexOf('==========');
  const body = at >= 0 ? text.slice(at + 10) : text;
  const letters = body.toUpperCase().replace(/['’]/g, '').replace(/[^A-Z]+/g, ' ').trim();
  return { letters, words: letters.split(' ') };
}

export type Order = { unit: 'letter' | 'word'; n: number };

/** Shannon's six, in his order, and the next stage of each. */
export const ORDERS: (Order & { shannon: boolean })[] = [
  { unit: 'letter', n: 0, shannon: true },
  { unit: 'letter', n: 1, shannon: true },
  { unit: 'letter', n: 2, shannon: true },
  { unit: 'letter', n: 3, shannon: true },
  { unit: 'word', n: 1, shannon: true },
  { unit: 'word', n: 2, shannon: true },
  { unit: 'letter', n: 4, shannon: false },
  { unit: 'word', n: 3, shannon: false }
];

/** Open the book at a random place and read on until `context` turns up,
 *  going back to the start if the end comes first; what follows it, or null. */
function readOn<T>(seq: ArrayLike<T>, context: T[], chance: () => number): T | null {
  const len = seq.length;
  const start = Math.floor(chance() * len);
  for (let k = 0; k < len; k++) {
    const i = (start + k) % len;
    if (i + context.length >= len) continue;
    let hit = true;
    for (let j = 0; j < context.length; j++) if (seq[i + j] !== context[j]) { hit = false; break; }
    if (hit) return seq[i + context.length];
  }
  return null;
}

/** A run of `length` letters, or of `length` words, at a given order. */
export function approximate(book: Book, order: Order, length: number, chance: () => number): string {
  const n = order.n;
  if (order.unit === 'letter') {
    if (n === 0) return Array.from({ length }, () => ALPHABET[Math.floor(chance() * 27)]).join('');
    const seq = book.letters;
    const out: string[] = [];
    while (out.length < length) {
      if (out.length < n - 1 || n === 1) {
        // The first letters, and every letter at the first order, are a letter
        // picked at random on a page opened at random.
        if (n === 1) { out.push(seq[Math.floor(chance() * seq.length)]); continue; }
        const at = Math.floor(chance() * (seq.length - n));
        out.push(...seq.slice(at, at + n - 1).split(''));
        continue;
      }
      const next = readOn(seq, out.slice(out.length - (n - 1)), chance);
      if (next === null) { const at = Math.floor(chance() * (seq.length - n)); out.push(...seq.slice(at, at + n - 1).split('')); continue; }
      out.push(next);
    }
    return out.slice(0, length).join('');
  }
  const seq = book.words;
  const out: string[] = [];
  while (out.length < length) {
    if (n === 1) { out.push(seq[Math.floor(chance() * seq.length)]); continue; }
    if (out.length < n - 1) { const at = Math.floor(chance() * (seq.length - n)); out.push(...seq.slice(at, at + n - 1)); continue; }
    const next = readOn(seq, out.slice(out.length - (n - 1)), chance);
    if (next === null) { const at = Math.floor(chance() * (seq.length - n)); out.push(...seq.slice(at, at + n - 1)); continue; }
    out.push(next);
  }
  return out.slice(0, length).join(' ');
}
