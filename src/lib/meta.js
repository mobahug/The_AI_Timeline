import { FIRST, LAST, NOW } from './data.js';
import { findingByNumber, spanOf } from './spine.js';
import { viewById } from './views.js';

const SITE = 'The AI Timeline';
const TAGLINE = 'An investigation board of artificial intelligence, ' + FIRST + ' to ' + LAST + ' — every breakthrough, boardroom coup, lawsuit and breach, with the strings between them.';

// Titles and descriptions live in the view registry.

/** The title and description a page should carry, derived from the route. */
export function metaFor(route, graph) {
  if (route.view === 'board' && route.clue && graph) {
    const a = graph.index[route.clue.from];
    const b = graph.index[route.clue.to];
    const link = graph.edges.find((l) => l.from === route.clue.from && l.to === route.clue.to);
    if (a && b) {
      return {
        title: a.year + ' ' + a.title + ' → ' + b.year + ' ' + b.title + ' · ' + SITE,
        description: link ? a.title + ' ' + link.claim + ' ' + b.title + '.' + (link.note ? ' ' + link.note : '') : TAGLINE
      };
    }
  }
  if ((route.view === 'card' || route.view === 'board') && route.id && graph) {
    const e = graph.index[route.id];
    if (e) return { title: e.year + ' · ' + e.title + ' · ' + SITE, description: e.summary + (e.why ? ' ' + e.why : '') };
  }
  if (route.view === 'finding' && route.finding) {
    const f = findingByNumber(route.finding);
    if (f) {
      const span = spanOf(f, graph && graph.all.length ? graph.all[graph.all.length - 1].year : LAST);
      const years = span.from === span.to ? String(span.from) : span.from + '–' + span.to;
      return { title: String(f.n).padStart(2, '0') + ' ' + f.title + ' (' + years + ') · ' + SITE, description: f.blurb };
    }
  }
  const v = viewById[route.view];
  if (v && v.title) return { title: v.title + ' · ' + SITE, description: v.description };
  return { title: SITE + ' — an investigation board, ' + FIRST + '–' + LAST, description: TAGLINE };
}

/** Write the meta into the document. Idempotent; safe to call on every route change. */
export function applyMeta(meta) {
  if (typeof document === 'undefined') return;
  if (document.title !== meta.title) document.title = meta.title;
  const set = (selector, attr, value) => {
    let el = document.head.querySelector(selector);
    if (!el) {
      el = document.createElement('meta');
      const [k, v] = selector.replace(/^meta\[|\]$/g, '').split('=');
      el.setAttribute(k, v.replace(/"/g, ''));
      document.head.appendChild(el);
    }
    if (el.getAttribute(attr) !== value) el.setAttribute(attr, value);
  };
  set('meta[name="description"]', 'content', meta.description);
  set('meta[property="og:title"]', 'content', meta.title);
  set('meta[property="og:description"]', 'content', meta.description);
  set('meta[property="og:url"]', 'content', window.location.href);
  let canon = document.head.querySelector('link[rel="canonical"]');
  if (!canon) { canon = document.createElement('link'); canon.setAttribute('rel', 'canonical'); document.head.appendChild(canon); }
  canon.setAttribute('href', window.location.href);
}
