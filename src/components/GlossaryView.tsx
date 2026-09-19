import React, { useMemo } from 'react';
import { TERMS, appearancesOf } from '../lib/files';
import { INK, MONO, SANS, SERIF, RULE, ROW_RULE, ink, micro, shell } from '../lib/styles';
import { Anchor, Btn, Link, PageHead } from './kit';
import type { TermEntity } from '../lib/files';
import type { Graph } from '../lib/types';

/* The glossary, alphabetical. Each term defined in one line here and in full on
   its own page, with a count of the cards that use it. */

/** One term with the count of cards that use it. */
interface GlossaryRow { term: TermEntity; cards: number }
/** The rows under one letter. */
interface LetterGroup { letter: string; rows: GlossaryRow[] }

export interface GlossaryViewProps { graph: Graph }

function GlossaryView({ graph }: GlossaryViewProps) {
  const rows = useMemo((): GlossaryRow[] => TERMS
    .map((t) => ({ term: t, cards: appearancesOf(graph, t).length }))
    .sort((a, b) => a.term.label.localeCompare(b.term.label)), [graph]);

  // Group by first letter, so a long list has landmarks and each letter an address.
  const groups = useMemo(() => {
    const out: LetterGroup[] = [];
    rows.forEach((r) => {
      const k = r.term.label[0].toUpperCase();
      const g = out[out.length - 1];
      if (g && g.letter === k) g.rows.push(r); else out.push({ letter: k, rows: [r] });
    });
    return out;
  }, [rows]);

  return (
    <div style={shell('route')}>
      <PageHead
        eyebrow={'The glossary · ' + TERMS.length + ' terms · defined in place'}
        title="The words the board uses."
        lede="Defined here so nothing on the board needs an encyclopaedia to follow. Every term links to the cards that use it."
        h1Style={{ font: '400 clamp(30px,5vw,58px)/0.98 ' + SERIF, letterSpacing: '-0.035em' }}
      >
        <div style={{ display: 'flex', gap: 10, marginBottom: 30 }}>
          <Btn to={{ view: 'files' }}>← The files</Btn>
        </div>
      </PageHead>

      <nav aria-label="Letters" style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 30 }}>
        {groups.map((g) => (
          <Link key={g.letter} to={{ view: 'glossary', hash: 'letter-' + g.letter }} className="ix-chip" style={{ ...micro(3), padding: '6px 8px', border: '1px solid rgba(243,240,234,0.14)', borderRadius: 2 }}>{g.letter}</Link>
        ))}
      </nav>

      <div style={{ marginTop: 24, borderTop: RULE }}>
        {groups.map((g) => (
          <div key={g.letter} id={'letter-' + g.letter} style={{ scrollMarginTop: 96 }}>
            <div className="anchored" style={{ display: 'flex', alignItems: 'baseline', gap: 10, padding: '30px 0 8px' }}>
              <Anchor id={'letter-' + g.letter} label={'terms beginning with ' + g.letter} style={{ font: '400 clamp(22px,2.6vw,30px)/1 ' + SERIF, color: ink(0.38) }}>{g.letter}</Anchor>
            </div>
            {g.rows.map(({ term, cards }) => (
              <Link
                key={term.id}
                to={{ view: 'term', id: term.id }}
                className="ix-row"
                style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 16px', alignItems: 'baseline', padding: '11px 4px', borderBottom: ROW_RULE }}
              >
                <span style={{ flex: '0 1 220px', minWidth: 0, font: '400 16px/1.25 ' + SERIF, color: INK, letterSpacing: '-0.015em' }}>{term.label}</span>
                <span style={{ flex: '1 1 260px', minWidth: 0, font: '400 12.5px/1.5 ' + SANS, color: ink(4), textWrap: 'pretty' }}>{term.short}</span>
                <span style={{ flex: '0 0 auto', marginLeft: 'auto', ...micro(cards ? 4 : 5), whiteSpace: 'nowrap' }}>{cards ? cards + (cards === 1 ? ' card' : ' cards') : 'defined, unused'}</span>
              </Link>
            ))}
          </div>
        ))}
      </div>

      <div style={{ borderTop: RULE, marginTop: 44, paddingTop: 22, ...micro(5), letterSpacing: '0.1em', textTransform: 'none', font: '400 11.5px/1.8 ' + MONO, maxWidth: '72ch' }}>
        Definitions are the board's own, written for a reader with no background. Where a term is contested — hallucination, AGI — the definition says so rather than picking a side.
      </div>
    </div>
  );
}

export default React.memo(GlossaryView);
