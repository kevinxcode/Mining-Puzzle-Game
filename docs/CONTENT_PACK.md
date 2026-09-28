# Site Induction content packs

A content pack is one JSON file with the induction **modules**, **glossary** and
**pre-start (P2H) checks**. HSE teams can adapt the training to their site and load
it in the app — no app release needed.

## Workflow
1. In the app: **Site Induction → Content pack → TEMPLATE**. Share the JSON to yourself.
2. Edit it (any text editor; keep it valid JSON). See `content-pack.example.json`.
3. **Change `version`** (e.g. `2026.1` → `2026.2`) whenever the content changes.
   Trainees certified on an older version are asked to renew.
4. On each device: **Content pack → IMPORT** and pick the file.
   Invalid files are rejected with a list of what to fix; the current content stays active.
5. **USE BUILT-IN CONTENT** switches back.

## Rules checked on import
| Part | Rule |
|---|---|
| Pack | `format` = `mining-puzzle-induction-pack`; `name` ≤ 80 chars; `version` ≤ 20 chars; ≤ 500 KB |
| Module | unique `id`; `title`, `summary`, `number`; `icon` = cycle / bucket / queue / route / fuel / safety; `practiceLevelId` = campaign level 1–60 |
| Card | `id`, `title`, `body`, `art` (one of the built-in diagram/icon ids, see the template) |
| Question | `id`, `prompt`, `explanation`; ≥ 2 options; **exactly one** option with `"correct": true` |
| Glossary | `term`, `definition` |
| Pre-start check | unique `id`; `title`, `brief`; items with unique `id`, `area` = walkaround / cab / safety, `label`, `observation`, `explanation`, `defect` true/false; `"critical": true` only on defects |

Hazard-spotting scenes are illustrated in the app and are not part of the pack.

> The built-in content is generic. Have your HSE team review any pack before it is used
> for real induction; the app's certificate is a training record, not an official induction.
