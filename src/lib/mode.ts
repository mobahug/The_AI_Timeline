import { useCallback, useSyncExternalStore } from 'react';
import type { Mode } from './types';

/* Brief or full. The board opens in outline — the landmark cards, the strings
   that carry a case note, one quote per card — and a reader who wants the whole
   file switches to full: every card, every string, the figures, the people, the
   terms and every source. The choice is remembered in this browser; a link can
   carry ?mode=full to open the whole file for someone else. */

const KEY = 'aiTimeline.mode.v1';
export const MODES: Mode[] = ['brief', 'full'];
export const DEFAULT_MODE: Mode = 'brief';

const isMode = (v: string | null): v is Mode => v === 'brief' || v === 'full';

let current: Mode = DEFAULT_MODE;
const listeners = new Set<() => void>();

const readStored = (): Mode => {
  try {
    const q = new URLSearchParams(window.location.search).get('mode');
    if (isMode(q)) { localStorage.setItem(KEY, q); return q; }
  } catch {}
  try {
    const v = localStorage.getItem(KEY);
    if (isMode(v)) return v;
  } catch {}
  return DEFAULT_MODE;
};

if (typeof window !== 'undefined') current = readStored();

export function setMode(next: Mode) {
  if (!isMode(next) || next === current) return;
  current = next;
  try { localStorage.setItem(KEY, next); } catch {}
  listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
const get = () => current;
const getServer = () => DEFAULT_MODE;

/** [mode, setMode, full]. The server always renders brief; the client takes
 *  over with the stored choice without a hydration mismatch. */
export function useMode(): [Mode, (m: Mode) => void, boolean] {
  const mode = useSyncExternalStore(subscribe, get, getServer);
  const set = useCallback((m: Mode) => setMode(m), []);
  return [mode, set, mode === 'full'];
}
