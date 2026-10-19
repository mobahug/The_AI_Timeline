// Tells the search engines that take IndexNow (Bing, Yandex, Seznam, Naver and
// others; Google does not) which addresses a deploy changed, so a new card is
// looked at in days rather than whenever a crawler next passes. Run by the
// deploy workflow after the pages are live:
//
//   tsx scripts/indexnow.ts --since=<sha>     the commit the push started from
//
// The addresses are the records whose history says they changed in the pushed
// commits (scripts/feed.ts), and the front page and the latest page, which list
// them. Nothing else is sent: no record that did not change, nothing about the
// reader. The key is public by design: the engines fetch it from this site to
// check that the request came from its owner, and it lets them accept URLs
// under the folder it is served from (public/<key>.txt, at the site's base).
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { datedHistory } from './feed';
import { HOST, ORIGIN } from './site';

export const INDEXNOW_KEY = '80c4d943af7bc06fc7d34b78a5a7fe3f';
const ENDPOINT = 'https://api.indexnow.org/indexnow';

/** The addresses changed in the commits after `since`, newest record first. */
export function changedSince(root: string, since: string | null): string[] {
  const always = [ORIGIN, ORIGIN + 'latest/'];
  // A push that opens the branch, or a run by hand, has no "before" to count from.
  if (!since || /^0+$/.test(since)) return always;
  let commits: Set<string>;
  try {
    commits = new Set(execFileSync('git', ['rev-list', since + '..HEAD'], { cwd: root, encoding: 'utf8' }).split('\n').filter(Boolean));
  } catch {
    return always;
  }
  const changed = [...datedHistory(root)]
    .filter(([, d]) => commits.has(d.changed.sha))
    .sort((a, b) => b[1].seq - a[1].seq)
    .map(([key]) => { const [kind, id] = key.split('/'); return ORIGIN + kind + '/' + encodeURIComponent(id) + '/'; });
  return [...always, ...changed];
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const since = (process.argv.find((a) => a.startsWith('--since=')) || '').slice('--since='.length) || null;
  const root = fileURLToPath(new URL('..', import.meta.url));
  const urlList = changedSince(root, since);
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ host: new URL(HOST).host, key: INDEXNOW_KEY, keyLocation: ORIGIN + INDEXNOW_KEY + '.txt', urlList })
  });
  // 200 and 202 are both "received"; anything else is reported, and the deploy
  // it follows stands either way.
  console.log('indexnow: ' + urlList.length + ' addresses, answered ' + res.status + (res.ok ? '' : ' ' + (await res.text()).slice(0, 200)));
  if (!res.ok) process.exitCode = 1;
}
