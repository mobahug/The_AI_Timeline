import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Header from './components/Header.jsx';
import { RouteProvider } from './components/kit.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import Landing from './components/Landing.jsx';
import About from './components/About.jsx';
import BoardView from './components/BoardView.jsx';
import ArchiveView from './components/ArchiveView.jsx';
import HorizonView from './components/HorizonView.jsx';
import CaseView from './components/CaseView.jsx';
import LineView from './components/LineView.jsx';
import FindingView from './components/FindingView.jsx';
import CardView from './components/CardView.jsx';
import { buildGraph, events as canonEvents, forwardLedger, FIRST, NOW } from './lib/data.js';
import { useBoard } from './lib/board.js';
import { useMedia } from './lib/wiki.js';
import { useRoute } from './lib/url.js';
import { metaFor, applyMeta } from './lib/meta.js';
import { MONO, SANS, micro } from './lib/styles.js';

export default function App() {
  const [route, navigate] = useRoute();
  const board = useBoard();
  const graph = useMemo(() => buildGraph(board.board), [board.board]);
  const media = useMedia(graph.all);
  const [year, setYear] = useState(String(FIRST));
  const [progress, setProgress] = useState(0);

  const items = useMemo(() => {
    const q = route.query.trim().toLowerCase();
    return graph.all.filter((e) =>
      (route.category === 'all' || e.category === route.category) &&
      (!q || (e.title + ' ' + e.summary + ' ' + e.year).toLowerCase().includes(q))
    );
  }, [graph.all, route.category, route.query]);

  // The page scroll drives the year marker in every view except the board,
  // which reports its own horizontal position.
  useEffect(() => {
    if (route.view === 'board') return;
    const onScroll = () => {
      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? Math.min(1, window.scrollY / max) : 0);
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
  // browser tab. Social scrapers do not run JavaScript, so this alone does not
  // fix link previews — that needs prerendering — but it fixes everything else.
  useEffect(() => { applyMeta(metaFor(route, graph)); }, [route, graph]);

  // Moving to a different page should start it at the top. Without this the
  // browser keeps the previous page's offset, so opening a finding from halfway
  // down the Line drops you halfway down the finding. Deep links to a card are
  // excluded — those scroll themselves to the card.
  useEffect(() => {
    if (route.view === 'board') return;
    if (route.view !== 'card' && (route.id || route.clue)) return;
    // base.css sets scroll-behavior: smooth, which is right for in-page jumps and
    // wrong here — a page transition would visibly glide up from the old offset
    // instead of simply starting at the top.
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [route.view, route.finding, route.id, route.clue]);

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
  const onBoardPosition = useCallback((y, p) => { setYear(y); setProgress(p); }, []);

  const fwd = useMemo(() => forwardLedger(graph), [graph]);
  const status = route.view === 'board'
    ? items.length + '/' + canonEvents.length + ' cards · ' + graph.edges.length + ' strings'
    : route.view === 'horizon'
      ? fwd.argued + '/' + fwd.total + ' scenarios carry a string · ' + fwd.crossing + ' cross ' + NOW
      : route.view === 'case'
        ? fwd.crossing + ' strings cross ' + NOW + ' · ' + fwd.argued + '/' + fwd.total + ' scenarios argued'
        : items.length + '/' + canonEvents.length + ' entries';

  return (
    <RouteProvider value={{ route, navigate }}>
      <div style={{ position: 'fixed', inset: 0, zIndex: 60, pointerEvents: 'none', mixBlendMode: 'overlay', backgroundImage: 'repeating-linear-gradient(0deg,rgba(255,255,255,0.028) 0 1px,transparent 1px 3px)' }} />
      <Header route={route} navigate={navigate} year={year} progress={progress} status={status} />

      <ErrorBoundary resetKey={route.view + '|' + (route.finding || '') + '|' + (route.id || '')}>
        {route.view === 'landing' && <Landing navigate={navigate} />}
        {route.view === 'about' && <About />}
        {route.view === 'board' && (
          <BoardView
            items={items}
            graph={graph}
            media={media}
            route={route}
            navigate={navigate}
            board={board}
            onYear={onBoardPosition}
          />
        )}
        {(route.view === 'archive' || route.view === 'plates' || route.view === 'mosaic') && (
          <ArchiveView mode={route.view} items={items} media={media} navigate={navigate} onOpen={openOnBoard} />
        )}
        {route.view === 'horizon' && <HorizonView items={items} graph={graph} navigate={navigate} onOpen={openOnBoard} />}
        {route.view === 'case' && <CaseView graph={graph} navigate={navigate} onOpen={openOnBoard} />}
        {route.view === 'line' && <LineView graph={graph} navigate={navigate} onOpen={openOnBoard} />}
        {route.view === 'finding' && <FindingView graph={graph} route={route} navigate={navigate} onOpen={openOnBoard} media={media} />}
        {route.view === 'card' && <CardView graph={graph} route={route} navigate={navigate} onOpen={openOnBoard} media={media} />}
      </ErrorBoundary>

      {!items.length && !['landing', 'about', 'horizon', 'case', 'board', 'line', 'finding', 'card'].includes(route.view) && (
        <div style={{ padding: '140px 0', textAlign: 'center', ...micro(0.4), letterSpacing: '0.14em' }}>No entries match</div>
      )}

      {route.view !== 'landing' && route.view !== 'board' && (
        <footer style={{ maxWidth: 1400, margin: '0 auto', padding: '26px 32px 90px', borderTop: '1px solid rgba(243,240,234,0.12)', display: 'flex', gap: 34, flexWrap: 'wrap' }}>
          <p style={{ margin: 0, font: '400 11px/1.85 ' + MONO, color: 'rgba(243,240,234,0.34)', maxWidth: '46ch', textWrap: 'pretty' }}>
            Photographs and summaries come from Wikipedia/Wikimedia Commons and remain under their own licences.
            Entry text is CC BY-SA 4.0.
          </p>
          <p style={{ margin: 0, font: '400 11px/1.85 ' + MONO, color: 'rgba(243,240,234,0.34)', maxWidth: '40ch', textWrap: 'pretty' }}>
            Entries after {NOW} are scenarios, not forecasts. The confidence label is the point;
            the date is a placeholder.
          </p>
          <p style={{ margin: 0, font: '400 11px/1.85 ' + SANS, color: 'rgba(243,240,234,0.34)' }}>
            <a href="https://github.com/mobahug/The_AI_Timeline">Source & contributions ↗</a>
          </p>
        </footer>
      )}
    </RouteProvider>
  );
}
