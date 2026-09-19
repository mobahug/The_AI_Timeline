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

/* ─── The sheet ─────────────────────────────────────────────────────────── */

/** iOS's rubber band. `over` px pulled past an edge becomes the distance the
 *  sheet actually gives: most of it at first, less and less after, never more
 *  than `limit`. Signed, so it serves either end. */
export function rubberBand(over, limit = 56, c = 0.55) {
  const o = Math.abs(over);
  return Math.sign(over) * (1 - 1 / ((o * c) / limit + 1)) * limit;
}

const springTerms = ({ stiffness = 400, damping = 26, mass = 1 }) => {
  const w0 = Math.sqrt(stiffness / mass);
  // Under-damped by construction: a spring that never overshoots is a fade.
  const zeta = Math.min(0.98, damping / (2 * Math.sqrt(stiffness * mass)));
  return { w0, zeta, wd: w0 * Math.sqrt(1 - zeta * zeta) };
};

/** A damped spring let go at 0 and coming to rest at 1, `t` seconds in. `v0` is
 *  the speed at release in whole distances per second, so a flick carries into
 *  the settle instead of stopping dead where the finger lifted. Under-damped:
 *  it overshoots a little and comes back — the bounce. */
export function spring(t, opts = {}) {
  const { w0, zeta, wd } = springTerms(opts);
  const v0 = opts.v0 || 0;
  const decay = Math.exp(-zeta * w0 * t);
  return 1 + decay * (-Math.cos(wd * t) + ((v0 - zeta * w0) / wd) * Math.sin(wd * t));
}

/** How long the spring takes to rest, in ms: when its envelope has shrunk to a
 *  fifth of a percent of the distance. Independent of the distance and of the
 *  release speed, as a real spring's is. */
export function springDuration(opts = {}) {
  const { w0, zeta } = springTerms(opts);
  return Math.round((Math.log(500) / (zeta * w0)) * 1000);
}

/** The spring as a CSS `linear()` easing, sampled evenly over its duration and
 *  pinned to 1 at the end so the transition lands exactly on its stop. */
export function springEasing(opts = {}, steps = 32) {
  const D = springDuration(opts) / 1000;
  const pts = [];
  for (let i = 0; i <= steps; i++) pts.push(spring((i / steps) * D, opts));
  pts[0] = 0;
  pts[steps] = 1;
  return 'linear(' + pts.map((p) => +p.toFixed(4)).join(', ') + ')';
}

/** Who a touch that starts to move on the sheet belongs to: the sheet, which
 *  the finger then pulls, or the content, which scrolls under it. The rule is
 *  the native one. The handle is always the sheet's. A sideways move is never
 *  the sheet's — a strip inside scrolls that way. A pull down takes the sheet
 *  only when the content is at its top, where there is nothing left to scroll
 *  to. A push up grows the sheet before the content scrolls, until the sheet
 *  is at its top stop; there, it scrolls. `dy` is the finger's first movement,
 *  down positive. Nothing yet moved is nobody's. */
export function sheetClaims({ dx, dy, scrollTop, atTop, onHandle }) {
  if (onHandle) return 'sheet';
  if (!dx && !dy) return null;
  if (Math.abs(dx) > Math.abs(dy)) return 'scroll';
  if (dy > 0) return scrollTop <= 0 ? 'sheet' : 'scroll';
  return atTop ? 'scroll' : 'sheet';
}
