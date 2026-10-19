import React, { useEffect, useState } from 'react';
import type { ComponentType } from 'react';
import type { Machine, MachineKind } from '../lib/types';
import { leadById } from '../lib/leads';
import { dayText, kindLabel } from '../lib/data';
import { INK, MONO, SANS, SERIF, ROW_RULE, STRING_INK, ink, micro } from '../lib/styles';
import { Btn, Eyebrow, Link, Quote, Section } from './kit';
import { Waiting } from './machines/kit';

/* A machine on its card: what it is, the program itself, what is as it was and
   what is not, whose reconstruction it is, and the papers it was rebuilt from.

   The program is fetched when the card is shown, never before, and the page
   is printed without it: the server and the browser's first paint both draw
   the waiting panel, so the page hydrates as it was printed and the program
   takes its place a moment later. */

type Program = ComponentType;
const LOADERS: Record<MachineKind, () => Promise<{ default: Program }>> = {
  eliza: () => import('./machines/ElizaMachine'),
  menace: () => import('./machines/MenaceMachine'),
  shannon: () => import('./machines/ShannonMachine'),
  perceptron: () => import('./machines/PerceptronMachine')
};
const loaded: Partial<Record<MachineKind, Program>> = {};

/** The program, once it has arrived. */
function Slot({ kind }: { kind: MachineKind }) {
  // A page the browser was handed starts from the waiting panel, as the server
  // drew it — nothing has been fetched while it hydrates; a card reached by a
  // link draws a program fetched earlier at once.
  const [Program, setProgram] = useState<Program | null>(() => loaded[kind] || null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let live = true;
    if (loaded[kind]) return;
    LOADERS[kind]().then(
      (m) => { loaded[kind] = m.default; if (live) setProgram(() => m.default); },
      () => { if (live) setFailed(true); }
    );
    return () => { live = false; };
  }, [kind]);
  return Program ? <Program /> : <Waiting failed={failed} />;
}

const List = ({ title, items }: { title: string; items: string[] }) => (
  <div style={{ minWidth: 0 }}>
    <Eyebrow tier="section" dim style={{ marginBottom: 10 }}>{title}</Eyebrow>
    <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 9 }}>
      {items.map((t, i) => (
        <li key={i} style={{ font: '400 14px/1.55 ' + SANS, color: ink(3), paddingLeft: 14, position: 'relative', textWrap: 'pretty' }}>
          <span aria-hidden="true" style={{ position: 'absolute', left: 0, color: ink(5) }}>–</span>{t}
        </li>
      ))}
    </ul>
  </div>
);

export function MachineSection({ machine, embedded }: { machine: Machine; embedded?: boolean }) {
  const lead = machine.lead ? leadById[machine.lead.id] : null;
  const rung = lead && machine.lead ? lead.rungs[machine.lead.rung - 1] : null;

  // Inside the board's panel the program does not run: the panel is narrow and
  // the board is busy. The card's own page runs it.
  if (embedded) {
    return (
      <Section id="machine" eyebrow="Run the original" title={machine.title}>
        <p style={{ margin: '0 0 14px', font: '400 14px/1.6 ' + SANS, color: ink(3), maxWidth: '60ch' }}>{machine.short}</p>
        <Btn tone="loud" to={{ view: 'card', id: machine.event, hash: 'machine' }}>Run it on the card's page →</Btn>
      </Section>
    );
  }

  return (
    <Section id="machine" eyebrow="Run the original" title={machine.title} count="rebuilt from its own papers · runs in your browser">
      <p style={{ margin: '0 0 18px', font: '400 clamp(15px,1.5vw,17px)/1.6 ' + SERIF, color: ink(2), maxWidth: '64ch', textWrap: 'pretty' }}>{machine.lede}</p>

      <Slot key={machine.id} kind={machine.id} />

      <div style={{ marginTop: 26, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: 'clamp(18px,3vw,36px)' }}>
        <List title="As it was" items={machine.kept} />
        <List title="Not as it was" items={machine.changed} />
      </div>

      <p style={{ margin: '22px 0 0', font: '400 11.5px/1.8 ' + MONO, color: ink(4), maxWidth: '72ch', textWrap: 'pretty' }}>{machine.credit}</p>

      <div style={{ marginTop: 18 }}>
        <Eyebrow tier="section" dim style={{ marginBottom: 4 }}>Rebuilt from</Eyebrow>
        {machine.sources.map((s) => (
          <div key={s.url} style={{ padding: '14px 0', borderBottom: ROW_RULE }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
              <span style={{ ...micro(3), border: '1px solid rgba(243,240,234,0.22)', borderRadius: 2, padding: '3px 7px' }}>{kindLabel(s.kind)}</span>
              <span style={{ ...micro(5), letterSpacing: '0.12em' }}>{s.publisher}{s.date ? ' · ' + dayText(s.date) : ''}</span>
            </div>
            <a href={s.url} target="_blank" rel="noopener" className="ix ix-ref" style={{ display: 'inline-block', marginTop: 8, font: '400 16px/1.3 ' + SERIF, color: INK, letterSpacing: '-0.015em', textDecoration: 'none' }}>
              {s.title} ↗
            </a>
            {s.quote && <Quote tone="claim" top={9}>{s.quote}</Quote>}
          </div>
        ))}
      </div>

      {lead && rung && machine.lead && (
        <div style={{ marginTop: 22, borderLeft: '2px solid oklch(0.8 0.12 ' + lead.hue + ')', paddingLeft: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ ...micro(4), color: STRING_INK }}>Then follow it up</span>
          <Link to={{ view: 'lead', id: lead.id, hash: 'rung-' + machine.lead.rung }} className="ix-ref" style={{ font: '400 18px/1.3 ' + SERIF, color: INK }}>
            {lead.title}, rung {machine.lead.rung}: {rung.label} →
          </Link>
        </div>
      )}
    </Section>
  );
}
