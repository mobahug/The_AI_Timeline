import { FIRST, LAST } from './data';
import { findingByNumber, spanOf } from './spine';
import { leadById } from './leads';
import { questionById } from './questions';
import { entityById } from './files';
import { paperOf } from './papers';
import { viewById } from './views';
import { hrefFor } from './url';
import type { Graph, PageMeta, Route } from './types';

const SITE = 'The AI Timeline';
const TAGLINE = 'An investigation board of artificial intelligence, ' + FIRST + ' to ' + LAST + ' — every breakthrough, boardroom coup, lawsuit and breach, with the strings between them.';

// Titles and descriptions live in the view registry.

/** The title and description a page should carry, derived from the route. */
export function metaFor(route: Route, graph?: Graph | null): PageMeta {
  const { title, description } = describe(route, graph);
  return { title, description: clip(description), route };
}

/** A description short enough for a search result or a link preview. Most are
 *  a summary and a reading run together — up to 619 characters — and a search
 *  engine cuts them mid-word at about 160. Cut at the last whole sentence that
 *  fits, or failing that at a word, with an ellipsis. */
export function clip(text: string, max = 160): string {
  if (text.length <= max) return text;
  const head = text.slice(0, max);
  const stop = Math.max(head.lastIndexOf('. '), head.lastIndexOf('? '), head.lastIndexOf('! '));
  if (stop >= max / 2) return head.slice(0, stop + 1);
  const space = head.lastIndexOf(' ', max - 1);
  return head.slice(0, space > 0 ? space : max - 1).replace(/[\s,;:—–-]+$/, '') + '…';
}

function describe(route: Route, graph?: Graph | null): { title: string; description: string } {
  if (route.view === 'board' && route.clue && graph) {
    const a = graph.index[route.clue.from];
    const b = graph.index[route.clue.to];
    const clue = route.clue;
    const link = graph.edges.find((l) => l.from === clue.from && l.to === clue.to);
    if (a && b) {
      return {
        title: a.year + ' ' + a.title + ' → ' + b.year + ' ' + b.title + ' · ' + SITE,
        description: link ? a.title + ' ' + link.claim + ' ' + b.title + '.' + (link.note ? ' ' + link.note : '') : TAGLINE
      };
    }
  }
  if (route.view === 'board' && route.lead) {
    const l = leadById[route.lead];
    if (l) return { title: l.title + ' · on the board · ' + SITE, description: l.question };
  }
  if ((route.view === 'card' || route.view === 'board') && route.id && graph) {
    const e = graph.index[route.id];
    if (e) {
      const why = paperOf(e, 'why');
      return { title: e.year + ' · ' + e.title + ' · ' + SITE, description: e.summary + (why ? ' ' + why : '') };
    }
  }
  if (route.view === 'finding' && route.finding) {
    const f = findingByNumber(route.finding);
    if (f) {
      const span = spanOf(f, graph && graph.all.length ? graph.all[graph.all.length - 1].year : LAST);
      const years = span.from === span.to ? String(span.from) : span.from + '–' + span.to;
      return { title: String(f.n).padStart(2, '0') + ' ' + f.title + ' (' + years + ') · ' + SITE, description: f.blurb };
    }
  }
  if (route.view === 'lead' && route.id) {
    const l = leadById[route.id];
    if (l) return { title: l.title + ' · a lead · ' + SITE, description: l.question + ' ' + l.blurb };
  }
  if (route.view === 'question' && route.id) {
    const q = questionById[route.id];
    if (q) return { title: q.question + ' · ' + SITE, description: q.short };
  }
  if ((route.view === 'person' || route.view === 'org' || route.view === 'term') && route.id) {
    const x = entityById(route.view, route.id);
    if (x) {
      const kind = route.view === 'person' ? 'Person of interest' : route.view === 'org' ? 'Organisation' : 'Term';
      const lead = x.kind === 'term' ? x.short : x.role;
      const body = x.kind === 'term' ? x.definition : x.bio;
      return { title: x.label + ' · ' + kind + ' · ' + SITE, description: (lead ? lead + ' ' : '') + (body || '') };
    }
  }
  if (route.missing) return { title: 'Nothing filed here · ' + SITE, description: TAGLINE };
  const v = viewById[route.view];
  if (v && v.title) return { title: v.title + ' · ' + SITE, description: v.description || TAGLINE };
  return { title: SITE + ' — an investigation board, ' + FIRST + '–' + LAST, description: TAGLINE };
}

/** Write the meta into the document. Idempotent; safe to call on every route change. */
export function applyMeta(meta: PageMeta): void {
  if (typeof document === 'undefined') return;
  if (document.title !== meta.title) document.title = meta.title;
  const set = (selector: string, attr: string, value: string) => {
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
  // The canonical is the page's own address — no filter, no search, no
  // fragment, and for the board no open card — the same one the prerenderer
  // wrote, so a crawler never sees two canonicals for one document.
  const canonical = new URL(hrefFor({ view: meta.route.view, id: meta.route.view === 'board' ? null : meta.route.id, finding: meta.route.finding }), window.location.origin).toString();
  set('meta[property="og:url"]', 'content', canonical);
  let canon = document.head.querySelector('link[rel="canonical"]');
  if (!canon) { canon = document.createElement('link'); canon.setAttribute('rel', 'canonical'); document.head.appendChild(canon); }
  if (canon.getAttribute('href') !== canonical) canon.setAttribute('href', canonical);
}
