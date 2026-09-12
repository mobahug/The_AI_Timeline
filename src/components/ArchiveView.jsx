import React from 'react';
import { SERIF, shell } from '../lib/styles.js';
import IndexView from './IndexView.jsx';
import PlatesView from './PlatesView.jsx';
import MosaicView from './MosaicView.jsx';
import { Empty, PageHead, Segmented } from './kit.jsx';

/* Everything on the board, in date order, under one tab. The three ways of showing
   it — a dense list, image-led plates, the photographs alone — are one dataset in
   three costumes, so they live behind a switch here rather than as three tabs. Each
   costume keeps its own URL (?view=archive | plates | mosaic) so old links hold. */

const MODES = [
  ['archive', 'List'],
  ['plates', 'Plates'],
  ['mosaic', 'Mosaic']
];

function ArchiveView({ mode, items, media, route, navigate }) {
  return (
    <>
      <div style={{ ...shell('wide'), paddingBottom: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '14px 28px', flexWrap: 'wrap' }}>
          <PageHead
            eyebrow={'The archive · ' + items.length + ' ' + (items.length === 1 ? 'entry' : 'entries') + ' · in date order'}
            title="Everything, in the order it happened."
            lede="The filter and search in the header apply here. Open any entry to land on it on the board; the dossier is one step further."
            h1Style={{ font: '400 clamp(30px,5vw,58px)/0.98 ' + SERIF, letterSpacing: '-0.035em' }}
          />
          <span style={{ flex: 1 }} />
          <Segmented label="Shown as" items={MODES.map(([id, label]) => ({ id, label, to: { view: id } }))} value={mode} />
        </div>
      </div>
      {!items.length && <Empty noun="entry" route={route} navigate={navigate} />}
      {items.length > 0 && mode === 'plates' && <PlatesView items={items} media={media} />}
      {items.length > 0 && mode === 'mosaic' && <MosaicView items={items} media={media} />}
      {items.length > 0 && mode === 'archive' && <IndexView items={items} />}
    </>
  );
}

// A page re-renders on its own route, not on the header's year ticking over.
export default React.memo(ArchiveView);
