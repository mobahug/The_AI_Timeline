import { lazy } from 'react';
import type { ComponentType } from 'react';
import type { ViewId } from '../lib/types';

/* Every page but the front page draws its component from a chunk of its own,
   fetched when the page is first opened. The main script used to carry all
   twenty of them, so a reader of one dossier downloaded the charts, the archive
   and Said in advance with it.

   A page is still written whole, and hydrates as written:
     - the server and the tests hold every chunk before they render
       (entry-server.tsx, tests/setup.ts);
     - the browser fetches the chunk of the page it opened before it hydrates
       (main.tsx), and the chunk of a page a link leads to before it turns to it
       (App's waitFor), as it already did for papers;
     - the prerenderer names a page's chunks in its head (prerender.ts), so they
       arrive beside the main script rather than after it.
   A render that finds a chunk missing all the same suspends on React.lazy. */

export interface Chunk<P> {
  /** Fetch it; every caller shares the one request, and a failure is forgotten, so the next ask tries again. */
  load: () => Promise<ComponentType<P>>;
  /** The component, once it is here. */
  now: () => ComponentType<P> | null;
  /** The component through React.lazy, for a render that finds it missing. */
  Lazy: ComponentType<P>;
  /** Its source file, as Vite's manifest names it: how the prerenderer finds what to preload. */
  src: string;
}

function chunk<P>(src: string, importer: () => Promise<{ default: ComponentType<P> }>): Chunk<P> {
  let got: ComponentType<P> | null = null;
  let pending: Promise<ComponentType<P>> | null = null;
  const load = (): Promise<ComponentType<P>> => pending || (pending = importer().then(
    (m) => (got = m.default),
    (err: unknown) => { pending = null; throw err; }
  ));
  return { load, now: () => got, Lazy: lazy(() => load().then((C) => ({ default: C }))), src };
}

export const CHUNKS = {
  about: chunk('src/components/About.tsx', () => import('./About')),
  archive: chunk('src/components/ArchiveView.tsx', () => import('./ArchiveView')),
  horizon: chunk('src/components/HorizonView.tsx', () => import('./HorizonView')),
  case: chunk('src/components/CaseView.tsx', () => import('./CaseView')),
  line: chunk('src/components/LineView.tsx', () => import('./LineView')),
  finding: chunk('src/components/FindingView.tsx', () => import('./FindingView')),
  card: chunk('src/components/CardView.tsx', () => import('./CardView')),
  leads: chunk('src/components/LeadsView.tsx', () => import('./LeadsView')),
  lead: chunk('src/components/LeadView.tsx', () => import('./LeadView')),
  questions: chunk('src/components/QuestionsView.tsx', () => import('./QuestionsView')),
  question: chunk('src/components/QuestionView.tsx', () => import('./QuestionView')),
  checks: chunk('src/components/ChecksView.tsx', () => import('./ChecksView')),
  check: chunk('src/components/CheckView.tsx', () => import('./CheckView')),
  charts: chunk('src/components/ChartsView.tsx', () => import('./ChartsView')),
  latest: chunk('src/components/LatestView.tsx', () => import('./LatestView')),
  start: chunk('src/components/StartView.tsx', () => import('./StartView')),
  files: chunk('src/components/FilesView.tsx', () => import('./FilesView')),
  glossary: chunk('src/components/GlossaryView.tsx', () => import('./GlossaryView')),
  entity: chunk('src/components/EntityView.tsx', () => import('./EntityView')),
  machines: chunk('src/components/MachinesView.tsx', () => import('./MachinesView')),
  predictions: chunk('src/components/PredictionsView.tsx', () => import('./PredictionsView')),
  prediction: chunk('src/components/PredictionView.tsx', () => import('./PredictionView'))
};

/** The views that share a chunk with another: the archive's three costumes, and the three kinds of file. */
const SHARED: Partial<Record<ViewId, keyof typeof CHUNKS>> = {
  plates: 'archive', mosaic: 'archive', person: 'entity', org: 'entity', term: 'entity'
};

/** The chunk a view is drawn from, or null for one the main script carries (the front page, the board's listing). */
export function chunkOf(view: ViewId): Chunk<never> | null {
  const key = SHARED[view] || (view in CHUNKS ? view as keyof typeof CHUNKS : null);
  return key ? CHUNKS[key] as Chunk<never> : null;
}

/** Every chunk, fetched: what the server and the tests do before they render a page. */
export const loadAll = (): Promise<unknown> => Promise.all(Object.values(CHUNKS).map((c) => c.load()));
