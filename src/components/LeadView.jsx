import React from 'react';
import { NOW, accent, catLabel } from '../lib/data.js';
import { LEADS, leadById, buildLead } from '../lib/leads.js';
import { INK, MONO, SANS, SERIF, RULE, ROW_RULE, PHOTO_FILTER, PLACEHOLDER, badge, frame, ink, micro, shell } from '../lib/styles.js';
import { Anchor, Btn, Claim, CopyLink, Eyebrow, Link, NavRow, PageHead, Ref, Section } from './kit.jsx';

/* One lead in full: the question, where it stands, and the ladder — every rung
   with its card, the level it reached, the sentence that connects it to the
   next, and the string on the board (if any) that already joins them. */

const KIND = { capability: 'Capability', failure: 'Failure', economy: 'Economy' };

function LeadView({ graph, route, media }) {
  const lead = leadById[route.id];
  if (!lead) {
    return (
      <div style={shell('route')}>
        <div style={{ padding: '80px 0', ...micro(5) }}>There is no lead “{route.id}”. The board has {LEADS.length}.</div>
        <Btn to={{ view: 'leads' }}>← The leads</Btn>
      </div>
    );
  }
  const b = buildLead(graph, lead);
  const n = LEADS.findIndex((l) => l.id === lead.id);
  const prev = LEADS[n - 1];
  const next = LEADS[n + 1];
  const tone = 'oklch(0.8 0.12 ' + lead.hue + ')';

  const nav = (
    <NavRow
      up={[{ label: 'The leads', to: { view: 'leads' } }]}
      prev={prev && { label: prev.title, to: { view: 'lead', id: prev.id } }}
      next={next && { label: next.title, to: { view: 'lead', id: next.id } }}
      onward={{ label: 'Follow on the board', to: { view: 'board', lead: lead.id, rung: 1, category: 'all', query: '' } }}
    />
  );

  return (
    <div style={shell('route')}>
      <PageHead
        eyebrow={'Lead ' + String(n + 1).padStart(2, '0') + ' · ' + (KIND[lead.kind] || lead.kind) + (b.span ? ' · ' + b.span.from + ' — ' + b.span.to : '') + ' · ' + b.rungs.length + ' rungs'}
        title={lead.title}
        lede={lead.question}
        h1Style={{ font: '400 clamp(32px,6vw,72px)/0.98 ' + SERIF, letterSpacing: '-0.035em' }}
      >
        {nav}
      </PageHead>

      <div style={{ marginTop: 26, display: 'flex', gap: 'clamp(16px,3vw,40px)', flexWrap: 'wrap' }}>
        <p style={{ margin: 0, flex: '1 1 320px', minWidth: 0, font: '400 14.5px/1.65 ' + SANS, color: ink(3), maxWidth: '60ch', textWrap: 'pretty' }}>{lead.blurb}</p>
        <div style={{ flex: '1 1 300px', minWidth: 0, borderLeft: '2px solid ' + tone, paddingLeft: 14 }}>
          <Eyebrow tier="section" style={{ marginBottom: 8 }}>Where it stands · {NOW}</Eyebrow>
          <p style={{ margin: 0, font: '400 15px/1.55 ' + SERIF, color: ink(2), maxWidth: '54ch', textWrap: 'pretty' }}>{lead.standing}</p>
        </div>
      </div>

      <Section id="ladder" eyebrow="The ladder" title="Rung by rung" count={b.strung + ' of ' + b.steps.length + ' steps carry a string'}>
        <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {b.rungs.map((r, i) => {
            const e = r.card;
            const shot = media ? media(e) : { img: '' };
            const step = i > 0 ? b.steps[i - 1] : null;
            return (
              <li key={r.event} id={'rung-' + r.n} style={{ borderTop: i ? ROW_RULE : 'none', padding: '22px 0', scrollMarginTop: 96 }}>
                {/* The joint above this rung: the string the board draws, or the lead's own dashed line. */}
                {step && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
                    <span aria-hidden="true" style={{ width: 28, height: 0, borderTop: step.string ? '2px solid ' + accent(graph.index[step.string.from].category, 0) : '1px dashed ' + tone, flex: 'none' }} />
                    {step.string ? (
                      <Link to={{ view: 'board', clue: { from: step.string.from, to: step.string.to } }} style={{ display: 'inline-flex', gap: 8, alignItems: 'baseline', flexWrap: 'wrap' }}>
                        <Claim tone={accent(graph.index[step.string.from].category, 0)} sep="none">{step.string.claim}</Claim>
                        <span style={micro(5)}>a string on the board · open the clue →</span>
                      </Link>
                    ) : (
                      <span style={micro(5)}>no string between these two — the lead is the only argument here</span>
                    )}
                  </div>
                )}

                <div className="anchored" style={{ display: 'flex', gap: 'clamp(14px,3vw,26px)', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  <div style={{ flex: 'none', width: 54 }}>
                    <Anchor id={'rung-' + r.n} label={r.label} style={{ font: '400 clamp(24px,3vw,34px)/1 ' + SERIF, color: tone, fontVariantNumeric: 'tabular-nums' }}>{String(r.n).padStart(2, '0')}</Anchor>
                  </div>

                  <div aria-hidden="true" style={{
                    ...frame(e.future), flex: 'none', width: 96, height: 96,
                    backgroundImage: shot.img ? 'url(' + shot.img + ')' : PLACEHOLDER, backgroundSize: 'cover', backgroundPosition: 'center',
                    filter: shot.img ? PHOTO_FILTER : undefined
                  }} />

                  <div style={{ flex: '1 1 300px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 9 }}>
                    <Eyebrow tier="section" style={{ color: tone }}>{r.label}</Eyebrow>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
                      <Ref event={e} size="clamp(17px,2vw,22px)" to={{ view: 'card', id: e.id }} />
                      <span style={micro(5)}>{catLabel(e.category)}</span>
                      {e.confidence && <span style={badge()}>{e.confidence}</span>}
                    </div>
                    <p style={{ margin: 0, font: '400 13.5px/1.55 ' + SANS, color: ink(4), maxWidth: '62ch', textWrap: 'pretty' }}>{e.summary}</p>
                    <p style={{ margin: 0, font: '400 15px/1.55 ' + SERIF, color: ink(2), maxWidth: '58ch', textWrap: 'pretty', borderLeft: '2px solid ' + tone, paddingLeft: 12 }}>{r.text}</p>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginTop: 2 }}>
                      <Btn size="sm" to={{ view: 'card', id: e.id }}>Open the dossier →</Btn>
                      <Btn size="sm" tone="dim" to={{ view: 'board', lead: lead.id, rung: r.n, category: 'all', query: '' }}>This rung on the board</Btn>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </Section>

      <Section id="share" eyebrow="Share">
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <CopyLink label="Copy link to this lead" size="md" />
          <span style={{ ...micro(5), textTransform: 'none', letterSpacing: '0.06em', font: '400 11px/1.6 ' + MONO }}>Every rung has its own address — hover a number for the # link.</span>
        </div>
      </Section>

      <Section>{nav}</Section>

      <div style={{ borderTop: RULE, marginTop: 30, paddingTop: 22, ...micro(5), letterSpacing: '0.1em', textTransform: 'none', font: '400 11.5px/1.8 ' + MONO, maxWidth: '72ch', color: ink(5) }}>
        Rungs are ordered by the author, not by year: a lead may step sideways to the card that explains the next
        step. Everything past {NOW} is a scenario, drawn dashed. <span style={{ color: INK }}>Where the lead disagrees with the board's strings, the strings win</span> — they are the claims a contributor was willing to write down.
      </div>
    </div>
  );
}

export default React.memo(LeadView);
