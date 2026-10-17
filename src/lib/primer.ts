import raw from '../../data/primer.json';
import type { Idea } from './types';

/* The primer on the Start here page: the handful of ideas a reader needs to
   follow the board, each building on the one before, each in everyday words,
   pointing at the glossary entry that defines it and the cards it arrives on.
   An idea adds no claim of its own: what it says is on its cards. */

export const IDEAS: Idea[] = raw.ideas as Idea[];
