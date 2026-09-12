# Contributing

The board is community-maintained. Everything you see is generated from the JSON in `data/`,
so a contribution is a pull request that edits data — no React required.

## Add an entry

1. Fork the repo and create a branch.
2. Add an object to `data/events.json`, keeping the file sorted by `year`.

```json
{
  "id": "deepseek-r1-resets-the-price-of-reasoning",
  "year": 2025,
  "category": "power",
  "title": "DeepSeek R1 resets the price of reasoning",
  "summary": "One sentence, plain, no hype. What happened.",
  "source": "Wikipedia",
  "url": "https://en.wikipedia.org/wiki/DeepSeek",
  "why": "Why it mattered — the sentence a reader remembers.",
  "wikiTitle": "DeepSeek"
}
```

3. Run `npm test`. The suite checks ids, years, categories, sources and link targets.
4. Open a PR using the template. One entry per PR is easiest to review.

## Add a string

A string is a **causal claim**, not a "these are related" tag. If you cannot write the
sentence explaining why the first event made the second possible, it is not a string.

```json
{
  "from": "reasoning-models",
  "to": "deepseek-r1-resets-the-price-of-reasoning",
  "claim": "was reproduced cheaply by",
  "note": "Two or three sentences of reasoning. This is what the walkthrough reads out."
}
```

- `claim` is short, lowercase, verb-first, and *A **claim** B* must be a grammatical sentence with the second card as its object. End on a preposition or a verb that still wants an object (`for`, `into`, `by`, `set off`), never on a noun that closes the phrase (`supplied the compute`), never with a pronoun standing in for either card (`it`, `him`), never with a typed number. Tense follows what the first card did: past when it is done (`was disproved by`, `funded`), present when the consequence is still unfolding (`hardens into`). Never `will` or `may` — the scenario's confidence label is the hedge. The site prints this sentence verbatim as the page description of every clue link.
- `note` is optional but strongly encouraged — it is the whole point of the board.

## Scenarios (anything after the present year in data/threads.json)

- `confidence` is required: `Likely`, `Uncertain` or `Speculative`.
- No `url` — a scenario cannot have a citation. Put the reasoning in `why`.
- Prefer mechanisms over dates. "Energy becomes the binding constraint" is a claim you can
  argue with; "AGI in 2031" is not.

## House style

- British-ish plain English, no marketing voice, no exclamation marks.
- One sentence for `summary`, one or two for `why`.
- Cite the most neutral source you can find. Wikipedia is fine and preferred for
  photographs, because the image pipeline uses `wikiTitle`.
- Contested events: describe the contest, do not pick a side.

## What gets rejected

- Product launches with no consequence.
- Strings without a claim.
- Predictions dressed as record, or record dressed as prediction.
- Anything that cannot be sourced or reasoned in the file itself.
