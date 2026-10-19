import React from 'react';
import type { Graph, PredictionSource, Route } from '../lib/types';
import { NOW, catLabel, whenOf } from '../lib/data';
import { FORETOLD, PREDICTIONS, predictionInFull, usePredictions, yearOf } from '../lib/predictions';
import { leadById } from '../lib/leads';
import { INK, MONO, SANS, SERIF, RULE, ROW_RULE, DASHED_RULE, badge, ink, micro, shell, pageTitle } from '../lib/styles';
import { Btn, CopyLink, Eyebrow, NavRow, PageHead, Quote, Ref, Section } from './kit';
import { Clock, ClockKey, ForetoldMark, clockWords } from './PredictionKit';

/* One prediction: the words as they were said, the year they named, what the
   record shows happened, quoted, the verdict at length, the cards it touches,
   and what is still not settled. */

const dateText = (iso: string): string => whenOf({ year: Number(iso.slice(0, 4)), date: iso.length > 4 ? iso : undefined });
const KIND: Record<string, string> = { primary: 'Primary', paper: 'Paper', article: 'Article', video: 'Video', podcast: 'Podcast', interview: 'Interview', encyclopedia: 'Encyclopaedia' };

const SourceLine = ({ src }: { src: PredictionSource }) => (
  <a href={src.url} target="_blank" rel="noopener" className="ix ix-ref" style={{ display: 'inline-block', marginTop: 6, paddingLeft: 14, ...micro(5), letterSpacing: '0.1em', textDecoration: 'none' }}>
    {src.publisher} · {dateText(src.date)} ↗
  </a>
);

function PredictionView({ graph, route }: { graph: Graph; route: Route }) {
  // The page is turned to only once the whole file is here (predictions.ts);
  // it draws again if it ever arrives later.
  usePredictions();
  const p = predictionInFull(route.id as string);
  if (!p) {
    return (
      <div style={shell('route')}>
        <div style={{ padding: '80px 0', ...micro(5) }}>There is no prediction “{route.id}”. The board has {PREDICTIONS.length}.</div>
        <Btn to={{ view: 'predictions' }}>← Said in advance</Btn>
      </div>
    );
  }
  const n = PREDICTIONS.findIndex((x) => x.id === p.id);
  const prev = PREDICTIONS[n - 1];
  const next = PREDICTIONS[n + 1];
  const source = (id: string) => p.sources.find((s) => s.id === id);
  const where = source(p.source);
  const leads = p.leads.map((id) => leadById[id]).filter(Boolean);
  const from = Math.min(yearOf(p), p.by, p.came || 9999) - 2;
  const to = Math.max(yearOf(p), p.by, p.came || 0, NOW) + 2;

  const nav = (
    <NavRow
      up={[{ label: 'Said in advance', to: { view: 'predictions' } }]}
      prev={prev && { label: 'Said earlier', to: { view: 'prediction', id: prev.id } }}
      next={next && { label: 'Said later', to: { view: 'prediction', id: next.id } }}
    />
  );

  return (
    <div style={shell('route')}>
      <PageHead
        eyebrow={'Said in advance · ' + p.who + ' · ' + dateText(p.said) + ' · checked ' + dateText(p.checked)}
        title={p.title}
        lede={p.short}
        h1Style={pageTitle('detail')}
      >
        {nav}
      </PageHead>

      <div style={{ marginTop: 28, display: 'flex', alignItems: 'baseline', gap: 14, flexWrap: 'wrap' }}>
        <Eyebrow as="span" tier="section" dim>Verdict</Eyebrow>
        <ForetoldMark verdict={p.verdict} size="lg" />
        <span style={{ font: '400 14px/1.5 ' + SANS, color: ink(3), flex: '1 1 240px', textWrap: 'pretty' }}>{FORETOLD[p.verdict].means}</span>
      </div>

      <Section id="said" eyebrow="As it was said">
        <p style={{ margin: 0, font: 'italic 400 clamp(20px,2.6vw,28px)/1.3 ' + SERIF, letterSpacing: '-0.012em', color: INK, maxWidth: '44ch', textWrap: 'pretty' }}>
          “{p.words}”
        </p>
        <div style={{ ...micro(5), letterSpacing: '0.12em', marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span>{p.who} · {dateText(p.said)}</span>
          {where && (
            <a href={where.url} target="_blank" rel="noopener" className="ix ix-ref" style={{ font: '400 14px/1.35 ' + SERIF, letterSpacing: 0, textTransform: 'none', color: ink(2), textDecoration: 'none', overflowWrap: 'anywhere' }}>
              {where.publisher}, {where.title} ↗
            </a>
          )}
          {p.reported && <span style={{ textTransform: 'none', letterSpacing: '0.04em', font: '400 11.5px/1.6 ' + MONO, color: ink(4) }}>The words as {where ? where.publisher : 'the report'} gives them: quoted from that copy, not from a text of the speaker's own.</span>}
        </div>
        <div style={{ marginTop: 22, maxWidth: 640, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <p style={{ margin: 0, font: '400 12px/1.6 ' + MONO, color: ink(2), fontVariantNumeric: 'tabular-nums' }}>{clockWords(p)}</p>
          <Clock p={p} from={from} to={to} />
          <ClockKey from={from} to={to} />
          <p style={{ margin: 0, font: '400 11.5px/1.6 ' + MONO, color: ink(4), textWrap: 'pretty' }}>
            The year it named comes from “{p.byWords}”.
          </p>
        </div>
      </Section>

      <Section id="happened" eyebrow="What happened" title="On the record since" count={p.evidence.length + (p.evidence.length === 1 ? ' quotation' : ' quotations')}>
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
                <span style={{ ...micro(3), border: '1px solid rgba(243,240,234,0.22)', borderRadius: 2, padding: '3px 7px' }}>{s.id === p.source ? 'Where it was said' : KIND[s.kind] || s.kind}</span>
                <span style={{ ...micro(5), letterSpacing: '0.12em' }}>{s.publisher} · {dateText(s.date)}</span>
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
        <CopyLink label="Copy link to this prediction" size="md" />
      </Section>

      <Section>{nav}</Section>

      <div style={{ borderTop: RULE, marginTop: 30, paddingTop: 22, ...micro(5), letterSpacing: '0.1em', textTransform: 'none', font: '400 11.5px/1.8 ' + MONO, maxWidth: '72ch', color: ink(5) }}>
        Every quotation on this page is verbatim and was matched, character for character, against the page or document it
        links to on {dateText(p.checked)}. A verdict is about the words quoted, not about the person who said them.
      </div>
    </div>
  );
}

export default React.memo(PredictionView);
