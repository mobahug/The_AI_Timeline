import React from 'react';
import { ERAS, HORIZONS, NOW, THREADS, catLabel, fade, horizonLedger, forwardLedger } from '../lib/data';
import { INK, RED, SANS, SERIF, DASHED_RULE, DASHED_ROW, badge, ink, micro, shell } from '../lib/styles';
import {
  CardTriple, Claim, Empty, Eyebrow, Ledger, NavRow, PageHead, Prose, Reading, Ref, Section
} from './kit';
import type { NavItem } from './kit';
import type { Event, Graph, Route, Strand as StrandOf } from '../lib/types';
import type { Navigate } from '../lib/url';

const projected = ERAS[ERAS.length - 1];

const NAV: { up: NavItem[]; prev: NavItem } = {
  up: [{ label: 'The line', to: { view: 'line' } }],
  prev: { label: 'The case as it stands', to: { view: 'case' } }
};

/**
 * The forward half of the board, read as three horizons. Every count is computed
 * from data/events.json and data/links.json at render; nothing here is written down.
 */
export interface HorizonViewProps {
  items: Event[];
  graph: Graph;
  route: Route;
  navigate: Navigate;
  onOpen: (id: string) => void;
}

function HorizonView({ items, graph, route, navigate, onOpen }: HorizonViewProps) {
  const visible = items.filter((e) => e.future);
  const board = forwardLedger(graph);
  const filtered = visible.length !== board.total;

  return (
    <div data-year={NOW + 1} style={shell('route')}>
      <PageHead
        eyebrow="The open file · what comes next · derived from data/events.json and data/links.json"
        title="The horizon"
        lede={projected.subtitle}
        facts={(
          <>
            <Ledger label="Scenarios">{board.total} entries, {board.span} years past {NOW}</Ledger>
            <Ledger label="Strings">
              {board.landing} land on a scenario — {board.crossing} from the record,
              {' '}{board.internal} from another scenario
            </Ledger>
            <Ledger label="Argued">{board.argued} carry a string · {board.total - board.argued} are asserted</Ledger>
            <Ledger label="Baseline" dim>
              {board.recordUnstrung} of {board.recordTotal} record entries carry no string either —
              being unstrung is the ordinary state here, on both sides of {NOW}
            </Ledger>
            {filtered && (
              <Ledger label="Filter">
                showing {visible.length} of {board.total}
                {visible.length ? ' · the counts below describe the whole board' : ''}
              </Ledger>
            )}
          </>
        )}
      >
        <NavRow up={NAV.up} prev={NAV.prev} style={{ marginBottom: 34 }} />
      </PageHead>

      {HORIZONS.map((h) => {
        const led = horizonLedger(graph, h);
        const shown = led.strands.filter((s) => visible.some((v) => v.id === s.event.id));
        if (!shown.length) return null;
        const f = fade(h.from);

        return (
          <section key={h.id} data-year={h.from} style={{ position: 'relative', overflow: 'hidden', paddingTop: 76 }}>
            <div aria-hidden="true" style={{
              position: 'absolute', right: -4, top: 26, font: '400 clamp(72px,13vw,180px)/0.8 ' + SERIF,
              letterSpacing: '-0.05em', color: 'transparent', pointerEvents: 'none',
              WebkitTextStroke: '1px rgba(243,240,234,' + (0.16 - f * 0.09).toFixed(3) + ')'
            }}>{h.from}</div>

            <div style={{
              position: 'relative', display: 'flex', gap: 44, flexWrap: 'wrap',
              borderTop: DASHED_RULE, paddingTop: 22, marginBottom: 30
            }}>
              <div style={{ flex: '1 1 260px', minWidth: 0 }}>
                <Eyebrow tier="section" style={{ marginBottom: 9 }}>{h.from} — {h.to}</Eyebrow>
                <h2 style={{ margin: 0, font: '400 clamp(28px,4.4vw,54px)/0.96 ' + SERIF, letterSpacing: '-0.03em' }}>
                  {h.label} horizon
                </h2>
              </div>
              <div style={{ flex: '1 1 320px', minWidth: 0 }}>
                <Ledger label="Scenarios">
                  {led.total} — {led.confidence.map((c) => c[0] + ' ' + c[1]).join(' · ')}
                </Ledger>
                <Ledger label="Argued">
                  {led.argued} of {led.total} carry a string
                  {led.argued < led.total ? ' · ' + (led.total - led.argued) + ' asserted' : ''}
                </Ledger>
                <Ledger label="Reach">
                  {led.reachesBackTo
                    ? 'strings reach back to ' + led.reachesBackTo + ' · the middle one jumps ' + led.medianJump + ' years'
                    : 'no string reaches the record'}
                </Ledger>
                {led.silentThreads.length > 0 && (
                  <Ledger label="Silent" dim>
                    nothing here from {led.silentThreads.map((t) => t.label).join(', ')} — no card has been
                    written, which is not the same as a claim that they go quiet
                  </Ledger>
                )}
              </div>
            </div>

            {THREADS.map((thread) => {
              const group = shown.filter((s) => s.event.thread === thread.id)
                .sort((a, b) => a.event.year - b.event.year);
              if (!group.length) return null;
              return (
                <div key={thread.id} style={{ marginBottom: 4 }}>
                  <Eyebrow tier="section" dim style={{ padding: '26px 0 6px' }}>{thread.label}</Eyebrow>
                  {group.map(({ event, strand }) => (
                    <Strand key={event.id} event={event} strand={strand} graph={graph} onOpen={onOpen} />
                  ))}
                </div>
              );
            })}
          </section>
        );
      })}

      {!visible.length && <Empty noun="scenario" route={route} navigate={navigate} />}

      <Section>
        <NavRow up={NAV.up} prev={NAV.prev} />
      </Section>
    </div>
  );
}

/* One scenario: what was drawn behind it, the card itself, and the arithmetic. */
function Strand({ event, strand, graph, onOpen }: { event: Event; strand: StrandOf; graph: Graph; onOpen: (id: string) => void }) {
  const why = event.why;

  return (
    <article
      style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,250px),1fr))', gap: 'clamp(14px,2.4vw,30px)',
        alignItems: 'start', padding: '22px 0', borderTop: DASHED_ROW
      }}
    >
      {/* ── what the board drew behind it ── */}
      <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {strand.parents.length === 0 && (
          <div>
            <Eyebrow tier="section">No string on the wall</Eyebrow>
            <p style={{ margin: '9px 0 0', font: '400 13px/1.62 ' + SANS, color: ink(4), maxWidth: '44ch', textWrap: 'pretty' }}>
              {why
                ? 'The board gives a reason on the card, but has drawn nothing connecting it to the record.'
                : 'Asserted, with no reason written down and nothing on the wall behind it.'}
            </p>
          </div>
        )}

        {strand.parents.map((p) => (
          <div key={p.event.id}>
            <Ref event={p.event} size={16} to={{ view: 'card', id: p.event.id }} />
            <span style={{ ...micro(5), marginLeft: 8 }}>{p.event.future ? 'scenario' : catLabel(p.event.category)}</span>

            {/* The dashed string already points at the card, so the claim carries no arrow. */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '8px 0 0' }}>
              <div style={{ flex: 'none', width: 44, height: 0, borderTop: '1px dashed ' + RED }} />
              <Claim wrap sep="none">{p.claim}</Claim>
              <span style={{ ...badge(), flex: 'none' }}>{event.confidence}</span>
            </div>

            {p.note && (
              <p style={{ margin: '9px 0 0', font: '400 13px/1.62 ' + SANS, color: ink(3), maxWidth: '48ch', textWrap: 'pretty' }}>
                {p.note}
              </p>
            )}
          </div>
        ))}

        {strand.hops > 1 && (
          <Ledger label="Behind that">
            {strand.hops} hops · {strand.paths} {strand.paths === 1 ? 'path' : 'paths'} · oldest card{' '}
            {strand.roots[0].year} {strand.roots[0].title}
          </Ledger>
        )}
        {strand.restsOn.map((r) => (
          <Ledger key={r.id} label="Rests on">
            {r.year} {r.title} — itself a scenario
            {(graph.adjacency[r.id] || []).some((a) => !a.out) ? '' : ', with no string behind it'}
          </Ledger>
        ))}
        {strand.uncited.map((u) => (
          <Ledger key={u.id} label="Uncited">
            {u.year} {u.title} sits in this chain and carries no source link
          </Ledger>
        ))}
      </div>

      {/* ── the card ── */}
      <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* The headline is the way onto the board; the triple never wraps itself, so it sits in the button. */}
        <button
          type="button"
          className="ix ix-ref"
          onClick={() => onOpen(event.id)}
          aria-label={'Open ' + event.title + ' on the board'}
          style={{
            display: 'block', width: '100%', textAlign: 'left', border: 'none', background: 'transparent',
            padding: 0, cursor: 'pointer', color: INK
          }}
        >
          <CardTriple event={event} size="panel" as="h3" />
        </button>
        <Prose style={{ color: ink(4), maxWidth: '52ch' }}>{event.summary}</Prose>
        {why
          ? <Reading event={event} maxWidth="48ch" />
          : <div style={{ ...micro(5), paddingLeft: 14, borderLeft: '2px dashed rgba(243,240,234,0.14)' }}>Reason not written down</div>}
      </div>

      {/* ── the arithmetic ── */}
      <div style={{ flex: 'none', display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Ledger label="Jump" align="right">
          {strand.jump === null ? '—' : strand.jump + ' yr from ' + strand.parents.filter((p) => !p.event.future)[0].event.year}
        </Ledger>
        <Ledger label="Strings" align="right">
          {strand.parents.length + (strand.restsOn.length ? ' · ' + strand.restsOn.length + ' from a scenario' : '')}
        </Ledger>
        <Ledger label="Notes" align="right">{strand.parents.length ? strand.notes + ' of ' + strand.parents.length : '—'}</Ledger>
        <Ledger label="Source" align="right">{event.url ? event.source || 'linked' : 'none — scenario'}</Ledger>
      </div>
    </article>
  );
}

// A page re-renders on its own route, not on the header's year ticking over.
export default React.memo(HorizonView);
