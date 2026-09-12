import React, { useState } from 'react';
import { CATEGORIES, NOW } from '../lib/data.js';
import { MONO, RED, button, field, micro } from '../lib/styles.js';

const label = { display: 'flex', flexDirection: 'column', gap: 5, ...micro(0.42), letterSpacing: '0.18em' };

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
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
        {lead}
        <button onClick={onToggle} style={{ ...button(editing ? 'loud' : 'quiet'), padding: '6px 11px', font: '400 9.5px/1 ' + MONO }}>
          {editing ? 'Close editor' : 'Edit board'}
        </button>
        {editing && (
          <>
            <button onClick={onNewCard} style={{ ...button(), padding: '6px 11px', font: '400 9.5px/1 ' + MONO }}>+ Card</button>
            <button onClick={onConnect} style={{ ...button(), padding: '6px 11px', font: '400 9.5px/1 ' + MONO, borderColor: RED, color: 'oklch(0.78 0.16 25)' }}>+ String</button>
            <button onClick={() => board.restore()} style={{ ...button(), padding: '6px 11px', font: '400 9.5px/1 ' + MONO, color: 'rgba(243,240,234,0.5)' }}>Restore</button>
            <span style={micro(0.36)}>
              {(board.board.nodes || []).length} added · {(board.board.edges || []).length} strings · {(board.board.hidden || []).length} removed
            </span>
            {connecting && <span style={{ ...micro(1), color: 'oklch(0.78 0.16 25)' }}>Pick the second card</span>}
          </>
        )}
        <span style={{ flex: 1 }} />
        <div style={{
          display: 'flex', gap: compact ? 10 : 14, alignItems: 'center', minWidth: 0,
          ...(compact
            ? { flexWrap: 'nowrap', overflowX: 'auto', overflowY: 'hidden', maxWidth: '100%', scrollbarWidth: 'none' }
            : { flexWrap: 'wrap' })
        }}>
          {CATEGORIES.map((c) => (
            <span key={c.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flex: 'none', ...micro(0.42), letterSpacing: '0.14em' }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', display: 'inline-block', background: 'oklch(0.8 0.14 ' + c.hue + ')' }} />
              {c.label}
            </span>
          ))}
        </div>
        {trail}
      </div>

      {draft && (
        <div style={{
          marginBottom: 12, border: '1px solid oklch(0.5 0.14 25)', borderRadius: 3, background: '#141014',
          padding: '16px 18px', display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'flex-end', animation: 'fadeIn .2s both'
        }}>
          <label style={label}>Year
            <input value={draft.year} onChange={(e) => setDraft({ ...draft, year: e.target.value })} style={{ ...field, width: 74 }} />
          </label>
          <label style={{ ...label, flex: 1, minWidth: 220 }}>Headline
            <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} style={{ ...field, width: '100%', font: '400 13px/1.2 Helvetica, Arial, sans-serif' }} />
          </label>
          <label style={label}>Thread
            <select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} style={field}>
              {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </label>
          <label style={{ ...label, flex: 1, minWidth: 260 }}>Note
            <input value={draft.note || ''} onChange={(e) => setDraft({ ...draft, note: e.target.value })} style={{ ...field, width: '100%', font: '400 13px/1.2 Helvetica, Arial, sans-serif' }} />
          </label>
          <label style={{ ...label, minWidth: 200 }}>Source URL
            <input value={draft.url || ''} onChange={(e) => setDraft({ ...draft, url: e.target.value })} style={{ ...field, width: '100%', font: '400 11px/1.2 ' + MONO }} />
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={save} style={{ ...button('loud'), padding: '9px 14px' }}>Pin it up</button>
            {!draft.isNew && <button onClick={() => { board.removeCard(draft.id, !!draft.local); setDraft(null); }} style={{ ...button(), padding: '9px 14px' }}>Take down</button>}
            <button onClick={() => setDraft(null)} style={{ ...button(), padding: '9px 14px', color: 'rgba(243,240,234,0.45)' }}>Cancel</button>
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
            style={{ ...field, flex: 1, minWidth: 280, font: '400 10.5px/1.2 ' + MONO, color: 'rgba(243,240,234,0.7)' }}
          />
          <button onClick={() => setIo(board.exportPatch())} style={{ ...button(), padding: '8px 12px', font: '400 9.5px/1 ' + MONO }}>Export patch</button>
          <button
            onClick={() => { try { board.importPatch(io); } catch { window.alert('That is not a valid patch.'); } }}
            style={{ ...button(), padding: '8px 12px', font: '400 9.5px/1 ' + MONO }}
          >Import</button>
          <a href="https://github.com/mobahug/The_AI_Timeline/blob/main/CONTRIBUTING.md" target="_blank" rel="noopener" style={{ ...micro(1), letterSpacing: '0.14em' }}>How to submit ↗</a>
        </div>
      )}
    </>
  );
}
