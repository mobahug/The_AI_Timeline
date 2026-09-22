import { useMemo, useSyncExternalStore } from 'react';

/* Small hooks over the browser, written so a page renders the same on the
   server and on first paint in the client: the server value is the default,
   and the client's real answer arrives the moment hydration is done. */

const subscribeMatch = (query: string) => (cb: () => void) => {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {};
  const mq = window.matchMedia(query);
  const on = () => cb();
  if (mq.addEventListener) mq.addEventListener('change', on); else mq.addListener(on);
  return () => { if (mq.removeEventListener) mq.removeEventListener('change', on); else mq.removeListener(on); };
};

/** Does the viewport match a media query? `serverDefault` is what the server
 *  says and what the client says until hydration completes. */
export function useMatch(query: string, serverDefault = false): boolean {
  const subscribe = useMemo(() => subscribeMatch(query), [query]);
  return useSyncExternalStore(
    subscribe,
    () => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(query).matches : serverDefault),
    () => serverDefault
  );
}

/* There was a `useNarrow(px)` here, and the header laid itself out by it. It is
   gone: a layout that depends on a width the server cannot know is a layout the
   server gets wrong, and the reader watches it correct itself. What a page
   looks like at a width is CSS's question — see the chrome rules in base.css.
   `useMatch` stays for the one thing CSS cannot do: tell a modal that the
   window it was opened on has grown past the breakpoint. */

/** Copy text to the clipboard; resolves true when it worked. */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) { await navigator.clipboard.writeText(text); return true; }
  } catch {}
  try {
    const ta = document.createElement('textarea');
    ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'absolute'; ta.style.left = '-9999px';
    document.body.appendChild(ta); ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch { return false; }
}

/** The absolute address of a route, for sharing. */
export const absolute = (href: string): string => (typeof window !== 'undefined' ? new URL(href, window.location.origin).toString() : href);
