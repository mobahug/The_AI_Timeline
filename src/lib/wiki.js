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
        [e.wikiTitle, fallbacks[e.id]].forEach((t) => {
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
    if (!event || event.future) return { img: '', extract: '' };
    const direct = event.wikiTitle ? lookup(event.wikiTitle) : null;
    if (direct && direct.img) return direct;
    const alt = fallbacks[event.id] ? lookup(fallbacks[event.id]) : null;
    if (alt && alt.img) return { img: alt.img, extract: (direct && direct.extract) || '', borrowed: fallbacks[event.id] };
    return direct || { img: '', extract: '' };
  };
}
