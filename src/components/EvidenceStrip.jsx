import React from 'react';
import { sourcesOf } from '../lib/data.js';
import { bearingOn } from '../lib/wiki.js';
import { MONO, SERIF, ink } from '../lib/styles.js';
import { Eyebrow, Quote, Credit, Disclosure, Gap } from './kit.jsx';

/*
   What the cited page actually says, shown in place so a reader can check a claim
   without leaving. Four states, never blended:

     quoted   — one sentence, verbatim, that bears on this entry
     gap      — the cited page does not mention this entry; say so, and offer its
                opening anyway, collapsed
     link     — a non-Wikipedia citation with no text to show; a plain link, and
                no disclosure control, so its absence is the signal
     none     — a projection carries no citation, so nothing is rendered

   A hand-written quote on sources[] outranks an automatic match, and an
   automatic match never counts toward the entry's sourcing strength — a matcher
   must not be able to certify its own work. The Quote tone says which is which:
   'claim' is string-inked, 'auto' is not.

   Wikipedia text is CC BY-SA 4.0. The credit line under a quote (the kit's
   Credit) is the attribution that licence requires: the word Wikipedia, the
   article title linked to the article, and the licence linked. It is always
   visible and never inside the disclosure.
*/

export default function EvidenceStrip({ event, media, compact }) {
  if (!event || event.future) return null;

  const shot = media ? media(event) : null;
  const cited = shot && shot.cited;
  const handQuote = sourcesOf(event).find((s) => s.supports === 'claim' && s.quote);

  const box = {
    marginTop: compact ? 10 : 14, padding: compact ? '10px 12px' : '12px 14px', borderRadius: 3,
    background: 'rgba(243,240,234,0.035)', border: '1px solid rgba(243,240,234,0.08)'
  };

  // 1. A contributor read the source and chose the line. That outranks any match.
  if (handQuote) {
    return (
      <div style={box}>
        <Eyebrow tier="section" style={{ marginBottom: 7 }}>From the cited source</Eyebrow>
        <Quote tone="claim">{handQuote.quote}</Quote>
        <Credit cited={cited && cited.url === handQuote.url ? cited : { url: handQuote.url, title: handQuote.title, wikipedia: /wikipedia\.org/.test(handQuote.url) }} publisher={handQuote.publisher} auto={false} />
      </div>
    );
  }

  // 4. Nothing to say and nowhere to point.
  if (!cited || !cited.url) return null;

  // 3. A citation we have no text for. A plain link — and no disclosure control,
  //    so the missing chevron is itself the signal.
  if (!cited.wikipedia || !cited.extract) {
    return (
      <div style={box}>
        <div style={{ font: '400 11px/1.7 ' + MONO, color: ink(4), overflowWrap: 'anywhere' }}>
          {event.source || cited.title || 'Source'}
          {' · '}<a href={cited.url} target="_blank" rel="noopener" style={{ color: ink(3) }}>read at source ↗</a>
        </div>
      </div>
    );
  }

  const bearing = bearingOn(event, cited.extract);

  // 2. The cited page says something about this entry. Lead with that sentence.
  if (bearing.mentions) {
    return (
      <div style={box}>
        <Eyebrow tier="section" style={{ marginBottom: 7 }}>One sentence from the cited page</Eyebrow>
        <Quote tone="auto">{bearing.hits[0]}</Quote>
        <Credit cited={cited} auto />
      </div>
    );
  }

  // 2b. It does not. Say so plainly, in the site's own voice, before offering the
  //     page's opening anyway. Proximity must not be allowed to imply support.
  return (
    <div style={box}>
      <Gap title={cited.title} />
      <Disclosure>
        <p style={{ margin: '8px 0 0', font: '400 13px/1.55 ' + SERIF, color: ink(3), textWrap: 'pretty' }}>
          {cited.extract}
        </p>
      </Disclosure>
      <Credit cited={cited} auto={false} />
    </div>
  );
}
