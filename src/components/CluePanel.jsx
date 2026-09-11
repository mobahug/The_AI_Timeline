import React from 'react';
import { accent, catLabel } from '../lib/data.js';
import { INK, MONO, RED, RED_LIT, SANS, SERIF, button, micro, tag } from '../lib/styles.js';

/* These rows carry the actual argument, so they wrap. They used to be nowrap with
   an ellipsis, which cut every claim off mid-sentence. */
const chip = (activeRow) => ({
  display: 'block', textAlign: 'left', width: '100%', borderRadius: 2, padding: '7px 9px', cursor: 'pointer',
  border: '1px solid ' + (activeRow ? RED_LIT : 'rgba(243,240,234,0.16)'),
  background: activeRow ? 'rgba(255,80,60,0.08)' : 'transparent',
  color: activeRow ? INK : 'rgba(243,240,234,0.75)',
  font: '400 10.5px/1.45 ' + MONO, whiteSpace: 'normal', overflowWrap: 'anywhere', textWrap: 'pretty'
});

const Side = ({ event, role, accentBorder }) => (
  <div style={{ flex: '1 1 200px', minWidth: 0, borderLeft: '2px solid ' + (accentBorder || 'rgba(243,240,234,0.18)'), paddingLeft: 14 }}>
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 9, flexWrap: 'wrap', marginBottom: 6 }}>
      <span style={{ font: '400 24px/1 ' + SERIF, fontVariantNumeric: 'tabular-nums' }}>{event.year}</span>
      <span style={tag(event.category, accent)}>{role}</span>
      {event.confidence && <span style={{ ...micro(0.5), border: '1px dashed rgba(243,240,234,0.3)', padding: '4px 7px' }}>Projection · {event.confidence}</span>}
    </div>
    <div style={{ font: '400 17px/1.2 ' + SERIF, letterSpacing: '-0.018em', marginBottom: 6 }}>{event.title}</div>
    {event.url
      ? <a href={event.url} target="_blank" rel="noopener" style={{ ...micro(1), letterSpacing: '0.12em' }}>{event.source || 'Source'} ↗</a>
      : <span style={micro(0.34)}>No citation — {event.confidence ? 'projection' : 'unsourced'}</span>}
  </div>
);

export default function CluePanel({ graph, chain, step, current, focus, media, onStep, onJump, onExit, onOpenChain, onOpenCard }) {
  const shell = {
    marginTop: 12, border: '1px solid rgba(243,240,234,0.14)', borderRadius: 3, background: '#101013',
    minHeight: 206, display: 'flex', flexDirection: 'column'
  };

  if (current) {
    const from = graph.index[current.from];
    const to = graph.index[current.to];
    const note = current.note || [from.summary, to.summary].filter(Boolean).join(' ');
    return (
      <div style={shell}>
        <div style={{ padding: 'clamp(13px,3vw,18px) clamp(14px,3vw,22px)', display: 'flex', flexDirection: 'column', gap: 14, animation: 'fadeIn .25s both' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ ...micro(1), color: RED_LIT, letterSpacing: '0.22em' }}>Clue {step + 1} / {chain.length}</span>
            <span style={{ flex: 1 }} />
            <button onClick={() => onStep(-1)} style={button()}>← Back</button>
            <button onClick={() => onStep(1)} style={button('loud')}>Follow the string →</button>
            <button onClick={onExit} style={{ ...button(), color: 'rgba(243,240,234,0.5)' }}>Close</button>
          </div>

          <div style={{ display: 'flex', gap: 18, alignItems: 'stretch', flexWrap: 'wrap' }}>
            <Side event={from} role="from" />
            <div style={{ flex: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, minWidth: 150 }}>
              <div style={{ ...micro(1), color: 'oklch(0.78 0.16 25)', textAlign: 'center', maxWidth: 150, lineHeight: 1.3 }}>{current.claim}</div>
              <div style={{ width: '100%', height: 2, position: 'relative', background: 'linear-gradient(90deg,transparent,' + RED + ' 20%,' + RED + ' 80%,transparent)' }}>
                <span style={{ position: 'absolute', right: -2, top: -4, width: 0, height: 0, borderLeft: '8px solid ' + RED_LIT, borderTop: '5px solid transparent', borderBottom: '5px solid transparent' }} />
              </div>
            </div>
            <Side event={to} role="to" accentBorder={RED} />
          </div>

          <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap' }}>
            <p style={{ margin: 0, flex: '1 1 300px', minWidth: 0, maxWidth: '78ch', font: '400 13.5px/1.62 ' + SANS, color: 'rgba(243,240,234,0.68)', textWrap: 'pretty' }}>{note}</p>
            <div style={{ flex: '1 1 260px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 5, maxHeight: 190, overflowY: 'auto' }}>
              <div style={micro(0.34)}>The whole thread</div>
              {chain.map((s, i) => (
                <button key={i} onClick={() => onJump(i)} style={chip(i === step)}>
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
    return (
      <div style={shell}>
        <div style={{ display: 'flex', flexWrap: 'wrap', width: '100%', animation: 'fadeIn .25s both' }}>
          <div style={{
            flex: '1 1 186px', minWidth: 0, maxWidth: 260, minHeight: 104, alignSelf: 'stretch', border: '1px solid rgba(243,240,234,0.12)', borderRadius: 2,
            backgroundColor: '#0e0e11', backgroundSize: shot.img ? 'cover' : undefined, backgroundPosition: 'center',
            backgroundImage: shot.img ? 'url(' + shot.img + ')' : 'repeating-linear-gradient(135deg,rgba(243,240,234,0.06) 0 6px,transparent 6px 12px)'
          }} />
          <div style={{ flex: '1 1 280px', minWidth: 0, padding: 'clamp(13px,3vw,18px) clamp(14px,3vw,22px)', display: 'flex', gap: 'clamp(14px,3vw,26px)', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 260px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ font: '400 30px/1 ' + SERIF, letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums' }}>{focus.year}</span>
                <span style={tag(focus.category, accent)}>{catLabel(focus.category)}</span>
                {focus.confidence && <span style={{ ...micro(0.5), border: '1px dashed rgba(243,240,234,0.3)', padding: '4px 7px' }}>{focus.confidence}</span>}
              </div>
              <div style={{ font: '400 23px/1.14 ' + SERIF, letterSpacing: '-0.022em', textWrap: 'balance' }}>{focus.title}</div>
              <div style={{ font: '400 13.5px/1.6 ' + SANS, color: 'rgba(243,240,234,0.62)', maxWidth: '64ch', textWrap: 'pretty' }}>{focus.summary}</div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginTop: 2 }}>
                {(graph.adjacency[focus.id] || []).length > 0 &&
                  <button onClick={() => onOpenChain(focus.id)} style={button('loud')}>Follow the strings →</button>}
                {focus.url && <a href={focus.url} target="_blank" rel="noopener" style={{ ...micro(1), letterSpacing: '0.14em' }}>{focus.source || 'Source'} ↗</a>}
                <span style={{ flex: 1 }} />
                <button onClick={onExit} style={{ ...button(), color: 'rgba(243,240,234,0.6)' }}>Close</button>
              </div>
            </div>
            <div style={{ flex: '1 1 270px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 220, overflowY: 'auto' }}>
              {(() => {
                const links = graph.adjacency[focus.id] || [];
                const byYear = (a, b) => graph.index[a.id].year - graph.index[b.id].year;
                const into = links.filter((a) => !a.out).sort(byYear);
                const outOf = links.filter((a) => a.out).sort(byYear);
                const group = (label, list) => list.length > 0 && (
                  <React.Fragment key={label}>
                    <div style={{ ...micro(0.36), marginTop: 2 }}>{label}</div>
                    {list.map((a, i) => (
                      <button key={label + i} onClick={() => (onOpenCard ? onOpenCard(a.id) : onOpenChain(a.id))} style={chip(false)}>
                        <span style={{ color: 'oklch(0.78 0.16 25)' }}>{a.claim}</span>{'  '}
                        {graph.index[a.id].year} {graph.index[a.id].title}
                      </button>
                    ))}
                  </React.Fragment>
                );
                if (!links.length) return <div style={micro(0.34)}>No strings attached to this card yet</div>;
                return <>{group('What led to this', into)}{group('What this led to', outOf)}</>;
              })()}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={shell}>
      <div style={{ padding: '26px 28px', display: 'flex', flexDirection: 'column', gap: 12, justifyContent: 'center' }}>
        <div style={{ font: '400 21px/1.25 ' + SERIF, color: 'rgba(243,240,234,0.8)', maxWidth: '52ch' }}>
          Hover a card to light its strings. Click one to walk the case — clue by clue, in order.
        </div>
        <div style={{ font: '400 11px/1.8 ' + MONO, letterSpacing: '0.06em', color: 'rgba(243,240,234,0.38)', maxWidth: '78ch', textWrap: 'pretty' }}>
          Every string is a claim that the earlier card made the later one possible. The paper tag is the
          claim; the case note is the reasoning, with both sources linked. Manila cards past 2026 are
          projections and carry a confidence, never a citation. Drag to pan · scroll to move sideways ·
          Tab to step through cards · arrow keys to follow a chain.
        </div>
      </div>
    </div>
  );
}
