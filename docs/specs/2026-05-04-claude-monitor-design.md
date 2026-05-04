# Claude Monitor — Design Spec

**Date:** 2026-05-04
**Status:** Approved, ready for implementation plan
**Owner:** mazen.hoballah@starlake.ai

## 1. Goal

A local one-page React dashboard that surfaces Claude Code token usage, cache efficiency, context overhead, and "what to know before prompting" — across every Claude Code project on this machine.

The dashboard answers four questions at a glance:

1. How many tokens am I burning, where, and how much is it costing?
2. How well is prompt caching working for me?
3. What's eating my context window before I even type (CLAUDE.md, MEMORY.md, skills, system prompt)?
4. Should I `/clear`, switch sessions, or keep going on my next prompt?

## 2. Non-goals (v1)

- Historical charts / time-series visualization
- CSV / JSON export
- Alerts / desktop notifications
- Multi-machine aggregation
- Light mode (dark-only)
- Authentication (localhost-only, bound to `127.0.0.1`)

## 3. Architecture

```
~/claude-monitor/
├── package.json              workspaces: client + server
├── README.md
├── docs/specs/               this spec lives here
├── server/
│   ├── package.json
│   ├── tsconfig.json
│   ├── src/
│   │   ├── index.ts          Express bootstrap, :4173, 127.0.0.1 only
│   │   ├── routes/
│   │   │   ├── stats.ts      GET /api/stats — aggregated metrics
│   │   │   ├── sessions.ts   GET /api/sessions, GET /api/sessions/:id
│   │   │   └── context.ts    GET /api/context — md/skill overhead per project
│   │   ├── parser/
│   │   │   ├── jsonl.ts      streams ~/.claude/projects/**/*.jsonl
│   │   │   ├── usage.ts      extracts and aggregates message.usage
│   │   │   └── context.ts    measures CLAUDE.md/MEMORY.md/skills token cost
│   │   ├── pricing.ts        model → $/Mtok (Opus/Sonnet/Haiku 4.x)
│   │   └── cache.ts          3s in-memory cache of /api/stats response
└── client/
    ├── package.json
    ├── index.html
    ├── vite.config.ts        dev proxy /api → http://127.0.0.1:4173
    ├── tsconfig.json
    └── src/
        ├── main.tsx
        ├── App.tsx
        ├── theme.ts          design tokens (colors, fonts, spacing)
        ├── styles/
        │   └── global.css    Fira Code + Fira Sans imports, reset
        ├── hooks/
        │   └── usePoll.ts    useEffect + setInterval, 7s default
        ├── lib/
        │   ├── api.ts        fetch wrappers
        │   └── format.ts     formatTokens, formatCost, formatDuration
        └── components/
            ├── TopBar.tsx          floating, brand + active-session pill
            ├── SummaryCards.tsx    today / week / all-time / cache savings / cost
            ├── SessionList.tsx     all sessions, sortable
            ├── SessionDetail.tsx   slide-in panel: per-turn breakdown
            ├── ContextPanel.tsx    CLAUDE.md / MEMORY.md / skills overhead
            ├── PrePromptTips.tsx   live context %, cache warmth, suggestions
            └── ui/                 Card, Badge, ProgressBar, Sparkline
```

## 4. Data model

### 4.1 Source files
Claude Code writes one JSONL per session at:

```
~/.claude/projects/<encoded-cwd>/<sessionId>.jsonl
```

Each line is a JSON object. Lines with `type: "assistant"` carry the field we care about:

```jsonc
{
  "type": "assistant",
  "timestamp": "2026-04-28T...",
  "sessionId": "...",
  "cwd": "/Users/.../site",
  "message": {
    "model": "claude-opus-4-7",
    "usage": {
      "input_tokens": 4,
      "output_tokens": 312,
      "cache_creation_input_tokens": 1840,
      "cache_read_input_tokens": 18204
    }
  }
}
```

### 4.2 Aggregated shape (server → client)

```ts
type Stats = {
  totals: {
    today:    UsageTotals;
    week:     UsageTotals;
    allTime:  UsageTotals;
  };
  cache: {
    hitRate:        number;   // 0..1, cache_read / (cache_read + input)
    tokensSaved:    number;   // cache_read tokens
    estCostSaved:   number;   // tokensSaved * (input_price - cache_read_price)
  };
  cost: {
    today:   number;
    week:    number;
    allTime: number;
  };
  activeSession: {
    sessionId:  string;
    project:    string;        // encoded-cwd → human path
    cwd:        string;
    startedAt:  string;
    lastEventAt: string;
    turns:      number;
    contextPct: number;        // estimated % of 200k used in current session
  } | null;
};

type UsageTotals = {
  input:        number;
  output:       number;
  cacheCreate:  number;
  cacheRead:    number;
  total:        number;        // sum of all four
  turns:        number;
};

type Session = {
  id:          string;
  project:     string;
  cwd:         string;
  startedAt:   string;
  endedAt:     string;
  durationMs:  number;
  model:       string;         // most-frequent model in session
  turns:       number;
  totals:      UsageTotals;
  cost:        number;         // computed from pricing.ts
};

type SessionDetail = Session & {
  perTurn: Array<{
    timestamp:    string;
    model:        string;
    input:        number;
    output:       number;
    cacheRead:    number;
    cacheCreate:  number;
    cost:         number;
    cumulativeContextPct: number;  // running total / 200k
  }>;
};

type ContextOverhead = {
  project:    string;
  cwd:        string;
  files: Array<{
    path:      string;          // relative to project
    role:      'CLAUDE.md' | 'MEMORY.md' | 'memory-file' | 'skill';
    bytes:     number;
    estTokens: number;          // ceil(chars / 4)
  }>;
  totalEstTokens: number;
};
```

## 5. Token counting

**Recorded usage** (input/output/cache) comes straight from the JSONL `message.usage` object — these are exact, billed numbers, no estimation.

**Md / skill file cost** is estimated as `Math.ceil(chars / 4)`. This is intentionally not tiktoken — adding a tokenizer dep is overkill for a personal dashboard, and the heuristic is within ~10% for English/code, which is sufficient for "is this file eating too much context?" guidance.

**Active-session context %:** sum all `input + cache_creation_input_tokens` for the active session's turns, divide by 200,000 (Opus 4.7 default). If we detect a different model in the session, use its window from a `MODEL_WINDOWS` table in `pricing.ts`.

## 6. Pricing table (server/pricing.ts)

Static map, easy to update:

```ts
export const PRICING = {
  'claude-opus-4-7':       { input: 15,  output: 75, cacheRead: 1.5,  cacheWrite: 18.75 },
  'claude-opus-4-7[1m]':   { input: 30,  output: 150, cacheRead: 3.0,  cacheWrite: 37.5 },
  'claude-sonnet-4-6':     { input: 3,   output: 15, cacheRead: 0.3,  cacheWrite: 3.75 },
  'claude-haiku-4-5':      { input: 1,   output: 5,  cacheRead: 0.1,  cacheWrite: 1.25 },
  // $/Mtok
} as const;
```

Cost = `(input * input_price + output * output_price + cacheRead * cacheRead_price + cacheCreate * cacheWrite_price) / 1_000_000`.

Pricing constants are best-effort and clearly labeled "estimated" in the UI.

## 7. API endpoints

| Method | Path | Returns |
|---|---|---|
| GET | `/api/stats` | `Stats` (cached 3s) |
| GET | `/api/sessions?limit=50&sort=recent` | `Session[]` |
| GET | `/api/sessions/:id` | `SessionDetail` |
| GET | `/api/context` | `ContextOverhead[]` (one per project) |
| GET | `/api/health` | `{ ok: true, projectsScanned: N }` |

All bound to `127.0.0.1:4173`.

## 8. Polling and freshness

- Client polls `/api/stats` every **7s**.
- Server caches each route response for **3s** (in-memory). Rapid polls cost one filesystem walk per 3s, not per request.
- `/api/sessions/:id` is not cached (small, called only when a row is opened).
- `prefers-reduced-motion` users: polling continues, but the "tokens climbing" subtle-pulse animation is disabled.

## 9. UI/UX

### 9.1 Design tokens

```ts
// client/src/theme.ts
export const theme = {
  color: {
    bg:          '#020617',  // slate-950
    surface:     '#0F172A',  // slate-900 — card bg
    surfaceHi:   '#1E293B',  // slate-800 — hover, panel
    border:      '#1E293B',
    text:        '#F8FAFC',  // slate-50
    muted:       '#94A3B8',  // slate-400
    positive:    '#22C55E',  // green-500 — cache hits, savings
    warning:     '#F59E0B',  // amber-500 — context > 70%
    danger:      '#EF4444',  // red-500 — context > 90%, expensive turns
    accent:      '#3B82F6',  // blue-500 — active session, links
  },
  font: {
    mono: '"Fira Code", ui-monospace, monospace',
    sans: '"Fira Sans", system-ui, sans-serif',
  },
  radius: { sm: 6, md: 10, lg: 16 },
  shadow: {
    glow: '0 0 12px rgba(59, 130, 246, 0.25)',
    card: '0 4px 24px rgba(0, 0, 0, 0.4)',
  },
  transition: '150ms ease-out',
} as const;
```

### 9.2 Layout

```
┌──────────────────────────────────────────────────────────────┐
│  [floating top bar — top-4 left-4 right-4 — slate-900]       │
│   Claude Monitor              ● active: site (Opus 4.7)      │
└──────────────────────────────────────────────────────────────┘

┌── Summary Cards (4 col grid, 2 col on tablet, 1 col mobile) ─┐
│ [Today]    [This Week]   [All-Time]   [Cache Savings]        │
│  124k tok   1.8M tok      14.2M tok    $42.18 saved          │
│  $2.40      $34.10        $268.40      87% hit rate          │
└──────────────────────────────────────────────────────────────┘

┌── Pre-Prompt Tips (full width, prominent) ──────────────────┐
│  ⚠ Context: 73% of 200k used in current session             │
│  Cache: warm — next turn will be cheap (~$0.04 est)          │
│  Top tool this session: Read (43% of input tokens)           │
│  Suggestion: consider /clear before next big task            │
└──────────────────────────────────────────────────────────────┘

┌── 2-col grid ───────────────────────────────────────────────┐
│ ┌─ Context Overhead ──────┐  ┌─ Recent Sessions ─────────┐  │
│ │ Per project, table:     │  │ Sortable table:           │  │
│ │  CLAUDE.md   3.2k tok   │  │  Today 14:01  site  124k  │  │
│ │  MEMORY.md     412 tok  │  │  Today 11:30  app    78k  │  │
│ │  user_role.md  88 tok   │  │  Yesterday    ...          │  │
│ │  ─────────────────────  │  │  click → detail panel       │  │
│ │  Total      3.7k / 200k │  │                             │  │
│ └─────────────────────────┘  └─────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

### 9.3 Interaction details

- All cards: `cursor-pointer` if clickable, hover = `surfaceHi` bg + soft border glow, no scale.
- Big numbers (token counts, $): Fira Code, `text-shadow: 0 0 10px rgba(59,130,246,0.4)` for accent.
- Cache hit rate: progress ring, green fill, percentage centered.
- Context % bar: green < 50%, amber 50–80%, red > 80%.
- Session detail: slides in from right, ESC closes, focus-trapped.
- Focus rings: `outline: 2px solid accent; outline-offset: 2px` on all interactive elements.
- Transitions: 150ms `ease-out` on color/opacity only — never on layout.

### 9.4 Responsive breakpoints

- Mobile (<640px): one column, summary cards stack, session detail becomes full-screen modal.
- Tablet (640–1024px): two-column summary, panels stack.
- Desktop (≥1024px): four-column summary, two-column panel grid.
- `max-w-7xl` (1280px) center container at all sizes.

### 9.5 Accessibility

- All interactive elements keyboard-reachable, visible focus states.
- Color is never the only indicator (context bar also shows %, danger turns also have a danger badge).
- Numbers have `aria-label` with the unit spelled out (`aria-label="124,000 tokens"`).
- `prefers-reduced-motion: reduce` disables the pulse animation on the active-session indicator.

## 10. Project setup

- Yarn workspaces (matches user's existing tooling preference).
- TypeScript strict mode, both packages.
- Single `yarn dev` runs server + client concurrently (using `concurrently`).
- Single `yarn build` produces a `client/dist` and `server/dist`.
- Single `yarn start` serves the built client from the Express server on `:4173`.
- ESLint + Prettier with reasonable defaults; no test runner in v1.

## 11. Risks and decisions

| Risk | Decision |
|---|---|
| Pricing table goes stale | Static, hardcoded, with a comment pointing to Anthropic pricing page; UI labels all $ as "est." |
| Token estimate for md files imprecise | Document the chars/4 heuristic in the UI tooltip; accept ~10% error for v1 |
| Large JSONL files slow parsing | Stream line-by-line, cache 3s, scan once per request; benchmark with the existing ~100 sessions on this machine |
| User has very old sessions with different schema | Defensive parser: skip lines without `message.usage`, log a warning, keep going |
| 200k context window assumption | Derive from model in active session (table in `pricing.ts`); fall back to 200k |

## 12. Out-of-scope follow-ups (parking lot)

- Sparkline charts of tokens-per-day on each summary card
- Project filter dropdown
- Per-tool token attribution (parse tool_use blocks)
- Export current view as markdown report
- Daily budget alert ("you've spent $X today")
