import React from 'react';
import { matches } from '../lib/files';
import { micro, shell } from '../lib/styles';
import { Btn, Link } from './kit';
import type { Graph } from '../lib/types';

/* An address that names no page. The front page follows, but the reader is
   told what missed rather than silently moved, and offered the cards whose
   words the address carries — an old or mistyped address usually still names
   what it was about. */
const NOISE = new Set(['card', 'lead', 'leads', 'person', 'org', 'term', 'line', 'board', 'archive', 'files', 'the', 'and', 'html', 'index']);

export default function Missing({ path, graph }: { path: string; graph: Graph }) {
  const words = path.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2 && !NOISE.has(w));
  const every = words.length ? graph.all.filter((e) => words.every((w) => matches(e, w))) : [];
  const longest = words.slice().sort((a, b) => b.length - a.length)[0];
  const near = (every.length ? every : longest ? graph.all.filter((e) => matches(e, longest)) : []).slice(0, 4);
  return (
    <div style={{ ...shell('wide'), paddingTop: 28 }}>
      <p role="status" style={{ margin: '0 0 12px', ...micro(4), textTransform: 'none', letterSpacing: '0.08em' }}>
        Nothing is filed at /{path}/ — this is the front page.
      </p>
      <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', flexWrap: 'wrap' }}>
        {near.length > 0 && <span style={micro(5)}>Perhaps</span>}
        {near.map((e) => (
          <Link key={e.id} to={{ view: 'card', id: e.id }} className="ix-ref" style={{ ...micro(3), textTransform: 'none', letterSpacing: '0.04em' }}>
            {e.year} {e.title}
          </Link>
        ))}
        <Btn size="sm" tone="dim" to={{ view: 'archive' }}>Browse the archive</Btn>
      </div>
    </div>
  );
}
