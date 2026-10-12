// The share images: what a link to this site shows when it is pasted into a
// chat or a feed. One 1200×630 PNG for every card (og/card/<id>.png) and every
// lead (og/lead/<id>.png), and one for every other page (og.png), drawn at
// build time in the board's own materials — the dark wall, a paper card (manila
// with a dashed edge for a scenario), the year in Plex Mono, the title in
// Instrument Serif, a pin in the category's colour, the strings that leave it,
// and the card's photograph, credited, where it is a file on Wikimedia Commons.
//
// satori lays each image out from the site's own style tokens and turns every
// word into outlines, so no face has to be installed on the machine that
// builds. sharp reads the photographs — JPEG, PNG, GIF and WebP all occur in
// the cache — rasterises satori's SVG and writes a 256-colour PNG. prerender.ts
// calls writeShareImages() before it writes a page, and points each page's
// og:image at the file written for it here.
import { createHash } from 'node:crypto';
import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { CSSProperties, ReactNode } from 'react';
import satori from 'satori';
import type { Font } from 'satori';
import sharp from 'sharp';
import { decompress } from 'wawoff2';
import { FIRST, LAST, THREADS, accent, buildGraph, catHue, catLabel, fade, stringsOf } from '../src/lib/data';
import { LEADS, buildLead } from '../src/lib/leads';
import { tiltOf } from '../src/lib/layout';
import { BOARD_GROUND, CARD_PHOTO_FILTER, INK, MANILA, MONO, PAPER, SERIF, ink, paperInk } from '../src/lib/styles';
import type { Event, Graph, Lead, WikiCache } from '../src/lib/types';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

export const SHARE_W = 1200;
export const SHARE_H = 630;

/** A share image as a page names it: its address under the site's base, and
 *  what the image shows, for a reader who cannot see it. */
export interface ShareImage { path: string; alt: string }
/** An image as drawn: the PNG, and what it shows. */
export interface Drawn { png: Buffer; alt: string }
export interface ShareImages { cards: Map<string, ShareImage>; leads: Map<string, ShareImage>; site: ShareImage }

/** A picture as it was fetched, whether it is a rendering of a drawing — a
 *  logo, a diagram, a map — rather than a photograph, and its credit line. */
export interface Picture { bytes: Buffer; drawing: boolean; credit: string }

/** What the images are drawn from: the graph, and the way to a card's picture.
 *  The tests hand in their own, so they never touch the network. */
export interface ShareContext {
  graph: Graph;
  /** The Wikipedia article whose picture a card carries, or null. */
  articleOf: (e: Event) => string | null;
  /** That article's picture, or null if it could not be had. */
  picture: (article: string) => Promise<Picture | null>;
}

/* ─── The faces ─────────────────────────────────────────────────────────────
   Unpacked once from the WOFF2 files the site serves: satori reads TrueType,
   OpenType and WOFF, not WOFF2. Latin and latin-extended subsets of each, as on
   the site. satori keeps one face per name, weight and style, so the extended
   subset goes in under a name of its own; a glyph the first face lacks is then
   taken from the face that has it, and Erdős and Čapek are set whole. The
   names are the ones SERIF and MONO ask for first. */
let faces: Promise<Font[]> | null = null;
export function fonts(): Promise<Font[]> {
  const face = async (name: string, file: string, weight: 400 | 500, style: 'normal' | 'italic'): Promise<Font[]> =>
    Promise.all(['latin', 'latin-ext'].map(async (subset) => ({
      name: subset === 'latin' ? name : name + ' (' + subset + ')', weight, style,
      data: Buffer.from(await decompress(await readFile(join(root, 'public', 'fonts', file + '-' + subset + '.woff2'))))
    })));
  if (!faces) {
    faces = Promise.all([
      face('Instrument Serif', 'instrument-serif-400', 400, 'normal'),
      face('Instrument Serif', 'instrument-serif-400-italic', 400, 'italic'),
      face('IBM Plex Mono', 'plex-mono-400', 400, 'normal'),
      face('IBM Plex Mono', 'plex-mono-500', 500, 'normal')
    ]).then((sets) => sets.flat());
  }
  return faces;
}

/* ─── The photographs ───────────────────────────────────────────────────────
   The cache holds the 330px thumbnail Wikipedia's summary offers, which is
   what the board draws in a card a hundred and some pixels wide. A share image
   frames a photograph at up to 430px, so the build asks for the next size up.
   Wikimedia serves thumbnails at standard widths only (330, 500, 960 …; 640 is
   refused), and 500 is the first that covers the frame. What is fetched is
   kept in node_modules/.cache for a month, so a second build asks for nothing;
   the deploy starts from a clean install and fetches each picture once. */
const UA = 'the-ai-timeline/1.0 (https://github.com/mobahug/The_AI_Timeline)';
const PHOTO_CACHE = join(root, 'node_modules', '.cache', 'share-photos');
const PHOTO_MAX_AGE = 30 * 24 * 60 * 60 * 1000;
const THUMB_STEP = 500;

/** Where to fetch a picture from, best first: the 500px thumbnail, then the
 *  URL the cache holds — a 330px thumbnail, or an original smaller than that.
 *  A non-free logo on the English Wikipedia is served at a few sizes only, so
 *  the second is not a formality. */
export function pictureSources(img: string): string[] {
  const url = img.split('?')[0];
  const m = url.match(/^(https:\/\/[^/]+\/wikipedia\/[^/]+\/thumb\/.+\/)(\d+)px-([^/]+)$/);
  return m && Number(m[2]) < THUMB_STEP ? [m[1] + THUMB_STEP + 'px-' + m[3], url] : [url];
}

const cached = (url: string): string => join(PHOTO_CACHE, createHash('sha1').update(url).digest('hex'));
const sleep = (ms: number): Promise<void> => new Promise((done) => setTimeout(done, ms));

/** How many pictures may fail to arrive before the build stops asking: if
 *  Wikimedia is down, every request would otherwise wait out its timeout and
 *  its retries, and the build would take many minutes to draw type. */
const GIVE_UP_AFTER = 8;
let failures = 0;

/** One URL's bytes, from the cache or the network. A busy server (429, 5xx)
 *  or a dropped connection is tried twice more, and failing that a copy kept
 *  from an earlier build is used however old. A refusal is final: a file that
 *  has gone from Wikimedia may have gone for its licence, and its copy goes too. */
async function download(url: string): Promise<Buffer | null> {
  const file = cached(url);
  let kept: Buffer | null = null;
  try {
    const age = Date.now() - (await stat(file)).mtimeMs;
    kept = await readFile(file);
    if (age < PHOTO_MAX_AGE) return kept;
  } catch { /* not fetched yet */ }
  if (failures >= GIVE_UP_AFTER) return kept;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(20000) });
      if (res.ok) {
        const bytes = Buffer.from(await res.arrayBuffer());
        await mkdir(PHOTO_CACHE, { recursive: true });
        await writeFile(file, bytes);
        return bytes;
      }
      if (res.status !== 429 && res.status < 500) {
        await rm(file, { force: true });
        return null;
      }
      await sleep(Math.min(10, Number(res.headers.get('retry-after')) || 2 ** attempt) * 1000);
    } catch {
      await sleep(2 ** attempt * 1000);
    }
  }
  if (++failures === GIVE_UP_AFTER) console.warn('share images: Wikimedia is not answering; no more pictures will be asked for');
  return kept;
}

/* ─── The credits ───────────────────────────────────────────────────────────
   A share image carries a copy of its photograph — cropped, toned and set on a
   card — served from this site, where the board only shows Wikimedia's own. So
   only files on Wikimedia Commons are used, where every file is under a free
   licence, and each is credited on the image with its author and licence, as
   Commons gives them. A file uploaded to the English Wikipedia alone is most
   often there as fair use for its article — a poster, a book cover, a logo —
   and its card is drawn in type. The credits are asked of the Commons API,
   fifty files to a request, and kept beside the photographs for a month. */

/** The name Commons files a picture under, or null for a picture that is not
 *  on Commons. */
export function commonsFile(img: string): string | null {
  const m = img.split('?')[0].match(/\/wikipedia\/commons\/(?:thumb\/)?[0-9a-f]\/[0-9a-f]{2}\/([^/]+)/);
  return m ? decodeURIComponent(m[1]).replace(/_/g, ' ') : null;
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: '\'', nbsp: ' ' };
/** The text of a fragment of Commons HTML: tags gone, entities read, and any
 *  element hidden from the reader — Commons repeats an author's name in a
 *  hidden span for machines — left out. */
const plain = (html: string | undefined): string => (html || '')
  .replace(/<(\w+)\b[^>]*display:\s*none[^>]*>[\s\S]*?<\/\1>/gi, '')
  .replace(/<[^>]*>/g, '')
  .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
  .replace(/&#x([0-9a-f]+);/gi, (_, n: string) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&([a-z]+);/gi, (m: string, n: string) => ENTITIES[n.toLowerCase()] || m)
  .replace(/\s+/g, ' ')
  .trim();

/** What Commons says of a file: who made it and under what licence, or null
 *  if it names no licence. */
export interface Credit { artist: string; licence: string }
export function creditOf(meta: Record<string, { value?: string } | undefined>): Credit | null {
  const licence = plain(meta.LicenseShortName && meta.LicenseShortName.value);
  return licence ? { artist: plain(meta.Artist && meta.Artist.value), licence } : null;
}

/** A credit as one line, in the form Commons itself suggests: author, licence,
 *  via Wikimedia Commons. An author can be a list of every uploader, or a
 *  panel of thirty with their affiliations; past 48 characters it is cut at a
 *  comma, or failing that at a word, and marked, so the licence is never what
 *  a card's caption runs out of room for. The file's page has the rest. */
export function creditLine(credit: Credit): string {
  let artist = credit.artist;
  if (artist.length > 48) {
    const head = artist.slice(0, 48);
    const comma = head.lastIndexOf(',');
    const cut = comma > 16 ? comma + 1 : head.lastIndexOf(' ');
    artist = head.slice(0, cut > 0 ? cut : 48).trimEnd() + ' …';
  }
  return (artist ? artist + ', ' : '') + credit.licence + ', via Wikimedia Commons';
}

/** The Commons API's answer, as far as it is read here. */
interface CommonsReply {
  query?: { pages?: { title: string; imageinfo?: { extmetadata?: Record<string, { value?: string } | undefined> }[] }[] };
}

const CREDITS = join(PHOTO_CACHE, 'credits.json');

/** The credit line of each file, from what an earlier build kept or from the
 *  Commons API; a file with none is left out of the map. */
async function credits(files: string[]): Promise<Map<string, string>> {
  let kept: Record<string, { credit: Credit | null; at: number }> = {};
  try { kept = JSON.parse(await readFile(CREDITS, 'utf8')); } catch { /* none kept yet */ }
  const due = files.filter((f) => !kept[f] || kept[f].credit === undefined || Date.now() - kept[f].at > PHOTO_MAX_AGE);
  for (let i = 0; i < due.length; i += 50) {
    const titles = due.slice(i, i + 50).map((f) => 'File:' + f).join('|');
    try {
      const res = await fetch('https://commons.wikimedia.org/w/api.php?action=query&format=json&formatversion=2'
        + '&prop=imageinfo&iiprop=extmetadata&iiextmetadatafilter=Artist%7CLicenseShortName&titles=' + encodeURIComponent(titles),
      { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(20000) });
      if (!res.ok) continue;
      const reply = await res.json() as CommonsReply;
      for (const page of (reply.query && reply.query.pages) || []) {
        const info = page.imageinfo && page.imageinfo[0];
        kept[page.title.replace(/^File:/, '')] = { credit: info && info.extmetadata ? creditOf(info.extmetadata) : null, at: Date.now() };
      }
    } catch { /* keep what an earlier build fetched */ }
  }
  await mkdir(PHOTO_CACHE, { recursive: true });
  await writeFile(CREDITS, JSON.stringify(kept));
  const out = new Map<string, string>();
  for (const f of files) {
    const credit = kept[f] && kept[f].credit;
    if (credit) out.set(f, creditLine(credit));
  }
  return out;
}

/** The context a build draws from: the board's own choice of picture for a
 *  card, if it is on Commons, and the pictures themselves, fetched once each
 *  however many images use them, each with its credit. */
export function shareContext(cache: WikiCache, fallbacks: Record<string, string>): ShareContext {
  const graph = buildGraph();
  // The same choice useMedia makes on the board: the card's own article, else
  // the related one it borrows from. A scenario never has a photograph; a card
  // whose picture is not on Commons is drawn in type, not given another.
  const articleOf = (e: Event): string | null => {
    if (e.future) return null;
    const title = [e.wikiTitle, fallbacks[e.id]].find((t) => t && cache[t] && cache[t].img);
    return title && commonsFile(cache[title].img) ? title : null;
  };
  let credited: Promise<Map<string, string>> | null = null;
  const creditFor = async (img: string): Promise<string | null> => {
    if (!credited) {
      const files = new Set<string>();
      for (const e of graph.all) {
        const a = articleOf(e);
        const f = a ? commonsFile(cache[a].img) : null;
        if (f) files.add(f);
      }
      credited = credits([...files]);
    }
    const file = commonsFile(img);
    return file ? (await credited).get(file) || null : null;
  };
  const fetchPicture = async (img: string): Promise<Picture | null> => {
    const credit = await creditFor(img);
    if (!credit) return null;
    for (const url of pictureSources(img)) {
      const bytes = await download(url);
      if (!bytes) continue;
      try {
        const { format } = await sharp(bytes).metadata();
        if (format === 'jpeg' || format === 'png' || format === 'gif' || format === 'webp') {
          return { bytes, drawing: /\.svg\.png$/i.test(url), credit };
        }
      } catch { /* not an image at all */ }
      await rm(cached(url), { force: true });
    }
    return null;
  };
  const pictures = new Map<string, Promise<Picture | null>>();
  return {
    graph,
    articleOf,
    picture: (article) => {
      let p = pictures.get(article);
      if (!p) {
        p = cache[article] && cache[article].img ? fetchPicture(cache[article].img) : Promise.resolve(null);
        pictures.set(article, p);
      }
      return p;
    }
  };
}

const CLEAR = { r: 0, g: 0, b: 0, alpha: 0 };

/** A CSS filter list as one affine map on 0–255 sRGB values: `matrix` mixes the
 *  channels, `offset` is added after. The matrices are the Filter Effects
 *  specification's, applied in order as a browser applies them. A function it
 *  cannot read, or has no equivalent for, stops the build rather than being
 *  left out of the print without a word. */
export function filterMatrix(css: string): { matrix: number[][]; offset: number[] } {
  let matrix = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
  let offset = [0, 0, 0];
  const mix = (f: number[][]) => {
    matrix = f.map((row) => [0, 1, 2].map((j) => row.reduce((sum, x, k) => sum + x * matrix[k][j], 0)));
    offset = f.map((row) => row.reduce((sum, x, k) => sum + x * offset[k], 0));
  };
  const scale = (slope: number, intercept: number) => {
    matrix = matrix.map((row) => row.map((x) => x * slope));
    offset = offset.map((x) => x * slope + intercept * 255);
  };
  for (const call of css.trim().split(/\)\s*/).filter(Boolean)) {
    const m = call.match(/^([a-z]+)\(\s*([\d.]+)(%?)\s*$/);
    if (!m) throw new Error('share images: cannot read the filter ' + call + ')');
    const [, fn, num, pct] = m;
    const a = Number(num) / (pct ? 100 : 1);
    const r = 1 - a;
    if (fn === 'grayscale') mix([
      [0.2126 + 0.7874 * r, 0.7152 - 0.7152 * r, 0.0722 - 0.0722 * r],
      [0.2126 - 0.2126 * r, 0.7152 + 0.2848 * r, 0.0722 - 0.0722 * r],
      [0.2126 - 0.2126 * r, 0.7152 - 0.7152 * r, 0.0722 + 0.9278 * r]]);
    else if (fn === 'sepia') mix([
      [0.393 + 0.607 * r, 0.769 - 0.769 * r, 0.189 - 0.189 * r],
      [0.349 - 0.349 * r, 0.686 + 0.314 * r, 0.168 - 0.168 * r],
      [0.272 - 0.272 * r, 0.534 - 0.534 * r, 0.131 + 0.869 * r]]);
    else if (fn === 'saturate') mix([
      [0.213 + 0.787 * a, 0.715 - 0.715 * a, 0.072 - 0.072 * a],
      [0.213 - 0.213 * a, 0.715 + 0.285 * a, 0.072 - 0.072 * a],
      [0.213 - 0.213 * a, 0.715 - 0.715 * a, 0.072 + 0.928 * a]]);
    else if (fn === 'contrast') scale(a, 0.5 - 0.5 * a);
    else if (fn === 'brightness') scale(a, 0);
    else throw new Error('share images: no equivalent here for the filter ' + fn + '()');
  }
  return { matrix, offset };
}

/* The print a board card makes of its photograph — CARD_PHOTO_FILTER, the same
   token the board's CSS uses — worked by sharp on the photograph alone. Given
   to satori as a CSS filter it becomes an SVG filter over the whole image,
   which nearly doubled the time to rasterise a card. */
const PRINT = filterMatrix(CARD_PHOTO_FILTER);
type Row = [number, number, number, number];
const PRINT_MATRIX: [Row, Row, Row, Row] = [
  [PRINT.matrix[0][0], PRINT.matrix[0][1], PRINT.matrix[0][2], 0],
  [PRINT.matrix[1][0], PRINT.matrix[1][1], PRINT.matrix[1][2], 0],
  [PRINT.matrix[2][0], PRINT.matrix[2][1], PRINT.matrix[2][2], 0],
  [0, 0, 0, 1]
];

/** A picture cut to a frame, as a data URI satori can embed. A photograph fills
 *  the frame, cropped where sharp finds the most to look at — a face, usually. A
 *  drawing or a cut-out is shown whole and inset on the card's own paper, as a
 *  print of it would be: cropping a logo to fill a square cuts its name off. */
async function framed(pic: Picture, w: number, h: number): Promise<string> {
  // Decoded first to 8-bit RGBA, whatever it came as — greyscale, a palette,
  // a GIF's first frame — so the print's matrix always has four bands to mix.
  const { data, info } = await sharp(pic.bytes).autoOrient().toColourspace('srgb').ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const raw = { raw: { width: info.width, height: info.height, channels: 4 as const } };
  const { isOpaque } = await sharp(data, raw).stats();
  const inset = Math.round(Math.min(w, h) * 0.08);
  const img = sharp(data, raw).recomb(PRINT_MATRIX).linear([1, 1, 1, 1], [...PRINT.offset, 0]);
  const out = pic.drawing || !isOpaque
    ? img.resize(w - 2 * inset, h - 2 * inset, { fit: 'contain', background: CLEAR })
      .extend({ top: inset, bottom: inset, left: inset, right: inset, background: CLEAR })
    : img.resize(w, h, { fit: 'cover', position: 'attention' });
  return 'data:image/png;base64,' + (await out.png({ compressionLevel: 1 }).toBuffer()).toString('base64');
}

/** A card's picture cut to its frame, the article it is from and its credit,
 *  or null if it has none or it could not be had. */
async function photoFor(e: Event, ctx: ShareContext, w: number, h: number): Promise<{ uri: string; article: string; credit: string } | null> {
  const article = ctx.articleOf(e);
  const pic = article ? await ctx.picture(article) : null;
  return article && pic ? { uri: await framed(pic, w, h), article, credit: pic.credit } : null;
}

/* ─── Drawing ───────────────────────────────────────────────────────────────
   Every size below is the board's own, scaled up: the board draws a pin 10px
   across, a year at 8.5px and a category at 7.5px on a card about 130px wide;
   here the card is 1040px wide and read at about a third of its size. */

/** The scenario mark's ink, as the board sets it on manila. */
const SCENARIO_INK = 'oklch(0.45 0.16 25)';
const CARD_INK = '#17161a';
const LANE = SHARE_H / THREADS.length;

/** How `text` sets in `style` across `width`, measured by satori itself with
 *  the shaping and the line breaks the image will get: how tall it is, and how
 *  wide its widest word. A word wider than the measure is not broken; it runs
 *  out of the box, and the box does not grow to say so. */
async function measure(text: string, style: CSSProperties, width: number): Promise<{ height: number; widest: number }> {
  const words = text.split(/\s+/).filter(Boolean);
  let height = Infinity;
  let widest = 0;
  await satori(
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
      <div key="block" style={{ ...style, width }}>{text}</div>
      {words.map((w, i) => <div key={'word' + i} style={style}>{w}</div>)}
    </div>,
    {
      width: 4000, fonts: await fonts(),
      onNodeDetected: (node) => {
        if (node.key === 'block') height = node.height;
        else if (typeof node.key === 'string' && node.key.startsWith('word')) widest = Math.max(widest, node.width);
      }
    }
  );
  return { height, widest };
}

/** A block of text fitted to its box: the largest of `sizes` at which it stays
 *  within `height` across `width`, every word whole — so a title is never cut
 *  off, and never set smaller than it has to be — and then the narrowest
 *  measure, down to three-fifths of the box, that keeps it to as many lines.
 *  That is what text-wrap: balance does for the site's headlines in the
 *  browser; it is done here by measuring because satori draws balanced text
 *  with other line breaks than the ones it lays out, and cuts the last line. */
interface Fitted { size: number; width: number; fits: boolean }
async function fit(text: string, style: (size: number) => CSSProperties, width: number, height: number, sizes: number[]): Promise<Fitted> {
  let size = sizes[0];
  let m = { height: Infinity, widest: Infinity };
  for (const s of sizes) {
    size = s;
    m = await measure(text, style(s), width);
    if (m.height <= height && m.widest <= width) break;
  }
  const fits = m.height <= height && m.widest <= width;
  // One line has nothing to balance.
  if (m.height < size * 1.6) return { size, width, fits };
  let lo = Math.max(Math.round(width * 0.6), Math.ceil(m.widest));
  let hi = width;
  while (hi - lo > 6) {
    const mid = Math.round((lo + hi) / 2);
    if ((await measure(text, style(size), mid)).height <= m.height) hi = mid;
    else lo = mid;
  }
  return { size, width: hi, fits };
}

const yearStyle = (size: number): CSSProperties => ({
  fontFamily: MONO, fontWeight: 500, fontSize: size, lineHeight: 1, letterSpacing: size * 0.14, color: paperInk(0.72)
});
const titleStyle = (size: number): CSSProperties => ({
  fontFamily: SERIF, fontSize: size, lineHeight: 1.04, letterSpacing: size * -0.02, color: CARD_INK
});
/** The mark under a card's title. On the board a category is set in grey on
 *  the card and its colour is left to the pin; here, where the pin is a dot at
 *  the scale a link preview is read at, the category is set in a deep shade of
 *  its own hue as well. A scenario's mark keeps the board's red. */
const markStyle = (size: number, e: Event): CSSProperties => ({
  fontFamily: MONO, fontSize: size, lineHeight: 1, letterSpacing: size * 0.18, textTransform: 'uppercase',
  color: e.future ? SCENARIO_INK : 'oklch(0.44 0.11 ' + catHue(e.category) + ')'
});
/** A photograph's credit: small, in the card's own grey, as a caption. */
const CREDIT_LEADING = 1.3;
const creditStyle = (size: number): CSSProperties => ({
  fontFamily: MONO, fontSize: size, lineHeight: CREDIT_LEADING, letterSpacing: size * 0.02, color: paperInk(0.58)
});
const microStyle = (size: number, step: number): CSSProperties => ({
  fontFamily: MONO, fontSize: size, lineHeight: 1, letterSpacing: size * 0.22, textTransform: 'uppercase', color: ink(step)
});

/** The wall: the board's ground, with its six lanes ruled across it. */
function Wall({ children }: { children: ReactNode }) {
  return (
    <div style={{ display: 'flex', position: 'relative', width: SHARE_W, height: SHARE_H, backgroundColor: '#08080a', backgroundImage: BOARD_GROUND }}>
      {THREADS.map((t, i) => (
        <div key={t.id} style={{
          position: 'absolute', left: 0, top: i * LANE, width: SHARE_W, height: LANE,
          borderTop: i ? '1px solid rgba(243,240,234,0.07)' : 'none',
          backgroundColor: i % 2 ? 'rgba(243,240,234,0.012)' : 'transparent'
        }} />
      ))}
      {children}
    </div>
  );
}

/** What satori draws for one image: everything on the wall, over a clear
 *  ground the size of the image, laid over a wall rasterised once (ground()). */
function Layer({ children }: { children: ReactNode }) {
  return <div style={{ display: 'flex', position: 'relative', width: SHARE_W, height: SHARE_H }}>{children}</div>;
}

/** A pin, as the board draws one: lit from the upper left, in a colour. */
function Pin({ x, y, size, hue, tone }: { x: number; y: number; size: number; hue: number; tone: string }) {
  return (
    <div style={{
      position: 'absolute', left: x - size / 2, top: y - size / 2, width: size, height: size, borderRadius: '50%',
      backgroundImage: 'radial-gradient(circle at 35% 30%, oklch(0.9 0.05 ' + hue + '), ' + tone + ')',
      border: Math.max(1, Math.round(size / 12)) + 'px solid rgba(0,0,0,0.35)',
      boxShadow: '0 ' + Math.round(size / 5) + 'px ' + Math.round(size / 2.5) + 'px rgba(0,0,0,0.6)'
    }} />
  );
}

/** A string: a cubic curve — its two ends and two control points, x then y —
 *  its colour, and whether it is dashed, as every string into a scenario is on
 *  the board and here. */
interface Strand { pts: number[]; tone: string; dashed: boolean }

/** The strings, over the cards as on the board, each on a dark casing that
 *  keeps it legible where it crosses paper. satori draws an <svg> as an image
 *  of its own, at the size it is given, so this one is only as big as the
 *  strings in it rather than the whole image. */
function Strings({ strands, width }: { strands: Strand[]; width: number }) {
  if (!strands.length) return null;
  // A cubic curve lies inside the hull of its four points.
  const xs = strands.flatMap((s) => s.pts.filter((_, i) => i % 2 === 0));
  const ys = strands.flatMap((s) => s.pts.filter((_, i) => i % 2 === 1));
  const m = Math.ceil(width * 2);
  const x = Math.max(0, Math.floor(Math.min(...xs)) - m);
  const y = Math.max(0, Math.floor(Math.min(...ys)) - m);
  const w = Math.min(SHARE_W, Math.ceil(Math.max(...xs)) + m) - x;
  const h = Math.min(SHARE_H, Math.ceil(Math.max(...ys)) + m) - y;
  const d = (p: number[]) => 'M' + p[0] + ' ' + p[1] + ' C' + p[2] + ' ' + p[3] + ',' + p[4] + ' ' + p[5] + ',' + p[6] + ' ' + p[7];
  const dash = (s: Strand) => (s.dashed ? Math.round(width * 4) + ' ' + Math.round(width * 4.6) : undefined);
  return (
    <svg width={w} height={h} viewBox={x + ' ' + y + ' ' + w + ' ' + h} style={{ position: 'absolute', left: x, top: y }}>
      {strands.map((s, i) => (
        <path key={'casing' + i} d={d(s.pts)} fill="none" stroke="#0a0a0b" strokeWidth={width * 2.5} strokeLinecap="round" opacity={0.62} strokeDasharray={dash(s)} />
      ))}
      {strands.map((s, i) => (
        <path key={'string' + i} d={d(s.pts)} fill="none" stroke={s.tone} strokeWidth={width} strokeLinecap="round" strokeDasharray={dash(s)} />
      ))}
    </svg>
  );
}

/** A string from one pin to another, bowed upward as the board bows them. One
 *  that climbs to a higher card bows higher, so it arrives over the card's top
 *  edge rather than across its photograph. */
const between = (ax: number, ay: number, bx: number, by: number): number[] => {
  const dx = bx - ax;
  const lift = 18 + Math.abs(dx) * 0.06 + Math.max(0, ay - by - 60) * 0.3;
  return [ax, ay, ax + dx * 0.25, ay - lift, bx - dx * 0.25, by - lift, bx, by];
};

/** The site's name, small, in the margin the card leaves. */
function Imprint({ right }: { right?: string }) {
  return (
    <div style={{ position: 'absolute', left: 80, right: 80, bottom: 30, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div style={microStyle(15, 5)}>The AI Timeline</div>
      {right ? <div style={microStyle(15, 5)}>{right}</div> : null}
    </div>
  );
}

/* ─── A card ────────────────────────────────────────────────────────────── */

const CARD = { left: 80, top: 72, width: 1040, height: 486, pad: 28, border: 2 };
/** What the card holds, inside its padding and its edge. */
const INNER = { w: CARD.width - 2 * (CARD.pad + CARD.border), h: CARD.height - 2 * (CARD.pad + CARD.border) };
/** The photograph's credit, set under it like a caption, in two lines at most. */
const CREDIT = { size: 12, lines: 2, gap: 8 };
/** The print: a square, framed, as tall as the card allows above its credit;
 *  the picture is cut to fit inside the frame's 2px edge. */
const FRAME = INNER.h - CREDIT.gap - Math.ceil(CREDIT.size * CREDIT_LEADING * CREDIT.lines);
const PHOTO = FRAME - 4;
const PHOTO_GAP = 40;
/** Room for the title: the inner height, less the year above it, the
 *  category below, and the space between. */
const TITLE_H = INNER.h - 26 - 26 - 22 - 18 - 24;
const PIN = { x: CARD.left + CARD.width / 2, y: CARD.top + 20 };
/** The sizes a card's title may be set at, largest first: a short title fills
 *  the card, a long one steps down until it fits. Beside a photograph the
 *  measure is half as wide. */
const TITLE_SIZES = { photo: [120, 108, 96, 88, 80, 72, 64, 58, 52], bare: [150, 136, 124, 112, 100, 92, 84, 76, 68, 60, 54] };

/** Where the card sits on the wall, leaning as the board leans it. */
const cardBox = (tilt: number): CSSProperties => ({
  position: 'absolute', left: CARD.left, top: CARD.top, width: CARD.width, height: CARD.height, boxSizing: 'border-box',
  transform: 'rotate(' + tilt + 'deg)', transformOrigin: '50% 0%'
});

/* Every image is drawn on the same wall, and every card at one of five slants;
   blurring a card's shadow is the slowest thing librsvg does here, and the
   wall's gradient the next. So the wall is rasterised once, and once more for
   each slant with a card's shadow on it, and each image is laid over the one
   it needs. */
const grounds = new Map<string, Promise<Buffer>>();
function ground(tilt: number | null): Promise<Buffer> {
  const key = String(tilt);
  let g = grounds.get(key);
  if (!g) {
    g = (async () => {
      const svg = await satori(
        <Wall>{tilt === null ? null : <div style={{ ...cardBox(tilt), boxShadow: '0 24px 48px rgba(0,0,0,0.5)' }} />}</Wall>,
        { width: SHARE_W, height: SHARE_H, fonts: await fonts() }
      );
      return sharp(Buffer.from(svg)).ensureAlpha().raw().toBuffer();
    })();
    grounds.set(key, g);
  }
  return g;
}

/** The card's strings: one leaving the pin to the left if anything on the
 *  board led to it, one to the right if it led to anything — the nearest of
 *  each, coloured by the card the string leaves, as the board colours it. */
function cardStrands(e: Event, graph: Graph): Strand[] {
  const { into, outOf } = stringsOf(graph, e.id);
  const parent = into.length ? graph.index[into[into.length - 1].id] : null;
  const child = outOf.length ? graph.index[outOf[0].id] : null;
  const out: Strand[] = [];
  // Each runs from the pin up over the card's top edge and out of the frame,
  // clear of the title.
  const away = (dir: number): number[] => [
    PIN.x, PIN.y, PIN.x + dir * 130, PIN.y - 56, PIN.x + dir * 350, PIN.y - 72, PIN.x + dir * 620, PIN.y - 54
  ];
  if (parent) out.push({ pts: away(-1), tone: accent(parent.category, 0), dashed: !!e.future });
  if (child) out.push({ pts: away(1), tone: accent(e.category, 0), dashed: !!child.future });
  return out;
}

/** The mark under a card's title: its category, or that it is a scenario and
 *  how confident the board is in it. */
const markOf = (e: Event): string => (e.future ? 'Scenario · ' + (e.confidence || 'Uncertain') : catLabel(e.category));

export async function cardShare(e: Event, ctx: ShareContext): Promise<Drawn & { pictured: boolean }> {
  const photo = await photoFor(e, ctx, PHOTO, PHOTO);
  const width = INNER.w - (photo ? FRAME + PHOTO_GAP : 0);
  const title = await fit(e.title, titleStyle, width, TITLE_H, photo ? TITLE_SIZES.photo : TITLE_SIZES.bare);
  if (!title.fits) console.warn('share images: the title of ' + e.id + ' is too long for its card and is cut short');
  const tilt = tiltOf(e.id);
  const png = await rasterise(ground(tilt),
    <Layer>
      <div style={{
        ...cardBox(tilt), padding: CARD.pad, display: 'flex', gap: PHOTO_GAP, backgroundColor: e.future ? MANILA : PAPER,
        border: CARD.border + 'px ' + (e.future ? 'dashed rgba(23,22,26,0.4)' : 'solid rgba(23,22,26,0.16)')
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', width, paddingTop: 26 }}>
          <div style={yearStyle(26)}>{String(e.year)}</div>
          <div style={{ ...titleStyle(title.size), width: title.width, marginTop: 22, lineClamp: Math.max(1, Math.floor(TITLE_H / (title.size * 1.04))) }}>{e.title}</div>
          <div style={{ flexGrow: 1 }} />
          <div style={markStyle(18, e)}>{markOf(e)}</div>
        </div>
        {photo ? (
          <div style={{ display: 'flex', flexDirection: 'column', width: FRAME }}>
            <img src={photo.uri} width={FRAME} height={FRAME} style={{ width: FRAME, height: FRAME, boxSizing: 'border-box', border: '2px solid rgba(23,22,26,0.22)' }} />
            <div style={{ ...creditStyle(CREDIT.size), marginTop: CREDIT.gap, lineClamp: CREDIT.lines }}>{photo.credit}</div>
          </div>
        ) : null}
      </div>
      <Strings strands={cardStrands(e, ctx.graph)} width={3.4} />
      <Pin x={PIN.x} y={PIN.y} size={26} hue={catHue(e.category)} tone={accent(e.category, fade(e.year))} />
      <Imprint right={(THREADS.find((t) => t.id === e.thread) || THREADS[0]).label} />
    </Layer>
  );
  const what = e.year + ', ' + e.title + ' — ' + (e.future ? 'a scenario, ' + (e.confidence || 'Uncertain').toLowerCase() : catLabel(e.category));
  const alt = (e.future ? 'A manila scenario card' : 'A card') + ' pinned to The AI Timeline’s board: ' + what + '.'
    + (photo ? ' The picture is from Wikipedia’s article “' + photo.article + '”: ' + photo.credit + '.' : '');
  return { png, alt, pictured: !!photo };
}

/* ─── A small card: a rung on a lead, a card on the site's own image ─────── */

/** A small card's dimensions — the board's tall card: photograph and its
 *  credit in three lines at most, year, title — and the sizes its title may
 *  take, largest first, in two lines at most. */
interface SmallSize { w: number; h: number; pad: number; photoH: number; credit: number; year: number; labels: number[] }
const SITE_CARD: SmallSize = { w: 206, h: 258, pad: 11, photoH: 110, credit: 8.5, year: 14, labels: [23, 21, 19, 17] };
const RUNG_CARD: SmallSize = { w: 172, h: 228, pad: 10, photoH: 88, credit: 8, year: 13, labels: [20, 18, 16] };
/** A small card's edge, and its photograph's. */
const SMALL_EDGE = 1.5;

interface Small {
  e: Event; x: number; y: number; size: SmallSize; label: string; fitted: Fitted;
  photo: { uri: string; credit: string } | null; tone: string; hue: number;
}

const labelStyle = (size: number): CSSProperties => ({ ...titleStyle(size), lineHeight: 1.08 });

/** What a small card holds across, inside its padding and its edge. */
const innerOf = (size: SmallSize): number => size.w - 2 * (size.pad + SMALL_EDGE);

/** A small card, ready to draw: its picture cut to its frame, its label fitted. */
async function small(e: Event, ctx: ShareContext, size: SmallSize, at: { x: number; y: number }, label: string, tone: string, hue: number): Promise<Small> {
  const inner = innerOf(size);
  const photo = await photoFor(e, ctx, inner - 2 * SMALL_EDGE, size.photoH - 2 * SMALL_EDGE);
  const fitted = await fit(label, labelStyle, inner, 2 * size.labels[0] * 1.08 + 1, size.labels);
  if (!fitted.fits) console.warn('share images: “' + label + '” is too long for a small card and is cut short');
  return { e, ...at, size, label, fitted, photo: photo ? { uri: photo.uri, credit: photo.credit } : null, tone, hue };
}

function SmallCard({ s }: { s: Small }) {
  const { e, size } = s;
  const inner = innerOf(size);
  const frame: CSSProperties = { width: inner, height: size.photoH, boxSizing: 'border-box', border: SMALL_EDGE + 'px solid rgba(23,22,26,0.22)' };
  return (
    <div style={{
      position: 'absolute', left: s.x, top: s.y, width: size.w, height: size.h, padding: size.pad,
      boxSizing: 'border-box', display: 'flex', flexDirection: 'column', backgroundColor: e.future ? MANILA : PAPER,
      border: SMALL_EDGE + 'px ' + (e.future ? 'dashed rgba(23,22,26,0.4)' : 'solid rgba(23,22,26,0.16)'),
      boxShadow: '0 12px 26px rgba(0,0,0,0.55)', transform: 'rotate(' + tiltOf(e.id) * 1.5 + 'deg)', transformOrigin: '50% 0%'
    }}>
      {s.photo ? (
        <img src={s.photo.uri} width={inner} height={size.photoH} style={frame} />
      ) : (
        // The board's own mark for a card with no photograph: hatched, empty.
        <div style={{ ...frame, backgroundImage: 'repeating-linear-gradient(135deg,rgba(23,22,26,0.07) 0 9px,transparent 9px 18px)' }} />
      )}
      <div style={{ ...creditStyle(size.credit), height: Math.ceil(size.credit * CREDIT_LEADING * 3), marginTop: 5, lineClamp: 3 }}>
        {s.photo ? s.photo.credit : ''}
      </div>
      <div style={{ ...yearStyle(size.year), marginTop: 9 }}>{String(e.year)}</div>
      <div style={{ ...labelStyle(s.fitted.size), width: s.fitted.width, marginTop: 6, lineClamp: 2 }}>{s.label}</div>
    </div>
  );
}

const pinOf = (s: Small) => ({ x: s.x + s.size.w / 2, y: s.y + s.size.pad });

/** The strings between consecutive small cards, pin to pin; one into a
 *  scenario is dashed. */
const strung = (smalls: Small[], tone: (from: Small) => string): Strand[] => smalls.slice(1).map((s, i) => {
  const a = pinOf(smalls[i]);
  const b = pinOf(s);
  return { pts: between(a.x, a.y, b.x, b.y), tone: tone(smalls[i]), dashed: !!s.e.future };
});

/* ─── A lead ────────────────────────────────────────────────────────────── */

const KIND: Record<Lead['kind'], string> = { capability: 'Capability', failure: 'Failure', economy: 'Economy' };

/** A lead: its question on the left, and three of its rungs — the first, the
 *  middle and the last — climbing the right of the image like steps, strung
 *  pin to pin in the lead's own colour. */
export async function leadShare(lead: Lead, ctx: ShareContext): Promise<Drawn> {
  const built = buildLead(ctx.graph, lead);
  const n = built.rungs.length;
  const picks = n ? [...new Set([0, Math.round((n - 1) / 2), n - 1])] : [];
  const tone = 'oklch(0.78 0.12 ' + lead.hue + ')';
  const smalls = await Promise.all(picks.map((k, i) => {
    const r = built.rungs[k];
    return small(r.card, ctx, RUNG_CARD, { x: 640 + i * 172, y: 376 - i * 170 }, r.label, tone, lead.hue);
  }));
  const span = built.span ? built.span.from + ' — ' + built.span.to : '';
  const headStyle = (size: number): CSSProperties => ({ ...titleStyle(size), color: INK });
  const questionStyle = (size: number): CSSProperties => ({ fontFamily: SERIF, fontStyle: 'italic', fontSize: size, lineHeight: 1.22, color: ink(2) });
  const title = await fit(lead.title, headStyle, 540, 2 * 96 * 1.04, [96, 88, 80, 72, 64]);
  const question = await fit(lead.question, questionStyle, 540, 230, [38, 35, 32, 29]);
  const png = await rasterise(ground(null),
    <Layer>
      <div style={{ position: 'absolute', left: 80, top: 78, width: 540, display: 'flex', flexDirection: 'column' }}>
        <div style={microStyle(15, 4)}>{['A lead', KIND[lead.kind], span].filter(Boolean).join(' · ')}</div>
        <div style={{ ...headStyle(title.size), width: title.width, marginTop: 26 }}>{lead.title}</div>
        <div style={{ ...questionStyle(question.size), width: question.width, marginTop: 24 }}>{lead.question}</div>
      </div>
      {smalls.map((s) => <SmallCard key={s.e.id} s={s} />)}
      <Strings strands={strung(smalls, () => tone)} width={2.6} />
      {smalls.map((s) => <Pin key={s.e.id + '-pin'} x={pinOf(s).x} y={pinOf(s).y} size={16} hue={lead.hue} tone={tone} />)}
      <Imprint right={n + ' rungs'} />
    </Layer>
  );
  const alt = 'The lead “' + lead.title + '” on The AI Timeline: ' + lead.question
    + ' Beside it, ' + smalls.length + ' of its ' + n + ' rungs are pinned to the board and strung together: '
    + smalls.map((s) => s.e.year + ', ' + s.label).join('; ') + '.';
  return { png, alt };
}

/* ─── The site ──────────────────────────────────────────────────────────── */

/** Three cards for the site's own image, and the two strings between them: the
 *  longest reach the board can show in two strings, from a card on the record
 *  through another to a scenario, both record cards with a picture. Read from
 *  the graph, so the image follows the board as it grows. */
export function siteChain(ctx: ShareContext): Event[] | null {
  const { edges, index } = ctx.graph;
  let best: Event[] | null = null;
  for (const ab of edges) {
    const a = index[ab.from];
    const b = index[ab.to];
    if (a.future || b.future || !ctx.articleOf(a) || !ctx.articleOf(b)) continue;
    for (const bc of edges) {
      const c = index[bc.to];
      if (bc.from === b.id && c.future && (!best || c.year - a.year > best[2].year - best[0].year)) best = [a, b, c];
    }
  }
  return best;
}

/** The site's own image, for every page that is not a card or a lead: the
 *  name, the span, three cards on string, and what the board holds — counted
 *  from the data, never typed. */
export async function siteShare(ctx: ShareContext): Promise<Drawn> {
  const chain = siteChain(ctx) || [];
  const places = [{ x: 96, y: 268 }, { x: 497, y: 232 }, { x: 898, y: 284 }];
  const smalls = await Promise.all(chain.map((e, i) => small(e, ctx, SITE_CARD, places[i], e.title, accent(e.category, fade(e.year)), catHue(e.category))));
  const notes = ctx.graph.edges.filter((l) => l.note).length;
  const counts = ctx.graph.all.length + ' entries · ' + ctx.graph.edges.length + ' strings · ' + notes + ' case notes';
  const png = await rasterise(ground(null),
    <Layer>
      <div style={{ position: 'absolute', left: 74, top: 46, display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontFamily: SERIF, fontSize: 116, lineHeight: 1, letterSpacing: -116 * 0.03, color: INK }}>The AI Timeline</div>
        <div style={{ ...microStyle(21, 4), letterSpacing: 21 * 0.14, marginTop: 18 }}>{FIRST + ' — ' + LAST + ' · An investigation board'}</div>
      </div>
      {smalls.map((s) => <SmallCard key={s.e.id} s={s} />)}
      <Strings strands={strung(smalls, (from) => accent(from.e.category, 0))} width={2.6} />
      {smalls.map((s) => <Pin key={s.e.id + '-pin'} x={pinOf(s).x} y={pinOf(s).y} size={16} hue={s.hue} tone={s.tone} />)}
      <div style={{ ...microStyle(21, 4), letterSpacing: 21 * 0.12, position: 'absolute', left: 78, bottom: 46 }}>{counts}</div>
    </Layer>
  );
  const alt = 'The AI Timeline, an investigation board of artificial intelligence from ' + FIRST + ' to ' + LAST + '.'
    + (chain.length ? ' Three cards are pinned to it and strung together: ' + chain.map((e) => e.year + ', ' + e.title + (e.future ? ' (a scenario)' : '')).join('; ') + '.' : '')
    + ' ' + counts.replace(/ · /g, ', ') + '.';
  return { png, alt };
}

/* ─── Out ───────────────────────────────────────────────────────────────── */

/** One image: satori's layer, rasterised over its ground at 1:1, and quantised
 *  to 256 colours. A card comes to between a quarter and a third of its
 *  full-colour PNG, the photograph no different to the eye, and the largest is
 *  under 200KB. libimagequant is left at its defaults: asked for fewer colours,
 *  or for less effort, it missed the paper's own colour and dithered the flat
 *  card into visible wedges and triangles. */
async function rasterise(under: Promise<Buffer>, layer: ReactNode): Promise<Buffer> {
  const svg = await satori(layer, {
    width: SHARE_W, height: SHARE_H, fonts: await fonts(),
    // A style satori cannot draw is otherwise dropped in silence.
    onStyleError: (err) => { throw err; }
  });
  return sharp(await under, { raw: { width: SHARE_W, height: SHARE_H, channels: 4 } })
    .composite([{ input: Buffer.from(svg) }])
    .png({ palette: true })
    .toBuffer();
}

/** Run `jobs` with at most `n` in flight. sharp works off the main thread, so
 *  a few at once keeps every core busy. */
async function pool<T>(jobs: (() => Promise<T>)[], n: number): Promise<T[]> {
  const out: T[] = new Array(jobs.length);
  let next = 0;
  const worker = async () => {
    while (next < jobs.length) {
      const i = next++;
      out[i] = await jobs[i]();
    }
  };
  await Promise.all(Array.from({ length: n }, worker));
  return out;
}

/** Draw every share image into `dist` and say what each page should name. */
export async function writeShareImages(opts: { dist: string; cache: WikiCache; fallbacks: Record<string, string> }): Promise<ShareImages> {
  const started = Date.now();
  const ctx = shareContext(opts.cache, opts.fallbacks);
  // The file is named by the id as it stands; the address a page names is
  // the same path, encoded, as every other address the prerenderer writes.
  const write = async (file: string[], made: Drawn): Promise<ShareImage> => {
    const out = join(opts.dist, ...file);
    await mkdir(dirname(out), { recursive: true });
    await writeFile(out, made.png);
    return { path: file.map(encodeURIComponent).join('/'), alt: made.alt };
  };
  const site = siteShare(ctx).then((made) => write(['og.png'], made));
  let pictured = 0;
  const cards = await pool(ctx.graph.all.map((e) => async (): Promise<[string, ShareImage]> => {
    const made = await cardShare(e, ctx);
    if (made.pictured) pictured++;
    return [e.id, await write(['og', 'card', e.id + '.png'], made)];
  }), 6);
  const leads = await pool(LEADS.map((l) => async (): Promise<[string, ShareImage]> => (
    [l.id, await write(['og', 'lead', l.id + '.png'], await leadShare(l, ctx))]
  )), 6);

  // A picture that could not be fetched, or credited, leaves its card in type
  // rather than failing the build; the count says how many did.
  const wanted = ctx.graph.all.filter((e) => ctx.articleOf(e)).length;
  console.log('share images: ' + cards.length + ' cards, ' + pictured + ' of the ' + wanted + ' with a picture on Commons drawn with it; '
    + leads.length + ' leads; the site — ' + ((Date.now() - started) / 1000).toFixed(1) + 's');
  if (pictured < wanted) console.warn('share images: ' + (wanted - pictured) + ' pictures could not be fetched or credited; those cards are in type');
  return { cards: new Map(cards), leads: new Map(leads), site: await site };
}
