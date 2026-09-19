import React from 'react';
import type { Event } from '../lib/types';
import { accent, catLabel, groupByEra } from '../lib/data';
import { INK, MONO, SANS, SERIF, RULE, ROW_RULE, badge, ink, shell, tag } from '../lib/styles';
import { Eyebrow, Link } from './kit';

/** The archive: everything, dense, no photographs. */
export interface IndexViewProps { items: Event[] }

export default function IndexView({ items }: IndexViewProps) {
  return (
    <div style={{ ...shell('wide'), paddingTop: 22 }}>
      <div style={{ borderTop: RULE }}>
        {groupByEra(items).map(({ era, items: chunk }) => (
          <React.Fragment key={era.year}>
            <div data-year={era.year} style={{ display: 'flex', alignItems: 'baseline', gap: 16, padding: '46px 0 14px', flexWrap: 'wrap' }}>
              <div style={{ font: '400 clamp(26px,3.4vw,40px)/1 ' + SERIF, letterSpacing: '-0.02em' }}>{era.title}</div>
              <Eyebrow tier="section" dim>{era.range}</Eyebrow>
            </div>
            {chunk.map((e) => (
              // A row is a link to the card on the board, with the filter cleared so
              // the card is certain to be there. The row wraps rather than gridding:
              // on a desk the year, the title, the summary and the chips share one
              // line; on a phone the title stacks over the summary and the chips
              // drop under. Fixed flex bases keep the columns aligned across rows.
              <Link
                key={e.id}
                to={{ view: 'board', id: e.id, category: 'all', query: '' }}
                className="ix-row"
                data-year={e.year}
                style={{
                  display: 'flex', flexWrap: 'wrap', gap: '8px 20px', alignItems: 'baseline',
                  padding: '13px 6px', borderBottom: ROW_RULE,
                  borderLeft: e.future ? '2px dashed rgba(243,240,234,0.25)' : '2px solid transparent'
                }}
              >
                <div style={{ flex: '0 0 72px', font: '400 12px/1.5 ' + MONO, color: ink(4), fontVariantNumeric: 'tabular-nums' }}>{e.year}</div>
                <div style={{ flex: '1 1 220px', minWidth: 0, display: 'flex', flexWrap: 'wrap', gap: '4px 20px', alignItems: 'baseline' }}>
                  <div style={{ flex: '1.1 1 200px', minWidth: 0, font: '400 17px/1.2 ' + SERIF, letterSpacing: '-0.015em', color: INK, textWrap: 'balance' }}>{e.title}</div>
                  <div style={{ flex: '1.5 1 260px', minWidth: 0, font: '400 12.5px/1.5 ' + SANS, color: ink(4), textWrap: 'pretty' }}>{e.summary}</div>
                </div>
                <div style={{ flex: '0 0 auto', minWidth: 180, marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 7, justifyContent: 'flex-end' }}>
                  {e.confidence && <span style={badge()}>{e.confidence}</span>}
                  <span style={tag(e.category, accent)}>{catLabel(e.category)}</span>
                </div>
              </Link>
            ))}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
