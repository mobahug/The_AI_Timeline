import React, { useMemo, useState } from 'react';
import BOOK from '../../lib/machines/book-of-the-machines.txt?raw';
import { ORDERS, approximate, readBook } from '../../lib/machines/shannon';
import type { Order } from '../../lib/machines/shannon';
import { MONO, button, ink } from '../../lib/styles';
import { label, panel, printout } from './kit';

/* Shannon's series, run on a book: his six approximations to English in his
   order, then the next stage of each, which he left because the labour became
   enormous. Each line is drawn again on request. */

const SAYS: Record<string, string> = {
  letter0: 'Zero order: any letter or the space, all equally likely',
  letter1: 'First order: letters as often as they come in the book, each on its own',
  letter2: 'Second order: each letter chosen by the one before it',
  letter3: 'Third order: each letter chosen by the two before it',
  word1: 'First-order words: words as often as they come in the book',
  word2: 'Second-order words: each word chosen by the one before it',
  letter4: 'Fourth order: each letter chosen by the three before it',
  word3: 'Third-order words: each word chosen by the two before it'
};

const draw = (book: ReturnType<typeof readBook>, o: Order) => approximate(book, o, o.unit === 'letter' ? 110 : 22, Math.random);

export default function ShannonMachine() {
  const book = useMemo(() => readBook(BOOK), []);
  const [lines, setLines] = useState<string[]>(() => ORDERS.map((o) => draw(book, o)));
  const again = (i?: number) => setLines((ls) => ls.map((l, k) => (i === undefined || i === k ? draw(book, ORDERS[k]) : l)));

  return (
    <div style={{ ...panel, padding: 'clamp(14px,2vw,20px)' }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
        <span style={{ ...label, flex: '1 1 260px' }}>The book · Erewhon, the Book of the Machines · {book.words.length.toLocaleString('en-GB')} words · 27 symbols</span>
        <button type="button" className="ix ix-btn" data-tone="loud" onClick={() => again()} style={button('loud', 'lg')}>Open the book again</button>
      </div>
      <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {ORDERS.map((o, i) => (
          <li key={o.unit + o.n} style={{ borderTop: i === 6 ? '1px dashed rgba(243,240,234,0.28)' : i ? '1px solid rgba(243,240,234,0.08)' : 'none', padding: '12px 0', marginTop: i === 6 ? 10 : 0 }}>
            {i === 6 && <div style={{ ...label, margin: '2px 0 12px' }}>The next stage, which Shannon left undone</div>}
            <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', flexWrap: 'wrap', marginBottom: 6 }}>
              <span style={{ font: '400 12px/1 ' + MONO, color: ink(4), fontVariantNumeric: 'tabular-nums' }}>{i + 1}.</span>
              <span style={{ font: '400 12px/1.4 ' + MONO, color: ink(3), flex: '1 1 220px' }}>{SAYS[o.unit + o.n]}</span>
              <button type="button" className="ix ix-btn" onClick={() => again(i)} aria-label={'Draw line ' + (i + 1) + ' again'} style={{ ...button('dim', 'sm') }}>Again</button>
            </div>
            <p style={{ ...printout, margin: 0, overflowWrap: 'anywhere' }}>{lines[i]}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
