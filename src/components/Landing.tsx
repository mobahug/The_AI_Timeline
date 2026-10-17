import React from 'react';
import { AS_OF, FIRST, NOW, THREADS, accent, buildGraph, catLabel, forwardLedger, whenOf } from '../lib/data';
import { buildLine } from '../lib/spine';
import { BASE } from '../lib/url';
import { LEADS } from '../lib/leads';
import { QUESTIONS } from '../lib/questions';
import { CHECKS } from '../lib/checks';
import { PEOPLE, ORGS, TERMS } from '../lib/files';
import { dateOf, lately, watchList } from '../lib/latest';
import { pace } from '../lib/stats';
import { CARD_PHOTO_FILTER, GOLD, INK, MONO, PLACEHOLDER, RULE, SANS, SERIF, frame, ink, shell, tag } from '../lib/styles';
import { Btn, Door, Doors, Eyebrow, Link } from './kit';
import { PaceSpark } from './ChartsView';
import type { Media, RoutePatch } from '../lib/types';

/* The front page. Every figure on it is derived from the data; the graph is
   read once, at module load, because nothing on this page changes it. */
const graph = buildGraph();
const line = buildLine(graph);
const fwd = forwardLedger(graph);
const notes = graph.edges.filter((l) => l.note).length;
const asOf = whenOf({ year: Number(AS_OF.slice(0, 4)), date: AS_OF });

/* What happened lately: the newest cards on the record, and the next date the
   record knows is coming. The pace: the record counted, drawn small. */
const newest = lately(graph).flatMap((s) => s.items).slice(0, 4);
const soonest = watchList().ahead[0] || null;
const pulse = pace(graph);

/* The doors: the readings of the same strings, the record counted, everything
   dated, every name, and the wall itself. Each title is the page it opens; the
   body carries the page's own figure. */
const rungs = LEADS.reduce((n, l) => n + l.rungs.length, 0);
const doors: { eyebrow: string; title: string; body: string; to: RoutePatch }[] = [
  { eyebrow: 'How it got here', title: 'The line', body: line.rows.length + ' findings, oldest first: the story in order.', to: { view: 'line' } },
  { eyebrow: 'Follow a question', title: 'The leads', body: LEADS.length + ' lines of inquiry, ' + rungs + ' rungs — maths, games, gaming the test, the price of an answer, the confidant.', to: { view: 'leads' } },
  { eyebrow: 'Where it stands, and why', title: 'The case as it stands', body: fwd.crossing + ' of ' + graph.edges.length + ' strings cross ' + NOW + '.', to: { view: 'case' } },
  { eyebrow: 'What comes next', title: 'The horizon', body: fwd.argued + ' of ' + fwd.total + ' scenarios carry a string.', to: { view: 'horizon' } },
  { eyebrow: 'The record, counted', title: 'The charts', body: 'How fast it moved, what each era was about, harm and the response, how long a cause takes, and whose names recur.', to: { view: 'charts' } },
  { eyebrow: 'Everything, dated', title: 'The archive', body: graph.all.length + ' entries in date order, as a list, as photographs, or as a mosaic.', to: { view: 'archive' } },
  { eyebrow: 'Every name', title: 'The files', body: PEOPLE.length + ' people, ' + ORGS.length + ' organisations, ' + TERMS.length + ' terms — each with every card it appears on.', to: { view: 'files' } },
  { eyebrow: 'The wall itself', title: 'The board', body: graph.landmarks + ' landmark cards in brief, all ' + graph.all.length + ' in full — photo cards, red string, and a walkthrough of every chain.', to: { view: 'board' } }
];

/** A section of the front page: a ruled head with an eyebrow, a title and,
 *  on the right, the way on. */
function Part({ id, eyebrow, title, more, children }: { id: string; eyebrow: string; title: string; more?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <section aria-labelledby={id} style={{ borderTop: RULE, padding: '30px 0 48px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '10px 20px', flexWrap: 'wrap', marginBottom: 22 }}>
        <div style={{ marginRight: 'auto' }}>
          <Eyebrow tier="section" dim style={{ marginBottom: 10 }}>{eyebrow}</Eyebrow>
          <h2 id={id} style={{ margin: 0, font: '400 clamp(26px,3.4vw,40px)/1.04 ' + SERIF, letterSpacing: '-0.025em', color: INK }}>{title}</h2>
        </div>
        {more}
      </div>
      {children}
    </section>
  );
}

export interface LandingProps { media: Media }

function Landing({ media }: LandingProps) {
  // No footer follows the landing, so it keeps its own, shorter bottom; and it
  // is a hero, not an interior page — the one exception to the 30px head.
  return (
    <div style={{ ...shell('wide'), paddingBottom: 90 }}>
      <header style={{ padding: '112px 0 72px' }}>
        <Eyebrow tier="page" dim style={{ marginBottom: 30 }}>
          {graph.all.length} entries · {graph.edges.length} strings · {notes} case notes · current to {asOf}
        </Eyebrow>
        <h1 tabIndex={-1} style={{ margin: '0 0 28px', outline: 'none', font: '400 clamp(48px,10vw,150px)/0.9 ' + SERIF, letterSpacing: '-0.035em', maxWidth: '15ch', textWrap: 'balance' }}>
          Everything that led here, <em style={{ color: GOLD }}>where it stands, and what comes next.</em>
        </h1>
        <div style={{ display: 'flex', gap: 44, flexWrap: 'wrap', maxWidth: 940 }}>
          <p style={{ margin: 0, font: '400 16px/1.62 ' + SANS, color: ink(3), maxWidth: '46ch', textWrap: 'pretty' }}>
            A history of artificial intelligence from {FIRST} to today, and the scenarios that
            might follow. Breakthroughs, boardroom coups, lawsuits, breaches and fiction are pinned
            to a wall, with a string from each event to the ones it made possible, and {notes} of
            the {graph.edges.length} strings carry a written case note that argues the link.
            No technical background is needed: start with a plain question, see what happened
            lately, or open the board and follow the string.
          </p>
          <p style={{ margin: 0, font: '400 11.5px/1.85 ' + MONO, color: ink(5), maxWidth: '34ch', textWrap: 'pretty' }}>
            {THREADS.length} threads run at once — {THREADS.map((t) => t.label).join(' · ')}.
            Everything past {NOW} is a scenario on manila stock — it carries a confidence,
            never a citation.
          </p>
        </div>
        {/* The newcomer's door is the loud one: the board is a click further,
            in the header and at the foot of Start here. */}
        <div style={{ display: 'flex', gap: 12, marginTop: 40, flexWrap: 'wrap' }}>
          <Btn tone="loud" size="hero" to={{ view: 'start' }}>New here? Start here →</Btn>
          <Btn size="hero" to={{ view: 'board' }}>Open the board</Btn>
          <Btn size="hero" to={{ view: 'latest' }}>What happened lately</Btn>
          <Btn tone="dim" size="hero" to={{ view: 'charts' }}>The record in charts</Btn>
        </div>
      </header>

      {/* For a reader who came to follow AI as it happens: the newest cards on
          the record, and the next day the record knows is coming. */}
      <Part id="lately-head" eyebrow={'On the record · current to ' + asOf} title="What happened lately."
        more={<Btn to={{ view: 'latest' }}>All the latest, and what to watch →</Btn>}>
        {/* Two to a row on a phone, four on a desk: a column of four photographs
            would push the questions below a long scroll. */}
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,148px),1fr))', gap: 'clamp(10px,2vw,20px)' }}>
          {newest.map((e) => {
            const shot = media(e);
            return (
              <li key={e.id} style={{ minWidth: 0 }}>
                <Link to={{ view: 'card', id: e.id }} className="ix-door" style={{
                  display: 'flex', flexDirection: 'column', height: '100%', boxSizing: 'border-box',
                  background: 'rgba(243,240,234,0.035)', border: '1px solid rgba(243,240,234,0.1)', borderRadius: 3, overflow: 'hidden'
                }}>
                  <span style={{ ...frame(false), border: 'none', borderRadius: 0, display: 'block', aspectRatio: '16 / 9', overflow: 'hidden' }}>
                    {shot.img
                      ? <img src={shot.img} alt="" loading="lazy" decoding="async" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', filter: CARD_PHOTO_FILTER }} />
                      : <span aria-hidden="true" style={{ display: 'block', width: '100%', height: '100%', backgroundImage: PLACEHOLDER }} />}
                  </span>
                  <span style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 'clamp(12px,1.6vw,16px)' }}>
                    <span style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <span style={{ font: '400 11.5px/1 ' + MONO, color: ink(3), fontVariantNumeric: 'tabular-nums' }}>{whenOf(e)}</span>
                      <span style={tag(e.category, accent)}>{catLabel(e.category)}</span>
                    </span>
                    <span style={{ font: '400 clamp(16px,1.7vw,21px)/1.15 ' + SERIF, color: INK, letterSpacing: '-0.02em', textWrap: 'balance' }}>{e.title}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
        {soonest && (
          <p style={{ margin: '20px 0 0', font: '400 12px/1.7 ' + MONO, color: ink(4), textWrap: 'pretty' }}>
            <span style={{ color: GOLD }}>Next date to watch · {dateOf(soonest)}</span> — {soonest.what}{' '}
            <Link to={{ view: 'latest', hash: 'watch' }} className="ix-ref" style={{ color: ink(2) }}>Every date →</Link>
          </p>
        )}
      </Part>

      {/* The way in for a reader who came with a worry, not a curiosity: the
          questions people ask, each answered from the cards. */}
      <section aria-labelledby="questions-head" style={{ borderTop: RULE, padding: '30px 0 48px' }}>
        <Eyebrow tier="section" dim style={{ marginBottom: 10 }}>Plain questions · answered from the record</Eyebrow>
        <h2 id="questions-head" style={{ margin: '0 0 22px', font: '400 clamp(26px,3.4vw,40px)/1.04 ' + SERIF, letterSpacing: '-0.025em', color: INK }}>Start with a question.</h2>
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,300px),1fr))', gap: '0 clamp(16px,3vw,32px)' }}>
          {QUESTIONS.map((q) => (
            <li key={q.id} style={{ borderTop: '1px solid rgba(243,240,234,0.08)' }}>
              <Link to={{ view: 'question', id: q.id }} className="ix-ref" style={{ display: 'block', padding: '13px 0', font: '400 clamp(17px,1.8vw,20px)/1.3 ' + SERIF, color: INK, textWrap: 'balance' }}>
                {q.question} <span aria-hidden="true" style={{ color: GOLD }}>→</span>
              </Link>
            </li>
          ))}
        </ul>
        <div style={{ marginTop: 18, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Btn to={{ view: 'questions' }}>All {QUESTIONS.length} plain questions</Btn>
          <Btn to={{ view: 'checks' }}>{CHECKS.length === 1 ? 'A headline' : CHECKS.length + ' headlines'} checked against the source</Btn>
        </div>
      </section>

      {/* The record counted, drawn small: one sentence and its picture, and
          the way to the six charts behind it. */}
      <Part id="counted-head" eyebrow={'The charts · cards per year, ' + FIRST + '–' + NOW} title="The record, counted."
        more={<Btn to={{ view: 'charts' }}>All the charts →</Btn>}>
        <Link to={{ view: 'charts', hash: 'pace' }} className="ix-door" style={{ display: 'flex', gap: '18px clamp(20px,4vw,48px)', flexWrap: 'wrap', alignItems: 'flex-end', padding: 'clamp(14px,2vw,20px)', background: 'rgba(243,240,234,0.035)', border: '1px solid rgba(243,240,234,0.1)', borderRadius: 3 }}>
          <span style={{ flex: '1 1 260px', minWidth: 0, font: '400 clamp(17px,1.8vw,21px)/1.42 ' + SERIF, color: ink(2), textWrap: 'pretty' }}>
            {pulse.peak.year} alone has {pulse.peak.total} cards, {pulse.before.cards === pulse.peak.total ? 'as many as' : 'more than'} the board holds for every year from {FIRST} to {pulse.before.to} together.
            <span style={{ display: 'block', marginTop: 10, font: '400 11px/1.6 ' + MONO, color: ink(4) }}>Gold: the busiest year, and the present. How fast it moved →</span>
          </span>
          <span style={{ flex: '2 1 360px', minWidth: 0 }}><PaceSpark p={pulse} /></span>
        </Link>
      </Part>

      <div style={{ borderTop: RULE, paddingTop: 30 }}>
        <Doors>
          {doors.map((d) => <Door key={d.title} eyebrow={d.eyebrow} title={d.title} body={d.body} to={d.to} />)}
        </Doors>
      </div>

      {/* For a reader who wants to know when the board moves without coming
          back to look: the latest page, and the feed, written at build time
          (scripts/feed.ts). */}
      <p style={{ margin: '36px 0 0', font: '400 11.5px/1.85 ' + MONO, color: ink(5), maxWidth: '64ch', textWrap: 'pretty' }}>
        To follow the board: <Link to={{ view: 'latest', hash: 'follow' }} style={{ color: GOLD, textDecoration: 'underline', textDecorationThickness: 1, textUnderlineOffset: '0.16em' }}>what changed lately, and how to follow along</Link>,
        or <a href={BASE + 'feed.xml'} type="application/atom+xml">the feed</a> — paste its address into any feed reader.
      </p>
    </div>
  );
}

// A page re-renders on its own route, not on the header's year ticking over.
export default React.memo(Landing);
