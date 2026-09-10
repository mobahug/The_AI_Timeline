// Regenerates public/og.svg from the live data so the share card never goes stale.
import { readFile, writeFile } from 'node:fs/promises';

const events = JSON.parse(await readFile(new URL('../data/events.json', import.meta.url), 'utf8'));
const links = JSON.parse(await readFile(new URL('../data/links.json', import.meta.url), 'utf8'));
const notes = links.filter((l) => l.note).length;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#0a0a0b"/>
  <g stroke="oklch(0.58 0.2 25)" fill="none" stroke-width="2" opacity="0.55">
    <path d="M120 250 Q330 340 540 250"/><path d="M540 250 Q760 360 980 300"/>
    <path d="M240 420 Q470 500 700 430"/>
  </g>
  <g fill="#e9e3d4">
    <rect x="96" y="222" width="48" height="56" transform="rotate(-2 120 250)"/>
    <rect x="516" y="222" width="48" height="56" transform="rotate(1.5 540 250)"/>
    <rect x="956" y="272" width="48" height="56" transform="rotate(-1 980 300)"/>
  </g>
  <text x="80" y="120" fill="#f3f0ea" font-family="Georgia,serif" font-size="86">The AI Timeline</text>
  <text x="80" y="176" fill="rgba(243,240,234,0.6)" font-family="ui-monospace,monospace" font-size="24" letter-spacing="4">1900 — 2050 · AN INVESTIGATION BOARD</text>
  <text x="80" y="560" fill="rgba(243,240,234,0.75)" font-family="ui-monospace,monospace" font-size="26" letter-spacing="3">${events.length} ENTRIES · ${links.length} STRINGS · ${notes} CASE NOTES</text>
</svg>
`;

await writeFile(new URL('../public/og.svg', import.meta.url), svg);
console.log('wrote public/og.svg —', events.length, 'entries');
