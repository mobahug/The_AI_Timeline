import React, { useState } from 'react';
import { NOW, accent, catLabel, roadsTo, sourcesOf, sourceStrength } from '../lib/data.js';
import { bearingOn, splitSentences } from '../lib/wiki.js';
import { findingFor } from '../lib/spine.js';
import { INK, MONO, SANS, SERIF, button, micro, tag } from '../lib/styles.js';

/*
   The dossier. One card, in full: what happened, the author's reading, every
   source with what it actually says, the road that led here in the author's own
   claim verbs, what it led to, and where it sits on the route. The page a reader
   opens to connect the dots without leaving.
*/

const SHELL = { maxWidth: 920, margin: '0 auto', padding: '0 clamp(16px,4vw,32px) 120px' };
const RULE = '1px solid rgba(243,240,234,0.12)';
const CC = 'https://creativecommons.org/licenses/by-sa/4.0/';
const KIND_LABEL = { primary: 'Primary', paper: 'Paper', article: 'Article', video: 'Video', podcast: 'Podcast', interview: 'Interview', encyclopedia: 'Encyclopaedia' };

const Section = ({ eyebrow, title, children, count }) => (
  <section style={{ marginTop: 46, paddingTop: 22, borderTop: RULE }}>
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
      {eyebrow && <span style={{ ...micro(0.36), letterSpacing: '0.22em' }}>{eyebrow}</span>}
      <h2 style={{ margin: 0, font: '400 clamp(20px,2.4vw,26px)/1.1 ' + SERIF, letterSpacing: '-0.02em' }}>{title}</h2>
      {count !== undefined && <span style={micro(0.34)}>{count}</span>}
    </div>
    {children}
  </section>
);

const Claim = ({ children, tone }) => (
  <span style={{ font: '400 10px/1.5 ' + MONO, letterSpacing: '0.14em', textTransform: 'uppercase', color: tone || 'oklch(0.78 0.16 25)', whiteSpace: 'nowrap' }}>{children}</span>
);

const Title = ({ event, onOpen, size = 15 }) => (
  <button onClick={() => onOpen(event.id)} style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', font: '400 ' + size + 'px/1.25 ' + SERIF, color: INK, letterSpacing: '-0.015em' }}>
    <span style={{ font: '400 10.5px/1 ' + MONO, color: 'rgba(243,240,234,0.42)', fontVariantNumeric: 'tabular-nums', marginRight: 6 }}>{event.year}</span>
    {event.title}
  </button>
);

/** The article lead with the sentence that bears on this entry highlighted. */
const Lead = ({ event, extract }) => {
  const { hits } = bearingOn(event, extract);
  const set = new Set(hits);
  const parts = splitSentences(extract);
  return (
    <p style={{ margin: '10px 0 0', font: '400 14px/1.65 ' + SERIF, color: 'rgba(243,240,234,0.7)', textWrap: 'pretty' }}>
      {parts.map((s, i) => (
        <span key={i} style={set.has(s) ? { background: 'rgba(243,240,234,0.1)', color: INK, padding: '1px 3px', borderRadius: 2 } : undefined}>{s}{' '}</span>
      ))}
    </p>
  );
};

const SourceBlock = ({ src, event, page }) => {
  const [open, setOpen] = useState(false);
  const wiki = /wikipedia\.org/.test(src.url);
  const extract = wiki && page && page.cited && page.cited.url === src.url ? page.cited.extract : (wiki && page && page.extract && page.cited && page.cited.title === src.title ? page.extract : '');
  const supports = src.supports === 'claim';
  const auto = !src.quote && extract ? (bearingOn(event, extract).hits[0] || '') : '';
  return (
    <div style={{ padding: '16px 0', borderBottom: '1px solid rgba(243,240,234,0.08)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
        <span style={{ ...micro(0.7), border: '1px solid rgba(243,240,234,0.22)', borderRadius: 2, padding: '3px 7px' }}>{KIND_LABEL[src.kind] || src.kind}</span>
        <span style={{ ...micro(0.5), letterSpacing: '0.12em' }}>{src.publisher}{src.date ? ' · ' + src.date : ''}{src.at ? ' · at ' + src.at : ''}</span>
        {supports && <span style={{ ...micro(1), color: 'oklch(0.78 0.16 25)', letterSpacing: '0.14em' }}>supports the claim</span>}
        {src.legacy && <span style={micro(0.34)}>cited, not yet quoted</span>}
      </div>
      <a href={src.url} target="_blank" rel="noopener" style={{ display: 'inline-block', marginTop: 8, font: '400 16px/1.3 ' + SERIF, color: INK, letterSpacing: '-0.015em', textDecoration: 'none' }}>
        {src.title || src.publisher} ↗
      </a>
      {src.quote && (
        <blockquote style={{ margin: '9px 0 0', font: '400 14px/1.55 ' + SANS, color: supports ? 'rgba(243,240,234,0.88)' : 'rgba(243,240,234,0.66)', paddingLeft: 12, borderLeft: '2px solid ' + (supports ? 'oklch(0.78 0.16 25)' : 'rgba(243,240,234,0.2)'), textWrap: 'pretty' }}>
          <span style={{ color: 'oklch(0.78 0.16 25)' }}>“</span>{src.quote}<span style={{ color: 'oklch(0.78 0.16 25)' }}>”</span>
        </blockquote>
      )}
      {/* No hand-picked quote, but the article says something about this entry:
          show that sentence, and say a machine chose it. It never counts as support. */}
      {!src.quote && auto && (
        <>
          <div style={{ ...micro(0.34), letterSpacing: '0.18em', marginTop: 10 }}>One sentence from the cited page · matched automatically</div>
          <blockquote style={{ margin: '6px 0 0', font: '400 14px/1.55 ' + SANS, color: 'rgba(243,240,234,0.72)', paddingLeft: 12, borderLeft: '2px solid rgba(243,240,234,0.2)', textWrap: 'pretty' }}>
            <span style={{ color: 'oklch(0.78 0.16 25)' }}>“</span>{auto}<span style={{ color: 'oklch(0.78 0.16 25)' }}>”</span>
          </blockquote>
        </>
      )}
      {!src.quote && !auto && extract && (
        <div style={{ ...micro(0.34), letterSpacing: '0.16em', marginTop: 10, textTransform: 'none' }}>
          Not on the cited page — no sentence in this article names the entry or its year. Cited for background.
        </div>
      )}
      {extract && (
        <>
          <button type="button" aria-expanded={open} onClick={() => setOpen((v) => !v)} style={{ ...micro(0.5), background: 'transparent', border: 'none', padding: '9px 0 0', cursor: 'pointer', letterSpacing: '0.16em' }}>
            {open ? 'Hide the article’s opening ▴' : 'Read the article’s opening ▾'}
          </button>
          {open && <Lead event={event} extract={extract} />}
          <div style={{ font: '400 10px/1.7 ' + MONO, color: 'rgba(243,240,234,0.34)', marginTop: 8 }}>
            Wikipedia, <a href={src.url} target="_blank" rel="noopener" style={{ color: 'rgba(243,240,234,0.5)' }}><em>{src.title}</em></a> · <a href={CC} target="_blank" rel="noopener" style={{ color: 'rgba(243,240,234,0.5)' }}>CC BY-SA 4.0</a>
          </div>
        </>
      )}
    </div>
  );
};

export default function CardView({ graph, route, navigate, onOpen, media }) {
  const event = route.id ? graph.index[route.id] : null;
  if (!event) {
    return (
      <div style={SHELL}>
        <div style={{ padding: '80px 0', ...micro(0.4) }}>No card “{route.id}”.</div>
        <button onClick={() => navigate({ view: 'board', id: null })} style={button()}>← The board</button>
      </div>
    );
  }

  const shot = media(event);
  const sources = sourcesOf(event);
  const strength = sourceStrength(event);
  const links = graph.adjacency[event.id] || [];
  const byYear = (a, b) => graph.index[a.id].year - graph.index[b.id].year;
  const into = links.filter((a) => !a.out).sort(byYear);
  const outOf = links.filter((a) => a.out).sort(byYear);
  const { roads, truncated } = roadsTo(graph, event.id);
  const finding = findingFor(event.year);
  const tone = accent(event.category, 0);

  const all = graph.all;
  const i = all.findIndex((e) => e.id === event.id);
  const prev = i > 0 ? all[i - 1] : null;
  const next = i >= 0 && i < all.length - 1 ? all[i + 1] : null;
  const openCard = (id) => navigate({ view: 'card', id, clue: null, finding: null });

  const nav = (
    <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
      <button onClick={() => onOpen(event.id)} style={button('loud')}>Open on the board →</button>
      <button onClick={() => navigate({ view: 'finding', finding: String(finding.n), id: null })} style={button()}>Finding {String(finding.n).padStart(2, '0')}</button>
      <span style={{ flex: 1 }} />
      {prev && <button onClick={() => openCard(prev.id)} style={button()} title={prev.title}>← {prev.year}</button>}
      {next && <button onClick={() => openCard(next.id)} style={button()} title={next.title}>{next.year} →</button>}
    </div>
  );

  return (
    <div style={SHELL}>
      <div data-year={event.year} style={{ padding: '30px 0 0' }}>
        {nav}

        <div style={{ marginTop: 34, display: 'flex', gap: 'clamp(16px,3vw,28px)', alignItems: 'flex-start', flexWrap: 'wrap' }}>
          {shot.img && (
            <div aria-hidden="true" style={{
              flex: 'none', width: 'clamp(120px,18vw,168px)', aspectRatio: '1 / 1', borderRadius: 3,
              border: '1px solid rgba(243,240,234,0.14)', backgroundColor: '#0e0e11',
              backgroundImage: 'url(' + shot.img + ')', backgroundSize: 'cover', backgroundPosition: 'center',
              filter: 'saturate(0.9) contrast(1.03)'
            }} />
          )}
          <div style={{ flex: '1 1 340px', minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ font: '400 clamp(30px,4.6vw,52px)/1 ' + SERIF, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.03em' }}>{event.year}</span>
              <span style={tag(event.category, accent)}>{catLabel(event.category)}</span>
              {event.confidence && <span style={{ ...micro(0.6), border: '1px dashed rgba(243,240,234,0.32)', padding: '4px 7px' }}>Projection · {event.confidence}</span>}
              {finding && <span style={micro(0.34)}>{String(finding.n).padStart(2, '0')} · {finding.title}</span>}
            </div>
            <h1 style={{ margin: '10px 0 0', font: '400 clamp(28px,4.8vw,54px)/1.04 ' + SERIF, letterSpacing: '-0.035em', textWrap: 'balance' }}>{event.title}</h1>
            <p style={{ margin: '16px 0 0', font: '400 clamp(15px,1.6vw,18px)/1.6 ' + SANS, color: 'rgba(243,240,234,0.72)', maxWidth: '56ch', textWrap: 'pretty' }}>{event.summary}</p>
            {event.why && (
              <p style={{ margin: '16px 0 0', font: '400 clamp(16px,1.7vw,19px)/1.5 ' + SERIF, color: 'rgba(243,240,234,0.84)', maxWidth: '50ch', borderLeft: '2px solid ' + tone, paddingLeft: 16, textWrap: 'pretty' }}>{event.why}</p>
            )}
          </div>
        </div>
      </div>

      {(into.length > 0 || outOf.length > 0) && (
        <Section eyebrow="Connect the dots" title="What it came from, and what it led to" count={links.length + (links.length === 1 ? ' string' : ' strings')}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: 'clamp(16px,3vw,32px)' }}>
            <div>
              <div style={{ ...micro(0.36), letterSpacing: '0.2em', marginBottom: 10 }}>Came from</div>
              {into.length ? into.map((a, k) => (
                <div key={k} style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '8px 0 10px', borderLeft: '2px solid ' + accent(graph.index[a.id].category, 0), paddingLeft: 12, marginBottom: 6 }}>
                  <Title event={graph.index[a.id]} onOpen={openCard} />
                  <button onClick={() => navigate({ view: 'board', clue: { from: a.id, to: event.id }, id: null })} style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' }}>
                    <Claim tone={accent(graph.index[a.id].category, 0)}>{a.claim} →</Claim>
                  </button>
                  {a.note && <p style={{ margin: 0, font: '400 12.5px/1.5 ' + SANS, color: 'rgba(243,240,234,0.55)', maxWidth: '46ch' }}>{a.note}</p>}
                </div>
              )) : <div style={micro(0.3)}>Nothing on the board is argued to have caused this.</div>}
            </div>
            <div>
              <div style={{ ...micro(0.36), letterSpacing: '0.2em', marginBottom: 10 }}>Led to</div>
              {outOf.length ? outOf.map((a, k) => (
                <div key={k} style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '8px 0 10px', borderLeft: '2px solid ' + tone, paddingLeft: 12, marginBottom: 6 }}>
                  <button onClick={() => navigate({ view: 'board', clue: { from: event.id, to: a.id }, id: null })} style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' }}>
                    <Claim tone={tone}>{a.claim} →</Claim>
                  </button>
                  <Title event={graph.index[a.id]} onOpen={openCard} />
                  {a.note && <p style={{ margin: 0, font: '400 12.5px/1.5 ' + SANS, color: 'rgba(243,240,234,0.55)', maxWidth: '46ch' }}>{a.note}</p>}
                </div>
              )) : <div style={micro(0.3)}>Nothing on the board is argued to follow from this.</div>}
            </div>
          </div>
        </Section>
      )}

      {roads.length > 0 && roads[0].length > 1 && (
        <Section eyebrow="The road here" title="In the board’s own words" count={roads.length + (roads.length === 1 ? ' road' : ' roads')}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: '7px 9px' }}>
            <Title event={roads[0][0].from} onOpen={openCard} />
            {roads[0].map((hop, k) => (
              <React.Fragment key={k}>
                <Claim tone={accent(hop.from.category, 0)}>{hop.claim}</Claim>
                <Title event={hop.to} onOpen={openCard} size={hop.to.id === event.id ? 17 : 15} />
              </React.Fragment>
            ))}
          </div>
          {roads.length > 1 && <div style={{ ...micro(0.32), marginTop: 12, textTransform: 'none', letterSpacing: '0.08em' }}>Also reached from {roads.slice(1).map((r) => r[0].from.year + ' ' + r[0].from.title).join(' · ')}{truncated ? ' · list capped' : ''}</div>}
        </Section>
      )}

      {!event.future && (
        <Section eyebrow="Read the sources" title="What the sources say" count={strength.total + (strength.total === 1 ? ' source' : ' sources') + (strength.supporting ? ' · ' + strength.supporting + ' quoted in support' : '')}>
          {sources.length ? sources.map((s, k) => <SourceBlock key={k} src={s} event={event} page={shot} />)
            : <div style={micro(0.34)}>No source on this entry.</div>}
          {strength.state !== 'quoted' && sources.length > 0 && (
            <p style={{ margin: '16px 0 0', font: '400 11.5px/1.7 ' + MONO, color: 'rgba(243,240,234,0.4)', maxWidth: '70ch' }}>
              This entry is cited but not yet quoted: no source on it carries a verbatim line supporting the claim. It is on the list.
            </p>
          )}
        </Section>
      )}

      {event.future && (
        <Section eyebrow="A scenario" title="Not a record">
          <p style={{ margin: 0, font: '400 14px/1.6 ' + SANS, color: 'rgba(243,240,234,0.6)', maxWidth: '60ch' }}>
            Everything past {NOW} is a projection. It carries a confidence rather than a citation, and the year is a placeholder — read the confidence, not the date. Whether anything on the board argues for it is shown above.
          </p>
        </Section>
      )}

      <div style={{ marginTop: 48, paddingTop: 22, borderTop: RULE }}>{nav}</div>
    </div>
  );
}
