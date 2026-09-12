import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { THREADS, TICKS, FIRST, NOW, CATEGORIES, accent, buildChain, catLabel, catHue, fade, yearAtFraction } from '../lib/data.js';
import { PAD, metrics, layout, stringPath } from '../lib/layout.js';
import { MANILA, MONO, PAPER, RED, RED_LIT, CYAN, SERIF, EASE, FADE, micro, paperInk } from '../lib/styles.js';
import { Empty } from './kit.jsx';
import { panDuration, panPosition } from '../lib/motion.js';
import CluePanel from './CluePanel.jsx';
import EditorBar from './EditorBar.jsx';

/* One card on the cork. Memoised on plain values, so a scroll, a drag frame or a
   hover elsewhere on the board does not reconcile it: only the card whose own
   lit / subject / raised state flipped renders again. */
const Card = React.memo(function Card({ node, m, img, lit, subject, raised, editing, hoverable, onClick, onHover, onFocusCard }) {
  const e = node.event;
  const f = fade(e.year);
  return (
    <button
      type="button"
      id={'card-' + e.id}
      aria-label={e.year + ', ' + catLabel(e.category) + ', ' + e.title}
      onClick={() => onClick(e)}
      onFocus={() => { onFocusCard(e.id); if (hoverable) onHover(e.id); }}
      onBlur={() => hoverable && onHover(null)}
      onMouseEnter={() => hoverable && onHover(e.id)}
      onMouseLeave={() => hoverable && onHover(null)}
      style={{
        position: 'absolute', left: node.x - m.cardW / 2, top: node.top, width: m.cardW, height: m.cardH,
        padding: 0, border: 'none', background: 'transparent', textAlign: 'left', boxSizing: 'border-box',
        cursor: editing ? 'text' : 'pointer',
        transform: 'rotate(' + node.tilt + 'deg) scale(' + (raised ? 1.05 : 1) + ')',
        transformOrigin: '50% 0%', transition: 'transform .3s ' + EASE + ', opacity .3s',
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
        {m.photo && (img ? (
          <img src={img} alt="" loading="lazy" decoding="async" style={{ flex: '1 1 auto', minHeight: 0, width: '100%', objectFit: 'cover', display: 'block', border: '1px solid rgba(23,22,26,0.22)', filter: 'grayscale(0.35) sepia(0.16) contrast(1.05)' }} />
        ) : (
          <span style={{
            flex: '1 1 auto', minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%',
            border: '1px solid rgba(23,22,26,0.22)', textAlign: 'center',
            background: 'repeating-linear-gradient(135deg,rgba(23,22,26,0.07) 0 5px,transparent 5px 10px)',
            font: '400 8px/1 ' + MONO, letterSpacing: '0.16em', textTransform: 'uppercase', color: paperInk(0.65)
          }}>no photo</span>
        ))}
        <span style={{ flex: 'none', display: 'block', marginTop: m.photo ? 5 : 8, font: '500 8.5px/1 ' + MONO, letterSpacing: '0.14em', color: paperInk(0.72), fontVariantNumeric: 'tabular-nums' }}>{e.year}</span>
        <span style={{
          flex: m.photo ? 'none' : '1 1 auto', display: '-webkit-box', WebkitBoxOrient: 'vertical',
          WebkitLineClamp: m.titleLines, overflow: 'hidden', marginTop: 3,
          font: '400 ' + m.titlePx + 'px/1.14 ' + SERIF, color: '#17161a'
        }}>{e.title}</span>
        {m.showCat && (
          <span style={{ flex: 'none', display: 'block', marginTop: 4, font: '400 7.5px/1 ' + MONO, letterSpacing: '0.18em', textTransform: 'uppercase', color: e.future ? 'oklch(0.45 0.16 25)' : paperInk(0.65) }}>
            {e.future ? 'Scenario · ' + (e.confidence || 'Uncertain') : e.local ? 'Added by you' : catLabel(e.category)}
          </span>
        )}
      </span>
    </button>
  );
});

/* One string. `strong` lights it as the clue being read; `onChain` keeps it in
   the walked chain; `dim` fades everything outside the active set. */
const StringPath = React.memo(function StringPath({ s, strong, onChain, dim }) {
  const width = strong ? 2.6 : 1.7;
  const opacity = dim ? (strong ? 1 : onChain ? 0.6 : 0.2) : 0.92;
  return (
    <g style={{ opacity, transition: 'opacity .3s' }}>
      {strong && <path d={s.d} style={{ fill: 'none', stroke: s.lit, strokeWidth: width + 7, opacity: 0.22, filter: 'blur(4px)' }} />}
      {/* Casing: invisible on the dark ground, but it is what keeps a
          string readable where it crosses a cream card. */}
      <path d={s.d} style={{ fill: 'none', stroke: '#0a0a0b', strokeWidth: width + 2.6, strokeLinecap: 'round', opacity: 0.62, strokeDasharray: s.future ? '6 7' : undefined }} />
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
});

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
  // The last address the board itself wrote or answered. The deep-link effect
  // below acts only on an address it has not seen, so stepping a chain — which
  // rewrites ?clue= at every step — never rebuilds the chain under the reader.
  const applied = useRef('');
  const [viewport, setViewport] = useState([FIRST, FIRST + 50]);
  // The scrubber's thumb is written straight to the DOM on every scroll frame;
  // it is the one thing that must move every frame and nothing else depends on it.
  const thumbRef = useRef(null);
  const scrubRef = useRef(null);
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
      const dst = graph.index[l.to];
      const cat = (src && src.category) || 'research';
      return {
        ...l, cat,
        // A string into a scenario is drawn dashed, like every manila element:
        // it argues for something that has not happened.
        future: !!(dst && dst.future),
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

  /** A card that takes keyboard focus must be in view — the browser scrolls it
   *  into the frame, but not out from under the rail. */
  const keepVisible = useCallback((id) => {
    const el = scroller.current;
    const p = positions[id];
    if (!el || !p) return;
    const left = el.scrollLeft;
    const usable = el.clientWidth - railInset.current;
    if (p.x - m.cardW / 2 < left || p.x + m.cardW / 2 > left + usable) panTo(p.x - usable / 2);
  }, [positions, panTo, m.cardW]);

  /** Bring one card to the middle of what the panel leaves visible. */
  const panToCard = useCallback((id) => {
    const el = scroller.current;
    if (el && positions[id]) panTo(positions[id].x - (el.clientWidth - railInset.current) / 2);
  }, [positions, panTo]);

  const focusCard = useCallback((id) => {
    setChain(null);
    setHover(null);
    setPinned(id);
    applied.current = id;
    navigate({ id, clue: null }, true);
    panToCard(id);
  }, [navigate, panToCard]);

  /** Close whatever the panel holds and hand focus back to the card it opened
   *  from, so a keyboard reader is never dropped on <body>. */
  const leave = useCallback(() => {
    const back = pinned || (chain && chain.length ? chain[Math.min(step, chain.length - 1)].to : null);
    setChain(null);
    setHover(null);
    setPinned(null);
    navigate({ clue: null, id: null }, true);
    if (back) {
      const el = document.getElementById('card-' + back);
      if (el) el.focus({ preventScroll: true });
    }
  }, [pinned, chain, step, navigate]);

  /** Put a walked chain on the board at one of its steps, and pan to it. */
  const showChain = useCallback((steps, index, replaceUrl) => {
    setPinned(null);
    setHover(null);
    setChain(steps);
    setStep(index);
    applied.current = steps[index].from + '>' + steps[index].to;
    if (replaceUrl) navigate({ clue: { from: steps[index].from, to: steps[index].to }, id: null }, true);
    requestAnimationFrame(() => centre(steps[index]));
  }, [navigate, centre]);

  /** Open one specific string as a walked clue. buildChain only ever follows the
   *  first-authored link at each hop, so without naming the parent, a share of
   *  the strings could not be reached from any click at all. */
  const openClue = useCallback((from, to) => {
    const built = buildChain(graph, to, from);
    const index = built.steps.findIndex((s) => s.from === from && s.to === to);
    if (index >= 0) showChain(built.steps, index, true);
  }, [graph, showChain]);

  const openChain = useCallback((id, atStep) => {
    const built = buildChain(graph, id);
    if (!built.steps.length) { focusCard(id); return; }
    showChain(built.steps, typeof atStep === 'number' ? atStep : built.start, true);
  }, [graph, showChain, focusCard]);

  // Deep links: ?id=… opens a card, ?clue=a>b opens the walkthrough at that string.
  useEffect(() => {
    const key = route.clue ? route.clue.from + '>' + route.clue.to : route.id || '';
    if (!key || key === applied.current || !board3.nodes.length) return;
    applied.current = key;
    if (route.clue) {
      const built = buildChain(graph, route.clue.to, route.clue.from);
      const index = built.steps.findIndex((s) => s.from === route.clue.from && s.to === route.clue.to);
      if (index >= 0) { showChain(built.steps, index, false); return; }
      // A clue that names no string on the board still names a card: land there
      // rather than on empty cork, and let the address say what was found.
      if (positions[route.clue.to]) {
        setPinned(route.clue.to);
        panToCard(route.clue.to);
        navigate({ id: route.clue.to, clue: null }, true);
      }
      return;
    }
    if (route.id && positions[route.id]) {
      setPinned(route.id);
      panToCard(route.id);
    }
  }, [route.id, route.clue, graph, positions, board3.nodes.length, showChain, panToCard, navigate]);

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
    if (next === step) return;
    setStep(next);
    applied.current = chain[next].from + '>' + chain[next].to;
    navigate({ clue: { from: chain[next].from, to: chain[next].to } }, true);
    centre(chain[next]);
  }, [chain, step, navigate, centre]);

  useEffect(() => {
    const onKey = (e) => {
      // The search field and the editor own their own keys.
      const t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
      if (e.key === 'Escape') {
        // One layer per press: a draft, then a chain, then a pinned card, then a preview.
        if (draft || connectFrom) { setDraft(null); setConnectFrom(null); return; }
        if (chain) { leave(); return; }
        if (pinned) { leave(); return; }
        setHover(null);
      }
      if (chain && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) { e.preventDefault(); move(e.key === 'ArrowRight' ? 1 : -1); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [chain, move, draft, connectFrom, pinned, leave]);

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
    let lo, hi;
    if (seen.length) {
      lo = Infinity; hi = -Infinity;
      seen.forEach((n) => { if (n.event.year < lo) lo = n.event.year; if (n.event.year > hi) hi = n.event.year; });
    } else {
      lo = yearAtFraction(fr(left)); hi = yearAtFraction(fr(right));
    }
    // State only when the readout would actually change: a scroll frame that
    // stays inside the same years must not re-render the board.
    setViewport((v) => (v[0] === lo && v[1] === hi ? v : [lo, hi]));

    if (thumbRef.current) {
      thumbRef.current.style.left = (left / el.scrollWidth * 100).toFixed(2) + '%';
      thumbRef.current.style.width = Math.max(4, el.clientWidth / el.scrollWidth * 100).toFixed(2) + '%';
    }
    if (scrubRef.current) scrubRef.current.setAttribute('aria-valuenow', String(Math.round(left / el.scrollWidth * 100)));

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

  // Wheel turns vertical scrolling into horizontal panning. React registers
  // onWheel as a passive listener, inside which preventDefault is a no-op that
  // logs an error on every tick — so this is attached natively, non-passive.
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const onWheel = (e) => {
      cancelPan();
      const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      const max = el.scrollWidth - el.clientWidth;
      if ((delta < 0 && el.scrollLeft > 0) || (delta > 0 && el.scrollLeft < max)) {
        e.preventDefault();
        el.scrollLeft = Math.min(max, Math.max(0, el.scrollLeft + delta));
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [cancelPan]);

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

  // The editor's state is read through a ref so this handler keeps one identity
  // and the memoised cards are not re-rendered every time the editor changes.
  const editor = useRef({ editing, connectFrom, board });
  editor.current = { editing, connectFrom, board };
  const clickCard = useCallback((event) => {
    if (dragged.current) return;
    const { editing: on, connectFrom: from, board: b } = editor.current;
    if (on) { setDraft({ ...event, note: event.summary, isNew: false }); return; }
    if (from) {
      if (from === event.id) { setConnectFrom(null); return; }
      const claim = window.prompt('What does this string claim? e.g. “provoked”, “funded”, “was the warning for”', 'led to');
      if (claim === null) { setConnectFrom(null); return; }
      const note = window.prompt('Case note (optional): explain the causal argument.', '') || '';
      b.addString({ from, to: event.id, claim: claim || 'led to', note });
      setConnectFrom(null);
      return;
    }
    focusCard(event.id);
  }, [focusCard]);
  const hoverable = canHover && !chain && !pinned;

  // The one first-time hint the board gives. Keys are only offered where a
  // keyboard is likely — a phone reader would only wonder where the arrows are.
  const keys = canHover ? ' · ← → to step · Esc to close' : '';
  const hint = chain
    ? 'Walking a chain' + keys
    : focusId
      ? 'Card selected · ' + ((graph.adjacency[focusId] || []).length) + ' strings attached'
      : graph.edges.length + ' strings · click a card to see what led to it and what it led to' + (canHover ? ' · Tab steps cards' : '');

  const panelOpen = !!(current || focusId);
  // A pinned card opens its panel for reading: focus goes to the panel's heading
  // so the next Tab reaches its buttons, and Escape returns to the card.
  const panelRef = useRef(null);
  useEffect(() => {
    if (!pinned || !panelRef.current) return;
    const h = panelRef.current.querySelector('h2, h3');
    if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
  }, [pinned]);
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
            <h1 style={{ margin: 0, font: '400 clamp(16px,1.7vw,21px)/1 ' + SERIF, letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>The board</h1>
            <span aria-live="polite" style={{ ...micro(chain ? 3 : 5), color: chain ? RED_LIT : undefined }}>{hint}</span>
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
                return <StringPath key={s.id} s={s} strong={!!(isStep || (!chain && onChain))} onChain={!!onChain} dim={!!active} />;
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
                animation: FADE
              }}>{s.claim}</div>
            ))}

            {board3.nodes.map((node) => {
              const e = node.event;
              return (
                <Card
                  key={e.id}
                  node={node}
                  m={m}
                  img={media(e).img}
                  lit={!active || active.includes(e.id)}
                  subject={current ? current.to === e.id : focusId === e.id}
                  raised={!!((current && (current.from === e.id || current.to === e.id)) || focusId === e.id)}
                  editing={editing}
                  hoverable={hoverable}
                  onClick={clickCard}
                  onHover={setHover}
                  onFocusCard={keepVisible}
                />
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
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', zIndex: 9 }}>
            <Empty noun="card" route={route} navigate={navigate} style={{ padding: 0 }} />
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
            ref={panelRef}
            role="complementary"
            aria-label="Card context"
            // Whatever the reader does inside the panel stays inside it. A wheel
            // or a finger that reaches the end of the panel's text must not carry
            // on into the canvas behind it, on any device.
            onWheel={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
            style={{
              position: 'absolute', zIndex: 22, height: panelContentH ? panelH : 'auto', maxHeight: PANEL_CAP,
              transition: panelContentH ? 'height .24s ' + EASE : 'none',
              ...(railMode
                ? { top: 0, right: 0, width: RAIL_W, border: '1px solid rgba(243,240,234,0.14)', borderTop: 'none', borderRight: 'none', borderBottomLeftRadius: 3, animation: 'slideInRight .24s ' + EASE + ' both' }
                : { left: 0, right: 0, ...(dockTop ? { top: 0 } : { bottom: 0 }),
                    [dockTop ? 'borderBottom' : 'borderTop']: '1px solid rgba(243,240,234,0.16)',
                    animation: (dockTop ? 'slideInDown' : 'slideInUp') + ' .24s ' + EASE + ' both' }),
              overflowY: panelContentH > PANEL_CAP ? 'auto' : 'hidden', overscrollBehavior: 'contain',
              touchAction: 'pan-y', WebkitOverflowScrolling: 'touch',
              pointerEvents: preview ? 'none' : 'auto',
              // Near-opaque rather than blurred: a backdrop filter over a canvas
              // that pans behind it is a GPU pass on every frame of every walk.
              background: 'rgba(10,10,11,0.985)'
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
              onExit={leave}
              onOpenChain={openChain}
              onOpenCard={focusCard}
              onOpenClue={openClue}
            />
           </div>
          </div>
        )}
      </div>

      <div
        ref={scrubRef}
        onPointerDown={onScrub}
        onKeyDown={(e) => {
          const el = scroller.current;
          if (!el) return;
          const step = el.clientWidth * 0.4;
          if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); panTo(el.scrollLeft + (e.key === 'ArrowRight' ? step : -step)); }
          if (e.key === 'Home') { e.preventDefault(); panTo(0); }
          if (e.key === 'End') { e.preventDefault(); panTo(el.scrollWidth); }
        }}
        tabIndex={0}
        role="scrollbar" aria-label="Pan the board" aria-controls="board-canvas" aria-orientation="horizontal" aria-valuenow={0}
        style={{ marginTop: 4, height: 12, position: 'relative', cursor: 'pointer', display: 'flex', alignItems: 'center', flex: 'none' }}>
        <div style={{ position: 'absolute', left: 0, right: 0, height: 3, background: 'rgba(243,240,234,0.1)', borderRadius: 2 }} />
        <div ref={thumbRef} style={{ position: 'absolute', left: 0, width: '20%', height: 8, background: CYAN, opacity: 0.7, borderRadius: 2 }} />
      </div>
    </div>
  );
}
