import React from 'react';
import {
  ERAS, HORIZONS, NOW, THREADS, accent, catLabel, fade, horizonLedger, forwardLedger
} from '../lib/data.js';
import { INK, MONO, RED, SANS, SERIF, button, micro } from '../lib/styles.js';

/* A ledger row, not a sentence. Label left, value right, nothing implied between. */
const Row = ({ label, children, dim }) => (
  <div style={{ display: 'flex', gap: 14, alignItems: 'baseline', padding: '4px 0' }}>
    <span style={{ ...micro(0.34), flex: 'none', width: 92 }}>{label}</span>
    <span style={{
      font: '400 11.5px/1.6 ' + MONO, color: 'rgba(243,240,234,' + (dim ? 0.4 : 0.72) + ')',
      letterSpacing: '0.02em', textWrap: 'pretty'
    }}>{children}</span>
  </div>
);

const projected = ERAS[ERAS.length - 1];

/**
 * The forward half of the board, read as three horizons. Every count is computed
 * from data/events.json and data/links.json at render; nothing here is written down.
 */
export default function HorizonView({ items, graph, navigate, onOpen }) {
  const visible = items.filter((e) => e.future);
  const board = forwardLedger(graph);
  const filtered = visible.length !== board.total;

  const openCard = (id) => onOpen(id);

  return (
    <div data-year={NOW + 1} style={{ maxWidth: 1400, margin: '0 auto', padding: '30px 32px 80px' }}>
      <header style={{ borderBottom: '1px solid rgba(243,240,234,0.14)', paddingBottom: 26, marginBottom: 8 }}>
        <div style={{ display: 'flex', gap: 44, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <div style={{ flex: 1, minWidth: 320 }}>
            <h1 style={{ margin: '0 0 12px', font: '400 clamp(34px,6vw,72px)/0.94 ' + SERIF, letterSpacing: '-0.03em' }}>
              The horizon
            </h1>
            <p style={{ margin: 0, font: '400 14.5px/1.6 ' + SANS, color: 'rgba(243,240,234,0.55)', maxWidth: '52ch', textWrap: 'pretty' }}>
              {projected.subtitle}
            </p>
          </div>
          <div style={{ flex: 'none', minWidth: 330 }}>
            <Row label="Scenarios">{board.total} entries, {board.span} years past {NOW}</Row>
            <Row label="Strings">
              {board.landing} land on a scenario — {board.crossing} from the record,
              {' '}{board.internal} from another scenario
            </Row>
            <Row label="Argued">{board.argued} carry a string · {board.total - board.argued} are asserted</Row>
            <Row label="Baseline" dim>
              {board.recordUnstrung} of {board.recordTotal} record entries carry no string either —
              being unstrung is the ordinary state here, on both sides of {NOW}
            </Row>
            {filtered && (
              <Row label="Filter">
                showing {visible.length} of {board.total} · the counts below describe the whole board
              </Row>
            )}
          </div>
        </div>
      </header>

      {HORIZONS.map((h) => {
        const led = horizonLedger(graph, h);
        const shown = led.strands.filter((s) => visible.some((v) => v.id === s.event.id));
        if (!shown.length) return null;
        const f = fade(h.from);

        return (
          <section key={h.id} data-year={h.from} style={{ position: 'relative', overflow: 'hidden', paddingTop: 76 }}>
            <div style={{
              position: 'absolute', right: -4, top: 26, font: '400 clamp(72px,13vw,180px)/0.8 ' + SERIF,
              letterSpacing: '-0.05em', color: 'transparent', pointerEvents: 'none',
              WebkitTextStroke: '1px rgba(243,240,234,' + (0.16 - f * 0.09).toFixed(3) + ')'
            }}>{h.from}</div>

            <div style={{
              position: 'relative', display: 'flex', gap: 44, flexWrap: 'wrap',
              borderTop: '1px dashed rgba(243,240,234,0.28)', paddingTop: 22, marginBottom: 30
            }}>
              <div style={{ flex: 1, minWidth: 260 }}>
                <div style={{ ...micro(0.42), letterSpacing: '0.26em', marginBottom: 9 }}>
                  {h.from} — {h.to}
                </div>
                <h2 style={{ margin: 0, font: '400 clamp(28px,4.4vw,54px)/0.96 ' + SERIF, letterSpacing: '-0.03em' }}>
                  {h.label} horizon
                </h2>
              </div>
              <div style={{ flex: 'none', minWidth: 340 }}>
                <Row label="Scenarios">
                  {led.total} — {led.confidence.map((c) => c[0] + ' ' + c[1]).join(' · ')}
                </Row>
                <Row label="Argued">
                  {led.argued} of {led.total} carry a string
                  {led.argued < led.total ? ' · ' + (led.total - led.argued) + ' asserted' : ''}
                </Row>
                <Row label="Reach">
                  {led.reachesBackTo
                    ? 'strings reach back to ' + led.reachesBackTo + ' · the middle one jumps ' + led.medianJump + ' years'
                    : 'no string reaches the record'}
                </Row>
                {led.silentThreads.length > 0 && (
                  <Row label="Silent" dim>
                    nothing here from {led.silentThreads.map((t) => t.label).join(', ')} — no card has been
                    written, which is not the same as a claim that they go quiet
                  </Row>
                )}
              </div>
            </div>

            {THREADS.map((thread) => {
              const group = shown.filter((s) => s.event.thread === thread.id)
                .sort((a, b) => a.event.year - b.event.year);
              if (!group.length) return null;
              return (
                <div key={thread.id} style={{ marginBottom: 4 }}>
                  <div style={{ ...micro(0.4), letterSpacing: '0.22em', padding: '26px 0 6px' }}>{thread.label}</div>
                  {group.map(({ event, strand }) => (
                    <Strand key={event.id} event={event} strand={strand} graph={graph} onOpen={openCard} navigate={navigate} />
                  ))}
                </div>
              );
            })}
          </section>
        );
      })}

      {!visible.length && (
        <div style={{ padding: '120px 0', textAlign: 'center', ...micro(0.4), letterSpacing: '0.14em' }}>
          No scenario matches
        </div>
      )}
    </div>
  );
}

/* One scenario: what was drawn behind it, the card itself, and the arithmetic. */
function Strand({ event, strand, graph, onOpen, navigate }) {
  const f = fade(event.year);
  const why = event.why;

  return (
    <article
      style={{
        display: 'grid', gridTemplateColumns: 'minmax(0,1.05fr) minmax(0,1.25fr) 200px', gap: 30,
        alignItems: 'start', padding: '22px 0',
        borderTop: '1px dashed rgba(243,240,234,0.14)', animation: 'riseIn .45s cubic-bezier(.22,.7,.3,1) both'
      }}
    >
      {/* ── what the board drew behind it ── */}
      <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {strand.parents.length === 0 && (
          <div>
            <div style={{ ...micro(0.62), letterSpacing: '0.2em' }}>No string on the wall</div>
            <p style={{ margin: '9px 0 0', font: '400 13px/1.62 ' + SANS, color: 'rgba(243,240,234,0.5)', maxWidth: '44ch', textWrap: 'pretty' }}>
              {why
                ? 'The board gives a reason on the card, but has drawn nothing connecting it to the record.'
                : 'Asserted, with no reason written down and nothing on the wall behind it.'}
            </p>
          </div>
        )}

        {strand.parents.map((p) => (
          <div key={p.event.id}>
            <button
              type="button"
              onClick={() => onOpen(p.event.id)}
              aria-label={'Open ' + p.event.title + ' on the board'}
              style={{
                display: 'block', width: '100%', textAlign: 'left', border: 'none', background: 'transparent',
                padding: 0, cursor: 'pointer', color: INK
              }}
            >
              <span style={{ ...micro(0.5), marginRight: 8, fontVariantNumeric: 'tabular-nums' }}>{p.event.year}</span>
              <span style={{ font: '400 16px/1.25 ' + SERIF, letterSpacing: '-0.015em' }}>{p.event.title}</span>
              <span style={{ ...micro(0.3), marginLeft: 8 }}>{p.event.future ? 'scenario' : catLabel(p.event.category)}</span>
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '8px 0 0' }}>
              <div style={{ flex: 'none', width: 44, height: 0, borderTop: '1px dashed ' + RED }} />
              <span style={{ ...micro(1), color: 'oklch(0.78 0.16 25)', letterSpacing: '0.1em', textTransform: 'none', font: '400 12px/1.35 ' + MONO }}>
                {p.claim}
              </span>
              <span style={{ ...micro(0.55), border: '1px dashed rgba(243,240,234,0.3)', borderRadius: 2, padding: '3px 6px', flex: 'none' }}>
                {event.confidence}
              </span>
            </div>

            {p.note && (
              <p style={{ margin: '9px 0 0', font: '400 13px/1.62 ' + SANS, color: 'rgba(243,240,234,0.6)', maxWidth: '48ch', textWrap: 'pretty' }}>
                {p.note}
              </p>
            )}
          </div>
        ))}

        {strand.hops > 1 && (
          <Row label="Behind that">
            {strand.hops} hops · {strand.paths} {strand.paths === 1 ? 'path' : 'paths'} · oldest card{' '}
            {strand.roots[0].year} {strand.roots[0].title}
          </Row>
        )}
        {strand.restsOn.map((r) => (
          <Row key={r.id} label="Rests on">
            {r.year} {r.title} — itself a scenario
            {(graph.adjacency[r.id] || []).some((a) => !a.out) ? '' : ', with no string behind it'}
          </Row>
        ))}
        {strand.uncited.map((u) => (
          <Row key={u.id} label="Uncited">
            {u.year} {u.title} sits in this chain and carries no source link
          </Row>
        ))}
      </div>

      {/* ── the card ── */}
      <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 10, opacity: 1 - f * 0.18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', border: '1px solid ' + accent(event.category, f) }} />
          <span style={{ font: '400 26px/1 ' + SERIF, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>{event.year}</span>
          <span style={{ ...micro(1), color: accent(event.category, 0), border: '1px solid ' + accent(event.category, 0.55), borderRadius: 2, padding: '4px 7px' }}>
            {catLabel(event.category)}
          </span>
          <span style={{ ...micro(0.55), border: '1px dashed rgba(243,240,234,0.3)', borderRadius: 2, padding: '4px 7px' }}>
            {event.confidence}
          </span>
        </div>
        <h3 style={{ margin: 0, font: '400 clamp(21px,2.2vw,27px)/1.08 ' + SERIF, letterSpacing: '-0.025em', color: INK, textWrap: 'balance' }}>
          {event.title}
        </h3>
        <p style={{ margin: 0, font: '400 14px/1.6 ' + SANS, color: 'rgba(243,240,234,0.58)', maxWidth: '52ch', textWrap: 'pretty' }}>
          {event.summary}
        </p>
        {why
          ? <p style={{ margin: '2px 0 0', paddingLeft: 12, borderLeft: '1px solid rgba(243,240,234,0.18)', font: '400 13px/1.62 ' + SANS, color: 'rgba(243,240,234,0.66)', maxWidth: '48ch', textWrap: 'pretty' }}>{why}</p>
          : <div style={{ ...micro(0.3), letterSpacing: '0.14em', paddingLeft: 12, borderLeft: '1px solid rgba(243,240,234,0.1)' }}>Reason not written down</div>}
      </div>

      {/* ── the arithmetic ── */}
      <div style={{ flex: 'none', display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Ledger label="Jump" value={strand.jump === null ? '—' : strand.jump + ' yr from ' + strand.parents.filter((p) => !p.event.future)[0].event.year} />
        <Ledger label="Strings" value={strand.parents.length + (strand.restsOn.length ? ' · ' + strand.restsOn.length + ' from a scenario' : '')} />
        <Ledger label="Notes" value={strand.parents.length ? strand.notes + ' of ' + strand.parents.length : '—'} />
        <Ledger label="Source" value={event.url ? event.source || 'linked' : 'none — scenario'} />
        <button
          type="button"
          onClick={() => onOpen(event.id)}
          style={{ ...button(), marginTop: 10, textAlign: 'left' }}
        >Open on the board →</button>
      </div>
    </article>
  );
}

const Ledger = ({ label, value }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, borderBottom: '1px solid rgba(243,240,234,0.08)', padding: '5px 0' }}>
    <span style={micro(0.32)}>{label}</span>
    <span style={{ font: '400 11px/1.4 ' + MONO, color: 'rgba(243,240,234,0.6)', textAlign: 'right' }}>{value}</span>
  </div>
);
