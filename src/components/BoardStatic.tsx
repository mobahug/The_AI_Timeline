import React from 'react';
import type { Event, Graph, Route } from '../lib/types';
import { THREADS, catLabel } from '../lib/data';
import { INK, MONO, SANS, SERIF, RULE, ROW_RULE, ink, micro, shell } from '../lib/styles';
import { Eyebrow, Link } from './kit';

/* The board without the canvas: every lane as a list, every card a link to its
   dossier. This is what the server renders for /board/ — a crawler reads the
   whole wall as text — and what the reader sees for the moment the real board
   takes to load. */

export interface BoardStaticProps { items: Event[]; graph: Graph; route: Route; loading?: boolean }

export default function BoardStatic({ items, graph, route, loading }: BoardStaticProps) {
  return (
    <div style={{ ...shell('wide'), paddingTop: 22 }} aria-busy={loading ? 'true' : undefined}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, flexWrap: 'wrap', marginBottom: 18 }}>
        <h1 style={{ margin: 0, font: '400 clamp(20px,2.4vw,28px)/1 ' + SERIF, letterSpacing: '-0.02em' }}>The board</h1>
        <span style={micro(5)}>{loading ? 'loading the canvas…' : items.length + ' cards · ' + graph.edges.length + ' strings · listed by thread'}</span>
      </div>
      {!loading && THREADS.map((t) => {
        const lane = items.filter((e) => e.thread === t.id);
        if (!lane.length) return null;
        return (
          <section key={t.id} style={{ borderTop: RULE, padding: '18px 0 26px' }}>
            <Eyebrow tier="section" style={{ marginBottom: 8 }}>{t.label} · {lane.length}</Eyebrow>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {lane.map((e) => (
                <li key={e.id} style={{ borderTop: ROW_RULE }}>
                  <Link to={{ view: 'card', id: e.id }} style={{ display: 'flex', gap: 14, alignItems: 'baseline', padding: '8px 2px', flexWrap: 'wrap' }}>
                    <span style={{ flex: '0 0 48px', font: '400 12px/1.5 ' + MONO, color: ink(4), fontVariantNumeric: 'tabular-nums' }}>{e.year}</span>
                    <span style={{ flex: '1 1 220px', minWidth: 0, font: '400 15px/1.3 ' + SERIF, color: INK }}>{e.title}</span>
                    <span style={{ flex: '2 1 280px', minWidth: 0, font: '400 12px/1.5 ' + SANS, color: ink(4) }}>{e.summary}</span>
                    <span style={{ ...micro(5), flex: 'none' }}>{e.future ? 'scenario' : catLabel(e.category)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
      {loading && <div style={{ height: '60vh' }} />}
    </div>
  );
}
