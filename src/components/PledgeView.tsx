import React from 'react';
import type { Graph, PredictionSource, Route } from '../lib/types';
import { catLabel, dayText, kindLabel } from '../lib/data';
import { PLEDGED, PLEDGES } from '../lib/pledges';
import { leadById } from '../lib/leads';
import { INK, MONO, SANS, SERIF, RULE, ROW_RULE, DASHED_RULE, badge, ink, micro, shell, pageTitle } from '../lib/styles';
import { Btn, CopyLink, Eyebrow, NavRow, PageHead, Quote, Ref, Section } from './kit';
import { PledgeMark, pledgeInFull } from './PledgeKit';

/* One promise: the words as they were given, what the record shows was done,
   quoted, the verdict at length, the cards it touches, and what is still not
   settled. */

const SourceLine = ({ src }: { src: PredictionSource }) => (
  <a href={src.url} target="_blank" rel="noopener" className="ix ix-ref" style={{ display: 'inline-block', marginTop: 6, paddingLeft: 14, ...micro(5), letterSpacing: '0.1em', textDecoration: 'none' }}>
    {src.publisher} · {dayText(src.date)} ↗
  </a>
);

function PledgeView({ graph, route }: { graph: Graph; route: Route }) {
  const p = pledgeInFull(route.id as string);
  if (!p) {
    return (
      <div style={shell('route')}>
        <div style={{ padding: '80px 0', ...micro(5) }}>There is no promise “{route.id}”. The board has {PLEDGES.length}.</div>
        <Btn to={{ view: 'promises' }}>← Promises made</Btn>
      </div>
    );
  }
  const n = PLEDGES.findIndex((x) => x.id === p.id);
  const prev = PLEDGES[n - 1];
  const next = PLEDGES[n + 1];
  const source = (id: string) => p.sources.find((s) => s.id === id);
  const where = source(p.source);
  const leads = p.leads.map((id) => leadById[id]).filter(Boolean);

  const nav = (
    <NavRow
      up={[{ label: 'Promises made', to: { view: 'promises' } }]}
      prev={prev && { label: 'Made earlier', to: { view: 'promise', id: prev.id } }}
      next={next && { label: 'Made later', to: { view: 'promise', id: next.id } }}
    />
  );

  return (
    <div style={shell('route')}>
      <PageHead
        eyebrow={'Promises made · ' + p.who + ' · ' + dayText(p.said) + ' · checked ' + dayText(p.checked)}
        title={p.title}
        lede={p.short}
        h1Style={pageTitle('detail')}
      >
        {nav}
      </PageHead>

      <div style={{ marginTop: 28, display: 'flex', alignItems: 'baseline', gap: 14, flexWrap: 'wrap' }}>
        <Eyebrow as="span" tier="section" dim>Verdict</Eyebrow>
        <PledgeMark verdict={p.verdict} size="lg" />
        <span style={{ font: '400 14px/1.5 ' + SANS, color: ink(3), flex: '1 1 240px', textWrap: 'pretty' }}>
          {PLEDGED[p.verdict].means}{p.settled ? ' Settled on the record on ' + dayText(p.settled) + '.' : ''}
        </span>
      </div>

      <Section id="promised" eyebrow="As it was promised">
        <p style={{ margin: 0, font: 'italic 400 clamp(20px,2.6vw,28px)/1.3 ' + SERIF, letterSpacing: '-0.012em', color: INK, maxWidth: '44ch', textWrap: 'pretty' }}>
          “{p.words}”
        </p>
        <div style={{ ...micro(5), letterSpacing: '0.12em', marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span>{p.who} · {dayText(p.said)}</span>
          {where && (
            <a href={where.url} target="_blank" rel="noopener" className="ix ix-ref" style={{ font: '400 14px/1.35 ' + SERIF, letterSpacing: 0, textTransform: 'none', color: ink(2), textDecoration: 'none', overflowWrap: 'anywhere' }}>
              {where.publisher}, {where.title} ↗
            </a>
          )}
        </div>
        {p.by && (
          <p style={{ margin: '18px 0 0', font: '400 12px/1.6 ' + MONO, color: ink(3), maxWidth: '62ch', textWrap: 'pretty' }}>
            It named a date, {p.by}{p.byWords ? <>, in the words “{p.byWords}”</> : null}.
          </p>
        )}
      </Section>

      <Section id="done" eyebrow="What was done" title="On the record since" count={p.evidence.length + (p.evidence.length === 1 ? ' quotation' : ' quotations')}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {p.evidence.map((q, i) => {
            const src = source(q.source);
            return (
              <div key={i}>
                <Quote tone="claim">{q.quote}</Quote>
                {src && <SourceLine src={src} />}
              </div>
            );
          })}
        </div>
      </Section>

      <Section id="verdict" eyebrow="The verdict">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: '62ch' }}>
          {p.reading.map((para, i) => (
            <p key={i} style={{ margin: 0, font: '400 clamp(16px,1.6vw,18px)/1.6 ' + SERIF, color: ink(2), textWrap: 'pretty' }}>{para}</p>
          ))}
        </div>
      </Section>

      <Section id="record" eyebrow="On the board" title={p.record.length === 1 ? 'The card it touches' : 'The cards it touches'} count={p.record.length + (p.record.length === 1 ? ' card' : ' cards') + ', each with its own sources'}>
        <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {p.record.map((r, i) => {
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
              </li>
            );
          })}
        </ol>
      </Section>

      <Section id="open" eyebrow="Not settled">
        <p style={{ margin: 0, borderTop: DASHED_RULE, paddingTop: 14, font: '400 15px/1.6 ' + SERIF, color: ink(2), maxWidth: '60ch', textWrap: 'pretty' }}>{p.open}</p>
      </Section>

      <Section id="sources" eyebrow="The sources" title="Read them yourself" count={p.sources.length + (p.sources.length === 1 ? ' source' : ' sources')}>
        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {p.sources.map((s) => (
            <li key={s.id} style={{ padding: '14px 0', borderBottom: ROW_RULE }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
                <span style={{ ...micro(3), border: '1px solid rgba(243,240,234,0.22)', borderRadius: 2, padding: '3px 7px' }}>{s.id === p.source ? 'Where it was promised' : kindLabel(s.kind)}</span>
                <span style={{ ...micro(5), letterSpacing: '0.12em' }}>{s.publisher} · {dayText(s.date)}</span>
              </div>
              <a href={s.url} target="_blank" rel="noopener" className="ix ix-ref" style={{ display: 'inline-block', marginTop: 8, font: '400 15px/1.35 ' + SERIF, color: ink(2), textDecoration: 'none', overflowWrap: 'anywhere' }}>{s.title} ↗</a>
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
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      <Section id="share" eyebrow="Share">
        <CopyLink label="Copy link to this promise" size="md" />
      </Section>

      <Section>{nav}</Section>

      <div style={{ borderTop: RULE, marginTop: 30, paddingTop: 22, ...micro(5), letterSpacing: '0.1em', textTransform: 'none', font: '400 11.5px/1.8 ' + MONO, maxWidth: '72ch', color: ink(5) }}>
        Every quotation on this page is verbatim and was matched, character for character, against the page or document it
        links to on {dayText(p.checked)}. A verdict is about the words quoted, not about the people who gave them.
      </div>
    </div>
  );
}

export default React.memo(PledgeView);
