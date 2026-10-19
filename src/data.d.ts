/* The two projections of data/events.json that the build answers — see
   scripts/split-events.ts. The file itself is never imported whole. */

declare module '*/data/events.json?cards' {
  const cards: import('./lib/types').EventHead[];
  export default cards;
}

declare module '*/data/events.json?papers' {
  const papers: Record<string, import('./lib/types').Papers>;
  export default papers;
}

/* Said in advance, as most pages read it: each prediction's head only — see
   scripts/split-events.ts and src/lib/predictions.ts. */
declare module '*/data/predictions.json?heads' {
  const heads: import('./lib/types').PredictionHead[];
  export default heads;
}

/* What changed on the board lately, dated from the git history at build time —
   see scripts/board-changes.ts. */
declare module 'virtual:board-changes' {
  const changes: import('./lib/types').Change[];
  export default changes;
  /** Every dated record, by `kind/id`: the day it was filed and the day it last changed. */
  export const DATED: Record<string, [string, string]>;
}
