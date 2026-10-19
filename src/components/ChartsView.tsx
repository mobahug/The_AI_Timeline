import React, { useMemo } from 'react';
import { CATEGORIES, FIRST, NOW, THREADS, TICKS, catLabel, whenOf, yearFraction } from '../lib/data';
import { eraGrid, ladders, pace, peakOf, stringSpans, threadPair, topNames, topThread } from '../lib/stats';
import type { EraGrid, Ladder, Pace, PairRow, Spans, NameCount } from '../lib/stats';
import { LEADS } from '../lib/leads';
import { INK, MONO, SANS, SERIF, RULE, ROW_RULE, STRING_INK, CHART, RAMP, RAMP_INK, ink, markOf, micro, shell, pageTitle } from '../lib/styles';
import { Btn, Eyebrow, JumpNav, Link, PageHead, useNav } from './kit';
import { ChartSection, Grid, Legend, Plot, Table, markProps, ticksFor } from './Chart';
import { LadderChart, say } from './SharedCharts';
import type { Edge, Event, Graph, Thread } from '../lib/types';

/* The charts: the record counted rather than read. Six questions a reader can
   put to the board and answer by counting its cards and strings — how fast it
   moved, what each era was about, harm and the response to it, how long a
   cause takes to show its effect, how far up each lead's ladder the machines
   climbed and when, and whose names recur.

   Every sentence above a chart is assembled from the same counts the chart
   draws, so neither can drift from the other or from the data. What is
   counted is what the board has pinned up — one reading of the field, not a
   census of it — and the page says so before the first chart. */

const plural = (n: number, one: string, many = one + 's') => n + ' ' + (n === 1 ? one : many);

/* The two threads the third chart sets side by side, and the categories they
   are coloured by — the same hues as their chips everywhere else. */
const HARM = 'fail';
const RULES = 'rules';
const threadLabel = (id: string) => (THREADS.find((t) => t.id === id) || { label: id }).label;

/* ─── 01 · The pace ──────────────────────────────────────────────────── */

const H = 200;
const GUT = 30;

/** Every year from the first to the present, a column each. Gold marks the
 *  busiest year and the present; the eras are the bands behind. */
function PaceChart({ p, eras }: { p: Pace; eras: EraGrid['eras'] }) {
  const n = p.rows.length;
  const ticks = ticksFor(p.peak.total, 3);
  const top = ticks[ticks.length - 1] || 1;
  const pct = (year: number) => ((year - FIRST) / n) * 100;
  const labels: number[] = [];
  for (let y = FIRST; y < NOW - 10; y += 25) labels.push(y);
  return (
    <Plot
      label={'Cards on the record per year, ' + FIRST + ' to ' + NOW + '.'}
      count={n}
      describe={(i) => {
        const r = p.rows[i];
        const names = r.cards.slice(0, 3).map((e) => e.title);
        const more = r.cards.length - names.length;
        return {
          value: r.total,
          label: (r.total === 1 ? 'card' : 'cards') + ' in ' + r.year,
          detail: names.length ? names.join(' · ') + (more > 0 ? ' · and ' + more + ' more' : '') : 'Nothing on the board this year.',
          text: r.year + ': ' + plural(r.total, 'card') + (names.length ? ', among them ' + names.join('; ') : '') + '.'
        };
      }}
    >
      {(walk) => (
        <div style={{ position: 'relative', height: H + 30, paddingLeft: GUT }}>
          <div aria-hidden="true" style={{ position: 'absolute', left: GUT, right: 0, top: 0, height: H }}>
            {eras.map((era, i) => {
              const to = eras[i + 1] ? eras[i + 1].year : NOW + 1;
              const width = pct(to) - pct(era.year);
              return (
                <div key={era.year} style={{ position: 'absolute', top: 0, bottom: 0, left: pct(era.year) + '%', width: width + '%', background: i % 2 ? CHART.band : 'transparent', borderLeft: i ? '1px solid ' + CHART.grid : 'none' }}>
                  {width > 15 && <span className="chart-wide" style={{ ...micro(5), position: 'absolute', top: 8, left: 8, right: 4, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{era.title}</span>}
                </div>
              );
            })}
          </div>
          <Grid ticks={ticks} top={0} height={H} gutter={GUT} />
          <div style={{ position: 'absolute', left: GUT, right: 0, top: 0, height: H, display: 'flex', alignItems: 'stretch' }}>
            {p.rows.map((r, i) => {
              const lit = walk.active === i;
              // Every year that ties for the most, and the present.
              const gold = r.total === p.peak.total || r.year === NOW;
              return (
                <div key={r.year} {...markProps(i, walk)} style={{ flex: '1 1 0', minWidth: 0, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', background: lit ? 'rgba(243,240,234,0.06)' : 'transparent' }}>
                  {r.total > 0 && <div style={{ width: 'min(72%, 16px)', minWidth: 1, height: (r.total / top) * 100 + '%', background: lit ? CHART.lit : gold ? CHART.emphasis : CHART.mark, borderRadius: '2px 2px 0 0' }} />}
                </div>
              );
            })}
          </div>
          <div aria-hidden="true" style={{ position: 'absolute', left: GUT, right: 0, top: H + 9, height: 14, font: '400 10px/1 ' + MONO, color: ink(5), fontVariantNumeric: 'tabular-nums' }}>
            {labels.map((y) => <span key={y} style={{ position: 'absolute', left: pct(y) + '%' }}>{y}</span>)}
            <span style={{ position: 'absolute', right: 0 }}>{NOW}</span>
          </div>
        </div>
      )}
    </Plot>
  );
}

/* ─── 02 · What each era was about ───────────────────────────────────── */

const LABEL_W = 'clamp(92px,16vw,170px)';

/** A count's step on the ramp: nothing for none, then six steps to the most. */
const stepOf = (n: number, max: number) => (n <= 0 ? -1 : Math.min(RAMP.length - 1, Math.floor(((n - 1) / Math.max(1, max - 1)) * (RAMP.length - 1) + 0.0001)));

function EraHeat({ g }: { g: EraGrid }) {
  const E = g.eras.length;
  return (
    <>
      <Plot
        label="Cards on the record, by thread and by era."
        count={g.threads.length * E}
        describe={(i) => {
          const t = Math.floor(i / E);
          const e = i % E;
          const n = g.cells[t][e];
          return {
            value: n,
            label: g.threads[t].label + ' · ' + g.eras[e].range,
            detail: g.eras[e].title + ': ' + n + ' of the era’s ' + g.totals[e] + ' cards.',
            text: g.threads[t].label + ', ' + g.eras[e].title + ' (' + g.eras[e].range + '): ' + plural(n, 'card') + ' of ' + g.totals[e] + '.'
          };
        }}
      >
        {(walk) => (
          <div style={{ display: 'grid', gridTemplateColumns: LABEL_W + ' repeat(' + E + ', minmax(0,1fr))', gap: 2 }}>
            <span />
            {g.eras.map((era) => (
              <div key={era.year} style={{ padding: '0 2px 8px', minWidth: 0 }}>
                <div style={{ font: '400 10px/1.3 ' + MONO, color: ink(4), fontVariantNumeric: 'tabular-nums' }}>{era.year}</div>
                <div className="chart-wide" style={{ marginTop: 3, font: '400 12px/1.25 ' + SERIF, color: ink(3), textWrap: 'balance' }}>{era.title}</div>
              </div>
            ))}
            {g.threads.map((t, ti) => (
              <React.Fragment key={t.id}>
                <div style={{ display: 'flex', alignItems: 'center', font: '400 12px/1.25 ' + SANS, color: ink(3), paddingRight: 8, minHeight: 44 }}>{t.label}</div>
                {g.eras.map((era, ei) => {
                  const i = ti * E + ei;
                  const n = g.cells[ti][ei];
                  const s = stepOf(n, g.max);
                  const lit = walk.active === i;
                  return (
                    <div key={era.year} {...markProps(i, walk)} style={{
                      minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 2,
                      background: s < 0 ? 'transparent' : RAMP[s],
                      boxShadow: lit ? 'inset 0 0 0 2px ' + INK : s < 0 ? 'inset 0 0 0 1px ' + CHART.grid : 'none',
                      font: '400 13px/1 ' + MONO, fontVariantNumeric: 'tabular-nums',
                      color: s < 0 ? ink(5) : s >= RAMP_INK ? '#0a0a0b' : INK
                    }}>{n || '·'}</div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        )}
      </Plot>
      <div aria-hidden="true" style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, font: '400 11px/1 ' + MONO, color: ink(4) }}>
        <span>Fewer</span>
        {RAMP.map((c) => <span key={c} style={{ width: 22, height: 10, background: c, borderRadius: 1 }} />)}
        <span>More cards</span>
      </div>
    </>
  );
}

/* ─── 03 · Harm, and the response ────────────────────────────────────── */

function PairChart({ rows, colors, names }: { rows: PairRow[]; colors: [string, string]; names: [string, string] }) {
  const max = Math.max(1, ...rows.map((r) => Math.max(r.a, r.b)));
  const ticks = ticksFor(max, 3);
  const top = ticks[ticks.length - 1] || 1;
  const pa = peakOf(rows, 'a');
  const pb = peakOf(rows, 'b');
  return (
    <>
      <Plot
        label={names[0] + ' and ' + names[1] + ': cards per year, ' + rows[0].year + ' to ' + NOW + '.'}
        count={rows.length}
        describe={(i) => {
          const r = rows[i];
          return {
            value: r.a + ' · ' + r.b,
            label: r.year + ' · ' + names[0].toLowerCase() + ' · ' + names[1].toLowerCase(),
            detail: r.cards.length ? r.cards.map((e) => e.title).slice(0, 4).join(' · ') + (r.cards.length > 4 ? ' · and ' + (r.cards.length - 4) + ' more' : '') : 'Neither on the board this year.',
            text: r.year + ': ' + plural(r.a, 'card') + ' on ' + names[0] + ', ' + plural(r.b, 'card') + ' on ' + names[1] + '.'
          };
        }}
      >
        {(walk) => (
          <div style={{ position: 'relative', height: H + 30, paddingLeft: GUT }}>
            <Grid ticks={ticks} top={0} height={H} gutter={GUT} />
            <div style={{ position: 'absolute', left: GUT, right: 0, top: 0, height: H, display: 'flex', alignItems: 'stretch' }}>
              {rows.map((r, i) => {
                const lit = walk.active === i;
                const bar = (v: number, c: string, peak: boolean) => (
                  <div style={{ position: 'relative', width: 'min(40%, 14px)', height: (v / top) * 100 + '%', minHeight: v ? 2 : 0, background: lit ? CHART.lit : c, borderRadius: '2px 2px 0 0' }}>
                    {peak && v > 0 && <span aria-hidden="true" style={{ position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: 4, font: '400 11px/1 ' + MONO, color: ink(2) }}>{v}</span>}
                  </div>
                );
                return (
                  <div key={r.year} {...markProps(i, walk)} style={{ flex: '1 1 0', minWidth: 0, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 2, background: lit ? 'rgba(243,240,234,0.06)' : 'transparent' }}>
                    {bar(r.a, colors[0], r.year === pa.year)}
                    {bar(r.b, colors[1], r.year === pb.year)}
                  </div>
                );
              })}
            </div>
            <div aria-hidden="true" style={{ position: 'absolute', left: GUT, right: 0, top: H + 9, display: 'flex', font: '400 10px/1 ' + MONO, color: ink(5), fontVariantNumeric: 'tabular-nums' }}>
              {rows.map((r, i) => (
                <span key={r.year} className={i % 2 && i !== rows.length - 1 ? 'tick-minor' : undefined} style={{ flex: '1 1 0', minWidth: 0, textAlign: 'center' }}>
                  {i === 0 || i === rows.length - 1 ? r.year : '’' + String(r.year).slice(2)}
                </span>
              ))}
            </div>
          </div>
        )}
      </Plot>
      <Legend items={[{ label: names[0], color: colors[0] }, { label: names[1], color: colors[1] }]} />
    </>
  );
}

/* ─── 04 · How long a string takes ───────────────────────────────────── */

function SpanChart({ s }: { s: Spans }) {
  const max = Math.max(1, ...s.bins.map((b) => b.edges.length));
  const ticks = ticksFor(max, 3);
  const top = ticks[ticks.length - 1] || 1;
  const medianBin = s.bins.findIndex((b) => s.median >= b.from && s.median <= b.to);
  return (
    <Plot
      label={'Strings on the board, by the years between their two ends.'}
      count={s.bins.length}
      describe={(i) => {
        const b = s.bins[i];
        return {
          value: b.edges.length,
          label: (b.edges.length === 1 ? 'string' : 'strings') + ' · ' + (b.from === 0 ? 'within the same year' : b.to === Infinity ? 'over ' + (b.from - 1) + ' years' : b.label + (b.from === b.to && b.from > 1 ? ' years' : b.from === b.to ? '' : ' years')),
          text: b.label + (b.from > 1 && b.to !== Infinity && b.from !== b.to ? ' years' : '') + ': ' + plural(b.edges.length, 'string') + '.'
        };
      }}
    >
      {(walk) => (
        <div style={{ position: 'relative', height: H + 30, paddingLeft: GUT }}>
          <Grid ticks={ticks} top={0} height={H} gutter={GUT} />
          <div style={{ position: 'absolute', left: GUT, right: 0, top: 0, height: H, display: 'flex', alignItems: 'stretch' }}>
            {s.bins.map((b, i) => {
              const lit = walk.active === i;
              return (
                <div key={b.label} {...markProps(i, walk)} style={{ flex: '1 1 0', minWidth: 0, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', background: lit ? 'rgba(243,240,234,0.06)' : 'transparent' }}>
                  <div style={{ position: 'relative', width: 'min(56%, 24px)', height: (b.edges.length / top) * 100 + '%', minHeight: b.edges.length ? 2 : 0, background: lit ? CHART.lit : i === medianBin ? CHART.emphasis : CHART.mark, borderRadius: '2px 2px 0 0' }}>
                    <span aria-hidden="true" style={{ position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: 5, font: '400 11px/1 ' + MONO, color: ink(2), fontVariantNumeric: 'tabular-nums' }}>{b.edges.length}</span>
                  </div>
                </div>
              );
            })}
          </div>
          <div aria-hidden="true" style={{ position: 'absolute', left: GUT, right: 0, top: H + 9, display: 'flex', font: '400 10px/1.2 ' + MONO, color: ink(5) }}>
            {s.bins.map((b) => <span key={b.label} style={{ flex: '1 1 0', minWidth: 0, textAlign: 'center' }}>{b.label}</span>)}
          </div>
        </div>
      )}
    </Plot>
  );
}

/* ─── 05 · The ladders ───────────────────────────────────────────────── */

/* LadderChart is drawn on each lead's page as well, so it lives with the
   front page's sparkline in SharedCharts.tsx. */

/* ─── 06 · The names that recur ──────────────────────────────────────── */

function NameBars({ title, rows, hue, kind }: { title: string; rows: NameCount[]; hue: number; kind: 'person' | 'org' }) {
  const max = Math.max(1, ...rows.map((r) => r.cards));
  return (
    <div style={{ flex: '1 1 300px', minWidth: 0 }}>
      <Eyebrow tier="section" dim style={{ marginBottom: 10 }}>{title}</Eyebrow>
      <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {rows.map((r) => (
          <li key={r.entity.id} style={{ borderTop: ROW_RULE }}>
            <Link to={{ view: kind, id: r.entity.id }} className="ix-row" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,9fr) minmax(0,10fr) 28px', gap: 10, alignItems: 'center', padding: '8px 4px' }}>
              <span style={{ font: '400 15px/1.2 ' + SERIF, color: INK, letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.entity.label}</span>
              <span aria-hidden="true" style={{ display: 'block', height: 10, width: (r.cards / max) * 100 + '%', minWidth: 2, background: markOf(hue), borderRadius: '0 2px 2px 0' }} />
              <span style={{ font: '400 12px/1 ' + MONO, color: ink(2), textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{r.cards}</span>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}

/* ─── The page ───────────────────────────────────────────────────────── */

export interface ChartsViewProps { graph: Graph }

function ChartsView({ graph }: ChartsViewProps) {
  const d = useMemo(() => {
    const p = pace(graph);
    const g = eraGrid(graph);
    const from = g.eras[Math.max(0, g.eras.length - 2)].year;
    const pair = threadPair(graph, HARM, RULES, from);
    return { p, g, pair, s: stringSpans(graph), l: ladders(graph), people: topNames(graph, 'person'), orgs: topNames(graph, 'org') };
  }, [graph]);
  const { p, g, pair, s, l, people, orgs } = d;

  const record = graph.all.filter((e) => !e.future).length;
  const first = topThread(g, 0);
  const last = topThread(g, g.eras.length - 1);
  const pa = peakOf(pair, 'a');
  const pb = peakOf(pair, 'b');
  const harmHue = markOf(hueOfThread(HARM));
  const rulesHue = markOf(hueOfThread(RULES));
  const lon = s.longest[0];
  const at = (id: string) => g.threads.findIndex((t) => t.id === id);
  const both = (era: number) => (at(HARM) < 0 ? 0 : g.cells[at(HARM)][era]) + (at(RULES) < 0 ? 0 : g.cells[at(RULES)][era]);
  const harmRules = { first: both(0), last: both(g.eras.length - 1) };
  const sinceYears = NOW - p.since.from + 1;
  const peakYears = p.rows.filter((r) => r.total === p.peak.total).map((r) => r.year);

  const charts: { id: string; title: string }[] = [
    { id: 'pace', title: 'How fast it moved' },
    { id: 'eras', title: 'What each era was about' },
    { id: 'harm', title: 'Harm, and the response to it' },
    { id: 'strings', title: 'How long a cause takes' },
    { id: 'ladders', title: 'How far up each ladder' },
    { id: 'names', title: 'The names that recur' }
  ];

  return (
    <div style={shell('route')}>
      <PageHead
        eyebrow={'The charts · ' + record + ' cards on the record · ' + graph.edges.length + ' strings · counted from the board'}
        title="The record, counted."
        lede={'The same cards and strings, counted instead of read. Each chart opens with what it shows in one sentence, and every number it draws is in the table beneath it. They count what the board has pinned up, which is one reading of the field, not a census of it: a busy year means the board finds more there, not that a statistician did.'}
        h1Style={pageTitle('index')}
      />

      {/* At a glance: the board's size, the way the rest of the site counts it. */}
      <dl style={{ margin: '34px 0 0', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,150px),1fr))', gap: '18px clamp(16px,3vw,32px)' }}>
        {([
          [record, 'events on the record', FIRST + '–' + NOW],
          [graph.all.length - record, 'scenarios', 'after ' + NOW + ', each with a confidence'],
          [graph.edges.length, 'strings', graph.edges.filter((x) => x.note).length + ' with a case note'],
          [l.total, 'rungs on ' + say(LEADS.length) + ' leads', 'the first in ' + l.first]
        ] as [number, string, string][]).map(([n, label, sub]) => (
          <div key={label} style={{ borderTop: ROW_RULE, paddingTop: 10 }}>
            <dt style={{ ...micro(5), lineHeight: 1.5 }}>{label}</dt>
            <dd style={{ margin: '6px 0 0' }}>
              <span style={{ display: 'block', font: '400 clamp(36px,4.4vw,52px)/1 ' + SERIF, color: INK, letterSpacing: '-0.03em' }}>{n}</span>
              <span style={{ display: 'block', marginTop: 6, font: '400 11.5px/1.5 ' + MONO, color: ink(4) }}>{sub}</span>
            </dd>
          </div>
        ))}
      </dl>

      <JumpNav label="The charts on this page" items={charts.map((c, i) => ({ id: c.id, label: c.title, n: i + 1 }))} style={{ marginTop: 34 }} />

      <ChartSection
        id="pace" n={1} eyebrow={'Cards per year · ' + FIRST + '–' + NOW} title="How fast it moved"
        finding={<>{peakYears.length === 1 ? <>{p.peak.year} alone has</> : <>{peakYears.join(' and ')} each have</>} {p.peak.total} cards, {p.before.cards === p.peak.total ? 'as many as' : 'more than'} the board holds for every year from {FIRST} to {p.before.to} together. {p.since.cards} of its {p.since.of} cards on the record fall in the {sinceYears} years since {p.since.from}.</>}
        how={<>One column per year, scenarios left out. Gold marks the busiest {peakYears.length === 1 ? 'year' : 'years'} ({peakYears.join(' and ')}) and the present, {NOW}, which is not over. The bands behind are the board’s eras, as the archive heads them.</>}
        table={<Table caption="Cards per year" head={['Year', 'Cards', ...THREADS.map((t) => t.label)]} numeric={[1, ...THREADS.map((_, i) => i + 2)]}
          rows={p.rows.filter((r) => r.total).map((r) => [r.year, r.total, ...THREADS.map((t) => r.byThread[t.id] || '')])} />}
      >
        <PaceChart p={p} eras={g.eras} />
      </ChartSection>

      <ChartSection
        id="eras" n={2} eyebrow={'Cards by thread and era · ' + g.eras.length + ' eras'} title="What each era was about"
        finding={<>Before {g.eras[1] ? g.eras[1].year : NOW}, {first.cards} of the {first.of} cards file under {first.thread.label}. Since {g.eras[g.eras.length - 1].year} the largest thread is {last.thread.label}, with {last.cards} of {last.of}{harmRules.first === 0 ? <>; failures and rules, which have no card in the first era, now hold {harmRules.last} between them.</> : <>; failures and rules now hold {harmRules.last} between them, against {harmRules.first} in the first era.</>}</>}
        how={<>Each card counts once, in the thread its category belongs to: {THREADS.map((t: Thread) => t.label).join(', ')}. The darker the square, the fewer the cards; an empty square has none.</>}
        table={<Table caption="Cards by thread and era" head={['Thread', ...g.eras.map((e) => e.range)]} numeric={g.eras.map((_, i) => i + 1)}
          rows={[...g.threads.map((t, ti) => [t.label, ...g.cells[ti]]), ['All threads', ...g.totals]]} />}
      >
        <EraHeat g={g} />
      </ChartSection>

      <ChartSection
        id="harm" n={3} eyebrow={threadLabel(HARM) + ' · ' + threadLabel(RULES) + ' · ' + pair[0].year + '–' + NOW} title="Harm, and the response to it"
        finding={<>Since {pair[0].year} the board has pinned up {pair.reduce((n, r) => n + r.a, 0)} cards of failure and harm and {pair.reduce((n, r) => n + r.b, 0)} of rules and response. Failures peak in {pa.year}, with {pa.count}; rules {pb.year === pa.year ? 'peak the same year' : pb.year > pa.year ? (pb.year - pa.year === 1 ? 'a year later' : (pb.year - pa.year) + ' years later') + ', in ' + pb.year : 'peak earlier, in ' + pb.year}, with {pb.count}.</>}
        how={<>{threadLabel(HARM)} counts the board’s {catLabel('incident').toLowerCase()} cards: failures, harms and systems doing what nobody meant. {threadLabel(RULES)} counts its {catLabel('policy').toLowerCase()} cards: laws, rules and what governments did. A number marks each series’ busiest year.</>}
        table={<Table caption="Failures and rules per year" head={['Year', threadLabel(HARM), threadLabel(RULES)]} numeric={[1, 2]} rows={pair.map((r) => [r.year, r.a, r.b])} />}
      >
        <PairChart rows={pair} colors={[harmHue, rulesHue]} names={[threadLabel(HARM), threadLabel(RULES)]} />
      </ChartSection>

      <ChartSection
        id="strings" n={4} eyebrow={'Years between a string’s two ends · ' + s.measured + ' strings'} title="How long a cause takes"
        finding={<>Half the strings close within {plural(s.median, 'year')}. {lon ? <>The longest runs {lon.gap} years, from {lon.from.title} in {lon.from.year} to {lon.to.title} in {lon.to.year}.</> : null}</>}
        how={<>A string says one event made another possible. These are the {s.measured} of the board’s {s.total} strings with both ends on the record; the {s.total - s.measured} that run into a scenario are left out, since a scenario’s year is a placeholder. Gold marks the middle of the count.</>}
        table={<Table caption="Strings by the years between their ends" head={['Years between', 'Strings']} numeric={[1]} rows={s.bins.map((b) => [b.label, b.edges.length])} />}
        after={
          <div style={{ marginTop: 24 }}>
            <Eyebrow tier="section" dim style={{ marginBottom: 8 }}>The {say(s.longest.length)} longest</Eyebrow>
            <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {s.longest.map((x) => <LongString key={x.edge.id} edge={x.edge} from={x.from} to={x.to} gap={x.gap} />)}
            </ol>
          </div>
        }
      >
        <SpanChart s={s} />
      </ChartSection>

      <ChartSection
        id="ladders" n={5} eyebrow={say(l.ladders.length) + ' leads · ' + l.total + ' rungs'} title="How far up each ladder"
        finding={<>Each lead follows one question up a ladder of cards. Half of their {l.total} rungs come after {l.median}; the first is from {l.first}, and {say(l.scenarios)} {l.scenarios === 1 ? 'is a scenario' : 'are scenarios'} still to come.</>}
        how={<>A dot is a rung: a card the lead says reached a new level. Hollow, dashed dots are scenarios. Time runs as it does on the board, the recent years drawn wider because most of the record is in them. Pick a dot to read the rung; Enter or a click opens it on its lead.</>}
        table={<Table caption="Rungs on each lead" head={['Lead', 'Rung', 'When', 'Level reached']} numeric={[1]}
          rows={l.ladders.flatMap((lad) => lad.rungs.map((r) => [lad.lead.title, r.n, whenOf(r.event) + (r.event.future ? ' (scenario)' : ''), r.label]))} />}
      >
        <LadderChart ladders={l.ladders} />
      </ChartSection>

      <ChartSection
        id="names" n={6} eyebrow="Cards each name is on" title="The names that recur"
        finding={<>{orgs[0] ? <>{orgs[0].entity.label} is on {orgs[0].cards} cards, more than any other organisation; </> : null}{people[0] ? <>{people[0].entity.label} leads the people, on {people[0].cards}.</> : null}</>}
        how={<>A card counts for a name when it tags it or its own words use it. Every name opens its file, with every card it is on.</>}
      >
        <div style={{ display: 'flex', gap: 'clamp(20px,4vw,48px)', flexWrap: 'wrap' }}>
          <NameBars title="Organisations" rows={orgs} hue={205} kind="org" />
          <NameBars title="People" rows={people} hue={85} kind="person" />
        </div>
      </ChartSection>

      <div style={{ borderTop: RULE, marginTop: 56, paddingTop: 24, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ font: '400 11.5px/1.8 ' + MONO, color: ink(4), maxWidth: '60ch', marginRight: 'auto' }}>
          Every count above is made from the board’s own files when the site is built; when a card is added, the charts move.
        </span>
        <Btn to={{ view: 'archive' }}>Every card, in order</Btn>
        <Btn tone="loud" to={{ view: 'board' }}>Open the board →</Btn>
      </div>
    </div>
  );
}

/** One of the longest strings: both ends, the claim between them, the span. */
function LongString({ edge, from, to, gap }: { edge: Edge; from: Event; to: Event; gap: number }) {
  return (
    <li style={{ borderTop: ROW_RULE }}>
      <Link to={{ view: 'board', clue: { from: edge.from, to: edge.to }, category: 'all', query: '' }} className="ix-row" style={{ display: 'flex', gap: '6px 16px', flexWrap: 'wrap', alignItems: 'baseline', padding: '10px 4px' }}>
        <span style={{ flex: '0 0 72px', font: '400 12px/1.5 ' + MONO, color: ink(2), fontVariantNumeric: 'tabular-nums' }}>{gap} years</span>
        <span style={{ flex: '1 1 300px', minWidth: 0, font: '400 15px/1.4 ' + SERIF, color: INK, letterSpacing: '-0.01em' }}>
          <span style={{ font: '400 11px/1 ' + MONO, color: ink(4) }}>{from.year}</span> {from.title}{' '}
          <span style={{ font: '400 10px/1 ' + MONO, letterSpacing: '0.12em', textTransform: 'uppercase', color: STRING_INK }}>{edge.claim} →</span>{' '}
          <span style={{ font: '400 11px/1 ' + MONO, color: ink(4) }}>{to.year}</span> {to.title}
        </span>
      </Link>
    </li>
  );
}

/** A thread's hue: that of the first category filed under it, so a thread's
 *  marks wear the colour its cards' chips do. */
function hueOfThread(thread: string): number {
  const first = CATEGORIES.find((c) => c.thread === thread);
  return first ? first.hue : 250;
}

export default React.memo(ChartsView);
