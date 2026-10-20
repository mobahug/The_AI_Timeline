import React from 'react';
import type { Graph } from '../lib/types';
import { MACHINES } from '../lib/machines';
import { machineInFull } from '../lib/bodies/machines';
import { catLabel, whenOf } from '../lib/data';
import { INK, MONO, SANS, SERIF, RULE, ink, micro, shell, pageTitle } from '../lib/styles';
import { Btn, Eyebrow, Link, PageHead } from './kit';

/* Run the original: the programs on the board that can be run again, each
   rebuilt from its own papers, oldest first. A machine runs on its card, beside
   the record it belongs to; this page is the way to all of them. */

function MachinesView({ graph }: { graph: Graph }) {
  const machines = MACHINES.filter((m) => graph.index[m.event]).sort((a, b) => graph.index[a.event].year - graph.index[b.event].year);
  return (
    <div style={shell('route')}>
      <PageHead
        eyebrow={'Run the original · ' + machines.length + (machines.length === 1 ? ' machine' : ' machines') + ' · rebuilt from their papers'}
        title="The machines, run again."
        lede="Some of the programs on the board were small enough to rebuild. Each one here is made from its own papers — the published description, the printed listing, the rules as their makers wrote them — and runs in your browser, on the card it belongs to. Each says what is as it was and what is not."
        h1Style={pageTitle('index')}
      />

      <ol style={{ listStyle: 'none', margin: '40px 0 0', padding: 0 }}>
        {machines.map((m) => {
          const e = graph.index[m.event];
          const full = machineInFull(m.id);
          return (
            <li key={m.id} style={{ borderTop: RULE, padding: 'clamp(20px,3vw,28px) 0' }}>
              <div style={{ display: 'flex', gap: 'clamp(14px,3vw,28px)', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <div style={{ flex: 'none', width: 74, font: '400 clamp(26px,3.4vw,40px)/1 ' + SERIF, color: ink(4), fontVariantNumeric: 'tabular-nums' }}>{e.year}</div>
                <div style={{ flex: '1 1 320px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <span style={{ ...micro(5), letterSpacing: '0.12em' }}>{e.title} · {catLabel(e.category)} · {whenOf(e)}</span>
                  <Link to={{ view: 'card', id: e.id, hash: 'machine' }} className="ix-ref">
                    <h2 style={{ margin: 0, font: '400 clamp(24px,3.2vw,36px)/1.08 ' + SERIF, letterSpacing: '-0.025em', textWrap: 'balance', color: INK }}>{m.title}</h2>
                  </Link>
                  <p style={{ margin: 0, font: '400 clamp(14.5px,1.5vw,16px)/1.6 ' + SANS, color: ink(3), maxWidth: '62ch', textWrap: 'pretty' }}>{m.short}</p>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginTop: 4 }}>
                    <Btn size="sm" tone="loud" to={{ view: 'card', id: e.id, hash: 'machine' }}>Run it on its card →</Btn>
                    {full && <Eyebrow as="span" dim style={{ ...micro(5) }}>{full.sources.length} {full.sources.length === 1 ? 'source' : 'sources'} · {full.kept.length} things as they were · {full.changed.length} not</Eyebrow>}
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      <div style={{ borderTop: RULE, marginTop: 30, paddingTop: 22, ...micro(5), letterSpacing: '0.1em', textTransform: 'none', font: '400 11.5px/1.8 ' + MONO, maxWidth: '72ch' }}>
        A reconstruction is a reading of its papers, not the machine itself. Where the papers leave something open, the
        machine's card says what was chosen. Nothing you type or play leaves your browser.
      </div>
    </div>
  );
}

export default React.memo(MachinesView);
