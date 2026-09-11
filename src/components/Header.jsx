import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { CATEGORIES, accent } from '../lib/data.js';
import { INK, MONO, SERIF, SANS, button, micro } from '../lib/styles.js';

const VIEWS = [
  ['line', 'The line'],
  ['board', 'Board'],
  ['plates', 'Plates'],
  ['mosaic', 'Mosaic'],
  ['index', 'Index'],
  ['case', 'The case'],
  ['horizon', 'Horizon'],
  ['about', 'About']
];

/** Below this the chrome would eat the screen, so it folds into one row + a sheet. */
const NARROW = 820;

/** Child routes that belong under a nav tab, so the tab stays lit inside them. */
const PARENT_OF = { finding: 'line', card: 'board' };

export default function Header({ route, navigate, year, progress, status }) {
  const activeView = PARENT_OF[route.view] || route.view;
  const [narrow, setNarrow] = useState(() => (typeof window !== 'undefined' ? window.innerWidth < NARROW : false));
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onResize = () => setNarrow(window.innerWidth < NARROW);
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Choosing anything closes the sheet, so the board is never left behind it.
  const go = (patch) => { navigate(patch); setOpen(false); };

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); };
  }, [open]);

  const views = (
    <div style={{ display: 'flex', gap: 2, padding: 2, background: 'rgba(243,240,234,0.07)', borderRadius: 2, flexWrap: 'wrap' }}>
      {VIEWS.map(([id, label]) => (
        <button
          key={id}
          onClick={() => go({ view: id, id: null, clue: null })}
          aria-current={activeView === id}
          style={{
            ...micro(activeView === id ? 1 : 0.5), border: 'none', cursor: 'pointer', padding: '7px 11px',
            borderRadius: 2, letterSpacing: '0.12em', whiteSpace: 'nowrap',
            background: activeView === id ? INK : 'transparent',
            color: activeView === id ? '#0a0a0b' : 'rgba(243,240,234,0.5)'
          }}
        >{label}</button>
      ))}
    </div>
  );

  const filters = (
    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
      {[{ id: 'all', label: 'All' }, ...CATEGORIES].map((c) => {
        const on = route.category === c.id;
        return (
          <button
            key={c.id}
            onClick={() => go({ category: c.id })}
            style={{
              ...micro(on ? 1 : 0.6), padding: narrow ? '10px 13px' : '6px 10px', borderRadius: 2, cursor: 'pointer',
              letterSpacing: '0.12em', whiteSpace: 'nowrap',
              border: '1px solid ' + (on ? 'transparent' : 'rgba(243,240,234,0.18)'),
              background: on ? (c.id === 'all' ? INK : accent(c.id, 0)) : 'transparent',
              color: on ? '#0a0a0b' : 'rgba(243,240,234,0.6)'
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
        padding: narrow ? '10px 2px' : '5px 2px', width: narrow ? '100%' : 150, outline: 'none', color: INK, font: '400 ' + (narrow ? 15 : 12) + 'px/1.2 ' + MONO
      }}
    />
  );

  return (
    <div data-chrome="header" style={{
      position: 'sticky', top: 0, zIndex: 40, background: 'rgba(10,10,11,0.9)',
      backdropFilter: 'blur(18px) saturate(1.4)', borderBottom: '1px solid rgba(243,240,234,0.1)'
    }}>
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: narrow ? '9px 14px 8px' : '13px 32px 10px', display: 'flex', flexDirection: 'column', gap: narrow ? 8 : 11 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: narrow ? 10 : 18, flexWrap: narrow ? 'nowrap' : 'wrap' }}>
          <button
            onClick={() => go({ view: 'landing', id: null, clue: null })}
            style={{ ...micro(1), border: 'none', background: 'none', padding: 0, cursor: 'pointer', letterSpacing: narrow ? '0.16em' : '0.24em', whiteSpace: 'nowrap' }}
          >
            The AI Timeline
          </button>
          {!narrow && <span style={micro(0.4)}>An investigation board · 1900 — 2050</span>}
          <span style={{ flex: 1 }} />
          {!narrow && <span style={micro(0.34)}>{status}</span>}
          <span style={{
            fontFamily: "'Instrument Serif', Georgia, serif", fontWeight: 500,
            fontSize: (narrow ? 20 : 26) + 'px', lineHeight: 0.9, letterSpacing: '-0.02em',
            fontVariantNumeric: 'tabular-nums', minWidth: narrow ? 52 : 96, textAlign: 'right',
            color: Number(year) > 2026 ? 'rgba(243,240,234,0.6)' : INK
          }}>{year}</span>
          {narrow && (
            <button
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-label={open ? 'Close menu' : 'Open menu'}
              style={{ ...button(), padding: '7px 10px', letterSpacing: '0.1em' }}
            >{open ? 'Close' : 'Menu'}</button>
          )}
        </div>

        {!narrow && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            {views}
            <div style={{ width: 1, height: 17, background: 'rgba(243,240,234,0.14)' }} />
            {filters}
            <span style={{ flex: 1 }} />
            {search}
            <a href="https://github.com/mobahug/The_AI_Timeline" target="_blank" rel="noopener" style={button()}>Contribute ↗</a>
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
              padding: '10px 14px calc(24px + env(safe-area-inset-bottom))', display: 'flex', flexDirection: 'column',
              animation: 'fadeIn .18s both'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 40 }}>
              <span style={{ ...micro(1), letterSpacing: '0.16em' }}>The AI Timeline</span>
              <span style={{ flex: 1 }} />
              <button onClick={() => setOpen(false)} aria-label="Close menu" style={{ ...button(), padding: '9px 12px', letterSpacing: '0.1em' }}>Close</button>
            </div>

            <div style={{ ...micro(0.34), letterSpacing: '0.22em', margin: '26px 0 6px' }}>Go to</div>
            <div role="list" style={{ display: 'flex', flexDirection: 'column' }}>
              {VIEWS.map(([id, label]) => {
                const on = activeView === id;
                return (
                  <button
                    key={id}
                    role="listitem"
                    onClick={() => go({ view: id, id: null, clue: null, finding: null })}
                    aria-current={on}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12, width: '100%', minHeight: 50, textAlign: 'left',
                      background: 'transparent', border: 'none', borderBottom: '1px solid rgba(243,240,234,0.08)',
                      borderLeft: '2px solid ' + (on ? INK : 'transparent'), paddingLeft: 12, cursor: 'pointer',
                      font: '400 20px/1.2 ' + SERIF, letterSpacing: '-0.015em', color: on ? INK : 'rgba(243,240,234,0.7)'
                    }}
                  >{label}{on && <span style={{ ...micro(0.4), marginLeft: 'auto' }}>here</span>}</button>
                );
              })}
            </div>

            <div style={{ ...micro(0.34), letterSpacing: '0.22em', margin: '28px 0 10px' }}>Show only</div>
            {filters}

            <div style={{ ...micro(0.34), letterSpacing: '0.22em', margin: '28px 0 8px' }}>Search</div>
            {search}

            <div style={{ marginTop: 'auto', paddingTop: 30, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ font: '400 11px/1.6 ' + MONO, color: 'rgba(243,240,234,0.36)' }}>{status}</span>
              <span style={{ flex: 1 }} />
              <a href="https://github.com/mobahug/The_AI_Timeline" target="_blank" rel="noopener" style={{ ...button(), padding: '9px 12px' }}>Contribute ↗</a>
            </div>
          </div>,
          document.body
        )}
      </div>
      <div style={{ height: 1, background: 'rgba(243,240,234,0.1)' }}>
        <div style={{ height: 1, width: (progress * 100).toFixed(2) + '%', background: 'oklch(0.82 0.13 85)' }} />
      </div>
    </div>
  );
}
