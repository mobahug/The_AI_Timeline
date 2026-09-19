import { useCallback, useEffect, useState } from 'react';
import fallbacks from '../../data/image-fallbacks.json';
import type { Event, Media, Shot, WikiCache, WikiPage } from './types';

const FALLBACK: Record<string, string> = fallbacks;

const LIVE_KEY = 'aiTimeline.wikiLive.v1';
const REST = 'https://en.wikipedia.org/api/rest_v1/page/summary/';

let prebuilt: WikiCache | null = null;
let live: WikiCache = {};
try { live = JSON.parse(localStorage.getItem(LIVE_KEY) || '{}'); } catch { live = {}; }

/* The prerenderer hands the build-time cache to the server render, and writes
   the pages each route actually used into that route's HTML. The client reads
   those back synchronously here, so its first render — the hydration — sees
   the same photographs the server did, before the full cache has been fetched. */
let inlined: WikiCache = {};
try {
  const el = typeof document !== 'undefined' ? document.getElementById('wiki-inline') : null;
  if (el) inlined = JSON.parse(el.textContent || '{}') || {};
} catch { inlined = {}; }

/** Server side: use this cache, and start recording which titles are read. */
let recording: Set<string> | null = null;
export function primeMedia(cache?: WikiCache | null): void { prebuilt = cache || {}; recording = new Set(); }
/** Server side: the titles read since primeMedia, as a cache subset to inline. */
export function usedMedia(): WikiCache {
  const out: WikiCache = {};
  const have = prebuilt;
  if (recording && have) recording.forEach((t) => { if (have[t]) out[t] = have[t]; });
  return out;
}

/** One page from Wikipedia's summary endpoint, in the cache's own shape. Only a
 *  title the build did not cache — a card newer than the cache, say — ever gets here. */
async function fetchTitle(title: string): Promise<WikiPage> {
  const res = await fetch(REST + encodeURIComponent(title.replace(/ /g, '_')));
  if (!res.ok) throw new Error(title + ': ' + res.status);
  const p = await res.json();
  return { img: (p.thumbnail && p.thumbnail.source) || (p.originalimage && p.originalimage.source) || '', extract: p.extract || '' };
}

async function loadPrebuilt(): Promise<WikiCache> {
  if (prebuilt) return prebuilt;
  try {
    const res = await fetch(import.meta.env.BASE_URL + 'wiki-cache.json');
    prebuilt = res.ok ? await res.json() : {};
  } catch {
    prebuilt = {};
  }
  return prebuilt || {};
}

const lookup = (title: string | null | undefined): WikiPage | null => {
  if (!title) return null;
  if (recording) recording.add(title);
  return (prebuilt && prebuilt[title]) || inlined[title] || live[title] || null;
};

/** The article a citation URL points at. Deliberately not the same as wikiTitle:
 *  wikiTitle chooses the illustration, the URL is the evidence. After the source
 *  audit repointed several citations the two differ on purpose, and text shown to
 *  a reader must come from the page we cite — never from the page we borrowed a
 *  photograph from. */
export function citedTitle(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (!/(^|\.)wikipedia\.org$/.test(u.hostname)) return null;
    if (!u.pathname.startsWith('/wiki/')) return null;
    return decodeURIComponent(u.pathname.slice('/wiki/'.length)).replace(/_/g, ' ');
  } catch {
    return null;
  }
}

/**
 * Split prose into sentences without breaking on abbreviations. Boundaries are
 * computed on a masked copy — every non-terminal period is swapped for a
 * placeholder of the same width — and each sentence is then sliced from the
 * ORIGINAL by offset, so a quote taken from here is byte-exact. A naive
 * /(?<=[.!?])\s+/ turns "Mata v. Avianca, Inc. was a case" into four fragments.
 */
export function splitSentences(text: string | null | undefined): string[] {
  if (!text) return [];
  let masked = text;
  const mask = (re: RegExp) => { masked = masked.replace(re, (m) => m.replace(/\./g, '\u0001')); };
  mask(/\{\\displaystyle[^}]*\}/g);                       // LaTeX in maths articles
  mask(/\b(?:[A-Za-z]\.){2,}/g);                           // R.U.R., U.S., e.g., i.e.
  mask(/\b(?:Mr|Mrs|Ms|Dr|Prof|Sr|Jr|St|Inc|Ltd|Co|Corp|No|vs|v|al|Fig|Rev|Gen|Sen|Rep|approx|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\./gi);
  mask(/\d\.\d/g);                                        // 3.57
  mask(/\b[A-Z]\.(?=\s)/g);                               // middle initials

  const out: string[] = [];
  let start = 0;
  const re = /[.!?]+(?=\s|$)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(masked)) !== null) {
    const end = m.index + m[0].length;
    const slice = text.slice(start, end).trim();
    if (slice) out.push(slice);
    start = end;
  }
  const tail = text.slice(start).trim();
  if (tail) out.push(tail);
  return out;
}

/** Does this lead actually speak to this entry, or is it a topic page that merely
 *  happens to be cited? Returns the sentences that mention the entry so a caller
 *  can lead with them — and be honest when there are none. */
export function bearingOn(event: Event | null | undefined, extract: string | null | undefined): { sentences: string[]; hits: string[]; mentions: boolean } {
  if (!extract || !event) return { sentences: [], hits: [], mentions: false };
  const stop = new Set(['the', 'a', 'an', 'of', 'and', 'or', 'in', 'on', 'to', 'is', 'are', 'it', 'its',
    'for', 'with', 'by', 'at', 'as', 'that', 'this', 'first', 'into', 'from', 'gets', 'goes', 'his', 'her', 'their']);
  const terms = String(event.title).toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/)
    .filter((w) => w.length > 2 && !stop.has(w));
  const year = String(event.year);
  const sentences = splitSentences(extract);
  const hits = sentences.filter((s) => {
    const low = s.toLowerCase();
    return s.includes(year) || terms.some((w) => low.includes(w));
  });
  return { sentences, hits, mentions: hits.length > 0 };
}

/**
 * Build-time cache first, live Wikipedia lookup as fallback, generated mark if neither
 * has a free photograph. Live results are remembered in localStorage.
 */
export function useMedia(items: Event[]): Media {
  const [version, bump] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await loadPrebuilt();
      if (cancelled) return;
      bump((n) => n + 1);

      const wanted: string[] = [];
      items.forEach((e) => {
        if (e.future) return;
        [e.wikiTitle, FALLBACK[e.id], citedTitle(e.url)].forEach((t) => {
          if (t && !lookup(t) && !wanted.includes(t)) wanted.push(t);
        });
      });

      let index = 0;
      const worker = async () => {
        while (index < wanted.length && !cancelled) {
          const title = wanted[index++];
          try {
            live[title] = await fetchTitle(title);
            try { localStorage.setItem(LIVE_KEY, JSON.stringify(live)); } catch {}
            bump((n) => n + 1);
          } catch {
            /* leave it to the generated mark */
          }
          await new Promise((r) => setTimeout(r, 90));
        }
      };
      await Promise.all([worker(), worker(), worker(), worker()]);
    })();
    return () => { cancelled = true; };
  }, [items]);

  // One function per cache version, not per render: every card on the board
  // takes this as a prop, and a fresh closure each render would re-render them all.
  return useCallback((event: Event | null | undefined): Shot => {
    if (!event || event.future) return { img: '', extract: '', cited: null };

    // The cited page, which is what a reader is checking the claim against.
    const citedName = event.url ? citedTitle(event.url) : null;
    const citedPage = citedName ? lookup(citedName) : null;
    const cited: Shot['cited'] = citedName && event.url
      ? { title: citedName, url: event.url, extract: (citedPage && citedPage.extract) || '', wikipedia: true }
      : (event.url ? { title: event.source || '', url: event.url, extract: '', wikipedia: false } : null);

    const direct = event.wikiTitle ? lookup(event.wikiTitle) : null;
    if (direct && direct.img) return { ...direct, cited };
    const alt = FALLBACK[event.id] ? lookup(FALLBACK[event.id]) : null;
    if (alt && alt.img) return { img: alt.img, extract: (direct && direct.extract) || '', borrowed: FALLBACK[event.id], cited };
    return { img: '', extract: '', ...(direct || {}), cited };
  }, [version]);
}
