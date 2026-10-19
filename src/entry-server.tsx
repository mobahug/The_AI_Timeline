import React from 'react';
import { renderToString } from 'react-dom/server';
import PAPERS from '../data/events.json?papers';
import FORETOLD_FILE from '../data/predictions.json';
import App from './App';
import { parse } from './lib/url';
import { metaFor } from './lib/meta';
import { buildGraph } from './lib/data';
import { carriedPapers, primePapers } from './lib/papers';
import { primePredictions } from './lib/predictions';
import type { Prediction } from './lib/types';
import { primeMedia, usedMedia } from './lib/wiki';
import type { WikiCache } from './lib/types';

/* The server entry. The prerenderer calls render() once per address and writes
   the result into that address's own HTML file, so a crawler, a link preview
   and a reader with JavaScript off all get the page itself — not an empty root.

   The server holds every card's papers; the browser holds none until it sends
   for them. What one render read of them is handed back with the page, which
   carries it, so the browser's first render reads exactly what this one did. */

const graph = buildGraph();
primePredictions(FORETOLD_FILE.predictions as Prediction[]);

export function render(pathname: string, cache?: WikiCache | null) {
  primeMedia(cache);
  primePapers(PAPERS);
  const route = parse(pathname, '', '');
  const html = renderToString(<App initialRoute={route} />);
  const meta = metaFor(route, graph);
  return { html, route, meta, media: usedMedia(), papers: carriedPapers(route) };
}

