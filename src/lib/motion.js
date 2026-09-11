/* The shape of a pan. Pure, so the smoothness can be tested rather than eyeballed. */

/** Ease-out cubic: fast off the mark, settling gently. Never overshoots. */
export const easeOut = (x) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);

/** How long a pan of `distance` px should take. Scales with distance so a short
 *  hop is quick and a long one does not crawl, inside a band that always reads as
 *  one deliberate movement rather than a snap or a drift. */
export const panDuration = (distance) => Math.min(950, Math.max(320, Math.abs(distance) * 0.2));

/** Where the board should be `elapsed` ms into a pan from `from` to `to`. */
export function panPosition(from, to, elapsed) {
  const dist = to - from;
  const duration = panDuration(dist);
  const p = duration > 0 ? Math.min(1, elapsed / duration) : 1;
  return from + dist * easeOut(p);
}
