import React, { useEffect, useMemo, useRef, useState } from 'react';
import { catLabel } from '../lib/data';
import { LEADS } from '../lib/leads';
import { ALL_ENTITIES } from '../lib/files';
import { INK, MONO, SANS, SERIF, ROW_RULE, ink, micro } from '../lib/styles';
import { Link, useNav } from './kit';
import type { CSSProperties } from 'react';
import type { Entity, Graph, RoutePatch } from '../lib/types';

/* One search for the whole site. The field filters the page it is on, as it
   always did, and as the reader types it also opens a list of everything that
   matches by name — cards, leads, people, organisations, terms — grouped, with
   the keyboard doing the expected things. ⌘K / Ctrl+K puts the cursor here. */

const norm = (s: string | number | null | undefined) => String(s || '').toLowerCase();

/** One hit in the list: what it is, what to show, and where it goes. */
export interface SearchItem { kind: string; id: string; label: string; sub: string; to: RoutePatch }
export interface SearchGroup { group: string; items: SearchItem[] }

/* The fields a hit is ranked on, whichever kind of entity carries them. */
type Ranked = { role?: string; short?: string };

/** Rank a match: a title that starts with the query outranks one that contains
 *  it, which outranks a hit in the body. */
function score(q: string, primary: string, secondary: string) {
  const p = norm(primary);
  if (p.startsWith(q)) return 3;
  if (p.includes(q)) return 2;
  if (norm(secondary).includes(q)) return 1;
  return 0;
}

export function searchAll(graph: Graph, query: string, limit = 6): SearchGroup[] {
  const q = norm(query).trim();
  if (!q || q.length < 2) return [];
  const cards = graph.all
    .map((e) => ({ s: score(q, e.title, e.summary + ' ' + (e.why || '') + ' ' + e.year), e }))
    .filter((x) => x.s).sort((a, b) => b.s - a.s || a.e.year - b.e.year).slice(0, limit)
    .map(({ e }): SearchItem => ({ kind: 'card', id: e.id, label: e.title, sub: e.year + ' · ' + catLabel(e.category), to: { view: 'card', id: e.id } }));
  const leads = LEADS
    .map((l) => ({ s: score(q, l.title, l.question + ' ' + l.blurb), l }))
    .filter((x) => x.s).sort((a, b) => b.s - a.s).slice(0, 3)
    .map(({ l }): SearchItem => ({ kind: 'lead', id: l.id, label: l.title, sub: 'Lead · ' + l.rungs.length + ' rungs', to: { view: 'lead', id: l.id } }));
  const names = ALL_ENTITIES
    .map((x: Entity & Ranked) => ({ s: score(q, [x.label, ...(x.aka || [])].join(' '), x.role || x.short || ''), x }))
    .filter((y) => y.s).sort((a, b) => b.s - a.s).slice(0, limit)
    .map(({ x }): SearchItem => ({ kind: x.kind, id: x.id, label: x.label, sub: x.kind === 'term' ? 'Term · ' + (x.short || '') : (x.kind === 'person' ? 'Person · ' : 'Organisation · ') + (x.role || ''), to: { view: x.kind, id: x.id } }));
  return [
    { group: 'Cards', items: cards },
    { group: 'Leads', items: leads },
    { group: 'Names and terms', items: names }
  ].filter((g) => g.items.length);
}

export interface SearchBoxProps {
  graph: Graph;
  value: string;
  onChange: (value: string) => void;
  /** The narrow header: the field takes the full width. */
  narrow?: boolean;
  /** Both chromes are in the document, so each field names its own listbox. */
  id?: string;
  style?: CSSProperties;
}

export default function SearchBox({ graph, value, onChange, narrow, id = 'site-search', style }: SearchBoxProps) {
  const { navigate } = useNav();
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const groups = useMemo(() => searchAll(graph, value), [graph, value]);
  const flat = useMemo(() => groups.flatMap((g) => g.items), [groups]);

  // ⌘K / Ctrl+K anywhere puts the cursor in the field — the one a reader can
  // see. The other chrome's field is in the document too, hidden by CSS, and a
  // hidden field must not take the cursor: `offsetParent` is null for anything
  // under `display: none`, which is exactly how the chromes are chosen.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        const el = inputRef.current;
        if (!el || el.offsetParent === null) return;
        e.preventDefault();
        el.focus(); el.select(); setOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Clicking anywhere else closes the list.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => { if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false); };
    window.addEventListener('pointerdown', onDown);
    return () => window.removeEventListener('pointerdown', onDown);
  }, [open]);

  useEffect(() => { setCursor(0); }, [value]);

  const go = (item: SearchItem) => {
    setOpen(false);
    navigate({ ...item.to, query: '' });
    if (inputRef.current) inputRef.current.blur();
  };

  const listId = id + '-results';
  const showing = open && flat.length > 0;

  return (
    <div ref={boxRef} style={{ position: 'relative', ...(narrow ? { width: '100%' } : { flex: '0 0 190px', width: 190 }), ...style }}>
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') { setOpen(false); e.currentTarget.blur(); return; }
          if (!showing) return;
          if (e.key === 'ArrowDown') { e.preventDefault(); setCursor((c) => Math.min(flat.length - 1, c + 1)); }
          if (e.key === 'ArrowUp') { e.preventDefault(); setCursor((c) => Math.max(0, c - 1)); }
          if (e.key === 'Enter') { e.preventDefault(); if (flat[cursor]) go(flat[cursor]); }
        }}
        placeholder={narrow ? 'search cards, names, terms…' : 'search…  ⌘K'}
        aria-label="Search the site"
        role="combobox"
        aria-expanded={showing}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={showing && flat[cursor] ? listId + '-' + cursor : undefined}
        style={{
          border: 'none', borderBottom: '1px solid rgba(243,240,234,0.2)', background: 'transparent', width: '100%', boxSizing: 'border-box',
          padding: narrow ? '10px 2px' : '5px 2px', color: INK, font: '400 ' + (narrow ? 15 : 12) + 'px/1.2 ' + MONO
        }}
      />
      {showing && (
        <div
          id={listId}
          role="listbox"
          style={{
            position: 'absolute', top: '100%', left: narrow ? 0 : 'auto', right: 0, marginTop: 6, zIndex: 90,
            width: narrow ? '100%' : 'min(92vw, 460px)', maxHeight: 'min(60vh, 520px)', overflowY: 'auto',
            background: 'rgba(10,10,11,0.985)', border: '1px solid rgba(243,240,234,0.16)', borderRadius: 3,
            boxShadow: '0 18px 40px rgba(0,0,0,0.55)', padding: '6px 0'
          }}
        >
          {groups.map((g) => (
            <div key={g.group}>
              <div style={{ ...micro(5, 'section'), padding: '10px 14px 6px' }}>{g.group}</div>
              {g.items.map((item) => {
                const idx = flat.indexOf(item);
                const on = idx === cursor;
                return (
                  <Link
                    key={item.kind + item.id}
                    id={listId + '-' + idx}
                    className="ix-row"
                    role="option"
                    aria-selected={on}
                    to={{ ...item.to, query: '' }}
                    onClick={(e) => { if (!(e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)) { e.preventDefault(); go(item); } }}
                    onMouseEnter={() => setCursor(idx)}
                    style={{
                      display: 'flex', gap: 12, alignItems: 'baseline', padding: '8px 14px', borderTop: ROW_RULE,
                      background: on ? 'rgba(243,240,234,0.07)' : 'transparent'
                    }}
                  >
                    <span style={{ flex: '1 1 auto', minWidth: 0, font: '400 14px/1.3 ' + SERIF, color: INK, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</span>
                    <span style={{ flex: '0 1 auto', minWidth: 0, font: '400 10.5px/1.3 ' + SANS, color: ink(5), overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '55%' }}>{item.sub}</span>
                  </Link>
                );
              })}
            </div>
          ))}
          <div style={{ ...micro(5), padding: '10px 14px 6px', textTransform: 'none', letterSpacing: '0.06em', borderTop: ROW_RULE }}>
            ↑↓ to move · Enter to open · Esc to close · the field also filters this page
          </div>
        </div>
      )}
    </div>
  );
}
