import React from 'react';
import { renderToString } from 'react-dom/server';
import App from './App';
import { parse } from './lib/url';
import { metaFor } from './lib/meta';
import { buildGraph } from './lib/data';
import { primeMedia, usedMedia } from './lib/wiki';
import type { WikiCache } from './lib/types';

/* The server entry. The prerenderer calls render() once per address and writes
   the result into that address's own HTML file, so a crawler, a link preview
   and a reader with JavaScript off all get the page itself — not an empty root. */

const graph = buildGraph();

export function render(pathname: string, cache?: WikiCache | null) {
  primeMedia(cache);
  const route = parse(pathname, '', '');
  const html = renderToString(<App initialRoute={route} />);
  return { html, route, meta: metaFor(route, graph), media: usedMedia() };
}

export { graph };
