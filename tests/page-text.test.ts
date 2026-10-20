import { afterEach, beforeAll, describe, it, expect, vi } from 'vitest';
import { Unread, decode, flightOf, fold, nextDataOf, pace, pageText, parting, read, routeOf, textOf } from '../scripts/page-text';

/* The quote checker reads every cited page through scripts/page-text.ts. These
   hold its reading to small invented pages. No request leaves the machine:
   where a page has to be fetched, fetch is answered here. */

describe('a page is reduced to the text a reader sees', () => {
  it('leaves a space for a block tag and nothing for an inline one', () => {
    expect(fold(textOf('<p>One</p><p>two</p>'))).toBe('One two');
    expect(fold(textOf('un<em>believ</em>able'))).toBe('unbelievable');
  });

  it('drops scripts and styles, and decodes entities', () => {
    const text = textOf('<style>p{}</style><script>var hidden = "no";</script><p>It&rsquo;s &#8216;here&#x2019; &amp; now</p>');
    expect(fold(text)).toBe('It’s ‘here’ & now');
  });

  it('reads past an <svg/> closed in its own tag, as chilton-computing.org.uk draws one above the Lighthill report', () => {
    const html = '<p>Before</p><svg id="dots" width="170" height="25"/><p>The report</p><svg width="18"><path d="m2,6"/></svg><p>After</p>';
    expect(fold(textOf(html))).toBe('Before The report After');
  });

  it('decodes a letter with a mark as HTML names it', () => {
    expect(fold(textOf('<p>Erd&odblac;s, Poincar&eacute;, &Ccedil;a, na&iuml;ve, stra&szlig;e &frac12;</p>'))).toBe('Erdős, Poincaré, Ça, naïve, straße ½');
    expect(fold(textOf('<p>&notanentity; &Amp;</p>'))).toBe('&notanentity; &');
  });

  it('drops the zero-width characters Reuters and Guardian copies hide inside words', () => {
    expect(fold(textOf('<p>arti\u200Bficial intel\u200Cligence, word\u2060s, ze&#8203;ro</p>'))).toBe('artificial intelligence, words, zero');
  });
});

/** A Next.js page as openai.com serves it: a shell, and the article only in
 *  the flight payload, cut into chunks with `<` escaped. */
function nextPage(): string {
  const said = 'Naïve—a text row, counted in bytes';
  const cms = '<p>Raw <strong>HTML</strong> from the CMS</p>';
  const stream = [
    '1:"$Sreact.fragment"',
    '2:I[123,[],"default"]',
    ':HL["/_next/static/chunks/a.css","style"]',
    '3:' + JSON.stringify(['$', 'article', null, { children: [
      ['$', 'p', null, { children: ['The model ', ['$', 'em', null, { children: 'would' }], ' not stop.'] }],
      ['$', '$L2', null, { children: '$4' }],
      ['$', 'p', null, { children: '$$5 a month, & no <b>more</b>' }],
      ['$', 'div', null, { dangerouslySetInnerHTML: { __html: '$5' } }]
    ] }]),
    '4:T' + Buffer.byteLength(said).toString(16) + ',' + said + '5:T' + Buffer.byteLength(cms).toString(16) + ',' + cms + '6:' + JSON.stringify(['$', 'p', null, { children: 'After the text rows.' }]),
    ''
  ].join('\n');
  const chunks = [stream.slice(0, 50), stream.slice(50, 400), stream.slice(400)];
  return '<html><body><p>Shell</p>'
    + chunks.map((c) => '<script>self.__next_f.push([1,' + JSON.stringify(c).replace(/</g, '\\u003c') + '])</script>').join('')
    + '</body></html>';
}

describe('a Next.js page is read from its flight payload too', () => {
  const html = nextPage();
  const text = pageText(html);

  it('finds the text the HTML does not carry', () => {
    expect(textOf(html)).not.toContain('The model');
    expect(flightOf(html)).not.toBe('');
    expect(parting(text, 'The model would not stop.')).toBeNull();
  });

  it('reads a text row by its length in bytes, and the row after it', () => {
    expect(parting(text, 'Naïve—a text row, counted in bytes')).toBeNull();
    expect(parting(text, 'After the text rows.')).toBeNull();
  });

  it('keeps a text that looks like markup as text, and HTML handed over whole as HTML', () => {
    expect(parting(text, '$5 a month, & no <b>more</b>')).toBeNull();
    expect(parting(text, 'Raw HTML from the CMS')).toBeNull();
  });

  it('never matches a quote across the seam between the HTML and the payload', () => {
    expect(parting(text, 'Shell The model')).not.toBeNull();
  });

  it('reads a page without a payload as its HTML alone', () => {
    expect(flightOf('<p>Plain</p>')).toBe('');
    expect(pageText('<p>Plain</p>')).toBe(textOf('<p>Plain</p>'));
  });
});

describe('an older Next.js page is read from its __NEXT_DATA__ too', () => {
  const data = { props: { pageProps: { transcriptData: { paragraphs: [{ __typename: 'Paragraph', cues: [
    { __typename: 'Cue', text: 'My colleagues and I\nearned top prizes in our field,', time: 99463 },
    { __typename: 'Cue', text: 'people call me a godfather of AI.', time: 103233 }
  ] }] }, body: '<p>An <em>HTML</em> body &amp; more</p>', note: 'a < b' } } };
  const html = '<p>Shell</p><script id="__NEXT_DATA__" type="application/json">' + JSON.stringify(data).replace(/</g, '\\u003c') + '</script>';
  const text = pageText(html);

  it('reads a transcript drawn from it, cue by cue', () => {
    expect(textOf(html)).not.toContain('godfather');
    expect(parting(text, 'earned top prizes in our field, people call me a godfather of AI')).toBeNull();
  });

  it('reads a string that is HTML as HTML, and any other as text', () => {
    expect(parting(text, 'An HTML body & more')).toBeNull();
    expect(parting(text, 'a < b')).toBeNull();
  });

  it('reads a page without it as before', () => {
    expect(nextDataOf('<p>Plain</p>')).toBe('');
  });
});

describe('a quote not found says where the page parts from it', () => {
  it('finds a quote that is there, whitespace folded', () => {
    expect(parting('the record says so plainly', 'record  says\nso')).toBeNull();
  });

  it('shows the page’s own marks where only the marks differ', () => {
    const said = parting('He said: “I’m mildly depressed. Which is why I’m scared.”', 'I\'m mildly depressed. Which is why I\'m scared.');
    expect(said).toBe('on the page with other marks (page U+2019, quote U+0027): "I’m mildly depressed. Which is why I’m scared."');
  });

  it('names a look-alike character by its code point', () => {
    const said = parting('ChatGPT is fine-tuned from a model in the GPT‑3.5 series, which finished training in early 2022.', 'a model in the GPT-3.5 series, which finished training');
    expect(said).toContain('page U+2011, quote U+002D');
  });

  it('shows a word broken across a line where the quote has it whole', () => {
    const said = parting('problem. The Rock- efeller Foundation gave about half the requested funding. Robert', 'The Rockefeller Foundation gave about half the requested funding.');
    expect(said).toBe('the page has "…problem. The Rock- efeller Foundation g…" where the quote has "…The Rockefeller Foundation g…"');
  });

  it('shows two passages joined into one quote, whatever their marks', () => {
    const said = parting('Which is Hinton? “I’m mildly depressed,” he says. “Which is why I’m scared.” How it could', 'I\'m mildly depressed. Which is why I\'m scared.');
    expect(said).toBe('the page has "…I’m mildly depressed,” he says. “Which is why I’m sca…" where the quote has "…I\'m mildly depressed. Which is why I\'m sca…"');
  });

  it('shows a word changed in the middle', () => {
    const said = parting('On June 18, 2024, the company became the world’s most valuable.', 'On June 18, 2024, The company became the world’s most valuable.');
    expect(said).toBe('the page has "…On June 18, 2024, the company became th…" where the quote has "…On June 18, 2024, The company became th…"');
  });

  it('says when only the end is there, and when none of it is', () => {
    const quote = 'A new opening on the old ending of the sentence';
    expect(parting('Elsewhere: the old ending of the sentence.', quote)).toContain('but not its opening');
    expect(parting('Nothing alike at all.', quote)).toBe('not on the page');
  });
});

describe('a page is decoded in the charset it names', () => {
  it('takes the charset from the headers', () => {
    expect(decode(new Uint8Array([0x49, 0x74, 0x92, 0x73, 0x20, 0x96, 0x20, 0xe9]), 'text/html; charset=windows-1252')).toBe('It’s – é');
    expect(decode(new Uint8Array([0x93, 0x61, 0x94]), 'text/html; charset=ISO-8859-1')).toBe('“a”');
  });

  it('takes it from the page’s own <meta> where the headers name none', () => {
    const bytes = new Uint8Array([...new TextEncoder().encode('<meta charset="iso-8859-1"><p>caf'), 0xe9, ...new TextEncoder().encode('</p>')]);
    expect(decode(bytes, 'text/html')).toContain('café');
  });

  it('reads UTF-8 where nothing is named', () => {
    expect(decode(new TextEncoder().encode('Erdős'), null)).toBe('Erdős');
  });

  it('reads a page that names UTF-16 over bytes that are not as UTF-8, as chilton-computing.org.uk serves the Lighthill report', () => {
    const page = '<meta http-equiv="Content-type" content="text/html;charset=utf-16"/><p>In no part of the field’s</p>';
    expect(decode(new TextEncoder().encode(page), 'text/html')).toBe(page);
    expect(decode(new TextEncoder().encode('<p>Plain</p>'), 'text/html; charset=utf-16')).toBe('<p>Plain</p>');
  });

  it('reads UTF-16 where the bytes are, with a byte-order mark or without', () => {
    const page = '<meta charset="utf-16"><p>Erdős</p>';
    const le = [...page].flatMap((c) => [c.charCodeAt(0) & 0xff, c.charCodeAt(0) >> 8]);
    expect(decode(new Uint8Array([0xff, 0xfe, ...le]), 'text/html; charset=utf-16')).toBe(page);
    expect(decode(new Uint8Array(le), 'text/html; charset=utf-16le')).toBe(page);
  });
});

describe('each page is read by the route the board relies on', () => {
  it('reads a capture as archived, without the archive’s toolbar', () => {
    expect(routeOf('https://web.archive.org/web/20261011163654/https://openai.com/index/x/').fetch).toBe('https://web.archive.org/web/20261011163654id_/https://openai.com/index/x/');
    expect(routeOf('https://web.archive.org/web/20100106185508/http://www.netflixprize.com//rules').fetch).toBe('https://web.archive.org/web/20100106185508id_/http://www.netflixprize.com//rules');
  });

  it('reads a press-corner page from the documents API', () => {
    const route = routeOf('https://ec.europa.eu/commission/presscorner/detail/en/speech_26_2148');
    expect(route.fetch).toBe('https://ec.europa.eu/commission/presscorner/api/documents?reference=SPEECH/26/2148&language=en');
    expect(route.html?.(JSON.stringify({ docuLanguageResource: { htmlContent: '<p>The speech</p>' } }))).toBe('<p>The speech</p>');
  });

  it('reads a Mastodon post from the API', () => {
    const route = routeOf('https://mathstodon.xyz/@tao/114881420636881657');
    expect(route.fetch).toBe('https://mathstodon.xyz/api/v1/statuses/114881420636881657');
    expect(route.html?.(JSON.stringify({ content: '<p>The post</p>' }))).toBe('<p>The post</p>');
  });

  it('reads Wikipedia without its footnote markers, live or archived', () => {
    const article = '<p>A 1956 workshop widely considered<sup id="cite_ref-1" class="reference"><a href="#cite_note-1">[1]</a></sup> to be the founding event<sup class="noprint Inline-Template Template-Fact">[<i>citation needed</i>]</sup> of the field.</p>';
    for (const url of ['https://en.wikipedia.org/wiki/Dartmouth_workshop', 'https://web.archive.org/web/20260101000000/https://en.wikipedia.org/wiki/Dartmouth_workshop']) {
      const html = routeOf(url).html;
      expect(html, url).toBeDefined();
      expect(fold(textOf(html!(article)))).toBe('A 1956 workshop widely considered to be the founding event of the field.');
    }
  });

  it('reads any other page from its own address, as it is', () => {
    const route = routeOf('https://www.theguardian.com/technology/2023/jul/25/eliza');
    expect(route.fetch).toBe('https://www.theguardian.com/technology/2023/jul/25/eliza');
    expect(route.html).toBeUndefined();
  });
});

describe('a page that cannot be read is said to be unread, not quoted wrongly', () => {
  const long = '<p>' + 'A paragraph of the article itself. '.repeat(30) + '</p>';
  const answer = (body: string, status = 200, type = 'text/html; charset=utf-8') => new Response(body, { status, headers: { 'content-type': type } });
  beforeAll(() => { pace.archive = pace.wikipedia = pace.other = pace.retry = 0; });
  afterEach(() => { vi.unstubAllGlobals(); });

  it('reads a page that answers', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => answer(long)));
    const page = await read('https://one.example/article', { wayback: false });
    expect(page.via).toBe('');
    expect(page.text).toContain('A paragraph of the article itself.');
  });

  it('is unread when the site refuses', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => answer('Forbidden', 403)));
    await expect(read('https://two.example/article', { wayback: false })).rejects.toThrow(new Unread('HTTP 403'));
  });

  it('is unread when the site answers with a challenge instead of the page', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => answer('<p>Just a moment…</p>')));
    await expect(read('https://three.example/article', { wayback: false })).rejects.toThrow(/a challenge rather than the page/);
  });

  it('asks a host that refuses the connection again, then no more in the run', async () => {
    const fetch = vi.fn(async () => { throw Object.assign(new TypeError('fetch failed'), { cause: { code: 'ECONNREFUSED' } }); });
    vi.stubGlobal('fetch', fetch);
    await expect(read('https://eight.example/one', { wayback: false })).rejects.toThrow('no answer (fetch failed, ECONNREFUSED)');
    expect(fetch).toHaveBeenCalledTimes(4);
    await expect(read('https://eight.example/two', { wayback: false })).rejects.toThrow('eight.example refused the connection earlier in this run');
    expect(fetch).toHaveBeenCalledTimes(4);
  });

  it('takes a short answer from an API as read', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => answer(JSON.stringify({ content: '<p>A short post.</p>' }), 200, 'application/json')));
    expect((await read('https://five.example/@someone/123', { wayback: false })).text).toContain('A short post.');
  });

  it('reads the latest capture when asked to go by the Wayback Machine', async () => {
    const asked: string[] = [];
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      asked.push(url);
      const res = answer(long);
      Object.defineProperty(res, 'url', { value: 'https://web.archive.org/web/20261001043924id_/https://four.example/article' });
      return res;
    }));
    const page = await read('https://four.example/article', { wayback: true });
    expect(asked).toEqual(['https://web.archive.org/web/2id_/https://four.example/article']);
    expect(page.via).toBe('capture of 2026-10-01');
    expect(page.captured).toBe('2026-10-01');
  });

  it('reads the latest that answered 200 where the latest replays the site turning the archive away', async () => {
    const asked: string[] = [];
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      asked.push(url);
      if (url.includes('/web/2id_/')) return answer('Forbidden', 403);
      return url.includes('/cdx/') ? answer('20260926173305\n20261006181816\n', 200, 'text/plain') : answer(long);
    }));
    const page = await read('https://six.example/article', { wayback: true });
    expect(asked[1]).toContain('/cdx/search/cdx?url=' + encodeURIComponent('https://six.example/article') + '&filter=statuscode:200');
    expect(asked[2]).toBe('https://web.archive.org/web/20261006181816id_/https://six.example/article');
    expect(page.via).toBe('capture of 2026-10-06');
  });

  it('reads a capture from the archive’s playback where its id_ copy will not unpack', async () => {
    const asked: string[] = [];
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      asked.push(url);
      if (url.includes('id_/')) throw Object.assign(new TypeError('terminated'), { cause: { code: 'Z_DATA_ERROR' } });
      return answer(long);
    }));
    const page = await read('https://web.archive.org/web/20260818211610/https://seven.example/article', { wayback: false });
    expect(asked).toEqual(['https://web.archive.org/web/20260818211610id_/https://seven.example/article', 'https://web.archive.org/web/20260818211610/https://seven.example/article']);
    expect(page.text).toContain('A paragraph of the article itself.');
  });
});
