# Claude Code Usage Monitor

Local dashboard for monitoring Claude Code token and cost usage in real time.

Reads directly from `~/.claude/projects/` — no API key, no external service, no telemetry.

---

## Features

### Dashboard

- **Today's sessions panel** — sessions active since local midnight with token and cost totals
- **Live summary cards** — today / this week / all-time tokens, cost, and cache savings
- **Cache hit rate** — real percentage including cache-write misses, with estimated cost saved
- **Active session badge** — highlights the session with activity in the last 30 minutes
- **Context overhead panel** — estimates tokens loaded into every prompt from CLAUDE.md, memory files, and skills
- **Pre-prompt tips** — actionable suggestions based on your actual usage patterns

### Sessions

- **Full sessions table** — sortable by When, Title, Project, Tokens, or Cost (click any column header to toggle asc/desc)
- **Session detail** — expand any session to see per-turn breakdown: model, input/output, cache read/write, cost, and cumulative context %
- **Context % bar** — colored indicator (green < 40%, amber 40–80%, red > 80%) showing how full the context window was

### Accuracy

- Per-turn timestamp aggregation — "today" means local calendar day, not rolling 24h; cross-midnight sessions are split correctly
- Cache hit rate denominator includes `cache_creation` tokens (writes are paid misses, not free)
- Cost saved = `cacheRead × (inputPrice − cacheReadPrice)` per turn, per model
- Deduplicates assistant lines sharing a `requestId` so a single API call isn't counted multiple times

---

## Requirements

- Node.js ≥ 18
- Yarn
- Claude Code installed and used at least once (needs `~/.claude/projects/` to exist)

---

## Usage

```bash
git clone https://github.com/mazenhoballah/Claude-Code-Usage-Monitor.git
cd Claude-Code-Usage-Monitor
yarn install
yarn dev        # server on :4173, client on :5173
```

Open **http://localhost:5173**.

### Production

```bash
yarn build
yarn start      # serves everything on http://127.0.0.1:4173
```

---

## How it works

The server scans `~/.claude/projects/**/*.jsonl` — the append-only session files written by Claude Code. It parses usage metrics (input tokens, output tokens, cache reads/writes) from every assistant turn, deduplicates by `requestId`, and exposes them via a JSON API polled by the React client every 7 seconds for stats and 15 seconds for sessions.

No database, no external dependencies beyond the Node.js ecosystem.

---

## Pricing

Costs are computed locally using the public Anthropic pricing table (Opus / Sonnet / Haiku). All dollar figures are labeled **est.** — they match API pricing and are a close approximation for Claude Code subscription usage.

| Model                | Input    | Output    | Cache Read | Cache Write |
| -------------------- | -------- | --------- | ---------- | ----------- |
| claude-opus-4-7      | $15/Mtok | $75/Mtok  | $1.5/Mtok  | $18.75/Mtok |
| claude-opus-4-7 [1M] | $30/Mtok | $150/Mtok | $3.0/Mtok  | $37.5/Mtok  |
| claude-sonnet-4-6    | $3/Mtok  | $15/Mtok  | $0.3/Mtok  | $3.75/Mtok  |
| claude-haiku-4-5     | $1/Mtok  | $5/Mtok   | $0.1/Mtok  | $1.25/Mtok  |

---

## License

MIT
