import React from 'react';
import type { Graph, Route } from '../lib/types';
import { catLabel } from '../lib/data';
import { QUESTIONS, questionById } from '../lib/questions';
import { leadById } from '../lib/leads';
import { GOLD, INK, MONO, SANS, SERIF, RULE, ROW_RULE, DASHED_RULE, badge, ink, micro, shell } from '../lib/styles';
import { Btn, CopyLink, Eyebrow, NavRow, PageHead, Ref, Section } from './kit';

/* One plain question in full: the short answer, the longer one, what it means
   in practice, the cards it rests on, and what the record does not settle. */

export interface QuestionViewProps { graph: Graph; route: Route }

function QuestionView({ graph, route }: QuestionViewProps) {
  const q = questionById[route.id as string];
  if (!q) {
    return (
      <div style={shell('route')}>
        <div style={{ padding: '80px 0', ...micro(5) }}>There is no question “{route.id}”. The board answers {QUESTIONS.length}.</div>
        <Btn to={{ view: 'questions' }}>← Plain questions</Btn>
      </div>
    );
  }
  const n = QUESTIONS.findIndex((x) => x.id === q.id);
  const prev = QUESTIONS[n - 1];
  const next = QUESTIONS[n + 1];
  const leads = q.leads.map((id) => leadById[id]).filter(Boolean);

  const nav = (
    <NavRow
      up={[{ label: 'Plain questions', to: { view: 'questions' } }]}
      // The questions are sentences, too long for a button on a phone: the
      // buttons say which way, and the question itself is one tap away.
      prev={prev && { label: 'Previous question', to: { view: 'question', id: prev.id } }}
      next={next && { label: 'Next question', to: { view: 'question', id: next.id } }}
    />
  );

  return (
    <div style={shell('route')}>
      <PageHead
        eyebrow={'Plain question ' + String(n + 1).padStart(2, '0') + ' of ' + QUESTIONS.length + ' · ' + q.record.length + ' cards on the record'}
        title={q.question}
        lede={q.short}
        h1Style={{ font: '400 clamp(32px,5.6vw,66px)/1 ' + SERIF, letterSpacing: '-0.035em' }}
      >
        {nav}
      </PageHead>

      <Section id="answer" eyebrow="The answer">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: '62ch' }}>
          {q.answer.map((p, i) => (
            <p key={i} style={{ margin: 0, font: '400 clamp(16px,1.6vw,18px)/1.6 ' + SERIF, color: ink(2), textWrap: 'pretty' }}>{p}</p>
          ))}
        </div>
        {q.inPractice && (
          <div style={{ marginTop: 26, borderLeft: '2px solid ' + GOLD, paddingLeft: 14, maxWidth: '60ch' }}>
            <Eyebrow tier="section" style={{ marginBottom: 8, color: GOLD }}>In practice</Eyebrow>
            <p style={{ margin: 0, font: '400 15px/1.6 ' + SANS, color: ink(2), textWrap: 'pretty' }}>{q.inPractice}</p>
          </div>
        )}
      </Section>

      <Section id="record" eyebrow="On the record" title="The cards this rests on" count={q.record.length + ' cards, each with its own sources'}>
        <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {q.record.map((r, i) => {
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
        <p style={{ margin: 0, borderTop: DASHED_RULE, paddingTop: 14, font: '400 15px/1.6 ' + SERIF, color: ink(2), maxWidth: '60ch', textWrap: 'pretty' }}>{q.open}</p>
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
        <CopyLink label="Copy link to this question" size="md" />
      </Section>

      <Section>{nav}</Section>

      <div style={{ borderTop: RULE, marginTop: 30, paddingTop: 22, ...micro(5), letterSpacing: '0.1em', textTransform: 'none', font: '400 11.5px/1.8 ' + MONO, maxWidth: '72ch', color: ink(5) }}>
        This answer explains the record; it is not legal, medical or financial advice. It says only what its cards
        say, and every card carries its own sources. Cards past the present are scenarios, marked as such.
      </div>
    </div>
  );
}

export default React.memo(QuestionView);
