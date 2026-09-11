import React from 'react';
import { INK, MONO, SERIF, micro } from '../lib/styles.js';
import IndexView from './IndexView.jsx';
import PlatesView from './PlatesView.jsx';
import MosaicView from './MosaicView.jsx';

/* Everything on the board, in date order, under one tab. The three ways of showing
   it — a dense list, image-led plates, the photographs alone — are one dataset in
   three costumes, so they live behind a switch here rather than as three tabs. Each
   costume keeps its own URL (?view=archive | plates | mosaic) so old links hold. */

const MODES = [
  ['archive', 'List'],
  ['plates', 'Plates'],
  ['mosaic', 'Mosaic']
];

export default function ArchiveView({ mode, items, media, navigate, onOpen }) {
  return (
    <>
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '30px clamp(14px,4vw,32px) 0' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '14px 28px', flexWrap: 'wrap' }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ ...micro(0.4), letterSpacing: '0.24em', marginBottom: 12 }}>
              The archive · {items.length} {items.length === 1 ? 'entry' : 'entries'} · in date order
            </div>
            <h1 style={{ margin: 0, font: '400 clamp(30px,5vw,58px)/0.98 ' + SERIF, letterSpacing: '-0.035em', textWrap: 'balance' }}>
              Everything, in the order it happened.
            </h1>
          </div>
          <span style={{ flex: 1 }} />
          <div role="tablist" aria-label="Shown as" style={{ display: 'flex', gap: 2, padding: 2, background: 'rgba(243,240,234,0.07)', borderRadius: 2 }}>
            {MODES.map(([id, label]) => {
              const on = mode === id;
              return (
                <button
                  key={id}
                  role="tab"
                  aria-selected={on}
                  onClick={() => navigate({ view: id, id: null, clue: null, finding: null })}
                  style={{
                    ...micro(on ? 1 : 0.5), border: 'none', cursor: 'pointer', padding: '7px 12px',
                    borderRadius: 2, letterSpacing: '0.12em', whiteSpace: 'nowrap',
                    background: on ? INK : 'transparent', color: on ? '#0a0a0b' : 'rgba(243,240,234,0.5)'
                  }}
                >{label}</button>
              );
            })}
          </div>
        </div>
        <p style={{ margin: '14px 0 0', font: '400 11.5px/1.75 ' + MONO, color: 'rgba(243,240,234,0.42)', maxWidth: '70ch', textWrap: 'pretty' }}>
          The filter and search in the header apply here. Open any entry to land on it on the board;
          the dossier is one step further.
        </p>
      </div>
      {mode === 'plates' && <PlatesView items={items} media={media} onOpen={onOpen} />}
      {mode === 'mosaic' && <MosaicView items={items} media={media} onOpen={onOpen} />}
      {mode === 'archive' && <IndexView items={items} onOpen={onOpen} />}
    </>
  );
}
