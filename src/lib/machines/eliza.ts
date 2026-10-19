/* ELIZA, run again. Joseph Weizenbaum's program as it worked in 1965–66,
   reading the DOCTOR script that was printed after its source code in a
   listing from his MIT archive (doctor-1965.txt says where it comes from).

   This is a port of Anthony Hay's C++ reconstruction
   (https://github.com/anthay/ELIZA, CC0 1.0), which follows the January 1966
   CACM paper and, where the paper and the code found in the archive in 2021
   disagree, the code:
   - BUT ends a clause as well as the comma and the full stop;
   - a MEMORY transformation is chosen by the SLIP HASH of the last word typed,
     not at random as the paper says;
   - a memory is recalled only when the counter Weizenbaum calls LIMIT reads 4;
   - a keyword none of whose patterns fits gets one of four built-in lines.
   Its replies to the same lines match Hay's program word for word
   (tests/eliza.test.ts).

   Two things are new, because a modern keyboard is not an IBM 7094's: curly
   quotes and dashes are read as the typewriter's characters, and ? and ! end a
   sentence the way a full stop does (the 7094 had neither). Nothing typed leaves
   the page. */

type Words = string[];

/** One decomposition pattern and the reassembly rules it cycles through. */
interface Transform { decomposition: Words; reassembly: Words[] }

/** A keyword's rule: what it is replaced by in the text, its rank, the tags it
 *  carries, its transformations, and the keyword it hands over to. */
interface Rule {
  keyword: string;
  substitute: string;
  precedence: number;
  tags: Words;
  transforms: Transform[];
  link: string;
}

export interface Script {
  hello: Words;
  rules: Map<string, Rule>;
  memory: { keyword: string; transforms: Transform[] };
  tags: Map<string, Words>;
}

/** Keyword NONE is filed under a name no upper-cased input can spell. */
const NONE = 'none';

/** The four lines built into the program, chosen by LIMIT. */
const NOMATCH = ['PLEASE CONTINUE', 'HMMM', 'GO ON , PLEASE', 'I SEE'];

const DELIMITERS = new Set([',', '.', 'BUT']);
const PUNCTUATION = ',.';

/* ─── Reading the script ─────────────────────────────────────────────────── */

type Tok = { t: 'open' | 'close' | 'sym' | 'num' | 'eof'; v: string };

/** Characters a modern keyboard has and the typewriter did not, read as the
 *  typewriter's: curly apostrophes as the straight one, quotation marks as
 *  spaces, ? and ! as a full stop, colons, semicolons and dashes as a comma. */
export function elizaUppercase(s: string): string {
  let out = '';
  for (const ch of s) {
    if (ch === '’') out += "'";
    else if ('‘`"«»‚‛“”„‟‹›¡¿'.includes(ch)) out += ' ';
    else if (ch === '!' || ch === '?') out += '.';
    else if (ch === ':' || ch === ';' || ch === '–' || ch === '—') out += ',';
    else out += ch.toUpperCase();
  }
  return out;
}

function tokens(text: string): Tok[] {
  const out: Tok[] = [];
  const space = (c: string) => c <= ' ' || c === '\x7f';
  const nonSymbol = (c: string) => c === '(' || c === ')' || c === ';' || space(c);
  for (let i = 0; i < text.length; ) {
    const c = text[i];
    if (space(c)) { i++; continue; }
    if (c === ';') { while (i < text.length && text[i] !== '\n' && text[i] !== '\r') i++; continue; }
    if (c === '(') { out.push({ t: 'open', v: '(' }); i++; continue; }
    if (c === ')') { out.push({ t: 'close', v: ')' }); i++; continue; }
    if (c === '=') { out.push({ t: 'sym', v: '=' }); i++; continue; }
    let j = i + 1;
    if (c >= '0' && c <= '9') {
      while (j < text.length && text[j] >= '0' && text[j] <= '9') j++;
      out.push({ t: 'num', v: text.slice(i, j) });
    } else {
      while (j < text.length && !nonSymbol(text[j]) && text[j] !== '=') j++;
      out.push({ t: 'sym', v: elizaUppercase(text.slice(i, j)) });
    }
    i = j;
  }
  return out;
}

/** Read a script in the 1966 format. Throws on anything malformed. */
export function readScript(text: string): Script {
  const toks = tokens(text);
  let at = 0;
  const peek = (): Tok => toks[at] || { t: 'eof', v: '' };
  const next = (): Tok => toks[at++] || { t: 'eof', v: '' };
  const fail = (msg: string): never => { throw new Error('ELIZA script: ' + msg + ' (token ' + at + ')'); };
  const expect = (t: Tok['t']) => { if (next().t !== t) fail('expected ' + t); };

  /** A list's words; a list inside it becomes one word, e.g. `(/FAMILY)`. */
  const list = (opened = false): Words => {
    if (!opened) expect('open');
    const out: Words = [];
    for (let t = next(); t.t !== 'close'; t = next()) {
      if (t.t === 'sym' || t.t === 'num') out.push(t.v);
      else if (t.t === 'open') {
        const sub: string[] = [];
        for (let u = next(); u.t !== 'close'; u = next()) {
          if (u.t !== 'sym') fail('expected a word inside a sublist');
          sub.push(u.v);
        }
        out.push('(' + sub.join(' ') + ')');
      } else fail('unclosed list');
    }
    return out;
  };

  const reassembly = (): Words => {
    expect('open');
    if (peek().t === 'sym' && peek().v === 'PRE') {
      next();
      const rebuilt = list();
      const ref = list();
      if (ref.length !== 2 || ref[0] !== '=') fail('expected (=keyword) in a PRE rule');
      expect('close');
      return ['(', 'PRE', '(', ...rebuilt, ')', '(', ...ref, ')', ')'];
    }
    return list(true);
  };

  const hello = list();
  if (peek().t === 'sym' && peek().v === 'START') next();
  const rules = new Map<string, Rule>();
  let memory: Script['memory'] | null = null;

  for (;;) {
    const t = next();
    if (t.t === 'eof') break;
    if (t.t !== 'open') fail('expected (');
    if (peek().t === 'close') { next(); continue; }
    const head = next();
    if (head.t !== 'sym') fail('expected a keyword');
    if (head.v === 'MEMORY') {
      if (memory) fail('a second MEMORY rule');
      const kw = next();
      if (kw.t !== 'sym') fail('expected the MEMORY keyword');
      const transforms: Transform[] = [];
      for (let k = 0; k < 4; k++) {
        expect('open');
        const decomposition: Words = [];
        let u = next();
        for (; !(u.t === 'sym' && u.v === '=') && u.t !== 'eof'; u = next()) decomposition.push(u.v);
        const rebuilt: Words = [];
        for (u = next(); u.t !== 'close' && u.t !== 'eof'; u = next()) rebuilt.push(u.v);
        if (!decomposition.length || !rebuilt.length) fail('a MEMORY transformation needs both sides');
        transforms.push({ decomposition, reassembly: [rebuilt] });
      }
      expect('close');
      memory = { keyword: kw.v, transforms };
      continue;
    }
    const keyword = head.v === 'NONE' ? NONE : head.v;
    if (rules.has(keyword)) fail('a second rule for ' + head.v);
    const rule: Rule = { keyword, substitute: '', precedence: 0, tags: [], transforms: [], link: '' };
    for (let u = next(); u.t !== 'close'; u = next()) {
      if (u.t === 'sym' && u.v === '=') {
        const s = next();
        if (s.t !== 'sym') fail('expected a substitute');
        rule.substitute = s.v;
      } else if (u.t === 'num') rule.precedence = parseInt(u.v, 10);
      else if (u.t === 'sym' && u.v === 'DLIST') rule.tags = list();
      else if (u.t === 'open') {
        if (peek().t === 'sym' && peek().v === '=') {
          next();
          const s = next();
          if (s.t !== 'sym') fail('expected a keyword to refer to');
          rule.link = s.v;
          expect('close');
        } else {
          const decomposition = list();
          if (!decomposition.length) fail('an empty pattern');
          const tr: Transform = { decomposition, reassembly: [] };
          do tr.reassembly.push(reassembly()); while (peek().t === 'open');
          expect('close');
          rule.transforms.push(tr);
        }
      } else fail('a malformed rule for ' + head.v);
    }
    rules.set(keyword, rule);
  }

  if (!rules.has(NONE)) fail('no NONE rule');
  if (!memory) fail('no MEMORY rule');
  const tags = new Map<string, Words>();
  for (const rule of rules.values()) {
    for (let tag of rule.tags) {
      if (tag === '/') continue;
      if (tag.length > 1 && tag[0] === '/') tag = tag.slice(1);
      tags.set(tag, [...(tags.get(tag) || []), rule.keyword]);
    }
  }
  return { hello, rules, memory: memory as Script['memory'], tags };
}

/* ─── Matching ───────────────────────────────────────────────────────────── */

const toInt = (s: string): number => (/^\d+$/.test(s) ? parseInt(s, 10) : -1);
const split = (s: string): Words => s.split(' ').filter(Boolean);

/** Is a word in a pattern's list: `(*SAD HAPPY)` names words, `(/FAMILY)` names tags. */
function inlist(word: string, wordlist: string, tags: Map<string, Words>): boolean {
  const body = wordlist.replace(/^\(\s*/, '').replace(/\)$/, '');
  if (body[0] === '*') return split(body.slice(1)).includes(word);
  if (body[0] === '/') return split(body.slice(1)).some((tag) => (tags.get(tag) || []).includes(word));
  return false;
}

/* The pattern is matched a segment at a time, the way SLIP's YMATCH did: a
   segment runs from one 0 to the next, a 0 takes as few words as it can unless
   it ends the pattern, when it takes the rest. */
function segment(tags: Map<string, Words>, pat: Words, words: Words, pBegin: number, pEnd: number, wBegin: number, fixed: number, out: string[]): number {
  if (words.length - wBegin < fixed) return -1;
  const wild = toInt(pat[pBegin]) === 0;
  let len = 0;
  let last = 0;
  if (wild) {
    if (pEnd === pat.length) len = last = words.length - wBegin - fixed;
    else last = words.length - wBegin - fixed;
  }
  for (;; len++) {
    let p = pBegin + (wild ? 1 : 0);
    let w = wBegin + len;
    for (; p < pEnd; p++) {
      const n = toInt(pat[p]);
      if (n > 0) { out[p] = words.slice(w, w + n).join(' '); w += n; }
      else if (pat[p][0] === '(') { if (w < words.length && inlist(words[w], pat[p], tags)) out[p] = words[w++]; else break; }
      else if (pat[p] === words[w]) out[p] = words[w++];
      else break;
    }
    if (p === pEnd) {
      if (wild) out[pBegin] = words.slice(wBegin, wBegin + len).join(' ');
      return w;
    }
    if (len === last) return -1;
  }
}

/** The parts of the words a decomposition pattern takes apart, one per
 *  element, or null when it does not fit. */
export function match(tags: Map<string, Words>, pat: Words, words: Words): string[] | null {
  const out = pat.map(() => '');
  let w = 0;
  for (let end = 0; end < pat.length; ) {
    const begin = end;
    let fixed = 0;
    for (; end < pat.length; end++) {
      const n = toInt(pat[end]);
      if (n === 0) { if (end > begin) break; }
      else fixed += n > 0 ? n : 1;
    }
    w = segment(tags, pat, words, begin, end, w, fixed, out);
    if (w < 0) return null;
  }
  return w < words.length ? null : out;
}

/** A reply put together from a reassembly rule and the parts; a number names a part. */
export function reassemble(rule: Words, parts: string[]): Words {
  const out: Words = [];
  for (const r of rule) {
    const n = toInt(r);
    if (n < 0) out.push(r);
    else if (n === 0 || n > parts.length) out.push('HMMM');
    else out.push(...split(parts[n - 1]));
  }
  return out;
}

/* ─── SLIP's HASH ────────────────────────────────────────────────────────── */

/* The IBM 7094 kept six 6-bit characters to a word, in the code it called BCD;
   0 marks a code with no character. */
const BCD = '0123456789\0=\'\0\0\0+ABCDEFGHI\0.)\0\0\0-JKLMNOPQR\0$*\0\0\0 /STUVWXYZ\0,(\0\0\0';
const TO_BCD = new Map<number, number>();
for (let i = 0; i < 64; i++) if (BCD[i] !== '\0') TO_BCD.set(BCD.charCodeAt(i), i);

/** The last six-character chunk of a word as the 7094 held it: 36 bits, padded
 *  with spaces. A character outside the set keeps its low six bits. */
export function lastChunk(word: string): bigint {
  const bytes = new TextEncoder().encode(word);
  let d = 0n;
  let count = 0;
  const put = (c: number) => { d = (d << 6n) | BigInt(TO_BCD.has(c) ? TO_BCD.get(c) as number : c & 0x3f); };
  if (bytes.length) for (let i = Math.floor((bytes.length - 1) / 6) * 6; i < bytes.length; i++, count++) put(bytes[i]);
  while (count++ < 6) put(0x20);
  return d;
}

/** SLIP's HASH: the middle n bits of the square of a 35-bit datum. */
export function hash(d: bigint, n: number): number {
  let x = d & 0x7ffffffffn;
  x = (x * x) & 0xffffffffffffffffn;
  x >>= BigInt(35 - Math.floor(n / 2));
  return Number(x & ((1n << BigInt(n)) - 1n));
}

/* ─── The conversation ───────────────────────────────────────────────────── */

/** How one reply was made, for a reader who wants to see the trick. */
export interface Step {
  keyword: string;
  /** The pattern that fitted, its parts, and the rule that built the reply. */
  pattern?: Words;
  parts?: string[];
  rule?: Words;
  /** What the step led to: a reply, a hand-over to another keyword, or nothing fitting. */
  outcome: 'reply' | 'link' | 'newkey' | 'nomatch';
  to?: string;
}
export interface Workings {
  /** The words after clause-trimming and substitution, as the rules saw them. */
  words: Words;
  /** The keywords found, highest rank first. */
  keystack: Words;
  steps: Step[];
  /** A memory laid down from this input, if one was. */
  remembered?: string;
  /** Where the reply came from. */
  from: 'script' | 'memory' | 'none' | 'built-in';
  limit: number;
}
export interface Reply { text: string; workings: Workings }

type Outcome = { kind: 'reply'; words: Words } | { kind: 'link'; to: string; words?: Words } | { kind: 'newkey' } | { kind: 'nomatch' };

export class Eliza {
  private limit = 1;
  private memories: string[] = [];
  /** Which reassembly rule each pattern uses next: they are taken in turn. */
  private turn = new Map<Transform, number>();

  constructor(private readonly script: Script) {}

  hello(): string { return this.script.hello.join(' '); }

  /** Memories waiting to be brought up. */
  remembered(): string[] { return this.memories.slice(); }

  reply(input: string): Reply {
    const { rules, tags, memory } = this.script;
    let words = this.words(input);
    this.limit = (this.limit % 4) + 1;
    const workings: Workings = { words: [], keystack: [], steps: [], from: 'script', limit: this.limit };

    // The first clause with a keyword in it is the one answered; each keyword
    // goes on the stack, a higher rank to the top; each word is swapped for its
    // substitute (I for YOU, YOUR for MY).
    const keystack: Words = [];
    let top = 0;
    for (let i = 0; i < words.length; ) {
      if (DELIMITERS.has(words[i])) {
        if (!keystack.length) { words = words.slice(i + 1); i = 0; continue; }
        words = words.slice(0, i);
        break;
      }
      const rule = rules.get(words[i]);
      if (rule) {
        if (rule.transforms.length || rule.link) {
          if (rule.precedence > top) { keystack.unshift(words[i]); top = rule.precedence; } else keystack.push(words[i]);
        }
        if (rule.substitute) words[i] = rule.substitute;
      }
      i++;
    }
    workings.words = words.slice();
    workings.keystack = keystack.slice();

    const done = (text: string, from: Workings['from']): Reply => { workings.from = from; return { text, workings }; };

    if (!keystack.length && this.limit === 4 && this.memories.length) return done(this.memories.shift() as string, 'memory');

    while (keystack.length) {
      const keyword = keystack.shift() as string;
      const rule = rules.get(keyword);
      if (!rule) return done(NOMATCH[this.limit - 1], 'built-in');
      if (keyword === memory.keyword) {
        const tr = memory.transforms[hash(lastChunk(words[words.length - 1]), 2)];
        const parts = match(tags, tr.decomposition, words);
        if (parts) {
          const kept = reassemble(tr.reassembly[0], parts).join(' ');
          this.memories.push(kept);
          workings.remembered = kept;
        }
      }
      const out = this.apply(rule, words, workings);
      if (out.kind === 'reply') return done(out.words.join(' '), 'script');
      if (out.kind === 'nomatch') return done(NOMATCH[this.limit - 1], 'built-in');
      if (out.kind === 'link') { if (out.words) words = out.words; keystack.unshift(out.to); continue; }
      if (!keystack.length) break;
    }

    const none = rules.get(NONE) as Rule;
    const out = this.apply(none, words, workings);
    return done(out.kind === 'reply' ? out.words.join(' ') : NOMATCH[this.limit - 1], 'none');
  }

  private words(input: string): Words {
    const text = elizaUppercase(input.replace(/\s/g, ' '));
    const out: Words = [];
    let word = '';
    for (const ch of text) {
      if (ch === ' ' || PUNCTUATION.includes(ch)) {
        if (word) { out.push(word); word = ''; }
        if (ch !== ' ') out.push(ch);
      } else word += ch;
    }
    if (word) out.push(word);
    return out;
  }

  private apply(rule: Rule, words: Words, workings: Workings): Outcome {
    const keyword = rule.keyword === NONE ? 'NONE' : rule.keyword;
    let tr: Transform | undefined;
    let parts: string[] | null = null;
    for (const t of rule.transforms) {
      parts = match(this.script.tags, t.decomposition, words);
      if (parts) { tr = t; break; }
    }
    if (!tr || !parts) {
      if (rule.link) { workings.steps.push({ keyword, outcome: 'link', to: rule.link }); return { kind: 'link', to: rule.link }; }
      workings.steps.push({ keyword, outcome: 'nomatch' });
      return { kind: 'nomatch' };
    }
    const n = this.turn.get(tr) || 0;
    const r = tr.reassembly[n];
    this.turn.set(tr, (n + 1) % tr.reassembly.length);
    const step: Step = { keyword, pattern: tr.decomposition, parts, rule: r, outcome: 'reply' };
    workings.steps.push(step);
    if (r.length === 1 && r[0] === 'NEWKEY') { step.outcome = 'newkey'; return { kind: 'newkey' }; }
    if (r.length === 2 && r[0] === '=') { step.outcome = 'link'; step.to = r[1]; return { kind: 'link', to: r[1] }; }
    if (r[0] === '(') {
      const close = r.indexOf(')', 3);
      step.outcome = 'link';
      step.to = r[close + 3];
      return { kind: 'link', to: r[close + 3], words: reassemble(r.slice(3, close), parts) };
    }
    return { kind: 'reply', words: reassemble(r, parts) };
  }
}
