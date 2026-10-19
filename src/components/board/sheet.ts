import { springDuration, springEasing } from '../../lib/motion';
import type { Claim } from '../../lib/motion';
import { EASE } from '../../lib/styles';

/* The phone's sheet: how it settles, how far it may stretch, its stops, and a
   pull of it in progress. Read by the board (BoardView.tsx). */

/* How the sheet settles on a stop: a spring, so it overshoots a touch and comes
   back, the way a native sheet does. `linear()` carries the real curve, with the
   finger's speed at release folded in; a browser without it gets a bezier that
   bounces the same amount from rest. Reduced motion zeroes the duration in CSS. */
/* The spring is damped to the edge of a bounce (ζ ≈ 0.85: it overshoots by
   well under one per cent, which the eye reads as weight, not play), and the
   bezier a browser without linear() gets is the site's one curve. */
export const SPRING = { stiffness: 400, damping: 34, mass: 1 };
export const SPRING_MS = springDuration(SPRING);
const HAS_LINEAR = typeof CSS !== 'undefined' && !!CSS.supports && CSS.supports('transition-timing-function', 'linear(0, 1)');
export const settle = (v0 = 0) => 'transform ' + SPRING_MS + 'ms ' + (HAS_LINEAR ? springEasing({ ...SPRING, v0 }) : EASE);
export const SHEET_TRANSITION = settle();
/** How far the sheet may bounce or be stretched past its top stop: the sheet
 *  is painted this much taller than it is, so the frame's floor never shows. */
export const SHEET_TAIL = 72;

/** The sheet's three stops on a narrow screen. */
export type Stop = 'peek' | 'half' | 'full';

/** A pull of the sheet, from the press to the release. */
export interface SheetDrag {
  x0: number; y0: number; h0: number; h: number; moved: boolean; t: number; y: number; v: number; raf: number | null;
  onHandle: boolean; claimed: Claim; scrollTop: number; mouse: boolean; captured: boolean;
}
