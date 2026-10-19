import React from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { MONO, WELL, ink, micro } from '../../lib/styles';

/* What every machine is drawn in: one panel, the mono face, the board's ink.
   The machines themselves are fetched by the card that runs them; this is the
   little they share with the page that waits for them. */

/** The panel a machine runs in. */
export const panel: CSSProperties = {
  border: '1px solid rgba(243,240,234,0.14)',
  background: WELL,
  borderRadius: 3
};

/** The machine's own printout: mono, upper case where the machine wrote it. */
export const printout: CSSProperties = { font: '400 13px/1.6 ' + MONO, color: ink(1), letterSpacing: '0.02em' };

/** A small label inside a machine: a counter, a control's name. */
export const label: CSSProperties = { ...micro(4), letterSpacing: '0.14em' };

/** The panel as it stands before the program has arrived, or if it cannot. */
export function Waiting({ failed, minHeight = 220, children }: { failed?: boolean; minHeight?: number; children?: ReactNode }) {
  return (
    <div style={{ ...panel, minHeight, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <p role="status" style={{ margin: 0, font: '400 12px/1.7 ' + MONO, color: ink(4), maxWidth: '46ch', textAlign: 'center', textWrap: 'pretty' }}>
        {failed
          ? 'The program could not be fetched. Reload the page to try again.'
          : children || 'The program loads with the page. It runs here, in your browser; nothing you do with it leaves the page.'}
      </p>
    </div>
  );
}
