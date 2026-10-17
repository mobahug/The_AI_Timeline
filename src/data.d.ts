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

/* What changed on the board lately, dated from the git history at build time —
   see scripts/board-changes.ts. */
declare module 'virtual:board-changes' {
  const changes: import('./lib/types').Change[];
  export default changes;
}
