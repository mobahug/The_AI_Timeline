import React, { useEffect, useRef, useState } from 'react';
import { COLOUR, MICHIE_NUMBER, Menace, perfectPlayer, playGame, randomPlayer, standard, winner } from '../../lib/machines/menace';
import type { Board, Box, Draw, Result } from '../../lib/machines/menace';
import { GOLD, INK, MONO, SERIF, STRING_INK, button, ink } from '../../lib/styles';
import { Btn } from '../kit';
import { label, panel } from './kit';

/* MENACE on a board: it opens with noughts, you answer with crosses, and every
   move it makes is a bead shaken out of the box for the position. The box it
   opened is drawn beside the board, beads and all; when the game ends the
   beads are given or taken, and the line Michie drew in 1961 moves. */

const BEAD: Record<string, string> = {
  white: '#f1ede4', lilac: '#c4a7d6', silver: '#b9bcc2', green: '#6fae6a', pink: '#e7a3bd',
  red: '#d4513f', amber: '#e3a23b', black: '#1b1b1f', gold: '#cfa64a'
};
const SCORE: Record<Result, number> = { win: 3, draw: 1, loss: -1 };
const SAID: Record<Result, string> = {
  win: 'MENACE won. Three beads of the chosen colour go into every box it opened.',
  draw: 'A draw. One bead of the chosen colour goes into every box it opened.',
  loss: 'MENACE lost. The chosen bead is taken out of every box it opened.'
};
const empty = (): Board => Array(9).fill(null);
const place = ['top left', 'top', 'top right', 'left', 'centre', 'right', 'bottom left', 'bottom', 'bottom right'];

/** The matchbox: the position on its lid, a bead colour on each move it can make. */
function Matchbox({ box, drawn }: { box: Box | null; drawn: number | null }) {
  if (!box) return <p style={{ margin: 0, font: '400 12px/1.6 ' + MONO, color: ink(4) }}>No box opened yet: a last square is played without one.</p>;
  const marks = box.key.split('');
  const total = Object.values(box.beads).reduce((a, n) => a + n, 0);
  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
      <div aria-hidden="true" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 30px)', gridAutoRows: 30, gap: 2, padding: 6, border: '1px solid rgba(243,240,234,0.18)', borderRadius: 3, background: 'rgba(243,240,234,0.03)' }}>
        {marks.map((m, i) => {
          const colour = box.beads[i] !== undefined ? COLOUR[MICHIE_NUMBER[i]] : null;
          return (
            <span key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', font: '400 15px/1 ' + MONO, color: m === 'O' ? INK : STRING_INK, outline: drawn === i ? '1px solid ' + GOLD : undefined, borderRadius: 2 }}>
              {m === '.' ? (colour ? <span style={{ width: 10, height: 10, borderRadius: '50%', background: BEAD[colour], boxShadow: colour === 'black' ? '0 0 0 1px rgba(243,240,234,0.4)' : undefined }} /> : '') : m}
            </span>
          );
        })}
      </div>
      <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
        {Object.entries(box.beads).map(([sq, n]) => {
          const colour = COLOUR[MICHIE_NUMBER[Number(sq)]];
          return (
            <li key={sq} style={{ display: 'flex', alignItems: 'center', gap: 8, font: '400 11.5px/1.4 ' + MONO, color: drawn === Number(sq) ? GOLD : ink(3) }}>
              <span aria-hidden="true" style={{ width: 9, height: 9, borderRadius: '50%', background: BEAD[colour], boxShadow: colour === 'black' ? '0 0 0 1px rgba(243,240,234,0.4)' : undefined }} />
              {colour} × {n}{drawn === Number(sq) ? ' · drawn' : ''}
            </li>
          );
        })}
        <li style={{ ...label, marginTop: 4 }}>{total} {total === 1 ? 'bead' : 'beads'} · stage {box.stage}</li>
      </ul>
    </div>
  );
}

/** Michie's Fig. 4: down one for a defeat, up one for a draw, up three for a win. */
function Progress({ results }: { results: Result[] }) {
  if (!results.length) return <p style={{ margin: 0, font: '400 12px/1.6 ' + MONO, color: ink(4) }}>No games yet.</p>;
  let y = 0;
  const pts = [[0, 0], ...results.map((r, i) => { y += SCORE[r]; return [i + 1, y]; })];
  const ys = pts.map((p) => p[1]);
  const lo = Math.min(0, ...ys);
  const hi = Math.max(1, ...ys);
  const W = 300;
  const H = 90;
  const x = (n: number) => (n / Math.max(1, results.length)) * W;
  const yy = (v: number) => H - ((v - lo) / (hi - lo)) * H;
  return (
    <svg viewBox={'0 0 ' + W + ' ' + H} width="100%" height={H} preserveAspectRatio="none" role="img" aria-label={'MENACE’s progress over ' + results.length + ' games: the line ends at ' + y}>
      <line x1={0} x2={W} y1={yy(0)} y2={yy(0)} stroke="rgba(243,240,234,0.18)" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
      <polyline points={pts.map(([n, v]) => x(n) + ',' + yy(v)).join(' ')} fill="none" stroke={GOLD} strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export default function MenaceMachine() {
  const menace = useRef<Menace>(null as unknown as Menace);
  if (!menace.current) menace.current = new Menace();
  const draws = useRef<Draw[]>([]);
  const [board, setBoard] = useState<Board>(empty);
  const [box, setBox] = useState<{ box: Box | null; bead: number | null }>({ box: null, bead: null });
  const [results, setResults] = useState<Result[]>([]);
  const [said, setSaid] = useState('');
  const [over, setOver] = useState(false);
  const [boxes, setBoxes] = useState(0);

  const finish = (result: Result, b: Board, note?: string) => {
    menace.current.reinforce(draws.current, result);
    draws.current = [];
    setBoard(b);
    setOver(true);
    setResults((rs) => [...rs, result]);
    setSaid(note ? note + ' ' + SAID[result] : SAID[result]);
    setBoxes(menace.current.boxes.size);
  };

  /** MENACE's turn on a board: a bead from the box, or resignation. */
  const menaceMoves = (b: Board) => {
    const m = menace.current.move(b);
    if (!m) { finish('loss', b, 'The box for this position is empty, so MENACE resigns.'); return; }
    const next = b.slice();
    next[m.square] = 'O';
    if ('box' in m) { draws.current.push(m); setBox({ box: m.box, bead: m.bead }); } else setBox({ box: null, bead: null });
    setBoxes(menace.current.boxes.size);
    const w = winner(next);
    if (w) { finish(w === 'O' ? 'win' : 'draw', next); return; }
    setBoard(next);
    setSaid('Your move: you play crosses. MENACE’s nought is on the ' + place[m.square] + ' square.');
  };

  const newGame = () => { draws.current = []; setOver(false); menaceMoves(empty()); };

  // MENACE opens: the first game starts as soon as the program has arrived.
  useEffect(() => { newGame(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const play = (i: number) => {
    if (over || board[i]) return;
    const next = board.slice();
    next[i] = 'X';
    const w = winner(next);
    if (w) { finish(w === 'X' ? 'loss' : 'draw', next); return; }
    menaceMoves(next);
  };

  const tournament = (n: number, rival: 'random' | 'perfect') => {
    const opponent = rival === 'random' ? randomPlayer(Math.random) : perfectPlayer(Math.random);
    const out: Result[] = [];
    let last: Board = empty();
    for (let k = 0; k < n; k++) { const g = playGame(menace.current, opponent); out.push(g.result); last = g.board; }
    draws.current = [];
    setResults((rs) => [...rs, ...out]);
    setBoard(last);
    setOver(true);
    setBox({ box: null, bead: null });
    setBoxes(menace.current.boxes.size);
    const c = (r: Result) => out.filter((x) => x === r).length;
    setSaid('Played ' + n + ' against ' + (rival === 'random' ? 'a random player' : 'a player who never loses') + ': won ' + c('win') + ', drew ' + c('draw') + ', lost ' + c('loss') + '. The board shows the last of them.');
  };

  const restart = () => {
    menace.current = new Menace();
    draws.current = [];
    setResults([]);
    setOver(false);
    setBoxes(0);
    menaceMoves(empty());
  };

  const tally = (r: Result) => results.filter((x) => x === r).length;

  return (
    <div style={{ ...panel, padding: 'clamp(14px,2vw,20px)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: 'clamp(18px,3vw,32px)' }}>
      <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div aria-label="The board" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', width: 'min(100%, 264px)', aspectRatio: '1 / 1' }}>
          {board.map((c, i) => (
            <button
              key={i}
              type="button"
              className="ix"
              onClick={() => play(i)}
              disabled={over || !!c}
              aria-label={place[i] + ': ' + (c === 'O' ? 'nought' : c === 'X' ? 'cross' : 'empty')}
              style={{
                background: 'transparent', color: c === 'O' ? INK : STRING_INK, font: '400 clamp(30px,6vw,40px)/1 ' + SERIF,
                border: 'none', borderRight: i % 3 < 2 ? '1px solid rgba(243,240,234,0.3)' : 'none', borderBottom: i < 6 ? '1px solid rgba(243,240,234,0.3)' : 'none',
                cursor: over || c ? 'default' : 'pointer', padding: 0
              }}
            >
              {c === 'O' ? 'O' : c === 'X' ? '×' : ''}
            </button>
          ))}
        </div>
        <p role="status" style={{ margin: 0, minHeight: '3.2em', font: '400 12.5px/1.6 ' + MONO, color: ink(2), textWrap: 'pretty' }}>{said}</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" className="ix ix-btn" data-tone={over ? 'loud' : 'quiet'} onClick={newGame} style={button(over ? 'loud' : 'quiet', 'lg')}>New game</button>
          <Btn size="lg" onClick={() => tournament(50, 'random')}>50 games v. a random player</Btn>
          <Btn size="lg" onClick={() => tournament(50, 'perfect')}>50 v. one who never loses</Btn>
          <Btn size="lg" tone="dim" onClick={restart}>Full boxes again</Btn>
        </div>
      </div>

      <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div>
          <div style={{ ...label, marginBottom: 10 }}>The box it last opened</div>
          <Matchbox box={box.box} drawn={box.bead} />
        </div>
        <div>
          <div style={{ ...label, marginBottom: 8 }}>
            {results.length} {results.length === 1 ? 'game' : 'games'} · won {tally('win')} · drew {tally('draw')} · lost {tally('loss')} · {boxes} of 304 boxes opened
          </div>
          <Progress results={results} />
          <p style={{ margin: '6px 0 0', font: '400 11px/1.6 ' + MONO, color: ink(4), textWrap: 'pretty' }}>
            Drawn as Michie drew MENACE’s first tournament: down one for a defeat, up one for a draw, up three for a win. The steeper it climbs, the better it plays.
          </p>
        </div>
      </div>
    </div>
  );
}
