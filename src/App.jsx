import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Header from './components/Header.jsx';
import Landing from './components/Landing.jsx';
import About from './components/About.jsx';
import BoardView from './components/BoardView.jsx';
import PlatesView from './components/PlatesView.jsx';
import MosaicView from './components/MosaicView.jsx';
import IndexView from './components/IndexView.jsx';
import { buildGraph, events as canonEvents } from './lib/data.js';
import { useBoard } from './lib/board.js';
import { useMedia } from './lib/wiki.js';
import { useRoute } from './lib/url.js';
import { MONO, SANS, micro } from './lib/styles.js';

export default function App() {
  const [route, navigate] = useRoute();
  const board = useBoard();
  const graph = useMemo(() => buildGraph(board.board), [board.board]);
  const media = useMedia(graph.all);
  const [year, setYear] = useState('1900');
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
      setYear(found || String(items[0] ? items[0].year : 1900));
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, [route.view, items]);

  const openOnBoard = useCallback((id) => navigate({ view: 'board', id, clue: null }), [navigate]);
  const onBoardPosition = useCallback((y, p) => { setYear(y); setProgress(p); }, []);

  const status = route.view === 'board'
    ? items.length + '/' + canonEvents.length + ' cards · ' + graph.edges.length + ' strings'
    : items.length + '/' + canonEvents.length + ' entries';

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 60, pointerEvents: 'none', mixBlendMode: 'overlay', backgroundImage: 'repeating-linear-gradient(0deg,rgba(255,255,255,0.028) 0 1px,transparent 1px 3px)' }} />
      <Header route={route} navigate={navigate} year={year} progress={progress} status={status} />

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
      {route.view === 'plates' && <PlatesView items={items} media={media} onOpen={openOnBoard} />}
      {route.view === 'mosaic' && <MosaicView items={items} media={media} onOpen={openOnBoard} />}
      {route.view === 'index' && <IndexView items={items} onOpen={openOnBoard} />}

      {!items.length && route.view !== 'landing' && route.view !== 'about' && (
        <div style={{ padding: '140px 0', textAlign: 'center', ...micro(0.4), letterSpacing: '0.14em' }}>No entries match</div>
      )}

      {route.view !== 'landing' && (
        <footer style={{ maxWidth: 1400, margin: '0 auto', padding: '26px 32px 90px', borderTop: '1px solid rgba(243,240,234,0.12)', display: 'flex', gap: 34, flexWrap: 'wrap' }}>
          <p style={{ margin: 0, font: '400 11px/1.85 ' + MONO, color: 'rgba(243,240,234,0.34)', maxWidth: '46ch', textWrap: 'pretty' }}>
            Photographs and summaries come from Wikipedia/Wikimedia Commons and remain under their own licences.
            Entry text is CC BY-SA 4.0.
          </p>
          <p style={{ margin: 0, font: '400 11px/1.85 ' + MONO, color: 'rgba(243,240,234,0.34)', maxWidth: '40ch', textWrap: 'pretty' }}>
            Entries after 2026 are editorial projections, not forecasts. The confidence label is the point;
            the date is a placeholder.
          </p>
          <p style={{ margin: 0, font: '400 11px/1.85 ' + SANS, color: 'rgba(243,240,234,0.34)' }}>
            <a href="https://github.com/mobahug/The_AI_Timeline">Source & contributions ↗</a>
          </p>
        </footer>
      )}
    </>
  );
}
