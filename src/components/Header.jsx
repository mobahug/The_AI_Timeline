import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { CATEGORIES, FIRST, LAST, NOW, accent } from '../lib/data.js';
import { TABS, tabOf, viewById } from '../lib/views.js';
import { Btn, Link, Segmented } from './kit.jsx';
import { INK, MONO, SERIF, GOLD, ROW_RULE, GUTTER, FADE, ink, micro } from '../lib/styles.js';

/* Three doors. The line is the argument in order; the board is the wall with the
   strings; the archive is everything, dated. Each stretch of the line, the open
   file (the case, the horizon), a card's dossier and the archive's costumes are
   pages under those three, not tabs of their own — the registry says which. */
const DOORS = TABS.map((v) => ({ id: v.id, label: v.label, to: { view: v.id } }));

/** Below this the chrome would eat the screen, so it folds into one row + a sheet. */
const NARROW = 820;
/** Between here and NARROW — a small laptop, a tablet on its side — the chrome
 *  keeps its two rows but sheds the tagline and lets the filter chips scroll
 *  sideways, so neither row ever wraps into a third. */
const MID = 1160;

/** The heading above each block of the sheet. */
const sheetLabel = { ...micro(5, 'section'), margin: '28px 0 8px' };

export default function Header({ route, navigate, year, progress, status }) {
  const activeView = tabOf(route.view);
  const [narrow, setNarrow] = useState(() => (typeof window !== 'undefined' ? window.innerWidth < NARROW : false));
  const [mid, setMid] = useState(() => (typeof window !== 'undefined' ? window.innerWidth < MID : false));
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onResize = () => { setNarrow(window.innerWidth < NARROW); setMid(window.innerWidth < MID); };
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Choosing anything closes the sheet, so the board is never left behind it.
  const close = () => setOpen(false);
  const go = (patch, replace) => { navigate(patch, replace); close(); };

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); };
  }, [open]);

  // A filter is a refinement of the page, not a new page: it replaces the entry.
  const filters = (
    <div style={{
      display: 'flex', gap: 5, minWidth: 0,
      ...(narrow ? { flexWrap: 'wrap' } : mid
        ? { flex: '1 1 0', flexWrap: 'nowrap', overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: 1 }
        : { flexWrap: 'wrap' })
    }}>
      {[{ id: 'all', label: 'All' }, ...CATEGORIES].map((c) => {
        const on = route.category === c.id;
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => go({ category: c.id }, true)}
            style={{
              ...micro(on ? 1 : 4), padding: narrow ? '10px 13px' : '6px 10px', borderRadius: 2, cursor: 'pointer',
              letterSpacing: '0.12em', whiteSpace: 'nowrap',
              border: '1px solid ' + (on ? 'transparent' : 'rgba(243,240,234,0.18)'),
              background: on ? (c.id === 'all' ? INK : accent(c.id, 0)) : 'transparent',
              color: on ? '#0a0a0b' : ink(4)
            }}
          >
            {c.id !== 'all' && (
              <span style={{
                display: 'inline-block', width: 7, height: 7, borderRadius: '50%', marginRight: 6,
                verticalAlign: 'middle', background: accent(c.id, 0),
                border: on ? '1px solid rgba(0,0,0,0.35)' : 'none'
              }} />
            )}
            {c.label}
          </button>
        );
      })}
    </div>
  );

  const search = (
    <input
      value={route.query}
      onChange={(e) => navigate({ query: e.target.value }, true)}
      placeholder="search…"
      aria-label="Search entries"
      style={{
        border: 'none', borderBottom: '1px solid rgba(243,240,234,0.2)', background: 'transparent',
        padding: narrow ? '10px 2px' : '5px 2px', color: INK, font: '400 ' + (narrow ? 15 : 12) + 'px/1.2 ' + MONO,
        // On a desk the field takes what the row leaves, within reason, so the
        // doors, the filter and the search hold one line down to a small laptop.
        ...(narrow ? { width: '100%' } : { flex: '1 1 110px', minWidth: 110, maxWidth: 220 })
      }}
    />
  );

  const contribute = (size) => (
    <Btn size={size} href="https://github.com/mobahug/The_AI_Timeline" target="_blank" rel="noopener">Contribute ↗</Btn>
  );

  return (
    <header data-chrome="header" style={{
      position: 'sticky', top: 0, zIndex: 40, background: 'rgba(10,10,11,0.9)',
      backdropFilter: 'blur(18px) saturate(1.4)', borderBottom: '1px solid rgba(243,240,234,0.1)'
    }}>
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: narrow ? '9px ' + GUTTER + ' 8px' : '13px ' + GUTTER + ' 10px', display: 'flex', flexDirection: 'column', gap: narrow ? 8 : 11 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: narrow ? 10 : 18, flexWrap: narrow || mid ? 'nowrap' : 'wrap' }}>
          <Link to={{ view: 'landing' }} style={{ ...micro(1), letterSpacing: narrow ? '0.16em' : '0.24em', whiteSpace: 'nowrap' }}>
            The AI Timeline
          </Link>
          {!narrow && !mid && <span style={micro(5)}>An investigation board · {FIRST} — {LAST}</span>}
          <span style={{ flex: 1 }} />
          {!narrow && <span style={{ ...micro(5), whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>{status}</span>}
          {/* About and Contribute sit up here with the wordmark, so the row of
              doors and filters below keeps to one line on an ordinary desk. */}
          {!narrow && (
            <Link
              to={{ view: 'about' }}
              aria-current={activeView === 'about' ? 'page' : undefined}
              style={{ ...micro(activeView === 'about' ? 1 : 4), padding: '7px 4px' }}
            >About</Link>
          )}
          {!narrow && contribute()}
          <span style={{
            // Longhands, not the `font` shorthand: this size flips with the
            // breakpoint, and React will not update a shorthand beside a longhand.
            fontFamily: SERIF, fontWeight: 400, fontSize: narrow ? 20 : 26, lineHeight: 0.9, letterSpacing: '-0.02em',
            fontVariantNumeric: 'tabular-nums', minWidth: narrow ? 52 : 96, textAlign: 'right',
            color: Number(year) > NOW ? ink(3) : INK
          }}>{year}</span>
          {narrow && (
            <Btn
              size="lg"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-label={open ? 'Close menu' : 'Open menu'}
            >{open ? 'Close' : 'Menu'}</Btn>
          )}
        </div>

        {!narrow && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <Segmented label="Primary" items={DOORS} value={activeView} />
            <div style={{ width: 1, height: 17, background: 'rgba(243,240,234,0.14)' }} />
            {!mid && <span style={micro(5)}>Category</span>}
            {filters}
            {search}
          </div>
        )}

        {narrow && open && createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            style={{
              position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(10,10,11,0.97)',
              backdropFilter: 'blur(18px)', overflowY: 'auto', overscrollBehavior: 'contain',
              padding: '10px ' + GUTTER + ' calc(24px + env(safe-area-inset-bottom))', display: 'flex', flexDirection: 'column',
              animation: FADE
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 40 }}>
              <span style={{ ...micro(1), letterSpacing: '0.16em' }}>The AI Timeline</span>
              <span style={{ flex: 1 }} />
              <Btn tone="dim" size="lg" onClick={close} aria-label="Close menu">Close</Btn>
            </div>

            <div style={sheetLabel}>Go to</div>
            <nav aria-label="Primary">
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {[...DOORS, { id: 'about', label: viewById.about.label, to: { view: 'about' } }].map((d) => {
                  const on = activeView === d.id;
                  return (
                    <li key={d.id}>
                      <Link
                        to={d.to}
                        onClick={close}
                        aria-current={on ? 'page' : undefined}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 12, minHeight: 50,
                          borderBottom: ROW_RULE, borderLeft: '2px solid ' + (on ? INK : 'transparent'), paddingLeft: 12,
                          font: '400 20px/1.2 ' + SERIF, letterSpacing: '-0.015em', color: on ? INK : ink(3)
                        }}
                      >{d.label}{on && <span style={{ ...micro(5), marginLeft: 'auto' }}>here</span>}</Link>
                    </li>
                  );
                })}
              </ul>
            </nav>

            <div style={sheetLabel}>Show only · category</div>
            {filters}

            <div style={sheetLabel}>Search</div>
            {search}

            <div style={{ marginTop: 'auto', paddingTop: 30, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ font: '400 11px/1.6 ' + MONO, color: ink(5) }}>{status}</span>
              <span style={{ flex: 1 }} />
              {contribute('lg')}
            </div>
          </div>,
          document.body
        )}
      </div>
      <div style={{ height: 1, background: 'rgba(243,240,234,0.1)' }}>
        <div style={{ height: 1, width: (progress * 100).toFixed(2) + '%', background: GOLD }} />
      </div>
    </header>
  );
}
