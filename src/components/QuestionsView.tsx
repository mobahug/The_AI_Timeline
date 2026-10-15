import React from 'react';
import { QUESTIONS } from '../lib/questions';
import { INK, MONO, SANS, SERIF, RULE, ink, micro, shell } from '../lib/styles';
import { Btn, Eyebrow, Link, PageHead } from './kit';

/* The plain questions: what a reader who has never opened the board wants to
   know, each with its short answer. The answers rest on the board's own cards,
   so a question is a way in, not a second record. */

function QuestionsView() {
  const cards = new Set(QUESTIONS.flatMap((q) => q.record.map((r) => r.event))).size;
  return (
    <div style={shell('route')}>
      <PageHead
        eyebrow={'Plain questions · ' + QUESTIONS.length + ' questions · answered from ' + cards + ' cards'}
        title="Start with a question."
        lede="The questions people ask about AI, answered in a few sentences from what the board's cards already say and source. Each answer names the cards it rests on and says what the record does not settle; the leads take it further."
        h1Style={{ font: '400 clamp(34px,6vw,72px)/0.98 ' + SERIF, letterSpacing: '-0.035em' }}
      />

      <ol style={{ listStyle: 'none', margin: '40px 0 0', padding: 0 }}>
        {QUESTIONS.map((q, i) => (
          <li key={q.id} style={{ borderTop: RULE, padding: 'clamp(20px,3vw,28px) 0' }}>
            <div style={{ display: 'flex', gap: 'clamp(14px,3vw,28px)', alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <div style={{ flex: 'none', width: 54, font: '400 clamp(26px,3.4vw,40px)/1 ' + SERIF, color: ink(4), fontVariantNumeric: 'tabular-nums' }}>
                {String(i + 1).padStart(2, '0')}
              </div>
              <div style={{ flex: '1 1 320px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <Link to={{ view: 'question', id: q.id }} className="ix-ref">
                  <h2 style={{ margin: 0, font: '400 clamp(24px,3.2vw,36px)/1.08 ' + SERIF, letterSpacing: '-0.025em', textWrap: 'balance', color: INK }}>{q.question}</h2>
                </Link>
                <p style={{ margin: 0, font: '400 clamp(14.5px,1.5vw,16px)/1.6 ' + SANS, color: ink(3), maxWidth: '62ch', textWrap: 'pretty' }}>{q.short}</p>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginTop: 4 }}>
                  <Btn size="sm" tone="loud" to={{ view: 'question', id: q.id }}>Read the answer →</Btn>
                  <Eyebrow as="span" dim style={{ ...micro(5) }}>{q.record.length} cards on the record</Eyebrow>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ol>

      <div style={{ borderTop: RULE, marginTop: 30, paddingTop: 22, ...micro(5), letterSpacing: '0.1em', textTransform: 'none', font: '400 11.5px/1.8 ' + MONO, maxWidth: '72ch' }}>
        These answers explain the record; they are not legal, medical or financial advice. An answer says only what
        its cards say, and every card carries its own sources.
      </div>
    </div>
  );
}

export default React.memo(QuestionsView);
