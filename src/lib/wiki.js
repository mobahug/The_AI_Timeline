import { useEffect, useState } from 'react';
import fallbacks from '../../data/image-fallbacks.json';

const LIVE_KEY = 'aiTimeline.wikiLive.v1';
const REST = 'https://en.wikipedia.org/api/rest_v1/page/summary/';

let prebuilt = null;
let live = {};
try { live = JSON.parse(localStorage.getItem(LIVE_KEY) || '{}'); } catch { live = {}; }

async function loadPrebuilt() {
  if (prebuilt) return prebuilt;
  try {
    const res = await fetch(import.meta.env.BASE_URL + 'wiki-cache.json');
    prebuilt = res.ok ? await res.json() : {};
  } catch {
    prebuilt = {};
  }
  return prebuilt;
}

const lookup = (title) => (prebuilt && prebuilt[title]) || live[title] || null;

/** The article a citation URL points at. Deliberately not the same as wikiTitle:
 *  wikiTitle chooses the illustration, the URL is the evidence. After the source
 *  audit repointed several citations the two differ on purpose, and text shown to
 *  a reader must come from the page we cite — never from the page we borrowed a
 *  photograph from. */
export function citedTitle(url) {
  try {
    const u = new URL(url);
    if (!/(^|\.)wikipedia\.org$/.test(u.hostname)) return null;
    if (!u.pathname.startsWith('/wiki/')) return null;
    return decodeURIComponent(u.pathname.slice('/wiki/'.length)).replace(/_/g, ' ');
  } catch {
    return null;
  }
}

/** Does this lead paragraph actually speak to this entry, or is it a topic page
 *  that happens to be cited? Returns the sentences that mention the entry, so the
 *  caller can lead with them and be honest when there are none. */
export function bearingOn(event, extract) {
  if (!extract || !event) return { sentences: [], mentions: false };
  const stop = new Set(['the', 'a', 'an', 'of', 'and', 'or', 'in', 'on', 'to', 'is', 'are', 'it', 'its',
    'for', 'with', 'by', 'at', 'as', 'that', 'this', 'first', 'into', 'from', 'gets', 'goes', 'his', 'her', 'their']);
  const terms = String(event.title).toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/)
    .filter((w) => w.length > 2 && !stop.has(w));
  const year = String(event.year);
  const sentences = extract.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
  const hits = sentences.filter((s) => {
    const low = s.toLowerCase();
    return s.includes(year) || terms.some((w) => low.includes(w));
  });
  return { sentences, hits, mentions: hits.length > 0 };
}

async function fetchTitle(title) {
  const res = await fetch(REST + encodeURIComponent(title.replace(/ /g, '_')));
  if (!res.ok) throw new Error(String(res.status));
  const page = await res.json();
  return {
    img: (page.thumbnail && page.thumbnail.source) || (page.originalimage && page.originalimage.source) || '',
    extract: page.extract || ''
  };
}

/**
 * Build-time cache first, live Wikipedia lookup as fallback, generated mark if neither
 * has a free photograph. Live results are remembered in localStorage.
 */
export function useMedia(items) {
  const [, bump] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await loadPrebuilt();
      if (cancelled) return;
      bump((n) => n + 1);

      const wanted = [];
      items.forEach((e) => {
        if (e.future) return;
        [e.wikiTitle, fallbacks[e.id], citedTitle(e.url)].forEach((t) => {
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

  return (event) => {
    if (!event || event.future) return { img: '', extract: '', cited: null };

    // The cited page, which is what a reader is checking the claim against.
    const citedName = event.url ? citedTitle(event.url) : null;
    const citedPage = citedName ? lookup(citedName) : null;
    const cited = citedName
      ? { title: citedName, url: event.url, extract: (citedPage && citedPage.extract) || '', wikipedia: true }
      : (event.url ? { title: event.source || '', url: event.url, extract: '', wikipedia: false } : null);

    const direct = event.wikiTitle ? lookup(event.wikiTitle) : null;
    if (direct && direct.img) return { ...direct, cited };
    const alt = fallbacks[event.id] ? lookup(fallbacks[event.id]) : null;
    if (alt && alt.img) return { img: alt.img, extract: (direct && direct.extract) || '', borrowed: fallbacks[event.id], cited };
    return { img: '', extract: '', ...(direct || {}), cited };
  };
}
