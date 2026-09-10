# Data schema

Three files, all validated by `npm test`.

## `data/events.json` — array of entries

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | string | yes | kebab-case, unique, stable — deep links use it |
| `year` | number | yes | 1900–2050 |
| `category` | string | yes | one of the ids in `threads.json` |
| `title` | string | yes | ≤ 70 characters, sentence case |
| `summary` | string | yes | one sentence, ≤ 200 characters |
| `source` | string | no | display name, e.g. `Wikipedia` |
| `url` | string | no | https only; omit for projections |
| `why` | string | no | why it mattered; required for projections |
| `confidence` | string | no | `Likely` / `Uncertain` / `Speculative`; required when `year > 2026` |
| `featured` | boolean | no | draws a larger card |
| `wikiTitle` | string | no | article the photo is pulled from |

## `data/links.json` — array of strings

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `from` | string | yes | event id, the earlier cause |
| `to` | string | yes | event id, the later effect |
| `claim` | string | yes | short verb phrase shown on the string tag |
| `note` | string | no | the case note read out in the walkthrough |

Links are directional. `from` should be the earlier event; the test suite warns when it
is not.

## `data/threads.json`

- `threads` — the six board rows, in display order
- `categories` — `{ id, label, hue, thread }`; `hue` is an OKLCH hue angle (0–360)
- `eras` — the era headings used by the Plates and Index views
