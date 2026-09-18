import React from 'react';
import { renderToString } from 'react-dom/server';
import App from './App.jsx';
import { parse } from './lib/url.js';
import { metaFor } from './lib/meta.js';
import { buildGraph } from './lib/data.js';
import { primeMedia, usedMedia } from './lib/wiki.js';

/* The server entry. The prerenderer calls render() once per address and writes
   the result into that address's own HTML file, so a crawler, a link preview
   and a reader with JavaScript off all get the page itself — not an empty root. */

const graph = buildGraph(null);

export function render(pathname, cache) {
  primeMedia(cache);
  const route = parse(pathname, '', '');
  const html = renderToString(<App initialRoute={route} />);
  return { html, route, meta: metaFor(route, graph), media: usedMedia() };
}

export { graph };
