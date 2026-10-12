# The AI Timeline

An investigation board for the history of artificial intelligence — 1900 to 2050.
Entries pinned to a board, strings between them, a written case note for every
connection that carries one, and five leads that each follow one question through
the record, rung by rung.

**Live site:** https://mobahug.github.io/The_AI_Timeline/

## Why this exists

Most AI timelines are a list of dates. This one argues. Every string on the board is a
claim that one event made another possible — the DeepMind sale that provoked OpenAI's
founding, the funding hole that forced the capped-profit structure, the governance fault
line that finally broke over five days in November 2023. Click a card and the board walks
you through the chain, clue by clue.

The leads take the same record and follow one question at a time: how far machines got
at mathematics (from textbook theorems to a Millennium Prize problem), at games (checkers
to Diplomacy), at gaming their own tests (a boat circling for points to agents breaking
out of their sandbox to beat the exam), how cheap an answer became, and what people tell
a machine that talks like a friend (ELIZA's confidants to a law against sycophancy).

Entries after the present are scenarios. They carry a confidence label (`Likely`,
`Uncertain`, `Speculative`) and reasoning instead of a citation, and the board draws
them on manila stock with dashed edges so they can never be mistaken for record.

## Brief and full

The site opens in **brief**: the board shows its landmark cards — featured cards, every
rung on a lead, both ends of every case-noted string — and a card's panel shows the
summary, the reading and one quoted sentence. **Full** draws every card and string and
opens the whole file on every dossier: the paragraphs behind the summary, the figures,
the names, every source with what it says, and the road here in the board's own claim
verbs. The switch is in the header; `?mode=full` on any link opens the whole file.

## Pages

| Page | Address | What it is |
| --- | --- | --- |
| The line | `/line/`, `/line/<n>/` | The numbered findings, oldest first |
| The case, the horizon | `/case/`, `/horizon/` | Where the record stands; the scenarios |
| The board | `/board/` | The evidence wall: photo cards, string, clue walkthrough, lead ladders |
| A dossier | `/card/<id>/` | One card in full |
| The leads | `/leads/`, `/lead/<id>/` | Five lines of inquiry, each a ladder of cards |
| The archive | `/archive/`, `/archive/plates/`, `/archive/mosaic/` | Everything, dated, in three costumes |
| The files | `/files/`, `/person/<id>/`, `/org/<id>/` | Every name, with every card it appears on |
| The glossary | `/glossary/`, `/term/<id>/` | Every term, defined in place |

Every page is prerendered to its own HTML at build time, with its own title,
description, canonical address, share image and structured data. Every section on a
page has an anchor (hover a heading for the `#`). Old `?view=` links still resolve.

## Running it

TypeScript (strict) throughout: `src/lib/types.ts` holds the shapes the JSON is read into.
Node 24, the version the deploy builds on; the test runner needs 22.12 or later.

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # typechecks, then validates data/*.json and the routes
npm run typecheck  # tsc --noEmit alone
npm run build      # sitemap, client build, server build, share images, prerender → dist/
npm run preview    # serves dist/ at http://localhost:4173/The_AI_Timeline/
```

## Data

All content lives in `data/*.json`. Nothing is hard-coded in components — not a
count, not a year.

- `data/events.json` — the cards: summary, reading, the file (`detail`), figures,
  firsts, tagged people / organisations / terms, and sources with quotes. A record
  card may carry a `date` — the order inside its year, where the record knows it;
  73 of the 157 do
- `data/links.json` — the strings, with the claim and the case note
- `data/leads.json` — the leads: a question, where it stands, and its rungs
- `data/people.json`, `data/orgs.json`, `data/glossary.json` — the files
- `data/threads.json` — the span of the board, threads (board rows), categories, eras
- `data/spine.json` — the findings: the numbered stretches of years that make the line

See [docs/SCHEMA.md](docs/SCHEMA.md) for the field reference. The board is kept by
its author; it is not open to outside contribution, and the licence below says why.

## Images

Photographs come from Wikipedia/Wikimedia. `npm run fetch:images` caches lookups into
`public/wiki-cache.json` at build time; the prerenderer writes the pages each route used
into that route's HTML, and at runtime the app uses the cache first and falls back to a
live lookup for anything missing. Entries with no free image get a generated mark and say so.
Each run also checks that every photograph a card uses still resolves: one Wikimedia has
deleted is looked up again, and left out rather than shown broken until its article names
another.

Every page carries a share image, drawn at build time by `scripts/share-images.tsx`: a
1200×630 PNG for each card (`og/card/<id>.png`) and each lead (`og/lead/<id>.png`), and
`og.png` for every other page. A card's image is the card as the board draws it — paper,
or manila for a scenario, the year, the title, the category, the pin and the strings
that leave it — with its photograph, fetched from Wikimedia at 500px during the build and
credited on the card with its author and licence. A share image is a copy served from this
site, so only files on Wikimedia Commons are used, and a card whose picture is not on
Commons, or cannot be fetched, is drawn in type alone; the build says how many were.
Photographs and credits are kept in `node_modules/.cache/share-photos` for a month. satori
lays the images out in the site's own faces and sharp rasterises them to 256-colour PNGs,
the largest under 200KB.

## Deep links

- `/card/chatgpt/` — a dossier
- `/board/?id=chatgpt` — the board, with a card open
- `/board/?clue=gpt-3>chatgpt` — the walkthrough at that string
- `/board/?lead=machines-doing-maths&rung=9` — the board, following a lead at a rung
- `/lead/games-fall/#rung-6` — a lead page, at a rung
- `/archive/plates/?cat=incident` — a filtered view
- add `&mode=full` to any of them to open the whole file

## Licence

The board's own text (everything in `data/`) is **CC BY-NC-ND 4.0** — share it with
credit, do not sell it, do not alter it. The code is **PolyForm Noncommercial 1.0.0** —
read it, run it, change it for any noncommercial purpose. Quoted sentences remain their
publishers'; Wikipedia text is CC BY-SA 4.0 and credited where shown; photographs remain
under their Wikimedia licences. The two typefaces — Instrument Serif and IBM Plex Mono —
are served from this site under the SIL Open Font License 1.1, whose text sits beside
them in `public/fonts`. See [LICENSE](LICENSE) and
[LICENSE-CONTENT.md](LICENSE-CONTENT.md).
