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
| `early` | string[] | no | on a scenario only: record cards that brought part of it early, each strung to it; listed in Said in advance (`/predictions/#the-board`) |
| `featured` | boolean | no | draws a larger card; a landmark in brief |
| `wikiTitle` | string | no | article the photo is pulled from |

The year is the axis; `date` is the order inside a year, where the record knows
it. An undated record card sorts **first** in its year — a card written at year
scale is the ground that year's dated incidents happen on, not an event on a
day. Two cards in one year that both carry a date are written in that order, and
a string never runs backwards inside a year: `npm test` checks both.

`why`, `detail`, `figures` and `sources` are the card's papers. The build serves them
apart from the rest of the card (`scripts/split-events.ts`) and the site reads them
only through `src/lib/papers.ts`; nothing changes in how they are written.

Each source: `{ kind, publisher, title, url, date (YYYY-MM-DD), quote, supports }`.
`kind` is one of `primary, paper, article, video, podcast, interview, encyclopedia`.
A source only `supports: "claim"` when it carries a verbatim `quote`; otherwise it is context.
One url per entry, never twice. `npm run check:quotes -- --cards` fetches every page the cards'
quotes cite and reports any quote not found in it character for character, with where the page
parts from it; `-- --cards <id>` checks one card, as after an edit.

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

## `data/questions.json`

`questions` — array of `{ id, question, short, answer, inPractice?, record, open, leads }`:
the plain questions a reader brings, each at `/question/<id>/` and listed at `/questions/`.

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | string | yes | kebab-case, unique, stable |
| `question` | string | yes | as a reader would ask it, ending in `?` |
| `short` | string | yes | the answer in one or two sentences, ≤ 260 characters |
| `answer` | string[] | yes | the answer at length; says only what the `record` cards say |
| `inPractice` | string | no | what the record means for the reader; never legal, medical or financial advice |
| `record` | `{event, note}[]` | yes | at least three cards, mostly on the record; `note` says what each shows |
| `open` | string | yes | what the record does not settle |
| `leads` | string[] | yes | ids from `leads.json`, possibly none |

An answer adds no claim of its own: anything it states must already be on one of
its cards, where it is sourced. A card lists the questions that rest on it.

## `data/checks.json`

`checks` — array of `{ id, title, checked, verdict, short, reported, primary, claims, reading, record, open, leads }`:
headline checks, each at `/check/<id>/` and listed at `/checks/`. A check sets one widely
reported line about AI beside what the primary account behind it actually says.

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | string | yes | kebab-case, unique, stable |
| `title` | string | yes | the question the check answers, ending in `?`; never presented as a quotation |
| `checked` | `YYYY-MM-DD` | yes | the day every quote was last matched against its page |
| `verdict` | `stands` \| `overtaken` \| `misleading` \| `contradicted` | yes | on the report as a whole |
| `short` | string | yes | the verdict in one or two sentences, ≤ 260 characters |
| `reported` | `{publisher, byline?, title, url, date}` | yes | the report checked; `title` is its headline as published |
| `primary` | `{id, publisher, title, url, date}[]` | yes | the primary accounts; each must be a source on one of the `record` cards |
| `claims` | `{said, verdict, primary: {source, quote}[], note}[]` | yes | one per line checked; `said` is verbatim from `reported`, each `quote` verbatim from the `primary` source named by `source` |
| `reading` | string[] | yes | the check at length; claims nothing its sources do not say |
| `record` | `{event, note}[]` | yes | the cards the check touches, at least one |
| `open` | string | yes | what the record does not settle |
| `leads` | string[] | yes | ids from `leads.json`, possibly none |

Verdicts: **stands** — the primary account says it; **overtaken** — it said so at the time and
has since revised it; **misleading** — the facts are in the primary account, what the report makes
of them is not; **contradicted** — the primary account says otherwise. The prerenderer writes one
`ClaimReview` per line, rated 4 (stands) to 1 (contradicted).

Quotes are never paraphrased. `npm run check:quotes` fetches every page a check cites and reports
any quote not found in it character for character (`-- --via=wayback` reads the Wayback
Machine's latest capture for a site that refuses the request); run it and update `checked`
whenever a check is added or edited. A card lists the checks that touch it.

## `data/predictions.json`

`predictions` — Said in advance: predictions about AI people remember and repeat, each at
`/prediction/<id>/` and listed at `/predictions/`, oldest first. A prediction is filed when a named
person or institution made it, its words survive where they can be quoted, it names a year (or lets
one be worked out), and the record can settle it.

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | string | yes | kebab-case, unique, stable |
| `title` | string | yes | what was predicted, in the board's words; never dressed as a quotation |
| `who` | string | yes | as the source names them |
| `people` | string[] | yes | ids from `people.json`, possibly none; the prediction is listed on each person's file |
| `said` | string | yes | `YYYY`, `YYYY-MM` or `YYYY-MM-DD`: when it was said |
| `words` | string | yes | the prediction, verbatim, from the source named by `source` |
| `source` | string | yes | the id of the source the words come from |
| `reported` | boolean | no | the words are a report's direct quotation, not the speaker's own text |
| `by` | number | yes | the year it names, or that its words let be worked out |
| `byWords` | string | yes | the words inside `words` that set the year |
| `verdict` | string | yes | `kept`, `early`, `late`, `overdue`, `wrong`, `disputed` or `open` (below) |
| `came` | number | see note | the year it came true; required for `kept`, `early` and `late`, absent for `overdue` and `open` |
| `short` | string | yes | the verdict in one or two sentences, ≤ 260 characters |
| `reading` | string[] | yes | the verdict at length; claims nothing its quotes and cards do not say |
| `evidence` | `{source, quote}[]` | yes | what happened, each `quote` verbatim from the source named by `source` |
| `sources` | `{id, kind, publisher, title, url, date}[]` | yes | `date` is `YYYY`, `YYYY-MM` or `YYYY-MM-DD`; every source is used |
| `record` | `{event, note}[]` | yes | the cards it bears on, at least one; a card lists the predictions that rest on it |
| `open` | string | yes | what the record does not settle |
| `checked` | `YYYY-MM-DD` | yes | the day every quote was last matched against its page |
| `leads` | string[] | yes | ids from `leads.json`, possibly none |

Verdicts: **kept** — it happened by the year it named; **early** — it happened years before; **late**
— it happened after; **overdue** — the year has passed and it has not happened; **wrong** — it said
something would not happen, and it did; **disputed** — accounts on the record differ on whether it has
happened; **open** — the year has not come. A verdict is about the words, not the person.

## `data/promises.json`

`promises` — Promises made: commitments that laboratories, companies and governments made in public about AI,
each at `/promise/<id>/` and listed at `/promises/`, oldest first. A promise is filed when a named organisation or
person made it, its words can be quoted from the promiser's own text, and a card on the board bears on it.

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | string | yes | kebab-case, unique, stable |
| `title` | string | yes | what was promised, in the board's words; never dressed as a quotation |
| `who` | string | yes | as the source names them |
| `people` / `orgs` | string[] | yes | ids from the files, possibly none; the promise is listed on each one's file |
| `said` | `YYYY-MM-DD` | yes | when the quoted words were given |
| `words` | string | yes | the promise, verbatim, from the source named by `source` |
| `source` | string | yes | the id of the source the words come from |
| `by` | string | no | `YYYY` or `YYYY-MM-DD`: the deadline it named, if it named one |
| `byWords` | string | no | the words inside `words` that set the deadline |
| `verdict` | string | yes | `kept`, `partly`, `broken`, `dropped`, `disputed` or `open` (below) |
| `settled` | `YYYY-MM-DD` | no | when the record settled it; absent while it is open |
| `short` | string | yes | the verdict in one or two sentences, ≤ 260 characters |
| `reading` | string[] | yes | the verdict at length; claims nothing its quotes and cards do not say |
| `evidence` | `{source, quote}[]` | yes | what was done, each `quote` verbatim from the source named by `source` |
| `sources` | `{id, kind, publisher, title, url, date}[]` | yes | every source is used, one url each |
| `record` | `{event, note}[]` | yes | the cards it bears on, at least one on the record; a card lists the promises that rest on it |
| `open` | string | yes | what the record does not settle |
| `checked` | `YYYY-MM-DD` | yes | the day every quote was last matched against its page |
| `leads` | string[] | yes | ids from `leads.json`, possibly none |

Verdicts: **kept** — done on its own terms, and by its date if it named one; **partly** — some of it done, by
the record; **broken** — its date passed undone, or the promiser did otherwise; **dropped** (shown as
*Rewritten*) — the promiser rewrote it or took it back, in public; **disputed** — accounts on the record differ;
**open** — not yet due, or not yet settled. A verdict is about the words, not the people. `npm run check:quotes`
matches every promise's words and evidence against their pages, as it does predictions'.

## `data/corrections.json`

`corrections` — every change of fact the board has made to its own record, at `/corrections/`, newest first, and
at the foot of each card it touched. Wording that changed without a fact changing is not listed, nor a quote
matched to its page's own marks. `note` is the sentence the page prints about how the register is kept.

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | string | yes | kebab-case, unique |
| `date` | `YYYY-MM-DD` | yes | the day of the commit that made the change (`npm test` checks it against git) |
| `commit` | string | yes | that commit's short sha; the page links the change itself |
| `event` | string | see note | the card corrected; or `where` instead |
| `where` | `{file, id}` | see note | for a correction outside a card: a lead (`data/leads.json`), a string (`from>to` in `data/links.json`), a file or a glossary term |
| `kind` | string | yes | `fact`, `date`, `figure`, `attribution`, `framing` or `citation` |
| `was` / `now` | string | yes | the record's words before and after, verbatim, trimmed to the sentence |
| `why` | string | yes | what showed it was wrong, naming the source that settled it |
| `source` | `{publisher, title, url}` | no | that source, as the card cites it |
| `alsoIn` | `{file, id}[]` | no | the same error, fixed in the same commit, elsewhere in `data/` |

## `data/machines.json`

`machines` — programs from the record rebuilt to run in the browser from their own papers, each run
on its card (`/card/<event>/#machine`) and listed at `/machines/`. The programs are in
`src/lib/machines/` and their panels in `src/components/machines/`, fetched only by the card that runs
them.

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | string | yes | `eliza`, `menace`, `shannon` or `perceptron`: the program that runs |
| `event` | string | yes | the card it runs on, on the record |
| `title` | string | yes | ≤ 60 characters |
| `short` | string | yes | one line for the index and the front page, ≤ 200 characters |
| `lede` | string | yes | what the reader is running, and what to try |
| `try` | string[] | no | lines to offer, where the machine takes typing |
| `kept` / `changed` | string[] | yes | what is as it was, and what is not |
| `credit` | string | yes | whose reconstruction it is, and how it is checked |
| `sources` | `{kind, publisher, title, url, date?, quote?}[]` | yes | the papers it is rebuilt from; a `quote` is verbatim |
| `lead` | `{id, rung}` | no | the rung of a lead its card stands on, to follow it up |

## `data/people.json`, `data/orgs.json`, `data/glossary.json`

- people: `{ id, name, aka[], role, bio }`
- orgs: `{ id, name, aka[], kind, role, bio }`
- glossary: `{ id, term, aka[], short, definition }`

A card names an entity if it tags the id or if `name`/`term` or any `aka` appears in
the card's own text (title, summary, why, detail — never sources). An alias with a
capital letter matches as written; an all-lowercase alias matches case-insensitively.
Keep aliases that are ordinary words out of `aka`.

## `data/threads.json`

- `span` — `{ first, now, last, asOf }`: the first year drawn, the present, the last year
  drawn, and the day the record was last brought up to date (`YYYY-MM-DD`, shown on the
  front page; never earlier than the newest dated card)
- `threads` — the six board rows, in display order
- `categories` — `{ id, label, hue, thread, blurb }`; `hue` is an OKLCH hue angle (0–360);
  `blurb` says in one plain sentence (≤ 100 characters) what the category covers, shown
  where the colours are explained
- `eras` — the era headings used by the archive's list and plates

## `data/spine.json`

`findings` — `{ n, from, title, lead, blurb }`: the numbered stretches of the line.
Every entry files under the last finding whose `from` is not after it.

## `data/primer.json`

`ideas` — array of `{ term, plain, cards }`: the ideas Start here (`/start/#ideas`) puts into
everyday words, in the order each builds on the last.

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `term` | string | yes | an id from `glossary.json`, once each |
| `plain` | string | yes | the idea in everyday words, ≤ 300 characters; claims nothing its cards do not say |
| `cards` | string[] | yes | cards on the record, oldest first, at least one of which names the term |

## `data/watch.json`

`watch` — array of `{ id, date?, what, event, evidence }`: what the latest page
(`/latest/#watch`) lists under Dates to watch. An item with a `date` is a day the record already
names; one without is a question the record is waiting on.

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | string | yes | kebab-case, unique |
| `date` | string | no | `YYYY-MM-DD` or `YYYY-MM`; its day, month and year must be in `evidence`, in words |
| `what` | string | yes | what happens, or what is waiting to be settled, in a sentence |
| `event` | string | yes | the card on the record that sources it |
| `evidence` | string | yes | the card's own words, verbatim (summary, reading, file or figures) |

A date is sorted against `span.asOf`: after it, the item is ahead; on or before, it has passed.
The page says in the browser, once it is live, when a date ahead of the record has passed in
the reader's own calendar — the server cannot know the day a page is read. When an item is
settled, the board adds a card and the item goes.
