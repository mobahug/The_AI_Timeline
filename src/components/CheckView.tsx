import React from 'react';
import type { CheckSource, Graph, Route, Verdict } from '../lib/types';
import { catLabel, dayText } from '../lib/data';
import { CHECKS, VERDICTS, checkById } from '../lib/checks';
import { leadById } from '../lib/leads';
import { CYAN, GOLD, INK, MONO, RED_LIT, SANS, SERIF, RULE, ROW_RULE, DASHED_RULE, badge, ink, micro, shell, pageTitle } from '../lib/styles';
import { Btn, CopyLink, Eyebrow, NavRow, PageHead, Quote, Ref, Section } from './kit';

/* One headline check: what was reported, set line by line beside what the
   primary account says, both quoted; the check at length; the cards it touches
   and what the record does not settle. */

/** A verdict's ink: the scale runs from the string's red to the board's cyan. */
export const verdictInk = (v: Verdict): string =>
  v === 'contradicted' ? RED_LIT : v === 'misleading' ? GOLD : v === 'overtaken' ? ink(2) : CYAN;

/** A verdict as a label in its own ink. */
export const VerdictMark = ({ verdict, size = 'sm' }: { verdict: Verdict; size?: 'sm' | 'lg' }) => (
  <span style={size === 'lg'
    ? { font: '400 clamp(28px,4vw,44px)/1 ' + SERIF, letterSpacing: '-0.025em', color: verdictInk(verdict) }
    : { ...micro(1), color: verdictInk(verdict), border: '1px solid currentColor', borderRadius: 2, padding: '3px 7px', letterSpacing: '0.14em', whiteSpace: 'nowrap' }}>
    {VERDICTS[verdict].label}
  </span>
);

/** Who said it and when, linked to where they said it. */
const Said = ({ src, byline }: { src: CheckSource; byline?: string }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 }}>
    <span style={{ ...micro(5), letterSpacing: '0.12em' }}>{src.publisher}{byline ? ' · ' + byline : ''} · {dayText(src.date)}</span>
    <a href={src.url} target="_blank" rel="noopener" className="ix ix-ref" style={{ font: '400 14px/1.35 ' + SERIF, color: ink(2), textDecoration: 'none', overflowWrap: 'anywhere' }}>
      {src.title} ↗
    </a>
  </div>
);

export interface CheckViewProps { graph: Graph; route: Route }

function CheckView({ graph, route }: CheckViewProps) {
  const c = checkById[route.id as string];
  if (!c) {
    return (
      <div style={shell('route')}>
        <div style={{ padding: '80px 0', ...micro(5) }}>There is no headline check “{route.id}”. The board has {CHECKS.length}.</div>
        <Btn to={{ view: 'checks' }}>← Headline checks</Btn>
      </div>
    );
  }
  const n = CHECKS.findIndex((x) => x.id === c.id);
  const prev = CHECKS[n - 1];
  const next = CHECKS[n + 1];
  const leads = c.leads.map((id) => leadById[id]).filter(Boolean);
  const sourceOf = (id: string) => c.primary.find((p) => p.id === id);

  const nav = (
    <NavRow
      up={[{ label: 'Headline checks', to: { view: 'checks' } }]}
      prev={prev && { label: 'Previous check', to: { view: 'check', id: prev.id } }}
      next={next && { label: 'Next check', to: { view: 'check', id: next.id } }}
    />
  );

  return (
    <div style={shell('route')}>
      <PageHead
        eyebrow={'Headline check' + (CHECKS.length > 1 ? ' ' + String(n + 1).padStart(2, '0') + ' of ' + CHECKS.length : '') + ' · checked ' + dayText(c.checked)}
        title={c.title}
        lede={c.short}
        h1Style={pageTitle('detail')}
      >
        {nav}
      </PageHead>

      <div style={{ marginTop: 28, display: 'flex', alignItems: 'baseline', gap: 14, flexWrap: 'wrap' }}>
        <Eyebrow as="span" tier="section" dim>Verdict</Eyebrow>
        <VerdictMark verdict={c.verdict} size="lg" />
        <span style={{ font: '400 14px/1.5 ' + SANS, color: ink(3), flex: '1 1 240px', textWrap: 'pretty' }}>{VERDICTS[c.verdict].means}</span>
      </div>

      <Section id="reported" eyebrow="As reported">
        <a href={c.reported.url} target="_blank" rel="noopener" className="ix ix-ref" style={{ display: 'inline-block', font: 'italic 400 clamp(20px,2.6vw,28px)/1.2 ' + SERIF, letterSpacing: '-0.015em', color: INK, maxWidth: '40ch', textWrap: 'balance', textDecoration: 'none' }}>
          {c.reported.title} <span style={{ fontStyle: 'normal', fontSize: '0.7em', color: ink(3) }}>↗</span>
        </a>
        <div style={{ ...micro(5), letterSpacing: '0.12em', marginTop: 10 }}>
          {c.reported.publisher}{c.reported.byline ? ' · ' + c.reported.byline : ''} · {dayText(c.reported.date)} · the headline as published
        </div>
      </Section>

      <Section id="line-by-line" eyebrow="Line by line" title="What was reported, and what the source says" count={c.claims.length + ' lines, quoted on both sides'}>
        <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {c.claims.map((claim, i) => (
            <li key={i} style={{ borderTop: i ? ROW_RULE : 'none', padding: '20px 0 22px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
                <span style={{ font: '400 13px/1 ' + MONO, color: ink(4), fontVariantNumeric: 'tabular-nums' }}>{String(i + 1).padStart(2, '0')}</span>
                <VerdictMark verdict={claim.verdict} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: 'clamp(18px,3vw,36px)' }}>
                <div style={{ minWidth: 0 }}>
                  <Eyebrow tier="section" dim style={{ marginBottom: 9 }}>{c.reported.publisher} reported</Eyebrow>
                  <Quote tone="context">{claim.said}</Quote>
                </div>
                <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <Eyebrow tier="section" dim style={{ marginBottom: -5 }}>The primary account</Eyebrow>
                  {claim.primary.map((q, k) => {
                    const src = sourceOf(q.source);
                    return (
                      <div key={k}>
                        <Quote tone="claim">{q.quote}</Quote>
                        {src && (
                          <a href={src.url} target="_blank" rel="noopener" className="ix ix-ref" style={{ display: 'inline-block', marginTop: 6, paddingLeft: 14, ...micro(5), letterSpacing: '0.1em', textDecoration: 'none' }}>
                            {src.publisher} · {dayText(src.date)} ↗
                          </a>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              <p style={{ margin: '16px 0 0', font: '400 15px/1.55 ' + SERIF, color: ink(2), fontStyle: 'italic', maxWidth: '64ch', textWrap: 'pretty' }}>{claim.note}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section id="check" eyebrow="The check">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: '62ch' }}>
          {c.reading.map((p, i) => (
            <p key={i} style={{ margin: 0, font: '400 clamp(16px,1.6vw,18px)/1.6 ' + SERIF, color: ink(2), textWrap: 'pretty' }}>{p}</p>
          ))}
        </div>
      </Section>

      <Section id="record" eyebrow="On the board" title={c.record.length === 1 ? 'The card it touches' : 'The cards it touches'} count={c.record.length + (c.record.length === 1 ? ' card' : ' cards') + ', each with its own sources'}>
        <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {c.record.map((r, i) => {
            const e = graph.index[r.event];
            if (!e) return null;
            return (
              <li key={r.event} style={{ borderTop: i ? ROW_RULE : 'none', padding: '16px 0', display: 'flex', flexDirection: 'column', gap: 7 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
                  <Ref event={e} size="clamp(17px,2vw,21px)" to={{ view: 'card', id: e.id }} />
                  <span style={micro(5)}>{catLabel(e.category)}</span>
                  {e.confidence && <span style={badge()}>Scenario · {e.confidence}</span>}
                </div>
                <p style={{ margin: 0, font: '400 15px/1.5 ' + SERIF, color: ink(2), fontStyle: 'italic' }}>{r.note}</p>
                <p style={{ margin: 0, font: '400 13.5px/1.55 ' + SANS, color: ink(4), maxWidth: '62ch', textWrap: 'pretty' }}>{e.summary}</p>
              </li>
            );
          })}
        </ol>
      </Section>

      <Section id="open" eyebrow="Not settled">
        <p style={{ margin: 0, borderTop: DASHED_RULE, paddingTop: 14, font: '400 15px/1.6 ' + SERIF, color: ink(2), maxWidth: '60ch', textWrap: 'pretty' }}>{c.open}</p>
      </Section>

      <Section id="sources" eyebrow="The sources" title="Read them yourself" count={1 + c.primary.length + ' sources'}>
        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {[{ ...c.reported, kind: 'Reported' }, ...c.primary.map((p) => ({ ...p, kind: 'Primary', byline: undefined }))].map((s) => (
            <li key={s.url} style={{ padding: '14px 0', borderBottom: ROW_RULE }}>
              <span style={{ ...micro(3), border: '1px solid rgba(243,240,234,0.22)', borderRadius: 2, padding: '3px 7px' }}>{s.kind}</span>
              <Said src={s} byline={s.byline} />
            </li>
          ))}
        </ul>
      </Section>

      {leads.length > 0 && (
        <Section id="further" eyebrow="Follow it further">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {leads.map((l) => (
              <div key={l.id} style={{ display: 'flex', flexDirection: 'column', gap: 8, borderLeft: '2px solid oklch(0.8 0.12 ' + l.hue + ')', paddingLeft: 14 }}>
                <span style={{ font: '400 clamp(19px,2.2vw,24px)/1.1 ' + SERIF, color: INK, letterSpacing: '-0.02em' }}>{l.title}</span>
                <span style={{ font: '400 14.5px/1.5 ' + SERIF, color: ink(3), fontStyle: 'italic', maxWidth: '58ch' }}>{l.question}</span>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <Btn size="sm" tone="loud" to={{ view: 'lead', id: l.id }}>Read the lead →</Btn>
                  <Btn size="sm" to={{ view: 'board', lead: l.id, rung: 1, category: 'all', query: '' }}>Follow on the board</Btn>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      <Section id="share" eyebrow="Share">
        <CopyLink label="Copy link to this check" size="md" />
      </Section>

      <Section>{nav}</Section>

      <div style={{ borderTop: RULE, marginTop: 30, paddingTop: 22, ...micro(5), letterSpacing: '0.1em', textTransform: 'none', font: '400 11.5px/1.8 ' + MONO, maxWidth: '72ch', color: ink(5) }}>
        A check sets a report beside the primary account it rests on. Every quotation on this page is verbatim and was
        matched, character for character, against the page it links to on {dayText(c.checked)}. A verdict is about
        the words quoted, not about the reporter or the publication.
      </div>
    </div>
  );
}

export default React.memo(CheckView);
