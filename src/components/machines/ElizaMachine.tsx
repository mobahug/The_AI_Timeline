import React, { useEffect, useRef, useState } from 'react';
import DOCTOR from '../../lib/machines/doctor-1965.txt?raw';
import { Eliza, readScript } from '../../lib/machines/eliza';
import type { Workings } from '../../lib/machines/eliza';
import { machineById } from '../../lib/machines';
import { FADE, GOLD, MONO, button, field, ink } from '../../lib/styles';
import { Btn } from '../kit';
import { label, panel, printout } from './kit';

/* ELIZA in a panel: what you type, what the 1965 DOCTOR script answers, and on
   request how each answer was made — the keyword, the pattern that took the
   sentence apart, the parts, the rule that put them back together, and what
   was put by for later. */

interface Line { who: 'eliza' | 'you'; text: string; workings?: Workings }

const fresh = () => new Eliza(readScript(DOCTOR));
const TRY = machineById.eliza.try || [];

const parts = (ps: string[]) => ps.map((p, i) => (i + 1) + ' ' + (p ? '“' + p + '”' : '—')).join('   ');

/** How one reply was made, in the program's own terms. */
function HowItAnswered({ w }: { w: Workings }) {
  const rows: [string, string][] = [];
  rows.push(['Read', w.words.join(' ') || '—']);
  if (w.from === 'memory') rows.push(['From', 'no keyword, and the counter read 4: a memory came back']);
  else {
    if (w.keystack.length) rows.push(['Keywords', w.keystack.join(' · ')]);
    else rows.push(['Keywords', 'none it knows, so NONE answered']);
    for (const s of w.steps) {
      if (s.outcome === 'link') rows.push([s.keyword, 'hands over to ' + s.to]);
      else if (s.outcome === 'nomatch') rows.push([s.keyword, 'no pattern fitted: one of the four lines built into the program']);
      else if (s.outcome === 'newkey') rows.push([s.keyword, 'gives way to the next keyword']);
      else {
        rows.push([s.keyword, 'pattern (' + (s.pattern || []).join(' ') + ')']);
        rows.push(['Parts', parts(s.parts || [])]);
        rows.push(['Rule', '(' + (s.rule || []).join(' ') + ')']);
      }
    }
  }
  if (w.remembered) rows.push(['Put by', w.remembered]);
  return (
    <dl style={{ margin: '6px 0 2px', padding: '6px 0 6px 12px', borderLeft: '1px dashed rgba(243,240,234,0.28)', display: 'grid', gridTemplateColumns: 'minmax(70px,max-content) minmax(0,1fr)', gap: '3px 12px', animation: FADE }}>
      {rows.map(([k, v], i) => (
        <React.Fragment key={i}>
          <dt style={{ ...label, paddingTop: 2 }}>{k}</dt>
          <dd style={{ margin: 0, font: '400 11.5px/1.5 ' + MONO, color: ink(3), overflowWrap: 'anywhere' }}>{v}</dd>
        </React.Fragment>
      ))}
    </dl>
  );
}

export default function ElizaMachine() {
  const eliza = useRef<Eliza | null>(null);
  if (!eliza.current) eliza.current = fresh();
  const [lines, setLines] = useState<Line[]>(() => [{ who: 'eliza', text: (eliza.current as Eliza).hello() }]);
  const [draft, setDraft] = useState('');
  const [show, setShow] = useState(false);
  const log = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = log.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines.length, show]);

  const send = (text: string) => {
    const said = text.trim();
    if (!said) return;
    const r = (eliza.current as Eliza).reply(said);
    setLines((ls) => [...ls, { who: 'you', text: said }, { who: 'eliza', text: r.text, workings: r.workings }]);
    setDraft('');
  };

  const restart = () => {
    eliza.current = fresh();
    setLines([{ who: 'eliza', text: eliza.current.hello() }]);
    setDraft('');
  };

  const waiting = (eliza.current as Eliza).remembered().length;

  return (
    <div style={{ ...panel, overflow: 'hidden' }}>
      <div
        ref={log}
        role="log"
        aria-label="The conversation with ELIZA"
        style={{ maxHeight: 380, minHeight: 180, overflowY: 'auto', padding: 'clamp(14px,2vw,20px)', display: 'flex', flexDirection: 'column', gap: 10 }}
      >
        {lines.map((l, i) => (
          <div key={i} style={{ animation: i ? FADE : undefined }}>
            {l.who === 'eliza' ? (
              <p style={{ ...printout, margin: 0, textWrap: 'pretty' }}><span className="sr-only">ELIZA: </span>{l.text}</p>
            ) : (
              <p style={{ margin: 0, font: '400 13px/1.6 ' + MONO, color: ink(3), textWrap: 'pretty' }}>
                <span aria-hidden="true" style={{ color: ink(5) }}>&gt; </span><span className="sr-only">You: </span>{l.text}
              </p>
            )}
            {show && l.workings && <HowItAnswered w={l.workings} />}
          </div>
        ))}
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); send(draft); }}
        style={{ borderTop: '1px solid rgba(243,240,234,0.1)', padding: 'clamp(12px,2vw,16px)', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}
      >
        <label htmlFor="eliza-input" className="sr-only">Type to ELIZA</label>
        <input
          id="eliza-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          autoComplete="off"
          spellCheck={false}
          maxLength={240}
          placeholder="Type, then press Enter"
          style={{ ...field, flex: '1 1 220px', minWidth: 0, padding: '9px 10px', font: '400 13px/1.2 ' + MONO }}
        />
        <button type="submit" className="ix ix-btn" data-tone="loud" style={button('loud', 'lg')}>Send</button>
        <Btn size="lg" aria-pressed={show} onClick={() => setShow((s) => !s)}>{show ? 'Hide the workings' : 'Show the workings'}</Btn>
        <Btn size="lg" tone="dim" onClick={restart}>Start again</Btn>
      </form>

      <div style={{ padding: '0 clamp(12px,2vw,16px) clamp(12px,2vw,16px)', display: 'flex', gap: '8px 10px', flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={label}>Try</span>
        {TRY.map((t) => (
          <button key={t} type="button" className="ix ix-btn" onClick={() => send(t)} style={{ ...button('quiet', 'sm'), textTransform: 'none', letterSpacing: '0.02em', font: '400 11.5px/1.2 ' + MONO }}>
            {t}
          </button>
        ))}
        {show && (
          <span style={{ ...label, color: waiting ? GOLD : ink(5), marginLeft: 'auto' }}>
            {waiting ? waiting + (waiting === 1 ? ' memory' : ' memories') + ' put by' : 'Nothing put by yet'}
          </span>
        )}
      </div>
    </div>
  );
}
