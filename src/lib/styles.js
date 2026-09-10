export const INK = '#f3f0ea';
export const PAPER = '#e9e3d4';
export const MANILA = '#d9cfb8';
export const RED = 'oklch(0.58 0.2 25)';
export const RED_LIT = 'oklch(0.68 0.24 25)';
export const CYAN = 'oklch(0.85 0.12 200)';
export const MONO = "'IBM Plex Mono', ui-monospace, monospace";
export const SERIF = "'Instrument Serif', Georgia, serif";
export const SANS = "'Helvetica Neue', Helvetica, Arial, sans-serif";

export const micro = (opacity = 0.42) => ({
  font: '400 9.5px/1 ' + MONO,
  letterSpacing: '0.16em',
  textTransform: 'uppercase',
  color: 'rgba(243,240,234,' + opacity + ')'
});

export const button = (tone = 'quiet') => ({
  border: '1px solid ' + (tone === 'loud' ? RED : 'rgba(243,240,234,0.2)'),
  background: tone === 'loud' ? 'rgba(255,80,60,0.1)' : 'transparent',
  color: tone === 'loud' ? INK : 'rgba(243,240,234,0.7)',
  borderRadius: 2,
  padding: '7px 12px',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  font: '400 10px/1 ' + MONO,
  letterSpacing: '0.14em',
  textTransform: 'uppercase'
});

export const field = {
  border: '1px solid rgba(243,240,234,0.2)',
  background: '#0c0c0e',
  color: INK,
  borderRadius: 2,
  padding: 8,
  outline: 'none',
  font: '400 12px/1.2 ' + MONO
};

export const tag = (cat, accent) => ({
  font: '400 10px/1 ' + MONO,
  letterSpacing: '0.16em',
  textTransform: 'uppercase',
  color: accent(cat, 0),
  border: '1px solid ' + accent(cat, 0.55),
  borderRadius: 2,
  padding: '4px 7px',
  whiteSpace: 'nowrap'
});
