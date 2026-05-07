---
name: add-metric
description: Use when adding a new tracked metric that requires changes to the JSONL parser. This cascades through 4 layers: parser → types → stats aggregation → UI display.
---

# Add a New Tracked Metric

New metrics flow through 4 layers in order. Skipping any layer causes either a TS error or silent zeroes in the UI.

## Checklist (do in order)

1. **Understand the raw data source**
   - Open a sample JSONL file: `ls ~/.claude/projects/**/*.jsonl | head -1`
   - Identify the field name and location in the JSON blob
   - Check `server/src/parser/jsonl.ts` — does a raw type already capture this field?

2. **Update `server/src/parser/jsonl.ts`** (if needed)
   - Add the field to the relevant raw event type
   - This file parses raw JSONL — keep it dumb; no calculations here

3. **Update `server/src/parser/usage.ts`**
   - `parseSessionFile` builds `PerTurnMetrics` — add your field there
   - `EMPTY_TOTALS` / `UsageTotals` may need updating if it's an aggregate
   - Keep math here, not in the route

4. **Update types in both files (do both, same change)**
   - `server/src/types.ts` — add field to the relevant type (`UsageTotals`, `SessionTurn`, `SessionDetail`, etc.)
   - `client/src/lib/types.ts` — mirror the exact same change verbatim

5. **Update aggregation in `server/src/routes/stats.ts`** (if it's a stats-level metric)
   - Find the per-turn loop and add your accumulator
   - Include the field in the returned `Stats` object

6. **Update `server/src/routes/sessions.ts`** (if it's a session-level or turn-level metric)
   - Ensure the field passes through to `SessionDetail`

7. **Display in the UI**
   - `SummaryCards` for top-level KPIs
   - A new chart via the `add-chart` skill for visual trends
   - `SessionDetail` for per-session breakdowns

## Common Metric Patterns

**Per-turn accumulator (like cost, cacheRead):**
```ts
// In stats.ts per-turn loop
myMetric += t.myMetric;

// In Stats return
myMetrics: { today: myMetricToday, week: myMetricWeek, allTime: myMetricAll }
```

**Derived ratio (like hitRate):**
```ts
const ratio = denom > 0 ? numerator / denom : 0;
```
Always guard division by zero.

**Per-model breakdown:**
The `modelMap` in `stats.ts` already tracks cost and turns per model. If adding a per-model metric, extend the map value type.

## Rules
- Never edit `docs/specs/*` — write a new spec if design changes
- Both type files must change together — changing one without the other causes a TS build error on the client
- `input_tokens` in JSONL is **non-cached input only** — do not add cache tokens to it
- Cache hit rate formula: `cacheRead / (cacheRead + cacheCreate + nonCacheInput)`
