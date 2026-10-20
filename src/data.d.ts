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

/* The other files of records, each read in two parts — see SPLITS in
   scripts/split-events.ts. A part keeps the file's shape: the records under
   the same key, each cut to what that part keeps. The heads are what every
   page lists from; the bodies are imported by the pages that print them
   (src/lib/bodies/). */

declare module '*/data/predictions.json?heads' {
  const file: { predictions: import('./lib/types').PredictionHead[] };
  export default file;
}
declare module '*/data/predictions.json?bodies' {
  const file: { predictions: (Pick<import('./lib/types').Prediction, 'id' | 'words' | 'source' | 'reported' | 'byWords' | 'reading' | 'evidence' | 'sources' | 'open' | 'checked' | 'leads'> & { record: Pick<import('./lib/types').QuestionRecord, 'note'>[] })[] };
  export default file;
}

declare module '*/data/promises.json?heads' {
  const file: { promises: import('./lib/types').PledgeHead[] };
  export default file;
}
declare module '*/data/promises.json?bodies' {
  const file: { promises: (Pick<import('./lib/types').Pledge, 'id' | 'words' | 'source' | 'byWords' | 'reading' | 'evidence' | 'sources' | 'open' | 'checked' | 'leads'> & { record: Pick<import('./lib/types').QuestionRecord, 'note'>[] })[] };
  export default file;
}

/* The strings: each one's claim, and whether it carries a case note; the notes
   of those that do, by the string's two ends. */
declare module '*/data/links.json?heads' {
  const links: import('./lib/types').LinkHead[];
  export default links;
}
declare module '*/data/links.json?bodies' {
  const links: Required<Pick<import('./lib/types').LinkRaw, 'from' | 'to' | 'note'>>[];
  export default links;
}

declare module '*/data/leads.json?heads' {
  const file: { leads: import('./lib/types').LeadHead[] };
  export default file;
}
declare module '*/data/leads.json?bodies' {
  const file: { leads: (Pick<import('./lib/types').Lead, 'id' | 'standing'> & { rungs: Pick<import('./lib/types').RungRaw, 'text'>[] })[] };
  export default file;
}

declare module '*/data/questions.json?heads' {
  const file: { questions: import('./lib/types').QuestionHead[] };
  export default file;
}
declare module '*/data/questions.json?bodies' {
  const file: { questions: (Pick<import('./lib/types').Question, 'id' | 'answer' | 'inPractice' | 'open'> & { record: Pick<import('./lib/types').QuestionRecord, 'note'>[] })[] };
  export default file;
}

declare module '*/data/checks.json?heads' {
  const file: { checks: import('./lib/types').CheckHead[] };
  export default file;
}
declare module '*/data/checks.json?bodies' {
  const file: { checks: (Pick<import('./lib/types').Check, 'id' | 'reported' | 'primary' | 'claims' | 'reading' | 'open'> & { record: Pick<import('./lib/types').QuestionRecord, 'note'>[] })[] };
  export default file;
}

declare module '*/data/machines.json?heads' {
  const file: { machines: import('./lib/types').MachineHead[] };
  export default file;
}
declare module '*/data/machines.json?bodies' {
  const file: { machines: Pick<import('./lib/types').Machine, 'id' | 'lede' | 'try' | 'kept' | 'changed' | 'credit' | 'sources'>[] };
  export default file;
}

declare module '*/data/people.json?heads' {
  const file: { people: import('./lib/types').PersonHead[] };
  export default file;
}
declare module '*/data/people.json?bodies' {
  const file: { people: Pick<import('./lib/types').Person, 'id' | 'bio'>[] };
  export default file;
}

declare module '*/data/orgs.json?heads' {
  const file: { orgs: import('./lib/types').OrgHead[] };
  export default file;
}
declare module '*/data/orgs.json?bodies' {
  const file: { orgs: Pick<import('./lib/types').Org, 'id' | 'bio'>[] };
  export default file;
}

declare module '*/data/glossary.json?heads' {
  const file: { terms: import('./lib/types').TermHead[] };
  export default file;
}
declare module '*/data/glossary.json?bodies' {
  const file: { terms: Pick<import('./lib/types').Term, 'id' | 'definition'>[] };
  export default file;
}

/* What changed on the board lately, dated from the git history at build time
   — see scripts/board-changes.ts. The latest page imports it; the days each
   card was filed and last changed are filed with its papers. */
declare module 'virtual:board-changes' {
  const changes: import('./lib/types').Change[];
  export default changes;
}
