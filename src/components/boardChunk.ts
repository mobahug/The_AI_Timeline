import type BoardViewComponent from './BoardView';

/* The board's canvas is its own chunk — the one heavy view, and the one a
   crawler gets nothing from — and it is fetched once, by whoever asks first.
   The board's own address asks before the page is drawn (main.tsx), so the
   listing the server wrote stays up until the canvas can replace it; a board
   reached from another page asks through React.lazy. A failed fetch is
   forgotten, so the next ask tries again. */
type Board = typeof BoardViewComponent;

let loaded: Board | null = null;
let pending: Promise<Board> | null = null;

/** Fetch the canvas; every caller shares the one request. */
export function loadBoard(): Promise<Board> {
  if (!pending) {
    pending = import('./BoardView').then(
      (m) => (loaded = m.default),
      (err: unknown) => { pending = null; throw err; }
    );
  }
  return pending;
}

/** The canvas if it has already arrived, so it can be drawn without suspending. */
export const boardIfLoaded = (): Board | null => loaded;
