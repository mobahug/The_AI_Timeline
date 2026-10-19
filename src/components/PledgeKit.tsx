import React from 'react';
import FILE from '../../data/promises.json';
import type { Pledge, PledgeVerdict } from '../lib/types';
import { PLEDGED } from '../lib/pledges';
import { CYAN, GOLD, RED_LIT, SERIF, ink, micro } from '../lib/styles';

/* What the two promise pages share: the whole file, which only they read (the
   rest of the site lists a promise from its head, lib/pledges.ts), and the
   verdict as a stamp. */

const WHOLE: Record<string, Pledge> = Object.fromEntries((FILE.promises as Pledge[]).map((p) => [p.id, p]));

/** A promise with its words, its reading and its sources. */
export const pledgeInFull = (id: string): Pledge | null => WHOLE[id] || null;

/** A verdict's ink: kept in cyan, kept in part and disputed in gold, broken and
 *  rewritten in the string's red, still open dimmed. */
export const pledgeInk = (v: PledgeVerdict): string =>
  v === 'kept' ? CYAN : v === 'partly' || v === 'disputed' ? GOLD : v === 'broken' || v === 'dropped' ? RED_LIT : ink(4);

export const PledgeMark = ({ verdict, size = 'sm' }: { verdict: PledgeVerdict; size?: 'sm' | 'lg' }) => (
  <span style={size === 'lg'
    ? { font: '400 clamp(28px,4vw,44px)/1 ' + SERIF, letterSpacing: '-0.025em', color: pledgeInk(verdict) }
    : { ...micro(1), color: pledgeInk(verdict), border: '1px ' + (verdict === 'open' ? 'dashed' : 'solid') + ' currentColor', borderRadius: 2, padding: '3px 7px', letterSpacing: '0.14em', whiteSpace: 'nowrap' }}>
    {PLEDGED[verdict].label}
  </span>
);
