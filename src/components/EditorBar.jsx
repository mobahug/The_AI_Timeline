import React, { useState } from 'react';
import { CATEGORIES, NOW, accent } from '../lib/data.js';
import { MONO, SANS, RED, STRING_INK, FADE, field, ink, micro, sourceLink } from '../lib/styles.js';
import { Btn } from './kit.jsx';

const label = { display: 'flex', flexDirection: 'column', gap: 5, ...micro(5) };

/**
 * The local contribution layer. Edits live in localStorage; "Export patch" produces the
 * JSON that goes into data/*.json through a pull request.
 */
export default function EditorBar({ editing, onToggle, onNewCard, onConnect, connecting, board, draft, setDraft, lead, trail, compact }) {
  const [io, setIo] = useState('');

  const save = () => {
    if (!draft || !draft.title.trim()) return;
    const patch = {
      year: Number(draft.year) || NOW,
      category: draft.category,
      title: draft.title.trim(),
      summary: draft.note,
      source: draft.source || undefined,
      url: draft.url || undefined
    };
    if (draft.isNew) board.addCard({ ...patch, id: undefined });
    else board.editCard(draft.id, patch, !!draft.local);
    setDraft(null);
  };

  return (
    <>
      {/* One line, always: the hint changes with every hover, and if this row
          could wrap, the board below would re-measure and jump on each one.
          The hint ellipsises and the legend scrolls instead. */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'nowrap', minWidth: 0, marginBottom: 10 }}>
        {lead}
        <Btn tone={editing ? 'loud' : 'quiet'} size="sm" onClick={onToggle}>
          {editing ? 'Close editor' : 'Edit board'}
        </Btn>
        {editing && (
          <>
            <Btn size="sm" onClick={onNewCard}>+ Card</Btn>
            <Btn size="sm" onClick={onConnect} style={{ borderColor: RED, color: STRING_INK }}>+ String</Btn>
            <Btn
              tone="dim"
              size="sm"
              onClick={() => window.confirm('Discard every local edit? This cannot be undone.') && board.restore()}
            >Discard edits</Btn>
            <span style={micro(5)}>
              {(board.board.nodes || []).length} added · {(board.board.edges || []).length} strings · {(board.board.hidden || []).length} removed · {Object.keys(board.board.edits || {}).length} edited
            </span>
            {connecting && <span style={{ ...micro(1), color: STRING_INK }}>Pick the second card</span>}
          </>
        )}
        <span style={{ flex: 1 }} />
        <div style={{
          display: 'flex', gap: compact ? 10 : 14, alignItems: 'center', minWidth: 0, flex: '0 1 auto',
          flexWrap: 'nowrap', overflowX: 'auto', overflowY: 'hidden', maxWidth: '100%', scrollbarWidth: 'none'
        }}>
          <span style={{ ...micro(5), flex: 'none' }}>Colour is the category · lanes are the threads</span>
          {CATEGORIES.map((c) => (
            <span key={c.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flex: 'none', ...micro(5), letterSpacing: '0.14em' }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', display: 'inline-block', background: accent(c.id, 0) }} />
              {c.label}
            </span>
          ))}
        </div>
        {trail}
      </div>

      {draft && (
        <div style={{
          marginBottom: 12, border: '1px solid oklch(0.5 0.14 25)', borderRadius: 3, background: '#141014',
          padding: '16px 18px', display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'flex-end', animation: FADE
        }}>
          <label style={label}>Year
            <input value={draft.year} onChange={(e) => setDraft({ ...draft, year: e.target.value })} style={{ ...field, width: 74 }} />
          </label>
          <label style={{ ...label, flex: 1, minWidth: 220 }}>Headline
            <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} style={{ ...field, width: '100%', font: '400 13px/1.2 ' + SANS }} />
          </label>
          <label style={label}>Category
            <select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} style={field}>
              {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </label>
          <label style={{ ...label, flex: 1, minWidth: 260 }}>Note
            <input value={draft.note || ''} onChange={(e) => setDraft({ ...draft, note: e.target.value })} style={{ ...field, width: '100%', font: '400 13px/1.2 ' + SANS }} />
          </label>
          <label style={{ ...label, minWidth: 200 }}>Source URL
            <input value={draft.url || ''} onChange={(e) => setDraft({ ...draft, url: e.target.value })} style={{ ...field, width: '100%', font: '400 11px/1.2 ' + MONO }} />
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn tone="loud" size="lg" onClick={save}>Pin it up</Btn>
            {!draft.isNew && <Btn size="lg" onClick={() => { board.removeCard(draft.id, !!draft.local); setDraft(null); }}>Take down</Btn>}
            <Btn tone="dim" size="lg" onClick={() => setDraft(null)}>Cancel</Btn>
          </div>
        </div>
      )}

      {editing && (
        <div style={{ marginBottom: 12, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            value={io}
            onChange={(e) => setIo(e.target.value)}
            placeholder="patch JSON — export it, paste it into a pull request"
            aria-label="Contribution patch"
            style={{ ...field, flex: 1, minWidth: 280, font: '400 10.5px/1.2 ' + MONO, color: ink(3) }}
          />
          <Btn size="sm" onClick={() => setIo(board.exportPatch())}>Export patch</Btn>
          <Btn
            size="sm"
            onClick={() => { try { board.importPatch(io); } catch { window.alert('That is not a valid patch.'); } }}
          >Import</Btn>
          <a href="https://github.com/mobahug/The_AI_Timeline/blob/main/CONTRIBUTING.md" target="_blank" rel="noopener" style={sourceLink}>How to submit ↗</a>
        </div>
      )}
    </>
  );
}
