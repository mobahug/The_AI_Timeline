#!/usr/bin/env node
/**
 * Every claim on this board has to be checkable, so every source has to resolve.
 * Walks data/events.json, requests each source URL, and reports anything that is
 * not a 200. Wikipedia rate-limits hard, so requests are serialised per host with
 * a small delay and 429s are retried rather than reported as failures.
 *
 *   npm run check:links          report only
 *   npm run check:links -- --ci  exit 1 if anything is broken
 */
import { readFile } from 'node:fs/promises';

const UA = 'TheAITimeline-linkcheck/1.0 (+https://github.com/mobahug/The_AI_Timeline)';
const DELAY_MS = 350;
const RETRIES = 3;
const ci = process.argv.includes('--ci');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function head(url) {
  for (let attempt = 0; attempt <= RETRIES; attempt++) {
    try {
      const res = await fetch(url, { redirect: 'follow', headers: { 'User-Agent': UA } });
      if (res.status === 429) { await sleep(1200 * (attempt + 1)); continue; }
      return res.status;
    } catch (err) {
      if (attempt === RETRIES) return 'NETWORK: ' + err.message;
      await sleep(600 * (attempt + 1));
    }
  }
  return 429;
}

const events = JSON.parse(await readFile(new URL('../data/events.json', import.meta.url), 'utf8'));
const NOW = 2026;

const record = events.filter((e) => e.year <= NOW);
const unsourced = record.filter((e) => !e.url && !(Array.isArray(e.sources) && e.sources.length));

// Every citation, including each entry of a sources[] array. A dead source in the
// array is exactly as much of an accuracy bug as a dead primary url, and used to
// be invisible here.
const sourced = [];
for (const e of record) {
  const seen = new Set();
  for (const s of (Array.isArray(e.sources) ? e.sources : [])) {
    if (s.url && !seen.has(s.url)) { seen.add(s.url); sourced.push({ ...e, url: s.url, _via: s.publisher || s.kind }); }
  }
  if (e.url && !seen.has(e.url)) sourced.push({ ...e, url: e.url, _via: 'primary' });
}

// Group by host so one slow or rate-limited host cannot stall the others.
const byHost = new Map();
for (const e of sourced) {
  let host;
  try { host = new URL(e.url).host; } catch { host = 'INVALID'; }
  if (!byHost.has(host)) byHost.set(host, []);
  byHost.get(host).push(e);
}

console.log(`Checking ${sourced.length} citations across ${byHost.size} hosts (including sources[] entries)…\n`);

// A 403 is a bouncer, not a missing page: openai.com and sec.gov turn away
// scripted fetches while serving the same page to a browser. Listed separately so
// a real 404 is never buried among them — and never counted as broken in CI.
const broken = [];
const blocked = [];
await Promise.all([...byHost.entries()].map(async ([host, list]) => {
  for (const e of list) {
    if (host === 'INVALID') { broken.push({ e, status: 'INVALID URL' }); continue; }
    const status = await head(e.url);
    if (status === 403) blocked.push({ e, status });
    else if (status !== 200) broken.push({ e, status });
    await sleep(DELAY_MS);
  }
}));

console.log(`sources checked : ${sourced.length}`);
console.log(`resolved 200    : ${sourced.length - broken.length - blocked.length}`);
console.log(`blocked (403)   : ${blocked.length}   — served to browsers, refused to scripts; check by hand`);
console.log(`broken          : ${broken.length}`);

const list = (label, rows) => {
  console.log(`\n${label}`);
  for (const { e, status } of rows.sort((a, b) => a.e.year - b.e.year)) {
    console.log(`  ${status}  ${e.year}  ${e.title}  [${e._via || 'primary'}]`);
    console.log(`         ${e.url}`);
  }
};
if (broken.length) list('BROKEN SOURCES', broken);
if (blocked.length) list('BLOCKED TO SCRIPTS (verified by hand 2026-09-11: openai.com ×3, sec.gov ×1)', blocked);

if (unsourced.length) {
  console.log(`\nRECORD ENTRIES WITH NO SOURCE (${unsourced.length})`);
  for (const e of unsourced) console.log(`  ${e.year}  ${e.title}`);
}

const hosts = [...byHost.entries()].map(([h, l]) => [h, l.length]).sort((a, b) => b[1] - a[1]);
console.log('\nSOURCE DIVERSITY');
for (const [h, n] of hosts) {
  console.log(`  ${String(n).padStart(4)}  ${h}${n / sourced.length > 0.8 ? '   <- one host carries most of the board' : ''}`);
}

if (ci && (broken.length || unsourced.length)) process.exit(1);
