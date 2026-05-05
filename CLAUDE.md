# CLAUDE.md

Local React dashboard for Claude Code token/cost/cache metrics. Reads `~/.claude/projects/**/*.jsonl`. No API calls, no DB, localhost-only.

Spec: `docs/specs/2026-05-04-claude-monitor-design.md`

## Commands

```bash
yarn dev          # server (:4173) + client (:5173) → http://localhost:5173
yarn build        # tsc both packages
yarn start        # serve built client + server on http://127.0.0.1:4173

# Free stuck ports:
lsof -ti tcp:4173 tcp:5173 | xargs -r kill
```

## Architecture

Yarn monorepo. `server/` = Express + TypeScript on `127.0.0.1:4173`. `client/` = Vite + React 18.

Key server files:
- `src/types.ts` — shared types (mirrored verbatim in `client/src/lib/types.ts`)
- `src/pricing.ts` — `PRICING` map + `costFor` / `windowFor` helpers
- `src/cache.ts` — `memoTTL(3000, fn)` — wrap all FS-walking routes
- `src/parser/usage.ts` — `parseSessionFile` aggregates per-turn metrics
- `src/routes/stats.ts` — `GET /api/stats`; aggregates by per-turn timestamp
- `src/routes/sessions.ts` — `GET /api/sessions`, `GET /api/sessions/:id`

Key client files:
- `src/theme.ts` — design tokens (dark palette, Fira Code / Fira Sans)
- `src/lib/api.ts` — typed fetch wrappers
- `src/hooks/usePoll.ts` — **all polling goes through this hook**
- `src/components/` — `ui/` primitives (Card, Badge, ProgressBar) + panels

## Conventions

- **Inline styles** with theme tokens. No Tailwind, no CSS-in-JS.
- **Lucide icons** — no emoji icons.
- **ESM imports on server** — every relative import must end in `.js`.
- **Strict TS** — prefix unused params with `_`. Never disable TS6133.
- **Types in sync** — changing a route response requires updating both `server/src/types.ts` and `client/src/lib/types.ts`.
- **Cache layer mandatory** — wrap any new FS-walking endpoint in `memoTTL(3000, ...)`.
- **No tests in v1** (per spec §10).
- **Server binds `127.0.0.1`** — never change to `0.0.0.0`.

## Do not touch without thinking twice

- `docs/specs/*` — frozen. Write a new spec instead of editing.
- `tsconfig.base.json` — both workspaces extend it; changes ripple everywhere.

## Gotchas

- Server fails on `:4173` → leftover `tsx watch`. Kill with `lsof -ti tcp:4173 | xargs kill`.
- Vite binds to IPv6 `::1` on macOS — curl-test with `http://localhost:5173`, not `127.0.0.1:5173`.
- Dashboard shows zero data → confirm `~/.claude/projects/` has session JSONLs.
- Cache hit rate is genuinely 80–96% on real sessions; `input_tokens` in JSONL is non-cached input only.
