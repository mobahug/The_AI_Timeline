import React, { useState } from 'react';
import { sourcesOf } from '../lib/data.js';
import { bearingOn } from '../lib/wiki.js';
import { MONO, SANS, SERIF, micro } from '../lib/styles.js';

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
   must not be able to certify its own work.

   Wikipedia text is CC BY-SA 4.0. The credit line under a quote is the
   attribution that licence requires: the word Wikipedia, the article title linked
   to the article, and the licence linked. It is always visible and never inside
   the disclosure.
*/

const CC = 'https://creativecommons.org/licenses/by-sa/4.0/';

const Eyebrow = ({ children, dim }) => (
  <div style={{ ...micro(dim ? 0.3 : 0.42), letterSpacing: '0.2em', marginBottom: 7 }}>{children}</div>
);

const Credit = ({ cited, publisher, auto }) => (
  <div style={{ font: '400 10px/1.7 ' + MONO, color: 'rgba(243,240,234,0.36)', letterSpacing: '0.04em', marginTop: 7, overflowWrap: 'anywhere' }}>
    {cited && cited.wikipedia ? (
      <>
        Wikipedia, <a href={cited.url} target="_blank" rel="noopener" style={{ color: 'rgba(243,240,234,0.55)' }}><em>{cited.title}</em></a>
        {' · '}<a href={CC} target="_blank" rel="noopener" style={{ color: 'rgba(243,240,234,0.55)' }}>CC BY-SA 4.0</a>
        {auto ? ' · matched automatically' : ''}
      </>
    ) : (
      <>{publisher || 'Source'}{cited && cited.url ? <> · <a href={cited.url} target="_blank" rel="noopener" style={{ color: 'rgba(243,240,234,0.55)' }}>read at source ↗</a></> : null}</>
    )}
  </div>
);

const Quote = ({ children }) => (
  <blockquote style={{
    margin: 0, font: '400 14px/1.55 ' + SANS, color: 'rgba(243,240,234,0.86)', textWrap: 'pretty',
    paddingLeft: 12, borderLeft: '2px solid rgba(243,240,234,0.22)'
  }}>
    <span style={{ color: 'oklch(0.78 0.16 25)' }}>“</span>{children}<span style={{ color: 'oklch(0.78 0.16 25)' }}>”</span>
  </blockquote>
);

export default function EvidenceStrip({ event, media, compact }) {
  const [open, setOpen] = useState(false);
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
        <Eyebrow>From the cited source</Eyebrow>
        <Quote>{handQuote.quote}</Quote>
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
        <div style={{ font: '400 11px/1.7 ' + MONO, color: 'rgba(243,240,234,0.5)', overflowWrap: 'anywhere' }}>
          {event.source || cited.title || 'Source'}
          {' · '}<a href={cited.url} target="_blank" rel="noopener" style={{ color: 'rgba(243,240,234,0.7)' }}>read at source ↗</a>
        </div>
      </div>
    );
  }

  const bearing = bearingOn(event, cited.extract);

  // 2. The cited page says something about this entry. Lead with that sentence.
  if (bearing.mentions) {
    return (
      <div style={box}>
        <Eyebrow>One sentence from the cited page</Eyebrow>
        <Quote>{bearing.hits[0]}</Quote>
        <Credit cited={cited} auto />
      </div>
    );
  }

  // 2b. It does not. Say so plainly, in the site's own voice, before offering the
  //     page's opening anyway. Proximity must not be allowed to imply support.
  return (
    <div style={box}>
      <Eyebrow dim>Not on the cited page</Eyebrow>
      <p style={{ margin: 0, font: '400 12.5px/1.55 ' + SANS, color: 'rgba(243,240,234,0.55)', textWrap: 'pretty' }}>
        No sentence in <em>{cited.title}</em> names this entry or its year. The page is cited for
        background, not as evidence for the claim.
      </p>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        style={{ ...micro(0.5), background: 'transparent', border: 'none', padding: '8px 0 0', cursor: 'pointer', letterSpacing: '0.16em' }}
      >
        {open ? 'Hide the article’s opening ▴' : 'Read the article’s opening ▾'}
      </button>
      {open && (
        <p style={{ margin: '8px 0 0', font: '400 13px/1.55 ' + SERIF, color: 'rgba(243,240,234,0.6)', textWrap: 'pretty' }}>
          {cited.extract}
        </p>
      )}
      <Credit cited={cited} auto />
    </div>
  );
}
