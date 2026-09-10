import React from 'react';
import { CATEGORIES, accent } from '../lib/data.js';
import { INK, MONO, button, micro } from '../lib/styles.js';

const VIEWS = [
  ['board', 'Board'],
  ['plates', 'Plates'],
  ['mosaic', 'Mosaic'],
  ['index', 'Index'],
  ['case', 'The case'],
  ['horizon', 'Horizon'],
  ['about', 'About']
];

export default function Header({ route, navigate, year, progress, status }) {
  return (
    <div data-chrome="header" style={{
      position: 'sticky', top: 0, zIndex: 40, background: 'rgba(10,10,11,0.9)',
      backdropFilter: 'blur(18px) saturate(1.4)', borderBottom: '1px solid rgba(243,240,234,0.1)'
    }}>
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '13px 32px 10px', display: 'flex', flexDirection: 'column', gap: 11 }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 18, flexWrap: 'wrap' }}>
          <button
            onClick={() => navigate({ view: 'landing', id: null, clue: null })}
            style={{ ...micro(1), border: 'none', background: 'none', padding: 0, cursor: 'pointer', letterSpacing: '0.24em' }}
          >
            The AI Timeline
          </button>
          <span style={micro(0.4)}>An investigation board · 1900 — 2050</span>
          <span style={{ flex: 1 }} />
          <span style={micro(0.34)}>{status}</span>
          <span style={{
            font: '500 26px/0.9 ' + "'Instrument Serif', Georgia, serif", letterSpacing: '-0.02em',
            fontVariantNumeric: 'tabular-nums', minWidth: 96, textAlign: 'right',
            color: Number(year) > 2026 ? 'rgba(243,240,234,0.6)' : INK
          }}>{year}</span>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 2, padding: 2, background: 'rgba(243,240,234,0.07)', borderRadius: 2 }}>
            {VIEWS.map(([id, label]) => (
              <button
                key={id}
                onClick={() => navigate({ view: id, id: null, clue: null })}
                aria-current={route.view === id}
                style={{
                  ...micro(route.view === id ? 1 : 0.5), border: 'none', cursor: 'pointer', padding: '6px 12px',
                  borderRadius: 2, letterSpacing: '0.14em',
                  background: route.view === id ? INK : 'transparent',
                  color: route.view === id ? '#0a0a0b' : 'rgba(243,240,234,0.5)'
                }}
              >{label}</button>
            ))}
          </div>

          <div style={{ width: 1, height: 17, background: 'rgba(243,240,234,0.14)' }} />

          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {[{ id: 'all', label: 'All' }, ...CATEGORIES].map((c) => {
              const on = route.category === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => navigate({ category: c.id })}
                  style={{
                    ...micro(on ? 1 : 0.6), padding: '6px 10px', borderRadius: 2, cursor: 'pointer',
                    letterSpacing: '0.14em',
                    border: '1px solid ' + (on ? 'transparent' : 'rgba(243,240,234,0.18)'),
                    background: on ? (c.id === 'all' ? INK : accent(c.id, 0)) : 'transparent',
                    color: on ? '#0a0a0b' : 'rgba(243,240,234,0.6)'
                  }}
                >{c.label}</button>
              );
            })}
          </div>

          <span style={{ flex: 1 }} />
          <input
            value={route.query}
            onChange={(e) => navigate({ query: e.target.value }, true)}
            placeholder="search…"
            aria-label="Search entries"
            style={{
              border: 'none', borderBottom: '1px solid rgba(243,240,234,0.2)', background: 'transparent',
              padding: '5px 2px', width: 150, outline: 'none', color: INK, font: '400 12px/1.2 ' + MONO
            }}
          />
          <a href="https://github.com/mobahug/The_AI_Timeline" target="_blank" rel="noopener" style={button()}>Contribute ↗</a>
        </div>
      </div>
      <div style={{ height: 1, background: 'rgba(243,240,234,0.1)' }}>
        <div style={{ height: 1, width: (progress * 100).toFixed(2) + '%', background: 'oklch(0.82 0.13 85)' }} />
      </div>
    </div>
  );
}
