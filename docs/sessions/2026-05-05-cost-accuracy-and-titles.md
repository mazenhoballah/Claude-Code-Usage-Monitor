# Session summary — 2026-05-05

Branch: `feat/initial-implementation`

## Goals

1. Investigate why the dashboard's per-session cost was much higher than `/usage` reported inside Claude Code.
2. Surface a human-readable title for every session.
3. Make the Recent Sessions list and the Session Details view use the full screen width.
4. Show the session title prominently inside the details view.

## Changes

### 1. Cost accuracy — dedupe assistant lines by `requestId`

**Root cause.** Claude Code emits one `assistant` JSONL entry per content block / streaming iteration of a single API call. Each of those entries carries the same `requestId` and the same `message.usage` payload. The parser was treating every line as a separate turn, so a single API call was billed 2–3× over.

Empirical check on the project's own session files:

| Session (prefix) | Assistant lines | Unique `requestId`s | Phantom cost |
| --- | ---: | ---: | ---: |
| `d4183ca6` | 218 | 99 | $34.56 of $57.94 |
| `4bcb4049` | 18 | 14 | ~$0.76 |
| `ef91a01a` | 16 | 9 | ~$1.56 |

**Fix.** `server/src/parser/usage.ts` now keeps a `Set<requestId>` and skips assistant lines whose request was already counted. Timestamps still update from every line (so `startedAt` / `endedAt` and duration are unaffected), but token totals, per-turn rows, and cost only count each unique request once.

`server/src/parser/jsonl.ts` was extended to expose `requestId` on `AssistantLine`.

After the fix, `d4183ca6` reports 99 turns / **$23.38** instead of 218 turns / **$57.94** — matching the deduped reference computation.

### 2. Session titles

The JSONL files contain a line like `{ "type": "ai-title", "aiTitle": "…" }` for sessions where Claude Code generated a title (about 5 of 33 in this case). For the rest we fall back to the first real user message — skipping framework-injected blocks (`<local-command-caveat>`, `<command-name>`, `<local-command-stdout>`, `<system-reminder>`, `Caveat:`).

Implemented in `server/src/parser/jsonl.ts`:
- `isAiTitleLine`, `isUserLine` type guards.
- `extractUserText(line)` — pulls plain text out of `message.content` and filters out the framework blocks.

`server/src/parser/usage.ts` now scans for the latest `aiTitle` and the first usable user message during the same pass, then derives a title with this precedence:
1. `aiTitle` if present.
2. First non-framework user message, first non-empty line, whitespace-collapsed, truncated to 80 chars with an ellipsis.
3. `"Untitled session"`.

`title: string` was added to the `Session` type in `server/src/types.ts` and mirrored in `client/src/lib/types.ts`.

### 3. Layout — full-width Recent Sessions and Session Details

`client/src/App.tsx` previously rendered `ContextPanel` and `SessionList` in a 50/50 auto-fit grid. Both panels now live in their own full-width rows.

`client/src/components/SessionDetail.tsx` was a 560px right-side drawer. It is now a full-viewport panel (`top: 0, right: 0, bottom: 0, left: 0`).

### 4. Title surfaced in the UI

- `SessionList` table got a new "Title" column with truncation + tooltip.
- `SessionDetail` shows the title both in the header (with "Session details" as a subtitle) and as an `<h2>` at the top of the body, above the metric badges and `cwd`.

## Files changed

- `server/src/types.ts` — add `title` to `Session`.
- `server/src/parser/jsonl.ts` — add `requestId`, ai-title and user-line type guards, `extractUserText`.
- `server/src/parser/usage.ts` — dedupe by `requestId`, track `aiTitle` / first user message, derive title.
- `client/src/lib/types.ts` — mirror the `title` field.
- `client/src/App.tsx` — drop the 50/50 grid; both panels are full-width rows.
- `client/src/components/SessionList.tsx` — add Title column.
- `client/src/components/SessionDetail.tsx` — full-viewport panel; show title in header and body.

## Verification

- `yarn workspace @claude-monitor/server build` — clean.
- Restarted dev server and hit `/api/sessions`. Costs dropped to roughly half across the board (consistent with the dedup math). One example: `d4183ca6` went from 218 turns / $57.94 to 99 turns / $23.38.

## Notes / follow-ups

- The dashboard's session cost still won't perfectly match Claude Code's live `/usage` — `/usage` reports only the active session, the dashboard reports the entire JSONL. They should now be in the same order of magnitude instead of inflated 2–3×.
- Pricing table in `server/src/pricing.ts` is still a static best-effort map; the cost figure remains an estimate.
