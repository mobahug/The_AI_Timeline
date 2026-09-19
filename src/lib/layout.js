import { THREADS, yearFraction } from './data.js';

/* The board's geometry, as pure functions: how tall a lane is for the height the
   window gives, where every card sits, and the curve each string draws. Pure so
   the invariants a timeline board promises — lanes that line up, cards that never
   overlap — are tested rather than eyeballed. */

export const PAD = 200;

/**
 * Every dimension on the board is solved from the height the window actually gives
 * us, so all six threads fit on screen exactly once and the board never scrolls
 * vertically. The gutter that falls out of that solve — the strip above each lane's
 * cards — is not spare room: it is the channel the strings are drawn in.
 */
const MIN_LANE = 46;

export function metrics(height, width) {
  const lanes = THREADS.length;
  const ruler = height >= 520 ? 30 : 22;
  // The lane height that would make all six fit exactly. If honouring the
  // legibility floor overshoots it, the board genuinely cannot fit this window —
  // so it says so by scrolling, rather than clipping a lane off the bottom.
  const ideal = Math.floor((height - ruler) / lanes);
  const lane = Math.max(MIN_LANE, ideal);
  const fits = ideal >= MIN_LANE;
  const cardH = Math.max(34, Math.round(lane * 0.72));
  const gutter = lane - cardH;
  const k = Math.min(1, lane / 216);
  const cardW = Math.max(126, Math.round(210 * (0.58 + 0.42 * k)));
  const gap = cardW + Math.max(14, Math.round(34 * k));
  // A tall card stacks its photograph over the text. A short one has no room
  // for that, so the photograph moves to the right as a square thumb and the
  // text takes the left; only a card too short for even a thumb goes without.
  const photo = cardH >= 72;
  const pad = k < 0.6 ? 11 : 15;
  const side = !photo && cardH - pad >= 30;
  const thumb = side ? cardH - pad : 0;
  const titlePx = Math.max(10.5, Math.min(14, 8 + 6 * k));
  return {
    ruler, lane, cardH, gutter, cardW, gap, k, photo, side, thumb, fits,
    showCat: cardH >= 120,
    titleLines: cardH >= 104 ? 2 : photo ? 1 : side ? Math.max(1, Math.min(3, Math.floor((thumb - 12) / (titlePx * 1.14)))) : 3,
    titlePx,
    boardW: Math.max(4200, Math.round(width * 7))
  };
}

/** One row per thread, chronological, never overlapping — and never far from
 *  its true year. Collision avoidance alone pushes a crowded lane right, and a
 *  lane pushed a long way stops lining up with the lanes beside it: one lane
 *  shows 1998 where the ruler says 2015. That breaks the one thing a timeline
 *  board promises. So the axis itself is warped to demand: walking the years in
 *  order, each year is placed at its nominal position or, if any lane still
 *  needs room for the cards it holds before that year, further right — and
 *  every later year moves with it. Cards then sit exactly on their year, and the
 *  ruler is drawn through the same warped axis, so what the ruler says and where
 *  the cards sit can never disagree. The only push left is inside one year in
 *  one lane, which no width can remove. */
export function layout(items, m) {
  const gapOf = (e) => (e.featured ? m.gap + Math.round(m.gap * 0.16) : m.gap);
  const nominal = (year) => PAD + yearFraction(year) * (m.boardW - PAD * 2);

  // Each lane as runs of same-year cards, oldest first.
  const runs = THREADS.map((thread) => {
    const out = [];
    items.filter((e) => e.thread === thread.id).forEach((e) => {
      const last = out[out.length - 1];
      if (last && last.year === e.year) last.cards.push(e);
      else out.push({ year: e.year, cards: [e] });
    });
    return out;
  });

  // The warped axis: x for every year that carries a card.
  const years = [...new Set(items.map((e) => e.year))].sort((a, b) => a - b);
  const X = new Map();
  let shift = 0;
  years.forEach((y) => {
    let x = nominal(y) + shift;
    runs.forEach((lane) => {
      let prev = null;
      for (const run of lane) { if (run.year < y) prev = run; else break; }
      if (prev) {
        const need = X.get(prev.year) + prev.cards.reduce((sum, e) => sum + gapOf(e), 0);
        if (need > x) x = need;
      }
    });
    shift = x - nominal(y);
    X.set(y, x);
  });

  // Any year, on the warped axis: interpolate between the placed years.
  const xOf = (year) => {
    if (!years.length) return nominal(year);
    if (X.has(year)) return X.get(year);
    if (year <= years[0]) return X.get(years[0]) - (nominal(years[0]) - nominal(year));
    if (year >= years[years.length - 1]) {
      const last = years[years.length - 1];
      return X.get(last) + (nominal(year) - nominal(last));
    }
    let i = 1;
    while (years[i] < year) i++;
    const a = years[i - 1];
    const b = years[i];
    const t = (nominal(year) - nominal(a)) / (nominal(b) - nominal(a) || 1);
    return X.get(a) + t * (X.get(b) - X.get(a));
  };

  const nodes = [];
  runs.forEach((lane, row) => {
    const laneTop = m.ruler + row * m.lane;
    lane.forEach((run) => {
      let x = X.get(run.year);
      run.cards.forEach((e) => {
        nodes.push({
          event: e,
          x,
          top: laneTop + m.gutter,
          y: laneTop + m.gutter + m.cardH / 2,
          ty: laneTop + m.gutter,
          tilt: (((e.id.length * 37) % 5) - 2) * 0.5
        });
        x += gapOf(e);
      });
    });
  });

  const reach = nodes.reduce((mx, n) => Math.max(mx, n.x + m.cardW / 2), 0);
  return {
    nodes,
    xOf,
    width: Math.max(m.boardW, Math.ceil(Math.max(reach, xOf(years[years.length - 1] || 0)) + PAD)),
    height: m.ruler + THREADS.length * m.lane
  };
}

/**
 * Strings tie to the pin at the top edge of a card and arch UP into the gutter.
 * The old geometry started at the card's centre — burying ~105px horizontally and
 * ~79px vertically of every string inside its own two endpoint cards — and sagged
 * downward into the row below. Arching up keeps same-lane strings — the majority —
 * entirely in empty space.
 */
export function stringPath(a, b, gutter) {
  const dx = b.x - a.x;
  const lift = Math.min(gutter * 0.86, 12 + Math.abs(dx) * 0.03);
  const c1x = a.x + dx * 0.25;
  const c1y = a.ty - lift;
  const c2x = b.x - dx * 0.25;
  const c2y = b.ty - lift;
  return {
    d: 'M' + a.x.toFixed(1) + ' ' + a.ty.toFixed(1) +
       ' C' + c1x.toFixed(1) + ' ' + c1y.toFixed(1) + ',' +
       c2x.toFixed(1) + ' ' + c2y.toFixed(1) + ',' +
       b.x.toFixed(1) + ' ' + b.ty.toFixed(1),
    mx: (a.x + 3 * c1x + 3 * c2x + b.x) / 8,
    my: (a.ty + 3 * c1y + 3 * c2y + b.ty) / 8
  };
}
