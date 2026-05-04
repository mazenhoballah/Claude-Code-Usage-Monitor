# CLAUDE.md

Guidance for Claude Code (claude.ai/code) when working in this repository.

## What this is

A local one-page React dashboard that surfaces Claude Code token usage, cache efficiency, context overhead, and pre-prompt tips across every Claude Code project on this machine. Reads `~/.claude/projects/**/*.jsonl` directly. No Claude API calls, no DB, no auth, localhost-only.

Spec: `docs/specs/2026-05-04-claude-monitor-design.md`
Plan: `docs/plans/2026-05-04-claude-monitor.md`

## Commands

```bash
yarn install              # install both workspaces

yarn dev                  # server (:4173) + client (:5173) concurrently → open http://localhost:5173
yarn workspace @claude-monitor/server dev    # server only (tsx watch)
yarn workspace @claude-monitor/client dev    # client only (vite)

yarn build                # tsc both packages → server/dist + client/dist
yarn start                # node server/dist/index.js — serves built client from same process on http://127.0.0.1:4173
```

Free ports if a previous run left something listening:
```bash
lsof -ti tcp:4173 tcp:5173 | xargs -r kill
```

## Architecture

Yarn-workspace monorepo. Two packages:

| Package | Purpose |
|---|---|
| `server/` | Express + TypeScript. Parses Claude Code JSONL files on demand, exposes `/api/*` JSON endpoints on `127.0.0.1:4173`. Also serves `client/dist` statically in production. |
| `client/` | Vite + React 18 + TypeScript. Polls `/api/stats` every 7s, `/api/context` every 30s. Inline-styled with design tokens from `client/src/theme.ts`. Lucide icons. |

Both are TypeScript strict mode, ESM (`"type": "module"`).

### Server

- **`server/src/index.ts`** — Express bootstrap. Mounts `statsRouter`, `sessionsRouter`, `contextRouter` under `/api`. If `client/dist/index.html` exists, also serves the built React app (production mode).
- **`server/src/types.ts`** — Shared types matching spec §4.2: `Stats`, `Session`, `SessionDetail`, `SessionTurn`, `UsageTotals`, `ContextOverhead`, `ContextFile`. Mirrored verbatim in `client/src/lib/types.ts` (intentional duplication, see comment in that file).
- **`server/src/pricing.ts`** — Static `PRICING` map (`$/Mtok`) per model + `MODEL_WINDOWS` map. `costFor(model, usage)` and `windowFor(model)` helpers. Update the table when Anthropic publishes new pricing.
- **`server/src/cache.ts`** — `memoTTL(ttlMs, fn)` helper. All routes wrap their compute fn in this with `ttlMs = 3000` so polls cost one filesystem walk per 3s, not per request. Has inflight dedup.
- **`server/src/parser/`**:
  - `jsonl.ts` — `readJsonl(path)` async generator + `isAssistantLine` type guard. Tolerant of malformed lines (older Claude Code sessions sometimes have partial writes).
  - `projects.ts` — `listProjects()` discovers projects under `~/.claude/projects/`, decodes encoded folder names back to absolute paths.
  - `usage.ts` — `parseSessionFile(filePath, project)` aggregates one session's per-turn metrics. Picks the dominant model. Computes `cumulativeContextPct` per turn = `Σ(input + cache_creation) / windowFor(model)`.
  - `context.ts` — `contextOverheadFor(project)` walks `CLAUDE.md`, project memory dir, and `~/.claude/skills/` to estimate the token cost of files loaded into every prompt. Token estimate = `Math.ceil(bytes / 4)` (chars/4 heuristic, no tokenizer dep — accept ~10% error).
- **`server/src/routes/`**:
  - `sessions.ts` — `GET /api/sessions?limit=N`, `GET /api/sessions/:id`. `getAllSessions` is exported and re-used by `stats.ts`.
  - `stats.ts` — `GET /api/stats`. Computes today/week/all-time totals, cache hit rate, cost saved, and `activeSession` (the JSONL with most recent mtime within the last 30 minutes).
  - `context.ts` — `GET /api/context`. One entry per project.

### Client

- **`client/src/main.tsx`** — React root, `<StrictMode>`, imports `styles/global.css`.
- **`client/src/App.tsx`** — Layout. Polls `api.stats` (7s) and `api.context` (30s). Composes: `TopBar`, `SummaryCards`, `PrePromptTips`, `ContextPanel`, `SessionList`, `SessionDetail` (modal).
- **`client/src/theme.ts`** — Design tokens: dark-mode palette (slate-950 bg, slate-900 surface, green-500 positive, amber-500 warning, red-500 danger, blue-500 accent), Fira Code (mono) + Fira Sans (sans).
- **`client/src/styles/global.css`** — Google Fonts import, reset, focus-visible ring, `prefers-reduced-motion` override.
- **`client/src/lib/`**:
  - `types.ts` — Mirror of server types (DO NOT add a TS project ref to import them across packages — keep duplication).
  - `format.ts` — `formatTokens` (`1.2k`, `3.4M`), `formatCost` (`$2.40`), `formatPct`, `formatDuration`, `formatRelative`.
  - `api.ts` — Typed fetch wrappers (`api.stats()`, `api.sessions()`, `api.session(id)`, `api.context()`).
- **`client/src/hooks/usePoll.ts`** — Generic polling hook. Pauses when tab is hidden, refreshes immediately on visibilitychange, default 7s interval. **All polling in this app goes through this hook.**
- **`client/src/components/`** — Atomic-ish layout. `ui/` holds primitives (`Card`, `Badge`, `ProgressBar`); top-level files are panels (`TopBar`, `SummaryCards`, `PrePromptTips`, `ContextPanel`, `SessionList`, `SessionDetail`).

### Vite proxy

`client/vite.config.ts` proxies `/api/*` from `:5173` → `:4173` so the dev client and prod client both call the same relative URLs.

## Conventions

- **No tests in v1** (per spec §10). When adding tests later, set up Vitest in each workspace separately.
- **Inline styles** with theme tokens. No CSS-in-JS library, no Tailwind. If a style is used in 3+ places, hoist it to `theme.ts` or extract a primitive in `components/ui/`.
- **No emojis as icons.** Use Lucide React (`lucide-react`) — already installed.
- **ESM imports on server** — every relative import must end in `.js` (TypeScript ESM rule). Example: `import { foo } from './bar.js'` even though the source file is `bar.ts`.
- **Strict TS** with `noUnusedLocals` and `noUnusedParameters` (from `tsconfig.base.json`). Prefix unused params with `_` (e.g., `(_req, res) => …`).
- **Endpoints stay JSON-shaped per spec §4.2.** If you change a route's response, update both `server/src/types.ts` and `client/src/lib/types.ts` in the same commit.
- **Cache layer is mandatory for filesystem-walking routes.** Wrap any new endpoint that touches `~/.claude/projects/` in `memoTTL(3000, ...)` to avoid hammering the FS on every poll.
- **Localhost-only.** Server binds `127.0.0.1`. Don't change to `0.0.0.0` without an auth layer.

## Adding a new metric

1. **Decide where the data comes from.** Recorded usage (input/output/cache_*) is exact and lives in JSONL `message.usage`. Anything else (context overhead, file cost) is estimated — be explicit in the UI.
2. **Extend types** in `server/src/types.ts` AND `client/src/lib/types.ts`.
3. **Compute it** in `server/src/parser/usage.ts` (per-session) or directly in the route's `compute` function (cross-session aggregates).
4. **Surface it** in the relevant route under `/api/*` — wrap in `memoTTL`.
5. **Render it** by adding a new panel under `client/src/components/` and wiring it into `App.tsx`. Use existing primitives (`Card`, `Badge`, `ProgressBar`) before inventing new ones.
6. **Add a formatter** to `lib/format.ts` if the value type isn't already handled.

## Adding a new model to the pricing table

Edit `server/src/pricing.ts`. Add the model to both `PRICING` (`$/Mtok` for input/output/cacheRead/cacheWrite) and `MODEL_WINDOWS` (context window in tokens). The `priceFor` and `windowFor` helpers fall back to a Sonnet-equivalent default + `200_000` if the model isn't found.

## Common gotchas

- **TS6133 "X is declared but never read"** — strict mode. Either use it or remove the import. Don't disable the rule.
- **Server fails to start on `:4173`** — usually a leftover `tsx watch` from a previous session. `lsof -ti tcp:4173 | xargs kill`.
- **Vite binds to IPv6 `::1` on macOS, not `127.0.0.1`** — for curl smoke tests, hit `http://localhost:5173` (which resolves to both) instead of `http://127.0.0.1:5173`.
- **`yarn dev` engine error** — root `engines` is `>=18`. If you hit `--ignore-engines`-style failures, check Node version (`node -v`).
- **Dashboard shows zero data** — confirm `~/.claude/projects/` has session JSONLs (`ls ~/.claude/projects/`). The parser silently skips lines without `message.usage`.
- **Numbers look "too cached"** — Claude Code's cache hit rate is genuinely 95%+ on long sessions. The math is `cache_read / (cache_read + non_cache_input)`, both numbers from the JSONL. If `today.input` is tiny and `cache_read` is huge, that's correct.

## Files NOT to touch without thinking twice

- `docs/specs/*` — frozen design. If you need changes, write a new spec doc rather than editing in place.
- `docs/plans/*` — historical record of what was built. Don't rewrite history.
- `tsconfig.base.json` — both workspaces extend it. A change ripples everywhere.
