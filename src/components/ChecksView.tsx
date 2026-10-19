import React from 'react';
import { dayText } from '../lib/data';
import { CHECKS, VERDICTS, VERDICT_ORDER } from '../lib/checks';
import { INK, MONO, SANS, SERIF, RULE, ink, micro, shell, pageTitle } from '../lib/styles';
import { Btn, Eyebrow, Link, PageHead } from './kit';
import { VerdictMark } from './CheckView';

/* The headline checks: each widely reported line set beside the primary
   account it rests on. Newest report first, since a check is most use while the
   headline is still going round. */

function ChecksView() {
  const checks = CHECKS.slice().sort((a, b) => b.reported.date.localeCompare(a.reported.date));
  return (
    <div style={shell('route')}>
      <PageHead
        eyebrow={'Headline checks · ' + CHECKS.length + (CHECKS.length === 1 ? ' check' : ' checks') + ' · quoted on both sides'}
        title="Checked against the source."
        lede="A headline about AI is usually a report of a report: a lab's paper, a court filing, a law. Each check here sets the words that were published beside the words of the primary account, both quoted exactly, says where they part, and links to the board's cards on the same events."
        h1Style={pageTitle('index')}
      />

      <dl style={{ margin: '34px 0 0', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,220px),1fr))', gap: '14px clamp(16px,3vw,32px)' }}>
        {VERDICT_ORDER.map((v) => (
          <div key={v} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <dt><VerdictMark verdict={v} /></dt>
            <dd style={{ margin: 0, font: '400 13.5px/1.5 ' + SANS, color: ink(3), textWrap: 'pretty' }}>{VERDICTS[v].means}</dd>
          </div>
        ))}
      </dl>

      <ol style={{ listStyle: 'none', margin: '40px 0 0', padding: 0 }}>
        {checks.map((c) => (
          <li key={c.id} style={{ borderTop: RULE, padding: 'clamp(20px,3vw,28px) 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <VerdictMark verdict={c.verdict} />
              <span style={{ ...micro(5), letterSpacing: '0.12em' }}>{c.reported.publisher} · {dayText(c.reported.date)}</span>
            </div>
            <Link to={{ view: 'check', id: c.id }} className="ix-ref">
              <h2 style={{ margin: 0, font: '400 clamp(24px,3.2vw,36px)/1.08 ' + SERIF, letterSpacing: '-0.025em', textWrap: 'balance', color: INK }}>{c.title}</h2>
            </Link>
            <p style={{ margin: 0, font: '400 clamp(14.5px,1.5vw,16px)/1.6 ' + SANS, color: ink(3), maxWidth: '62ch', textWrap: 'pretty' }}>{c.short}</p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginTop: 4 }}>
              <Btn size="sm" tone="loud" to={{ view: 'check', id: c.id }}>Read the check →</Btn>
              <Eyebrow as="span" dim style={{ ...micro(5) }}>{c.claims.length} lines · {c.primary.length} primary {c.primary.length === 1 ? 'source' : 'sources'}</Eyebrow>
            </div>
          </li>
        ))}
      </ol>

      <div style={{ borderTop: RULE, marginTop: 30, paddingTop: 22, ...micro(5), letterSpacing: '0.1em', textTransform: 'none', font: '400 11.5px/1.8 ' + MONO, maxWidth: '72ch' }}>
        Every quotation in a check is verbatim, matched character for character against the page it links to on the
        date the check gives. A verdict is about the words quoted, not about the reporter or the publication.
      </div>
    </div>
  );
}

export default React.memo(ChecksView);
