import React from 'react';
import type { ReactNode } from 'react';
import { AS_OF, CATEGORIES, FIRST, NOW, accent, catHue, catLabel, whenOf } from '../lib/data';
import { IDEAS } from '../lib/primer';
import { LEADS } from '../lib/leads';
import { QUESTIONS } from '../lib/questions';
import { CHECKS } from '../lib/checks';
import { PREDICTIONS } from '../lib/predictions';
import { MACHINES, machineById } from '../lib/machines';
import { termById } from '../lib/files';
import { buildLine } from '../lib/spine';
import {
  INK, MANILA, MONO, PAPER, SANS, SERIF, RULE, ROW_RULE, STRING_INK, CARD_PHOTO_FILTER,
  ink, micro, paperInk, shell, pageTitle } from '../lib/styles';
import { Btn, Claim, Door, Doors, Eyebrow, JumpNav, Link, NavRow, PageHead, Section } from './kit';
import type { Event, Graph, Media } from '../lib/types';

/* Start here: the page for a reader who has never opened the board, and may
   never have read anything about AI. It says what the site is, shows what is
   on the wall with real cards from it, puts the ideas the record turns on into
   everyday words, suggests a way in for the time the reader has, and explains
   the board's own vocabulary — the words the rest of the site takes for
   granted. Every count is the data's, and every idea points at the cards it
   rests on. */

/* The specimen: two cards and the string between them, and a scenario, taken
   from the board itself. Chosen because the string carries a case note and the
   pair is the one most readers already know; if either card goes, the page
   falls back to the first noted string on the board. */
const SPECIMEN = { from: 'instructgpt', to: 'chatgpt', scenario: 'multi-day-autonomous-work' };

/** A card as the wall draws it, small: paper, a pin in its category's colour,
 *  the year, the title, the photograph; manila and dashed for a scenario. */
function PaperCard({ e, media }: { e: Event; media: Media }) {
  const img = e.future ? '' : media(e).img;
  return (
    <Link to={{ view: 'card', id: e.id }} aria-label={e.year + ', ' + (e.future ? 'scenario, ' + (e.confidence || '') : catLabel(e.category)) + ', ' + e.title} style={{
      position: 'relative', display: 'flex', gap: 10, width: 'min(100%, 270px)', boxSizing: 'border-box', padding: '16px 12px 12px',
      background: e.future ? MANILA : PAPER, borderRadius: 1, color: '#17161a',
      border: e.future ? '1px dashed rgba(23,22,26,0.45)' : '1px solid rgba(23,22,26,0.16)',
      boxShadow: '0 10px 20px rgba(0,0,0,0.5)', transform: 'rotate(' + (e.future ? 0.8 : -0.6) + 'deg)'
    }}>
      <span aria-hidden="true" style={{
        position: 'absolute', left: '50%', top: 3, marginLeft: -6, width: 12, height: 12, borderRadius: '50%',
        background: 'radial-gradient(circle at 35% 30%, oklch(0.9 0.05 ' + catHue(e.category) + '), ' + accent(e.category, 0) + ')',
        border: '1px solid rgba(0,0,0,0.35)', boxShadow: '0 2px 4px rgba(0,0,0,0.6)'
      }} />
      <span style={{ flex: '1 1 auto', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ font: '500 10px/1 ' + MONO, letterSpacing: '0.14em', color: paperInk(0.72), fontVariantNumeric: 'tabular-nums' }}>{e.year}</span>
        <span style={{ font: '400 18px/1.12 ' + SERIF, color: '#17161a' }}>{e.title}</span>
        <span style={{ marginTop: 2, font: '400 9px/1 ' + MONO, letterSpacing: '0.18em', textTransform: 'uppercase', color: e.future ? 'oklch(0.45 0.16 25)' : paperInk(0.65) }}>
          {e.future ? 'Scenario · ' + (e.confidence || 'Uncertain') : catLabel(e.category)}
        </span>
      </span>
      {img && <img src={img} alt="" loading="lazy" decoding="async" style={{ flex: 'none', width: 58, height: 58, objectFit: 'cover', border: '1px solid rgba(23,22,26,0.22)', filter: CARD_PHOTO_FILTER }} />}
    </Link>
  );
}

/** One row of the annotated specimen: the piece on the left, what it is on the right. */
function Annotated({ n, piece, title, children }: { n: number; piece: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: '14px clamp(20px,4vw,48px)', flexWrap: 'wrap', alignItems: 'center', padding: '14px 0' }}>
      <div style={{ flex: '0 1 300px', minWidth: 0, alignSelf: 'stretch', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{piece}</div>
      <div style={{ flex: '1 1 300px', minWidth: 0, display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        <span aria-hidden="true" style={{ flex: 'none', width: 28, height: 28, borderRadius: '50%', border: '1px solid ' + STRING_INK, color: STRING_INK, display: 'flex', alignItems: 'center', justifyContent: 'center', font: '400 12px/1 ' + MONO }}>{n}</span>
        <div style={{ minWidth: 0 }}>
          <h3 style={{ margin: '3px 0 6px', font: '400 21px/1.15 ' + SERIF, color: INK, letterSpacing: '-0.015em' }}>{title}</h3>
          <div style={{ font: '400 14px/1.65 ' + SANS, color: ink(3), textWrap: 'pretty', maxWidth: '54ch' }}>{children}</div>
        </div>
      </div>
    </div>
  );
}

/** The board's own words, the ones the rest of the site takes for granted. */
function Vocabulary({ graph }: { graph: Graph }) {
  const line = buildLine(graph);
  const words: [string, ReactNode][] = [
    ['Card', 'One event on the record: a paper, a product, a deal, a lawsuit, a law. Its dossier holds the full account and the sources it rests on, quoted.'],
    ['String', 'A claim that one event made another possible. The words on it say how: provoked, was wrapped as, was the warning for.'],
    ['Case note', 'The paragraph that argues a string. ' + graph.edges.filter((l) => l.note).length + ' of the ' + graph.edges.length + ' strings carry one.'],
    ['Landmark', 'A card the board shows in brief: a featured card, a rung on a lead, or either end of a string with a case note.'],
    ['Lead', 'One question followed through the record, a rung at a time. There are ' + LEADS.length + '.'],
    ['Rung', 'A card on a lead: the level the question had reached by then.'],
    ['Finding', 'One stretch of the line: a run of years with a title, ' + line.rows.length + ' in all, oldest first.'],
    ['The case', 'Where the record stands now, and which strings run on into what comes next.'],
    ['Scenario', 'An entry after ' + NOW + ': a mechanism the board expects, with a confidence (Likely, Uncertain or Speculative) instead of a source, and a year that is only a placeholder.'],
    ['The horizon', 'Every scenario, in three bands: near, mid and far.'],
    ['The files', 'Every person, organisation and term on the board, each with every card it appears on.'],
    ['Plain question', 'A question people ask about AI, answered only from what the cards already say. There are ' + QUESTIONS.length + '.'],
    ['Headline check', 'A widely reported line about AI set beside what the primary account says, both quoted. There ' + (CHECKS.length === 1 ? 'is one so far' : 'are ' + CHECKS.length) + '.'],
    ['Brief and Full', 'The switch at the top of every page. Brief shows the outline, the landmark cards and one quote each; Full shows every card, string, figure and source.']
  ];
  return (
    <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,300px),1fr))', gap: '0 clamp(18px,3vw,36px)' }}>
      {words.map(([w, d]) => (
        <div key={w} style={{ borderTop: ROW_RULE, padding: '12px 0' }}>
          <dt style={{ font: '400 17px/1.2 ' + SERIF, color: INK, letterSpacing: '-0.01em' }}>{w}</dt>
          <dd style={{ margin: '5px 0 0', font: '400 13.5px/1.6 ' + SANS, color: ink(3), textWrap: 'pretty' }}>{d}</dd>
        </div>
      ))}
    </dl>
  );
}

export interface StartViewProps { graph: Graph; media: Media }

function StartView({ graph, media }: StartViewProps) {
  const record = graph.all.filter((e) => !e.future).length;
  const scenarios = graph.all.length - record;
  const noted = graph.edges.filter((l) => l.note);
  const pick = graph.edges.find((l) => l.from === SPECIMEN.from && l.to === SPECIMEN.to && l.note) || noted[0];
  const a = pick ? graph.index[pick.from] : null;
  const b = pick ? graph.index[pick.to] : null;
  const scenario = graph.index[SPECIMEN.scenario] || graph.all.find((e) => e.future) || null;
  const line = buildLine(graph);
  const rungs = LEADS.reduce((n, l) => n + l.rungs.length, 0);
  const asOf = whenOf({ year: Number(AS_OF.slice(0, 4)), date: AS_OF });

  return (
    <div style={shell('route')}>
      <PageHead
        eyebrow="Start here · for a reader new to AI, or new to this board"
        title="New to all this? Start here."
        lede={'This site is a history of artificial intelligence: ' + record + ' events from ' + FIRST + ' to ' + NOW + ', and ' + scenarios + ' scenarios for what might follow, told as an investigation. Each event is a card pinned to a wall, with a string to the events it made possible. You need no technical background to read it. This page explains the few words it uses, the handful of ideas the story turns on, and where to begin.'}
        h1Style={pageTitle('index')}
      />

      <JumpNav items={[
        { id: 'read', label: 'How to read the board' },
        { id: 'ideas', label: 'AI in plain words' },
        { id: 'begin', label: 'Where to begin' },
        { id: 'words', label: 'The board’s own words' }
      ]} />

      <Section id="read" eyebrow="The key" title="How to read the board" count="drawn from the wall itself">
        {a && b && pick && (
          <Annotated n={1} title="A card is one event" piece={<PaperCard e={a} media={media} />}>
            A paper, a product, a deal, a lawsuit, a law. The pin’s colour says what kind (the colours are listed below), and every card
            opens a dossier: what happened, why it mattered, the numbers and names on it, and the sources it rests on, quoted so they can be
            checked.
          </Annotated>
        )}
        {a && b && pick && (
          <Annotated
            n={2}
            title="A string says one led to another"
            piece={
              // The string runs from the pin of the card above to the pin of the
              // card below, through the padding between the rows; its claim is
              // written beside it, as the board writes it on the tag.
              <div style={{ position: 'relative', width: 'min(100%, 270px)', alignSelf: 'stretch', minHeight: 92, margin: '-28px 0' }}>
                <span aria-hidden="true" style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 2, marginLeft: -1, background: STRING_INK, borderRadius: 1, boxShadow: '0 0 8px oklch(0.78 0.16 25 / 0.4)' }} />
                <span style={{ position: 'absolute', left: 'calc(50% + 14px)', right: 0, top: '50%', transform: 'translateY(-50%)' }}><Claim wrap>{pick.claim}</Claim></span>
              </div>
            }
          >
            The words on the string are the claim: {a.title} <em>{pick.claim}</em> {b.title}. {noted.length} of the {graph.edges.length} strings
            carry a case note that argues the link, like this one: <span style={{ color: ink(2) }}>“{pick.note}”</span>
          </Annotated>
        )}
        {a && b && (
          <Annotated n={3} title="Follow the string" piece={<PaperCard e={b} media={media} />}>
            On the board, click a card and it walks you along its strings, clue by clue, to where it came from and what it led to. A card
            can have many strings in and out; the board draws {graph.edges.length}.
          </Annotated>
        )}
        {scenario && (
          <Annotated n={4} title="After now, a scenario" piece={<PaperCard e={scenario} media={media} />}>
            Anything after {NOW} is a scenario, not a forecast: drawn on manila card with a dashed edge, carrying a confidence (Likely,
            Uncertain or Speculative) and the board’s reasoning instead of a source. The mechanism is the claim; the year is a placeholder.
          </Annotated>
        )}

        <h3 style={{ margin: '30px 0 4px', font: '400 21px/1.15 ' + SERIF, color: INK, letterSpacing: '-0.015em' }}>What the colours mean</h3>
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,300px),1fr))', gap: '0 clamp(18px,3vw,36px)' }}>
          {CATEGORIES.map((c) => (
            <li key={c.id} style={{ borderTop: ROW_RULE, padding: '11px 0', display: 'flex', gap: 12, alignItems: 'baseline' }}>
              <span aria-hidden="true" style={{ flex: 'none', width: 9, height: 9, borderRadius: '50%', background: accent(c.id, 0), transform: 'translateY(-1px)' }} />
              <span style={{ minWidth: 0 }}>
                <Link to={{ view: 'archive', category: c.id, query: '' }} className="ix-ref" style={{ font: '400 10px/1 ' + MONO, letterSpacing: '0.16em', textTransform: 'uppercase', color: accent(c.id, 0) }}>{c.label}</Link>
                <span style={{ display: 'block', marginTop: 5, font: '400 13.5px/1.55 ' + SANS, color: ink(3), textWrap: 'pretty' }}>{c.blurb}</span>
              </span>
            </li>
          ))}
        </ul>
        <p style={{ margin: '18px 0 0', font: '400 13.5px/1.6 ' + SANS, color: ink(4), maxWidth: '64ch', textWrap: 'pretty' }}>
          At the top of every page, <strong style={{ color: INK, fontWeight: 400 }}>Brief</strong> shows the outline (the landmark cards, one
          quote each) and <strong style={{ color: INK, fontWeight: 400 }}>Full</strong> shows everything: every card, string, figure and source.
        </p>
      </Section>

      <Section id="ideas" eyebrow="The ideas" title="AI in plain words" count={IDEAS.length + ' ideas, each building on the last'}>
        <p style={{ margin: '0 0 8px', font: '400 13.5px/1.6 ' + SANS, color: ink(4), maxWidth: '64ch', textWrap: 'pretty' }}>
          The story turns on a few ideas. Here they are without the jargon, each with the cards where it enters the record and a
          link to the glossary, which defines it in the board’s own words.
        </p>
        <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {IDEAS.map((idea, i) => {
            const term = termById[idea.term];
            const cards = idea.cards.map((id) => graph.index[id]).filter(Boolean);
            return (
              <li key={idea.term} id={'idea-' + idea.term} style={{ borderTop: ROW_RULE, padding: '20px 0', display: 'flex', gap: 'clamp(14px,3vw,28px)', alignItems: 'flex-start', scrollMarginTop: 96 }}>
                <span aria-hidden="true" style={{ flex: 'none', width: 40, font: '400 clamp(22px,2.6vw,30px)/1 ' + SERIF, color: ink(4), fontVariantNumeric: 'tabular-nums' }}>{String(i + 1).padStart(2, '0')}</span>
                <div style={{ flex: '1 1 auto', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 9 }}>
                  <h3 style={{ margin: 0, font: '400 clamp(21px,2.4vw,27px)/1.1 ' + SERIF, color: INK, letterSpacing: '-0.02em' }}>
                    {term ? <Link to={{ view: 'term', id: term.id }} className="ix-ref">{term.term}</Link> : idea.term}
                  </h3>
                  <p style={{ margin: 0, font: '400 15px/1.65 ' + SANS, color: ink(2), maxWidth: '64ch', textWrap: 'pretty' }}>{idea.plain}</p>
                  {cards.length > 0 && (
                    <div style={{ display: 'flex', gap: '6px 8px', flexWrap: 'wrap', alignItems: 'baseline' }}>
                      <span style={micro(5)}>On the board</span>
                      {cards.map((e) => (
                        <Link key={e.id} to={{ view: 'card', id: e.id }} className="ix-chip" style={{ font: '400 12px/1.2 ' + MONO, color: ink(2), border: '1px solid rgba(243,240,234,0.16)', borderLeft: '2px solid ' + accent(e.category, 0), borderRadius: 2, padding: '5px 8px' }}>
                          <span style={{ color: ink(4) }}>{e.year}</span> {e.title}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
        <div style={{ marginTop: 16 }}>
          <Btn to={{ view: 'glossary' }}>Every term, in the glossary →</Btn>
        </div>
      </Section>

      <Section id="begin" eyebrow="Ways in" title="Where to begin" count="by the time you have">
        <Doors>
          <Door eyebrow="Five minutes" title="Ask a plain question" to={{ view: 'questions' }}
            body={'Will AI take my job? Can I trust a chatbot? Is it a bubble? ' + QUESTIONS.length + ' questions, each answered from the cards, with what the record does not settle.'} />
          {machineById.eliza && (
            <Door eyebrow="Five minutes" title="Talk to ELIZA" to={{ view: 'card', id: machineById.eliza.event, hash: 'machine' }}
              body={'The first chatbot, run again from its 1965 script: type to it, then show the workings and see how little it takes to seem to understand. ' + (MACHINES.length - 1) + ' more old machines run on their cards.'} />
          )}
          <Door eyebrow="Ten minutes" title="See what was said in advance" to={{ view: 'predictions' }}
            body={'Famous predictions about AI, ' + PREDICTIONS.length + ' of them, each quoted from where it was made and set beside what happened: some came true, some came late, some never did.'} />
          <Door eyebrow="Ten minutes" title="See what happened lately" to={{ view: 'latest' }}
            body={'The newest events on the record, the dates it knows are coming, and how to follow along. Current to ' + asOf + '.'} />
          <Door eyebrow="Twenty minutes" title="Read the line" to={{ view: 'line' }}
            body={'The whole story in ' + line.rows.length + ' findings, oldest first: how a machine that could not add became something governments argue about.'} />
          <Door eyebrow="Half an hour" title="Follow a lead" to={{ view: 'leads' }}
            body={LEADS.length + ' questions followed up the years, ' + rungs + ' rungs in all: mathematics, games, gaming the test, the price of an answer, the confidant.'} />
          <Door eyebrow="For the numbers" title="Look at the charts" to={{ view: 'charts' }}
            body="How fast it moved, what each era was about, harm and the response, how long a cause takes: the record, counted." />
          <Door eyebrow="As long as you like" title="Open the board" to={{ view: 'board' }}
            body="The wall itself: every card and string. Click a card to walk its chain, or follow a lead and watch its ladder light up." />
        </Doors>
      </Section>

      <Section id="words" eyebrow="The vocabulary" title="The board’s own words" count="what the rest of the site takes for granted">
        <Vocabulary graph={graph} />
      </Section>

      <Section eyebrow="Before you go in" title="What this is not">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,260px),1fr))', gap: '14px clamp(18px,3vw,36px)' }}>
          {([
            ['Not the news', 'The record is brought up to date by hand and checked against the primary account, so it trails the headlines. It is current to ' + asOf + '.'],
            ['Not advice', 'It explains what happened; nothing here is legal, medical or financial advice.'],
            ['Not neutral', 'It is one author’s reading, argued in the open: every string says what it claims, and every claim can be checked against its source.']
          ] as [string, string][]).map(([t, d]) => (
            <div key={t} style={{ borderTop: ROW_RULE, paddingTop: 12 }}>
              <Eyebrow tier="section" style={{ marginBottom: 8 }}>{t}</Eyebrow>
              <p style={{ margin: 0, font: '400 13.5px/1.6 ' + SANS, color: ink(3), textWrap: 'pretty' }}>{d}</p>
            </div>
          ))}
        </div>
      </Section>

      <div style={{ borderTop: RULE, marginTop: 44, paddingTop: 22 }}>
        <NavRow up={[{ label: 'About the board', to: { view: 'about' } }]} onward={{ label: 'Open the board', to: { view: 'board' } }} />
      </div>
    </div>
  );
}

export default React.memo(StartView);
