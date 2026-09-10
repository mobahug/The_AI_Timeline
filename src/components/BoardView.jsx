import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { THREADS, TICKS, NOW, accent, buildChain, catLabel, catHue, fade, yearFraction, yearAtFraction } from '../lib/data.js';
import { INK, MANILA, MONO, PAPER, RED, RED_LIT, CYAN, micro } from '../lib/styles.js';
import CluePanel from './CluePanel.jsx';
import EditorBar from './EditorBar.jsx';

const CARD_W = 210;
const CARD_H = 158;
const LANE_H = 216;
const TOP = 74;
const PAD = 240;
const GAP = CARD_W + 34;

/** Lay the cards out: one row per thread, chronological, never overlapping. */
function layout(items, width) {
  const boardWidth = Math.max(6400, Math.round(width * 8));
  const xOf = (year) => PAD + yearFraction(year) * (boardWidth - PAD * 2);
  const nodes = [];
  THREADS.forEach((thread, row) => {
    let lastX = -Infinity;
    items
      .filter((e) => e.thread === thread.id)
      .map((e) => ({ event: e, x: xOf(e.year) }))
      .sort((a, b) => a.x - b.x)
      .forEach((slot) => {
        const gap = slot.event.featured ? GAP + 38 : GAP;
        const x = Math.max(slot.x, lastX + gap);
        lastX = x;
        nodes.push({
          event: slot.event,
          x,
          y: TOP + row * LANE_H + LANE_H / 2,
          tilt: (((slot.event.id.length * 37) % 5) - 2) * 0.7
        });
      });
  });
  return {
    nodes,
    xOf,
    width: boardWidth,
    height: TOP + THREADS.length * LANE_H + 40
  };
}

/** Strings sag, like string does. */
function stringPath(a, b) {
  const sag = 30 + Math.min(90, Math.abs(b.x - a.x) * 0.05);
  const cx = (a.x + b.x) / 2;
  const cy = (a.y + b.y) / 2 + sag;
  return {
    d: 'M' + a.x.toFixed(1) + ' ' + a.y.toFixed(1) + ' Q' + cx.toFixed(1) + ' ' + cy.toFixed(1) + ',' + b.x.toFixed(1) + ' ' + b.y.toFixed(1),
    mx: (a.x + 2 * cx + b.x) / 4,
    my: (a.y + 2 * cy + b.y) / 4
  };
}

export default function BoardView({ items, graph, media, route, navigate, board, onYear }) {
  const scroller = useRef(null);
  const dragged = useRef(false);
  const [width, setWidth] = useState(1280);
  const [hover, setHover] = useState(null);
  const [chain, setChain] = useState(null);
  const [step, setStep] = useState(0);
  const [viewport, setViewport] = useState([1900, 1950]);
  const [thumb, setThumb] = useState({ left: 0, width: 0.2 });
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(null);
  const [connectFrom, setConnectFrom] = useState(null);

  useEffect(() => {
    const el = scroller.current;
    if (!el || !window.ResizeObserver) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth || 1280));
    ro.observe(el);
    setWidth(el.clientWidth || 1280);
    return () => ro.disconnect();
  }, []);

  const board3 = useMemo(() => layout(items, width), [items, width]);
  const positions = useMemo(() => Object.fromEntries(board3.nodes.map((n) => [n.event.id, n])), [board3]);

  const strings = useMemo(() => graph.edges
    .filter((l) => positions[l.from] && positions[l.to])
    .map((l) => ({ ...l, ...stringPath(positions[l.from], positions[l.to]) })), [graph.edges, positions]);

  const current = chain && chain.length ? chain[Math.min(step, chain.length - 1)] : null;
  const chainIds = chain ? [...new Set(chain.flatMap((s) => [s.from, s.to]))] : null;
  const focusId = chain ? null : hover;
  const active = chain ? chainIds : (focusId ? [focusId, ...(graph.adjacency[focusId] || []).map((a) => a.id)] : null);

  const centre = useCallback((stepData) => {
    const el = scroller.current;
    if (!el || !stepData) return;
    const a = positions[stepData.from];
    const b = positions[stepData.to];
    if (!a || !b) return;
    el.scrollTo({ left: Math.max(0, (a.x + b.x) / 2 - el.clientWidth / 2), behavior: 'smooth' });
    if (el.scrollHeight > el.clientHeight) el.scrollTop = Math.max(0, (a.y + b.y) / 2 - el.clientHeight / 2);
  }, [positions]);

  const openChain = useCallback((id, atStep) => {
    const built = buildChain(graph, id);
    if (!built.steps.length) { setChain(null); setHover(id); navigate({ id, clue: null }, true); return; }
    const index = typeof atStep === 'number' ? atStep : built.start;
    setChain(built.steps);
    setStep(index);
    setHover(null);
    navigate({ clue: { from: built.steps[index].from, to: built.steps[index].to }, id: null }, true);
    requestAnimationFrame(() => centre(built.steps[index]));
  }, [graph, navigate, centre]);

  // Deep links: ?id=… opens a card, ?clue=a>b opens the walkthrough at that string.
  const applied = useRef('');
  useEffect(() => {
    const key = route.clue ? route.clue.from + '>' + route.clue.to : route.id || '';
    if (!key || key === applied.current || !board3.nodes.length) return;
    applied.current = key;
    if (route.clue) {
      const built = buildChain(graph, route.clue.to);
      const index = built.steps.findIndex((s) => s.from === route.clue.from && s.to === route.clue.to);
      if (index >= 0) { setChain(built.steps); setStep(index); requestAnimationFrame(() => centre(built.steps[index])); return; }
    }
    if (route.id && positions[route.id]) {
      setHover(route.id);
      const el = scroller.current;
      if (el) el.scrollTo({ left: Math.max(0, positions[route.id].x - el.clientWidth / 2), behavior: 'smooth' });
    }
  }, [route.id, route.clue, graph, positions, board3.nodes.length, centre]);

  const move = useCallback((delta) => {
    if (!chain) return;
    const next = Math.min(chain.length - 1, Math.max(0, step + delta));
    setStep(next);
    navigate({ clue: { from: chain[next].from, to: chain[next].to } }, true);
    centre(chain[next]);
  }, [chain, step, navigate, centre]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') { setChain(null); setDraft(null); setConnectFrom(null); }
      if (chain && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) { e.preventDefault(); move(e.key === 'ArrowRight' ? 1 : -1); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [chain, move]);

  const onScroll = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    const fr = (x) => Math.min(1, Math.max(0, (x - PAD) / (board3.width - PAD * 2)));
    setViewport([yearAtFraction(fr(el.scrollLeft)), yearAtFraction(fr(el.scrollLeft + el.clientWidth))]);
    setThumb({ left: el.scrollLeft / el.scrollWidth, width: el.clientWidth / el.scrollWidth });
    if (onYear) onYear(String(yearAtFraction(fr(el.scrollLeft + Math.min(el.clientWidth * 0.4, 380)))), max > 0 ? el.scrollLeft / max : 0);
  }, [board3.width, onYear]);

  const onPointerDown = (e) => {
    if (e.button !== 0) return;
    const el = scroller.current;
    if (!el) return;
    const startX = e.clientX;
    const startLeft = el.scrollLeft;
    dragged.current = false;
    const onMove = (ev) => {
      const dx = ev.clientX - startX;
      if (Math.abs(dx) > 4) dragged.current = true;
      el.scrollLeft = startLeft - dx;
      onScroll();
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      setTimeout(() => { dragged.current = false; }, 40);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const onWheel = (e) => {
    const el = scroller.current;
    if (!el) return;
    const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    const max = el.scrollWidth - el.clientWidth;
    if ((delta < 0 && el.scrollLeft > 0) || (delta > 0 && el.scrollLeft < max)) {
      e.preventDefault();
      el.scrollLeft = Math.min(max, Math.max(0, el.scrollLeft + delta));
      onScroll();
    }
  };

  const onScrub = (e) => {
    const track = e.currentTarget;
    const pan = (ev) => {
      const rect = track.getBoundingClientRect();
      const el = scroller.current;
      if (!el) return;
      el.scrollLeft = Math.max(0, ((ev.clientX - rect.left) / rect.width) * el.scrollWidth - el.clientWidth / 2);
      onScroll();
    };
    pan(e);
    const up = () => { window.removeEventListener('pointermove', pan); window.removeEventListener('pointerup', up); };
    window.addEventListener('pointermove', pan);
    window.addEventListener('pointerup', up);
  };

  const clickCard = (event) => {
    if (dragged.current) return;
    if (editing) { setDraft({ ...event, note: event.summary, isNew: false }); return; }
    if (connectFrom) {
      if (connectFrom === event.id) { setConnectFrom(null); return; }
      const claim = window.prompt('What does this string claim? e.g. “provoked”, “funded”, “was the warning for”', 'led to');
      if (claim === null) { setConnectFrom(null); return; }
      const note = window.prompt('Case note (optional): explain the causal argument.', '') || '';
      board.addString({ from: connectFrom, to: event.id, claim: claim || 'led to', note });
      setConnectFrom(null);
      return;
    }
    openChain(event.id);
  };

  const hint = chain
    ? 'Walking the case · clue ' + (step + 1) + ' of ' + chain.length
    : focusId
      ? 'Card selected · ' + ((graph.adjacency[focusId] || []).length) + ' strings attached'
      : graph.edges.length + ' strings · click a card to walk the case';

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', padding: '22px 32px 70px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, flexWrap: 'wrap', marginBottom: 12 }}>
        <h1 style={{ margin: 0, font: '400 clamp(24px,3vw,34px)/1.2 ' + "'Instrument Serif', Georgia, serif", letterSpacing: '-0.025em', whiteSpace: 'nowrap' }}>The board</h1>
        <span style={micro(0.42)}>{hint}</span>
      </div>

      <EditorBar
        editing={editing}
        onToggle={() => { setEditing((v) => !v); setDraft(null); setConnectFrom(null); setChain(null); }}
        onNewCard={() => { setEditing(true); setDraft({ id: null, year: NOW + 1, category: 'research', title: '', note: '', isNew: true }); }}
        onConnect={() => setConnectFrom(draft ? draft.id : focusId)}
        connecting={!!connectFrom}
        board={board}
        draft={draft}
        setDraft={setDraft}
      />

      <div style={{ position: 'relative' }}>
        <div
          ref={scroller}
          onScroll={onScroll}
          onPointerDown={onPointerDown}
          onWheel={onWheel}
          style={{
            position: 'relative', overflowX: 'auto', overflowY: 'auto', maxHeight: 'min(72vh,760px)',
            border: '1px solid rgba(243,240,234,0.12)', borderRadius: 3, cursor: 'grab', touchAction: 'pan-y',
            background: 'radial-gradient(120% 90% at 20% 0%,#171310,#08080a 70%)'
          }}
        >
          <div style={{ position: 'relative', width: board3.width, height: board3.height, minWidth: '100%' }}>
            {THREADS.map((thread, i) => (
              <div key={thread.id} style={{
                position: 'absolute', left: 0, top: TOP + i * LANE_H, width: board3.width, height: LANE_H,
                borderTop: '1px solid rgba(243,240,234,0.07)',
                background: i % 2 ? 'rgba(243,240,234,0.012)' : 'transparent'
              }} />
            ))}

            {THREADS.map((thread, i) => (
              <div key={'label-' + thread.id} style={{
                position: 'absolute', left: 26, top: TOP + i * LANE_H + 16, zIndex: 6, width: 146,
                padding: '7px 9px', background: '#ddd6c4', color: '#17161a', transform: 'rotate(-1.2deg)',
                boxShadow: '0 6px 14px rgba(0,0,0,0.5)',
                font: '500 9.5px/1.4 ' + MONO, letterSpacing: '0.16em', textTransform: 'uppercase'
              }}>{thread.label}</div>
            ))}

            {TICKS.map((year) => (
              <div key={year}>
                <div style={{
                  position: 'absolute', left: board3.xOf(year), top: 62, width: 1, height: board3.height - 100,
                  background: year > NOW
                    ? 'repeating-linear-gradient(180deg,rgba(243,240,234,0.14) 0 3px,transparent 3px 8px)'
                    : 'rgba(243,240,234,0.07)'
                }} />
                <div style={{ position: 'absolute', left: board3.xOf(year) + 7, top: 38, ...micro(0.36), letterSpacing: '0.1em', fontVariantNumeric: 'tabular-nums' }}>{year}</div>
              </div>
            ))}

            <div style={{
              position: 'absolute', left: board3.xOf(NOW), top: 62, width: Math.max(0, board3.width - board3.xOf(NOW)),
              height: board3.height - 100, borderLeft: '1px dashed rgba(243,240,234,0.35)',
              background: 'linear-gradient(90deg,rgba(243,240,234,0.035),transparent 60%)', pointerEvents: 'none'
            }} />

            <svg style={{ position: 'absolute', inset: 0, width: board3.width, height: board3.height, overflow: 'visible', pointerEvents: 'none', zIndex: 1 }}>
              <defs>
                <marker id="tip" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">
                  <path d="M0 0 L8 4 L0 8 z" style={{ fill: RED_LIT }} />
                </marker>
              </defs>
              {strings.map((s) => {
                const onChain = chain ? (chainIds.includes(s.from) && chainIds.includes(s.to)) : (active && (s.from === focusId || s.to === focusId));
                const isStep = current && ((current.from === s.from && current.to === s.to) || (current.from === s.to && current.to === s.from));
                const strong = isStep || (!chain && onChain);
                return (
                  <g key={s.id}>
                    {strong && <path d={s.d} style={{ fill: 'none', stroke: RED_LIT, strokeWidth: 9, opacity: 0.22, filter: 'blur(4px)' }} />}
                    <path
                      d={s.d}
                      markerEnd={strong ? 'url(#tip)' : undefined}
                      style={{
                        fill: 'none', stroke: strong ? RED_LIT : RED, strokeWidth: strong ? 2.4 : 1.4, strokeLinecap: 'round',
                        strokeDasharray: s.future ? '6 7' : undefined,
                        opacity: active ? (strong ? 1 : onChain ? 0.45 : 0.07) : 0.5,
                        transition: 'opacity .3s, stroke-width .3s, stroke .3s'
                      }}
                    />
                  </g>
                );
              })}
            </svg>

            {strings.filter((s) => current
              ? (current.from === s.from && current.to === s.to) || (current.from === s.to && current.to === s.from)
              : active && (s.from === focusId || s.to === focusId)
            ).map((s) => (
              <div key={'tag-' + s.id} style={{
                position: 'absolute', left: s.mx, top: s.my, transform: 'translate(-50%,-50%) rotate(-1.6deg)',
                zIndex: 8, pointerEvents: 'none', background: '#efe9da', color: '#17161a',
                border: '1px solid rgba(23,22,26,0.3)', boxShadow: '0 6px 14px rgba(0,0,0,0.5)', padding: '5px 8px',
                font: '400 9.5px/1 ' + MONO, letterSpacing: '0.14em', textTransform: 'uppercase', whiteSpace: 'nowrap',
                animation: 'fadeIn .25s both'
              }}>{s.claim}</div>
            ))}

            {board3.nodes.map((node) => {
              const e = node.event;
              const f = fade(e.year);
              const lit = !active || active.includes(e.id);
              const inStep = current && (current.from === e.id || current.to === e.id);
              const subject = current ? current.to === e.id : focusId === e.id;
              const shot = media(e);
              return (
                <button
                  key={e.id}
                  type="button"
                  aria-label={e.year + ', ' + catLabel(e.category) + ', ' + e.title}
                  onClick={() => clickCard(e)}
                  onFocus={() => !chain && setHover(e.id)}
                  onBlur={() => !chain && setHover(null)}
                  onMouseEnter={() => !chain && setHover(e.id)}
                  onMouseLeave={() => !chain && setHover(null)}
                  style={{
                    position: 'absolute', left: node.x - CARD_W / 2, top: node.y - CARD_H / 2, width: CARD_W,
                    padding: 0, border: 'none', background: 'transparent', textAlign: 'left',
                    cursor: editing ? 'text' : 'pointer',
                    transform: 'rotate(' + node.tilt + 'deg) scale(' + (inStep || focusId === e.id ? 1.04 : 1) + ')',
                    transformOrigin: '50% 0%', transition: 'transform .3s cubic-bezier(.22,.7,.3,1), opacity .3s',
                    opacity: lit ? 1 : 0.16, zIndex: inStep || focusId === e.id ? 12 : 3
                  }}
                >
                  <span style={{
                    display: 'block', position: 'relative', background: e.future ? MANILA : PAPER, borderRadius: 1,
                    padding: '8px 8px 10px', border: e.future ? '1px dashed rgba(23,22,26,0.4)' : '1px solid rgba(23,22,26,0.16)',
                    boxShadow: (subject ? '0 0 0 2px ' + RED + ', ' : '') + '0 14px 26px rgba(0,0,0,0.55), 0 2px 4px rgba(0,0,0,0.4)'
                  }}>
                    <span style={{
                      position: 'absolute', left: '50%', top: -7, marginLeft: -6, width: 12, height: 12, borderRadius: '50%',
                      background: 'radial-gradient(circle at 35% 30%, oklch(0.9 0.05 ' + catHue(e.category) + '), ' + accent(e.category, f) + ')',
                      border: '1px solid rgba(0,0,0,0.3)', boxShadow: '0 3px 5px rgba(0,0,0,0.6)', zIndex: 2
                    }} />
                    {shot.img ? (
                      <img src={shot.img} alt="" loading="lazy" style={{ width: '100%', height: 94, objectFit: 'cover', display: 'block', border: '1px solid rgba(23,22,26,0.22)', filter: 'grayscale(0.35) sepia(0.16) contrast(1.05)' }} />
                    ) : (
                      <span style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: 94, padding: '0 10px',
                        border: '1px solid rgba(23,22,26,0.22)', textAlign: 'center',
                        background: 'repeating-linear-gradient(135deg,rgba(23,22,26,0.07) 0 5px,transparent 5px 10px)',
                        font: '400 8.5px/1 ' + MONO, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(23,22,26,0.45)'
                      }}>no photo on file</span>
                    )}
                    <span style={{ display: 'block', marginTop: 7, font: '500 9.5px/1 ' + MONO, letterSpacing: '0.16em', color: 'rgba(23,22,26,0.62)', fontVariantNumeric: 'tabular-nums' }}>{e.year}</span>
                    <span style={{ display: 'block', marginTop: 5, font: '400 14px/1.15 ' + "'Instrument Serif', Georgia, serif", color: '#17161a', maxHeight: 34, overflow: 'hidden' }}>{e.title}</span>
                    <span style={{ display: 'block', marginTop: 6, font: '400 8px/1 ' + MONO, letterSpacing: '0.2em', textTransform: 'uppercase', color: e.future ? 'oklch(0.45 0.16 25)' : 'rgba(23,22,26,0.42)' }}>
                      {e.future ? 'Projection · ' + (e.confidence || 'Uncertain') : e.local ? 'Added by you' : catLabel(e.category)}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 70, zIndex: 5, pointerEvents: 'none', background: 'linear-gradient(270deg,rgba(10,10,11,0.9),transparent)' }} />
        {[['left', 'top'], ['right', 'top'], ['left', 'bottom'], ['right', 'bottom']].map(([x, y]) => (
          <div key={x + y} style={{
            position: 'absolute', [x]: 8, [y]: 8, width: 26, height: 26, pointerEvents: 'none', zIndex: 7,
            ['border' + (x === 'left' ? 'Left' : 'Right')]: '1px solid rgba(243,240,234,0.4)',
            ['border' + (y === 'top' ? 'Top' : 'Bottom')]: '1px solid rgba(243,240,234,0.4)'
          }} />
        ))}
        <div style={{ position: 'absolute', right: 14, top: 14, zIndex: 8, pointerEvents: 'none', display: 'flex', alignItems: 'center', gap: 8, ...micro(0.5), letterSpacing: '0.18em', whiteSpace: 'nowrap' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: CYAN, animation: 'hudPulse 2.4s ease-in-out infinite' }} />
          {viewport[0]} — {viewport[1]}
        </div>
      </div>

      <div onPointerDown={onScrub} role="scrollbar" aria-label="Pan the board" aria-controls="board-canvas" aria-valuenow={Math.round(thumb.left * 100)}
        style={{ marginTop: 8, height: 22, position: 'relative', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
        <div style={{ position: 'absolute', left: 0, right: 0, height: 3, background: 'rgba(243,240,234,0.1)', borderRadius: 2 }} />
        <div style={{ position: 'absolute', left: (thumb.left * 100).toFixed(2) + '%', width: Math.max(4, thumb.width * 100).toFixed(2) + '%', height: 9, background: CYAN, opacity: 0.7, borderRadius: 2 }} />
      </div>

      <CluePanel
        graph={graph}
        chain={chain}
        step={step}
        current={current}
        focus={focusId ? graph.index[focusId] : null}
        media={media}
        onStep={move}
        onJump={(index) => { setStep(index); centre(chain[index]); }}
        onExit={() => { setChain(null); setHover(null); navigate({ clue: null, id: null }, true); }}
        onOpenChain={openChain}
      />
    </div>
  );
}
