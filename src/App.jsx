import React, { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Header from './components/Header.jsx';
import { RouteProvider } from './components/kit.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import Landing from './components/Landing.jsx';
import About from './components/About.jsx';
import BoardStatic from './components/BoardStatic.jsx';
import ArchiveView from './components/ArchiveView.jsx';
import HorizonView from './components/HorizonView.jsx';
import CaseView from './components/CaseView.jsx';
import LineView from './components/LineView.jsx';
import FindingView from './components/FindingView.jsx';
import CardView from './components/CardView.jsx';
import LeadsView from './components/LeadsView.jsx';
import LeadView from './components/LeadView.jsx';
import FilesView from './components/FilesView.jsx';
import GlossaryView from './components/GlossaryView.jsx';
import EntityView from './components/EntityView.jsx';
import { buildGraph, events as canonEvents, forwardLedger, FIRST, NOW } from './lib/data.js';
import { useMedia } from './lib/wiki.js';
import { useRoute } from './lib/url.js';
import { useMode } from './lib/mode.js';
import { metaFor, applyMeta } from './lib/meta.js';
import { viewById } from './lib/views.js';
import { MONO, SANS, GUTTER, RULE, button, ink, shell } from './lib/styles.js';

/* The board is the one heavy view — the canvas, the drag, the pan animation —
   and the one a crawler gets nothing from. It is loaded when the reader opens
   it; the server renders its static listing instead. */
const BoardView = typeof window === 'undefined' ? BoardStatic : lazy(() => import('./components/BoardView.jsx'));

const isBrowser = typeof window !== 'undefined';

export default function App({ initialRoute }) {
  const [route, navigate] = useRoute(initialRoute);
  const graph = useMemo(() => buildGraph(), []);
  const media = useMedia(graph.all);
  const [mode, , full] = useMode();
  const [year, setYear] = useState(String(FIRST));
  // The 1px progress bar is painted straight into the DOM: a scroll must not
  // re-render the header and the whole page to move it.
  const barRef = useRef(null);
  const paint = (p) => { if (barRef.current) barRef.current.style.width = (p * 100).toFixed(2) + '%'; };

  const items = useMemo(() => {
    const q = route.query.trim().toLowerCase();
    return graph.all.filter((e) =>
      (route.category === 'all' || e.category === route.category) &&
      (!q || (e.title + ' ' + e.summary + ' ' + e.year).toLowerCase().includes(q))
    );
  }, [graph.all, route.category, route.query]);

  // In brief the board shows its landmarks — featured cards, rungs on a lead,
  // the ends of every case-noted string — plus whatever the reader has open;
  // the board itself decides that, since the walked chain lives there.
  const shown = useMemo(() => (full ? items.length : items.filter((e) => e.landmark).length), [items, full]);

  // The page scroll drives the year marker in every view except the board,
  // which reports its own horizontal position.
  useEffect(() => {
    if (route.view === 'board') return;
    const onScroll = () => {
      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      paint(max > 0 ? Math.min(1, window.scrollY / max) : 0);
      const nodes = document.querySelectorAll('[data-year]');
      let found = null;
      nodes.forEach((n) => { if (n.getBoundingClientRect().top < 180) found = n.getAttribute('data-year'); });
      setYear(found || String(items[0] ? items[0].year : FIRST));
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, [route.view, items]);

  // Every route carries its own title, description and canonical URL, so a
  // shared card or finding is not just "The AI Timeline" to a crawler or a
  // browser tab. The prerenderer writes the same meta into each page's HTML.
  useEffect(() => { applyMeta(metaFor(route, graph)); }, [route, graph]);

  // Moving to a different page should start it at the top — or at the section
  // the address names. Without this the browser keeps the previous page's
  // offset, so opening a finding from halfway down the Line drops you halfway
  // down the finding. Deep links to a card on the board are excluded — the board
  // scrolls itself to the card.
  const firstRoute = useRef(true);
  useEffect(() => {
    if (route.view === 'board') return;
    if (route.hash) {
      // The target may be rendered a frame later than the route; look twice.
      const jump = () => {
        const el = document.getElementById(route.hash);
        if (el) { el.scrollIntoView({ block: 'start', behavior: firstRoute.current ? 'instant' : 'smooth' }); return true; }
        return false;
      };
      if (!jump()) requestAnimationFrame(() => { if (!jump()) setTimeout(jump, 120); });
      firstRoute.current = false;
      return;
    }
    // base.css sets scroll-behavior: smooth, which is right for in-page jumps and
    // wrong here — a page transition would visibly glide up from the old offset
    // instead of simply starting at the top. Back returns to where the reader was.
    window.scrollTo({ top: route.pop || 0, left: 0, behavior: 'instant' });
    // A route change is announced by moving focus to the new page's heading —
    // except on first load, where the document itself is the announcement.
    if (firstRoute.current) { firstRoute.current = false; return; }
    const h1 = document.querySelector('main h1');
    if (h1 && !route.pop) { h1.setAttribute('tabindex', '-1'); h1.focus({ preventScroll: true }); }
  }, [route.view, route.finding, route.id, route.clue, route.pop, route.hash]);

  // The board is an application surface, not a document. While it is up the page
  // itself must not scroll — the canvas owns every axis of movement.
  useEffect(() => {
    if (route.view !== 'board') return;
    const html = document.documentElement;
    const body = document.body;
    const prev = {
      html: html.style.overflow, over: html.style.overscrollBehavior,
      body: body.style.overflow, position: body.style.position, inset: body.style.inset, width: body.style.width
    };
    html.style.overflow = 'hidden';
    html.style.overscrollBehavior = 'none';
    body.style.overflow = 'hidden';
    // iOS Safari lets a finger scroll and bounce the page straight through
    // overflow: hidden. Fixing the body is the one lock it honours; the board
    // fills the viewport, so there is no page offset to lose.
    body.style.position = 'fixed';
    body.style.inset = '0';
    body.style.width = '100%';
    window.scrollTo(0, 0);
    return () => {
      html.style.overflow = prev.html;
      html.style.overscrollBehavior = prev.over;
      body.style.overflow = prev.body;
      body.style.position = prev.position;
      body.style.inset = prev.inset;
      body.style.width = prev.width;
    };
  }, [route.view]);

  const openOnBoard = useCallback((id) => navigate({ view: 'board', id, clue: null, category: 'all', query: '' }), [navigate]);
  const onBoardPosition = useCallback((y, p) => { setYear(y); paint(p); }, []);

  const fwd = useMemo(() => forwardLedger(graph), [graph]);
  const status = route.view === 'board'
    ? shown + '/' + canonEvents.length + ' cards · ' + graph.edges.length + ' strings · ' + mode
    : route.view === 'horizon'
      ? fwd.argued + '/' + fwd.total + ' scenarios carry a string · ' + fwd.crossing + ' cross ' + NOW
      : route.view === 'case'
        ? fwd.crossing + ' strings cross ' + NOW + ' · ' + fwd.argued + '/' + fwd.total + ' scenarios argued'
        : items.length + '/' + canonEvents.length + ' entries · ' + mode;

  const view = route.view;
  const footKind = (viewById[view] && viewById[view].shell) || 'wide';

  return (
    <RouteProvider value={{ route, navigate }}>
      {/* Off-screen until it takes focus: the first Tab press offers a way past the chrome. */}
      <a
        href="#main"
        style={{ position: 'absolute', left: -9999, top: 8, zIndex: 100, ...button('loud') }}
        onFocus={(e) => { e.currentTarget.style.left = '8px'; }}
        onBlur={(e) => { e.currentTarget.style.left = '-9999px'; }}
      >Skip to content</a>
      <div style={{ position: 'fixed', inset: 0, zIndex: 60, pointerEvents: 'none', mixBlendMode: 'overlay', backgroundImage: 'repeating-linear-gradient(0deg,rgba(255,255,255,0.028) 0 1px,transparent 1px 3px)' }} />
      <Header route={route} navigate={navigate} year={year} barRef={barRef} status={status} graph={graph} />

      <ErrorBoundary resetKey={view + '|' + (route.finding || '') + '|' + (route.id || '')}>
        <main id="main" tabIndex={-1} style={{ outline: 'none' }}>
          {view === 'landing' && <Landing />}
          {view === 'about' && <About />}
          {view === 'board' && !isBrowser && <BoardStatic items={items} graph={graph} route={route} />}
          {view === 'board' && isBrowser && (
            <Suspense fallback={<BoardStatic items={items} graph={graph} route={route} loading />}>
              <BoardView
                items={items}
                graph={graph}
                media={media}
                route={route}
                navigate={navigate}
                onYear={onBoardPosition}
                full={full}
              />
            </Suspense>
          )}
          {(view === 'archive' || view === 'plates' || view === 'mosaic') && (
            <ArchiveView mode={view} items={items} media={media} route={route} navigate={navigate} />
          )}
          {view === 'horizon' && <HorizonView items={items} graph={graph} route={route} navigate={navigate} onOpen={openOnBoard} />}
          {view === 'case' && <CaseView graph={graph} />}
          {view === 'line' && <LineView graph={graph} />}
          {view === 'finding' && <FindingView graph={graph} route={route} navigate={navigate} onOpen={openOnBoard} media={media} />}
          {view === 'card' && <CardView graph={graph} route={route} media={media} />}
          {view === 'leads' && <LeadsView graph={graph} />}
          {view === 'lead' && <LeadView graph={graph} route={route} media={media} />}
          {view === 'files' && <FilesView graph={graph} />}
          {view === 'glossary' && <GlossaryView graph={graph} />}
          {(view === 'person' || view === 'org' || view === 'term') && <EntityView graph={graph} route={route} />}
        </main>
      </ErrorBoundary>

      {view !== 'landing' && view !== 'board' && (
        <footer style={{ ...shell(footKind), padding: '26px ' + GUTTER + ' 90px', borderTop: RULE, display: 'flex', gap: 34, flexWrap: 'wrap' }}>
          <p style={{ margin: 0, font: '400 11px/1.85 ' + MONO, color: ink(4), maxWidth: '46ch', textWrap: 'pretty' }}>
            The board's own text is CC BY-NC-ND 4.0; the code is PolyForm Noncommercial. Quoted sentences and photographs
            remain under their sources' licences — Wikipedia text is CC BY-SA 4.0.
          </p>
          <p style={{ margin: 0, font: '400 11px/1.85 ' + MONO, color: ink(4), maxWidth: '40ch', textWrap: 'pretty' }}>
            Entries after {NOW} are scenarios, not forecasts. The confidence label is the point;
            the date is a placeholder.
          </p>
          <p style={{ margin: 0, font: '400 11px/1.85 ' + SANS, color: ink(4), display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            <a href="https://github.com/mobahug/The_AI_Timeline">Source ↗</a>
            <a href="https://github.com/mobahug/The_AI_Timeline/blob/main/LICENSE">Licence ↗</a>
          </p>
        </footer>
      )}
    </RouteProvider>
  );
}
