import React from 'react';
import { events, links } from '../lib/data.js';
import { INK, MONO, SERIF, RED, button, micro } from '../lib/styles.js';

const notes = links.filter((l) => l.note).length;

export default function Landing({ navigate }) {
  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 32px' }}>
      <header style={{ padding: '112px 0 72px' }}>
        <div style={{ ...micro(0.42), letterSpacing: '0.26em', marginBottom: 30 }}>
          {events.length} entries · {links.length} strings · {notes} case notes
        </div>
        <h1 style={{ margin: '0 0 28px', font: '400 clamp(48px,10vw,150px)/0.9 ' + SERIF, letterSpacing: '-0.035em', maxWidth: '15ch', textWrap: 'balance' }}>
          Everything that led here, <em style={{ color: 'oklch(0.82 0.13 85)' }}>and what comes next.</em>
        </h1>
        <div style={{ display: 'flex', gap: 44, flexWrap: 'wrap', maxWidth: 940 }}>
          <p style={{ margin: 0, font: '400 16px/1.62 ' + "'Helvetica Neue', Helvetica, Arial, sans-serif", color: 'rgba(243,240,234,0.66)', maxWidth: '46ch', textWrap: 'pretty' }}>
            Breakthroughs, boardroom coups, lawsuits, breaches and fiction — pinned to a wall
            with the strings between them. Every string is a claim that one event made another
            possible, and most of them carry a written case note.
          </p>
          <p style={{ margin: 0, font: '400 11.5px/1.85 ' + MONO, color: 'rgba(243,240,234,0.4)', maxWidth: '34ch', textWrap: 'pretty' }}>
            Six threads run at once: ideas, products, power, failures, rules, culture.
            Everything past 2026 is a projection on manila stock — it carries a confidence,
            never a citation.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 12, marginTop: 40, flexWrap: 'wrap' }}>
          <button onClick={() => navigate({ view: 'board' })} style={{ ...button('loud'), padding: '13px 20px', borderColor: RED }}>
            Open the board →
          </button>
          <button onClick={() => navigate({ view: 'plates' })} style={{ ...button(), padding: '13px 20px' }}>
            Read it as a timeline
          </button>
          <button onClick={() => navigate({ view: 'about' })} style={{ ...button(), padding: '13px 20px', color: 'rgba(243,240,234,0.5)' }}>
            How it works
          </button>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 24, paddingBottom: 90, borderTop: '1px solid rgba(243,240,234,0.12)', paddingTop: 30 }}>
        {[
          ['The board', 'Photo cards, red string, and a walkthrough that follows a chain clue by clue.'],
          ['The argument', 'Not a list of dates. Each string states what one event did to another.'],
          ['The projections', 'Twenty-one entries past 2026, labelled Likely, Uncertain or Speculative.'],
          ['Yours to edit', 'Add cards and strings locally, export the patch, open a pull request.']
        ].map(([title, body]) => (
          <div key={title}>
            <div style={{ font: '400 21px/1.2 ' + SERIF, letterSpacing: '-0.02em', color: INK, marginBottom: 9 }}>{title}</div>
            <div style={{ font: '400 13.5px/1.6 ' + "'Helvetica Neue', Helvetica, Arial, sans-serif", color: 'rgba(243,240,234,0.55)', textWrap: 'pretty' }}>{body}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
