import React from 'react';
import { NOW, THREADS, buildGraph, forwardLedger } from '../lib/data.js';
import { buildLine } from '../lib/spine.js';
import { LEADS } from '../lib/leads.js';
import { PEOPLE, ORGS, TERMS } from '../lib/files.js';
import { GOLD, MONO, RULE, SANS, SERIF, ink, shell } from '../lib/styles.js';
import { Btn, Door, Doors, Eyebrow } from './kit.jsx';

/* The front page. Every figure on it is derived from the data; the graph is
   read once, at module load, because nothing on this page changes it. */
const graph = buildGraph(null);
const line = buildLine(graph);
const fwd = forwardLedger(graph);
const notes = graph.edges.filter((l) => l.note).length;

/* The four doors: the three readings of the same strings, then the invitation.
   Each title is the page it opens; the body carries the page's own figure. */
const rungs = LEADS.reduce((n, l) => n + l.rungs.length, 0);
const doors = [
  { eyebrow: 'How it got here', title: 'The line', body: line.rows.length + ' findings, oldest first.', to: { view: 'line' } },
  { eyebrow: 'Follow a question', title: 'The leads', body: LEADS.length + ' lines of inquiry, ' + rungs + ' rungs — maths, games, gaming the test, the price of an answer.', to: { view: 'leads' } },
  { eyebrow: 'Where it stands, and why', title: 'The case as it stands', body: fwd.crossing + ' of ' + graph.edges.length + ' strings cross ' + NOW + '.', to: { view: 'case' } },
  { eyebrow: 'What comes next', title: 'The horizon', body: fwd.argued + ' of ' + fwd.total + ' scenarios carry a string.', to: { view: 'horizon' } },
  { eyebrow: 'Every name', title: 'The files', body: PEOPLE.length + ' people, ' + ORGS.length + ' organisations, ' + TERMS.length + ' terms — each with every card it appears on.', to: { view: 'files' } },
  { eyebrow: 'The wall itself', title: 'The board', body: graph.landmarks + ' landmark cards in brief, all ' + graph.all.length + ' in full — photo cards, red string, and a walkthrough of every chain.', to: { view: 'board' } }
];

function Landing() {
  // No footer follows the landing, so it keeps its own, shorter bottom; and it
  // is a hero, not an interior page — the one exception to the 30px head.
  return (
    <div style={{ ...shell('wide'), paddingBottom: 90 }}>
      <header style={{ padding: '112px 0 72px' }}>
        <Eyebrow tier="page" dim style={{ marginBottom: 30 }}>
          {graph.all.length} entries · {graph.edges.length} strings · {notes} case notes
        </Eyebrow>
        <h1 tabIndex={-1} style={{ margin: '0 0 28px', outline: 'none', font: '400 clamp(48px,10vw,150px)/0.9 ' + SERIF, letterSpacing: '-0.035em', maxWidth: '15ch', textWrap: 'balance' }}>
          Everything that led here, <em style={{ color: GOLD }}>where it stands, and what comes next.</em>
        </h1>
        <div style={{ display: 'flex', gap: 44, flexWrap: 'wrap', maxWidth: 940 }}>
          <p style={{ margin: 0, font: '400 16px/1.62 ' + SANS, color: ink(3), maxWidth: '46ch', textWrap: 'pretty' }}>
            Breakthroughs, boardroom coups, lawsuits, breaches and fiction — pinned to a wall
            with the strings between them. Every string is a claim that one event made another
            possible, and {notes} of the {graph.edges.length} carry a written case note. The same
            strings are read three ways: how it got here, where it stands and why, and what they
            argue comes next. Four leads follow one question each through the record, rung by
            rung; the files hold every name. Brief shows the outline; full shows the whole file.
          </p>
          <p style={{ margin: 0, font: '400 11.5px/1.85 ' + MONO, color: ink(5), maxWidth: '34ch', textWrap: 'pretty' }}>
            {THREADS.length} threads run at once — {THREADS.map((t) => t.label).join(' · ')}.
            Everything past {NOW} is a scenario on manila stock — it carries a confidence,
            never a citation.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 12, marginTop: 40, flexWrap: 'wrap' }}>
          <Btn tone="loud" size="hero" to={{ view: 'board' }}>Open the board →</Btn>
          <Btn size="hero" to={{ view: 'leads' }}>Follow a lead</Btn>
          <Btn size="hero" to={{ view: 'line' }}>Read the line</Btn>
          <Btn tone="dim" size="hero" to={{ view: 'archive' }}>Browse the archive</Btn>
        </div>
      </header>

      <div style={{ borderTop: RULE, paddingTop: 30 }}>
        <Doors>
          {doors.map((d) => <Door key={d.title} eyebrow={d.eyebrow} title={d.title} body={d.body} to={d.to} />)}
        </Doors>
      </div>
    </div>
  );
}

// A page re-renders on its own route, not on the header's year ticking over.
export default React.memo(Landing);
