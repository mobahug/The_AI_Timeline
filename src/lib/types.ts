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
  featured?: boolean;
  wikiTitle?: string;
}

/** A card on the board: the raw entry plus what is derived from it. */
export interface Event extends EventRaw {
  thread: string;
  future: boolean;
  landmark?: boolean;
}

/** A string, as written in data/links.json. */
export interface LinkRaw { from: string; to: string; claim: string; note?: string }
/** A string on the board: with the id the graph gives it. */
export interface Edge extends LinkRaw { id: string }

/** One end of a string as seen from a card: the other card, and the direction. */
export interface Adjacent { id: string; claim: string; note?: string; out: boolean; edge: string }

export interface Graph {
  all: Event[];
  index: Record<string, Event>;
  edges: Edge[];
  adjacency: Record<string, Adjacent[]>;
  landmarks: number;
}

/** A step of a walked chain: from one card to the next, by a claim. A rung of a
 *  lead is also a step, and says which lead and which rung. */
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
export interface Category { id: string; label: string; hue: number; thread: string }
export interface Era { year: number; range: string; title: string; subtitle: string }
export interface Span { first: number; now: number; last: number }

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

export interface Person { id: string; name: string; aka?: string[]; role: string; bio: string }
export interface Org { id: string; name: string; aka?: string[]; kind: string; role: string; bio: string }
export interface Term { id: string; term: string; aka?: string[]; short: string; definition: string }

export type EntityKind = 'person' | 'org' | 'term';
/** A person, an organisation or a term, with the fields every kind shares. */
export type Entity =
  | (Person & { kind: 'person'; label: string })
  | (Org & { kind: 'org'; label: string })
  | (Term & { kind: 'term'; label: string });

export type Mode = 'brief' | 'full';

/** A view's id: every page the site has. */
export type ViewId =
  | 'landing' | 'line' | 'finding' | 'case' | 'horizon' | 'board' | 'card'
  | 'leads' | 'lead' | 'archive' | 'plates' | 'mosaic' | 'files' | 'person' | 'org' | 'glossary' | 'term' | 'about';

/** The board's geometry for one window, from layout.ts. */
export interface Metrics {
  ruler: number; lane: number; cardH: number; gutter: number; cardW: number; gap: number; k: number;
  photo: boolean; side: boolean; thumb: number; fits: boolean;
  showCat: boolean; titleLines: number; titlePx: number; boardW: number;
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
export interface Parent { event: Event; claim: string; note?: string }

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
export interface Hop { from: Event; claim: string; note?: string; to: Event }
export interface Roads { roads: Hop[][]; truncated: boolean; longest: number }

export interface ThreadRow { thread: Thread; scenarios: Event[]; argued: number; recordCount: number; recordEndsAt: number | null }
export interface LoadRow { event: Event; futures: number; all: number }

export interface EraGroup { era: Era; items: Event[] }

/* ─── Leads, resolved against the graph (leads.ts) ───────────────────────── */

/** A rung with its number and its card. */
export interface Rung extends RungRaw { n: number; card: Event }
export interface LeadStep { from: Rung; to: Rung; string: Edge | null }
export interface BuiltLead {
  lead: Lead;
  rungs: Rung[];
  steps: LeadStep[];
  strung: number;
  span: { from: number; to: number } | null;
  threads: string[];
  record: number;
  scenarios: number;
}
export interface LeadOf { lead: Lead; index: number; rung: RungRaw }

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
  /** An old-form or unknown address, to be rewritten. */
  legacy?: boolean;
  /** A ?mode= in the address, consumed on load. */
  mode?: Mode;
}

/** What navigate() takes: any part of a route. */
export type RoutePatch = Partial<Route>;

/** One cached Wikipedia summary: the photograph and the extract. */
export interface WikiPage { img: string; extract: string }
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
