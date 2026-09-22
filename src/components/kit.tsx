import React, { createContext, forwardRef, useContext, useEffect, useState } from 'react';
import type { CSSProperties, ElementType, MouseEvent, ReactNode } from 'react';
import { accent, catLabel } from '../lib/data';
import { hrefFor, resolve } from '../lib/url';
import type { Navigate } from '../lib/url';
import { useMode } from '../lib/mode';
import { absolute, copyText } from '../lib/dom';
import {
  INK, MONO, SANS, SERIF, STRING_INK, RULE, ROW_RULE, DASHED_RULE, DASHED_ROW, GUTTER,
  badge, button, headline, ink, micro, prose, reading, ref as refStyle, tag, yearBit
} from '../lib/styles';
import type { HeadlineSize, Size, Tier, Tone } from '../lib/styles';
import type { Entity, Event, Figure, Route, RoutePatch, Shot } from '../lib/types';

/* The small components every page is built from. Presentational, one look each:
   the same object rendered here looks the same on the line, the board, the
   archive and the dossier. Styles come from styles.ts; markup lives here. */

/* ─── Routing ────────────────────────────────────────────────────────────── */

export interface Nav { route: Route; navigate: Navigate }
const RouteContext = createContext<Nav>({
  route: { view: 'landing', id: null, finding: null, category: 'all', query: '', clue: null, lead: null, rung: null, hash: null },
  navigate: () => {}
});
export const RouteProvider = RouteContext.Provider;
export const useNav = (): Nav => useContext(RouteContext);

type AnchorProps = Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'>;
type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement>;

export interface LinkProps extends AnchorProps {
  to: RoutePatch;
  replace?: boolean;
}

/** A navigation that pushes a history entry is a link: a real href, so it can be
 *  middle-clicked, copied and crawled. A replace-navigation or a no-URL action
 *  stays a button. `to` is a route patch, as navigate() takes it. */
export function Link({ to, replace, style, onClick, className, children, ...rest }: LinkProps) {
  const { route, navigate } = useNav();
  const href = hrefFor(resolve(route, to));
  const click = (e: MouseEvent<HTMLAnchorElement>) => {
    if (onClick) onClick(e);
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    navigate(to, replace);
  };
  return (
    <a href={href} onClick={click} className={className ? 'ix ' + className : undefined} style={{ color: 'inherit', textDecoration: 'none', ...style }} {...rest}>
      {children}
    </a>
  );
}

/** A button, or a link that looks like one. The event handlers it takes are
 *  those an anchor and a button share. */
export interface BtnProps extends Omit<ButtonProps, 'onClick' | 'type'> {
  tone?: Tone;
  size?: Size;
  to?: RoutePatch;
  href?: string;
  target?: string;
  rel?: string;
  onClick?: (e: MouseEvent<HTMLElement>) => void;
}
export const Btn = forwardRef<HTMLElement, BtnProps>(function Btn({ tone = 'quiet', size = 'md', to, href, style, children, ...rest }, ref) {
  const s = { ...button(tone, size), ...style };
  if (to) return <Link to={to} className="ix-btn" data-tone={tone} style={s} {...(rest as AnchorProps)}>{children}</Link>;
  if (href) return <a ref={ref as React.Ref<HTMLAnchorElement>} href={href} className="ix ix-btn" data-tone={tone} style={s} {...(rest as AnchorProps)}>{children}</a>;
  return <button ref={ref as React.Ref<HTMLButtonElement>} type="button" className="ix ix-btn" data-tone={tone} style={s} {...(rest as ButtonProps)}>{children}</button>;
});

/* ─── Type ───────────────────────────────────────────────────────────────── */

/** The 9.5px uppercase label. `tier` = 'page' above an h1, 'section' above a block. */
export interface EyebrowProps extends React.HTMLAttributes<HTMLElement> { tier?: Tier; dim?: boolean; as?: ElementType }
export const Eyebrow = ({ tier, dim, style, as: As = 'div', children, ...rest }: EyebrowProps) => (
  <As style={{ ...micro(dim ? 5 : 4, tier), ...style }} {...rest}>{children}</As>
);

/** The body paragraph. */
export const Prose = ({ style, children, ...rest }: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p style={{ ...prose, ...style }} {...rest}>{children}</p>
);

/** The verb on a string. It carries its arrow wherever it sits between a source
 *  and a destination in reading flow; `sep="none"` where the direction is already
 *  drawn. `wrap` lets a long claim break in a narrow column. */
export interface ClaimProps { tone?: string; wrap?: boolean; sep?: 'arrow' | 'none'; style?: CSSProperties; children?: ReactNode }
export const Claim = ({ tone, wrap, sep = 'arrow', style, children }: ClaimProps) => (
  <span style={{
    font: '400 10px/' + (wrap ? '1.3' : '1.5') + ' ' + MONO, letterSpacing: '0.14em', textTransform: 'uppercase',
    color: tone || STRING_INK, whiteSpace: wrap ? 'normal' : 'nowrap', ...style
  }}>{children}{sep === 'arrow' ? ' →' : ''}</span>
);

/** An inline "year title" reference to a card; a link when given somewhere to go. */
export interface RefProps { event: Event; size?: number | string; to?: RoutePatch; onClick?: (e: MouseEvent<HTMLButtonElement>) => void; mono?: boolean; style?: CSSProperties }
export function Ref({ event, size = 15, to, onClick, mono, style }: RefProps) {
  // In a ledger the whole row is mono, and the year is already the row's own
  // first word: the serif title and its separate year chip would both be a
  // change of voice in the middle of a sentence.
  const inner = mono ? <>{event.year} {event.title}</> : <><span style={yearBit}>{event.year}</span>{event.title}</>;
  const s = { ...refStyle(size, mono), ...style };
  if (to) return <Link to={to} className="ix-ref" style={s}>{inner}</Link>;
  if (onClick) {
    return (
      <button type="button" className="ix ix-ref" onClick={onClick} style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', ...s }}>
        {inner}
      </button>
    );
  }
  return <span style={s}>{inner}</span>;
}

/** The year · category · confidence · title headline of a card, at three scales.
 *  Never wraps itself in a button, so it can sit inside one. */
export interface CardTripleProps {
  event: Event; size?: HeadlineSize; as?: ElementType; showTag?: boolean; lead?: ReactNode; titleStyle?: CSSProperties; style?: CSSProperties;
}
export function CardTriple({ event, size = 'panel', as: As = 'h2', showTag = true, lead, titleStyle, style }: CardTripleProps) {
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
export const Reading = ({ event, size = 'md', maxWidth = '52ch', style }: { event: Event; size?: 'md' | 'lg'; maxWidth?: number | string; style?: CSSProperties }) =>
  event.why ? <p style={{ ...reading(event.category, accent, size), maxWidth, ...style }}>{event.why}</p> : null;

/* ─── Structure ──────────────────────────────────────────────────────────── */

/** The head of a page: eyebrow, h1, lede, and optionally a block of facts. */
export interface PageHeadProps { eyebrow?: ReactNode; title: ReactNode; lede?: ReactNode; facts?: ReactNode; h1Style?: CSSProperties; children?: ReactNode }
export function PageHead({ eyebrow, title, lede, facts, h1Style, children }: PageHeadProps) {
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

/** A heading that is a real link to its own section, copied on click. The #
 *  beside it is its mark, drawn when the row is hovered or the link is focused,
 *  as on every documentation site a reader has used; alone, with no children,
 *  the # is the whole link. */
export function Anchor({ id, label, style, children }: { id: string; label?: ReactNode; style?: CSSProperties; children?: ReactNode }) {
  const { route } = useNav();
  const [done, setDone] = useState(false);
  const href = hrefFor({ ...route, hash: id });
  useEffect(() => { if (!done) return; const t = setTimeout(() => setDone(false), 1400); return () => clearTimeout(t); }, [done]);
  // With children the heading itself is the link and the # is its mark, sized
  // to the heading; alone, the # is the whole link, at a size a finger finds.
  const mark = children
    ? { fontSize: '0.5em', marginLeft: '0.4em', verticalAlign: '0.28em', letterSpacing: 0 }
    : { fontSize: 11, padding: '2px 4px', letterSpacing: 0 };
  return (
    <a
      href={href}
      className="anchor"
      aria-label={children ? undefined : 'Link to ' + (typeof label === 'string' ? label : 'this section')}
      title={done ? 'Copied' : 'Copy link to this section'}
      style={style}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        // Inside the board's file drawer the section belongs to the dossier's
        // address, not the board's: copy it, but leave the board's address alone.
        if (new URL(href, window.location.origin).pathname === window.location.pathname) window.history.replaceState(window.history.state, '', href);
        copyText(absolute(href)).then((ok) => setDone(!!ok));
      }}
    >
      {children}
      <span className="anchor-mark" aria-hidden={children ? 'true' : undefined} style={{ fontFamily: MONO, fontWeight: 400, lineHeight: 1, whiteSpace: 'nowrap', color: done ? INK : ink(2), ...mark }}>
        {done ? 'copied' : '#'}
      </span>
    </a>
  );
}

/** A ruled section: the rule is always above the label. Given an `id` it is
 *  addressable — the heading grows an anchor and a #id link lands on it. */
export interface SectionProps extends Omit<React.HTMLAttributes<HTMLElement>, 'title'> { id?: string; eyebrow?: ReactNode; title?: ReactNode; count?: ReactNode }
export function Section({ id, eyebrow, title, count, style, children, ...rest }: SectionProps) {
  return (
    <section id={id} style={{ marginTop: 44, paddingTop: 22, borderTop: RULE, scrollMarginTop: 96, ...style }} {...rest}>
      {(eyebrow || title || count) && (
        <div className={id ? 'anchored' : undefined} style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
          {eyebrow && <Eyebrow tier="section" dim>{eyebrow}</Eyebrow>}
          {title && <h2 style={{ margin: 0, font: '400 clamp(20px,2.4vw,26px)/1.1 ' + SERIF, letterSpacing: '-0.02em', color: INK }}>{id ? <Anchor id={id} label={title}>{title}</Anchor> : title}</h2>}
          {count && <span style={micro(5)}>{count}</span>}
          {id && !title && <Anchor id={id} label={eyebrow} />}
        </div>
      )}
      {children}
    </section>
  );
}

/* ─── Brief and full ─────────────────────────────────────────────────────
   A page is prerendered once and read in either mode, so both readings are in
   the document and CSS shows the one the reader chose — `data-mode` is on
   <html> before the first paint (index.html), and the rules are in base.css.
   Nothing is measured, nothing is swapped, and a page does not grow under a
   hash link a moment after it lands. `display: contents` means neither wrapper
   is a box: the children lay out exactly as they would without it.

   Only the surplus is wrapped. Where brief shows the first of something and
   full shows all of it, the first one is rendered once, outside — so no reader
   and no crawler meets the same paragraph twice. */

/** The reading only the whole file carries. */
export const Full = ({ children }: { children?: ReactNode }) => <div className="mode-full">{children}</div>;
/** What stands in its place in brief. */
export const Brief = ({ children }: { children?: ReactNode }) => <div className="mode-brief">{children}</div>;

/** The line brief shows in place of what it leaves out: what is there, and the
 *  switch — so nothing is dropped silently. Put it inside a `Brief`. */
export function FullOnly({ label }: { label?: ReactNode }) {
  const [, setMode] = useMode();
  return (
    <button
      type="button"
      className="ix ix-btn"
      onClick={() => setMode('full')}
      style={{ ...micro(4), background: 'transparent', border: '1px dashed rgba(243,240,234,0.22)', borderRadius: 2, padding: '8px 11px', cursor: 'pointer', textAlign: 'left', display: 'inline-block' }}
    >
      {label || 'More in the full file'} · switch to full →
    </button>
  );
}

/** A "Copy link" button: the absolute address of the current route, or of a
 *  route given as `to`. Says "Copied" for a moment. */
export function CopyLink({ to, label = 'Copy link', size = 'sm', tone = 'quiet', style }: { to?: RoutePatch; label?: ReactNode; size?: Size; tone?: Tone; style?: CSSProperties }) {
  const { route } = useNav();
  const [done, setDone] = useState(false);
  useEffect(() => { if (!done) return; const t = setTimeout(() => setDone(false), 1400); return () => clearTimeout(t); }, [done]);
  const href = to ? hrefFor(resolve(route, to)) : hrefFor(route);
  return (
    <Btn size={size} tone={tone} style={style} onClick={() => copyText(absolute(href)).then((ok) => setDone(!!ok))} aria-live="polite">
      {done ? 'Copied ✓' : label}
    </Btn>
  );
}

/** A row of entity chips — people, organisations, terms — each a link to its
 *  page in the files. A term's chip carries its one-line gloss as a title. */
export function Chips({ items, label, style }: { items?: Entity[]; kind?: string; label?: ReactNode; style?: CSSProperties }) {
  if (!items || !items.length) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap', ...style }}>
      {label && <span style={{ ...micro(5), flex: 'none' }}>{label}</span>}
      {items.map((x) => (
        <Link
          key={x.kind + x.id}
          to={{ view: x.kind, id: x.id }}
          className="ix-chip"
          title={(x.kind === 'term' ? x.short : x.role) || undefined}
          style={{
            ...micro(3), letterSpacing: '0.1em', textTransform: 'none', font: '400 11px/1 ' + MONO,
            border: '1px solid rgba(243,240,234,0.16)', borderRadius: 2, padding: '5px 8px', whiteSpace: 'nowrap',
            borderLeft: '2px solid ' + (x.kind === 'person' ? 'oklch(0.8 0.12 85)' : x.kind === 'org' ? 'oklch(0.8 0.1 205)' : 'rgba(243,240,234,0.35)')
          }}
        >{x.label}</Link>
      ))}
    </div>
  );
}

/** The figures on a card: label / value pairs, set as a small ledger. */
export function Figures({ figures, style }: { figures?: Figure[]; style?: CSSProperties }) {
  if (!figures || !figures.length) return null;
  return (
    <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: '10px 18px', ...style }}>
      {figures.map((f, i) => (
        <div key={i} style={{ minWidth: 0, borderTop: ROW_RULE, paddingTop: 8 }}>
          <dt style={micro(5)}>{f.label}</dt>
          <dd style={{ margin: '5px 0 0', font: '400 15px/1.3 ' + SERIF, color: INK, letterSpacing: '-0.01em', overflowWrap: 'anywhere' }}>{f.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** The "first" badge: a threshold crossed for the first time. */
export const First = ({ children, style }: { children?: ReactNode; style?: CSSProperties }) => (
  <span style={{ ...micro(1), color: STRING_INK, border: '1px solid ' + STRING_INK, borderRadius: 2, padding: '4px 7px', display: 'inline-block', lineHeight: 1.5, maxWidth: '100%', ...style }}>
    First · {children}
  </span>
);

/** A rule drawn as its own element. */
export const Rule = ({ dashed, row, style }: { dashed?: boolean; row?: boolean; style?: CSSProperties }) => (
  <hr style={{ border: 0, borderTop: dashed ? (row ? DASHED_ROW : DASHED_RULE) : (row ? ROW_RULE : RULE), margin: 0, ...style }} />
);

/** One label / value row of a ledger. */
export const Ledger = ({ label, dim, align = 'left', children }: { label: ReactNode; dim?: boolean; align?: 'left' | 'right'; children?: ReactNode }) => (
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
export interface NavItem { label: ReactNode; to?: RoutePatch; onClick?: (e: MouseEvent<HTMLElement>) => void }
export function NavRow({ up = [], prev, next, onward, style }: { up?: NavItem[]; prev?: NavItem | null; next?: NavItem | null; onward?: NavItem | null; style?: CSSProperties }) {
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
export interface SegmentItem { id: string; label: ReactNode; to: RoutePatch }
export function Segmented({ items, value, label, size = 'md', style }: { items: SegmentItem[]; value: string; label: string; size?: 'md' | 'lg'; style?: CSSProperties }) {
  return (
    <nav aria-label={label} style={{ display: 'flex', gap: 2, padding: 2, background: 'rgba(243,240,234,0.07)', borderRadius: 2, flexWrap: 'wrap', ...style }}>
      {items.map((it) => {
        const on = it.id === value;
        return (
          <Link
            key={it.id}
            to={it.to}
            className="ix-seg"
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
export function Door({ eyebrow, title, body, figure, to }: { eyebrow: ReactNode; title: ReactNode; body: ReactNode; figure?: ReactNode; to: RoutePatch }) {
  return (
    <Link to={to} className="ix-door" style={{
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
export const Doors = ({ children }: { children?: ReactNode }) => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,280px),1fr))', gap: 'clamp(12px,2vw,20px)' }}>{children}</div>
);

/** Nothing matches: say what, and offer the way out. */
export function Empty({ noun = 'entry', route, navigate, style }: { noun?: string; route?: Route; navigate?: Navigate; style?: CSSProperties }) {
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

/** A quoted sentence. 'claim' = the author chose it in support (string-inked);
 *  'context' and 'auto' = background or a machine match, which never outranks a
 *  hand-chosen line. */
export const Quote = ({ tone = 'context', top = 0, children }: { tone?: 'claim' | 'context' | 'auto'; top?: number; children?: ReactNode }) => (
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
export const Credit = ({ cited, publisher, auto }: { cited?: Shot['cited'] | { title?: string; url?: string; wikipedia?: boolean } | null; publisher?: string; auto?: boolean }) => (
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
export function Disclosure({ label = 'the article’s opening', children }: { label?: string; children?: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className="ix ix-ref"
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
export const Gap = ({ title }: { title?: string | null }) => (
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
