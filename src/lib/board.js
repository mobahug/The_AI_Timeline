import { useCallback, useState } from 'react';

const KEY = 'aiTimeline.board.v2';
const EMPTY = { nodes: [], edges: [], hidden: [], hiddenEdges: [], edits: {} };

const load = () => {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || 'null');
    return raw && raw.nodes ? { ...EMPTY, ...raw } : EMPTY;
  } catch {
    return EMPTY;
  }
};

/**
 * Local contributions. The canonical board lives in data/*.json and changes by pull
 * request; this is the scratch layer a contributor works in before exporting.
 */
export function useBoard() {
  const [board, setBoard] = useState(load);

  const commit = useCallback((next) => {
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
    setBoard(next);
  }, []);

  const clone = () => JSON.parse(JSON.stringify(board));

  return {
    board,
    addCard(card) {
      const next = clone();
      next.nodes.push({ ...card, id: card.id || 'local-' + Date.now().toString(36) });
      commit(next);
    },
    editCard(id, patch, isLocal) {
      const next = clone();
      if (isLocal) next.nodes = next.nodes.map((n) => (n.id === id ? { ...n, ...patch } : n));
      else next.edits[id] = { ...(next.edits[id] || {}), ...patch };
      commit(next);
    },
    removeCard(id, isLocal) {
      const next = clone();
      if (isLocal) next.nodes = next.nodes.filter((n) => n.id !== id);
      else { next.hidden = [...next.hidden, id]; delete next.edits[id]; }
      commit(next);
    },
    addString(link) {
      const next = clone();
      next.edges.push(link);
      commit(next);
    },
    removeString(edgeId, isLocal) {
      const next = clone();
      if (isLocal) next.edges = next.edges.filter((_, i) => 'l' + i !== edgeId);
      else next.hiddenEdges = [...next.hiddenEdges, edgeId];
      commit(next);
    },
    restore() { commit(EMPTY); },
    /** Contributions leave here as JSON and land in data/*.json via a pull request. */
    exportPatch() {
      const nodes = board.nodes.map(({ local, thread, future, ...rest }) => rest);
      return JSON.stringify({ events: nodes, links: board.edges, removed: board.hidden }, null, 2);
    },
    importPatch(text) {
      const parsed = JSON.parse(text);
      commit({
        ...EMPTY,
        nodes: parsed.events || parsed.nodes || [],
        edges: parsed.links || parsed.edges || [],
        hidden: parsed.removed || []
      });
    }
  };
}
