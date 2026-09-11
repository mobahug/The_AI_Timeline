import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { THREADS, TICKS, NOW, CATEGORIES, accent, buildChain, catLabel, catHue, fade, yearFraction, yearAtFraction } from '../lib/data.js';
import { INK, MANILA, MONO, PAPER, RED, RED_LIT, CYAN, micro } from '../lib/styles.js';
import { panDuration, panPosition } from '../lib/motion.js';
import CluePanel from './CluePanel.jsx';
import EditorBar from './EditorBar.jsx';

const PAD = 200;

/**
 * Every dimension on the board is solved from the height the window actually gives
 * us, so all six threads fit on screen exactly once and the board never scrolls
 * vertically. The gutter that falls out of that solve — the strip above each lane's
 * cards — is not spare room: it is the channel the strings are drawn in.
 */
const MIN_LANE = 46;

function metrics(height, width) {
  const lanes = THREADS.length;
  const ruler = height >= 520 ? 30 : 22;
  // The lane height that would make all six fit exactly. If honouring the
  // legibility floor overshoots it, the board genuinely cannot fit this window —
  // so it says so by scrolling, rather than clipping a lane off the bottom.
  const ideal = Math.floor((height - ruler) / lanes);
  const lane = Math.max(MIN_LANE, ideal);
  const fits = ideal >= MIN_LANE;
  const cardH = Math.max(34, Math.round(lane * 0.72));
  const gutter = lane - cardH;
  const k = Math.min(1, lane / 216);
  const cardW = Math.max(126, Math.round(210 * (0.58 + 0.42 * k)));
  const gap = cardW + Math.max(14, Math.round(34 * k));
  const photo = cardH >= 72;
  return {
    ruler, lane, cardH, gutter, cardW, gap, k, photo, fits,
    showCat: cardH >= 120,
    titleLines: cardH >= 104 ? 2 : (photo ? 1 : 3),
    titlePx: Math.max(10.5, Math.min(14, 8 + 6 * k)),
    boardW: Math.max(4200, Math.round(width * 7))
  };
}

/** One row per thread, chronological, never overlapping — and never far from
 *  its true year. Collision avoidance pushes crowded cards right, and a lane
 *  that is pushed a long way stops lining up with the lanes beside it: one lane
 *  shows 1969 where another shows 2025. That breaks the one thing a timeline
 *  board promises, so the board widens until the worst push is under a card. */
function layout(items, m) {
  const place = (boardW) => {
    const xOf = (year) => PAD + yearFraction(year) * (boardW - PAD * 2);
    const nodes = [];
    let worstPush = 0;
    THREADS.forEach((thread, row) => {
      let lastX = -Infinity;
      const laneTop = m.ruler + row * m.lane;
      items
        .filter((e) => e.thread === thread.id)
        .map((e) => ({ event: e, x: xOf(e.year) }))
        .sort((a, b) => a.x - b.x)
        .forEach((slot) => {
          const gap = slot.event.featured ? m.gap + Math.round(m.gap * 0.16) : m.gap;
          const x = Math.max(slot.x, lastX + gap);
          worstPush = Math.max(worstPush, x - slot.x);
          lastX = x;
          nodes.push({
            event: slot.event,
            x,
            top: laneTop + m.gutter,
            y: laneTop + m.gutter + m.cardH / 2,
            ty: laneTop + m.gutter,
            tilt: (((slot.event.id.length * 37) % 5) - 2) * 0.5
          });
        });
    });
    return { nodes, xOf, worstPush, boardW };
  };

  // Give the densest lane room for its cards. Eight entries in one year will
  // always be pushed a card apart whatever the width — that is not misalignment —
  // so this sizes to the lane's total need rather than chasing a push that a
  // same-year cluster can never eliminate. On a desktop this is close to the
  // nominal width; on a phone, where cards are large relative to the board, it
  // is what stops one lane drifting decades away from the lane beside it.
  const densest = THREADS.reduce((mx, th) => Math.max(mx, items.filter((e) => e.thread === th.id).length), 0);
  const boardW = Math.max(m.boardW, Math.ceil(densest * m.gap * 1.35) + PAD * 2);
  const result = place(boardW);

  const reach = result.nodes.reduce((mx, n) => Math.max(mx, n.x + m.cardW / 2), 0);
  return {
    nodes: result.nodes,
    xOf: result.xOf,
    worstPush: result.worstPush,
    width: Math.max(result.boardW, Math.ceil(reach + PAD)),
    height: m.ruler + THREADS.length * m.lane
  };
}

/**
 * Strings tie to the pin at the top edge of a card and arch UP into the gutter.
 * The old geometry started at the card's centre — burying ~105px horizontally and
 * ~79px vertically of every string inside its own two endpoint cards — and sagged
 * downward into the row below. Arching up keeps same-lane strings, 61% of them,
 * entirely in empty space.
 */
function stringPath(a, b, gutter) {
  const dx = b.x - a.x;
  const lift = Math.min(gutter * 0.86, 12 + Math.abs(dx) * 0.03);
  const c1x = a.x + dx * 0.25;
  const c1y = a.ty - lift;
  const c2x = b.x - dx * 0.25;
  const c2y = b.ty - lift;
  return {
    d: 'M' + a.x.toFixed(1) + ' ' + a.ty.toFixed(1) +
       ' C' + c1x.toFixed(1) + ' ' + c1y.toFixed(1) + ',' +
       c2x.toFixed(1) + ' ' + c2y.toFixed(1) + ',' +
       b.x.toFixed(1) + ' ' + b.ty.toFixed(1),
    mx: (a.x + 3 * c1x + 3 * c2x + b.x) / 8,
    my: (a.ty + 3 * c1y + 3 * c2y + b.ty) / 8
  };
}

export default function BoardView({ items, graph, media, route, navigate, board, onYear }) {
  const root = useRef(null);
  const frameRef = useRef(null);
  const scroller = useRef(null);
  const dragged = useRef(false);
  const [shellH, setShellH] = useState(640);

  const [box, setBox] = useState({ w: 1280, h: 560 });
  const [hover, setHover] = useState(null);
  // Hover is a mouse concept. A phone fires mouseover before click, which opened
  // the preview pointer-transparent for the gap between the two — a finger went
  // straight through it and panned the board underneath. No hover on touch.
  const [canHover] = useState(() => typeof window === 'undefined' || !window.matchMedia
    || !window.matchMedia('(hover: none), (pointer: coarse)').matches);
  // A click pins a card open. Hover is only ever a transient preview, so without
  // this the context you deliberately clicked for vanished on mouseleave.
  const [pinned, setPinned] = useState(null);
  const [chain, setChain] = useState(null);
  const [step, setStep] = useState(0);
  const [viewport, setViewport] = useState([1900, 1950]);
  const [thumb, setThumb] = useState({ left: 0, width: 0.2 });
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(null);
  const [connectFrom, setConnectFrom] = useState(null);

  // The shell fills whatever the header leaves. The header is measured, never
  // assumed, so wrapping at narrow widths just makes the lanes shorter.
  useEffect(() => {
    const measure = () => {
      const header = document.querySelector('[data-chrome="header"]');
      const vh = (window.visualViewport && window.visualViewport.height) || window.innerHeight;
      setShellH(Math.max(300, Math.floor(vh - (header ? header.offsetHeight : 0))));
    };
    measure();
    window.addEventListener('resize', measure);
    if (window.visualViewport) window.visualViewport.addEventListener('resize', measure);
    const header = document.querySelector('[data-chrome="header"]');
    let ro;
    if (header && window.ResizeObserver) { ro = new ResizeObserver(measure); ro.observe(header); }
    return () => {
      window.removeEventListener('resize', measure);
      if (window.visualViewport) window.visualViewport.removeEventListener('resize', measure);
      if (ro) ro.disconnect();
    };
  }, []);

  // The frame measures itself, so anything else in the column (the editor opening,
  // for instance) simply takes room from the lanes instead of overflowing. It is
  // the frame and not the canvas scroller because the list rendering has no
  // scroller — measuring that left the width stuck at its default and put a
  // 440px rail on a 390px phone.
  useEffect(() => {
    const el = frameRef.current;
    if (!el || !window.ResizeObserver) return;
    const read = () => setBox({ w: el.clientWidth || 1280, h: el.clientHeight || 560 });
    const ro = new ResizeObserver(read);
    ro.observe(el);
    read();
    return () => ro.disconnect();
  }, []);

  const m = useMemo(() => metrics(box.h, box.w), [box.h, box.w]);
  const board3 = useMemo(() => layout(items, m), [items, m]);
  const positions = useMemo(() => Object.fromEntries(board3.nodes.map((n) => [n.event.id, n])), [board3]);

  // A string is coloured by the category of the event it leaves — the kind of thing
  // that did the causing — so the web reads as a mix of forces, not one red tangle.
  const strings = useMemo(() => graph.edges
    .filter((l) => positions[l.from] && positions[l.to])
    .map((l) => {
      const src = graph.index[l.from];
      const cat = (src && src.category) || 'research';
      return {
        ...l, cat,
        tone: accent(cat, 0),
        lit: 'oklch(0.88 0.17 ' + catHue(cat) + ')',
        ...stringPath(positions[l.from], positions[l.to], m.gutter)
      };
    }), [graph.edges, graph.index, positions, m.gutter]);

  const current = chain && chain.length ? chain[Math.min(step, chain.length - 1)] : null;
  const chainIds = chain ? [...new Set(chain.flatMap((s) => [s.from, s.to]))] : null;
  const focusId = chain ? null : (pinned || hover);
  const active = chain ? chainIds : (focusId ? [focusId, ...(graph.adjacency[focusId] || []).map((a) => a.id)] : null);

  /**
   * Pan the board to a position along an eased curve driven by requestAnimationFrame.
   *
   * The browser's own smooth scrolling was not good enough here: its speed is not
   * ours to choose, it is silently dropped in a throttled tab, and the fallback
   * that guaranteed arrival snapped the board to the target 600ms in — which on a
   * long pan meant yanking it mid-flight. This is time-based, so a tab that
   * comes back from the background simply lands at the end instead of stalling,
   * and it is cancelled the moment the reader takes over with a drag or a wheel.
   * Honours prefers-reduced-motion by jumping straight there.
   */
  const panAnim = useRef(null);
  const railInset = useRef(0);
  const panelInner = useRef(null);
  const [panelContentH, setPanelContentH] = useState(0);
  const cancelPan = useCallback(() => {
    if (panAnim.current !== null) { cancelAnimationFrame(panAnim.current); panAnim.current = null; }
  }, []);

  const panTo = useCallback((left) => {
    const el = scroller.current;
    if (!el) return;
    cancelPan();
    const target = Math.max(0, Math.min(left, el.scrollWidth - el.clientWidth));
    const from = el.scrollLeft;
    const dist = target - from;
    const reduce = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || Math.abs(dist) < 2) { el.scrollLeft = target; return; }

    const duration = panDuration(dist);
    const t0 = performance.now();
    const step = (now) => {
      const el2 = scroller.current;
      if (!el2) { panAnim.current = null; return; }
      const elapsed = now - t0;
      el2.scrollLeft = panPosition(from, target, elapsed);
      panAnim.current = elapsed < duration ? requestAnimationFrame(step) : null;
    };
    panAnim.current = requestAnimationFrame(step);
  }, [cancelPan]);

  useEffect(() => cancelPan, [cancelPan]);

  const centre = useCallback((stepData) => {
    const el = scroller.current;
    if (!el || !stepData) return;
    const a = positions[stepData.from];
    const b = positions[stepData.to];
    if (!a || !b) return;
    panTo((a.x + b.x) / 2 - (el.clientWidth - railInset.current) / 2);
    if (el.scrollHeight > el.clientHeight) el.scrollTop = Math.max(0, (a.y + b.y) / 2 - el.clientHeight / 2);
  }, [positions, panTo]);

  const focusCard = useCallback((id) => {
    setChain(null);
    setHover(null);
    setPinned(id);
    navigate({ id, clue: null }, true);
    const el = scroller.current;
    if (el && positions[id]) panTo(positions[id].x - (el.clientWidth - railInset.current) / 2);
  }, [navigate, positions, panTo]);

  /** Open one specific string as a walked clue. buildChain only ever follows the
   *  first-authored link at each hop, so without naming the parent, three of the
   *  62 strings could not be reached from any click at all. */
  const openClue = useCallback((from, to) => {
    const built = buildChain(graph, to, from);
    const index = built.steps.findIndex((s) => s.from === from && s.to === to);
    if (index < 0) return;
    setPinned(null);
    setHover(null);
    setChain(built.steps);
    setStep(index);
    navigate({ clue: { from, to }, id: null }, true);
    requestAnimationFrame(() => centre(built.steps[index]));
  }, [graph, navigate, centre]);

  const openChain = useCallback((id, atStep) => {
    const built = buildChain(graph, id);
    if (!built.steps.length) { focusCard(id); return; }
    const index = typeof atStep === 'number' ? atStep : built.start;
    setChain(built.steps);
    setStep(index);
    setHover(null);
    setPinned(null);
    navigate({ clue: { from: built.steps[index].from, to: built.steps[index].to }, id: null }, true);
    requestAnimationFrame(() => centre(built.steps[index]));
  }, [graph, navigate, centre, focusCard]);

  // Deep links: ?id=… opens a card, ?clue=a>b opens the walkthrough at that string.
  const applied = useRef('');
  useEffect(() => {
    const key = route.clue ? route.clue.from + '>' + route.clue.to : route.id || '';
    if (!key || key === applied.current || !board3.nodes.length) return;
    applied.current = key;
    if (route.clue) {
      const built = buildChain(graph, route.clue.to, route.clue.from);
      const index = built.steps.findIndex((s) => s.from === route.clue.from && s.to === route.clue.to);
      if (index >= 0) { setChain(built.steps); setStep(index); requestAnimationFrame(() => centre(built.steps[index])); return; }
    }
    if (route.id && positions[route.id]) {
      setPinned(route.id);
      const el = scroller.current;
      if (el) panTo(positions[route.id].x - (el.clientWidth - railInset.current) / 2);
    }
  }, [route.id, route.clue, graph, positions, board3.nodes.length, centre, panTo]);

  // Filtering a 4200px board to five cards used to leave you staring at empty
  // cork, with the results somewhere off-screen. Changing a filter now pans to
  // the first surviving card.
  const filterKey = route.category + '|' + route.query;
  const lastFilter = useRef(filterKey);
  useEffect(() => {
    if (filterKey === lastFilter.current) return;
    lastFilter.current = filterKey;
    const el = scroller.current;
    if (!el || !board3.nodes.length) return;
    const first = board3.nodes.reduce((a, n) => (n.x < a.x ? n : a), board3.nodes[0]);
    panTo(first.x - el.clientWidth * 0.28);
  }, [filterKey, board3.nodes, panTo]);

  const move = useCallback((delta) => {
    if (!chain) return;
    const next = Math.min(chain.length - 1, Math.max(0, step + delta));
    setStep(next);
    navigate({ clue: { from: chain[next].from, to: chain[next].to } }, true);
    centre(chain[next]);
  }, [chain, step, navigate, centre]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') { setChain(null); setPinned(null); setDraft(null); setConnectFrom(null); }
      if (chain && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) { e.preventDefault(); move(e.key === 'ArrowRight' ? 1 : -1); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [chain, move]);

  const onScroll = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    const left = el.scrollLeft;
    const right = left + el.clientWidth;
    const fr = (x) => Math.min(1, Math.max(0, (x - PAD) / (board3.width - PAD * 2)));

    // Read the years off the cards in view. Where a lane has been pushed past its
    // year positions, the x->year map lies; the cards themselves do not.
    const seen = board3.nodes.filter((n) => n.x + m.cardW / 2 > left && n.x - m.cardW / 2 < right);
    if (seen.length) {
      let lo = Infinity, hi = -Infinity;
      seen.forEach((n) => { if (n.event.year < lo) lo = n.event.year; if (n.event.year > hi) hi = n.event.year; });
      setViewport([lo, hi]);
    } else {
      setViewport([yearAtFraction(fr(left)), yearAtFraction(fr(right))]);
    }

    setThumb({ left: left / el.scrollWidth, width: el.clientWidth / el.scrollWidth });

    if (onYear) {
      const head = left + Math.min(el.clientWidth * 0.4, 380);
      let nearest = null;
      board3.nodes.forEach((n) => { if (!nearest || Math.abs(n.x - head) < Math.abs(nearest.x - head)) nearest = n; });
      onYear(String(nearest ? nearest.event.year : yearAtFraction(fr(head))), max > 0 ? left / max : 0);
    }
  }, [board3.width, board3.nodes, m.cardW, onYear]);

  useEffect(() => { onScroll(); }, [onScroll]);

  const onPointerDown = (e) => {
    if (e.button !== 0) return;
    const el = scroller.current;
    if (!el) return;
    cancelPan();
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
    cancelPan();
    const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    const max = el.scrollWidth - el.clientWidth;
    if ((delta < 0 && el.scrollLeft > 0) || (delta > 0 && el.scrollLeft < max)) {
      e.preventDefault();
      el.scrollLeft = Math.min(max, Math.max(0, el.scrollLeft + delta));
      onScroll();
    }
  };

  const onScrub = (e) => {
    cancelPan();
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
    focusCard(event.id);
  };

  const hint = chain
    ? 'Walking the case · clue ' + (step + 1) + ' of ' + chain.length
    : focusId
      ? 'Card selected · ' + ((graph.adjacency[focusId] || []).length) + ' strings attached'
      : graph.edges.length + ' strings · click a card to walk the case';

  const panelOpen = !!(current || focusId);
  // A hover preview must never steal the hover that produced it, so it lets the
  // pointer straight through.
  const preview = !current && !pinned && !!hover;

  // The context panel is one fixed size, always in one place, whatever card is
  // selected and whether it was hovered or clicked. On a wide screen that is a
  // rail down the right edge, which never covers a lane and never has to flip.
  // On a narrow one it is a sheet of fixed height, which still docks away from
  // the subject because there is nowhere else for it to go.
  const railMode = box.w >= 900;
  const RAIL_W = railMode ? Math.min(440, Math.round(box.w * 0.36)) : 0;
  // The panel is exactly as tall as what it holds, up to a cap, and scrolls past
  // it. Never a fixed block with dead space under short content, and never a
  // snap between sizes: the height is measured and the change is animated.
  const PANEL_CAP = railMode ? box.h : Math.max(180, Math.round(shellH * 0.46));
  const panelH = Math.min(PANEL_CAP, panelContentH || PANEL_CAP);
  useEffect(() => { if (!panelOpen) setPanelContentH(0); }, [panelOpen]);

  // Measure the panel's content so the panel can be exactly as tall as it.
  useEffect(() => {
    const el = panelInner.current;
    if (!el || !window.ResizeObserver) return;
    const read = () => setPanelContentH(Math.ceil(el.getBoundingClientRect().height));
    const ro = new ResizeObserver(read);
    ro.observe(el);
    read();
    return () => ro.disconnect();
  }, [panelOpen]);
  const subject = current ? positions[current.to] : (focusId ? positions[focusId] : null);
  const dockTop = !railMode && !!(subject && box.h && subject.y > box.h * 0.52);
  railInset.current = RAIL_W;

  return (
    <div
      ref={root}
      style={{
        height: shellH, display: 'flex', flexDirection: 'column', overflow: 'hidden',
        padding: '0 clamp(10px,1.6vw,20px) 6px', boxSizing: 'border-box'
      }}
    >
      <div style={{ flex: 'none', paddingTop: 9 }}>
        <EditorBar
          compact={box.w < 820}
          lead={<>
            <h1 style={{ margin: 0, font: '400 clamp(16px,1.7vw,21px)/1 ' + "'Instrument Serif', Georgia, serif", letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>The board</h1>
            <span style={{ ...micro(chain ? 0.75 : 0.42), color: chain ? RED_LIT : undefined }}>{hint}</span>
          </>}
          trail={<span style={{ ...micro(0.5), letterSpacing: '0.18em', display: 'inline-flex', alignItems: 'center', gap: 7, whiteSpace: 'nowrap' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: CYAN, animation: 'hudPulse 2.4s ease-in-out infinite' }} />
            {viewport[0]} — {viewport[1]}
          </span>}
          editing={editing}
          onToggle={() => { setEditing((v) => !v); setDraft(null); setConnectFrom(null); setChain(null); setPinned(null); }}
          onNewCard={() => { setEditing(true); setDraft({ id: null, year: NOW + 1, category: 'research', title: '', note: '', isNew: true }); }}
          onConnect={() => setConnectFrom(draft ? draft.id : focusId)}
          connecting={!!connectFrom}
          board={board}
          draft={draft}
          setDraft={setDraft}
        />
      </div>

      <div ref={frameRef} style={{ position: 'relative', flex: 1, minHeight: 0 }}>
        <div
          ref={scroller}
          onScroll={onScroll}
          onPointerDown={onPointerDown}
          onWheel={onWheel}
          id="board-canvas"
          style={{
            position: 'absolute', inset: 0, overflowX: 'auto', overflowY: m.fits ? 'hidden' : 'auto',
            border: '1px solid rgba(243,240,234,0.12)', borderRadius: 3, cursor: 'grab', touchAction: m.fits ? 'pan-x' : 'auto',
            background: 'radial-gradient(120% 90% at 20% 0%,#171310,#08080a 70%)'
          }}
        >
          <div style={{ position: 'relative', width: board3.width, height: board3.height, minWidth: '100%' }}>
            {THREADS.map((thread, i) => (
              <div key={thread.id} style={{
                position: 'absolute', left: 0, top: m.ruler + i * m.lane, width: board3.width, height: m.lane,
                borderTop: '1px solid rgba(243,240,234,0.07)',
                background: i % 2 ? 'rgba(243,240,234,0.012)' : 'transparent'
              }} />
            ))}

            {TICKS.map((year) => (
              <div key={year}>
                <div style={{
                  position: 'absolute', left: board3.xOf(year), top: m.ruler - 6, width: 1, height: board3.height - m.ruler + 6,
                  background: year > NOW
                    ? 'repeating-linear-gradient(180deg,rgba(243,240,234,0.14) 0 3px,transparent 3px 8px)'
                    : 'rgba(243,240,234,0.06)'
                }} />
                <div style={{ position: 'absolute', left: board3.xOf(year) + 6, top: Math.max(2, m.ruler - 20), ...micro(0.34), letterSpacing: '0.1em', fontVariantNumeric: 'tabular-nums' }}>{year}</div>
              </div>
            ))}

            <div style={{
              position: 'absolute', left: board3.xOf(NOW), top: m.ruler - 6, width: Math.max(0, board3.width - board3.xOf(NOW)),
              height: board3.height - m.ruler + 6, borderLeft: '1px dashed rgba(243,240,234,0.35)',
              background: 'linear-gradient(90deg,rgba(243,240,234,0.035),transparent 60%)', pointerEvents: 'none'
            }} />

            {/* The strings sit ABOVE the resting cards. A card only rises over them
                when it is the one being read (zIndex 12). */}
            <svg style={{ position: 'absolute', inset: 0, width: board3.width, height: board3.height, overflow: 'visible', pointerEvents: 'none', zIndex: 4 }}>
              <defs>
                {CATEGORIES.map((c) => (
                  <marker key={c.id} id={'tip-' + c.id} viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6.5" markerHeight="6.5" orient="auto">
                    <path d="M0 0 L8 4 L0 8 z" style={{ fill: 'oklch(0.88 0.17 ' + c.hue + ')' }} />
                  </marker>
                ))}
              </defs>
              {strings.map((s) => {
                const onChain = chain ? (chainIds.includes(s.from) && chainIds.includes(s.to)) : (active && (s.from === focusId || s.to === focusId));
                const isStep = current && ((current.from === s.from && current.to === s.to) || (current.from === s.to && current.to === s.from));
                const strong = isStep || (!chain && onChain);
                const width = strong ? 2.6 : 1.7;
                const opacity = active ? (strong ? 1 : onChain ? 0.6 : 0.2) : 0.92;
                return (
                  <g key={s.id} style={{ opacity, transition: 'opacity .3s' }}>
                    {strong && <path d={s.d} style={{ fill: 'none', stroke: s.lit, strokeWidth: width + 7, opacity: 0.22, filter: 'blur(4px)' }} />}
                    {/* Casing: invisible on the dark ground, but it is what keeps a
                        string readable where it crosses a cream card. */}
                    <path d={s.d} style={{ fill: 'none', stroke: '#0a0a0b', strokeWidth: width + 2.6, strokeLinecap: 'round', opacity: 0.62 }} />
                    <path
                      d={s.d}
                      markerEnd={strong ? 'url(#tip-' + s.cat + ')' : undefined}
                      style={{
                        fill: 'none', stroke: strong ? s.lit : s.tone, strokeWidth: width, strokeLinecap: 'round',
                        strokeDasharray: s.future ? '6 7' : undefined,
                        transition: 'stroke-width .3s, stroke .3s'
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
                position: 'absolute', left: s.mx, top: s.my, transform: 'translate(-50%,-50%) rotate(-1.4deg)',
                zIndex: 8, pointerEvents: 'none', background: '#efe9da', color: '#17161a',
                border: '1px solid rgba(23,22,26,0.3)', boxShadow: '0 5px 12px rgba(0,0,0,0.5)', padding: '4px 7px',
                borderLeft: '3px solid ' + s.tone,
                font: '400 9px/1 ' + MONO, letterSpacing: '0.13em', textTransform: 'uppercase', whiteSpace: 'nowrap',
                animation: 'fadeIn .25s both'
              }}>{s.claim}</div>
            ))}

            {board3.nodes.map((node) => {
              const e = node.event;
              const f = fade(e.year);
              const lit = !active || active.includes(e.id);
              const inStep = current && (current.from === e.id || current.to === e.id);
              const subject = current ? current.to === e.id : focusId === e.id;
              const raised = inStep || focusId === e.id;
              const shot = media(e);
              return (
                <button
                  key={e.id}
                  type="button"
                  aria-label={e.year + ', ' + catLabel(e.category) + ', ' + e.title}
                  onClick={() => clickCard(e)}
                  onFocus={() => canHover && !chain && !pinned && setHover(e.id)}
                  onBlur={() => canHover && !chain && !pinned && setHover(null)}
                  onMouseEnter={() => canHover && !chain && !pinned && setHover(e.id)}
                  onMouseLeave={() => canHover && !chain && !pinned && setHover(null)}
                  style={{
                    position: 'absolute', left: node.x - m.cardW / 2, top: node.top, width: m.cardW, height: m.cardH,
                    padding: 0, border: 'none', background: 'transparent', textAlign: 'left', boxSizing: 'border-box',
                    cursor: editing ? 'text' : 'pointer',
                    transform: 'rotate(' + node.tilt + 'deg) scale(' + (raised ? 1.05 : 1) + ')',
                    transformOrigin: '50% 0%', transition: 'transform .3s cubic-bezier(.22,.7,.3,1), opacity .3s',
                    opacity: lit ? 1 : 0.2, zIndex: raised ? 12 : 2
                  }}
                >
                  <span style={{
                    display: 'flex', flexDirection: 'column', position: 'relative', boxSizing: 'border-box',
                    width: '100%', height: '100%', overflow: 'hidden',
                    background: e.future ? MANILA : PAPER, borderRadius: 1,
                    padding: m.k < 0.6 ? '5px 6px 6px' : '7px 7px 8px',
                    border: e.future ? '1px dashed rgba(23,22,26,0.4)' : '1px solid rgba(23,22,26,0.16)',
                    boxShadow: (subject ? '0 0 0 2px ' + RED + ', ' : '') + '0 10px 20px rgba(0,0,0,0.5)'
                  }}>
                    <span style={{
                      position: 'absolute', left: '50%', top: 2, marginLeft: -5, width: 10, height: 10, borderRadius: '50%',
                      background: 'radial-gradient(circle at 35% 30%, oklch(0.9 0.05 ' + catHue(e.category) + '), ' + accent(e.category, f) + ')',
                      border: '1px solid rgba(0,0,0,0.35)', boxShadow: '0 2px 4px rgba(0,0,0,0.6)', zIndex: 2
                    }} />
                    {m.photo && (shot.img ? (
                      <img src={shot.img} alt="" loading="lazy" style={{ flex: '1 1 auto', minHeight: 0, width: '100%', objectFit: 'cover', display: 'block', border: '1px solid rgba(23,22,26,0.22)', filter: 'grayscale(0.35) sepia(0.16) contrast(1.05)' }} />
                    ) : (
                      <span style={{
                        flex: '1 1 auto', minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%',
                        border: '1px solid rgba(23,22,26,0.22)', textAlign: 'center',
                        background: 'repeating-linear-gradient(135deg,rgba(23,22,26,0.07) 0 5px,transparent 5px 10px)',
                        font: '400 8px/1 ' + MONO, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(23,22,26,0.45)'
                      }}>no photo</span>
                    ))}
                    <span style={{ flex: 'none', display: 'block', marginTop: m.photo ? 5 : 8, font: '500 8.5px/1 ' + MONO, letterSpacing: '0.14em', color: 'rgba(23,22,26,0.6)', fontVariantNumeric: 'tabular-nums' }}>{e.year}</span>
                    <span style={{
                      flex: m.photo ? 'none' : '1 1 auto', display: '-webkit-box', WebkitBoxOrient: 'vertical',
                      WebkitLineClamp: m.titleLines, overflow: 'hidden', marginTop: 3,
                      font: '400 ' + m.titlePx + 'px/1.14 ' + "'Instrument Serif', Georgia, serif", color: '#17161a'
                    }}>{e.title}</span>
                    {m.showCat && (
                      <span style={{ flex: 'none', display: 'block', marginTop: 4, font: '400 7.5px/1 ' + MONO, letterSpacing: '0.18em', textTransform: 'uppercase', color: e.future ? 'oklch(0.45 0.16 25)' : 'rgba(23,22,26,0.42)' }}>
                        {e.future ? 'Projection · ' + (e.confidence || 'Uncertain') : e.local ? 'Added by you' : catLabel(e.category)}
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, zIndex: 6, pointerEvents: 'none' }} />
        {THREADS.map((thread, i) => (
          <div key={'label-' + thread.id} style={{
            position: 'absolute', left: 7, top: m.ruler + i * m.lane + 2, zIndex: 6, pointerEvents: 'none',
            maxWidth: 'min(46vw,168px)', padding: '3px 7px', borderRadius: 2,
            background: 'rgba(10,10,11,0.82)', border: '1px solid rgba(243,240,234,0.14)',
            color: 'rgba(243,240,234,0.72)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            font: '500 ' + (m.k < 0.55 ? 7.5 : 8.5) + 'px/1.3 ' + MONO, letterSpacing: '0.13em', textTransform: 'uppercase'
          }}>{thread.label}</div>
        ))}

        {!items.length && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', ...micro(0.4), letterSpacing: '0.14em' }}>
            No entries match
          </div>
        )}

        {!(panelOpen && railMode) && <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 56, zIndex: 5, pointerEvents: 'none', background: 'linear-gradient(270deg,rgba(10,10,11,0.85),transparent)' }} />}
        {[['left', 'top'], ['right', 'top'], ['left', 'bottom'], ['right', 'bottom']].map(([x, y]) => (
          <div key={x + y} style={{
            position: 'absolute', [x]: 7, [y]: 7, width: 22, height: 22, pointerEvents: 'none', zIndex: 7,
            ['border' + (x === 'left' ? 'Left' : 'Right')]: '1px solid rgba(243,240,234,0.35)',
            ['border' + (y === 'top' ? 'Top' : 'Bottom')]: '1px solid rgba(243,240,234,0.35)'
          }} />
        ))}

        {panelOpen && (
          <div
            role="complementary"
            aria-label="Card context"
            style={{
              position: 'absolute', zIndex: 22, height: panelContentH ? panelH : 'auto', maxHeight: PANEL_CAP,
              transition: panelContentH ? 'height .24s cubic-bezier(.22,.7,.3,1)' : 'none',
              ...(railMode
                ? { top: 0, right: 0, width: RAIL_W, border: '1px solid rgba(243,240,234,0.14)', borderTop: 'none', borderRight: 'none', borderBottomLeftRadius: 3, animation: 'slideInRight .24s cubic-bezier(.22,.7,.3,1) both' }
                : { left: 0, right: 0, ...(dockTop ? { top: 0 } : { bottom: 0 }),
                    [dockTop ? 'borderBottom' : 'borderTop']: '1px solid rgba(243,240,234,0.16)',
                    animation: (dockTop ? 'slideInDown' : 'slideInUp') + ' .24s cubic-bezier(.22,.7,.3,1) both' }),
              overflowY: panelContentH > PANEL_CAP ? 'auto' : 'hidden', overscrollBehavior: 'contain',
              pointerEvents: preview ? 'none' : 'auto',
              background: 'rgba(10,10,11,0.94)', backdropFilter: 'blur(16px) saturate(1.3)'
            }}
          >
           <div ref={panelInner}>
            <CluePanel
              graph={graph}
              chain={chain}
              step={step}
              current={current}
              focus={focusId ? graph.index[focusId] : null}
              media={media}
              onStep={move}
              onJump={(index) => { setStep(index); centre(chain[index]); }}
              onExit={() => { setChain(null); setHover(null); setPinned(null); navigate({ clue: null, id: null }, true); }}
              onOpenChain={openChain}
              onOpenCard={focusCard}
              onOpenClue={openClue}
            />
           </div>
          </div>
        )}
      </div>

      <div onPointerDown={onScrub} role="scrollbar" aria-label="Pan the board" aria-controls="board-canvas" aria-valuenow={Math.round(thumb.left * 100)}
        style={{ marginTop: 4, height: 12, position: 'relative', cursor: 'pointer', display: 'flex', alignItems: 'center', flex: 'none' }}>
        <div style={{ position: 'absolute', left: 0, right: 0, height: 3, background: 'rgba(243,240,234,0.1)', borderRadius: 2 }} />
        <div style={{ position: 'absolute', left: (thumb.left * 100).toFixed(2) + '%', width: Math.max(4, thumb.width * 100).toFixed(2) + '%', height: 8, background: CYAN, opacity: 0.7, borderRadius: 2 }} />
      </div>
    </div>
  );
}
