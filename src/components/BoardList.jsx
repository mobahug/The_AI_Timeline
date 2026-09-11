import React, { useEffect, useRef, useState } from 'react';
import { THREADS, accent, catLabel, fade } from '../lib/data.js';
import { INK, MONO, SANS, SERIF, micro } from '../lib/styles.js';

/*
   The board, for a screen too narrow to hold a corkboard. The six lanes become
   six sections down the page; each card is a row; each string is a line under the
   card it leaves or arrives at, tappable to open that clue. Nothing pans
   sideways. The context sheet and the chain walk are the same ones the canvas
   uses — only the rendering of the wall changes.
*/

const Claim = ({ children, tone }) => (
  <span style={{
    font: '400 9.5px/1.4 ' + MONO, letterSpacing: '0.13em', textTransform: 'uppercase',
    color: tone, whiteSpace: 'nowrap'
  }}>{children}</span>
);

export default function BoardList({ items, graph, subjectId, activeIds, onOpen, onOpenClue }) {
  const [collapsed, setCollapsed] = useState({});
  const rows = useRef({});

  // A pinned card, arrived at by tap or deep link, is scrolled into view — above
  // the sheet that describes it, since the sheet docks to the bottom.
  useEffect(() => {
    if (!subjectId) return;
    const el = rows.current[subjectId];
    if (el && el.scrollIntoView) el.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }, [subjectId]);

  const active = activeIds ? new Set(activeIds) : null;

  return (
    <div style={{ position: 'absolute', inset: 0, overflowY: 'auto', overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch', paddingBottom: 24 }}>
      {THREADS.map((thread) => {
        const cards = items.filter((e) => e.thread === thread.id).sort((a, b) => a.year - b.year);
        if (!cards.length) return null;
        const open = !collapsed[thread.id];
        return (
          <section key={thread.id} aria-label={thread.label}>
            <button
              type="button"
              aria-expanded={open}
              onClick={() => setCollapsed((c) => ({ ...c, [thread.id]: !c[thread.id] }))}
              style={{
                position: 'sticky', top: 0, zIndex: 3, width: '100%', textAlign: 'left', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 10, padding: '11px 12px', minHeight: 44,
                background: 'rgba(10,10,11,0.96)', backdropFilter: 'blur(10px)', border: 'none',
                borderBottom: '1px solid rgba(243,240,234,0.12)'
              }}
            >
              <span style={{ ...micro(0.85), letterSpacing: '0.18em' }}>{thread.label}</span>
              <span style={micro(0.34)}>{cards.length}</span>
              <span style={{ flex: 1 }} />
              <span style={{ ...micro(0.4), transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}>▾</span>
            </button>

            {open && cards.map((e) => {
              const f = fade(e.year);
              const links = (graph.adjacency[e.id] || []);
              const into = links.filter((a) => !a.out).sort((a, b) => graph.index[a.id].year - graph.index[b.id].year);
              const outOf = links.filter((a) => a.out).sort((a, b) => graph.index[a.id].year - graph.index[b.id].year);
              const lit = !active || active.has(e.id);
              const isFocus = subjectId === e.id;
              const tone = accent(e.category, f);
              return (
                <div
                  key={e.id}
                  ref={(el) => { rows.current[e.id] = el; }}
                  style={{
                    padding: '12px 12px 12px 14px', borderBottom: '1px solid rgba(243,240,234,0.07)',
                    borderLeft: '2px ' + (links.length ? 'solid ' + tone : 'dashed rgba(243,240,234,0.2)'),
                    background: isFocus ? 'rgba(243,240,234,0.05)' : 'transparent',
                    opacity: lit ? 1 : 0.42, transition: 'opacity .25s, background .25s',
                    scrollMarginTop: 48
                  }}
                >
                  <button
                    type="button"
                    onClick={() => onOpen(e.id)}
                    aria-current={isFocus}
                    style={{ display: 'block', width: '100%', textAlign: 'left', background: 'transparent', border: 'none', padding: 0, cursor: 'pointer' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 9 }}>
                      <span style={{ font: '400 11px/1 ' + MONO, color: 'rgba(243,240,234,0.45)', fontVariantNumeric: 'tabular-nums' }}>{e.year}</span>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: e.future ? 'transparent' : tone, border: '1px solid ' + tone, flex: 'none', position: 'relative', top: -1 }} />
                      <span style={{ ...micro(0.36), letterSpacing: '0.12em' }}>{e.future ? (e.confidence || 'projection') : catLabel(e.category)}</span>
                    </div>
                    <div style={{ marginTop: 5, font: '400 17px/1.22 ' + SERIF, color: INK, letterSpacing: '-0.015em', textWrap: 'balance' }}>{e.title}</div>
                    <div style={{ marginTop: 4, font: '400 12.5px/1.5 ' + SANS, color: 'rgba(243,240,234,0.5)', textWrap: 'pretty' }}>{e.summary}</div>
                  </button>

                  {(into.length > 0 || outOf.length > 0) && (
                    <div style={{ marginTop: 9, display: 'flex', flexDirection: 'column', gap: 5 }}>
                      {into.map((a, i) => (
                        <button key={'i' + i} type="button" onClick={() => onOpenClue(a.id, e.id)} style={rowBtn}>
                          <span style={{ ...micro(0.32), flex: 'none' }}>←</span>
                          <Claim tone={accent(graph.index[a.id].category, 0)}>{a.claim}</Claim>
                          <span style={rowText}>{graph.index[a.id].year} {graph.index[a.id].title}</span>
                        </button>
                      ))}
                      {outOf.map((a, i) => (
                        <button key={'o' + i} type="button" onClick={() => onOpenClue(e.id, a.id)} style={rowBtn}>
                          <span style={{ ...micro(0.32), flex: 'none' }}>→</span>
                          <Claim tone={tone}>{a.claim}</Claim>
                          <span style={rowText}>{graph.index[a.id].year} {graph.index[a.id].title}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </section>
        );
      })}
    </div>
  );
}

const rowBtn = {
  display: 'flex', alignItems: 'baseline', gap: 7, width: '100%', textAlign: 'left', minHeight: 30,
  background: 'transparent', border: 'none', padding: '3px 0', cursor: 'pointer', flexWrap: 'wrap'
};
const rowText = { font: '400 12.5px/1.4 ' + SERIF, color: 'rgba(243,240,234,0.8)', minWidth: 0, overflowWrap: 'anywhere' };
