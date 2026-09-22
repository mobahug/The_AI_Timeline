import React, { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { createPortal } from 'react-dom';
import { CATEGORIES, FIRST, LAST, NOW, accent } from '../lib/data';
import { TABS, tabOf, viewById } from '../lib/views';
import { useMode } from '../lib/mode';
import { useMatch } from '../lib/dom';
import { Btn, Link, Segmented } from './kit';
import SearchBox from './Search';
import { INK, MONO, SERIF, GOLD, ROW_RULE, GUTTER, FADE, ink, micro } from '../lib/styles';
import type { Graph, Mode, Route, RoutePatch } from '../lib/types';
import type { Navigate } from '../lib/url';
import type { SegmentItem } from './kit';

/* Five doors. The line is the argument in order; the board is the wall with the
   strings; the leads are the lines of inquiry; the archive is everything, dated;
   the files are every name. Each stretch of the line, the open file (the case,
   the horizon), a card's dossier, a lead, a person and the archive's costumes are
   pages under those five, not tabs of their own — the registry says which. */
const DOORS: SegmentItem[] = TABS.map((v) => ({ id: v.id, label: v.label, to: { view: v.id } }));

/* Both chromes are in the document at once and CSS chooses between them, so the
   page the server sends is already the page the reader gets: no width is
   measured, nothing is swapped after hydration, and the header does not change
   height under the first paragraph. The two breakpoints live in base.css —
   .chrome-narrow / .chrome-desk at 880, and .wide-only plus .chrome-doors at
   1260, where the chrome sheds its tagline and lets the chips scroll sideways
   rather than wrap into a third row.

   The one width the script still asks about is the sheet's: it is a modal
   portalled outside both wrappers, and widening the window past the breakpoint
   with it up must release the page. That query is the same string as the CSS
   rule — a fractional width must not leave the Menu button visible and dead. */
const PHONE_Q = '(max-width: 879.98px)';

/** The brief / full switch. Brief is the outline; full is the whole file. */
function ModeSwitch({ size }: { size?: 'lg' | 'md' }) {
  const [mode, setMode] = useMode();
  const items: [Mode, string][] = [['brief', 'Brief'], ['full', 'Full']];
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

export interface HeaderProps {
  route: Route;
  navigate: Navigate;
  year: string;
  barRef: RefObject<HTMLDivElement>;
  status: string;
  graph: Graph;
}

export default function Header({ route, navigate, year, barRef, status, graph }: HeaderProps) {
  const activeView = tabOf(route.view);
  // Only the sheet asks, and only about itself — see PHONE_Q.
  const phone = useMatch(PHONE_Q);
  const [open, setOpen] = useState(false);

  // A focused row must never land under the sticky chrome: the document's
  // scroll padding follows the header's measured height.
  const headerRef = useRef<HTMLElement>(null);
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
  const go = (patch: RoutePatch, replace?: boolean) => { navigate(patch, replace); close(); };

  // The sheet is modal in fact, not just in name. While it is up the page behind
  // it is inert, focus starts on Close and cycles inside, and closing hands focus
  // back to the Menu button it came from. Keyed on the sheet actually showing —
  // widening the window past the breakpoint with it open must release the page.
  const sheet = phone && open;
  const menuBtn = useRef<HTMLElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!sheet) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const page = document.getElementById('root');
    if (page) page.inert = true;
    const focusable = () => [...(sheetRef.current ? sheetRef.current.querySelectorAll<HTMLElement>('a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])') : [])];
    const first = focusable()[0];
    if (first) first.focus();
    const onKey = (e: KeyboardEvent) => {
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

  /* A filter is a refinement of the page, not a new page: it replaces the entry.
     The chips are built twice — once for the desk row, once for the sheet — and
     the difference between them is settled here, at the call site, rather than
     by a width the script has to measure. */
  const filtersFor = (place: 'desk' | 'sheet') => (
    <div style={{
      display: 'flex', gap: 5, minWidth: 0,
      // On a desk the chips take what the row leaves and scroll sideways past
      // it, so the doors, the filter and the search always hold one line.
      ...(place === 'sheet'
        ? { flexWrap: 'wrap' as const }
        : { flex: '1 1 0', flexWrap: 'nowrap' as const, overflowX: 'auto' as const, scrollbarWidth: 'none' as const, paddingBottom: 1 })
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
              ...micro(on ? 1 : 4), padding: place === 'sheet' ? '12px 14px' : '6px 10px', borderRadius: 2, cursor: 'pointer',
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

  /* Both fields are in the document; only one of them is ever on screen. They
     carry different ids so the two listboxes cannot claim the same one, and the
     shortcut only answers the field a reader can actually see. */
  const searchFor = (place: 'desk' | 'sheet') => (
    <SearchBox
      id={'search-' + place}
      graph={graph}
      value={route.query}
      onChange={(v) => navigate({ query: v }, true)}
      narrow={place === 'sheet'}
    />
  );

  const wordmark = (spaced: string) => (
    <Link to={{ view: 'landing' }} style={{ ...micro(1), letterSpacing: spaced, whiteSpace: 'nowrap' }}>
      The AI Timeline
    </Link>
  );

  const yearMark = (place: 'desk' | 'narrow') => (
    <span style={{
      // Longhands, not the `font` shorthand: the two chromes set different
      // sizes, and React will not update a shorthand beside a longhand.
      fontFamily: SERIF, fontWeight: 400, fontSize: place === 'desk' ? 26 : 20, lineHeight: 0.9, letterSpacing: '-0.02em',
      fontVariantNumeric: 'tabular-nums', minWidth: place === 'desk' ? 96 : 52, textAlign: 'right',
      color: Number(year) > NOW ? ink(3) : INK
    }}>{year}</span>
  );

  return (
    <header ref={headerRef} data-chrome="header" style={{
      position: 'sticky', top: 0, zIndex: 40, background: 'rgba(10,10,11,0.9)',
      backdropFilter: 'blur(18px) saturate(1.4)', borderBottom: '1px solid rgba(243,240,234,0.1)'
    }}>
      {/* ── the narrow chrome: one row and a way into the sheet ── */}
      <div className="chrome chrome-narrow" style={{ maxWidth: 1400, margin: '0 auto', padding: '9px ' + GUTTER + ' 8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'nowrap' }}>
          {wordmark('0.16em')}
          <span style={{ flex: 1 }} />
          {yearMark('narrow')}
          <Btn
            ref={menuBtn}
            size="lg"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label={open ? 'Close menu' : 'Open menu'}
          >{open ? 'Close' : 'Menu'}</Btn>
        </div>
      </div>

      {/* ── the desk chrome: the wordmark's row, then the doors' ── */}
      <div className="chrome chrome-desk" style={{ maxWidth: 1400, margin: '0 auto', padding: '13px ' + GUTTER + ' 10px', flexDirection: 'column', gap: 11 }}>
        <div className="chrome-row1" style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          {wordmark('0.24em')}
          <span className="wide-only" style={micro(5)}>An investigation board · {FIRST} — {LAST}</span>
          <span style={{ flex: 1 }} />
          <span style={{ ...micro(5), whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>{status}</span>
          {/* About sits up here with the wordmark, so the row of doors and
              filters below keeps to one line on an ordinary desk. */}
          <Link
            to={{ view: 'about' }}
            className="ix-seg"
            aria-current={activeView === 'about' ? 'page' : undefined}
            style={{ ...micro(activeView === 'about' ? 1 : 4), padding: '7px 4px' }}
          >About</Link>
          <ModeSwitch />
          {yearMark('desk')}
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'nowrap', alignItems: 'center', minWidth: 0 }}>
          <Segmented label="Primary" items={DOORS} value={activeView} style={{ flex: 'none', flexWrap: 'nowrap' }} />
          <div style={{ width: 1, height: 17, background: 'rgba(243,240,234,0.14)', flex: 'none' }} />
          <span className="wide-only" style={{ ...micro(5), flex: 'none' }}>Category</span>
          {filtersFor('desk')}
          {searchFor('desk')}
        </div>
      </div>

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
              {[...DOORS, { id: 'about', label: viewById.about.label, to: { view: 'about' } } as SegmentItem].map((d) => {
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
          {filtersFor('sheet')}

          <div style={sheetLabel}>Search</div>
          {searchFor('sheet')}

          <div style={{ marginTop: 'auto', paddingTop: 30, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ font: '400 11px/1.6 ' + MONO, color: ink(5) }}>{status}</span>
          </div>
        </div>,
        document.body
      )}

      <div style={{ height: 1, background: 'rgba(243,240,234,0.1)' }}>
        <div ref={barRef} style={{ height: 1, width: '0%', background: GOLD }} />
      </div>
    </header>
  );
}
