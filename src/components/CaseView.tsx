import React from 'react';
import { ERAS, NOW, standingNow, roadsTo, threadLedger, loadBearing, strandOf } from '../lib/data';
import { RED, RED_LIT, RULE, SERIF, badge, ink, micro, shell } from '../lib/styles';
import { Btn, CardTriple, Claim, Eyebrow, Ledger, Link, NavRow, PageHead, Prose, Reading, Ref, Section } from './kit';
import type { NavItem } from './kit';
import type { ReactNode } from 'react';
import type { Graph, Hop } from '../lib/types';

/* The case as it stands.
   Every connective word on this page is either verbatim from data/*.json or a fixed
   structural label. Nothing about any specific event or scenario is composed here —
   the argument was already written, in the claim verbs. This only typesets it. */

/** The lede, shared with the door on the line that opens this page. */
export const CASE_LEDE = 'Why the present looks the way it does — the road here, what carries forward, and which parts of the record the board has never argued from.';

/** The nav at the head and the foot: up to the line, onward to the horizon. */
const NAV: { up: NavItem[]; onward: NavItem } = { up: [{ label: 'The line', to: { view: 'line' } }], onward: { label: 'The horizon', to: { view: 'horizon' } } };

/** A movement of the case — its own device, taller than a Section, but it reads
 *  the rule and the 44 from the tokens like everything else. */
const Movement = ({ numeral, title, blurb }: { numeral: ReactNode; title: ReactNode; blurb: ReactNode }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 9, padding: '76px 0 22px', borderTop: RULE, marginTop: 44 }}>
    <Eyebrow tier="section" dim>{numeral}</Eyebrow>
    <h2 style={{ margin: 0, font: '400 clamp(28px,4.4vw,52px)/1 ' + SERIF, letterSpacing: '-0.03em', textWrap: 'balance' }}>{title}</h2>
    <Prose style={{ maxWidth: '58ch' }}>{blurb}</Prose>
  </div>
);

/** One backward path, typeset as a sentence in the author's own verbs. Every title
 *  opens its dossier; the entry the road leads to is set a size larger. */
const Road = ({ road }: { road: Hop[] }) => (
  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: '7px 9px', minWidth: 0 }}>
    <Ref event={road[0].from} to={{ view: 'card', id: road[0].from.id }} />
    {road.map((hop, i) => (
      <React.Fragment key={i}>
        <Claim wrap>{hop.claim}</Claim>
        <Ref event={hop.to} size={i === road.length - 1 ? 16 : 15} to={{ view: 'card', id: hop.to.id }} />
      </React.Fragment>
    ))}
  </div>
);

export interface CaseViewProps { graph: Graph }

function CaseView({ graph }: CaseViewProps) {
  const standing = standingNow(graph);
  const threads = threadLedger(graph);
  const bearing = loadBearing(graph, 6);
  const scenarios = graph.all.filter((e) => e.future);
  const argued = scenarios.filter((e) => strandOf(graph, e.id).parents.length);
  const record = graph.all.filter((e) => !e.future);
  const cited = record.filter((e) => e.url);
  const silent = threads.filter((t) => t.scenarios.length && !t.argued);

  // The deepest roads to the present, longest first — the argument at its fullest.
  // They lead to the standing entries, so every hop is on the record.
  const deepest = standing
    .map(({ event }) => ({ event, ...roadsTo(graph, event.id) }))
    .filter((r) => r.roads.length)
    .sort((a, b) => b.longest - a.longest)
    .slice(0, 3);

  return (
    <div data-year={NOW} style={shell('route')}>
      <PageHead
        eyebrow="The open file · where it stands · derived from data/events.json and data/links.json"
        title="The case as it stands"
        lede={CASE_LEDE}
        facts={
          <>
            <Ledger label="Record">{record.length} entries to {NOW} · {cited.length} carry a citation, {record.length - cited.length} do not</Ledger>
            <Ledger label="Scenarios">{scenarios.length} past {NOW} · {argued.length} carry a string, {scenarios.length - argued.length} are asserted</Ledger>
            <Ledger label="Standing">{standing.length} record entries throw a string across {NOW} — the present, as the board argues it</Ledger>
            <Ledger label="Strings">{graph.edges.length} drawn · mean {(graph.edges.length * 2 / graph.all.length).toFixed(2)} per entry</Ledger>
          </>
        }
      >
        <NavRow {...NAV} style={{ marginBottom: 34 }} />
      </PageHead>

      {/* ── I ─────────────────────────────────────────────────────────────── */}
      <Movement
        numeral="I"
        title="Where the board stands"
        blurb={'Not the most recent entries, but the ones that carry a string past ' + NOW + '. These are the ' + standing.length + ' points the board is actually reasoning forward from.'}
      />

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {standing.map(({ event, into }) => (
          // The row used to be one whole-row link, which is why the scenarios
          // it throws forward could not be followed: an anchor cannot hold
          // another. The card's own half is the link now — a block, so it is
          // still a large target on a phone — and each string it throws goes
          // to the scenario it names.
          <div
            key={event.id}
            style={{
              display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,260px),1fr))', gap: 'clamp(16px,3vw,40px)',
              borderTop: RULE, padding: '24px 0', alignItems: 'start'
            }}
          >
            <Link
              to={{ view: 'card', id: event.id }}
              className="ix-row"
              style={{ display: 'flex', minWidth: 0, flexDirection: 'column', gap: 9, padding: '4px 8px 8px', margin: '-4px -8px -8px' }}
            >
              <CardTriple event={event} size="panel" as="h3" />
              <Prose style={{ maxWidth: '54ch' }}>{event.summary}</Prose>
              <Reading event={event} maxWidth="54ch" />
              <div style={micro(event.url ? 3 : 5)}>
                {event.url ? (event.source || 'Source') + ' on file' : 'No citation on this entry'}
              </div>
            </Link>

            <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 6 }}>
              <Eyebrow tier="section" dim>Throws forward</Eyebrow>
              {into.map((i, n) => (
                <div key={n} style={{ display: 'flex', flexDirection: 'column', gap: 6, borderLeft: '2px solid ' + RED, paddingLeft: 13 }}>
                  <Claim wrap>{i.claim}</Claim>
                  <Ref event={i.event} size={16} to={{ view: 'card', id: i.event.id }} />
                  {i.event.confidence && <span style={{ ...badge(), alignSelf: 'flex-start' }}>{i.event.confidence}</span>}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* ── II ────────────────────────────────────────────────────────────── */}
      <Movement
        numeral="II"
        title="The road here"
        blurb="Every hop below is a claim someone wrote down on the board. Read left to right: this is the argument at its longest, in its own words."
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 30 }}>
        {deepest.map(({ event, roads, longest, truncated }) => (
          <div key={event.id} style={{ borderTop: RULE, paddingTop: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'baseline' }}>
              <Eyebrow tier="section" as="span">{longest} hops</Eyebrow>
              <span style={micro(5)}>{roads.length} distinct road{roads.length === 1 ? '' : 's'} to {event.title}</span>
              {truncated && <span style={{ ...micro(4), color: RED_LIT }}>list capped — more roads exist</span>}
            </div>
            <Road road={roads[0]} />
            {roads.length > 1 && (
              <div style={{ ...micro(5), letterSpacing: '0.1em', textTransform: 'none' }}>
                Also reached from{' '}
                {roads.slice(1).map((r, k) => (
                  <React.Fragment key={r[0].from.id}>
                    {k > 0 && ' · '}
                    <Link to={{ view: 'card', id: r[0].from.id }} className="ix-ref" style={{ color: ink(4) }}>
                      {r[0].from.year} {r[0].from.title}
                    </Link>
                  </React.Fragment>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <Section eyebrow="The load-bearing record">
        {bearing.map((r) => (
          <Ledger key={r.event.id} label={r.futures + (r.futures === 1 ? ' scenario' : ' scenarios')}>
            <Ref event={r.event} mono to={{ view: 'card', id: r.event.id }} />
          </Ledger>
        ))}
      </Section>

      {/* ── III ───────────────────────────────────────────────────────────── */}
      <Movement
        numeral="III"
        title="What follows"
        blurb="Grouped by front, not by date. Confidence and distance move together on this board, so ordering by year would dress one judgement up as two."
      />

      {/* One row per thread. The scenarios themselves, and what stands behind each, are the horizon's page. */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {threads.filter((t) => t.scenarios.length).map((row) => (
          <div key={row.thread.id} style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'baseline', borderTop: RULE, padding: '18px 0' }}>
            <h3 style={{ margin: 0, font: '400 clamp(20px,2.2vw,27px)/1.1 ' + SERIF, letterSpacing: '-0.02em' }}>{row.thread.label}</h3>
            <span style={micro(5)}>
              {row.scenarios.length} scenario{row.scenarios.length === 1 ? '' : 's'} · {row.argued} argued · record ends {row.recordEndsAt}
            </span>
            {!row.argued && <span style={{ ...micro(1), color: RED_LIT }}>projected onto, never argued</span>}
          </div>
        ))}
      </div>
      <div style={{ marginTop: 22 }}>
        <Btn tone="loud" to={{ view: 'horizon' }}>The horizon →</Btn>
      </div>

      {/* ── IV ────────────────────────────────────────────────────────────── */}
      <Movement
        numeral="IV"
        title="What this case does not do"
        blurb="The limits are part of the argument. All of these are counted from the same two files as everything above."
      />

      <div>
        <Ledger label="Not scored">Nothing here has been checked against an outcome. There is no way on this board to record that a scenario happened.</Ledger>
        <Ledger label="Not evidence">A string is a claim someone wrote down, not a finding. Counting strings measures how much was argued, never how likely anything is.</Ledger>
        <Ledger label="Asserted">{scenarios.length - argued.length} of {scenarios.length} scenarios carry no string at all</Ledger>
        {silent.length > 0 && (
          <Ledger label="Unargued">
            {silent.map((s) => s.thread.label + ' (' + s.scenarios.length + ' scenario' + (s.scenarios.length === 1 ? '' : 's') + ', record ends ' + s.recordEndsAt + ')').join(' · ')}
          </Ledger>
        )}
        <Ledger label="Circular">
          {scenarios.filter((e) => strandOf(graph, e.id).restsOn.length).length} scenario chains pass through another scenario rather than the record
        </Ledger>
        <Ledger label="Dates">
          The year on a scenario is a placeholder. {ERAS[ERAS.length - 1].subtitle}
        </Ledger>
      </div>

      <Section>
        <NavRow {...NAV} />
      </Section>
    </div>
  );
}

// A page re-renders on its own route, not on the header's year ticking over.
export default React.memo(CaseView);
