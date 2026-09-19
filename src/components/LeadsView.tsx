import React from 'react';
import type { Graph, LeadKind } from '../lib/types';
import { LEADS, buildLead } from '../lib/leads';
import { INK, MONO, SANS, SERIF, RULE, ink, micro, shell } from '../lib/styles';
import { Btn, Eyebrow, Link, PageHead } from './kit';

/* The leads: one row per line of inquiry, with its question, its span, and the
   ladder of levels drawn small. Everything counted here is derived from the
   graph; the lead itself only names the rungs. */

const KIND: Record<LeadKind, string> = { capability: 'Capability', failure: 'Failure', economy: 'Economy' };

export interface LeadsViewProps { graph: Graph }

function LeadsView({ graph }: LeadsViewProps) {
  const built = LEADS.map((l) => buildLead(graph, l));
  const rungs = built.reduce((n, b) => n + b.rungs.length, 0);
  return (
    <div style={shell('route')}>
      <PageHead
        eyebrow={'The leads · ' + LEADS.length + ' lines of inquiry · ' + rungs + ' rungs, every one a card'}
        title="Follow a lead."
        lede="A lead is one question followed through the record, rung by rung: how far did machines get at mathematics, at games, at gaming their own tests, and how cheap did an answer become. Each rung is a card on the board; the lead adds the level it reached and the sentence that connects it to the next. Open a lead to read it, or follow it on the board to watch the ladder light up."
        h1Style={{ font: '400 clamp(34px,6vw,72px)/0.98 ' + SERIF, letterSpacing: '-0.035em' }}
      />

      <ol style={{ listStyle: 'none', margin: '40px 0 0', padding: 0 }}>
        {built.map((b, i) => {
          const l = b.lead;
          return (
            <li key={l.id} style={{ borderTop: RULE, padding: 'clamp(22px,3vw,30px) 0' }}>
              <div style={{ display: 'flex', gap: 'clamp(14px,3vw,28px)', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <div style={{ flex: 'none', width: 54 }}>
                  <div style={{ font: '400 clamp(26px,3.4vw,40px)/1 ' + SERIF, color: 'oklch(0.78 0.12 ' + l.hue + ')', fontVariantNumeric: 'tabular-nums' }}>
                    {String(i + 1).padStart(2, '0')}
                  </div>
                </div>
                <div style={{ flex: '1 1 320px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <Eyebrow tier="section">{KIND[l.kind] || l.kind} · {b.span ? b.span.from + ' — ' + b.span.to : ''} · {b.rungs.length} rungs</Eyebrow>
                  <Link to={{ view: 'lead', id: l.id }} className="ix-ref">
                    <h2 style={{ margin: 0, font: '400 clamp(24px,3.2vw,38px)/1.06 ' + SERIF, letterSpacing: '-0.025em', textWrap: 'balance', color: INK }}>{l.title}</h2>
                  </Link>
                  <p style={{ margin: 0, font: '400 clamp(15px,1.5vw,17px)/1.5 ' + SERIF, color: ink(2), maxWidth: '58ch', textWrap: 'pretty', fontStyle: 'italic' }}>{l.question}</p>
                  <p style={{ margin: 0, font: '400 13.5px/1.6 ' + SANS, color: ink(3), maxWidth: '62ch', textWrap: 'pretty' }}>{l.blurb}</p>
                  {/* The ladder, drawn small: every level in order. */}
                  <ol style={{ listStyle: 'none', margin: '6px 0 0', padding: 0, display: 'flex', flexWrap: 'wrap', gap: '6px 0', alignItems: 'center' }}>
                    {b.rungs.map((r, k) => (
                      <li key={r.event} style={{ display: 'inline-flex', alignItems: 'center' }}>
                        <Link
                          to={{ view: 'lead', id: l.id, hash: 'rung-' + r.n }}
                          className="ix-ref"
                          title={r.card.year + ' ' + r.card.title}
                          style={{ ...micro(r.card.future ? 5 : 3), letterSpacing: '0.1em', textTransform: 'none', font: '400 11px/1.3 ' + MONO, padding: '3px 0', borderBottom: r.card.future ? '1px dashed rgba(243,240,234,0.3)' : '1px solid transparent' }}
                        >{r.label}</Link>
                        {k < b.rungs.length - 1 && <span aria-hidden="true" style={{ ...micro(5), padding: '0 7px', color: 'oklch(0.7 0.1 ' + l.hue + ')' }}>›</span>}
                      </li>
                    ))}
                  </ol>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 6 }}>
                    <Btn tone="loud" to={{ view: 'lead', id: l.id }}>Read the lead →</Btn>
                    <Btn to={{ view: 'board', lead: l.id, rung: 1, category: 'all', query: '' }}>Follow on the board</Btn>
                  </div>
                </div>
                <div style={{ flex: '0 1 200px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 7 }}>
                  <Eyebrow tier="section" dim>On the record</Eyebrow>
                  <div style={micro(4)}>{b.record} record · {b.scenarios} {b.scenarios === 1 ? 'scenario' : 'scenarios'}</div>
                  <div style={micro(4)}>{b.strung} of {b.steps.length} steps carry a string</div>
                  <div style={micro(5)}>{b.threads.length} {b.threads.length === 1 ? 'thread' : 'threads'} crossed</div>
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      <div style={{ borderTop: RULE, marginTop: 30, paddingTop: 22, ...micro(5), letterSpacing: '0.1em', textTransform: 'none', font: '400 11.5px/1.8 ' + MONO, maxWidth: '72ch' }}>
        A rung is a level reached, not a cause. Where two rungs are also joined by a string on the board, the
        step carries the string's claim; where they are not, the lead is the only argument, and it says so.
      </div>
    </div>
  );
}

export default React.memo(LeadsView);
