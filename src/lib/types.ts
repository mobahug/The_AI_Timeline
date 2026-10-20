/* The shapes the board is made of. The JSON in data/ is the source of truth;
   these are the types it is read into, and the derived shapes the views take. */

export type Confidence = 'Likely' | 'Uncertain' | 'Speculative';
export type SourceKind = 'primary' | 'paper' | 'article' | 'video' | 'podcast' | 'interview' | 'encyclopedia';

/** One citation on a card, as written in data/events.json. */
export interface SourceRaw {
  kind?: SourceKind | string;
  publisher?: string;
  title?: string;
  url?: string;
  date?: string;
  at?: string;
  quote?: string;
  supports?: 'claim' | 'context' | string;
}

/** A citation as the views read it: every field present, and whether it
 *  supports the claim (it carries a quote) or only gives context. */
export interface Source {
  kind: string;
  publisher: string;
  title: string;
  url: string;
  date: string;
  at: string;
  quote: string;
  supports: 'claim' | 'context';
  legacy: boolean;
}

export interface Figure { label: string; value: string }

/** A card, as written in data/events.json. */
export interface EventRaw {
  id: string;
  year: number;
  /** `YYYY-MM` or `YYYY-MM-DD`, where the record knows it. Never on a scenario:
   *  a scenario's year is a placeholder and a date would read as a forecast. */
  date?: string;
  category: string;
  title: string;
  summary: string;
  source?: string;
  url?: string;
  why?: string;
  detail?: string[];
  figures?: Figure[];
  firsts?: string;
  people?: string[];
  orgs?: string[];
  terms?: string[];
  sources?: SourceRaw[];
  confidence?: Confidence;
  /** On a scenario: the record cards that brought part of it early. */
  early?: string[];
  featured?: boolean;
  wikiTitle?: string;
}

/* ─── Papers ─────────────────────────────────────────────────────────────
   A card on the wall is its head: the year, the title, the summary, the tags,
   the page it is cited to. Its papers are what a reader opens it for — the
   reading (`why`), the file (`detail`), the figures and the sources — and they
   are two thirds of what data/events.json weighs, while most pages print none
   of them. The build files them apart (scripts/split-events.ts) and they are
   read through src/lib/papers.ts, never off the card. */
export const PAPER_FIELDS = ['why', 'detail', 'figures', 'sources'] as const;
export type PaperField = typeof PAPER_FIELDS[number];
/** A card's papers, as written. */
export type Papers = Pick<EventRaw, PaperField>;

/** The names a card's own words use that its tags do not, by tag field. */
export type Named = Partial<Record<'people' | 'orgs' | 'terms', string[]>>;

/** A card as the build files it for the wall: everything but its papers, and
 *  the names its words use that its tags do not — found once, over the whole
 *  card, papers and all, at build time. */
export type EventHead = Omit<EventRaw, PaperField> & { named?: Named };

/** A card on the board: its head plus what is derived from it. */
export interface Event extends EventHead {
  thread: string;
  future: boolean;
  landmark?: boolean;
}

/** A card with its papers in hand: one a test writes, or one the graph is
 *  given beside the file. Read as written; a filed card is read from papers.ts. */
export type Dossier = Event & Papers;

/** A string, as written in data/links.json. */
export interface LinkRaw { from: string; to: string; claim: string; note?: string }
/** A string as every page holds it (scripts/split-events.ts): its claim, and
 *  whether it carries a case note. The note itself is read by the pages that
 *  print one, by the string's two ends (src/lib/bodies/links.ts). */
export interface LinkHead { from: string; to: string; claim: string; noted?: boolean }
/** A string on the board: with the id the graph gives it. */
export interface Edge extends LinkHead { id: string }

/** One end of a string as seen from a card: the other card, and the direction. */
export interface Adjacent { id: string; claim: string; noted?: boolean; out: boolean; edge: string }

export interface Graph {
  all: Event[];
  index: Record<string, Event>;
  edges: Edge[];
  adjacency: Record<string, Adjacent[]>;
  landmarks: number;
}

/** A step of a walked chain: from one card to the next, by a claim. A rung of a
 *  lead is also a step, and says which lead and which rung, and carries the
 *  rung's words as its note (src/lib/bodies/leads.ts). */
export interface Step {
  from: string;
  to: string;
  claim: string;
  note?: string;
  lead?: string;
  rung?: number;
  of?: number;
  string?: Edge | null;
}

export interface Thread { id: string; label: string }
/** A category: its chip, its hue on the board, the row it is drawn in, and
 *  what it covers in a reader's words (shown where the categories are explained). */
export interface Category { id: string; label: string; hue: number; thread: string; blurb?: string }
export interface Era { year: number; range: string; title: string; subtitle: string }

export interface Finding { n: number; from: number; title: string; lead: string | null; blurb: string }

export interface RungRaw { event: string; label: string; text: string }
export type LeadKind = 'capability' | 'failure' | 'economy';
export interface Lead {
  id: string;
  title: string;
  kind: LeadKind;
  hue: number;
  question: string;
  blurb: string;
  standing: string;
  rungs: RungRaw[];
}
/** What every page may know of a lead: enough to list it, find it, describe it
 *  and draw its ladder. Where it stands and its rungs' words are its own
 *  pages' (src/lib/bodies/leads.ts). */
export type RungHead = Omit<RungRaw, 'text'>;
export type LeadHead = Omit<Lead, 'standing' | 'rungs'> & { rungs: RungHead[] };

/** A plain question a reader brings, answered from what the board's cards
 *  already say (data/questions.json). */
export interface QuestionRecord { event: string; note: string }
/** A card on a record's list, as every page holds it: which card it is. The
 *  line the record gives it is printed on the record's own pages and on the
 *  card's dossier (src/lib/bodies/notes.ts). */
export type QuestionRecordHead = Omit<QuestionRecord, 'note'>;
export interface Question {
  id: string;
  question: string;
  short: string;
  answer: string[];
  inPractice?: string;
  record: QuestionRecord[];
  open: string;
  leads: string[];
}
/** What every page may know of a plain question: enough to list it, and the
 *  cards it rests on. The answer itself is its own page's
 *  (src/lib/bodies/questions.ts). */
export type QuestionHead = Pick<Question, 'id' | 'question' | 'short' | 'leads'> & { record: QuestionRecordHead[] };

/** A widely reported AI headline set beside the primary account it rests on,
 *  quoted on both sides (data/checks.json). */
export type Verdict = 'stands' | 'overtaken' | 'misleading' | 'contradicted';
export interface CheckSource { publisher: string; title: string; url: string; date: string }
export interface CheckClaim {
  /** The report's words, verbatim. */
  said: string;
  verdict: Verdict;
  /** The primary account's words, verbatim, each from one of the check's primary sources. */
  primary: { source: string; quote: string }[];
  note: string;
}
export interface Check {
  id: string;
  title: string;
  checked: string;
  verdict: Verdict;
  short: string;
  reported: CheckSource & { byline?: string };
  primary: (CheckSource & { id: string })[];
  claims: CheckClaim[];
  reading: string[];
  record: QuestionRecord[];
  open: string;
  leads: string[];
}
/** What every page may know of a headline check: enough to list it, say its
 *  verdict, and the cards it touches. The report, the primary accounts and the
 *  lines checked are its own pages' (src/lib/bodies/checks.ts). */
export type CheckHead = Pick<Check, 'id' | 'title' | 'checked' | 'verdict' | 'short' | 'leads'> & { record: QuestionRecordHead[] };

/** A prediction about AI, quoted from where it was made, set beside what
 *  happened (data/predictions.json). */
export type Foretold = 'kept' | 'early' | 'late' | 'overdue' | 'wrong' | 'disputed' | 'open';
export interface PredictionSource { id: string; kind: SourceKind; publisher: string; title: string; url: string; date: string }
export interface Prediction {
  id: string;
  /** What was predicted, in the board's words; never dressed as a quotation. */
  title: string;
  who: string;
  people: string[];
  /** When it was said: `YYYY`, `YYYY-MM` or `YYYY-MM-DD`. */
  said: string;
  /** The prediction, verbatim, from the source named by `source`. */
  words: string;
  source: string;
  /** The words are a report's direct quotation, not the original. */
  reported?: boolean;
  /** The year it names, or that its words let be worked out. */
  by: number;
  /** The words inside `words` that set the year. */
  byWords: string;
  verdict: Foretold;
  /** The year it came true, when it did. */
  came?: number;
  short: string;
  reading: string[];
  evidence: { source: string; quote: string }[];
  sources: PredictionSource[];
  record: QuestionRecord[];
  open: string;
  checked: string;
  leads: string[];
}

/** What every page may know of a prediction: enough to list it and to say how
 *  it went. Its words, its verdict at length and its sources are its own
 *  pages' (src/lib/bodies/predictions.ts). */
export type PredictionHead = Pick<Prediction, 'id' | 'title' | 'who' | 'people' | 'said' | 'by' | 'verdict' | 'came' | 'short'> & { record: QuestionRecordHead[] };

/** Promises made (data/promises.json): a commitment a lab, a company or a
 *  government made in public, in words that can be quoted, set beside what the
 *  record shows it did. A verdict is about the words, not the people. */
export type PledgeVerdict = 'kept' | 'partly' | 'broken' | 'dropped' | 'disputed' | 'open';
export interface Pledge {
  id: string;
  /** What was promised, in the board's words; never dressed as a quotation. */
  title: string;
  who: string;
  people: string[];
  orgs: string[];
  /** When it was said, `YYYY-MM-DD`. */
  said: string;
  /** The promise, verbatim, from the source named by `source`. */
  words: string;
  source: string;
  /** The deadline it named, if it named one: `YYYY` or `YYYY-MM-DD`. */
  by?: string;
  /** The words inside `words` that set the deadline. */
  byWords?: string;
  verdict: PledgeVerdict;
  /** When the record settled it, `YYYY-MM-DD`; absent while it is open. */
  settled?: string;
  short: string;
  reading: string[];
  evidence: { source: string; quote: string }[];
  sources: PredictionSource[];
  record: QuestionRecord[];
  open: string;
  checked: string;
  leads: string[];
}
/** What every page may know of a promise: enough to list it and say how it
 *  stands. Its words, its reading and its sources are its own pages'
 *  (src/lib/bodies/pledges.ts). */
export type PledgeHead = Pick<Pledge, 'id' | 'title' | 'who' | 'people' | 'orgs' | 'said' | 'by' | 'verdict' | 'settled' | 'short'> & { record: QuestionRecordHead[] };

/** Corrections (data/corrections.json): a change of fact the board made to
 *  its own record, dated by the commit that made it. */
export type CorrectionKind = 'fact' | 'date' | 'figure' | 'attribution' | 'framing' | 'citation';
export interface Correction {
  id: string;
  /** The day of the commit that made it, `YYYY-MM-DD`. */
  date: string;
  commit: string;
  /** The card it corrected; or `where`, for a lead's rung, a string or a bio. */
  event?: string;
  where?: { file: string; id: string };
  kind: CorrectionKind;
  /** What the record said, verbatim, and what it says now. */
  was: string;
  now: string;
  why: string;
  source?: { publisher: string; title: string; url: string };
  /** The same error, fixed in the same commit, elsewhere in data/. */
  alsoIn?: { file: string; id: string }[];
}

/** A program from the record rebuilt to run in the browser from its original
 *  papers (data/machines.json), run on its card. `kept` says what is as it was,
 *  `changed` what is not. */
export type MachineKind = 'eliza' | 'menace' | 'shannon' | 'perceptron';
export interface MachineSource { kind: SourceKind; publisher: string; title: string; url: string; date?: string; quote?: string }
export interface Machine {
  id: MachineKind;
  event: string;
  title: string;
  short: string;
  lede: string;
  try?: string[];
  kept: string[];
  changed: string[];
  credit: string;
  sources: MachineSource[];
  lead?: { id: string; rung: number };
}
/** What every page may know of a machine: which card runs it, and what it is
 *  in a line. What is as it was, what is not and the papers it was rebuilt
 *  from are the pages' that run it or list it (src/lib/bodies/machines.ts). */
export type MachineHead = Pick<Machine, 'id' | 'event' | 'title' | 'short' | 'lead'>;

/** One idea of the primer on the Start here page (data/primer.json): a term
 *  from the glossary, the idea in everyday words, and the cards it arrives on. */
export interface Idea { term: string; plain: string; cards: string[] }

/** A date the record already knows is coming, or a question it is waiting on
 *  (data/watch.json). `evidence` is the card's own words that say so. */
export interface Watch { id: string; date?: string; what: string; event: string; evidence: string }

/** A record the board's history dates (virtual:board-changes): when it was
 *  added and when it last changed, from the commits that did it. */
export type ChangeKind = 'card' | 'lead' | 'question' | 'check' | 'prediction' | 'promise';
export interface Change { kind: ChangeKind; id: string; added: string; changed: string; subject: string }

export interface Person { id: string; name: string; aka?: string[]; role: string; bio: string }
export interface Org { id: string; name: string; aka?: string[]; kind: string; role: string; bio: string }
export interface Term { id: string; term: string; aka?: string[]; short: string; definition: string }
/** What every page may know of a name on file: what it is called, and the line
 *  it is listed with. A bio or a definition is its own page's
 *  (src/lib/bodies/files.ts). */
export type PersonHead = Omit<Person, 'bio'>;
export type OrgHead = Omit<Org, 'bio'>;
export type TermHead = Omit<Term, 'definition'>;

export type EntityKind = 'person' | 'org' | 'term';
/** A person, an organisation or a term, as every page holds it, with the
 *  fields every kind shares. */
export type Entity =
  | (PersonHead & { kind: 'person'; label: string })
  | (OrgHead & { kind: 'org'; label: string })
  | (TermHead & { kind: 'term'; label: string });

export type Mode = 'brief' | 'full';

/** A view's id: every page the site has. */
export type ViewId =
  | 'landing' | 'line' | 'finding' | 'case' | 'horizon' | 'board' | 'card'
  | 'leads' | 'lead' | 'questions' | 'question' | 'checks' | 'check' | 'archive' | 'plates' | 'mosaic' | 'files' | 'person' | 'org' | 'glossary' | 'term' | 'about'
  | 'start' | 'latest' | 'charts' | 'machines' | 'predictions' | 'prediction' | 'promises' | 'promise' | 'corrections' | 'register';

/** The board's geometry for one window, from layout.ts. */
export interface Metrics {
  ruler: number; lane: number; cardH: number; gutter: number; cardW: number; gap: number; k: number;
  photo: boolean; side: boolean; thumb: number; fits: boolean;
  showCat: boolean; showConfidence: boolean; titleLines: number; titlePx: number; boardW: number;
}

/** A card placed on the board. */
export interface Node { event: Event; x: number; top: number; y: number; ty: number; tilt: number }

export interface Layout { nodes: Node[]; xOf: (year: number) => number; width: number; height: number }

/** One finding's stretch of the line, from spine.ts. */
export interface Row {
  finding: Finding;
  span: { from: number; to: number };
  cards: Event[];
  lead: Event | null;
  kind: 'argued' | 'connected' | 'context';
  inside: Edge[];
  leaving: Edge[];
  arriving: Edge[];
  threads: Thread[];
  unstrung: Event[];
  sourced: number;
  projections: number;
}
export interface Joint { from: Row; to: Row; crossing: Edge[] }
export interface Line { rows: Row[]; joints: Joint[]; lastYear: number }

export type Accent = (cat: string, alpha?: number) => string;

/* ─── Derived from the graph, in data.ts ─────────────────────────────────── */

export interface Chain { steps: Step[]; start: number }

export interface Horizon { id: 'near' | 'mid' | 'far'; label: string; from: number; to: number }

/** A parent of a card, with the string that ties them. */
export interface Parent { event: Event; claim: string; noted?: boolean }

export interface Strand {
  parents: Parent[];
  hops: number;
  paths: number;
  record: Event[];
  restsOn: Event[];
  uncited: Event[];
  roots: Event[];
  notes: number;
  jump: number | null;
}

export interface HorizonLedger {
  strands: { event: Event; strand: Strand }[];
  total: number;
  argued: number;
  confidence: [string, number][];
  medianJump: number | null;
  reachesBackTo: number | null;
  silentThreads: Thread[];
}

export interface ForwardLedger {
  total: number; span: number; argued: number; landing: number; crossing: number; internal: number;
  recordTotal: number; recordUnstrung: number;
}

export interface Standing { event: Event; into: Parent[] }

/** One hop of a road: from a parent to its child, by a claim. */
export interface Hop { from: Event; claim: string; noted?: boolean; to: Event }
export interface Roads { roads: Hop[][]; truncated: boolean; longest: number }

export interface ThreadRow { thread: Thread; scenarios: Event[]; argued: number; recordCount: number; recordEndsAt: number | null }
export interface LoadRow { event: Event; futures: number; all: number }

export interface EraGroup { era: Era; items: Event[] }

/* ─── Leads, resolved against the graph (leads.ts) ───────────────────────── */

/** A rung with its number and its card: its head, or the rung in full when the
 *  lead was built from a lead in full (bodies/leads.ts). */
export type Rung<R extends RungHead = RungHead> = R & { n: number; card: Event };
export interface LeadStep<R extends RungHead = RungHead> { from: Rung<R>; to: Rung<R>; string: Edge | null }
export interface BuiltLead<R extends RungHead = RungHead> {
  lead: LeadHead;
  rungs: Rung<R>[];
  steps: LeadStep<R>[];
  strung: number;
  span: { from: number; to: number } | null;
  threads: string[];
  record: number;
  scenarios: number;
}
export interface LeadOf { lead: LeadHead; index: number; rung: RungHead }

export interface SourceStrength {
  total: number; supporting: number; context: number; migrated: boolean; media: number;
  state: 'quoted' | 'cited' | 'unsourced';
}

export interface SpringOpts { stiffness?: number; damping?: number; mass?: number; v0?: number }

export interface Clue { from: string; to: string }

/** The route: the address, parsed. */
export interface Route {
  view: ViewId;
  id: string | null;
  finding: string | null;
  category: string;
  query: string;
  clue: Clue | null;
  lead: string | null;
  rung: number | null;
  hash: string | null;
  /** The scroll offset to return to on Back; 0 for a fresh page. */
  pop?: number;
  /** An old-form address, to be rewritten. */
  legacy?: boolean;
  /** An address that names no page, as typed: the front page shows, and says so. */
  missing?: string;
  /** A ?mode= in the address, consumed on load. */
  mode?: Mode;
}

/** What navigate() takes: any part of a route. */
export type RoutePatch = Partial<Route>;

/** One cached Wikipedia summary: the photograph and the extract. `gone` is the
 *  fetch script's own note, a photograph Wikimedia has deleted before Wikipedia
 *  offered another: img stays empty meanwhile, and the next fetch asks again. */
export interface WikiPage { img: string; extract: string; gone?: string }
export type WikiCache = Record<string, WikiPage>;

/** What the media hook hands back for a card. */
export interface Shot {
  img: string;
  extract: string;
  borrowed?: string;
  cited: { title: string; url: string; extract: string; wikipedia: boolean } | null;
}
export type Media = (event: Event | null | undefined) => Shot;

export interface PageMeta { title: string; description: string; route: Route }
