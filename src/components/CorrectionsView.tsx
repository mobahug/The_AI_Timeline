import React, { use, useEffect } from 'react';
import type { Correction, Graph, Route, RoutePatch } from '../lib/types';
import type { Navigate } from '../lib/url';
import { CORRECTION_KIND, REGISTER_PAGES, loadRegisterPage, registerPageNow, registerPageOf } from '../lib/corrections';
import { PER_PAGE } from '../lib/register';
import { dayText } from '../lib/data';
import { leadById } from '../lib/leads';
import { entityById } from '../lib/files';
import { questionById } from '../lib/questions';
import { findingByNumber } from '../lib/spine';
import { INK, MONO, SANS, SERIF, RULE, ROW_RULE, ink, micro, shell, pageTitle } from '../lib/styles';
import { Btn, Link, NavRow, PageHead, Ref, Segmented } from './kit';

/* Corrections: every change of fact the board has made to its own record,
   newest first, as its history has it. Each says what the record said, what it
   says now, why, and which source settled it, and links the commit that made
   the change, so the change itself can be read. The register prints them a
   page at a time (lib/register.ts): the newest at /corrections/, the ones
   before at /corrections/2/ and on. */

const COMMIT = 'https://github.com/mobahug/The_AI_Timeline/commit/';

/** Where a correction other than a card's lives, as a link and a name. */
function placeOf(file: string, id: string, graph: Graph): { to: RoutePatch; label: string } | null {
  if (file === 'data/events.json') return graph.index[id] ? { to: { view: 'card', id }, label: graph.index[id].year + ' · ' + graph.index[id].title } : null;
  if (file === 'data/leads.json') return leadById[id] ? { to: { view: 'lead', id }, label: 'the lead ' + leadById[id].title } : null;
  if (file === 'data/links.json') {
    const [from, to] = id.split('>');
    const a = graph.index[from];
    const b = graph.index[to];
    return a && b ? { to: { view: 'board', clue: { from, to } }, label: 'the string from ' + a.title + ' to ' + b.title } : null;
  }
  const kind = file === 'data/people.json' ? 'person' : file === 'data/orgs.json' ? 'org' : file === 'data/glossary.json' ? 'term' : null;
  if (kind) {
    const x = entityById(kind, id);
    return x ? { to: { view: kind, id }, label: (kind === 'term' ? 'the glossary’s ' : 'the file on ') + x.label } : null;
  }
  if (file === 'data/watch.json') return { to: { view: 'latest', hash: 'watch' }, label: 'a date to watch' };
  if (file === 'data/questions.json') return questionById[id] ? { to: { view: 'question', id }, label: 'the plain question “' + questionById[id].question + '”' } : null;
  if (file === 'data/spine.json') {
    const f = findingByNumber(id);
    return f ? { to: { view: 'finding', finding: String(f.n) }, label: 'finding ' + f.n + ', ' + f.title } : null;
  }
  return null;
}

function Entry({ c, graph }: { c: Correction; graph: Graph }) {
  const card = c.event ? graph.index[c.event] : null;
  const place = !card && c.where ? placeOf(c.where.file, c.where.id, graph) : null;
  const also = (c.alsoIn || []).map((a) => placeOf(a.file, a.id, graph)).filter((x): x is { to: RoutePatch; label: string } => !!x);
  return (
    <li id={c.id} style={{ borderTop: ROW_RULE, padding: 'clamp(18px,2.6vw,24px) 0', display: 'flex', flexDirection: 'column', gap: 10, scrollMarginTop: 96 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span style={{ ...micro(2), border: '1px solid rgba(243,240,234,0.22)', borderRadius: 2, padding: '3px 7px', letterSpacing: '0.12em' }}>{CORRECTION_KIND[c.kind]}</span>
        <span style={{ ...micro(5), letterSpacing: '0.12em' }}>{dayText(c.date)}</span>
      </div>
      {card ? <Ref event={card} size="clamp(17px,2vw,21px)" to={{ view: 'card', id: card.id }} />
        : place ? <Link to={place.to} className="ix-ref" style={{ font: '400 clamp(17px,2vw,21px)/1.3 ' + SERIF, color: INK }}>{place.label}</Link>
        : null}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,280px),1fr))', gap: '10px clamp(16px,3vw,28px)' }}>
        <div>
          <div style={{ ...micro(5), marginBottom: 6 }}>It said</div>
          <p style={{ margin: 0, font: '400 14.5px/1.55 ' + SERIF, color: ink(4), textDecoration: 'line-through', textDecorationColor: 'rgba(243,240,234,0.3)', textWrap: 'pretty' }}>{c.was}</p>
        </div>
        <div>
          <div style={{ ...micro(5), marginBottom: 6 }}>It says</div>
          <p style={{ margin: 0, font: '400 14.5px/1.55 ' + SERIF, color: ink(2), textWrap: 'pretty' }}>{c.now}</p>
        </div>
      </div>
      <p style={{ margin: 0, font: '400 14px/1.6 ' + SANS, color: ink(3), maxWidth: '68ch', textWrap: 'pretty' }}>{c.why}</p>
      <p style={{ margin: 0, font: '400 11.5px/1.7 ' + MONO, color: ink(4), overflowWrap: 'anywhere' }}>
        {c.source && <>Settled by <a href={c.source.url} target="_blank" rel="noopener" className="ix-ref" style={{ color: ink(2) }}>{c.source.publisher}, {c.source.title} ↗</a>. </>}
        {also.length > 0 && <>The same fix in {also.map((a, i) => (
          <React.Fragment key={i}>{i ? (i === also.length - 1 ? ' and ' : ', ') : ''}<Link to={a.to} className="ix-ref" style={{ color: ink(2) }}>{a.label}</Link></React.Fragment>
        ))}. </>}
        <a href={COMMIT + c.commit} target="_blank" rel="noopener" className="ix-ref" style={{ color: ink(3) }}>The change, commit {c.commit} ↗</a>
      </p>
    </li>
  );
}

/** The address of a page of the register. */
const pageAt = (n: number): RoutePatch => (n === 1 ? { view: 'corrections' } : { view: 'register', id: String(n) });

function CorrectionsView({ graph, route, navigate }: { graph: Graph; route: Route; navigate: Navigate }) {
  const page = registerPageOf(route);
  // An address can name an entry, or a month, on a page that newer entries
  // have since moved it off: a link from before, or from another site. The
  // page that prints it now is looked up in the register's index, which only
  // a reader sent on needs, and the reader is sent on to it.
  useEffect(() => {
    const hash = route.hash;
    if (!hash || document.getElementById(hash)) return;
    let live = true;
    import('virtual:register-index').then(({ default: index }) => {
      const at = Object.hasOwn(index, hash) ? index[hash] : null;
      if (live && at && at !== page) navigate({ ...pageAt(at), hash }, true);
    }).catch(() => {});
    return () => { live = false; };
  }, [route.hash, page, navigate]);

  if (!page) {
    return (
      <div style={shell('route')}>
        <div style={{ padding: '80px 0', ...micro(5) }}>There is no page {route.id} of the register. It has {REGISTER_PAGES}.</div>
        <Btn to={{ view: 'corrections' }}>← The newest corrections</Btn>
      </div>
    );
  }
  // A turn here waits for the page's entries (App's waitFor), and the server
  // and the hydration have them from the start; a page drawn without them
  // waits for them here.
  const here = registerPageNow(page) || use(loadRegisterPage(page));
  const months: { month: string; items: Correction[] }[] = [];
  for (const c of here.corrections) {
    const month = c.date.slice(0, 7);
    const last = months[months.length - 1];
    if (last && last.month === month) last.items.push(c); else months.push({ month, items: [c] });
  }
  const paged = REGISTER_PAGES > 1;
  const turn = (
    <NavRow
      prev={page > 1 ? { label: 'Newer corrections', to: pageAt(page - 1) } : null}
      next={page < REGISTER_PAGES ? { label: 'Older corrections', to: pageAt(page + 1) } : null}
    />
  );
  return (
    <div style={shell('route')}>
      <PageHead
        eyebrow={'Corrections · ' + here.total + ' corrections · ' + here.cards + ' cards · from the board’s history'
          + (paged ? ' · page ' + page + ' of ' + REGISTER_PAGES : '')}
        title="Corrections."
        lede={here.note + ' Most were found by reading a card against its own primary source; each names the source that settled it and links the change itself.'}
        h1Style={pageTitle('index')}
      />
      {paged && page > 1 && <div style={{ marginTop: 28 }}>{turn}</div>}
      {months.map(({ month, items }) => {
        // A month the page before began, or the page after goes on with, says
        // which of its entries this page prints.
        const { total, before } = here.months[month];
        const whole = before === 0 && items.length === total;
        return (
          <section key={month} id={before === 0 ? 'm-' + month : undefined} style={{ marginTop: 40, borderTop: RULE, paddingTop: 20 }}>
            <h2 style={{ margin: '0 0 6px', font: '400 clamp(22px,2.6vw,28px)/1.1 ' + SERIF, letterSpacing: '-0.02em', color: INK }}>{dayText(month)}{before > 0 ? ', continued' : ''}</h2>
            <div style={{ ...micro(5) }}>
              {total} {total === 1 ? 'correction' : 'corrections'}{whole ? '' : ' · ' + (before + 1) + (items.length > 1 ? '–' + (before + items.length) : '') + ' on this page'}
            </div>
            <ol style={{ listStyle: 'none', margin: '14px 0 0', padding: 0 }}>
              {items.map((c) => <Entry key={c.id} c={c} graph={graph} />)}
            </ol>
          </section>
        );
      })}
      {paged && (
        <div style={{ borderTop: RULE, marginTop: 30, paddingTop: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {turn}
          <Segmented
            label="Pages of the register"
            value={String(page)}
            items={Array.from({ length: REGISTER_PAGES }, (_, i) => ({
              id: String(i + 1),
              label: String(i + 1),
              to: pageAt(i + 1),
              hint: 'Corrections ' + (i * PER_PAGE + 1) + '–' + Math.min((i + 1) * PER_PAGE, here.total) + ', newest first'
            }))}
          />
        </div>
      )}
      <div style={{ borderTop: RULE, marginTop: 30, paddingTop: 22, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <Btn to={{ view: 'latest', hash: 'changes' }}>Everything that changed lately →</Btn>
        <Btn to={{ view: 'about' }}>How the board is kept →</Btn>
      </div>
    </div>
  );
}

export default React.memo(CorrectionsView);
