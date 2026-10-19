import { useEffect, useLayoutEffect, useState } from 'react';
import type { RefObject } from 'react';

/* The board's two measurements: the shell it fills, and the frame its lanes are
   solved for. Both are read before the first paint the board makes. */

/** The shell's height: whatever the header leaves of the viewport. The header is
 *  measured, never assumed, so wrapping at narrow widths just makes the lanes
 *  shorter. */
const shellOf = (): number => {
  const header = document.querySelector<HTMLElement>('[data-chrome="header"]');
  const vh = (window.visualViewport && window.visualViewport.height) || window.innerHeight;
  return Math.max(300, Math.floor(vh - (header ? header.offsetHeight : 0)));
};

/** The shell's height, measured on the first render, not after it: the canvas is
 *  drawn in the browser only, and lanes first solved for a guessed height and
 *  then for the real one moved the whole wall under the reader's eyes (a layout
 *  shift of 0.25 on a phone). It follows the viewport and the header after. */
export function useShellHeight(): number {
  const [shellH, setShellH] = useState(() => typeof window === 'undefined' ? 640 : shellOf());
  useEffect(() => {
    const measure = () => setShellH(shellOf());
    measure();
    window.addEventListener('resize', measure);
    if (window.visualViewport) window.visualViewport.addEventListener('resize', measure);
    const header = document.querySelector<HTMLElement>('[data-chrome="header"]');
    let ro: ResizeObserver | undefined;
    if (header && window.ResizeObserver) { ro = new ResizeObserver(measure); ro.observe(header); }
    return () => {
      window.removeEventListener('resize', measure);
      if (window.visualViewport) window.visualViewport.removeEventListener('resize', measure);
      if (ro) ro.disconnect();
    };
  }, []);
  return shellH;
}

/** The frame's box. `h` is the canvas's inner height, which the lanes are
 *  solved for; `frameH` the frame's, which the rail stands in. */
export function useFrameBox(frameRef: RefObject<HTMLDivElement | null>, scroller: RefObject<HTMLDivElement | null>): { w: number; h: number; frameH: number } {
  const [box, setBox] = useState({ w: 1280, h: 560, frameH: 560 });
  // The frame measures itself, so anything else in the column simply takes room
  // from the lanes instead of overflowing. The width is the frame's — the
  // rail is laid out against it. The height is the canvas's own inner height,
  // less its border and the scrollbar along its foot: the lanes are solved to
  // fill exactly that, and solving them for the frame instead left the bottom
  // lane's cards cut off by the scrollbar's height. Read before the first
  // paint, so the lanes are drawn once, where they stay.
  useLayoutEffect(() => {
    const el = frameRef.current;
    if (!el || !window.ResizeObserver) return;
    const read = () => {
      const canvas = scroller.current;
      const frameH = el.clientHeight || 560;
      setBox({ w: el.clientWidth || 1280, h: (canvas ? canvas.clientHeight : el.clientHeight) || 560, frameH });
    };
    const ro = new ResizeObserver(read);
    ro.observe(el);
    read();
    return () => ro.disconnect();
  }, []);
  return box;
}
