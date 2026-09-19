import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { THREADS, TICKS, FIRST, NOW, CATEGORIES, accent, buildChain, catLabel, catHue, fade, yearAtFraction } from '../lib/data.js';
import { PAD, metrics, layout, stringPath } from '../lib/layout.js';
import { leadById, leadChain } from '../lib/leads.js';
import { useMode } from '../lib/mode.js';
import { MANILA, MONO, PAPER, RED, RED_LIT, CYAN, SERIF, EASE, FADE, micro, paperInk } from '../lib/styles.js';
import { Empty, RouteProvider } from './kit.jsx';
import { panDuration, panPosition, rubberBand, sheetClaims, springDuration, springEasing } from '../lib/motion.js';
import CluePanel from './CluePanel.jsx';
import CardView from './CardView.jsx';

/* How the sheet settles on a stop: a spring, so it overshoots a touch and comes
   back, the way a native sheet does. `linear()` carries the real curve, with the
   finger's speed at release folded in; a browser without it gets a bezier that
   bounces the same amount from rest. Reduced motion zeroes the duration in CSS. */
const SPRING_MS = springDuration();
const HAS_LINEAR = typeof CSS !== 'undefined' && !!CSS.supports && CSS.supports('transition-timing-function', 'linear(0, 1)');
const settle = (v0 = 0) => 'transform ' + SPRING_MS + 'ms ' + (HAS_LINEAR ? springEasing({ v0 }) : 'cubic-bezier(.32,1.28,.5,1)');
const SHEET_TRANSITION = settle();
/** How far the sheet may bounce or be stretched past its top stop: the sheet
 *  is painted this much taller than it is, so the frame's floor never shows. */
const SHEET_TAIL = 72;

/* One card on the cork. Memoised on plain values, so a scroll, a drag frame or a
   hover elsewhere on the board does not reconcile it: only the card whose own
   lit / subject / raised state flipped renders again. */
const Card = React.memo(function Card({ node, m, img, lit, subject, raised, hoverable, onClick, onHover, onFocusCard }) {
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
        cursor: 'pointer',
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
        {m.side ? (
          // A short card: the text on the left, the photograph a square on the right.
          <span style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', gap: 6, alignItems: 'stretch' }}>
            <span style={{ flex: '1 1 auto', minWidth: 0, display: 'flex', flexDirection: 'column', paddingTop: 6 }}>
              <span style={{ flex: 'none', display: 'block', font: '500 8.5px/1 ' + MONO, letterSpacing: '0.14em', color: paperInk(0.72), fontVariantNumeric: 'tabular-nums' }}>{e.year}</span>
              <span style={{
                flex: '1 1 auto', display: '-webkit-box', WebkitBoxOrient: 'vertical',
                WebkitLineClamp: m.titleLines, overflow: 'hidden', marginTop: 3,
                font: '400 ' + m.titlePx + 'px/1.14 ' + SERIF, color: '#17161a'
              }}>{e.title}</span>
            </span>
            {img ? (
              <img src={img} alt="" loading="lazy" decoding="async" style={{ flex: 'none', width: m.thumb, height: m.thumb, objectFit: 'cover', display: 'block', border: '1px solid rgba(23,22,26,0.22)', filter: 'grayscale(0.35) sepia(0.16) contrast(1.05)' }} />
            ) : (
              <span aria-hidden="true" style={{
                flex: 'none', width: m.thumb, height: m.thumb, border: '1px solid rgba(23,22,26,0.22)',
                background: 'repeating-linear-gradient(135deg,rgba(23,22,26,0.07) 0 5px,transparent 5px 10px)'
              }} />
            )}
          </span>
        ) : (<>
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
        </>)}
        {m.showCat && (
          <span style={{ flex: 'none', display: 'block', marginTop: 4, font: '400 7.5px/1 ' + MONO, letterSpacing: '0.18em', textTransform: 'uppercase', color: e.future ? 'oklch(0.45 0.16 25)' : paperInk(0.65) }}>
            {e.future ? 'Scenario · ' + (e.confidence || 'Uncertain') : catLabel(e.category)}
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

/** Where the board was left, as a fraction of its width, so returning to it
 *  without a card in the address lands where the reader was — not at 1900. */
let lastFraction = null;

/** The address a walked step writes: ?lead=&rung= for a rung, ?clue=a>b for a string. */
const keyOf = (s) => (s.lead ? 'lead:' + s.lead + ':' + s.rung : s.from + '>' + s.to);
const patchOf = (s) => (s.lead
  ? { lead: s.lead, rung: s.rung, clue: null, id: null }
  : { clue: { from: s.from, to: s.to }, id: null, lead: null, rung: null });

export default function BoardView({ items, graph, media, route, navigate, onYear, full }) {
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
  // The file: the pinned card's whole dossier, opened inside the board's panel
  // so a reader can dig without leaving the wall. Closed by Escape, by closing
  // the card, or by opening another one.
  const [fileOpen, setFileOpen] = useState(false);
  const [, setMode] = useMode();

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

  // The frame measures itself, so anything else in the column simply takes room
  // from the lanes instead of overflowing. It is
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
  // In brief the wall shows its landmarks and whatever the reader has open: the
  // pinned card, the card or clue the address names, and every card on a walked
  // chain — all of it, from the first step, so stepping never re-lays the board.
  // Keyed on the ids as a string, not on the route object: a step rewrites
  // route.clue, and the wall must not be laid out again for the same set.
  const keepKey = [pinned, route.id, route.clue && route.clue.from, route.clue && route.clue.to,
    ...(chain ? chain.flatMap((s) => [s.from, s.to]) : [])].filter(Boolean).sort().join('|');
  const visible = useMemo(() => {
    if (full) return items;
    const keep = new Set(keepKey ? keepKey.split('|') : []);
    return items.filter((e) => e.landmark || keep.has(e.id));
  }, [items, full, keepKey]);
  // On a wide screen the panel is a rail down the right edge and takes that much
  // of the frame from the board; on a narrow one it is a sheet and takes none.
  const railMode = box.w >= 900;
  const RAIL_W = railMode ? (fileOpen ? Math.min(760, Math.round(box.w * 0.58)) : Math.min(440, Math.round(box.w * 0.36))) : 0;
  const board3 = useMemo(() => layout(visible, m), [visible, m]);
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
  // A walked lead: the ladder is drawn through its rungs in the lead's own hue,
  // and every rung card wears its number.
  const lead = current && current.lead ? leadById[current.lead] : null;
  const ladder = useMemo(() => {
    if (!lead) return null;
    const rungs = lead.rungs.map((r, i) => ({ ...r, n: i + 1, p: positions[r.event] })).filter((r) => r.p);
    const segs = rungs.slice(1).map((r, i) => ({ from: rungs[i], to: r, ...stringPath(rungs[i].p, r.p, m.gutter) }));
    return { rungs, segs, tone: 'oklch(0.82 0.13 ' + lead.hue + ')' };
  }, [lead, positions, m.gutter]);

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
  // How much of the frame's bottom the sheet covers on a narrow screen; the
  // canvas is given that much extra height so a card can be scrolled above it.
  const sheetInset = useRef(0);
  const panelInner = useRef(null);
  const [panelContentH, setPanelContentH] = useState(0);
  const cancelPan = useCallback(() => {
    if (panAnim.current !== null) { cancelAnimationFrame(panAnim.current); panAnim.current = null; }
  }, []);
  // Set once the reader pans by hand. Until then the board may re-place the
  // card the address names whenever its own geometry changes underneath it.
  const settled = useRef(false);
  const takeOver = useCallback(() => { settled.current = true; cancelPan(); }, [cancelPan]);

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

  /** On a narrow screen the sheet covers the bottom of the frame: scroll the
   *  canvas so the card sits above it, and never let it hide under the top. */
  const keepAbove = useCallback((id) => {
    const el = scroller.current;
    const p = positions[id];
    const inset = sheetInset.current;
    if (!el || !p || !inset) return;
    const room = el.clientHeight - inset;
    const bottom = p.top + m.cardH;
    if (bottom - el.scrollTop > room) el.scrollTop = Math.max(0, Math.min(el.scrollHeight - el.clientHeight, bottom - room + 8));
    else if (p.top < el.scrollTop) el.scrollTop = Math.max(0, p.top - 8);
  }, [positions, m.cardH]);

  const centre = useCallback((stepData) => {
    const el = scroller.current;
    if (!el || !stepData) return;
    const a = positions[stepData.from];
    const b = positions[stepData.to];
    if (!a || !b) return;
    // Both ends in view when the frame allows it; when it does not — a phone,
    // or two cards a decade apart — the card the step arrives at, centred.
    const usable = el.clientWidth - railInset.current;
    const fits = Math.abs(b.x - a.x) + m.cardW + 24 <= usable;
    panTo((fits ? (a.x + b.x) / 2 : b.x) - usable / 2);
    if (sheetInset.current) keepAbove(stepData.to);
    else if (el.scrollHeight > el.clientHeight) el.scrollTop = Math.max(0, (fits ? (a.y + b.y) / 2 : b.y) - el.clientHeight / 2);
  }, [positions, panTo, m.cardW, keepAbove]);

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
    if (el && positions[id]) { panTo(positions[id].x - (el.clientWidth - railInset.current) / 2); keepAbove(id); }
  }, [positions, panTo, keepAbove]);

  /** The same, at once: for arriving on the board, where a flight across ninety
   *  years from the left edge would be a spectacle, not a transition. */
  const placeCard = useCallback((id) => {
    const el = scroller.current;
    if (!el || !positions[id]) return;
    cancelPan();
    el.scrollLeft = positions[id].x - (el.clientWidth - railInset.current) / 2;
    keepAbove(id);
  }, [positions, cancelPan, keepAbove]);

  // A card opened in brief that is not yet on the wall is laid out on the next
  // render; the pan to it waits for its position.
  const pendingPan = useRef(null);
  const focusCard = useCallback((id) => {
    setChain(null);
    setHover(null);
    // The file stays open across cards: a name clicked inside one dossier
    // opens the next dossier in the same drawer, so digging never leaves the wall.
    setPinned(id);
    applied.current = id;
    navigate({ id, clue: null, lead: null, rung: null }, true);
    // Never from this render's positions: clearing a chain or opening a card
    // in brief re-lays the wall, and the pan must use the layout that results.
    pendingPan.current = id;
  }, [navigate]);
  useEffect(() => {
    const id = pendingPan.current;
    if (id && positions[id]) { pendingPan.current = null; panToCard(id); }
  });

  /** Close whatever the panel holds and hand focus back to the card it opened
   *  from, so a keyboard reader is never dropped on <body>. */
  const leave = useCallback(() => {
    const back = pinned || (chain && chain.length ? chain[Math.min(step, chain.length - 1)].to : null);
    setChain(null);
    setHover(null);
    setPinned(null);
    setFileOpen(false);
    navigate({ clue: null, id: null, lead: null, rung: null }, true);
    // In brief a card that was only on the wall because it was open leaves it
    // now; focus goes to the scrubber instead of being dropped on <body>.
    const stays = back && graph.index[back] && (full || graph.index[back].landmark);
    const el = stays ? document.getElementById('card-' + back) : scrubRef.current;
    if (el) el.focus({ preventScroll: true });
  }, [pinned, chain, step, navigate, full, graph.index]);

  /** Put a walked chain on the board at one of its steps, and pan to it. */
  // The step to centre on is remembered and centred after the render that
  // places it: a chain opened in brief may add cards to the wall, and a pan
  // computed from the positions before that render would miss them.
  const wantCentre = useRef(null);
  const showChain = useCallback((steps, index, replaceUrl) => {
    setPinned(null);
    setHover(null);
    setFileOpen(false);
    setChain(steps);
    setStep(index);
    applied.current = keyOf(steps[index]);
    wantCentre.current = steps[index];
    if (replaceUrl) navigate(patchOf(steps[index]), true);
  }, [navigate]);
  useEffect(() => {
    const s = wantCentre.current;
    if (!s || !positions[s.from] || !positions[s.to]) return;
    wantCentre.current = null;
    centre(s);
  });

  /** Walk a lead from one of its rungs. */
  const openLead = useCallback((id, rung) => {
    const l = leadById[id];
    if (!l) return;
    const steps = leadChain(graph, l);
    if (!steps.length) return;
    const index = Math.max(0, Math.min(steps.length - 1, (rung || 1) - 1));
    showChain(steps, index, true);
  }, [graph, showChain]);

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

  // The board's geometry, as a stamp: it changes when the frame is measured or
  // resized, and a placement made before that is made again after it.
  const geometry = board3.width + '×' + m.lane + '×' + RAIL_W;

  // Leaving the board remembers where it was; coming back without an address
  // returns there once the frame is measured.
  // (Read from a ref kept by onScroll: by the time the cleanup runs the canvas
  // has left the DOM and measures as nothing.)
  const fraction = useRef(null);
  useEffect(() => () => { if (fraction.current !== null) lastFraction = fraction.current; }, []);
  const restoredAt = useRef('');
  useEffect(() => {
    const el = scroller.current;
    if (!el || route.id || route.clue || route.lead || lastFraction === null || settled.current || restoredAt.current === geometry) return;
    restoredAt.current = geometry;
    el.scrollLeft = lastFraction * (el.scrollWidth - el.clientWidth);
  }, [route.id, route.clue, route.lead, geometry]);

  // Deep links: ?id=… opens a card, ?clue=a>b opens the walkthrough at that string.
  // The board is laid out once with a guessed frame and again when the frame is
  // measured, so a card placed on the first pass can end up under the rail on the
  // second. The placement is therefore repeated whenever the geometry changes —
  // until the reader pans by hand, after which the view is theirs.
  const placedAt = useRef('');
  useEffect(() => {
    const key = route.lead ? 'lead:' + route.lead + ':' + (route.rung || 1) : route.clue ? route.clue.from + '>' + route.clue.to : route.id || '';
    if (!key || !board3.nodes.length) return;
    const fresh = key !== applied.current;
    if (!fresh && (settled.current || placedAt.current === geometry)) return;
    applied.current = key;
    placedAt.current = geometry;
    if (fresh) settled.current = false;
    // Only the geometry moved under an address the board has already answered:
    // put the same step or card back in view. Rebuilding the chain here would
    // walk from the current step's first-authored parent and could hand the
    // reader a different chain than the one they were stepping.
    if (!fresh) {
      if (current) centre(current);
      else if (pinned && positions[pinned]) placeCard(pinned);
      return;
    }
    if (route.lead) {
      const l = leadById[route.lead];
      const steps = l ? leadChain(graph, l) : [];
      if (steps.length) { showChain(steps, Math.max(0, Math.min(steps.length - 1, (route.rung || 1) - 1)), false); return; }
      navigate({ lead: null, rung: null }, true);
      return;
    }
    if (route.clue) {
      const built = buildChain(graph, route.clue.to, route.clue.from);
      const index = built.steps.findIndex((s) => s.from === route.clue.from && s.to === route.clue.to);
      if (index >= 0) { showChain(built.steps, index, false); return; }
      // A clue that names no string on the board still names a card: land there
      // rather than on empty cork, and let the address say what was found.
      if (positions[route.clue.to]) {
        setPinned(route.clue.to);
        placeCard(route.clue.to);
        navigate({ id: route.clue.to, clue: null }, true);
      }
      return;
    }
    if (route.id && positions[route.id]) {
      setPinned(route.id);
      placeCard(route.id);
    }
  }, [route.id, route.clue, route.lead, route.rung, graph, positions, board3.nodes.length, geometry, showChain, placeCard, navigate, current, pinned, centre]);

  // Brief and full lay the axis out differently — a hundred cards more or fewer
  // warp it by thousands of pixels — so a switch puts back what the reader was
  // looking at: the open card, the current step, or else the year at the head
  // of the frame.
  const headYear = useRef(null);
  const wasFull = useRef(full);
  useEffect(() => {
    if (wasFull.current === full) return;
    wasFull.current = full;
    const el = scroller.current;
    if (!el) return;
    cancelPan();
    if (current) { centre(current); return; }
    if (pinned && positions[pinned]) { placeCard(pinned); return; }
    if (headYear.current !== null) {
      el.scrollLeft = Math.max(0, board3.xOf(headYear.current) - Math.min(el.clientWidth * 0.4, 380));
      onScroll();
    }
  }, [full]); // eslint-disable-line react-hooks/exhaustive-deps

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
    applied.current = keyOf(chain[next]);
    navigate(patchOf(chain[next]), true);
    wantCentre.current = chain[next];
  }, [chain, step, navigate]);

  useEffect(() => {
    const onKey = (e) => {
      // The search field owns its own keys, and so does the header's sheet.
      const t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
      if (t && t.closest && t.closest('[role="dialog"]')) return;
      if (e.key === 'Escape') {
        // One layer per press: the file, then a chain, then a pinned card, then a preview.
        if (fileOpen) { setFileOpen(false); return; }
        if (chain) { leave(); return; }
        if (pinned) { leave(); return; }
        setHover(null);
      }
      if (chain && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) { e.preventDefault(); move(e.key === 'ArrowRight' ? 1 : -1); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [chain, move, pinned, leave, fileOpen]);

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

    fraction.current = max > 0 ? left / max : 0;
    if (thumbRef.current) {
      thumbRef.current.style.left = (left / el.scrollWidth * 100).toFixed(2) + '%';
      thumbRef.current.style.width = Math.max(4, el.clientWidth / el.scrollWidth * 100).toFixed(2) + '%';
    }
    if (scrubRef.current) scrubRef.current.setAttribute('aria-valuenow', String(Math.round(left / el.scrollWidth * 100)));

    if (onYear) {
      const head = left + Math.min(el.clientWidth * 0.4, 380);
      let nearest = null;
      board3.nodes.forEach((n) => { if (!nearest || Math.abs(n.x - head) < Math.abs(nearest.x - head)) nearest = n; });
      headYear.current = nearest ? nearest.event.year : yearAtFraction(fr(head));
      onYear(String(headYear.current), max > 0 ? left / max : 0);
    }
  }, [board3.width, board3.nodes, m.cardW, onYear]);

  useEffect(() => { onScroll(); }, [onScroll]);

  const onPointerDown = (e) => {
    if (e.button !== 0) return;
    const el = scroller.current;
    if (!el) return;
    takeOver();
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
      takeOver();
      const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      const max = el.scrollWidth - el.clientWidth;
      if ((delta < 0 && el.scrollLeft > 0) || (delta > 0 && el.scrollLeft < max)) {
        e.preventDefault();
        el.scrollLeft = Math.min(max, Math.max(0, el.scrollLeft + delta));
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [takeOver]);

  const onScrub = (e) => {
    takeOver();
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

  // One identity, so the memoised cards are not re-rendered on every render.
  const clickCard = useCallback((event) => {
    if (dragged.current) return;
    focusCard(event.id);
  }, [focusCard]);
  const hoverable = canHover && !chain && !pinned;

  // The one first-time hint the board gives. Keys are only offered where a
  // keyboard is likely — a phone reader would only wonder where the arrows are.
  const keys = canHover ? ' · ← → to step · Esc to close' : '';
  const hint = chain
    ? (lead ? 'Following a lead · ' + lead.title : 'Walking a chain') + keys
    : focusId
      ? 'Card selected · ' + ((graph.adjacency[focusId] || []).length) + ' strings attached'
      : graph.edges.length + ' strings · click a card for what led to it and what followed';

  const panelOpen = !!(current || focusId);
  // A pinned card opens its panel for reading: focus goes to the panel's heading
  // so the next Tab reaches its buttons, and Escape returns to the card.
  const panelRef = useRef(null);
  useEffect(() => {
    if (!pinned || !panelRef.current) return;
    const h = panelRef.current.querySelector('h2, h3');
    if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
  }, [pinned]);
  // Opening or closing the file starts the panel at its top, and hands focus to
  // the file's own heading so a keyboard reader lands inside it.
  useEffect(() => {
    const el = panelRef.current;
    if (!el) return;
    el.scrollTop = 0;
    // Whichever way it went, the panel's heading takes focus: into the file on
    // opening, back to the card on closing, never dropped on <body>.
    const h = el.querySelector('h1, h2, h3');
    if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
  }, [fileOpen]);
  // A hover preview must never steal the hover that produced it, so it lets the
  // pointer straight through.
  const preview = !current && !pinned && !!hover;

  // The context panel is always in one place, whatever card is selected and
  // whether it was hovered or clicked. On a wide screen it is a rail down the
  // right edge that never covers a lane. On a narrow one it is a sheet at the
  // bottom with three heights — a peek strip that only says what is selected,
  // half the frame, and nearly all of it — pulled between them by its handle,
  // so the wall is never covered unless the reader asks for it.
  // The rail, and the sheet's larger heights, are exactly as tall as what they
  // hold, up to the cap, and scroll past it. Never a fixed block with dead
  // space under short content, and never a snap between sizes: the height is
  // measured and the change is animated.
  const PEEK_H = 58;
  const CAP = { half: Math.max(180, Math.round(shellH * 0.46)), full: Math.max(240, Math.round(shellH * 0.8)) };
  const [sheet, setSheet] = useState('half');
  // The sheet is always its full height and is slid down by what is not shown,
  // so pulling it moves a transform — composited, no layout per frame — and
  // the content below the fold is reachable by scroll because the inner block
  // carries that much padding.
  const stopH = (which) => (which === 'peek' ? PEEK_H : Math.min(CAP[which], Math.max(PEEK_H, panelContentH || CAP[which])));
  const shown = railMode ? 0 : stopH(sheet);
  sheetInset.current = railMode || !panelOpen ? 0 : shown;
  // The sheet slides in by the same transform it is pulled with: it mounts
  // below the frame and moves up on the next frame. (A keyframe animation
  // would do — but one that ends on `transform: none` and fills forwards
  // would pin the sheet there, over the transform the drag writes.)
  const [sheetIn, setSheetIn] = useState(false);
  useEffect(() => {
    if (!panelOpen || railMode) { setSheetIn(false); return undefined; }
    const id = requestAnimationFrame(() => setSheetIn(true));
    return () => cancelAnimationFrame(id);
  }, [panelOpen, railMode]);
  const PANEL_CAP = railMode ? box.h : CAP.full;
  const panelH = railMode ? (fileOpen ? PANEL_CAP : Math.min(PANEL_CAP, panelContentH || PANEL_CAP)) : CAP.full;
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
  // The sheet opens at half when the selected card sits in the upper part of
  // the frame, where half a sheet leaves it in view; when the card sits low it
  // opens as the peek strip, so the reader sees what they selected and pulls
  // the sheet up when they want to read. The file always takes the full height.
  const wasOpen = useRef(false);
  const subjectId = current ? current.to : focusId;
  useEffect(() => {
    if (railMode) return;
    const opening = panelOpen && !wasOpen.current;
    wasOpen.current = panelOpen;
    if (!panelOpen) return;
    if (fileOpen) { setSheet('full'); return; }
    if (opening) setSheet(subject && box.h && subject.y > box.h * 0.52 ? 'peek' : 'half');
  }, [panelOpen, fileOpen, railMode, subjectId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!fileOpen && !railMode && sheet === 'full') setSheet('half'); }, [fileOpen]); // eslint-disable-line react-hooks/exhaustive-deps
  // As the sheet grows the selected card is kept above it; as it shrinks the
  // canvas is let back down.
  useEffect(() => {
    if (railMode || !subjectId) return;
    if (shown) keepAbove(subjectId);
    else if (scroller.current) scroller.current.scrollTop = 0;
  }, [shown, railMode]); // eslint-disable-line react-hooks/exhaustive-deps

  // Pulling the sheet: the whole of it is the handle, as on a phone. A touch
  // that starts to move is the sheet's or the content's by the native rule
  // (sheetClaims): the content scrolls only at the top stop, or when it is
  // pulled back down from part-way through; otherwise the finger has the
  // sheet, which follows it, one transform per animation frame, and past either
  // end gives less and less — the rubber band. On release it springs to the
  // nearest of the three stops — or, after a flick, to the next stop in that
  // direction — at the speed the finger let go, so a flick carries through and
  // a slow pull settles softly. A tap on the strip toggles peek and half; a
  // tap anywhere else is the tap it was, on whatever it landed on.
  //
  // The decision is made on the first movement and never revisited, and the
  // touchmove that carries it is cancelled from a listener that can cancel it
  // (React's own is passive), so the browser's scroll never starts under a pull.
  // The pointer is only captured once the pull is a pull: capturing on the
  // press would take the click away from the button under the finger.
  const sheetDrag = useRef(null);
  const sheetAtTop = useRef(false);
  sheetAtTop.current = sheet === 'full';
  const claim = (d, dx, dy) => {
    if (d.claimed !== null) return d.claimed;
    // A mouse gets a little slack, so a press with a wobble is still a click,
    // and a drag on text is not a selection.
    if (d.mouse && Math.abs(dx) < 6 && Math.abs(dy) < 6) return null;
    d.claimed = sheetClaims({ dx, dy, scrollTop: d.scrollTop, atTop: sheetAtTop.current, onHandle: false });
    if (d.claimed === 'sheet' && panelRef.current) {
      panelRef.current.style.transition = 'none';
      if (d.mouse) { panelRef.current.style.userSelect = 'none'; const sel = window.getSelection(); if (sel) sel.removeAllRanges(); }
    }
    return d.claimed;
  };
  useEffect(() => {
    const el = panelRef.current;
    if (!el || railMode || !panelOpen) return undefined;
    const block = (e) => {
      const d = sheetDrag.current;
      if (!d || e.touches.length !== 1) return;
      const t = e.touches[0];
      if (claim(d, t.clientX - d.x0, t.clientY - d.y0) === 'sheet' && e.cancelable) e.preventDefault();
    };
    el.addEventListener('touchmove', block, { passive: false });
    return () => el.removeEventListener('touchmove', block);
  }, [railMode, panelOpen]); // eslint-disable-line react-hooks/exhaustive-deps
  const onSheetDown = (e) => {
    if (railMode || e.button !== 0) return;
    const el = panelRef.current;
    if (!el) return;
    const onHandle = !!(e.target.closest && e.target.closest('[data-sheet-handle]'));
    sheetDrag.current = {
      x0: e.clientX, y0: e.clientY, h0: shown, h: shown, moved: false, t: performance.now(), y: e.clientY, v: 0, raf: null,
      onHandle, claimed: onHandle ? 'sheet' : null, scrollTop: el.scrollTop, mouse: e.pointerType === 'mouse', captured: false
    };
    if (onHandle) el.style.transition = 'none';
  };
  const onSheetMove = (e) => {
    const d = sheetDrag.current;
    const el = panelRef.current;
    if (!d || !el) return;
    if (claim(d, e.clientX - d.x0, e.clientY - d.y0) !== 'sheet') return;
    const now = performance.now();
    // Velocity in px/ms, smoothed, from the last few moves.
    const dt = Math.max(1, now - d.t);
    d.v = 0.6 * d.v + 0.4 * ((d.y - e.clientY) / dt);
    d.t = now; d.y = e.clientY;
    const dy = d.y0 - e.clientY;
    if (Math.abs(dy) > 6 && !d.moved) {
      d.moved = true;
      // Now that it is a pull, the panel keeps the pointer past its own edges.
      try { el.setPointerCapture(e.pointerId); d.captured = true; } catch { /* a pointer already gone: the up still arrives */ }
    }
    const raw = d.h0 + dy;
    d.h = raw > CAP.full ? CAP.full + rubberBand(raw - CAP.full) : raw < PEEK_H ? PEEK_H - rubberBand(PEEK_H - raw) : raw;
    if (d.raf === null) {
      d.raf = requestAnimationFrame(() => {
        d.raf = null;
        el.style.transform = 'translateY(' + (CAP.full - d.h) + 'px)';
      });
    }
  };
  const onSheetUp = () => {
    const d = sheetDrag.current;
    const el = panelRef.current;
    sheetDrag.current = null;
    if (!d || !el) return;
    if (d.raf !== null) cancelAnimationFrame(d.raf);
    if (d.mouse) el.style.userSelect = '';
    // The content's touch: the sheet was never its. A press off the strip that
    // never became a pull: the sheet did not move, and only gets its transition
    // back, so the next stop it is given is still animated.
    if (d.claimed !== 'sheet') return;
    if (!d.moved && !d.onHandle) { el.style.transition = SHEET_TRANSITION; return; }
    // A finger that stopped before lifting was not a flick.
    if (performance.now() - d.t > 80) d.v = 0;
    const stops = ['peek', 'half', 'full'].map((k) => [k, stopH(k)]);
    let next;
    if (!d.moved) next = sheet === 'peek' ? 'half' : 'peek';
    else if (Math.abs(d.v) > 0.45) {
      // A flick goes one stop in its direction; a slow pull lands at the nearest.
      const hit = d.v > 0 ? stops.find((st) => st[1] > d.h + 4) : stops.slice().reverse().find((st) => st[1] < d.h - 4);
      next = hit ? hit[0] : null;
    }
    if (!next) next = stops.reduce((best, st) => (Math.abs(st[1] - d.h) < Math.abs(best[1] - d.h) ? st : best))[0];
    // The finger's speed at release, in whole distances a second toward the
    // stop, held to what a spring can take; the transition end restores the
    // resting spring, which is the transition React believes the sheet holds.
    // The transform is set to exactly what React will render for the stop, and
    // React only rewrites a style whose value changed since its last render, so
    // the settle is never interrupted whether or not the stop changes.
    const dist = stopH(next) - d.h;
    const v0 = Math.abs(dist) < 1 ? 0 : Math.max(-3, Math.min(12, (d.v * 1000) / dist));
    el.style.transition = settle(v0);
    el.style.transform = 'translateY(' + (CAP.full - stopH(next)) + 'px)';
    setSheet(next);
  };
  const onSheetSettled = (e) => {
    if (e.target === e.currentTarget && e.propertyName === 'transform' && !sheetDrag.current) e.currentTarget.style.transition = SHEET_TRANSITION;
  };
  const peekLabel = current && current.lead
    ? 'Rung ' + current.rung + ' / ' + current.of + ' · ' + (leadById[current.lead] ? leadById[current.lead].title : '')
    : current
      ? 'Clue ' + (step + 1) + ' / ' + chain.length + ' · ' + graph.index[current.from].year + ' → ' + graph.index[current.to].year + ' ' + graph.index[current.to].title
      : focusId && graph.index[focusId]
        ? graph.index[focusId].year + ' · ' + graph.index[focusId].title
        : '';
  railInset.current = RAIL_W;

  return (
    <div
      ref={root}
      style={{
        height: shellH, display: 'flex', flexDirection: 'column', overflow: 'hidden',
        padding: '0 clamp(10px,1.6vw,20px) 6px', boxSizing: 'border-box'
      }}
    >
      {/* The status row. One line, always: the hint changes with every hover,
          and if this row could wrap, the board below would re-measure and jump
          on each one. The hint ellipsises and the legend scrolls instead. */}
      <div style={{ flex: 'none', paddingTop: 9 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'nowrap', minWidth: 0, marginBottom: 10 }}>
          <h1 style={{ margin: 0, font: '400 clamp(16px,1.7vw,21px)/1 ' + SERIF, letterSpacing: '-0.02em', whiteSpace: 'nowrap', flex: 'none' }}>The board</h1>
          <span aria-live="polite" style={{ ...micro(chain ? 3 : 5), color: chain ? RED_LIT : undefined, flex: '0 1 auto', minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{hint}</span>
          <span style={{ flex: 1 }} />
          <div style={{
            display: 'flex', gap: box.w < 820 ? 10 : 14, alignItems: 'center', minWidth: 0, flex: '0 1 auto',
            flexWrap: 'nowrap', overflowX: 'auto', overflowY: 'hidden', maxWidth: '100%', scrollbarWidth: 'none'
          }}>
            <span style={{ ...micro(5), flex: 'none' }}>Colour is the category · lanes are the threads</span>
            {CATEGORIES.map((c) => (
              <span key={c.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flex: 'none', ...micro(5), letterSpacing: '0.14em' }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', display: 'inline-block', background: accent(c.id, 0) }} />
                {c.label}
              </span>
            ))}
          </div>
          <span style={{ ...micro(0.5), letterSpacing: '0.18em', display: 'inline-flex', alignItems: 'center', gap: 7, whiteSpace: 'nowrap' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: CYAN, animation: 'hudPulse 2.4s ease-in-out infinite' }} />
            {viewport[0]} — {viewport[1]}
          </span>
        </div>
      </div>

      <div ref={frameRef} style={{ position: 'relative', flex: 1, minHeight: 0, overflow: 'clip' }}>
        <div
          ref={scroller}
          onScroll={onScroll}
          onPointerDown={onPointerDown}
          id="board-canvas"
          style={{
            position: 'absolute', inset: 0, overflowX: 'auto', overflowY: m.fits && !sheetInset.current ? 'hidden' : 'auto',
            border: '1px solid rgba(243,240,234,0.12)', borderRadius: 3, cursor: 'grab', touchAction: m.fits && !sheetInset.current ? 'pan-x' : 'auto',
            background: 'radial-gradient(120% 90% at 20% 0%,#171310,#08080a 70%)'
          }}
        >
          <div style={{ position: 'relative', width: board3.width, height: board3.height + sheetInset.current, minWidth: '100%' }}>
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
              {/* The ladder: a lead's rungs joined in order, in the lead's hue,
                  dashed where the board draws no string of its own. The segment
                  into the current rung is lit. */}
              {ladder && ladder.segs.map((g) => {
                const lit = current && g.to.event === current.to && g.from.event === current.from;
                return (
                  <g key={'lead-' + g.to.event} style={{ opacity: lit ? 1 : 0.55 }}>
                    {lit && <path d={g.d} style={{ fill: 'none', stroke: ladder.tone, strokeWidth: 9, opacity: 0.2, filter: 'blur(4px)' }} />}
                    <path d={g.d} style={{ fill: 'none', stroke: '#0a0a0b', strokeWidth: 4.4, strokeLinecap: 'round', opacity: 0.6 }} />
                    <path d={g.d} style={{ fill: 'none', stroke: ladder.tone, strokeWidth: lit ? 2.6 : 1.8, strokeLinecap: 'round', strokeDasharray: '2 6' }} />
                  </g>
                );
              })}
            </svg>

            {ladder && ladder.rungs.map((r) => (
              <div key={'rung-' + r.event} aria-hidden="true" style={{
                position: 'absolute', left: r.p.x - m.cardW / 2 - 6, top: r.p.top - 8, zIndex: 14, pointerEvents: 'none',
                minWidth: 20, height: 20, padding: '0 5px', borderRadius: 10, boxSizing: 'border-box',
                background: current && current.to === r.event ? ladder.tone : '#0a0a0b', color: current && current.to === r.event ? '#0a0a0b' : ladder.tone,
                border: '1px solid ' + ladder.tone, display: 'flex', alignItems: 'center', justifyContent: 'center',
                font: '500 9.5px/1 ' + MONO, letterSpacing: '0.04em', boxShadow: '0 3px 8px rgba(0,0,0,0.5)', animation: FADE
              }}>{r.n}</div>
            ))}

            {strings.filter((s) => current
              ? (current.from === s.from && current.to === s.to) || (current.from === s.to && current.to === s.from)
              : active && (s.from === focusId || s.to === focusId)
            ).map((s) => (
              // The claim rides its string, above every card — a raised card
              // sits at 12, and a tag half-hidden behind it reads as a typo.
              <div key={'tag-' + s.id} style={{
                position: 'absolute', left: s.mx, top: s.my, transform: 'translate(-50%,-50%) rotate(-1.4deg)',
                zIndex: 14, pointerEvents: 'none', background: '#efe9da', color: '#17161a',
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

        {!visible.length && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', zIndex: 9 }}>
            {items.length ? (
              <div role="status" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, textAlign: 'center' }}>
                <span style={{ ...micro(5), letterSpacing: '0.14em' }}>
                  {items.length} {items.length === 1 ? 'card matches' : 'cards match'}, none of them a landmark — they are in the full file.
                </span>
                <div style={{ display: 'flex', gap: 10, pointerEvents: 'auto' }}>
                  <button type="button" onClick={() => setMode('full')} style={{ ...micro(1), background: 'rgba(255,80,60,0.1)', border: '1px solid ' + RED, borderRadius: 2, padding: '7px 12px', cursor: 'pointer', letterSpacing: '0.14em' }}>Switch to full</button>
                  <button type="button" onClick={() => navigate({ category: 'all', query: '' }, true)} style={{ ...micro(5), background: 'transparent', border: '1px solid rgba(243,240,234,0.2)', borderRadius: 2, padding: '7px 12px', cursor: 'pointer', letterSpacing: '0.14em' }}>Show everything</button>
                </div>
              </div>
            ) : (
              <Empty noun="card" route={route} navigate={navigate} style={{ padding: 0 }} />
            )}
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
            onTransitionEnd={onSheetSettled}
            onPointerDown={onSheetDown}
            onPointerMove={onSheetMove}
            onPointerUp={onSheetUp}
            onPointerCancel={onSheetUp}
            style={{
              position: 'absolute', zIndex: 22, height: railMode ? (panelContentH ? panelH : 'auto') : panelH, maxHeight: PANEL_CAP,
              transition: railMode
                ? (panelContentH ? 'height .24s ' + EASE : 'none')
                : SHEET_TRANSITION,
              ...(railMode
                ? { top: 0, right: 0, width: RAIL_W, border: '1px solid rgba(243,240,234,0.14)', borderTop: 'none', borderRight: 'none', borderBottomLeftRadius: 3, animation: 'slideInRight .24s ' + EASE + ' both' }
                : { left: 0, right: 0, bottom: 0, borderTop: '1px solid rgba(243,240,234,0.16)', borderTopLeftRadius: 10, borderTopRightRadius: 10,
                    // The second shadow is the tail: the sheet's own colour, hung
                    // below it, so a bounce or a stretch above the top stop shows
                    // more sheet and never the floor of the frame.
                    boxShadow: '0 -10px 30px rgba(0,0,0,0.45), 0 ' + SHEET_TAIL + 'px 0 rgba(10,10,11,0.985)',
                    // Mid-drag a render must not yank the sheet back to its stop.
                    transform: 'translateY(' + (sheetDrag.current ? CAP.full - sheetDrag.current.h : sheetIn ? CAP.full - shown : CAP.full) + 'px)',
                    willChange: 'transform' }),
              overflowY: !railMode && sheet === 'peek' ? 'hidden' : (railMode ? panelContentH > PANEL_CAP : panelContentH > shown) ? 'auto' : 'hidden', overscrollBehavior: 'contain',
              touchAction: 'pan-y', WebkitOverflowScrolling: 'touch',
              pointerEvents: preview ? 'none' : 'auto',
              // Near-opaque rather than blurred: a backdrop filter over a canvas
              // that pans behind it is a GPU pass on every frame of every walk.
              background: 'rgba(10,10,11,0.985)'
            }}
          >
           <div ref={panelInner}>
            {!railMode && (
              // The handle: a strip the sheet is pulled by, that names what is
              // selected so the peek state is never a blank bar.
              <div
                data-sheet-handle=""
                role="button"
                aria-label={sheet === 'peek' ? 'Expand the panel' : 'Collapse the panel'}
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSheet((v) => (v === 'peek' ? 'half' : 'peek')); } }}
                style={{
                  position: 'sticky', top: 0, zIndex: 3, display: 'flex', alignItems: 'center', gap: 10, height: PEEK_H, boxSizing: 'border-box',
                  padding: '14px 14px 8px', touchAction: 'none', cursor: 'grab', userSelect: 'none', background: 'rgba(10,10,11,0.985)',
                  borderBottom: sheet === 'peek' ? 'none' : '1px solid rgba(243,240,234,0.08)'
                }}
              >
                <span aria-hidden="true" style={{ position: 'absolute', left: '50%', top: 6, width: 36, height: 4, marginLeft: -18, borderRadius: 2, background: 'rgba(243,240,234,0.32)' }} />
                <span style={{ ...micro(current ? 3 : 4), color: current ? RED_LIT : undefined, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textTransform: 'none', letterSpacing: '0.08em', font: '400 11px/1.3 ' + MONO }}>{peekLabel}</span>
                <span style={{ flex: 1 }} />
                <span style={{ ...micro(5), flex: 'none' }}>{sheet === 'peek' ? 'pull up ▴' : sheet === 'full' ? 'pull down ▾' : '▴ ▾'}</span>
                <button
                  type="button"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={leave}
                  aria-label="Close"
                  style={{ ...micro(4), flex: 'none', background: 'transparent', border: '1px solid rgba(243,240,234,0.2)', borderRadius: 2, padding: '5px 8px', cursor: 'pointer' }}
                >✕</button>
              </div>
            )}
            {/* At peek the content below the strip is out of reach of the tab
                order too, so focus cannot drag the frame up to it. */}
            <div {...(!railMode && sheet === 'peek' ? { inert: '' } : {})}>
            {fileOpen && pinned && graph.index[pinned] ? (
              <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: '1px solid rgba(243,240,234,0.12)', position: 'sticky', top: 0, background: 'rgba(10,10,11,0.985)', zIndex: 2 }}>
                  <span style={{ ...micro(3), color: RED_LIT }}>The file</span>
                  <span style={{ ...micro(5), minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{graph.index[pinned].year} · {graph.index[pinned].title}</span>
                  <span style={{ flex: 1 }} />
                  <button type="button" onClick={() => setFileOpen(false)} style={{ ...micro(3), background: 'transparent', border: '1px solid rgba(243,240,234,0.2)', borderRadius: 2, padding: '6px 10px', cursor: 'pointer' }}>Back to the card</button>
                  <button type="button" onClick={leave} style={{ ...micro(5), background: 'transparent', border: '1px solid rgba(243,240,234,0.2)', borderRadius: 2, padding: '6px 10px', cursor: 'pointer' }}>Close</button>
                </div>
                {/* Links inside the file stay on the board: a card opens as the
                    pinned card, a clue opens as a walk, a lead as a ladder. Any
                    other page is a real navigation. Every href stays real. */}
                <RouteProvider value={{ route: { ...route, view: 'card', id: pinned, clue: null, lead: null, rung: null, hash: null }, navigate: (patch, replace) => {
                  if (patch.view === 'card' && patch.id) { focusCard(patch.id); return; }
                  if (patch.view === 'board' && patch.clue) { openClue(patch.clue.from, patch.clue.to); return; }
                  if (patch.view === 'board' && patch.lead) { openLead(patch.lead, patch.rung); return; }
                  if (patch.view === 'board' && patch.id) { focusCard(patch.id); return; }
                  navigate(patch, replace);
                } }}>
                  <CardView graph={graph} route={{ view: 'card', id: pinned }} media={media} embedded />
                </RouteProvider>
              </div>
            ) : (
            <CluePanel
              graph={graph}
              chain={chain}
              step={step}
              current={current}
              focus={focusId ? graph.index[focusId] : null}
              media={media}
              full={full}
              onStep={move}
              onJump={(index) => { setStep(index); applied.current = keyOf(chain[index]); navigate(patchOf(chain[index]), true); wantCentre.current = chain[index]; }}
              onExit={leave}
              onOpenChain={openChain}
              onOpenCard={focusCard}
              onOpenClue={openClue}
              onOpenLead={openLead}
              onOpenFile={pinned ? () => setFileOpen(true) : null}
            />
            )}
            </div>
           </div>
           {/* The fold: what the sheet hides below the frame, so the end of the
               content can be scrolled up into view. Not inside the measured block. */}
           {!railMode && <div aria-hidden="true" style={{ height: CAP.full - shown }} />}
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
