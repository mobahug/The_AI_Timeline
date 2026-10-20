// How a cited page is read for its quotes: fetched, reduced to the text a
// reader sees, and searched for each quote character for character — curly
// quotes, dashes and all; only runs of whitespace are folded, and a word a
// PDF breaks at a line's end is read whole. Nothing is paraphrased into a
// match. scripts/check-quotes.ts reads the headline checks, Said in advance
// and the cards' sources through it.
//
// The routes the board relies on are taken here, so that every quote is read
// the same way:
//   - a Wayback Machine capture is read as archived (its `id_` copy, or the
//     archive's playback where that copy will not unpack), and with
//     --via=wayback every other page is read from its latest capture, or from
//     the latest that answered 200 where the newest replays a refusal;
//   - openai.com keeps much of a page's text only in the Next.js flight payload
//     (`self.__next_f.push`), and TED its transcript in `__NEXT_DATA__`; both
//     are decoded and read beside the HTML;
//   - Reuters and Guardian copies hide zero-width characters inside words,
//     which a reader never sees and which are dropped from every page;
//   - Wikipedia's footnote markers, the [1] after a sentence, are dropped: they
//     point to a note and are not words of the sentence;
//   - a European Commission press-corner page and a Mastodon post are drawn by
//     script, and their text is read from the site's own API;
//   - a PDF is read with macOS PDFKit where it is available. Elsewhere it is
//     reported as a PDF not read, never as a missing quote.
import { execFile } from 'node:child_process';

export const UA = 'Mozilla/5.0 (compatible; TheAITimeline-quotecheck/1.0; +https://github.com/mobahug/The_AI_Timeline)';

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: '\u00A0', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', mdash: '—', ndash: '–', hellip: '…' };

/** The other entities a page may carry, named as HTML names them, case and all. */
const NAMED: Record<string, string> = {
  sbquo: '‚', bdquo: '„', laquo: '«', raquo: '»', lsaquo: '‹', rsaquo: '›', prime: '′', Prime: '″', hyphen: '‐', minus: '−',
  bull: '•', middot: '·', deg: '°', times: '×', divide: '÷', plusmn: '±', sect: '§', para: '¶', copy: '©', reg: '®', trade: '™',
  euro: '€', pound: '£', yen: '¥', cent: '¢', dagger: '†', Dagger: '‡', permil: '‰', frac12: '½', frac14: '¼', frac34: '¾',
  sup2: '²', sup3: '³', iexcl: '¡', iquest: '¿', micro: 'µ', szlig: 'ß', aelig: 'æ', AElig: 'Æ', oelig: 'œ', OElig: 'Œ',
  oslash: 'ø', Oslash: 'Ø', eth: 'ð', ETH: 'Ð', thorn: 'þ', THORN: 'Þ', lstrok: 'ł', Lstrok: 'Ł', dstrok: 'đ', Dstrok: 'Đ', imath: 'ı',
  alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', epsilon: 'ε', theta: 'θ', lambda: 'λ', mu: 'μ', pi: 'π', sigma: 'σ', tau: 'τ', phi: 'φ', omega: 'ω',
  thinsp: '\u2009', ensp: '\u2002', emsp: '\u2003', hairsp: '\u200A', shy: '\u00AD', zwnj: '\u200C', zwj: '\u200D', lrm: '\u200E', rlm: '\u200F'
};

/** A letter with a mark, as HTML names it: &eacute;, &odblac;, &ccaron;. */
const MARKS: Record<string, number> = { grave: 0x300, acute: 0x301, circ: 0x302, tilde: 0x303, macr: 0x304, breve: 0x306, dot: 0x307, uml: 0x308, ring: 0x30a, dblac: 0x30b, caron: 0x30c, cedil: 0x327, ogon: 0x328 };
const MARKED = /^([a-zA-Z])(grave|acute|circ|tilde|macr|breve|dot|uml|ring|dblac|caron|cedil|ogon)$/;

function entity(name: string): string | undefined {
  const known = ENTITIES[name.toLowerCase()] ?? NAMED[name];
  if (known !== undefined) return known;
  const m = MARKED.exec(name);
  if (!m) return undefined;
  const letter = (m[1] + String.fromCodePoint(MARKS[m[2]])).normalize('NFC');
  return [...letter].length === 1 ? letter : undefined;
}

/** Zero-width space, zero-width non-joiner and word joiner: never seen, never quoted. */
const INVISIBLE = /[\u200B\u200C\u2060]/g;

/** A page's readable text: no scripts or styles, tags gone (block tags leave a
 *  space, inline ones nothing, so a word split by <em> stays whole), entities
 *  decoded, zero-width characters dropped, whitespace folded to single spaces.
 *  An <svg/> closed in its own tag is empty, as a browser reads it, and does
 *  not run on to the next </svg>: chilton-computing.org.uk sets one above the
 *  Lighthill report's text. */
export function textOf(html: string): string {
  return html
    .replace(/<svg\b[^>]*\/>/gi, ' ')
    .replace(/<(script|style|noscript|svg)\b[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<\/?(p|div|h[1-6]|li|ul|ol|br|blockquote|figcaption|section|article|header|footer|tr|td|th|title)\b[^>]*>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+\d*);/gi, (m, code: string) => {
      if (code[0] !== '#') return entity(code) ?? m;
      const point = code[1].toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return point <= 0x10ffff ? String.fromCodePoint(point) : m;
    })
    .replace(INVISIBLE, '')
    .replace(/[\s\u00A0]+/g, ' ');
}

export const fold = (s: string) => s.replace(/[\s\u00A0]+/g, ' ').trim();

/* ─── The Next.js flight payload ─────────────────────────────────────────
   A Next.js page sends the React tree it was rendered from in script tags,
   `self.__next_f.push([1, "<chunk>"])`, and openai.com's pages, as archived,
   often carry an article's text only there. The chunks join into rows,
   `<id>:<json>` to a line or `<id>:T<length>,<text>` with the text's length
   in UTF-8 bytes; an element is `["$", type, key, props]`, and a string
   `"$<id>"` (or `"$L<id>"`, `"$@<id>"`) stands for another row's value. The
   tree is drawn back into HTML, its text escaped, so that textOf() reads it by
   the same rules as the page itself. */

const PUSH = /self\.__next_f\.push\(\[1,("(?:[^"\\]|\\[\s\S])*")\]\)/g;
const REF = /^\$[L@]?([0-9a-f]+)$/;
const SKIP = new Set(['script', 'style', 'noscript', 'svg', 'template']);

/** Where `bytes` UTF-8 bytes of `s`, read from `start`, end. */
function afterBytes(s: string, start: number, bytes: number): number {
  let i = start;
  while (bytes > 0 && i < s.length) {
    const c = s.codePointAt(i) as number;
    bytes -= c < 0x80 ? 1 : c < 0x800 ? 2 : c < 0x10000 ? 3 : 4;
    i += c < 0x10000 ? 1 : 2;
  }
  return i;
}

const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** The flight payload of a Next.js page drawn back into HTML, a block for each
 *  row; '' where the page has none. */
export function flightOf(html: string): string {
  let stream = '';
  for (const m of html.matchAll(PUSH)) {
    try { stream += JSON.parse(m[1]) as string; } catch { /* a chunk cut short: read the rest */ }
  }
  if (!stream) return '';

  const rows = new Map<string, { json?: string; text?: string }>();
  const order: string[] = [];
  for (let i = 0; i < stream.length;) {
    const colon = stream.indexOf(':', i);
    if (colon < 0) break;
    const id = stream.slice(i, colon);
    if (!/^[0-9a-f]*$/.test(id)) break;
    const text = /^T([0-9a-f]+),/.exec(stream.slice(colon + 1, colon + 12));
    if (text) {
      const from = colon + 2 + text[1].length + 1;
      const to = afterBytes(stream, from, parseInt(text[1], 16));
      rows.set(id, { text: stream.slice(from, to) });
      i = to;
    } else {
      const nl = stream.indexOf('\n', colon);
      const end = nl < 0 ? stream.length : nl;
      rows.set(id, { json: stream.slice(colon + 1, end) });
      order.push(id);
      i = end + 1;
    }
  }

  const values = new Map<string, unknown>();
  const valueOf = (id: string): unknown => {
    if (!values.has(id)) {
      values.set(id, undefined);
      const row = rows.get(id);
      try { values.set(id, row?.json === undefined ? row?.text : JSON.parse(row.json)); } catch { /* a hint or an import, not a value */ }
    }
    return values.get(id);
  };

  // `raw` is HTML handed to dangerouslySetInnerHTML, drawn as it is.
  const draw = (v: unknown, raw: boolean, depth: number): string => {
    if (depth > 400) return '';
    if (typeof v === 'number') return String(v);
    if (typeof v === 'string') {
      if (v[0] !== '$') return raw ? v : escape(v);
      if (v.startsWith('$$')) return raw ? v.slice(1) : escape(v.slice(1));
      const ref = REF.exec(v);
      return ref ? draw(valueOf(ref[1]), raw, depth + 1) : '';
    }
    if (!Array.isArray(v)) return '';
    if (v[0] === '$' && typeof v[1] === 'string' && v.length >= 4) {
      const props = (v[3] ?? {}) as { children?: unknown; dangerouslySetInnerHTML?: { __html?: unknown } };
      const tag = /^[a-z][a-z0-9-]*$/.test(v[1]) ? v[1] : '';
      if (SKIP.has(tag)) return '';
      const html = props.dangerouslySetInnerHTML?.__html;
      const inner = html === undefined ? draw(props.children, false, depth + 1) : draw(html, true, depth + 1);
      return tag ? '<' + tag + '>' + inner + '</' + tag + '>' : inner;
    }
    return v.map((x) => draw(x, raw, depth + 1)).join('');
  };

  return order.map((id) => draw(valueOf(id), false, 0)).filter(Boolean).map((b) => '<div>' + b + '</div>').join('');
}

/** A Next.js page built before the flight payload sends its data as JSON in
 *  `<script id="__NEXT_DATA__">`, and draws from it what a reader opens —
 *  TED's transcript is there. Every string in it is a block of its own, read
 *  as HTML where it is HTML and as text where it is not, but for GraphQL's own
 *  fields (`__typename`), which would fall between the cues of a transcript;
 *  '' where the page has none. */
export function nextDataOf(html: string): string {
  const script = /<script\b[^>]*\bid="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i.exec(html);
  if (!script) return '';
  let data: unknown;
  try { data = JSON.parse(script[1]); } catch { return ''; }
  const blocks: string[] = [];
  const walk = (v: unknown, depth: number) => {
    if (depth > 200) return;
    if (typeof v === 'string') blocks.push('<div>' + (/<[a-z][^>]*>/i.test(v) ? v : escape(v)) + '</div>');
    else if (Array.isArray(v)) v.forEach((x) => walk(x, depth + 1));
    else if (v && typeof v === 'object') for (const [key, x] of Object.entries(v)) if (!key.startsWith('__')) walk(x, depth + 1);
  };
  walk(data, 0);
  return blocks.join('');
}

/** What a reader can read on a page: its HTML's text and, where it has them,
 *  its flight payload's and its __NEXT_DATA__'s, on lines of their own so that
 *  no quote is matched across a seam (folded text holds no line breaks). */
export function pageText(html: string): string {
  return [html, flightOf(html), nextDataOf(html)].filter(Boolean).map(textOf).join('\n');
}

/* ─── Where a quote parts from the page ──────────────────────────────────
   A quote not found is printed with the page's nearest reading, so that the
   fix can be seen without opening the page: a mark that differs (a straight
   apostrophe for a curly one), a word broken across a line, a word changed. */

/** The longest n up to max for which has(n) holds, given that it holds for
 *  every smaller n too. */
function longest(max: number, has: (n: number) => boolean): number {
  let lo = 0, hi = max;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (has(mid)) lo = mid; else hi = mid - 1;
  }
  return lo;
}

/** Quote marks, apostrophes and dashes made one of each, a character for a
 *  character, so that a place found in one is the same place in the other. */
const lookalike = (s: string) => s.replace(/[‘’‚‛′]/g, "'").replace(/[“”„‟″]/g, '"').replace(/[‐‑‒–—―−]/g, '-');

const codeOf = (c: string) => 'U+' + (c.codePointAt(0) as number).toString(16).toUpperCase().padStart(4, '0');
const plain = (s: string) => /^[ -~]*$/.test(s);
const clip = (s: string, n: number) => s.length <= n ? s : s.slice(0, (n >> 1) - 1) + '…' + s.slice(s.length - (n >> 1) + 1);

/** Where the page and the quote part, between an opening and an ending both
 *  share, found close together: the stretch of each that differs, and how
 *  much of the quote the two ends cover. */
interface Pair { covered: number; page: [number, number]; quote: [number, number] }

function fromHead(page: string, q: string, head: number): Pair | null {
  if (!head) return null;
  const from = page.indexOf(q.slice(0, head)) + head;
  const rest = q.slice(head);
  const window = page.slice(from, from + rest.length + 300);
  const tail = longest(rest.length, (n) => window.includes(rest.slice(rest.length - n)));
  if (tail < 4) return null;
  return { covered: head + tail, page: [from, from + window.indexOf(rest.slice(rest.length - tail))], quote: [head, q.length - tail] };
}

function fromTail(page: string, q: string, tail: number): Pair | null {
  if (!tail) return null;
  const to = page.indexOf(q.slice(q.length - tail));
  const rest = q.slice(0, q.length - tail);
  const lo = Math.max(0, to - rest.length - 300);
  const window = page.slice(lo, to);
  const head = longest(rest.length, (n) => window.includes(rest.slice(0, n)));
  if (head < 4) return null;
  return { covered: head + tail, page: [lo + window.lastIndexOf(rest.slice(0, head)) + head, to], quote: [head, q.length - tail] };
}

/** Null when the quote is on the page; otherwise where the page parts from it,
 *  in a line. The search makes quote marks and dashes alike, so that a mark
 *  that differs cannot hide where the words do; each side is shown in its own
 *  characters. */
export function parting(page: string, quote: string): string | null {
  const q = fold(quote);
  if (page.includes(q)) return null;
  const lp = lookalike(page);
  const lq = lookalike(q);

  const loose = lp.indexOf(lq);
  if (loose >= 0) {
    const span = page.slice(loose, loose + q.length);
    const pairs = new Set<string>();
    for (let i = 0; i < q.length; i++) if (span[i] !== q[i]) pairs.add('page ' + codeOf(span[i]) + ', quote ' + codeOf(q[i]));
    // Whole, to be copied over the quote.
    return 'on the page with other marks (' + [...pairs].join('; ') + '): "' + span + '"';
  }

  const head = longest(lq.length, (n) => lp.includes(lq.slice(0, n)));
  const tail = longest(lq.length, (n) => lp.includes(lq.slice(lq.length - n)));
  const pair = [fromHead(lp, lq, head), fromTail(lp, lq, tail)].filter((p): p is Pair => p !== null).sort((a, b) => b.covered - a.covered)[0];
  if (pair && pair.covered >= q.length / 2) {
    const side = (s: string, [from, to]: [number, number]) => '"…' + s.slice(Math.max(0, from - 20), from) + clip(s.slice(from, to), 60) + s.slice(to, to + 20) + '…"';
    const pm = page.slice(...pair.page);
    const qm = q.slice(...pair.quote);
    const codes = pm.length <= 3 && qm.length <= 3 && !(plain(pm) && plain(qm))
      ? ' (page ' + ([...pm].map(codeOf).join(' ') || 'nothing') + ', quote ' + ([...qm].map(codeOf).join(' ') || 'nothing') + ')'
      : '';
    return 'the page has ' + side(page, pair.page) + ' where the quote has ' + side(q, pair.quote) + codes;
  }
  const enough = Math.min(12, q.length >> 1);
  if (head >= enough) {
    const at = lp.indexOf(lq.slice(0, head)) + head;
    return 'the page agrees up to "…' + page.slice(Math.max(0, at - 24), at) + '", then reads "' + page.slice(at, at + 24) + '…" where the quote has "' + q.slice(head, head + 24) + '…"';
  }
  if (tail >= enough) return 'the page has its last ' + tail + ' of ' + q.length + ' characters, "…' + q.slice(q.length - Math.min(tail, 40)) + '", but not its opening';
  return 'not on the page';
}

/* ─── Reading ──────────────────────────────────────────────────────────── */

export interface Page {
  text: string;
  /** How the page was read when not from its own address, as "capture of 2026-10-06". */
  via: string;
  /** With --via=wayback, the day of the capture read, YYYY-MM-DD. */
  captured?: string;
}

/** A page that could not be read, so nothing is known of its quotes. A PDF the
 *  script cannot open is told apart from a page that would not answer. */
export class Unread extends Error {
  pdf: boolean;
  constructor(message: string, pdf = false) { super(message); this.pdf = pdf; }
}

export interface ReadOptions {
  /** Read every page that is not itself a capture from its latest capture. */
  wayback: boolean;
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Requests to one host wait their turn and leave a gap after each, in
 *  milliseconds, so that a run never presses a site. The Wayback Machine is
 *  given the widest, some fifteen requests a minute: asked faster, it stops
 *  answering for a while. A request asked again waits `retry`, doubled each
 *  time. The tests, which fetch nothing, wait for none of it. */
export const pace = { archive: 4000, wikipedia: 700, other: 500, retry: 3000 };
const lanes = new Map<string, Promise<void>>();
const gapOf = (host: string) => host === 'web.archive.org' ? pace.archive : host.endsWith('wikipedia.org') ? pace.wikipedia : pace.other;

/** Hosts that refused every attempt at a connection: they are not asked again
 *  in this run, and leave no gap, so that each page waiting on them is
 *  reported unread at once rather than after its own round of attempts. */
const refusing = new Set<string>();

function inLane<T>(url: string, task: () => Promise<T>): Promise<T> {
  const host = new URL(url).host;
  const done = (lanes.get(host) ?? Promise.resolve()).then(task);
  const gap = () => refusing.has(host) ? undefined : sleep(gapOf(host));
  lanes.set(host, done.then(gap, gap));
  return done;
}

/** What a request was answered with, and the address it ended at. */
interface Answer { status: number; type: string | null; bytes: Uint8Array; url: string }
const ok = (status: number) => status >= 200 && status < 300;

const RETRIES = 3;
/** One request, in its host's lane, read to its end: a 429, a server error or
 *  a connection refused or dropped is waited out and asked again; anything
 *  else is answered as it came. */
function request(url: string): Promise<Answer> {
  return inLane(url, async () => {
    const host = new URL(url).host;
    if (refusing.has(host)) throw new Unread(host + ' refused the connection earlier in this run');
    for (let attempt = 0; ; attempt++) {
      try {
        const res = await fetch(url, { redirect: 'follow', headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(60_000) });
        if ((res.status === 429 || res.status >= 500) && attempt < RETRIES) {
          const after = Number(res.headers.get('retry-after'));
          await res.body?.cancel();
          await sleep(after > 0 && after <= 60 ? after * 1000 : pace.retry * 2 ** attempt);
          continue;
        }
        return { status: res.status, type: res.headers.get('content-type'), bytes: new Uint8Array(await res.arrayBuffer()), url: res.url || url };
      } catch (err) {
        // A body that will not unpack will not on asking again: the archive
        // can send a capture's gzip header over a body it stored unpacked.
        const code = (err as { cause?: { code?: unknown } }).cause?.code;
        const unpacked = typeof code === 'string' && code.startsWith('Z_');
        if (attempt >= RETRIES || unpacked) {
          if (code === 'ECONNREFUSED' || code === 'UND_ERR_CONNECT_TIMEOUT') refusing.add(host);
          throw new Unread('no answer (' + (err as Error).message + (typeof code === 'string' ? ', ' + code : '') + ')');
        }
        await sleep(pace.retry * 2 ** attempt);
      }
    }
  });
}

/** windows-1252 at 0x80 to 0x9F, which Node's TextDecoder reads as control
 *  characters: an old page's curly quotes and dashes are here. */
const CP1252 = '€\u0081‚ƒ„…†‡ˆ‰Š‹Œ\u008DŽ\u008F\u0090‘’“”•–—˜™š›œ\u009DžŸ';

/** Whether the bytes can be UTF-16: they open with its byte-order mark, or
 *  carry the NUL byte it sets beside every ASCII character, which no page in
 *  an ASCII-based charset holds. */
const utf16 = (bytes: Uint8Array) =>
  (bytes[0] === 0xfe && bytes[1] === 0xff) || (bytes[0] === 0xff && bytes[1] === 0xfe) || bytes.subarray(0, 4096).includes(0);

/** The bytes as text, in the charset the page names — in its headers or in
 *  its own <meta> — and as UTF-8 where it names none. A page that names UTF-16
 *  over bytes that are not is read as UTF-8, as a browser reads a <meta> that
 *  names it: chilton-computing.org.uk's pages, the Lighthill report's among
 *  them, say utf-16 over plain ASCII. */
export function decode(bytes: Uint8Array, contentType: string | null): string {
  const named = /charset=["']?([\w:-]+)/i.exec(contentType ?? '')?.[1]
    ?? /<meta[^>]+charset=["']?([\w:-]+)/i.exec(new TextDecoder('latin1').decode(bytes.subarray(0, 4096)))?.[1];
  let decoder: TextDecoder;
  try { decoder = new TextDecoder(named ?? 'utf-8'); } catch { decoder = new TextDecoder(); }
  if (decoder.encoding.startsWith('utf-16') && !utf16(bytes)) decoder = new TextDecoder();
  if (decoder.encoding !== 'windows-1252') return decoder.decode(bytes);
  const units = Uint16Array.from(bytes, (b) => b >= 0x80 && b < 0xa0 ? CP1252.charCodeAt(b - 0x80) : b);
  let text = '';
  for (let i = 0; i < units.length; i += 8192) text += String.fromCharCode(...units.subarray(i, i + 8192));
  return text;
}

export interface Route {
  /** The address the text is fetched from. */
  fetch: string;
  via: string;
  /** The page's HTML, from what was fetched, where the two differ. */
  html?: (body: string) => string;
  /** An API's answer, which is never a challenge, however short. */
  api?: boolean;
  /** For a capture, the archive's own playback, asked for when the `id_`
   *  copy will not read. */
  playback?: string;
}

const CAPTURE = /^https?:\/\/web\.archive\.org\/web\/(\d+)[a-z_]*\/(.+)$/;
const PRESS = /^https:\/\/ec\.europa\.eu\/commission\/presscorner\/detail\/([a-z]{2})\/([a-z]+)_(\d+)_(\d+)$/;
const POST = /^https:\/\/([^/]+)\/@[\w.-]+\/(\d+)$/;
const WIKIPEDIA = /^https?:\/\/[a-z.]*wikipedia\.org\//;
const FOOTNOTE = /<sup\b[^>]*\bclass="[^"]*\b(?:reference|noprint)\b[^"]*"[^>]*>[\s\S]*?<\/sup>/gi;

/** A Wikipedia page without its footnote markers. */
const unnoted = (body: string) => body.replace(FOOTNOTE, '');
const htmlOf = (original: string) => WIKIPEDIA.test(original) ? unnoted : undefined;

/** A capture, read as archived: its `id_` copy carries no playback scripts. */
const archived = (stamp: string, url: string): Route => ({
  fetch: 'https://web.archive.org/web/' + stamp + 'id_/' + url,
  playback: 'https://web.archive.org/web/' + stamp + '/' + url,
  via: '',
  html: htmlOf(url)
});

/** The route to a page's text that needs nothing looked up first: a capture
 *  as archived, a press-corner page or a Mastodon post from the API, any other
 *  page as itself. */
export function routeOf(url: string): Route {
  const press = PRESS.exec(url);
  if (press) {
    const [, lang, type, year, n] = press;
    return {
      fetch: 'https://ec.europa.eu/commission/presscorner/api/documents?reference=' + type.toUpperCase() + '/' + year + '/' + n + '&language=' + lang,
      via: 'from the press corner’s API',
      api: true,
      html: (body) => (JSON.parse(body) as { docuLanguageResource?: { htmlContent?: string } }).docuLanguageResource?.htmlContent ?? ''
    };
  }
  const post = POST.exec(url);
  if (post) {
    return {
      fetch: 'https://' + post[1] + '/api/v1/statuses/' + post[2],
      via: 'from the Mastodon API',
      api: true,
      html: (body) => (JSON.parse(body) as { content?: string }).content ?? ''
    };
  }
  const capture = CAPTURE.exec(url);
  if (capture) return archived(capture[1], capture[2]);
  return { fetch: url, via: '', html: htmlOf(url) };
}

const day = (stamp: string) => stamp.slice(0, 4) + '-' + stamp.slice(4, 6) + '-' + stamp.slice(6, 8);

/** What a route is answered with: its address, or for a capture the archive's
 *  own playback where the `id_` copy will not unpack. */
async function answerOf(route: Route): Promise<Answer> {
  try { return await request(route.fetch); } catch (err) {
    if (!route.playback) throw err;
    return request(route.playback);
  }
}

/** A page's latest capture, for --via=wayback: the newest the archive holds,
 *  its redirects followed, or, where that replays the site turning the archive
 *  away (openai.com's newest are 403s), the newest that answered 200, from the
 *  archive's index. The index is asked second because some sites keep out of
 *  it (it answers 403 for the Guardian's pages) while their captures play. */
async function latest(url: string): Promise<{ answer: Answer; captured: string }> {
  let answer = await answerOf(archived('2', url));
  if (!ok(answer.status)) {
    const index = await request('https://web.archive.org/cdx/search/cdx?url=' + encodeURIComponent(url) + '&filter=statuscode:200&fl=timestamp&limit=-1');
    const stamp = ok(index.status) ? new TextDecoder().decode(index.bytes).trim().split('\n').pop() ?? '' : '';
    if (!/^\d{14}$/.test(stamp)) {
      throw new Unread(ok(index.status) ? 'no capture in the Wayback Machine that answered 200' : 'its latest capture answered HTTP ' + answer.status + ' and the Wayback Machine’s index HTTP ' + index.status);
    }
    answer = await answerOf(archived(stamp, url));
  }
  const stamp = /\/web\/(\d{14})/.exec(answer.url)?.[1];
  return { answer, captured: stamp ? day(stamp) : '' };
}

/** A PDF's lines are its typesetter's, as a page's are the browser's: a word
 *  broken at a line's end, a hyphen between two lowercase letters, is read
 *  whole, "im-" and "portant" as "important". The text layer cannot tell a
 *  compound broken at its own hyphen from a broken word, so "ill-" and
 *  "structured" read as one word too, and a quote across one is reported. */
const BROKEN = /(\p{Ll})-\n(?=\p{Ll})/gu;
export const unbroken = (s: string) => s.replace(BROKEN, '$1');

/* A PDF's text layer, read by macOS PDFKit from the bytes on standard input.
   No reader is to be had elsewhere without adding a dependency. */
const PDFKIT = `ObjC.import('PDFKit');
function run() {
  const doc = $.PDFDocument.alloc.initWithData($.NSFileHandle.fileHandleWithStandardInput.readDataToEndOfFile);
  return doc.isNil() || doc.string.isNil() ? '' : doc.string.js;
}`;
export const canReadPdf = process.platform === 'darwin';
const NO_PDF = 'this script reads a PDF only with macOS PDFKit';

function pdfText(bytes: Uint8Array): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = execFile('osascript', ['-l', 'JavaScript', '-e', PDFKIT], { maxBuffer: 256 * 1024 * 1024, timeout: 120_000 }, (err, out) => {
      if (err) reject(new Unread('PDFKit could not open it (' + err.message.split('\n')[0] + ')', true));
      else resolve(out);
    });
    child.stdin?.end(bytes);
  });
}

/** A cited page's text, read by the routes above. Throws Unread. */
export async function read(url: string, opts: ReadOptions): Promise<Page> {
  // Google Books draws a page's text by script, so the HTML holds none of it.
  if (!opts.wayback && /^https:\/\/books\.google\./.test(url)) throw new Unread('Google Books, whose text is drawn by script');
  if (/\.pdf($|[?#])/i.test(url) && !canReadPdf) throw new Unread(NO_PDF, true);
  const route = routeOf(url);
  let answer: Answer;
  let via = route.via;
  let captured: string | undefined;
  if (opts.wayback && route.fetch === url) {
    ({ answer, captured } = await latest(url));
    via = captured ? 'capture of ' + captured : 'latest capture';
  } else answer = await answerOf(route);
  const { status, type, bytes } = answer;
  if (!ok(status)) throw new Unread('HTTP ' + status);
  if (/application\/pdf/i.test(type ?? '') || new TextDecoder().decode(bytes.subarray(0, 5)) === '%PDF-') {
    if (!canReadPdf) throw new Unread(NO_PDF, true);
    const text = fold(unbroken((await pdfText(bytes)).replace(INVISIBLE, '')));
    if (!text) throw new Unread('it has no text layer', true);
    return { text, via, captured };
  }
  const body = decode(bytes, type);
  const text = pageText(route.html ? route.html(body) : body);
  // A site that challenges scripts can answer 200 with a page of almost no
  // text; that page has not been read, and saying a quote is missing from it
  // would be wrong.
  if (route.api ? !text : text.length < 600) throw new Unread('answered with ' + text.length + ' characters of text, a challenge rather than the page');
  return { text, via, captured };
}
