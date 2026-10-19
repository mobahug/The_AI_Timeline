import React, { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ComponentType } from 'react';
import Header from './components/Header';
import { Link, RouteProvider } from './components/kit';
import ErrorBoundary from './components/ErrorBoundary';
import Landing from './components/Landing';
import Missing from './components/Missing';
import BoardStatic from './components/BoardStatic';
import { boardIfLoaded, loadBoard } from './components/boardChunk';
import { CHUNKS, chunkOf } from './components/viewChunks';
import type { Chunk } from './components/viewChunks';
import { buildGraph, events as canonEvents, forwardLedger, FIRST, NOW } from './lib/data';
import { matches } from './lib/files';
import { papersFor, usePapers } from './lib/papers';
import { predictionsFor } from './lib/predictions';
import { useMedia } from './lib/wiki';
import { useRoute } from './lib/url';
import { useMode } from './lib/mode';
import { metaFor, applyMeta } from './lib/meta';
import { viewById } from './lib/views';
import { MONO, SANS, GUTTER, RULE, button, ink, shell } from './lib/styles';
import type { Route } from './lib/types';

/* The board is the one heavy view — the canvas, the drag, the pan animation —
   and the one a crawler gets nothing from. It is loaded when the reader opens
   it; the server renders its static listing instead. On the board's own
   address the canvas is fetched before the page is drawn (boardChunk.ts), and
   is then drawn directly rather than through the lazy wrapper, so the listing
   is never swapped for an empty "loading" frame. */
const LazyBoardView = lazy(() => loadBoard().then((Board) => ({ default: Board })));

const isBrowser = typeof window !== 'undefined';

/** What a turn waits for: the page's own chunk (viewChunks.ts), its papers,
 *  and a prediction page's whole file. */
const waitFor = (next: Route, prev: Route | null): Promise<void> | null => {
  const chunk = chunkOf(next.view);
  const all = [chunk && !chunk.now() ? chunk.load() : null, papersFor(next, prev), predictionsFor(next)].filter((p) => p !== null);
  return all.length ? Promise.all(all).then(() => undefined) : null;
};

/** A page's component: from its chunk once it has come, through React.lazy if a
 *  render ever finds it missing. */
const pick = <P,>(c: Chunk<P>): ComponentType<P> => c.now() || c.Lazy;

export interface AppProps { initialRoute?: Route }

export default function App({ initialRoute }: AppProps) {
  // A turn to a page whose papers are not here waits for them (papers.ts),
  // and the page it leaves says it is busy until they come.
  const [route, navigate, turning] = useRoute(initialRoute, waitFor);
  const papers = usePapers();
  const Board = boardIfLoaded() || LazyBoardView;
  const graph = useMemo(() => buildGraph(), []);
  const media = useMedia(graph.all);
  const [mode, , full] = useMode();
  const [year, setYear] = useState(String(FIRST));
  // The 1px progress bar is painted straight into the DOM: a scroll must not
  // re-render the header and the whole page to move it.
  const barRef = useRef<HTMLDivElement>(null);
  const paint = (p: number) => { if (barRef.current) barRef.current.style.width = (p * 100).toFixed(2) + '%'; };

  // The field and the dropdown read the same index — see `searchText` in
  // files.ts — so the count in the header is a count of what the page shows.
  // A search reads the cards' papers, and is read again when they arrive; with
  // no search the list does not change then, so it is not rebuilt.
  const items = useMemo(() => {
    const q = route.query.trim().toLowerCase();
    return graph.all.filter((e) =>
      (route.category === 'all' || e.category === route.category) && matches(e, q)
    );
  }, [graph.all, route.category, route.query, route.query ? papers : 0]); // eslint-disable-line react-hooks/exhaustive-deps

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
      let found: string | null = null;
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
  // A card's description carries its reading, one of its papers.
  useEffect(() => { applyMeta(metaFor(route, graph)); }, [route, graph, papers]);

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
        const el = document.getElementById(route.hash as string);
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
    const h1 = document.querySelector<HTMLElement>('main h1');
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

  const openOnBoard = useCallback((id: string) => navigate({ view: 'board', id, clue: null, category: 'all', query: '' }), [navigate]);
  const onBoardPosition = useCallback((y: string, p: number) => { setYear(y); paint(p); }, []);

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

  const About = pick(CHUNKS.about);
  const ArchiveView = pick(CHUNKS.archive);
  const HorizonView = pick(CHUNKS.horizon);
  const CaseView = pick(CHUNKS.case);
  const LineView = pick(CHUNKS.line);
  const FindingView = pick(CHUNKS.finding);
  const CardView = pick(CHUNKS.card);
  const LeadsView = pick(CHUNKS.leads);
  const LeadView = pick(CHUNKS.lead);
  const QuestionsView = pick(CHUNKS.questions);
  const QuestionView = pick(CHUNKS.question);
  const ChecksView = pick(CHUNKS.checks);
  const CheckView = pick(CHUNKS.check);
  const ChartsView = pick(CHUNKS.charts);
  const LatestView = pick(CHUNKS.latest);
  const StartView = pick(CHUNKS.start);
  const FilesView = pick(CHUNKS.files);
  const GlossaryView = pick(CHUNKS.glossary);
  const EntityView = pick(CHUNKS.entity);
  const MachinesView = pick(CHUNKS.machines);
  const PredictionsView = pick(CHUNKS.predictions);
  const PredictionView = pick(CHUNKS.prediction);
  const PledgesView = pick(CHUNKS.promises);
  const PledgeView = pick(CHUNKS.promise);
  const CorrectionsView = pick(CHUNKS.corrections);

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
        <main id="main" tabIndex={-1} aria-busy={turning || undefined} style={{ outline: 'none' }}>
          <Suspense fallback={null}>
          {view === 'landing' && route.missing && <Missing path={route.missing} graph={graph} />}
          {view === 'landing' && <Landing media={media} />}
          {view === 'about' && <About />}
          {view === 'board' && !isBrowser && <BoardStatic items={items} graph={graph} route={route} />}
          {view === 'board' && isBrowser && (
            <Suspense fallback={<BoardStatic items={items} graph={graph} route={route} loading />}>
              <Board
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
          {view === 'questions' && <QuestionsView />}
          {view === 'question' && <QuestionView graph={graph} route={route} />}
          {view === 'checks' && <ChecksView />}
          {view === 'check' && <CheckView graph={graph} route={route} />}
          {view === 'charts' && <ChartsView graph={graph} />}
          {view === 'latest' && <LatestView graph={graph} media={media} />}
          {view === 'start' && <StartView graph={graph} media={media} />}
          {view === 'files' && <FilesView graph={graph} />}
          {view === 'glossary' && <GlossaryView graph={graph} />}
          {(view === 'person' || view === 'org' || view === 'term') && <EntityView graph={graph} route={route} />}
          {view === 'machines' && <MachinesView graph={graph} />}
          {view === 'predictions' && <PredictionsView graph={graph} />}
          {view === 'prediction' && <PredictionView graph={graph} route={route} />}
          {view === 'promises' && <PledgesView />}
          {view === 'promise' && <PledgeView graph={graph} route={route} />}
          {view === 'corrections' && <CorrectionsView graph={graph} />}
          </Suspense>
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
            <Link to={{ view: 'corrections' }}>Corrections</Link>
            <a href="https://github.com/mobahug/The_AI_Timeline">Source ↗</a>
            <a href="https://github.com/mobahug/The_AI_Timeline/blob/main/LICENSE">Licence ↗</a>
          </p>
        </footer>
      )}
    </RouteProvider>
  );
}
