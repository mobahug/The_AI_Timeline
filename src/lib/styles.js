/* The site's visual vocabulary, in one place. Tokens first, then pure style
   helpers. Every view composes from these; none re-derives its own rule, gutter,
   badge or button. Where variants had drifted, the most-used one is the value
   kept here, so adopting a helper changes as few pixels as possible. */

/* ─── Tokens ─────────────────────────────────────────────────────────────── */

export const INK = '#f3f0ea';
export const PAPER = '#e9e3d4';
export const MANILA = '#d9cfb8';
export const GROUND = '#0a0a0b';
/** The recessed well a photograph sits in, and the board's own dark. */
export const WELL = '#0e0e11';
export const RED = 'oklch(0.58 0.2 25)';
export const RED_LIT = 'oklch(0.68 0.24 25)';
/** The ink the strings are drawn in; also the claim chip and the quote marks. */
export const STRING_INK = 'oklch(0.78 0.16 25)';
export const GOLD = 'oklch(0.82 0.13 85)';
export const CYAN = 'oklch(0.85 0.12 200)';
export const MONO = "'IBM Plex Mono', ui-monospace, monospace";
export const SERIF = "'Instrument Serif', Georgia, serif";
export const SANS = "'Helvetica Neue', Helvetica, Arial, sans-serif";

/** Ink on the ground, in five steps. 0.5 is the lowest alpha that clears WCAG AA
 *  4.5:1 on #0a0a0b (4.83:1); 0.45 is 4.11:1 and fails. No text sits below ink(5).
 *  1 title · 2 the author's reading · 3 lede, body · 4 row summary, figures,
 *  credits · 5 eyebrows and micro labels. */
const INK_STEPS = { 1: 1, 2: 0.84, 3: 0.7, 4: 0.58, 5: 0.5 };
export const ink = (step = 3) => 'rgba(243,240,234,' + (INK_STEPS[step] || step) + ')';
/** Ink on paper (the board's cards), same idea, dark on light. */
export const paperInk = (a) => 'rgba(23,22,26,' + a + ')';

export const RULE = '1px solid rgba(243,240,234,0.12)';
export const ROW_RULE = '1px solid rgba(243,240,234,0.08)';
export const DASHED_RULE = '1px dashed rgba(243,240,234,0.28)';
export const DASHED_ROW = '1px dashed rgba(243,240,234,0.2)';

/** One page gutter everywhere: 16px on a phone, 32px on a desk. */
export const GUTTER = 'clamp(16px,4vw,32px)';
export const SHELL_BOTTOM = 120;

export const EASE = 'cubic-bezier(.22,.7,.3,1)';
export const FADE = 'fadeIn .2s both';
export const RISE = 'riseIn .45s ' + EASE + ' both';

export const PHOTO_FILTER = 'saturate(0.9) contrast(1.03)';
export const PLACEHOLDER = 'repeating-linear-gradient(135deg,rgba(243,240,234,0.06) 0 6px,transparent 6px 12px)';

/* ─── Helpers ────────────────────────────────────────────────────────────── */

/** The 9.5px uppercase mono label. `tier` sets the tracking: 'page' for the
 *  eyebrow directly above an h1, 'section' for a label above a block, default
 *  for everything inline. `opacity` may be an ink step (1–5) or a raw alpha. */
export const micro = (opacity = 5, tier) => ({
  font: '400 9.5px/1 ' + MONO,
  letterSpacing: tier === 'page' ? '0.24em' : tier === 'section' ? '0.2em' : '0.16em',
  textTransform: 'uppercase',
  textDecoration: 'none',
  color: ink(opacity)
});

const BUTTON_SIZE = {
  sm: { padding: '6px 11px', font: '400 9.5px/1 ' + MONO },
  md: { padding: '7px 12px', font: '400 10px/1 ' + MONO },
  lg: { padding: '9px 12px', font: '400 10px/1 ' + MONO },
  hero: { padding: '13px 20px', font: '400 10px/1 ' + MONO }
};

/** tone: 'quiet' (default) · 'loud' (the one primary action in view) · 'dim'
 *  (the least-prominent action in a group — dismiss, restore, a third door).
 *  size: 'sm' beside micro labels · 'md' default · 'lg' beside a field or in the
 *  narrow header and its sheet · 'hero' on the landing only. */
export const button = (tone = 'quiet', size = 'md') => ({
  border: '1px solid ' + (tone === 'loud' ? RED : 'rgba(243,240,234,0.2)'),
  background: tone === 'loud' ? 'rgba(255,80,60,0.1)' : 'transparent',
  color: tone === 'loud' ? INK : tone === 'dim' ? ink(5) : ink(3),
  borderRadius: 2,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  textDecoration: 'none',
  display: 'inline-block',
  ...(BUTTON_SIZE[size] || BUTTON_SIZE.md)
});

export const field = {
  border: '1px solid rgba(243,240,234,0.2)',
  background: '#0c0c0e',
  color: INK,
  borderRadius: 2,
  padding: 8,
  font: '400 12px/1.2 ' + MONO
};

/** The category chip, in the category's own hue. */
export const tag = (cat, accent) => ({
  font: '400 10px/1 ' + MONO,
  letterSpacing: '0.16em',
  textTransform: 'uppercase',
  color: accent(cat, 0),
  border: '1px solid ' + accent(cat, 0.55),
  borderRadius: 2,
  padding: '4px 7px',
  whiteSpace: 'nowrap'
});

/** The confidence chip on a scenario. Its text is the bare confidence word; the
 *  dashed edge is what says "scenario", as it does on every manila element. */
export const badge = () => ({
  ...micro(4),
  border: '1px dashed rgba(243,240,234,0.3)',
  borderRadius: 2,
  padding: '4px 7px',
  whiteSpace: 'nowrap'
});

/** A page's column. 'read' for one card or the essay, 'route' for the line and
 *  the open file, 'wide' for the board, the archive and the landing. */
const SHELL_WIDTH = { read: 920, route: 1100, wide: 1400 };
export const shell = (kind = 'wide') => ({
  maxWidth: SHELL_WIDTH[kind] || SHELL_WIDTH.wide,
  margin: '0 auto',
  padding: '0 ' + GUTTER + ' ' + SHELL_BOTTOM + 'px'
});

/** The small tabular year that precedes a title in running text. */
export const yearBit = {
  font: '400 11px/1 ' + MONO,
  color: ink(4),
  fontVariantNumeric: 'tabular-nums',
  marginRight: 5
};

/** An inline "year title" reference; `size` carries the emphasis of its place. */
export const ref = (size = 15) => ({
  font: '400 ' + (typeof size === 'number' ? size + 'px' : size) + '/1.25 ' + SERIF,
  color: INK,
  letterSpacing: '-0.015em'
});

/** The year + category + confidence + title headline, at three scales. */
const HEADLINE = {
  page: { year: 'clamp(30px,4.6vw,52px)/1', title: 'clamp(28px,4.8vw,54px)/1.04' },
  panel: { year: 'clamp(24px,2.6vw,34px)/1', title: 'clamp(18px,2vw,24px)/1.14' },
  row: { year: '24px/1', title: '17px/1.2' }
};
export const headline = (size = 'panel') => ({
  // Longhands, not the `font` shorthand: the year sits beside a longhand
  // (fontVariantNumeric), and React will not update a shorthand next to a
  // longhand when the size flips — the panel's card becomes the page's.
  year: {
    fontFamily: SERIF,
    fontWeight: 400,
    fontSize: (HEADLINE[size] || HEADLINE.panel).year.split('/')[0],
    lineHeight: (HEADLINE[size] || HEADLINE.panel).year.split('/')[1],
    fontVariantNumeric: 'tabular-nums',
    letterSpacing: '-0.03em'
  },
  title: {
    margin: 0,
    font: '400 ' + (HEADLINE[size] || HEADLINE.panel).title + ' ' + SERIF,
    letterSpacing: '-0.025em',
    textWrap: 'balance',
    color: INK
  }
});

/** The author's reading of a card — its `why` — set in serif behind the
 *  category's own bar. Callers keep their own maxWidth. */
export const reading = (cat, accent, size = 'md') => ({
  margin: 0,
  font: '400 ' + (size === 'lg' ? 'clamp(16px,1.7vw,19px)/1.5 ' : '15px/1.5 ') + SERIF,
  color: ink(2),
  borderLeft: '2px solid ' + accent(cat, 0),
  paddingLeft: 14,
  textWrap: 'pretty'
});

/** The well a photograph sits in; dashed for a scenario, like everything else. */
export const frame = (future = false) => ({
  borderRadius: 3,
  backgroundColor: WELL,
  border: future ? '1px dashed rgba(243,240,234,0.22)' : RULE
});

/** The small "Source ↗" affordance beside a title. */
export const sourceLink = { ...micro(1), letterSpacing: '0.14em' };

/** The body paragraph on a page. */
export const prose = {
  margin: 0,
  font: '400 clamp(13px,1.15vw,14.5px)/1.62 ' + SANS,
  color: ink(3),
  textWrap: 'pretty'
};
