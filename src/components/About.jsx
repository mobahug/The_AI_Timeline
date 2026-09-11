import React from 'react';
import { NOW, events, links, projections } from '../lib/data.js';
import { INK, MONO, SERIF, SANS, micro } from '../lib/styles.js';

const Section = ({ title, children }) => (
  <section style={{ marginBottom: 44, maxWidth: '68ch' }}>
    <h2 style={{ margin: '0 0 14px', font: '400 27px/1.1 ' + SERIF, letterSpacing: '-0.025em' }}>{title}</h2>
    <div style={{ font: '400 14.5px/1.7 ' + SANS, color: 'rgba(243,240,234,0.66)', textWrap: 'pretty' }}>{children}</div>
  </section>
);

export default function About() {
  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', padding: '64px 32px 120px' }}>
      <div style={{ ...micro(0.42), letterSpacing: '0.24em', marginBottom: 24 }}>How this board works</div>

      <Section title="It argues, it does not list">
        Every string on the wall is a causal claim: the earlier card made the later one
        possible, or inevitable. The paper tag names the claim — <em>provoked</em>,
        <em> left a funding hole</em>, <em>was the warning for</em> — and {links.filter((l) => l.note).length} of
        the {links.length} strings carry a written case note explaining the reasoning. If a
        connection cannot be argued in a sentence, it does not get a string.
      </Section>

      <Section title="Where the quoted sentences come from">
        Under a card, one sentence from the page it cites is shown in place, so a claim can be
        checked without leaving. For Wikipedia sources that sentence is the article's own text,
        reproduced under the Creative Commons Attribution-ShareAlike 4.0 licence, with the article
        named and linked beneath it. Where a contributor has read the source and chosen the line,
        the strip says so; where the match was made automatically, it says that instead. And
        where the cited page does not mention the entry at all, the strip says exactly that
        rather than letting a nearby paragraph imply support it does not give.
      </Section>

      <Section title="Record and projection are different things">
        {events.length - projections.length} entries are record, {events.filter((e) => !e.future && e.url).length} of
        them linking to a public source. {projections.length} are projections, drawn on manila
        stock with a dashed edge and a confidence label — Likely, Uncertain or Speculative.
        {' '}{projections.filter((e) => e.why).length} carry the board's reasoning and{' '}
        {projections.filter((e) => e.url).length} carry a citation. They are scenarios about mechanisms, not predictions about
        dates. Where a projection names a year, treat the year as a placeholder and the
        mechanism as the claim.
      </Section>

      <Section title="Where the photographs come from">
        Images are Wikipedia lead photographs, cached at build time and looked up live as a
        fallback. Where an article has no freely licensed lead image, the card borrows a
        closely related article's photograph and says so, or shows a generated mark and
        admits there is no photo on file. Photographs remain under their own Wikimedia
        licences — check before reuse.
      </Section>

      <Section title="How to change it">
        The board is three JSON files. Add a card or a string in the editor, export the
        patch, and open a pull request against{' '}
        <a href="https://github.com/mobahug/The_AI_Timeline" target="_blank" rel="noopener">the repository</a>.
        A test suite checks ids, years, sources, link targets and that every projection is
        labelled. Contribution rules are in CONTRIBUTING.md.
      </Section>

      <div style={{ borderTop: '1px solid rgba(243,240,234,0.12)', paddingTop: 20, font: '400 11px/1.8 ' + MONO, color: 'rgba(243,240,234,0.36)', maxWidth: '60ch' }}>
        Code MIT. Entry text CC BY-SA 4.0. Built with React and Vite; deployed by GitHub
        Actions to GitHub Pages. <span style={{ color: INK }}>No analytics, no cookies.</span>
      </div>
    </div>
  );
}
