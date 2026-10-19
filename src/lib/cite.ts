/* A card as a reader would cite it: the board as its author, the card's own
   title and year, the days it was filed and last revised (from the history, as
   its foot prints them), and its published address. The board's text is CC
   BY-NC-ND 4.0, which asks for credit; this is the credit, written out. */

import { dayText } from './data';
import { BASE, PUBLISHED } from './url';
import type { Event } from './types';

/** When a card was filed and when it last changed, as days (`YYYY-MM-DD`). */
export interface Kept { filed: string; changed: string }

type Cited = Pick<Event, 'id' | 'title' | 'year' | 'future'>;

/** A card's published address, whatever server is showing it. */
export const cardAddress = (id: string): string => PUBLISHED + BASE + 'card/' + encodeURIComponent(id) + '/';

const named = (e: Cited): string => e.title + ' (' + e.year + (e.future ? ', a scenario' : '') + ')';

/** The citation in words. */
export function citation(e: Cited, kept: Kept | null): string {
  const when = kept ? ' Filed ' + dayText(kept.filed) + (kept.changed !== kept.filed ? '; last revised ' + dayText(kept.changed) : '') + '.' : '';
  return 'The AI Timeline. “' + named(e) + '.” An investigation board of artificial intelligence.' + when + ' ' + cardAddress(e.id);
}

/** TeX's special characters, escaped; braces, which a title never needs, dropped. */
const tex = (s: string): string => s.replace(/[{}\\]/g, '').replace(/([&%$#_])/g, '\\$1');

/** The same citation as a BibTeX entry. */
export function bibtex(e: Cited, kept: Kept | null): string {
  return [
    '@misc{aitimeline-' + e.id + ',',
    '  author       = {{The AI Timeline}},',
    '  title        = {{' + tex(named(e)) + '}},',
    '  howpublished = {An investigation board of artificial intelligence},',
    ...(kept ? ['  year         = {' + kept.changed.slice(0, 4) + '},'] : []),
    '  url          = {' + cardAddress(e.id) + '},',
    '  note         = {' + (kept ? 'Card filed ' + kept.filed + (kept.changed !== kept.filed ? ', last revised ' + kept.changed : '') : 'A card on the board') + '}',
    '}'
  ].join('\n');
}
