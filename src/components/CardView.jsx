import React from 'react';
import { NOW, accent, roadsTo, sourcesOf, sourceStrength, stringsOf } from '../lib/data.js';
import { bearingOn, splitSentences } from '../lib/wiki.js';
import { findingFor } from '../lib/spine.js';
import { leadsOf } from '../lib/leads.js';
import { entitiesOf } from '../lib/files.js';
import { useMode } from '../lib/mode.js';
import { INK, MONO, SANS, SERIF, STRING_INK, RULE, ROW_RULE, PHOTO_FILTER, frame, ink, micro, shell } from '../lib/styles.js';
import { Btn, CardTriple, Chips, Claim, CopyLink, Credit, Disclosure, Eyebrow, Figures, First, FullOnly, Gap, Link, NavRow, Quote, Reading, Ref, Section } from './kit.jsx';

/*
   The dossier. One card, in full: what happened, the author's reading, the file
   — the paragraphs behind the summary — the figures, the names on it, the leads
   it is a rung of, every source with what it actually says, the road that led
   here in the author's own claim verbs, what it led to, and where it sits on
   the line. The page a reader opens to connect the dots without leaving.

   In brief the page is the summary, the reading, the first paragraph of the
   file, the strings and the primary source; every other section collapses to
   one line that says what is there and offers the switch.
*/

const KIND_LABEL = { primary: 'Primary', paper: 'Paper', article: 'Article', video: 'Video', podcast: 'Podcast', interview: 'Interview', encyclopedia: 'Encyclopaedia' };

/** The article lead with the sentence that bears on this entry highlighted. */
const Lead = ({ event, extract }) => {
  const { hits } = bearingOn(event, extract);
  const set = new Set(hits);
  const parts = splitSentences(extract);
  return (
    <p style={{ margin: '10px 0 0', font: '400 14px/1.65 ' + SERIF, color: ink(3), textWrap: 'pretty' }}>
      {parts.map((s, i) => (
        <span key={i} style={set.has(s) ? { background: 'rgba(243,240,234,0.1)', color: INK, padding: '1px 3px', borderRadius: 2 } : undefined}>{s}{' '}</span>
      ))}
    </p>
  );
};

const SourceBlock = ({ src, event, page }) => {
  const wiki = /wikipedia\.org/.test(src.url);
  const extract = wiki && page && page.cited && page.cited.url === src.url ? page.cited.extract : (wiki && page && page.extract && page.cited && page.cited.title === src.title ? page.extract : '');
  const supports = src.supports === 'claim';
  const auto = !src.quote && extract ? (bearingOn(event, extract).hits[0] || '') : '';
  return (
    <div style={{ padding: '16px 0', borderBottom: ROW_RULE }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
        <span style={{ ...micro(3), border: '1px solid rgba(243,240,234,0.22)', borderRadius: 2, padding: '3px 7px' }}>{KIND_LABEL[src.kind] || src.kind}</span>
        <span style={{ ...micro(5), letterSpacing: '0.12em' }}>{src.publisher}{src.date ? ' · ' + src.date : ''}{src.at ? ' · at ' + src.at : ''}</span>
        {supports && <span style={{ ...micro(1), color: STRING_INK, letterSpacing: '0.14em' }}>supports the claim</span>}
        {src.legacy && <span style={micro(5)}>cited, not yet quoted</span>}
      </div>
      <a href={src.url} target="_blank" rel="noopener" style={{ display: 'inline-block', marginTop: 8, font: '400 16px/1.3 ' + SERIF, color: INK, letterSpacing: '-0.015em', textDecoration: 'none' }}>
        {src.title || src.publisher} ↗
      </a>
      {src.quote && <Quote tone={supports ? 'claim' : 'context'} top={9}>{src.quote}</Quote>}
      {/* No hand-picked quote, but the article says something about this entry:
          show that sentence, and let the credit line say a machine chose it. It
          never counts as support. */}
      {!src.quote && auto && (
        <>
          <Eyebrow tier="section" dim style={{ marginTop: 10 }}>One sentence from the cited page</Eyebrow>
          <Quote tone="auto" top={6}>{auto}</Quote>
        </>
      )}
      {!src.quote && !auto && extract && <div style={{ marginTop: 10 }}><Gap /></div>}
      {extract && (
        <>
          <Disclosure><Lead event={event} extract={extract} /></Disclosure>
          <Credit cited={page.cited} auto={!!auto} />
        </>
      )}
    </div>
  );
};

function CardView({ graph, route, media, embedded }) {
  // Inside the board's panel the dossier drops its page column and its nav:
  // the panel is the frame, and the board is the way out.
  const frameStyle = embedded ? { padding: '0 clamp(14px,3vw,22px) 40px' } : shell('read');
  // Every hook before the first return, so an unknown id followed by a known
  // one renders the same hooks in the same order.
  const [, , full] = useMode();
  const event = route.id ? graph.index[route.id] : null;
  if (!event) {
    return (
      <div style={shell('read')}>
        <div style={{ padding: '30px 0 0' }}>
          <p role="status" style={{ margin: '0 0 18px', ...micro(5) }}>No entry has the id “{route.id}”. It may have been renamed or removed.</p>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <Btn to={{ view: 'board' }}>← The board</Btn>
            <Btn to={{ view: 'archive' }}>Browse the archive</Btn>
          </div>
        </div>
      </div>
    );
  }

  const shot = media(event);
  const sources = sourcesOf(event);
  const strength = sourceStrength(event);
  const { into, outOf } = stringsOf(graph, event.id);
  const strings = into.length + outOf.length;
  const { roads, truncated } = roadsTo(graph, event.id);
  const finding = findingFor(event.year);
  const tone = accent(event.category, 0);
  const detail = Array.isArray(event.detail) ? event.detail : [];
  const figures = Array.isArray(event.figures) ? event.figures : [];
  const names = entitiesOf(event);
  const onLeads = leadsOf(event.id);
  // Species-style: the one source the entry is based on, named up front.
  const basedOn = sources.find((s) => s.supports === 'claim') || sources[0] || null;

  const all = graph.all;
  const i = all.findIndex((e) => e.id === event.id);
  const prev = i > 0 ? all[i - 1] : null;
  const next = i >= 0 && i < all.length - 1 ? all[i + 1] : null;

  // Up to the board at this card, and to the finding it falls in; sideways to the
  // chronological neighbours. No loud item: the dossier is a leaf, not a step.
  const up = [
    { label: 'The board', to: { view: 'board', id: event.id } },
    finding ? { label: String(finding.n).padStart(2, '0') + ' · ' + finding.title, to: { view: 'finding', finding: String(finding.n) } } : null
  ].filter(Boolean);
  const nav = (
    <NavRow
      up={up}
      prev={prev && { label: prev.year, to: { view: 'card', id: prev.id } }}
      next={next && { label: next.year, to: { view: 'card', id: next.id } }}
    />
  );

  return (
    <div style={frameStyle}>
      <div data-year={event.year} style={{ padding: embedded ? '18px 0 0' : '30px 0 0' }}>
        {!embedded && nav}

        <div style={{ marginTop: 34, display: 'flex', gap: 'clamp(16px,3vw,28px)', alignItems: 'flex-start', flexWrap: 'wrap' }}>
          {shot.img && (
            <div aria-hidden="true" style={{
              ...frame(event.future), flex: 'none', width: 'clamp(120px,18vw,168px)', aspectRatio: '1 / 1',
              backgroundImage: 'url(' + shot.img + ')', backgroundSize: 'cover', backgroundPosition: 'center',
              filter: PHOTO_FILTER
            }} />
          )}
          <div style={{ flex: '1 1 340px', minWidth: 0 }}>
            <CardTriple event={event} size={embedded ? 'panel' : 'page'} as={embedded ? 'h2' : 'h1'} />
            {event.firsts && <div style={{ marginTop: 12 }}><First>{event.firsts}</First></div>}
            <p style={{ margin: '16px 0 0', font: '400 clamp(15px,1.6vw,18px)/1.6 ' + SANS, color: ink(3), maxWidth: '56ch', textWrap: 'pretty' }}>{event.summary}</p>
            <Reading event={event} size="lg" maxWidth="50ch" style={{ margin: '16px 0 0' }} />
            {basedOn && (
              <div style={{ margin: '16px 0 0', ...micro(5), textTransform: 'none', letterSpacing: '0.06em', font: '400 11px/1.6 ' + MONO, overflowWrap: 'anywhere' }}>
                Based on · <a href={basedOn.url} target="_blank" rel="noopener" style={{ color: ink(3) }}>{basedOn.publisher || basedOn.title}{basedOn.title && basedOn.publisher ? ', ' + basedOn.title : ''}</a>{basedOn.date ? ' · ' + basedOn.date : ''}
              </div>
            )}
            <Chips label="Names" items={[...names.people, ...names.orgs]} style={{ marginTop: 16 }} />
            <Chips label="Terms" items={names.terms} style={{ marginTop: 8 }} />
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginTop: 18 }}>
              {!embedded && <Btn tone="loud" to={{ view: 'board', id: event.id, category: 'all', query: '' }}>Open on the board →</Btn>}
              <CopyLink label="Copy link" size="md" to={embedded ? { view: 'card', id: event.id } : undefined} />
              {onLeads.length > 0 && <Btn to={{ view: 'lead', id: onLeads[0].lead.id, hash: 'rung-' + (onLeads[0].index + 1) }}>On the lead: {onLeads[0].lead.title} →</Btn>}
            </div>
          </div>
        </div>
      </div>

      {detail.length > 0 && (
        <Section id="file" eyebrow="The file" title="What happened, at length" count={detail.length + (detail.length === 1 ? ' paragraph' : ' paragraphs')}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: '68ch' }}>
            {(full ? detail : detail.slice(0, 1)).map((para, k) => (
              <p key={k} style={{ margin: 0, font: '400 clamp(14.5px,1.3vw,16px)/1.68 ' + SANS, color: ink(3), textWrap: 'pretty' }}>{para}</p>
            ))}
            {!full && detail.length > 1 && <FullOnly label={(detail.length - 1) + (detail.length === 2 ? ' more paragraph' : ' more paragraphs')} />}
          </div>
        </Section>
      )}

      {figures.length > 0 && (
        <Section id="figures" eyebrow="The figures" title="By the numbers" count={figures.length + (figures.length === 1 ? ' figure' : ' figures')}>
          <Figures figures={figures} />
        </Section>
      )}

      {onLeads.length > 0 && (
        <Section id="leads" eyebrow="Leads" title={onLeads.length === 1 ? 'A rung on one lead' : 'A rung on ' + onLeads.length + ' leads'}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {onLeads.map(({ lead, index, rung }) => {
              const prevR = lead.rungs[index - 1];
              const nextR = lead.rungs[index + 1];
              const hue = 'oklch(0.8 0.12 ' + lead.hue + ')';
              return (
                <div key={lead.id} style={{ borderLeft: '2px solid ' + hue, paddingLeft: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'baseline', flexWrap: 'wrap' }}>
                    <Link to={{ view: 'lead', id: lead.id, hash: 'rung-' + (index + 1) }} style={{ font: '400 18px/1.25 ' + SERIF, color: INK }}>{lead.title} →</Link>
                    <span style={{ ...micro(4), color: hue }}>Rung {index + 1} of {lead.rungs.length} · {rung.label}</span>
                  </div>
                  <p style={{ margin: 0, font: '400 14px/1.6 ' + SANS, color: ink(3), maxWidth: '62ch', textWrap: 'pretty' }}>{rung.text}</p>
                  <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'baseline' }}>
                    {prevR && graph.index[prevR.event] && <Link to={{ view: 'card', id: prevR.event }} style={micro(4)}>← {graph.index[prevR.event].year} · {prevR.label}</Link>}
                    {nextR && graph.index[nextR.event] && <Link to={{ view: 'card', id: nextR.event }} style={micro(4)}>{graph.index[nextR.event].year} · {nextR.label} →</Link>}
                    <Link to={{ view: 'board', lead: lead.id, rung: index + 1, category: 'all', query: '' }} style={micro(5)}>follow on the board</Link>
                  </div>
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {strings > 0 && (
        <Section id="strings" eyebrow="Connect the dots" title="What it came from, and what it led to" count={strings + (strings === 1 ? ' string' : ' strings')}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: 'clamp(16px,3vw,32px)' }}>
            <div>
              <Eyebrow tier="section" dim style={{ marginBottom: 10 }}>Came from</Eyebrow>
              {into.length ? into.map((a, k) => (
                <div key={k} style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '8px 0 10px', borderLeft: '2px solid ' + accent(graph.index[a.id].category, 0), paddingLeft: 12, marginBottom: 6 }}>
                  <Ref event={graph.index[a.id]} to={{ view: 'card', id: a.id }} />
                  <Link to={{ view: 'board', clue: { from: a.id, to: event.id } }}>
                    <Claim tone={accent(graph.index[a.id].category, 0)}>{a.claim}</Claim>
                  </Link>
                  {a.note && <p style={{ margin: 0, font: '400 12.5px/1.5 ' + SANS, color: ink(4), maxWidth: '46ch' }}>{a.note}</p>}
                </div>
              )) : <div style={micro(5)}>Nothing on the board is argued to have caused this.</div>}
            </div>
            <div>
              <Eyebrow tier="section" dim style={{ marginBottom: 10 }}>Led to</Eyebrow>
              {outOf.length ? outOf.map((a, k) => (
                <div key={k} style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '8px 0 10px', borderLeft: '2px solid ' + tone, paddingLeft: 12, marginBottom: 6 }}>
                  <Link to={{ view: 'board', clue: { from: event.id, to: a.id } }}>
                    <Claim tone={tone}>{a.claim}</Claim>
                  </Link>
                  <Ref event={graph.index[a.id]} to={{ view: 'card', id: a.id }} />
                  {a.note && <p style={{ margin: 0, font: '400 12.5px/1.5 ' + SANS, color: ink(4), maxWidth: '46ch' }}>{a.note}</p>}
                </div>
              )) : <div style={micro(5)}>Nothing on the board is argued to follow from this.</div>}
            </div>
          </div>
        </Section>
      )}

      {roads.length > 0 && roads[0].length > 1 && !full && (
        <Section id="road" eyebrow="The road here" count={roads.length + (roads.length === 1 ? ' road' : ' roads') + ' · ' + roads[0].length + ' hops at the longest'}>
          <FullOnly label="The road here, hop by hop, in the board's own claim verbs" />
        </Section>
      )}

      {roads.length > 0 && roads[0].length > 1 && full && (
        <Section id="road" eyebrow="The road here" title="In the board’s own words" count={roads.length + (roads.length === 1 ? ' road' : ' roads')}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: '7px 9px' }}>
            <Ref event={roads[0][0].from} to={{ view: 'card', id: roads[0][0].from.id }} />
            {roads[0].map((hop, k) => (
              <React.Fragment key={k}>
                <Claim tone={accent(hop.from.category, 0)}>{hop.claim}</Claim>
                <Ref event={hop.to} to={{ view: 'card', id: hop.to.id }} size={hop.to.id === event.id ? 17 : 15} />
              </React.Fragment>
            ))}
          </div>
          {roads.length > 1 && <div style={{ ...micro(5), marginTop: 12, textTransform: 'none', letterSpacing: '0.08em' }}>Also reached from {roads.slice(1).map((r) => r[0].from.year + ' ' + r[0].from.title).join(' · ')}{truncated ? ' · list capped' : ''}</div>}
        </Section>
      )}

      {!event.future && (
        <Section id="sources" eyebrow="Read the sources" title="What the sources say" count={strength.total + (strength.total === 1 ? ' source' : ' sources') + (strength.supporting ? ' · ' + strength.supporting + ' quoted in support' : '')}>
          {sources.length ? (full || sources.length === 1 ? sources : [basedOn]).map((s, k) => <SourceBlock key={k} src={s} event={event} page={shot} />)
            : <div style={micro(5)}>No source on this entry.</div>}
          {!full && sources.length > 1 && <div style={{ marginTop: 16 }}><FullOnly label={(sources.length - 1) + ' more ' + (sources.length === 2 ? 'source' : 'sources') + ', each with what it says'} /></div>}
          {strength.state !== 'quoted' && sources.length > 0 && (
            <p style={{ margin: '16px 0 0', font: '400 11.5px/1.7 ' + MONO, color: ink(5), maxWidth: '70ch' }}>
              This entry is cited but not yet quoted: no source on it carries a verbatim line supporting the claim. Until a source has been read and the line chosen, treat the citations as background.
            </p>
          )}
        </Section>
      )}

      {event.future && (
        <Section id="scenario" eyebrow="A scenario" title="Not a record">
          <p style={{ margin: 0, font: '400 14px/1.6 ' + SANS, color: ink(4), maxWidth: '60ch' }}>
            Everything past {NOW} is a scenario. It carries a confidence rather than a citation, and the year is a placeholder — read the confidence, not the date. Whether anything on the board argues for it is shown above.
          </p>
        </Section>
      )}

      {!embedded && <Section>{nav}</Section>}
    </div>
  );
}

// A page re-renders on its own route, not on the header's year ticking over.
export default React.memo(CardView);
