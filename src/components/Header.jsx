import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CATEGORIES, FIRST, LAST, NOW, accent } from '../lib/data.js';
import { TABS, tabOf, viewById } from '../lib/views.js';
import { useMode } from '../lib/mode.js';
import { useNarrow } from '../lib/dom.js';
import { Btn, Link, Segmented } from './kit.jsx';
import SearchBox from './Search.jsx';
import { INK, MONO, SERIF, GOLD, ROW_RULE, GUTTER, FADE, ink, micro } from '../lib/styles.js';

/* Five doors. The line is the argument in order; the board is the wall with the
   strings; the leads are the lines of inquiry; the archive is everything, dated;
   the files are every name. Each stretch of the line, the open file (the case,
   the horizon), a card's dossier, a lead, a person and the archive's costumes are
   pages under those five, not tabs of their own — the registry says which. */
const DOORS = TABS.map((v) => ({ id: v.id, label: v.label, to: { view: v.id } }));

/** Below this the chrome would eat the screen, so it folds into one row + a sheet. */
const NARROW = 880;
/** Between here and NARROW — a small laptop, a tablet on its side — the chrome
 *  keeps its two rows but sheds the tagline and lets the filter chips scroll
 *  sideways, so neither row ever wraps into a third. */
const MID = 1260;

/** The brief / full switch. Brief is the outline; full is the whole file. */
function ModeSwitch({ size }) {
  const [mode, setMode] = useMode();
  const items = [['brief', 'Brief'], ['full', 'Full']];
  return (
    <div role="group" aria-label="Detail" title="Brief shows the landmark cards and one quote per card; Full shows every card, string, figure, name and source" style={{ display: 'flex', gap: 2, padding: 2, background: 'rgba(243,240,234,0.07)', borderRadius: 2, flex: 'none' }}>
      {items.map(([id, label]) => {
        const on = mode === id;
        return (
          <button
            key={id}
            type="button"
            className="ix ix-seg"
            aria-pressed={on}
            onClick={() => setMode(id)}
            style={{
              ...micro(on ? 1 : 4), padding: size === 'lg' ? '9px 13px' : '6px 10px', borderRadius: 2, border: 'none', cursor: 'pointer',
              letterSpacing: '0.12em', background: on ? INK : 'transparent', color: on ? '#0a0a0b' : ink(4)
            }}
          >{label}</button>
        );
      })}
    </div>
  );
}

/** The heading above each block of the sheet. */
const sheetLabel = { ...micro(5, 'section'), margin: '28px 0 8px' };

export default function Header({ route, navigate, year, barRef, status, graph }) {
  const activeView = tabOf(route.view);
  // Measured through a store with a server default, so the prerendered page and
  // the first client render agree, and the phone gets its sheet a frame later.
  const narrow = useNarrow(NARROW);
  const mid = useNarrow(MID);
  const [open, setOpen] = useState(false);

  // A focused row must never land under the sticky chrome: the document's
  // scroll padding follows the header's measured height.
  const headerRef = useRef(null);
  useEffect(() => {
    const el = headerRef.current;
    if (!el || !window.ResizeObserver) return;
    const apply = () => { document.documentElement.style.scrollPaddingTop = el.offsetHeight + 8 + 'px'; };
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    apply();
    return () => { ro.disconnect(); document.documentElement.style.scrollPaddingTop = ''; };
  }, []);

  // Choosing anything closes the sheet, so the board is never left behind it.
  const close = () => setOpen(false);
  const go = (patch, replace) => { navigate(patch, replace); close(); };

  // The sheet is modal in fact, not just in name. While it is up the page behind
  // it is inert, focus starts on Close and cycles inside, and closing hands focus
  // back to the Menu button it came from. Keyed on the sheet actually showing —
  // widening the window past NARROW with it open must release the page.
  const sheet = narrow && open;
  const menuBtn = useRef(null);
  const sheetRef = useRef(null);
  useEffect(() => {
    if (!sheet) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const page = document.getElementById('root');
    if (page) page.inert = true;
    const focusable = () => [...(sheetRef.current ? sheetRef.current.querySelectorAll('a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])') : [])];
    const first = focusable()[0];
    if (first) first.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') { setOpen(false); return; }
      if (e.key !== 'Tab') return;
      const items = focusable();
      if (!items.length) return;
      const a = items[0];
      const z = items[items.length - 1];
      if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
      else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      if (page) page.inert = false;
      window.removeEventListener('keydown', onKey);
      if (menuBtn.current) menuBtn.current.focus();
    };
  }, [sheet]);

  // A filter is a refinement of the page, not a new page: it replaces the entry.
  const filters = (
    <div style={{
      display: 'flex', gap: 5, minWidth: 0,
      // On a desk the chips take what the row leaves and scroll sideways past
      // it, so the doors, the filter and the search always hold one line.
      ...(narrow ? { flexWrap: 'wrap' } : { flex: '1 1 0', flexWrap: 'nowrap', overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: 1 })
    }}>
      {[{ id: 'all', label: 'All' }, ...CATEGORIES].map((c) => {
        const on = route.category === c.id;
        return (
          <button
            key={c.id}
            type="button"
            className="ix ix-seg"
            aria-pressed={on}
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
    <SearchBox graph={graph} value={route.query} onChange={(v) => navigate({ query: v }, true)} narrow={narrow} />
  );

  return (
    <header ref={headerRef} data-chrome="header" style={{
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
          {/* About sits up here with the wordmark, so the row of doors and
              filters below keeps to one line on an ordinary desk. */}
          {!narrow && (
            <Link
              to={{ view: 'about' }}
              className="ix-seg"
              aria-current={activeView === 'about' ? 'page' : undefined}
              style={{ ...micro(activeView === 'about' ? 1 : 4), padding: '7px 4px' }}
            >About</Link>
          )}
          {!narrow && <ModeSwitch />}
          <span style={{
            // Longhands, not the `font` shorthand: this size flips with the
            // breakpoint, and React will not update a shorthand beside a longhand.
            fontFamily: SERIF, fontWeight: 400, fontSize: narrow ? 20 : 26, lineHeight: 0.9, letterSpacing: '-0.02em',
            fontVariantNumeric: 'tabular-nums', minWidth: narrow ? 52 : 96, textAlign: 'right',
            color: Number(year) > NOW ? ink(3) : INK
          }}>{year}</span>
          {narrow && (
            <Btn
              ref={menuBtn}
              size="lg"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-label={open ? 'Close menu' : 'Open menu'}
            >{open ? 'Close' : 'Menu'}</Btn>
          )}
        </div>

        {!narrow && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'nowrap', alignItems: 'center', minWidth: 0 }}>
            <Segmented label="Primary" items={DOORS} value={activeView} style={{ flex: 'none', flexWrap: 'nowrap' }} />
            <div style={{ width: 1, height: 17, background: 'rgba(243,240,234,0.14)', flex: 'none' }} />
            {!mid && <span style={{ ...micro(5), flex: 'none' }}>Category</span>}
            {filters}
            {search}
          </div>
        )}

        {sheet && createPortal(
          <div
            ref={sheetRef}
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
                        className="ix-row"
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

            <div style={sheetLabel}>Detail</div>
            <ModeSwitch size="lg" />

            <div style={sheetLabel}>Show only · category</div>
            {filters}

            <div style={sheetLabel}>Search</div>
            {search}

            <div style={{ marginTop: 'auto', paddingTop: 30, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ font: '400 11px/1.6 ' + MONO, color: ink(5) }}>{status}</span>
            </div>
          </div>,
          document.body
        )}
      </div>
      <div style={{ height: 1, background: 'rgba(243,240,234,0.1)' }}>
        <div ref={barRef} style={{ height: 1, width: '0%', background: GOLD }} />
      </div>
    </header>
  );
}
