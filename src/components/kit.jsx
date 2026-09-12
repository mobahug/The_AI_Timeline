import React, { createContext, useContext, useState } from 'react';
import { accent, catLabel } from '../lib/data.js';
import { hrefFor, resolve } from '../lib/url.js';
import {
  INK, MONO, SANS, SERIF, STRING_INK, RULE, ROW_RULE, DASHED_RULE, DASHED_ROW, GUTTER,
  badge, button, headline, ink, micro, prose, reading, ref as refStyle, tag, yearBit
} from '../lib/styles.js';

/* The small components every page is built from. Presentational, one look each:
   the same object rendered here looks the same on the line, the board, the
   archive and the dossier. Styles come from styles.js; markup lives here. */

/* ─── Routing ────────────────────────────────────────────────────────────── */

const RouteContext = createContext({ route: { view: 'landing' }, navigate: () => {} });
export const RouteProvider = RouteContext.Provider;
export const useNav = () => useContext(RouteContext);

/** A navigation that pushes a history entry is a link: a real href, so it can be
 *  middle-clicked, copied and crawled. A replace-navigation or a no-URL action
 *  stays a button. `to` is a route patch, as navigate() takes it. */
export function Link({ to, replace, style, onClick, children, ...rest }) {
  const { route, navigate } = useNav();
  const href = hrefFor(resolve(route, to));
  const click = (e) => {
    if (onClick) onClick(e);
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    navigate(to, replace);
  };
  return (
    <a href={href} onClick={click} style={{ color: 'inherit', textDecoration: 'none', ...style }} {...rest}>
      {children}
    </a>
  );
}

/** A button, or a link that looks like one. */
export function Btn({ tone = 'quiet', size = 'md', to, href, style, children, ...rest }) {
  const s = { ...button(tone, size), ...style };
  if (to) return <Link to={to} style={s} {...rest}>{children}</Link>;
  if (href) return <a href={href} style={s} {...rest}>{children}</a>;
  return <button type="button" style={s} {...rest}>{children}</button>;
}

/* ─── Type ───────────────────────────────────────────────────────────────── */

/** The 9.5px uppercase label. `tier` = 'page' above an h1, 'section' above a block. */
export const Eyebrow = ({ tier, dim, style, as: As = 'div', children, ...rest }) => (
  <As style={{ ...micro(dim ? 5 : 4, tier), ...style }} {...rest}>{children}</As>
);

/** The body paragraph. */
export const Prose = ({ style, children, ...rest }) => (
  <p style={{ ...prose, ...style }} {...rest}>{children}</p>
);

/** The verb on a string. It carries its arrow wherever it sits between a source
 *  and a destination in reading flow; `sep="none"` where the direction is already
 *  drawn. `wrap` lets a long claim break in a narrow column. */
export const Claim = ({ tone, wrap, sep = 'arrow', style, children }) => (
  <span style={{
    font: '400 10px/' + (wrap ? '1.3' : '1.5') + ' ' + MONO, letterSpacing: '0.14em', textTransform: 'uppercase',
    color: tone || STRING_INK, whiteSpace: wrap ? 'normal' : 'nowrap', ...style
  }}>{children}{sep === 'arrow' ? ' →' : ''}</span>
);

/** An inline "year title" reference to a card; a link when given somewhere to go. */
export function Ref({ event, size = 15, to, onClick, style }) {
  const inner = <><span style={yearBit}>{event.year}</span>{event.title}</>;
  const s = { ...refStyle(size), ...style };
  if (to) return <Link to={to} style={s}>{inner}</Link>;
  if (onClick) {
    return (
      <button type="button" onClick={onClick} style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', ...s }}>
        {inner}
      </button>
    );
  }
  return <span style={s}>{inner}</span>;
}

/** The year · category · confidence · title headline of a card, at three scales.
 *  Never wraps itself in a button, so it can sit inside one. */
export function CardTriple({ event, size = 'panel', as: As = 'h2', showTag = true, lead, titleStyle, style }) {
  const h = headline(size);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: size === 'row' ? 6 : 10, minWidth: 0, ...style }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
        {lead}
        <span style={h.year}>{event.year}</span>
        {showTag && <span style={tag(event.category, accent)}>{catLabel(event.category)}</span>}
        {event.confidence && <span style={badge()}>{event.confidence}</span>}
      </div>
      <As style={{ ...h.title, ...titleStyle }}>{event.title}</As>
    </div>
  );
}

/** The author's reading of a card — its `why`. */
export const Reading = ({ event, size = 'md', maxWidth = '52ch', style }) =>
  event.why ? <p style={{ ...reading(event.category, accent, size), maxWidth, ...style }}>{event.why}</p> : null;

/* ─── Structure ──────────────────────────────────────────────────────────── */

/** The head of a page: eyebrow, h1, lede, and optionally a block of facts. */
export function PageHead({ eyebrow, title, lede, facts, h1Style, children }) {
  return (
    <div style={{ padding: '30px 0 0' }}>
      {children}
      {eyebrow && <Eyebrow tier="page" dim style={{ marginBottom: 16 }}>{eyebrow}</Eyebrow>}
      <h1 tabIndex={-1} style={{ margin: 0, outline: 'none', font: '400 clamp(38px,7.6vw,96px)/0.96 ' + SERIF, letterSpacing: '-0.04em', textWrap: 'balance', ...h1Style }}>
        {title}
      </h1>
      {lede && (
        <p style={{ margin: '18px 0 0', font: '400 clamp(14px,1.5vw,18px)/1.62 ' + SANS, color: ink(3), maxWidth: '52ch', textWrap: 'pretty' }}>{lede}</p>
      )}
      {facts && <div style={{ marginTop: 40, paddingTop: 22, borderTop: RULE }}>{facts}</div>}
    </div>
  );
}

/** A ruled section: the rule is always above the label. */
export function Section({ eyebrow, title, count, style, children, ...rest }) {
  return (
    <section style={{ marginTop: 44, paddingTop: 22, borderTop: RULE, ...style }} {...rest}>
      {(eyebrow || title || count) && (
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
          {eyebrow && <Eyebrow tier="section" dim>{eyebrow}</Eyebrow>}
          {title && <h2 style={{ margin: 0, font: '400 clamp(20px,2.4vw,26px)/1.1 ' + SERIF, letterSpacing: '-0.02em', color: INK }}>{title}</h2>}
          {count && <span style={micro(5)}>{count}</span>}
        </div>
      )}
      {children}
    </section>
  );
}

/** A rule drawn as its own element. */
export const Rule = ({ dashed, row, style }) => (
  <hr style={{ border: 0, borderTop: dashed ? (row ? DASHED_ROW : DASHED_RULE) : (row ? ROW_RULE : RULE), margin: 0, ...style }} />
);

/** One label / value row of a ledger. */
export const Ledger = ({ label, dim, align = 'left', children }) => (
  <div style={{
    display: 'grid', gridTemplateColumns: 'minmax(88px,110px) minmax(0,1fr)', gap: 14, alignItems: 'baseline',
    padding: align === 'right' ? '5px 0' : '6px 0', borderBottom: align === 'right' ? ROW_RULE : 'none'
  }}>
    <span style={micro(5)}>{label}</span>
    <span style={{ font: '400 12.5px/1.6 ' + MONO, color: ink(dim ? 4 : 3), minWidth: 0, overflowWrap: 'anywhere', textWrap: 'pretty', textAlign: align }}>{children}</span>
  </div>
);

/** The nav across the top and foot of a page: up-links on the left; siblings and
 *  at most one loud onward action on the right, rightmost. */
export function NavRow({ up = [], prev, next, onward, style }) {
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', ...style }}>
      {up.map((u, i) => <Btn key={i} to={u.to} onClick={u.onClick}>← {u.label}</Btn>)}
      <span style={{ flex: 1 }} />
      {prev && <Btn to={prev.to} onClick={prev.onClick}>← {prev.label}</Btn>}
      {next && <Btn to={next.to} onClick={next.onClick}>{next.label} →</Btn>}
      {onward && <Btn tone="loud" to={onward.to} onClick={onward.onClick}>{onward.label} →</Btn>}
    </div>
  );
}

/** A segmented control of pages: the header's three doors, the archive's costumes. */
export function Segmented({ items, value, label, size = 'md', style }) {
  return (
    <nav aria-label={label} style={{ display: 'flex', gap: 2, padding: 2, background: 'rgba(243,240,234,0.07)', borderRadius: 2, flexWrap: 'wrap', ...style }}>
      {items.map((it) => {
        const on = it.id === value;
        return (
          <Link
            key={it.id}
            to={it.to}
            aria-current={on ? 'page' : undefined}
            style={{
              ...micro(on ? 1 : 4), display: 'inline-block', padding: size === 'lg' ? '9px 13px' : '7px 12px', borderRadius: 2,
              whiteSpace: 'nowrap', letterSpacing: '0.12em',
              background: on ? INK : 'transparent', color: on ? '#0a0a0b' : ink(4)
            }}
          >{it.label}</Link>
        );
      })}
    </nav>
  );
}

/** A door to another page: eyebrow, title, a line of body, a derived figure. */
export function Door({ eyebrow, title, body, figure, to }) {
  return (
    <Link to={to} style={{
      display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-start', textAlign: 'left',
      background: 'rgba(243,240,234,0.035)', border: '1px solid rgba(243,240,234,0.1)',
      borderRadius: 3, padding: 'clamp(14px,2vw,20px)', minWidth: 0
    }}>
      <span style={micro(5, 'section')}>{eyebrow}</span>
      <span style={{ font: '400 clamp(20px,2.4vw,26px)/1.1 ' + SERIF, color: INK, letterSpacing: '-0.02em', textWrap: 'balance' }}>{title} →</span>
      <span style={{ font: '400 13px/1.55 ' + SANS, color: ink(4), textWrap: 'pretty' }}>{body}</span>
      {figure && <span style={{ font: '400 11px/1.6 ' + MONO, color: ink(5), marginTop: 2 }}>{figure}</span>}
    </Link>
  );
}

/** The grid two or more doors sit in. */
export const Doors = ({ children }) => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,280px),1fr))', gap: 'clamp(12px,2vw,20px)' }}>{children}</div>
);

/** Nothing matches: say what, and offer the way out. */
export function Empty({ noun = 'entry', route, navigate, style }) {
  const q = route && route.query;
  const cat = route && route.category !== 'all' ? catLabel(route.category) : '';
  const filtered = !!(q || cat);
  return (
    <div role="status" style={{ padding: '140px 0', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, ...style }}>
      <span style={{ ...micro(5), letterSpacing: '0.14em' }}>
        No {noun} matches{q ? ' “' + q + '”' : ''}{cat ? ' in ' + cat : ''}.
      </span>
      {filtered && navigate && (
        <Btn tone="dim" onClick={() => navigate({ category: 'all', query: '' }, true)} style={{ pointerEvents: 'auto' }}>Show everything</Btn>
      )}
    </div>
  );
}

/* ─── Evidence ───────────────────────────────────────────────────────────── */

export const CC = 'https://creativecommons.org/licenses/by-sa/4.0/';

/** A quoted sentence. 'claim' = a contributor chose it in support (string-inked);
 *  'context' and 'auto' = background or a machine match, which never outranks a
 *  hand-chosen line. */
export const Quote = ({ tone = 'context', top = 0, children }) => (
  <blockquote style={{
    margin: top ? top + 'px 0 0' : 0, font: '400 14px/1.55 ' + SANS, textWrap: 'pretty', paddingLeft: 12,
    color: tone === 'claim' ? 'rgba(243,240,234,0.88)' : ink(3),
    borderLeft: '2px solid ' + (tone === 'claim' ? STRING_INK : 'rgba(243,240,234,0.22)')
  }}>
    <span style={{ color: STRING_INK }}>“</span>{children}<span style={{ color: STRING_INK }}>”</span>
  </blockquote>
);

/** The attribution under a quote. Wikipedia text is CC BY-SA 4.0; the credit that
 *  licence requires is the word Wikipedia, the article title linked, and the
 *  licence linked — always visible, never inside a disclosure. */
export const Credit = ({ cited, publisher, auto }) => (
  <div style={{ font: '400 10px/1.7 ' + MONO, color: ink(4), letterSpacing: '0.04em', marginTop: 7, overflowWrap: 'anywhere' }}>
    {cited && cited.wikipedia ? (
      <>
        Wikipedia, <a href={cited.url} target="_blank" rel="noopener" style={{ color: 'rgba(243,240,234,0.55)' }}><em>{cited.title}</em></a>
        {' · '}<a href={CC} target="_blank" rel="noopener" style={{ color: 'rgba(243,240,234,0.55)' }}>CC BY-SA 4.0</a>
        {auto ? ' · matched automatically' : ''}
      </>
    ) : (
      <>{publisher || 'Source'}{cited && cited.url ? <> · <a href={cited.url} target="_blank" rel="noopener" style={{ color: 'rgba(243,240,234,0.55)' }}>read at source ↗</a></> : null}</>
    )}
  </div>
);

/** "Read / Hide the article's opening". */
export function Disclosure({ label = 'the article’s opening', children }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        style={{ ...micro(5), background: 'transparent', border: 'none', padding: '8px 0 0', cursor: 'pointer' }}
      >
        {open ? 'Hide ' + label + ' ▴' : 'Read ' + label + ' ▾'}
      </button>
      {open && children}
    </>
  );
}

/** The cited page does not mention the entry. Said plainly, in the site's voice. */
export const Gap = ({ title }) => (
  <>
    <Eyebrow tier="section" dim style={{ marginBottom: 7 }}>Not on the cited page</Eyebrow>
    <p style={{ margin: 0, font: '400 12.5px/1.55 ' + SANS, color: ink(4), textWrap: 'pretty' }}>
      No sentence in {title ? <em>{title}</em> : 'the cited page'} names this entry or its year. The page is cited for
      background, not as evidence for the claim.
    </p>
  </>
);

/** The gutter every page shares, for the few places that lay out by hand. */
export { GUTTER };
