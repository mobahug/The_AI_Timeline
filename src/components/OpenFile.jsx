import React from 'react';
import { NOW, forwardLedger } from '../lib/data.js';
import { Door, Doors, Section } from './kit.jsx';
import { CASE_LEDE } from './CaseView.jsx';

/* The open file. The line ends at the present, and past that the board holds two
   pages rather than more findings: where the case stands, and what it argues comes
   next. Both are derived from the same data; the numbers here are the same ones the
   pages open with. */

export default function OpenFile({ graph }) {
  const fwd = forwardLedger(graph);
  const doors = [
    {
      to: { view: 'case' },
      eyebrow: 'Where it stands',
      title: 'The case as it stands',
      body: CASE_LEDE,
      figure: fwd.crossing + ' of ' + graph.edges.length + ' strings cross ' + NOW
    },
    {
      to: { view: 'horizon' },
      eyebrow: 'What comes next',
      title: 'The horizon',
      body: 'Every entry past ' + NOW + ' as three horizons — scenarios with a confidence, never a citation — and the strings, if any, that argue for each.',
      figure: fwd.argued + ' of ' + fwd.total + ' scenarios carry a string'
    }
  ];

  return (
    <Section eyebrow="The open file · two pages">
      <Doors>
        {doors.map((d) => <Door key={d.to.view} {...d} />)}
      </Doors>
    </Section>
  );
}
