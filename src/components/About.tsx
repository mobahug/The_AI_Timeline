import React from 'react';
import type { ReactNode } from 'react';
import { events, links, projections } from '../lib/data';
import { LEADS } from '../lib/leads';
import { PEOPLE, ORGS, TERMS } from '../lib/files';
import { INK, MONO, SERIF, SANS, RULE, ink, shell } from '../lib/styles';
import { Link, PageHead } from './kit';

/* The essay's own section: no rule above it, only the measure and the h2 it
   shares with the ruled sections elsewhere. */
const Section = ({ title, children }: { title: ReactNode; children?: ReactNode }) => (
  <section style={{ marginBottom: 44, maxWidth: '68ch' }}>
    <h2 style={{ margin: '0 0 14px', font: '400 clamp(20px,2.4vw,26px)/1.1 ' + SERIF, letterSpacing: '-0.02em', color: INK }}>{title}</h2>
    <div style={{ font: '400 14.5px/1.7 ' + SANS, color: ink(3), textWrap: 'pretty' }}>{children}</div>
  </section>
);

function About() {
  return (
    <div style={shell('read')}>
      <PageHead
        eyebrow="How this board works"
        title="About the board"
        h1Style={{ font: '400 clamp(26px,4vw,40px)/1.05 ' + SERIF, letterSpacing: '-0.03em' }}
      />

      <div style={{ marginTop: 44 }}>
        <Section title="It argues, it does not list">
          Every string on the wall is a causal claim: the earlier card made the later one
          possible, or inevitable. The paper tag names the claim — <em>provoked</em>,
          <em> left a funding hole filled by</em>, <em>was the warning for</em> — and {links.filter((l) => l.note).length} of
          the {links.length} strings carry a written case note explaining the reasoning. If a
          connection cannot be argued in a sentence, it does not get a string.
        </Section>

        <Section title="Brief and full">
          The site opens in brief: the board shows its landmark cards — the featured ones, every rung
          on a lead, and both ends of every string that carries a case note — and a card's panel shows
          its summary, its reading and one quoted sentence. Switch to full, in the header, and every
          card and string is drawn, and every dossier shows its whole file: the paragraphs behind the
          summary, the figures, the names on it, every source with what it says, and the road here in
          the board's own claim verbs. The choice is remembered in your browser; a link with
          <code style={{ font: 'inherit', color: INK }}> ?mode=full</code> opens the whole file for someone else.
        </Section>

        <Section title="The leads">
          A lead follows one question through the record, rung by rung: how far machines got at
          mathematics, at games, at gaming their own tests, and how cheap an answer became.
          There are {LEADS.length}, with {LEADS.reduce((n, l) => n + l.rungs.length, 0)} rungs between them, and every rung is a card
          on the board. A rung is a level reached, not a cause: where two rungs are also joined by a
          string, the step carries the string's claim; where they are not, the lead is the only
          argument, and the page says so. <Link to={{ view: 'leads' }}>The leads →</Link>
        </Section>

        <Section title="The files">
          Every name the board uses has a page: {PEOPLE.length} people, {ORGS.length} organisations
          and {TERMS.length} terms, each with every card it appears on and the strings between those
          cards. A card counts as carrying a name if the card is tagged with it or if the name appears in
          the card's own text; quoted sources are never searched. The glossary defines each term in the
          board's own words, so nothing here needs an encyclopaedia to follow.
          {' '}<Link to={{ view: 'files' }}>The files →</Link>
        </Section>

        <Section title="Every block has an address">
          Every page, card, lead, finding, person and term is its own address, and every section on a
          page has an anchor — hover a heading for the # and click it to copy the link. On the board,
          Copy link carries the open card, the clue or the rung you are on. Old links in the
          <code style={{ font: 'inherit', color: INK }}> ?view=</code> form still work and are rewritten.
        </Section>

        <Section title="Where the quoted sentences come from">
          Under a card, one sentence from the page it cites is shown in place, so a claim can be
          checked without leaving. For Wikipedia sources that sentence is the article's own text,
          reproduced under the Creative Commons Attribution-ShareAlike 4.0 licence, with the article
          named and linked beneath it. Where the author has read the source and chosen the line,
          the strip says so; where the match was made automatically, it says that instead. And
          where the cited page does not mention the entry at all, the strip says exactly that
          rather than letting a nearby paragraph imply support it does not give.
        </Section>

        <Section title="Record and scenario are different things">
          {events.length - projections.length} entries are record, {events.filter((e) => !e.future && e.url).length} of
          them linking to a public source. {projections.length} are scenarios, drawn on manila
          stock with a dashed edge and a confidence label — Likely, Uncertain or Speculative.
          {' '}{projections.filter((e) => e.why).length} carry the board's reasoning and{' '}
          {projections.filter((e) => e.url).length} carry a citation. They are scenarios about mechanisms, not forecasts about
          dates. Where a scenario names a year, treat the year as a placeholder and the
          mechanism as the claim.
        </Section>

        <Section title="Where the photographs come from">
          Images are Wikipedia lead photographs, cached at build time and looked up live as a
          fallback. Where an article has no freely licensed lead image, the card borrows a
          closely related article's photograph and says so, or shows a generated mark and
          admits there is no photo on file. Photographs remain under their own Wikimedia
          licences — check before reuse.
        </Section>

        <Section title="How it is kept">
          The board is the JSON in data/ — the entries, the strings, the leads, the files, the threads and the findings — and it is
          kept by its author. There is no editor on the site and no open contribution: the record is one reading, argued in one voice,
          and corrected when it is wrong. A test suite checks ids, years, sources, link targets and that every scenario is labelled
          before anything is published.
        </Section>
      </div>

      <div style={{ borderTop: RULE, paddingTop: 20, font: '400 11px/1.8 ' + MONO, color: ink(5), maxWidth: '64ch' }}>
        <span style={{ color: INK }}>Licence.</span> The board's own text — entries, readings, case notes, leads, files, glossary —
        is <a href="https://creativecommons.org/licenses/by-nc-nd/4.0/" target="_blank" rel="noopener">CC BY-NC-ND 4.0</a>:
        share it with credit, do not sell it, do not alter it. The code is
        <a href="https://github.com/mobahug/The_AI_Timeline/blob/main/LICENSE" target="_blank" rel="noopener"> PolyForm Noncommercial 1.0.0</a>:
        read it, run it, change it for any noncommercial purpose. Quoted sentences remain their publishers';
        Wikipedia text is CC BY-SA 4.0 and credited where shown. Photographs remain under their Wikimedia
        licences. Built with React and Vite; every page prerendered; deployed by GitHub Actions to GitHub Pages.
        {' '}<span style={{ color: INK }}>No analytics, no cookies.</span>
      </div>
    </div>
  );
}

// A page re-renders on its own route, not on the header's year ticking over.
export default React.memo(About);
