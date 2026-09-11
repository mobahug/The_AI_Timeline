import React from 'react';
import {
  ERAS, NOW, accent, catLabel, standingNow, roadsTo, threadLedger, loadBearing, strandOf
} from '../lib/data.js';
import { INK, MONO, RED, RED_LIT, SANS, SERIF, button, micro, tag } from '../lib/styles.js';

/* The case as it stands.
   Every connective word on this page is either verbatim from data/*.json or a fixed
   structural label. Nothing about any specific event or scenario is composed here —
   the argument was already written, in the claim verbs. This only typesets it. */

const SHELL = { maxWidth: 1400, margin: '0 auto', padding: '0 clamp(18px,4vw,32px) 120px' };
const RULE = '1px solid rgba(243,240,234,0.12)';
const PROSE = { font: '400 clamp(13px,1.15vw,14.5px)/1.62 ' + SANS, color: 'rgba(243,240,234,0.62)', textWrap: 'pretty' };

const Movement = ({ numeral, title, blurb }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 9, padding: '76px 0 22px', borderTop: RULE, marginTop: 44 }}>
    <div style={{ ...micro(0.4), letterSpacing: '0.26em' }}>{numeral}</div>
    <h2 style={{ margin: 0, font: '400 clamp(28px,4.4vw,52px)/1 ' + SERIF, letterSpacing: '-0.03em', textWrap: 'balance' }}>{title}</h2>
    <p style={{ margin: 0, ...PROSE, maxWidth: '58ch' }}>{blurb}</p>
  </div>
);

/** A fact with both halves shown, so a number never floats free of its denominator. */
const Fact = ({ label, children }) => (
  <div style={{ display: 'grid', gridTemplateColumns: 'minmax(88px,110px) minmax(0,1fr)', gap: 'clamp(10px,2vw,22px)', padding: '7px 0', alignItems: 'baseline' }}>
    <div style={{ ...micro(0.36), letterSpacing: '0.18em' }}>{label}</div>
    <div style={{ font: '400 12.5px/1.6 ' + MONO, color: 'rgba(243,240,234,0.72)', minWidth: 0, overflowWrap: 'anywhere' }}>{children}</div>
  </div>
);

/** The claim verb, in the ink the strings are drawn in. */
const Claim = ({ children }) => (
  <span style={{
    font: '400 10px/1.5 ' + MONO, letterSpacing: '0.14em', textTransform: 'uppercase',
    color: 'oklch(0.78 0.16 25)', whiteSpace: 'nowrap'
  }}>· {children} ·</span>
);

const Title = ({ event, size = 15 }) => (
  <span style={{ font: '400 ' + size + 'px/1.2 ' + SERIF, color: INK, letterSpacing: '-0.015em' }}>
    <span style={{ font: '400 10.5px/1 ' + MONO, color: 'rgba(243,240,234,0.42)', fontVariantNumeric: 'tabular-nums', marginRight: 6 }}>{event.year}</span>
    {event.title}
  </span>
);

/** One backward path, typeset as a sentence in the author's own verbs. */
const Road = ({ road }) => (
  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: '7px 9px', minWidth: 0 }}>
    <Title event={road[0].from} />
    {road.map((hop, i) => (
      <React.Fragment key={i}>
        <Claim>{hop.claim}</Claim>
        <Title event={hop.to} size={hop.to.future ? 16 : 15} />
      </React.Fragment>
    ))}
  </div>
);

export default function CaseView({ graph, navigate, onOpen }) {
  const standing = standingNow(graph);
  const threads = threadLedger(graph);
  const bearing = loadBearing(graph, 6);
  const scenarios = graph.all.filter((e) => e.future);
  const argued = scenarios.filter((e) => strandOf(graph, e.id).parents.length);
  const record = graph.all.filter((e) => !e.future);
  const cited = record.filter((e) => e.url);
  const silent = threads.filter((t) => t.scenarios.length && !t.argued);

  // The deepest roads on the board, longest first — the argument at its fullest.
  const deepest = scenarios
    .map((e) => ({ event: e, ...roadsTo(graph, e.id) }))
    .filter((r) => r.roads.length)
    .sort((a, b) => b.longest - a.longest)
    .slice(0, 3);

  return (
    <div style={SHELL}>
      <div data-year={NOW} style={{ padding: '30px 0 0' }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 34 }}>
          <button onClick={() => navigate({ view: 'line', finding: null, id: null, clue: null })} style={button()}>← The route</button>
          <span style={{ flex: 1 }} />
          <button onClick={() => navigate({ view: 'horizon', finding: null, id: null, clue: null })} style={button('loud')}>The horizon →</button>
        </div>
        <div style={{ ...micro(0.4), letterSpacing: '0.24em', marginBottom: 16 }}>
          The open file · where it stands · derived from data/events.json and data/links.json
        </div>
        <h1 style={{ margin: 0, font: '400 clamp(38px,7.6vw,96px)/0.96 ' + SERIF, letterSpacing: '-0.04em', textWrap: 'balance' }}>
          The case as it stands
        </h1>
        <p style={{ margin: '18px 0 0', ...PROSE, fontSize: 'clamp(14px,1.5vw,18px)', maxWidth: '52ch', color: 'rgba(243,240,234,0.72)' }}>
          {ERAS[ERAS.length - 1].subtitle}
        </p>

        <div style={{ marginTop: 40, paddingTop: 22, borderTop: RULE }}>
          <Fact label="Record">{record.length} entries to {NOW} · {cited.length} carry a citation, {record.length - cited.length} do not</Fact>
          <Fact label="Scenarios">{scenarios.length} past {NOW} · {argued.length} carry a string, {scenarios.length - argued.length} are asserted</Fact>
          <Fact label="Standing">{standing.length} record entries throw a string across {NOW} — the present, as the board argues it</Fact>
          <Fact label="Strings">{graph.edges.length} drawn · mean {(graph.edges.length * 2 / graph.all.length).toFixed(2)} per entry</Fact>
        </div>
      </div>

      {/* ── I ─────────────────────────────────────────────────────────────── */}
      <Movement
        numeral="I"
        title="Where the board stands"
        blurb={'Not the most recent entries, but the ones that carry a string past ' + NOW + '. These are the ' + standing.length + ' points the board is actually reasoning forward from.'}
      />

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {standing.map(({ event, into }) => (
          <button
            key={event.id}
            type="button"
            onClick={() => onOpen(event.id)}
            style={{
              display: 'grid', gridTemplateColumns: 'minmax(0,1.25fr) minmax(0,1fr)', gap: 'clamp(16px,3vw,40px)',
              width: '100%', textAlign: 'left', background: 'transparent', border: 'none', borderTop: RULE,
              padding: '24px 0', cursor: 'pointer', alignItems: 'start'
            }}
          >
            <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 9 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
                <span style={{ font: '400 clamp(24px,2.6vw,34px)/1 ' + SERIF, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>{event.year}</span>
                <span style={tag(event.category, accent)}>{catLabel(event.category)}</span>
              </div>
              <div style={{ font: '400 clamp(18px,2vw,24px)/1.14 ' + SERIF, letterSpacing: '-0.022em', textWrap: 'balance' }}>{event.title}</div>
              <p style={{ margin: 0, ...PROSE, maxWidth: '54ch' }}>{event.summary}</p>
              {event.why && (
                <p style={{ margin: 0, ...PROSE, color: 'rgba(243,240,234,0.5)', fontStyle: 'italic', maxWidth: '54ch' }}>{event.why}</p>
              )}
              <div style={micro(event.url ? 0.5 : 0.34)}>
                {event.url ? (event.source || 'Source') + ' on file' : 'No citation on this entry'}
              </div>
            </div>

            <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 6 }}>
              <div style={{ ...micro(0.36), letterSpacing: '0.2em' }}>Throws forward</div>
              {into.map((i, n) => (
                <div key={n} style={{ display: 'flex', flexDirection: 'column', gap: 6, borderLeft: '2px solid ' + RED, paddingLeft: 13 }}>
                  <Claim>{i.claim}</Claim>
                  <Title event={i.event} size={16} />
                  {i.event.confidence && <span style={{ ...micro(0.5), border: '1px dashed rgba(243,240,234,0.3)', padding: '3px 6px', alignSelf: 'flex-start' }}>{i.event.confidence}</span>}
                </div>
              ))}
            </div>
          </button>
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
              <span style={{ ...micro(0.5), letterSpacing: '0.2em' }}>{longest} hops</span>
              <span style={micro(0.34)}>{roads.length} distinct road{roads.length === 1 ? '' : 's'} to {event.title}</span>
              {truncated && <span style={{ ...micro(0.5), color: RED_LIT }}>list capped — more roads exist</span>}
            </div>
            <Road road={roads[0]} />
            {roads.length > 1 && (
              <div style={{ ...micro(0.34), letterSpacing: '0.1em', textTransform: 'none' }}>
                Also reached from {roads.slice(1).map((r) => r[0].from.year + ' ' + r[0].from.title).join(' · ')}
              </div>
            )}
          </div>
        ))}
      </div>

      <div style={{ marginTop: 42, paddingTop: 22, borderTop: RULE }}>
        <div style={{ ...micro(0.36), letterSpacing: '0.2em', marginBottom: 10 }}>What the futures rest on</div>
        {bearing.map((r) => (
          <Fact key={r.event.id} label={r.futures + (r.futures === 1 ? ' future' : ' futures')}>
            {r.event.year} {r.event.title}
          </Fact>
        ))}
      </div>

      {/* ── III ───────────────────────────────────────────────────────────── */}
      <Movement
        numeral="III"
        title="What follows"
        blurb="Grouped by front, not by date. Confidence and distance move together on this board, so ordering by year would dress one judgement up as two."
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 46 }}>
        {threads.filter((t) => t.scenarios.length).map((row) => (
          <div key={row.thread.id}>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'baseline', borderTop: RULE, paddingTop: 18, marginBottom: 18 }}>
              <h3 style={{ margin: 0, font: '400 clamp(20px,2.2vw,27px)/1.1 ' + SERIF, letterSpacing: '-0.02em' }}>{row.thread.label}</h3>
              <span style={micro(0.4)}>
                {row.scenarios.length} scenario{row.scenarios.length === 1 ? '' : 's'} · {row.argued} argued · record ends {row.recordEndsAt}
              </span>
              {!row.argued && (
                <span style={{ ...micro(1), color: RED_LIT, letterSpacing: '0.16em' }}>
                  projected onto, never argued
                </span>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
              {row.scenarios.map((event) => {
                const strand = strandOf(graph, event.id);
                return (
                  <div key={event.id} style={{
                    display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1.15fr)', gap: 'clamp(14px,3vw,34px)',
                    borderLeft: '2px ' + (strand.parents.length ? 'solid ' + RED : 'dashed rgba(243,240,234,0.28)'),
                    paddingLeft: 'clamp(12px,2vw,18px)', alignItems: 'start'
                  }}>
                    <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
                        <span style={{ font: '400 clamp(21px,2.3vw,29px)/1 ' + SERIF, fontVariantNumeric: 'tabular-nums' }}>{event.year}</span>
                        {event.confidence && <span style={{ ...micro(0.6), border: '1px dashed rgba(243,240,234,0.32)', padding: '4px 7px' }}>{event.confidence}</span>}
                      </div>
                      <button
                        type="button"
                        onClick={() => onOpen(event.id)}
                        style={{ font: '400 clamp(17px,1.9vw,22px)/1.14 ' + SERIF, letterSpacing: '-0.02em', color: INK, background: 'transparent', border: 'none', padding: 0, textAlign: 'left', cursor: 'pointer', textWrap: 'balance' }}
                      >{event.title}</button>
                      <p style={{ margin: 0, ...PROSE, maxWidth: '46ch' }}>{event.summary}</p>
                      {event.why && <p style={{ margin: 0, ...PROSE, color: 'rgba(243,240,234,0.48)', fontStyle: 'italic', maxWidth: '46ch' }}>{event.why}</p>}
                    </div>

                    <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 11, paddingTop: 4 }}>
                      <div style={{ ...micro(0.34), letterSpacing: '0.2em' }}>What stands behind it</div>
                      {strand.parents.length ? strand.parents.map((p, i) => (
                        <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0 }}>
                          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: '5px 8px' }}>
                            <Title event={p.event} size={14} />
                            <Claim>{p.claim}</Claim>
                          </div>
                          {p.note
                            ? <p style={{ margin: 0, ...PROSE, fontSize: 12.5, maxWidth: '48ch' }}>{p.note}</p>
                            : <span style={micro(0.3)}>No case note written for this string</span>}
                          {p.event.future && (
                            <span style={{ ...micro(1), color: RED_LIT, letterSpacing: '0.14em' }}>
                              this parent is itself a scenario
                            </span>
                          )}
                        </div>
                      )) : (
                        <p style={{ margin: 0, ...PROSE, maxWidth: '44ch', color: 'rgba(243,240,234,0.5)' }}>
                          Asserted. No string on the wall reaches it.
                        </p>
                      )}
                      {strand.parents.length > 0 && (
                        <div style={{ ...micro(0.3), letterSpacing: '0.14em', marginTop: 2 }}>
                          {strand.record.length} record ancestor{strand.record.length === 1 ? '' : 's'}
                          {strand.restsOn.length ? ' · ' + strand.restsOn.length + ' of its chain is itself unargued' : ''}
                          {strand.jump !== null ? ' · ' + strand.jump + ' yr jump' : ''}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* ── IV ────────────────────────────────────────────────────────────── */}
      <Movement
        numeral="IV"
        title="What this case does not do"
        blurb="The limits are part of the argument. All of these are counted from the same two files as everything above."
      />

      <div>
        <Fact label="Not scored">Nothing here has been checked against an outcome. There is no way on this board to record that a scenario happened.</Fact>
        <Fact label="Not evidence">A string is a claim someone wrote down, not a finding. Counting strings measures how much was argued, never how likely anything is.</Fact>
        <Fact label="Asserted">{scenarios.length - argued.length} of {scenarios.length} scenarios carry no string at all</Fact>
        {silent.length > 0 && (
          <Fact label="Unargued">
            {silent.map((s) => s.thread.label + ' (' + s.scenarios.length + ' scenario' + (s.scenarios.length === 1 ? '' : 's') + ', record ends ' + s.recordEndsAt + ')').join(' · ')}
          </Fact>
        )}
        <Fact label="Circular">
          {scenarios.filter((e) => strandOf(graph, e.id).restsOn.length).length} scenario chains pass through another scenario rather than the record
        </Fact>
        <Fact label="Dates">
          The year on a scenario is a placeholder. {ERAS[ERAS.length - 1].subtitle}
        </Fact>
      </div>
    </div>
  );
}
