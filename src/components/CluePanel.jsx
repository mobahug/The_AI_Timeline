import React from 'react';
import { stringsOf } from '../lib/data.js';
import { INK, MONO, RED, RED_LIT, SANS, FADE, PHOTO_FILTER, frame, ink, micro, sourceLink } from '../lib/styles.js';
import { Btn, CardTriple, Claim, Eyebrow, Reading } from './kit.jsx';
import EvidenceStrip from './EvidenceStrip.jsx';

/* These rows carry the actual argument, so they wrap. They used to be nowrap with
   an ellipsis, which cut every claim off mid-sentence. */
const chip = (activeRow) => ({
  display: 'block', textAlign: 'left', width: '100%', borderRadius: 2, padding: '7px 9px', cursor: 'pointer',
  border: '1px solid ' + (activeRow ? RED_LIT : 'rgba(243,240,234,0.16)'),
  background: activeRow ? 'rgba(255,80,60,0.08)' : 'transparent',
  color: activeRow ? INK : ink(3),
  font: '400 10.5px/1.45 ' + MONO, whiteSpace: 'normal', overflowWrap: 'anywhere', textWrap: 'pretty'
});

/** One end of a clue: the role word, the card's headline, and where it is cited. */
const Side = ({ event, role, accentBorder }) => (
  <div style={{ flex: '1 1 200px', minWidth: 0, borderLeft: '2px solid ' + (accentBorder || 'rgba(243,240,234,0.18)'), paddingLeft: 14 }}>
    <CardTriple event={event} size="row" as="h3" lead={<span style={micro(4)}>{role}</span>} style={{ marginBottom: 6 }} />
    {event.url
      ? <a href={event.url} target="_blank" rel="noopener" style={sourceLink}>{event.source || 'Source'} ↗</a>
      : <span style={micro(5)}>No citation — {event.confidence ? 'scenario' : 'unsourced'}</span>}
  </div>
);

export default function CluePanel({ graph, chain, step, current, focus, media, onStep, onJump, onExit, onOpenChain, onOpenCard, onOpenClue, onOpenDossier }) {
  // No outer margin or minimum height: the panel that hosts this measures it and
  // sizes itself to fit exactly, so both would only manufacture dead space —
  // and a top margin collapses outside the measured box and clips the bottom.
  const shell = { display: 'flex', flexDirection: 'column' };

  if (current) {
    const from = graph.index[current.from];
    const to = graph.index[current.to];
    // A string without a case note is argued by its two cards' summaries, read
    // in order — a substitution, not a note; the panel does not say which it is.
    const note = current.note || [from.summary, to.summary].filter(Boolean).join(' ');
    const first = step === 0;
    const last = step === chain.length - 1;
    return (
      <div style={shell}>
        <div style={{ padding: 'clamp(13px,3vw,18px) clamp(14px,3vw,22px)', display: 'flex', flexDirection: 'column', gap: 14, animation: FADE }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ ...micro(1, 'section'), color: RED_LIT }}>Clue {step + 1} / {chain.length}</span>
            <span style={{ flex: 1 }} />
            {/* The ends of the chain are marked, not hidden: a disabled button
                would drop out of the tab order and vanish for a screen reader. */}
            <Btn onClick={() => { if (!first) onStep(-1); }} aria-disabled={first} style={first ? { opacity: 0.45 } : undefined}>← Previous clue</Btn>
            <Btn tone="loud" onClick={() => { if (!last) onStep(1); }} aria-disabled={last} style={last ? { opacity: 0.45 } : undefined}>Next clue →</Btn>
            <Btn tone="dim" onClick={onExit}>Close</Btn>
          </div>

          <div style={{ display: 'flex', gap: 18, alignItems: 'stretch', flexWrap: 'wrap' }}>
            <Side event={from} role="from" />
            <div style={{ flex: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, minWidth: 150 }}>
              {/* The arrow beneath draws the direction, so the verb carries none. */}
              <Claim wrap sep="none" style={{ textAlign: 'center', maxWidth: 150 }}>{current.claim}</Claim>
              <div style={{ width: '100%', height: 2, position: 'relative', background: 'linear-gradient(90deg,transparent,' + RED + ' 20%,' + RED + ' 80%,transparent)' }}>
                <span style={{ position: 'absolute', right: -2, top: -4, width: 0, height: 0, borderLeft: '8px solid ' + RED_LIT, borderTop: '5px solid transparent', borderBottom: '5px solid transparent' }} />
              </div>
            </div>
            <Side event={to} role="to" accentBorder={RED} />
          </div>

          <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap' }}>
            <p style={{ margin: 0, flex: '1 1 300px', minWidth: 0, maxWidth: '78ch', font: '400 13.5px/1.62 ' + SANS, color: ink(3), textWrap: 'pretty' }}>{note}</p>
            <div style={{ flex: '1 1 260px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 5, maxHeight: 190, overflowY: 'auto' }}>
              <Eyebrow tier="section">The whole chain</Eyebrow>
              {chain.map((s, i) => (
                <button key={i} type="button" onClick={() => onJump(i)} style={chip(i === step)}>
                  {i + 1}. {graph.index[s.from].year} → {graph.index[s.to].year}  {s.claim}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (focus) {
    const shot = media(focus);
    const { into, outOf } = stringsOf(graph, focus.id);
    return (
      <div style={shell}>
        <div style={{ display: 'flex', flexWrap: 'wrap', width: '100%', animation: FADE }}>
          {/* A photograph earns its space; a placeholder for a missing one is a
              block of nothing, and the card on the board already says "no photo". */}
          {/* A square, always the same size: a photograph that varies in shape from
              card to card made the panel a different shape every time. */}
          {shot.img && (
            <div aria-hidden="true" style={{
              flex: 'none', width: 112, height: 112, margin: '16px 0 0 16px', ...frame(focus.future),
              backgroundSize: 'cover', backgroundPosition: 'center', backgroundImage: 'url(' + shot.img + ')',
              filter: PHOTO_FILTER
            }} />
          )}
          <div style={{ flex: '1 1 280px', minWidth: 0, padding: 'clamp(13px,3vw,18px) clamp(14px,3vw,22px)', display: 'flex', gap: 'clamp(14px,3vw,26px)', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 260px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <CardTriple event={focus} size="panel" />
              <div style={{ font: '400 13.5px/1.6 ' + SANS, color: ink(4), maxWidth: '64ch', textWrap: 'pretty' }}>{focus.summary}</div>
              <Reading event={focus} style={{ marginTop: 2 }} />
              <EvidenceStrip event={focus} media={media} compact />
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginTop: 2 }}>
                {/* The dossier is a page of its own, so this is a link with a real
                    href; the route patch is the one onOpenDossier pushes. */}
                {onOpenDossier && <Btn tone="loud" to={{ view: 'card', id: focus.id, clue: null, finding: null }}>Read the dossier →</Btn>}
                {(graph.adjacency[focus.id] || []).length > 0 &&
                  <Btn onClick={() => onOpenChain(focus.id)}>Walk the chain →</Btn>}
                {focus.url && <a href={focus.url} target="_blank" rel="noopener" style={sourceLink}>{focus.source || 'Source'} ↗</a>}
                <span style={{ flex: 1 }} />
                <Btn tone="dim" onClick={onExit}>Close</Btn>
              </div>
            </div>
            <div style={{ flex: '1 1 270px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 220, overflowY: 'auto' }}>
              {(() => {
                const group = (label, list) => list.length > 0 && (
                  <React.Fragment key={label}>
                    <Eyebrow tier="section" style={{ marginTop: 2 }}>{label}</Eyebrow>
                    {list.map((a, i) => (
                      <button
                        key={label + i}
                        type="button"
                        onClick={() => {
                          // a.out means focus caused a.id; otherwise a.id caused focus
                          const from = a.out ? focus.id : a.id;
                          const to = a.out ? a.id : focus.id;
                          if (onOpenClue) onOpenClue(from, to);
                          else if (onOpenCard) onOpenCard(a.id);
                          else onOpenChain(a.id);
                        }}
                        style={chip(false)}
                      >
                        {/* The verb precedes the card it names, so it carries no arrow. */}
                        <Claim wrap sep="none">{a.claim}</Claim>{'  '}
                        {graph.index[a.id].year} {graph.index[a.id].title}
                      </button>
                    ))}
                  </React.Fragment>
                );
                if (!into.length && !outOf.length) return <span style={micro(5)}>No strings attached to this card yet</span>;
                return <>{group('What led to this', into)}{group('What this led to', outOf)}</>;
              })()}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // The board only mounts this with a card or a clue in hand, so there is no idle state.
  return null;
}
