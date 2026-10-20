import React from 'react';
import { PLEDGED, PLEDGED_ORDER, PLEDGES } from '../lib/pledges';
import { pledgeInFull } from '../lib/bodies/pledges';
import { dayText } from '../lib/data';
import { INK, MONO, SANS, SERIF, RULE, ink, micro, shell, pageTitle } from '../lib/styles';
import { Btn, Eyebrow, Link, PageHead, Quote } from './kit';
import { PledgeMark } from './PledgeKit';

/* Promises made: what laboratories, companies and governments said in public
   they would do about AI, each in their own words, oldest first, and set
   beside what the record shows they did. */

function PledgesView() {
  const counts = PLEDGED_ORDER.map((v) => [v, PLEDGES.filter((p) => p.verdict === v).length] as const).filter(([, n]) => n > 0);
  return (
    <div style={shell('route')}>
      <PageHead
        eyebrow={'Promises made · ' + PLEDGES.length + ' promises · in the promisers’ own words'}
        title="Promises made."
        lede="What laboratories, companies and governments said in public they would do about AI, each quoted from their own text and set beside what the record shows they did. A promise is filed here when a named organisation or person made it, its words survive where they can be quoted, and a card on the board bears on it. The verdict is about the words, not the people, and where the record reads two ways, both readings are given."
        h1Style={pageTitle('index')}
      />

      <dl style={{ margin: '34px 0 0', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,200px),1fr))', gap: '14px clamp(16px,3vw,32px)' }}>
        {counts.map(([v, n]) => (
          <div key={v} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <dt style={{ display: 'flex', gap: 10, alignItems: 'center' }}><PledgeMark verdict={v} /><span style={{ font: '400 13px/1 ' + MONO, color: ink(3), fontVariantNumeric: 'tabular-nums' }}>{n}</span></dt>
            <dd style={{ margin: 0, font: '400 13.5px/1.5 ' + SANS, color: ink(3), textWrap: 'pretty' }}>{PLEDGED[v].means}</dd>
          </div>
        ))}
      </dl>

      <ol style={{ listStyle: 'none', margin: '30px 0 0', padding: 0 }}>
        {PLEDGES.map((p) => {
          const full = pledgeInFull(p.id);
          return (
            <li key={p.id} style={{ borderTop: RULE, padding: 'clamp(20px,3vw,28px) 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <PledgeMark verdict={p.verdict} />
                <span style={{ ...micro(5), letterSpacing: '0.12em' }}>{p.who} · {dayText(p.said)}{p.by ? ' · by ' + p.by : ''}{p.settled ? ' · settled ' + p.settled.slice(0, 4) : ''}</span>
              </div>
              <Link to={{ view: 'promise', id: p.id }} className="ix-ref">
                <h2 style={{ margin: 0, font: '400 clamp(22px,3vw,32px)/1.1 ' + SERIF, letterSpacing: '-0.025em', textWrap: 'balance', color: INK }}>{p.title}</h2>
              </Link>
              {full && <Quote tone="claim">{full.words}</Quote>}
              <p style={{ margin: 0, font: '400 clamp(14.5px,1.5vw,16px)/1.6 ' + SANS, color: ink(3), maxWidth: '62ch', textWrap: 'pretty' }}>{p.short}</p>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginTop: 4 }}>
                <Btn size="sm" tone="loud" to={{ view: 'promise', id: p.id }}>Read the record →</Btn>
                <Eyebrow as="span" dim style={{ ...micro(5) }}>{full ? full.evidence.length + ' quoted on what happened · ' : ''}{p.record.length} {p.record.length === 1 ? 'card' : 'cards'}</Eyebrow>
              </div>
            </li>
          );
        })}
      </ol>

      <div style={{ borderTop: RULE, marginTop: 30, paddingTop: 22, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <Btn to={{ view: 'predictions' }}>What people predicted: Said in advance →</Btn>
      </div>

      <div style={{ marginTop: 22, ...micro(5), letterSpacing: '0.1em', textTransform: 'none', font: '400 11.5px/1.8 ' + MONO, maxWidth: '72ch' }}>
        Every quotation here is verbatim, matched character for character against the page or document it links to on
        the day each entry gives. A promise's words are the promiser's own; what happened is quoted from the promiser
        where it says so, and from others where it does not.
      </div>
    </div>
  );
}

export default React.memo(PledgesView);
