import React from 'react';
import type { Graph } from '../lib/types';
import { FORETOLD, FORETOLD_ORDER, PREDICTIONS, predictionInFull, usePredictions, yearOf } from '../lib/predictions';
import { NOW, projections } from '../lib/data';
import { INK, MONO, SANS, SERIF, RULE, ROW_RULE, badge, ink, micro, shell, pageTitle } from '../lib/styles';
import { Btn, Eyebrow, Link, Quote, PageHead, Ref, Section } from './kit';
import { Clock, ClockKey, ForetoldMark, spanOf } from './PredictionKit';

/* Said in advance: the predictions people remember about AI, oldest first,
   each with its words, the year it named, and how it went; then the board's
   own forecasts, which carry a confidence rather than a date, and which of
   them the record has already overtaken in part. */

function PredictionsView({ graph }: { graph: Graph }) {
  usePredictions();
  const span = spanOf(PREDICTIONS);
  const counts = FORETOLD_ORDER.map((v) => [v, PREDICTIONS.filter((p) => p.verdict === v).length] as const).filter(([, n]) => n > 0);
  const overtaken = projections.filter((e) => e.early && e.early.length);
  return (
    <div style={shell('route')}>
      <PageHead
        eyebrow={'Said in advance · ' + PREDICTIONS.length + ' predictions · quoted where they were made'}
        title="Said in advance."
        lede="Predictions about AI that people remember and repeat, each quoted from where it was made, given the year it named, and set beside what happened. A prediction is filed here when a named person made it, its words survive where they can be quoted, it names a year or lets one be worked out, and the record can settle it. These are the famous ones, not a fair sample of forecasting, and the boosters' are filed beside the sceptics'."
        h1Style={pageTitle('index')}
      />

      <dl style={{ margin: '34px 0 0', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,200px),1fr))', gap: '14px clamp(16px,3vw,32px)' }}>
        {counts.map(([v, n]) => (
          <div key={v} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <dt style={{ display: 'flex', gap: 10, alignItems: 'center' }}><ForetoldMark verdict={v} /><span style={{ font: '400 13px/1 ' + MONO, color: ink(3), fontVariantNumeric: 'tabular-nums' }}>{n}</span></dt>
            <dd style={{ margin: 0, font: '400 13.5px/1.5 ' + SANS, color: ink(3), textWrap: 'pretty' }}>{FORETOLD[v].means}</dd>
          </div>
        ))}
      </dl>

      <div style={{ marginTop: 30 }}><ClockKey from={span.from} to={span.to} /></div>

      <ol style={{ listStyle: 'none', margin: '18px 0 0', padding: 0 }}>
        {PREDICTIONS.map((p) => {
          const full = predictionInFull(p.id);
          return (
          <li key={p.id} style={{ borderTop: RULE, padding: 'clamp(20px,3vw,28px) 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <ForetoldMark verdict={p.verdict} />
              <span style={{ ...micro(5), letterSpacing: '0.12em' }}>{p.who} · {yearOf(p)} · named {p.by}{p.came ? ' · came ' + p.came : ''}</span>
            </div>
            <Link to={{ view: 'prediction', id: p.id }} className="ix-ref">
              <h2 style={{ margin: 0, font: '400 clamp(22px,3vw,32px)/1.1 ' + SERIF, letterSpacing: '-0.025em', textWrap: 'balance', color: INK }}>{p.title}</h2>
            </Link>
            {full && <Quote tone="claim">{full.words}</Quote>}
            <Clock p={p} from={span.from} to={span.to} />
            <p style={{ margin: 0, font: '400 clamp(14.5px,1.5vw,16px)/1.6 ' + SANS, color: ink(3), maxWidth: '62ch', textWrap: 'pretty' }}>{p.short}</p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginTop: 4 }}>
              <Btn size="sm" tone="loud" to={{ view: 'prediction', id: p.id }}>Read the verdict →</Btn>
              <Eyebrow as="span" dim style={{ ...micro(5) }}>{full ? full.evidence.length + ' quoted on what happened · ' : ''}{p.record.length} {p.record.length === 1 ? 'card' : 'cards'}</Eyebrow>
            </div>
          </li>
          );
        })}
      </ol>

      <Section id="the-board" eyebrow="The board's own" title="Its scenarios, checked against the record" count={projections.length + ' scenarios · ' + overtaken.length + ' overtaken in part'}>
        <p style={{ margin: '0 0 18px', font: '400 clamp(15px,1.5vw,17px)/1.6 ' + SERIF, color: ink(2), maxWidth: '64ch', textWrap: 'pretty' }}>
          The board files {projections.length} scenarios past {NOW}. They carry a confidence, not a date — a scenario's year is a
          placeholder, so none of them can fall due, and none is scored as these predictions are. What the record can do is
          overtake one: bring part of it early. When it does, the scenario keeps its confidence and its year, the card that
          came early is strung to it, and its reading says what it still holds.
        </p>
        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {overtaken.map((e) => (
            <li key={e.id} style={{ borderTop: ROW_RULE, padding: '14px 0', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
                <Ref event={e} size="clamp(17px,2vw,20px)" to={{ view: 'card', id: e.id }} />
                <span style={badge()}>{e.confidence}</span>
              </div>
              <div style={{ display: 'flex', gap: '4px 12px', flexWrap: 'wrap', alignItems: 'baseline', font: '400 12px/1.6 ' + MONO, color: ink(4) }}>
                <span>Came early, in part:</span>
                {(e.early || []).map((id) => graph.index[id] && (
                  <Link key={id} to={{ view: 'card', id }} className="ix-ref" style={{ color: ink(2) }}>{graph.index[id].year} · {graph.index[id].title}</Link>
                ))}
              </div>
            </li>
          ))}
        </ul>
        <div style={{ marginTop: 16, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Btn to={{ view: 'horizon' }}>Every scenario, on the horizon →</Btn>
        </div>
      </Section>

      <div style={{ borderTop: RULE, marginTop: 30, paddingTop: 22, ...micro(5), letterSpacing: '0.1em', textTransform: 'none', font: '400 11.5px/1.8 ' + MONO, maxWidth: '72ch' }}>
        Every quotation here is verbatim, matched character for character against the page or document it links to on the
        day each entry gives. Where the words come from a report rather than the speaker's own text, the entry says so. A
        verdict is about the words quoted, not about the person who said them.
      </div>
    </div>
  );
}

export default React.memo(PredictionsView);
