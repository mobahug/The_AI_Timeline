import { THREADS, yearFraction } from './data';
import type { Event, Layout, Metrics, Node } from './types';

/* The board's geometry, as pure functions: how tall a lane is for the height the
   window gives, where every card sits, and the curve each string draws. Pure so
   the invariants a timeline board promises — lanes that line up, cards that never
   overlap — are tested rather than eyeballed. */

export const PAD = 200;

/** How far a card leans where it is pinned, in degrees: one of five slants,
 *  fixed by its id so a card leans the same way on every load — and on its
 *  share image (scripts/share-images.tsx). */
export const tiltOf = (id: string): number => (((id.length * 37) % 5) - 2) * 0.5;

/**
 * Every dimension on the board is solved from the height the window actually gives
 * us, so all six threads fit on screen exactly once and the board never scrolls
 * vertically. The gutter that falls out of that solve — the strip above each lane's
 * cards — is not spare room: it is the channel the strings are drawn in.
 */
const MIN_LANE = 46;

export function metrics(height: number, width: number): Metrics {
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
    /* The category has two other ways of being read — the pin's colour and the
       legend of chips in the header — so its name only earns a line on a card
       tall enough to spare one, which in practice means a very tall window.
       A scenario's confidence has no other way of being read at all. The board
       tells readers to read the confidence and not the date, and then prints it
       nowhere on the wall: a scenario is a dashed border and nothing else.
       It costs about twelve pixels of photograph on eighteen of 163 cards, and
       on those eighteen the confidence is worth more than the picture. */
    showCat: cardH >= 120,
    showConfidence: cardH >= 84,
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
export function layout(items: Event[], m: Metrics): Layout {
  const gapOf = (e: Event) => (e.featured ? m.gap + Math.round(m.gap * 0.16) : m.gap);
  const nominal = (year: number) => PAD + yearFraction(year) * (m.boardW - PAD * 2);

  // Each lane as runs of same-year cards, oldest first.
  const runs = THREADS.map((thread) => {
    const out: { year: number; cards: Event[] }[] = [];
    items.filter((e) => e.thread === thread.id).forEach((e) => {
      const last = out[out.length - 1];
      if (last && last.year === e.year) last.cards.push(e);
      else out.push({ year: e.year, cards: [e] });
    });
    return out;
  });

  // The warped axis: x for every year that carries a card.
  const years = [...new Set(items.map((e) => e.year))].sort((a, b) => a - b);
  const X = new Map<number, number>();
  let shift = 0;
  years.forEach((y) => {
    let x = nominal(y) + shift;
    runs.forEach((lane) => {
      let prev: { year: number; cards: Event[] } | null = null;
      for (const run of lane) { if (run.year < y) prev = run; else break; }
      if (prev) {
        const need = (X.get(prev.year) as number) + prev.cards.reduce((sum, e) => sum + gapOf(e), 0);
        if (need > x) x = need;
      }
    });
    shift = x - nominal(y);
    X.set(y, x);
  });

  // Any year, on the warped axis: interpolate between the placed years.
  const at = (y: number) => X.get(y) as number;
  const xOf = (year: number): number => {
    if (!years.length) return nominal(year);
    if (X.has(year)) return at(year);
    if (year <= years[0]) return at(years[0]) - (nominal(years[0]) - nominal(year));
    if (year >= years[years.length - 1]) {
      const last = years[years.length - 1];
      return at(last) + (nominal(year) - nominal(last));
    }
    let i = 1;
    while (years[i] < year) i++;
    const a = years[i - 1];
    const b = years[i];
    const t = (nominal(year) - nominal(a)) / (nominal(b) - nominal(a) || 1);
    return at(a) + t * (at(b) - at(a));
  };

  const nodes: Node[] = [];
  runs.forEach((lane, row) => {
    const laneTop = m.ruler + row * m.lane;
    lane.forEach((run) => {
      let x = at(run.year);
      run.cards.forEach((e) => {
        nodes.push({
          event: e,
          x,
          top: laneTop + m.gutter,
          y: laneTop + m.gutter + m.cardH / 2,
          ty: laneTop + m.gutter,
          tilt: tiltOf(e.id)
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

/* ─── The wall by keyboard ──────────────────────────────────────────────
   The wall is one Tab stop, and the arrow keys walk it: along a lane through
   its years, and across to the lane above or below. Pure, like the rest of
   the geometry, so what the walk promises — every card can be reached, and ↓
   then ↑ comes back to the card it left — is tested rather than tried. */

/** The cards in order of time, across every lane. The warped axis never sets
 *  a card left of one from an earlier year, in any lane, so the order of
 *  position is the order of the years; within a year it is the order the
 *  cards stand in, and where two stand level the upper lane comes first. */
export function inTime(nodes: Node[]): Node[] {
  return nodes.slice().sort((a, b) => a.x - b.x || a.top - b.top);
}

/** What a key asks of the wall: ← and → earlier and later, ↑ and ↓ the lane
 *  above and below, Home and End the two ends of the record. */
export type Move = 'earlier' | 'later' | 'up' | 'down' | 'first' | 'last';

/** The point in time a run of ↑ and ↓ keeps aiming at: the year and place of
 *  the card the run began on. Aiming afresh from each card it lands on would
 *  drift a card sideways at every lane, and ↓ then ↑ would not come back. */
export interface Aim { year: number; x: number }

/** The card a key moves to from `from`, or null where there is nowhere to go.
 *  ← and → keep to the card's lane, in order of time; at either end of it
 *  they carry on to the card nearest in time on any other lane — the next
 *  one later, or the last one earlier. ↑ and ↓ go to the next lane that holds
 *  a card, and to the card there nearest in time: the nearest year, and of
 *  the cards in that year, the one standing nearest. From a card that is not
 *  on the wall, every key goes to the first. */
export function seek(nodes: Node[], from: string, move: Move, aim?: Aim): string | null {
  const order = inTime(nodes);
  if (!order.length) return null;
  const i = order.findIndex((n) => n.event.id === from);
  if (i < 0 || move === 'first') return order[0].event.id;
  if (move === 'last') return order[order.length - 1].event.id;
  const here = order[i];
  if (move === 'earlier' || move === 'later') {
    const lane = order.filter((n) => n.top === here.top);
    const j = lane.indexOf(here);
    const next = move === 'later' ? lane[j + 1] || order[i + 1] : lane[j - 1] || order[i - 1];
    return next ? next.event.id : null;
  }
  // A card's lane is where it sits: every card in one lane has the same top.
  const tops = [...new Set(order.map((n) => n.top))].sort((a, b) => a - b);
  const top = tops[tops.indexOf(here.top) + (move === 'down' ? 1 : -1)];
  if (top === undefined) return null;
  const at = aim || { year: here.event.year, x: here.x };
  const off = (n: Node): [number, number] => [Math.abs(n.event.year - at.year), Math.abs(n.x - at.x)];
  return order.filter((n) => n.top === top).reduce((best, n) => {
    const [dy, dx] = off(n);
    const [by, bx] = off(best);
    return dy < by || (dy === by && dx < bx) ? n : best;
  }).event.id;
}

/** The first card in view, in order of time: the first whose left edge is
 *  inside the frame — or, where the frame shows bare cork, the next card
 *  after it, and past the last card, the last. The wall's Tab stop rests
 *  here until the reader has chosen a card. `order` is the wall in time. */
export function firstInView(order: Node[], left: number, cardW: number): Node | null {
  return order.find((n) => n.x - cardW / 2 >= left - 1) || order[order.length - 1] || null;
}

/**
 * Strings tie to the pin at the top edge of a card and arch UP into the gutter.
 * The old geometry started at the card's centre — burying ~105px horizontally and
 * ~79px vertically of every string inside its own two endpoint cards — and sagged
 * downward into the row below. Arching up keeps same-lane strings — the majority —
 * entirely in empty space.
 */
export function stringPath(a: Pick<Node, 'x' | 'ty'>, b: Pick<Node, 'x' | 'ty'>, gutter: number): { d: string; mx: number; my: number } {
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
