import React from 'react';
import { DUR, EASE } from '../../lib/styles';
import type { Edge } from '../../lib/types';

/* One string. `strong` lights it as the clue being read; `onChain` keeps it in
   the walked chain; `dim` fades everything outside the active set. */
/** A string as the board draws it: the edge, its colours, and the curve. */
export interface BoardString extends Edge { cat: string; future: boolean; tone: string; lit: string; d: string; mx: number; my: number }
export interface StringPathProps { s: BoardString; strong: boolean; onChain: boolean; dim: boolean }
export const StringPath = React.memo(function StringPath({ s, strong, onChain, dim }: StringPathProps) {
  const width = strong ? 2.6 : 1.7;
  const opacity = dim ? (strong ? 1 : onChain ? 0.6 : 0.2) : 0.92;
  return (
    <g style={{ opacity, transition: 'opacity ' + DUR.move + 'ms ' + EASE }}>
      {strong && <path d={s.d} style={{ fill: 'none', stroke: s.lit, strokeWidth: width + 7, opacity: 0.22, filter: 'blur(4px)' }} />}
      {/* Casing: invisible on the dark ground, but it is what keeps a
          string readable where it crosses a cream card. */}
      <path d={s.d} style={{ fill: 'none', stroke: '#0a0a0b', strokeWidth: width + 2.6, strokeLinecap: 'round', opacity: 0.62, strokeDasharray: s.future ? '6 7' : undefined }} />
      <path
        d={s.d}
        markerEnd={strong ? 'url(#tip-' + s.cat + ')' : undefined}
        style={{
          fill: 'none', stroke: strong ? s.lit : s.tone, strokeWidth: width, strokeLinecap: 'round',
          strokeDasharray: s.future ? '6 7' : undefined,
          transition: 'stroke-width ' + DUR.move + 'ms ' + EASE + ', stroke ' + DUR.move + 'ms ' + EASE
        }}
      />
    </g>
  );
});
