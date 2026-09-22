# Data schema

The files under `data/`, all validated by `npm test`.

## `data/events.json` — array of entries

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | string | yes | kebab-case, unique, stable — deep links use it |
| `year` | number | yes | 1900–2050 |
| `date` | string | no | `YYYY-MM` or `YYYY-MM-DD`, agreeing with `year`; never on a projection |
| `category` | string | yes | one of the ids in `threads.json` |
| `title` | string | yes | ≤ 70 characters, sentence case |
| `summary` | string | yes | one or two sentences, ≤ 220 characters |
| `source` | string | no | display name, e.g. `Wikipedia` (legacy; prefer `sources`) |
| `url` | string | no | https only; omit for projections (legacy; prefer `sources`) |
| `why` | string | see note | the reading — why it mattered. **Required** on a projection (`year > now`), which carries reasoning in place of a citation; optional on the record |
| `detail` | string[] | no | the file: paragraphs behind the summary, shown on the dossier (first one in brief, all in full) |
| `figures` | `{label, value}[]` | no | the numbers a reader should be able to quote |
| `firsts` | string | no | a threshold crossed for the first time, shown as a `First ·` badge |
| `people` / `orgs` / `terms` | string[] | no | ids from the files; a name in the card's own text also counts, so tag only what the text does not say |
| `sources` | array | no | see below; the first `supports: "claim"` source is shown as "Based on" |
| `confidence` | string | no | `Likely` / `Uncertain` / `Speculative`; required when `year > now` |
| `featured` | boolean | no | draws a larger card; a landmark in brief |
| `wikiTitle` | string | no | article the photo is pulled from |

The year is the axis; `date` is the order inside a year, where the record knows
it. An undated record card sorts **first** in its year — a card written at year
scale is the ground that year's dated incidents happen on, not an event on a
day. Two cards in one year that both carry a date are written in that order, and
a string never runs backwards inside a year: `npm test` checks both.

Each source: `{ kind, publisher, title, url, date (YYYY-MM-DD), quote, supports }`.
`kind` is one of `primary, paper, article, video, podcast, interview, encyclopedia`.
A source only `supports: "claim"` when it carries a verbatim `quote`; otherwise it is context.
One url per entry, never twice.

## `data/links.json` — array of strings

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `from` | string | yes | event id, the earlier cause |
| `to` | string | yes | event id, the later effect |
| `claim` | string | yes | short verb phrase; *A claim B* reads as a sentence |
| `note` | string | no | the case note read out in the walkthrough |

Links are directional and point forward in time. Either end of a noted string is a
landmark in brief.

## `data/leads.json`

`leads` — array of `{ id, title, kind, hue, question, blurb, standing, rungs }`.
`kind` is `capability`, `failure` or `economy`; `hue` is an OKLCH hue angle for the
ladder. `standing` is where the lead stands as of the board's present year.
Each rung is `{ event, label, text }`: the card, the level it reached, and the
sentence that connects it to the next. Rungs are author-ordered; every rung's card is
a landmark in brief. A string between consecutive rungs is found automatically.

## `data/people.json`, `data/orgs.json`, `data/glossary.json`

- people: `{ id, name, aka[], role, bio }`
- orgs: `{ id, name, aka[], kind, role, bio }`
- glossary: `{ id, term, aka[], short, definition }`

A card names an entity if it tags the id or if `name`/`term` or any `aka` appears in
the card's own text (title, summary, why, detail — never sources). An alias with a
capital letter matches as written; an all-lowercase alias matches case-insensitively.
Keep aliases that are ordinary words out of `aka`.

## `data/threads.json`

- `span` — `{ first, now, last }`: the first year drawn, the present, the last year drawn
- `threads` — the six board rows, in display order
- `categories` — `{ id, label, hue, thread }`; `hue` is an OKLCH hue angle (0–360)
- `eras` — the era headings used by the archive's list and plates

## `data/spine.json`

`findings` — `{ n, from, title, lead, blurb }`: the numbered stretches of the line.
Every entry files under the last finding whose `from` is not after it.
