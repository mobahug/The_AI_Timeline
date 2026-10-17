import React, { useEffect, useMemo, useState } from 'react';
import { AS_OF, HORIZONS, accent, catLabel, whenOf } from '../lib/data';
import { CHANGES, changes, dateOf, dayOf, lately, watchList } from '../lib/latest';
import { BASE } from '../lib/url';
import { absolute, copyText } from '../lib/dom';
import {
  INK, MONO, SANS, SERIF, RULE, ROW_RULE, DASHED_ROW, STRING_INK, CARD_PHOTO_FILTER, PLACEHOLDER,
  badge, frame, ink, micro, shell, tag
} from '../lib/styles';
import { Btn, Eyebrow, Link, PageHead, Section } from './kit';
import type { Event, Graph, Media, Watch } from '../lib/types';

/* The latest: for a reader who wants to follow AI as it happens, not only how
   it got here. Four things, in the order a reader asks for them: what happened
   most recently on the record; the dates the record already knows are coming,
   and the questions it is waiting on; the board's nearest scenarios; and what
   changed on the board itself — with the feed, explained, for following it
   from somewhere else.

   Nothing on the page is dated by hand. The record's dates are the cards';
   a watched date is quoted from its card; a change is dated by the commit
   that made it. The page is as current as the record says it is. */

const SECTIONS: { id: string; label: string }[] = [
  { id: 'record', label: 'On the record' },
  { id: 'watch', label: 'Dates to watch' },
  { id: 'next', label: 'Next on the horizon' },
  { id: 'changes', label: 'New on the board' },
  { id: 'follow', label: 'Follow along' }
];

/** One card on the record: its photograph, the day, its category, the title
 *  and the summary — a link to its dossier. */
function RecordRow({ e, media }: { e: Event; media: Media }) {
  const shot = media(e);
  return (
    <li style={{ borderTop: ROW_RULE }}>
      <Link to={{ view: 'card', id: e.id }} className="ix-row" style={{ display: 'flex', gap: 'clamp(12px,2.4vw,22px)', alignItems: 'flex-start', padding: '16px 4px' }}>
        <span style={{ ...frame(false), flex: 'none', width: 'clamp(58px,9vw,84px)', aspectRatio: '1', overflow: 'hidden', display: 'block' }}>
          {shot.img
            ? <img src={shot.img} alt="" loading="lazy" decoding="async" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', filter: CARD_PHOTO_FILTER }} />
            : <span aria-hidden="true" style={{ display: 'block', width: '100%', height: '100%', backgroundImage: PLACEHOLDER }} />}
        </span>
        <span style={{ flex: '1 1 auto', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 7 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
            <span style={{ font: '400 12px/1 ' + MONO, color: ink(3), fontVariantNumeric: 'tabular-nums' }}>{whenOf(e)}</span>
            <span style={tag(e.category, accent)}>{catLabel(e.category)}</span>
            {e.featured && <span style={{ ...micro(4), color: STRING_INK }}>Landmark</span>}
          </span>
          <span style={{ font: '400 clamp(19px,2.1vw,24px)/1.15 ' + SERIF, color: INK, letterSpacing: '-0.02em', textWrap: 'balance' }}>{e.title}</span>
          <span style={{ font: '400 14px/1.55 ' + SANS, color: ink(3), maxWidth: '64ch', textWrap: 'pretty' }}>{e.summary}</span>
        </span>
      </Link>
    </li>
  );
}

/** A date the record names: the day, what happens, and the card's own words. */
function WatchRow({ w, graph, passed }: { w: Watch; graph: Graph; passed?: boolean }) {
  const e = graph.index[w.event];
  if (!e) return null;
  // `12 Nov 2026`: the day large, the month and year beneath it.
  const [big, ...small] = (w.date ? dateOf(w) : '').split(' ');
  return (
    <li style={{ borderTop: ROW_RULE, padding: '18px 0', display: 'flex', gap: 'clamp(14px,3vw,28px)', alignItems: 'flex-start', flexWrap: 'wrap' }}>
      {w.date && (
        <div style={{ flex: '0 0 104px' }}>
          <div style={{ font: '400 clamp(30px,3.6vw,40px)/0.95 ' + SERIF, color: passed ? ink(4) : INK, letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums' }}>{big}</div>
          <div style={{ marginTop: 6, font: '400 11px/1.3 ' + MONO, color: ink(4), letterSpacing: '0.06em' }}>{small.join(' ')}</div>
        </div>
      )}
      <div style={{ flex: '1 1 300px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 9 }}>
        <p style={{ margin: 0, font: '400 clamp(16px,1.7vw,19px)/1.45 ' + SERIF, color: ink(passed ? 3 : 1), textWrap: 'pretty', maxWidth: '58ch' }}>{w.what}</p>
        <blockquote style={{ margin: 0, paddingLeft: 12, borderLeft: '2px solid ' + STRING_INK, font: '400 13px/1.55 ' + SANS, color: ink(3), maxWidth: '62ch', textWrap: 'pretty' }}>
          <span style={{ color: STRING_INK }}>“</span>{w.evidence}<span style={{ color: STRING_INK }}>”</span>
        </blockquote>
        <div style={{ font: '400 11px/1.6 ' + MONO, color: ink(4) }}>
          From the card <Link to={{ view: 'card', id: e.id }} className="ix-ref" style={{ color: ink(2) }}>{e.year} · {e.title}</Link>, where it is sourced
        </div>
        {w.date && <Overdue date={w.date} />}
      </div>
    </li>
  );
}

/** Said only in the browser, once the page is live: a watched date that has
 *  passed since the record was last brought up to date. The server cannot say
 *  it — it does not know the day the page is read. */
function Overdue({ date }: { date: string }) {
  const [late, setLate] = useState(false);
  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    setLate(date > AS_OF && date < today);
  }, [date]);
  if (!late) return null;
  return (
    <div role="note" style={{ ...micro(4), letterSpacing: '0.08em', textTransform: 'none', font: '400 11.5px/1.6 ' + MONO, border: '1px dashed rgba(243,240,234,0.25)', borderRadius: 2, padding: '7px 10px', width: 'fit-content', maxWidth: '100%' }}>
      This day has passed since the record was last brought up to date ({whenOf({ year: Number(AS_OF.slice(0, 4)), date: AS_OF })}); what happened is not on the board yet.
    </div>
  );
}

export interface LatestViewProps { graph: Graph; media: Media }

function LatestView({ graph, media }: LatestViewProps) {
  const stretches = useMemo(() => lately(graph), [graph]);
  const watch = useMemo(() => watchList(), []);
  const changed = useMemo(() => changes(graph), [graph]);
  const near = HORIZONS[0];
  const next = useMemo(() => graph.all.filter((e) => e.future && e.year >= near.from && e.year <= near.to), [graph, near]);
  const asOf = whenOf({ year: Number(AS_OF.slice(0, 4)), date: AS_OF });
  const count = stretches.reduce((n, s) => n + s.items.length, 0);
  const feed = BASE + 'feed.xml';
  // The address in full is the browser's to say: the server knows the path,
  // not the host the page will be read on, and the two must agree at first paint.
  const [feedUrl, setFeedUrl] = useState(feed);
  useEffect(() => { setFeedUrl(absolute(feed)); }, [feed]);
  const [copied, setCopied] = useState(false);
  useEffect(() => { if (!copied) return; const t = setTimeout(() => setCopied(false), 1400); return () => clearTimeout(t); }, [copied]);
  const shown = changed.slice(0, 12);
  const more = changed.slice(12);

  return (
    <div style={shell('route')}>
      <PageHead
        eyebrow={'The latest · the record is current to ' + asOf}
        title="What happened lately."
        lede={'The newest events on the record, newest first; the dates it already knows are coming and the questions it is still waiting on; the scenarios nearest to now; and what changed on the board itself. Every entry opens its card, with the sources it rests on.'}
        h1Style={{ font: '400 clamp(34px,6vw,72px)/0.98 ' + SERIF, letterSpacing: '-0.035em' }}
      />

      <nav aria-label="On this page" style={{ marginTop: 30, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {SECTIONS.map((s) => (
          <Link key={s.id} to={{ hash: s.id }} className="ix-chip" style={{ ...micro(3), letterSpacing: '0.08em', textTransform: 'none', font: '400 11.5px/1 ' + MONO, border: '1px solid rgba(243,240,234,0.16)', borderRadius: 2, padding: '8px 10px' }}>{s.label}</Link>
        ))}
      </nav>

      <Section id="record" eyebrow={count + ' cards · the twelve months to ' + asOf} title="On the record, newest first">
        <p style={{ margin: '0 0 6px', font: '400 13.5px/1.6 ' + SANS, color: ink(4), maxWidth: '64ch', textWrap: 'pretty' }}>
          What happened, as the board has filed it: each card is one event, dated where the record knows the day, with its category,
          and the full account and its sources a click away.
        </p>
        {stretches.map((s) => (
          <div key={s.key} style={{ marginTop: 26 }}>
            <h3 style={{ margin: '0 0 6px', display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
              <span style={{ font: '400 clamp(22px,2.6vw,28px)/1.1 ' + SERIF, color: INK, letterSpacing: '-0.02em' }}>{s.label}</span>
              <span style={micro(5)}>{s.items.length === 1 ? '1 card' : s.items.length + ' cards'}</span>
            </h3>
            <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {s.items.map((e) => <RecordRow key={e.id} e={e} media={media} />)}
            </ol>
          </div>
        ))}
        <div style={{ marginTop: 22, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Btn to={{ view: 'archive' }}>Everything before, in order</Btn>
          <Btn to={{ view: 'questions' }}>What it means for you: plain questions</Btn>
        </div>
      </Section>

      <Section id="watch" eyebrow={watch.ahead.length + ' dates ahead · ' + watch.open.length + ' open questions'} title="Dates to watch">
        <p style={{ margin: '0 0 6px', font: '400 13.5px/1.6 ' + SANS, color: ink(4), maxWidth: '64ch', textWrap: 'pretty' }}>
          Days the record already names, soonest first, each quoted from the card that sources it — and, after them, the questions
          it is waiting on with no date set. When one is settled, it becomes a card.
        </p>
        <ol style={{ listStyle: 'none', margin: '10px 0 0', padding: 0 }}>
          {watch.ahead.map((w) => <WatchRow key={w.id} w={w} graph={graph} />)}
        </ol>
        {watch.passed.length > 0 && (
          <>
            <Eyebrow tier="section" dim style={{ margin: '26px 0 6px' }}>Passed, and on the record</Eyebrow>
            <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {watch.passed.map((w) => <WatchRow key={w.id} w={w} graph={graph} passed />)}
            </ol>
          </>
        )}
        <h3 style={{ margin: '34px 0 6px', font: '400 clamp(22px,2.6vw,28px)/1.1 ' + SERIF, color: INK, letterSpacing: '-0.02em' }}>Waiting on, with no date set</h3>
        <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {watch.open.map((w) => <WatchRow key={w.id} w={w} graph={graph} />)}
        </ol>
      </Section>

      <Section id="next" eyebrow={near.label + ' horizon · ' + near.from + '–' + near.to + ' · scenarios, not forecasts'} title="Next on the horizon">
        <p style={{ margin: '0 0 6px', font: '400 13.5px/1.6 ' + SANS, color: ink(4), maxWidth: '64ch', textWrap: 'pretty' }}>
          What the board expects next, if the strings that lead to it hold. These are scenarios, drawn on manila card on the board:
          each carries a confidence and the board’s reasoning instead of a source, and the year is a placeholder.
        </p>
        <ol style={{ listStyle: 'none', margin: '10px 0 0', padding: 0 }}>
          {next.map((e) => (
            <li key={e.id} style={{ borderTop: DASHED_ROW }}>
              <Link to={{ view: 'card', id: e.id }} className="ix-row" style={{ display: 'flex', gap: '8px 20px', flexWrap: 'wrap', alignItems: 'baseline', padding: '14px 4px' }}>
                <span style={{ flex: '0 0 56px', font: '400 13px/1.4 ' + MONO, color: ink(4), fontVariantNumeric: 'tabular-nums' }}>{e.year}</span>
                <span style={{ flex: '1 1 300px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={{ font: '400 19px/1.2 ' + SERIF, color: INK, letterSpacing: '-0.015em' }}>{e.title}</span>
                  <span style={{ font: '400 13.5px/1.55 ' + SANS, color: ink(4), maxWidth: '62ch' }}>{e.summary}</span>
                </span>
                <span style={{ flex: '0 0 auto', display: 'flex', gap: 7, marginLeft: 'auto' }}>
                  {e.confidence && <span style={badge()}>{e.confidence}</span>}
                </span>
              </Link>
            </li>
          ))}
        </ol>
        <div style={{ marginTop: 18 }}>
          <Btn to={{ view: 'horizon' }}>The whole horizon →</Btn>
        </div>
      </Section>

      <Section id="changes" eyebrow={CHANGES.length ? 'Added and revised · dated from the board’s history' : 'Dated from the board’s history'} title="New on the board">
        <p style={{ margin: '0 0 6px', font: '400 13.5px/1.6 ' + SANS, color: ink(4), maxWidth: '64ch', textWrap: 'pretty' }}>
          The board is kept by hand and corrected when it is wrong. Here is what was added to it or revised most recently: cards,
          leads, plain questions and headline checks, each dated by the change that made it.
        </p>
        {shown.length === 0 ? (
          <p style={{ margin: '12px 0 0', font: '400 12px/1.7 ' + MONO, color: ink(4) }}>No changes could be dated in this copy of the board.</p>
        ) : (
          <>
            <ChangeList list={shown} />
            {more.length > 0 && (
              <details className="numbers" style={{ marginTop: 8 }}>
                <summary className="ix ix-ref" style={{ ...micro(4), cursor: 'pointer', padding: '8px 0', width: 'fit-content' }}>{more.length} earlier changes</summary>
                <ChangeList list={more} />
              </details>
            )}
          </>
        )}
      </Section>

      <Section id="follow" eyebrow="Without coming back to look" title="Follow along">
        <div style={{ display: 'flex', gap: 'clamp(20px,4vw,48px)', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 320px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <h3 style={{ margin: 0, font: '400 21px/1.2 ' + SERIF, color: INK, letterSpacing: '-0.015em' }}>With a feed reader</h3>
            <p style={{ margin: 0, font: '400 14px/1.65 ' + SANS, color: ink(3), textWrap: 'pretty' }}>
              A feed is a list a website publishes of what it has added, which a feed-reader app checks for you, the way a podcast app
              checks for new episodes. Copy the address below into any feed reader (Feedly, Inoreader or NetNewsWire, among many),
              and every new or revised card, lead, question and check arrives there with a line saying what changed.
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <code style={{ font: '400 12.5px/1.4 ' + MONO, color: INK, border: '1px solid rgba(243,240,234,0.2)', background: '#0c0c0e', borderRadius: 2, padding: '9px 11px', overflowWrap: 'anywhere' }}>{feedUrl}</code>
              <Btn size="lg" onClick={() => copyText(absolute(feed)).then((ok) => setCopied(!!ok))} aria-live="polite">{copied ? 'Copied ✓' : 'Copy the address'}</Btn>
              <Btn size="lg" tone="dim" href={feed}>Open the feed</Btn>
            </div>
          </div>
          <div style={{ flex: '1 1 280px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <h3 style={{ margin: 0, font: '400 21px/1.2 ' + SERIF, color: INK, letterSpacing: '-0.015em' }}>Without one</h3>
            <p style={{ margin: 0, font: '400 14px/1.65 ' + SANS, color: ink(3), textWrap: 'pretty' }}>
              Bookmark this page: it is rebuilt every time the board changes, and the date at the top says how current the record is.
              The board is one author’s reading, kept by hand, so it moves when something on the record has been checked, not the
              moment a story breaks.
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Btn to={{ view: 'checks' }}>Headlines, checked</Btn>
              <Btn to={{ view: 'charts' }}>The record in charts</Btn>
            </div>
          </div>
        </div>
      </Section>

      <div style={{ borderTop: RULE, marginTop: 44, paddingTop: 20, font: '400 11.5px/1.8 ' + MONO, color: ink(4), maxWidth: '72ch' }}>
        The record is current to {asOf}. A watched date is the record’s own, quoted from its card; a change is dated by the
        commit that made it, never typed in by hand.
      </div>
    </div>
  );
}

/** What changed on the board: the day, the kind, the title, and what changed. */
function ChangeList({ list }: { list: ReturnType<typeof changes> }) {
  return (
    <ol style={{ listStyle: 'none', margin: '10px 0 0', padding: 0 }}>
      {list.map((c) => (
        <li key={c.kind + c.id} style={{ borderTop: ROW_RULE }}>
          <Link to={c.to} className="ix-row" style={{ display: 'flex', gap: '6px 20px', flexWrap: 'wrap', alignItems: 'baseline', padding: '12px 4px' }}>
            <span style={{ flex: '0 0 96px', font: '400 12px/1.5 ' + MONO, color: ink(3), fontVariantNumeric: 'tabular-nums' }}>{dayOf(c.changed)}</span>
            <span style={{ flex: '1 1 300px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ font: '400 16.5px/1.25 ' + SERIF, color: INK, letterSpacing: '-0.01em', textWrap: 'balance' }}>{c.title}</span>
              <span style={{ font: '400 12.5px/1.5 ' + SANS, color: ink(4) }}>{c.isNew ? 'New ' + c.noun.toLowerCase() + '.' : 'Revised: ' + c.subject.replace(/[.\s]*$/, '') + '.'}</span>
            </span>
            <span style={{ flex: '0 0 auto', marginLeft: 'auto', ...micro(c.isNew ? 3 : 5), color: c.isNew ? STRING_INK : ink(5) }}>{c.isNew ? 'New' : 'Revised'} · {c.noun}</span>
          </Link>
        </li>
      ))}
    </ol>
  );
}

export default React.memo(LatestView);
