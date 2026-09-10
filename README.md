# The AI Timeline

An investigation board for the history of artificial intelligence — 1900 to 2050.
126 entries pinned to a wall, 62 strings between them, and a written case note for
every connection that carries one.

**Live site:** https://mobahug.github.io/The_AI_Timeline/

## Why this exists

Most AI timelines are a list of dates. This one argues. Every string on the board is a
claim that one event made another possible — the DeepMind sale that provoked OpenAI's
founding, the funding hole that forced the capped-profit structure, the governance fault
line that finally broke over five days in November 2023. Click a card and the board walks
you through the chain, clue by clue.

Entries after 2026 are projections. They carry a confidence label (`Likely`,
`Uncertain`, `Speculative`) and reasoning instead of a citation, and the board draws
them on manila stock with dashed edges so they can never be mistaken for record.

## Views

| View | What it is |
| --- | --- |
| **Board** | The evidence wall: photo cards, red string, clue walkthrough |
| **Plates** | Image-led chronological rows |
| **Mosaic** | Photo grid, landmarks double-width |
| **Index** | Dense typographic list |

## First push

The repository is empty; this is the initial commit.

```bash
cd The_AI_Timeline
git init && git branch -M main
git remote add origin git@github.com:mobahug/The_AI_Timeline.git
git add . && git commit -m "The AI Timeline: board, data, site"
git push -u origin main
```

Then in **Settings → Pages**, set *Source* to **GitHub Actions**. The workflow builds on
every push to `main` and publishes to
`https://mobahug.github.io/The_AI_Timeline/`.

## Running it

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # validates data/*.json
npm run build      # static output in dist/
```

## Data

All content lives in three JSON files. Nothing is hard-coded in components.

- `data/events.json` — the cards
- `data/links.json` — the strings, with the claim and the case note
- `data/threads.json` — threads (board rows), categories and era headings

See [docs/SCHEMA.md](docs/SCHEMA.md) for the field reference and
[CONTRIBUTING.md](CONTRIBUTING.md) for how to propose a change.

## Images

Photographs come from Wikipedia/Wikimedia. `npm run fetch:images` caches lookups into
`public/wiki-cache.json` at build time; at runtime the app uses the cache first and
falls back to a live lookup for anything missing. Entries with no free image get a
generated mark and say so on the card.

## Deep links

The board is addressable:

- `?view=board&id=chatgpt` — open a card
- `?view=board&clue=gpt-3>chatgpt` — open the walkthrough at that string
- `?view=plates&cat=incident` — a filtered view

## Licence

Code MIT. Entry text CC BY-SA 4.0. Photographs remain under their own Wikimedia licences.
