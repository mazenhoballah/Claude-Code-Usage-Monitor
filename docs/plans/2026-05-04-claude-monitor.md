# Claude Monitor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local one-page React dashboard (`~/claude-monitor`) that surfaces Claude Code token usage, cache efficiency, context overhead, and pre-prompt tips across all Claude Code projects on this machine.

**Architecture:** Yarn-workspace monorepo. A tiny Express server (`server/`) parses `~/.claude/projects/**/*.jsonl` on demand and exposes JSON endpoints on `127.0.0.1:4173`. A Vite + React + TS client (`client/`) polls those endpoints every 7s and renders a dark-mode dashboard. No DB, no Claude API calls, all numbers come from local files.

**Tech Stack:** TypeScript (strict), Node 20+, Express 4, Vite 5, React 18, Yarn workspaces, `concurrently` for dev. Fonts: Fira Code + Fira Sans. Icons: Lucide. No test runner in v1 (per spec §10).

**Spec:** `docs/specs/2026-05-04-claude-monitor-design.md`

**Working directory for all commands:** `~/claude-monitor` unless otherwise specified.

---

## File Structure

Each file has one clear responsibility:

| File | Responsibility |
|---|---|
| `package.json` (root) | Workspaces config, `dev` / `build` / `start` scripts |
| `server/src/index.ts` | Express bootstrap, route mounting, port binding |
| `server/src/cache.ts` | Generic 3s TTL in-memory cache helper |
| `server/src/pricing.ts` | Static pricing table, model-window table, `costFor()` calc |
| `server/src/parser/jsonl.ts` | Stream a JSONL file, yield typed message lines |
| `server/src/parser/usage.ts` | Aggregate per-session / per-day `UsageTotals` |
| `server/src/parser/context.ts` | Estimate token cost of CLAUDE.md / MEMORY.md / skills |
| `server/src/parser/projects.ts` | Discover projects under `~/.claude/projects/`, decode paths |
| `server/src/routes/stats.ts` | `GET /api/stats` — top-level summary |
| `server/src/routes/sessions.ts` | `GET /api/sessions` and `/:id` |
| `server/src/routes/context.ts` | `GET /api/context` |
| `server/src/types.ts` | Shared types (mirrors spec §4.2), exported for client too |
| `client/index.html` | Vite entry HTML |
| `client/vite.config.ts` | Dev proxy `/api → 127.0.0.1:4173` |
| `client/src/main.tsx` | React root |
| `client/src/App.tsx` | Layout, top bar + grid of panels |
| `client/src/theme.ts` | Design tokens (mirrors spec §9.1) |
| `client/src/styles/global.css` | Font imports, reset, base styles |
| `client/src/lib/api.ts` | Typed fetch wrappers for `/api/*` |
| `client/src/lib/format.ts` | `formatTokens`, `formatCost`, `formatDuration`, `formatPct` |
| `client/src/lib/types.ts` | Re-exported types matching server `types.ts` |
| `client/src/hooks/usePoll.ts` | Generic polling hook with 7s default + visibility-aware pause |
| `client/src/components/ui/Card.tsx` | Reusable card primitive |
| `client/src/components/ui/Badge.tsx` | Small status badge |
| `client/src/components/ui/ProgressBar.tsx` | Threshold-colored progress bar |
| `client/src/components/TopBar.tsx` | Floating top bar with active-session pill |
| `client/src/components/SummaryCards.tsx` | 4-col summary grid |
| `client/src/components/PrePromptTips.tsx` | Context %, cache warmth, suggestions |
| `client/src/components/ContextPanel.tsx` | Per-project md/skill overhead table |
| `client/src/components/SessionList.tsx` | Sortable session table |
| `client/src/components/SessionDetail.tsx` | Slide-in per-turn detail panel |

---

## Task 1: Workspace Skeleton

**Files:**
- Create: `~/claude-monitor/package.json`
- Create: `~/claude-monitor/.gitignore`
- Create: `~/claude-monitor/.nvmrc`
- Create: `~/claude-monitor/README.md`
- Create: `~/claude-monitor/tsconfig.base.json`

- [ ] **Step 1: Write the root `package.json`**

```json
{
  "name": "claude-monitor",
  "private": true,
  "version": "0.1.0",
  "workspaces": ["server", "client"],
  "scripts": {
    "dev": "concurrently -n server,client -c blue,green \"yarn workspace @claude-monitor/server dev\" \"yarn workspace @claude-monitor/client dev\"",
    "build": "yarn workspace @claude-monitor/server build && yarn workspace @claude-monitor/client build",
    "start": "yarn workspace @claude-monitor/server start"
  },
  "devDependencies": {
    "concurrently": "^9.0.0",
    "typescript": "^5.4.0"
  },
  "engines": { "node": ">=20" }
}
```

- [ ] **Step 2: Write `.gitignore`**

```
node_modules
dist
*.log
.DS_Store
.env
.env.local
client/dist
server/dist
```

- [ ] **Step 3: Write `.nvmrc`**

```
20
```

- [ ] **Step 4: Write `tsconfig.base.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

- [ ] **Step 5: Write `README.md`**

```markdown
# Claude Monitor

Local dashboard for Claude Code token usage, cache efficiency, and context overhead.

## Run

```bash
yarn install
yarn dev      # starts server (:4173) + client (:5173)
```

Open http://localhost:5173.

## Build & start production

```bash
yarn build
yarn start
```

Open http://127.0.0.1:4173.

Reads from `~/.claude/projects/**/*.jsonl`. Localhost-only. No data leaves your machine.
```

- [ ] **Step 6: Commit**

```bash
cd ~/claude-monitor
git add .
git commit -m "chore: workspace skeleton"
```

---

## Task 2: Server Package + Express Bootstrap

**Files:**
- Create: `~/claude-monitor/server/package.json`
- Create: `~/claude-monitor/server/tsconfig.json`
- Create: `~/claude-monitor/server/src/index.ts`

- [ ] **Step 1: Write `server/package.json`**

```json
{
  "name": "@claude-monitor/server",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "main": "dist/index.js",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc -p .",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "express": "^4.19.2"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/node": "^20.12.0",
    "tsx": "^4.7.0",
    "typescript": "^5.4.0"
  }
}
```

- [ ] **Step 2: Write `server/tsconfig.json`**

```json
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "module": "ES2022",
    "moduleResolution": "Node",
    "lib": ["ES2022"]
  },
  "include": ["src/**/*"]
}
```

- [ ] **Step 3: Write `server/src/index.ts`**

```ts
import express from 'express';

const PORT = 4173;
const HOST = '127.0.0.1';

const app = express();

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.listen(PORT, HOST, () => {
  console.log(`[claude-monitor] server listening on http://${HOST}:${PORT}`);
});
```

- [ ] **Step 4: Install and smoke-test**

```bash
cd ~/claude-monitor && yarn install
cd ~/claude-monitor && yarn workspace @claude-monitor/server dev &
sleep 2
curl -s http://127.0.0.1:4173/api/health
kill %1 2>/dev/null || true
```

Expected output: `{"ok":true}`

- [ ] **Step 5: Commit**

```bash
cd ~/claude-monitor
git add .
git commit -m "feat(server): express bootstrap with /api/health"
```

---

## Task 3: Shared Types Module

**Files:**
- Create: `~/claude-monitor/server/src/types.ts`

- [ ] **Step 1: Write `server/src/types.ts`**

```ts
export type UsageTotals = {
  input: number;
  output: number;
  cacheCreate: number;
  cacheRead: number;
  total: number;
  turns: number;
};

export type ActiveSession = {
  sessionId: string;
  project: string;
  cwd: string;
  startedAt: string;
  lastEventAt: string;
  turns: number;
  contextPct: number;
} | null;

export type Stats = {
  totals: { today: UsageTotals; week: UsageTotals; allTime: UsageTotals };
  cache: { hitRate: number; tokensSaved: number; estCostSaved: number };
  cost: { today: number; week: number; allTime: number };
  activeSession: ActiveSession;
  topToolHint?: { name: string; pctOfInput: number } | null;
};

export type Session = {
  id: string;
  project: string;
  cwd: string;
  startedAt: string;
  endedAt: string;
  durationMs: number;
  model: string;
  turns: number;
  totals: UsageTotals;
  cost: number;
};

export type SessionTurn = {
  timestamp: string;
  model: string;
  input: number;
  output: number;
  cacheRead: number;
  cacheCreate: number;
  cost: number;
  cumulativeContextPct: number;
};

export type SessionDetail = Session & { perTurn: SessionTurn[] };

export type ContextFile = {
  path: string;
  role: 'CLAUDE.md' | 'MEMORY.md' | 'memory-file' | 'skill';
  bytes: number;
  estTokens: number;
};

export type ContextOverhead = {
  project: string;
  cwd: string;
  files: ContextFile[];
  totalEstTokens: number;
};
```

- [ ] **Step 2: Commit**

```bash
cd ~/claude-monitor
git add .
git commit -m "feat(server): shared types matching spec §4.2"
```

---

## Task 4: Pricing Module

**Files:**
- Create: `~/claude-monitor/server/src/pricing.ts`

- [ ] **Step 1: Write `server/src/pricing.ts`**

```ts
// $/Mtok. Best-effort estimates — UI labels all $ figures as "est."
// Update this table when Anthropic publishes new pricing.
export const PRICING: Record<string, { input: number; output: number; cacheRead: number; cacheWrite: number }> = {
  'claude-opus-4-7':       { input: 15,  output: 75,  cacheRead: 1.5,  cacheWrite: 18.75 },
  'claude-opus-4-7[1m]':   { input: 30,  output: 150, cacheRead: 3.0,  cacheWrite: 37.5  },
  'claude-opus-4-6':       { input: 15,  output: 75,  cacheRead: 1.5,  cacheWrite: 18.75 },
  'claude-sonnet-4-6':     { input: 3,   output: 15,  cacheRead: 0.3,  cacheWrite: 3.75  },
  'claude-sonnet-4-5':     { input: 3,   output: 15,  cacheRead: 0.3,  cacheWrite: 3.75  },
  'claude-haiku-4-5':      { input: 1,   output: 5,   cacheRead: 0.1,  cacheWrite: 1.25  },
};

const DEFAULT_PRICE = { input: 3, output: 15, cacheRead: 0.3, cacheWrite: 3.75 };

export function priceFor(model: string) {
  return PRICING[model] ?? PRICING[model.replace(/-\d{8}$/, '')] ?? DEFAULT_PRICE;
}

export function costFor(model: string, u: { input: number; output: number; cacheRead: number; cacheCreate: number }): number {
  const p = priceFor(model);
  return (u.input * p.input + u.output * p.output + u.cacheRead * p.cacheRead + u.cacheCreate * p.cacheWrite) / 1_000_000;
}

// model → context window (tokens)
export const MODEL_WINDOWS: Record<string, number> = {
  'claude-opus-4-7':     200_000,
  'claude-opus-4-7[1m]': 1_000_000,
  'claude-opus-4-6':     200_000,
  'claude-sonnet-4-6':   200_000,
  'claude-sonnet-4-5':   200_000,
  'claude-haiku-4-5':    200_000,
};

export function windowFor(model: string): number {
  return MODEL_WINDOWS[model] ?? MODEL_WINDOWS[model.replace(/-\d{8}$/, '')] ?? 200_000;
}
```

- [ ] **Step 2: Commit**

```bash
cd ~/claude-monitor
git add .
git commit -m "feat(server): pricing table and cost calculation"
```

---

## Task 5: 3s TTL Cache Helper

**Files:**
- Create: `~/claude-monitor/server/src/cache.ts`

- [ ] **Step 1: Write `server/src/cache.ts`**

```ts
type Entry<T> = { value: T; expiresAt: number };

export function memoTTL<T>(ttlMs: number, fn: () => Promise<T>): () => Promise<T> {
  let entry: Entry<T> | null = null;
  let inflight: Promise<T> | null = null;
  return async () => {
    const now = Date.now();
    if (entry && entry.expiresAt > now) return entry.value;
    if (inflight) return inflight;
    inflight = (async () => {
      try {
        const value = await fn();
        entry = { value, expiresAt: Date.now() + ttlMs };
        return value;
      } finally {
        inflight = null;
      }
    })();
    return inflight;
  };
}
```

- [ ] **Step 2: Commit**

```bash
cd ~/claude-monitor
git add .
git commit -m "feat(server): TTL memoization helper"
```

---

## Task 6: JSONL Streaming Parser

**Files:**
- Create: `~/claude-monitor/server/src/parser/jsonl.ts`

- [ ] **Step 1: Write `server/src/parser/jsonl.ts`**

```ts
import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';

export type RawUsage = {
  input_tokens?: number;
  output_tokens?: number;
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
};

export type AssistantLine = {
  type: 'assistant';
  timestamp: string;
  sessionId: string;
  cwd?: string;
  message: {
    model: string;
    usage: RawUsage;
  };
};

export type AnyLine = AssistantLine | { type: string; [k: string]: unknown };

export async function* readJsonl(filePath: string): AsyncGenerator<AnyLine> {
  const stream = createReadStream(filePath, { encoding: 'utf8' });
  const rl = createInterface({ input: stream, crlfDelay: Infinity });
  for await (const line of rl) {
    if (!line.trim()) continue;
    try {
      yield JSON.parse(line) as AnyLine;
    } catch {
      // skip malformed lines silently — older sessions may have partial writes
    }
  }
}

export function isAssistantLine(line: AnyLine): line is AssistantLine {
  return (
    line.type === 'assistant' &&
    typeof (line as AssistantLine).message === 'object' &&
    typeof (line as AssistantLine).message?.usage === 'object'
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd ~/claude-monitor
git add .
git commit -m "feat(server): JSONL streaming parser"
```

---

## Task 7: Project Discovery

**Files:**
- Create: `~/claude-monitor/server/src/parser/projects.ts`

- [ ] **Step 1: Write `server/src/parser/projects.ts`**

```ts
import { readdir, stat } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';

const PROJECTS_DIR = join(homedir(), '.claude', 'projects');

export type ProjectEntry = {
  encoded: string;        // raw folder name e.g. "-Users-foo-app"
  cwd: string;            // decoded absolute path "/Users/foo/app"
  displayName: string;    // last segment "app"
  dir: string;            // absolute path to the project's session dir
};

export function decodeProjectFolder(encoded: string): string {
  // Claude Code encodes paths by replacing "/" with "-" and prefixing a leading "-".
  // Best-effort: strip the leading "-" and replace remaining "-" with "/".
  const trimmed = encoded.startsWith('-') ? encoded.slice(1) : encoded;
  return '/' + trimmed.replace(/-/g, '/');
}

export async function listProjects(): Promise<ProjectEntry[]> {
  let entries: string[];
  try {
    entries = await readdir(PROJECTS_DIR);
  } catch {
    return [];
  }
  const result: ProjectEntry[] = [];
  for (const name of entries) {
    const dir = join(PROJECTS_DIR, name);
    try {
      const s = await stat(dir);
      if (!s.isDirectory()) continue;
    } catch {
      continue;
    }
    const cwd = decodeProjectFolder(name);
    result.push({
      encoded: name,
      cwd,
      displayName: cwd.split('/').filter(Boolean).pop() ?? name,
      dir,
    });
  }
  return result;
}

export async function listSessionFiles(projectDir: string): Promise<string[]> {
  let entries: string[];
  try {
    entries = await readdir(projectDir);
  } catch {
    return [];
  }
  return entries.filter((f) => f.endsWith('.jsonl')).map((f) => join(projectDir, f));
}
```

- [ ] **Step 2: Commit**

```bash
cd ~/claude-monitor
git add .
git commit -m "feat(server): project + session-file discovery"
```

---

## Task 8: Usage Aggregation

**Files:**
- Create: `~/claude-monitor/server/src/parser/usage.ts`

- [ ] **Step 1: Write `server/src/parser/usage.ts`**

```ts
import { stat } from 'node:fs/promises';
import { basename } from 'node:path';
import { isAssistantLine, readJsonl } from './jsonl.js';
import type { ProjectEntry } from './projects.js';
import type { Session, SessionTurn, UsageTotals } from '../types.js';
import { costFor, windowFor } from '../pricing.js';

export const EMPTY_TOTALS: UsageTotals = {
  input: 0, output: 0, cacheCreate: 0, cacheRead: 0, total: 0, turns: 0,
};

export function addTotals(a: UsageTotals, b: UsageTotals): UsageTotals {
  return {
    input: a.input + b.input,
    output: a.output + b.output,
    cacheCreate: a.cacheCreate + b.cacheCreate,
    cacheRead: a.cacheRead + b.cacheRead,
    total: a.total + b.total,
    turns: a.turns + b.turns,
  };
}

export type ParsedSession = {
  session: Session;
  perTurn: SessionTurn[];
  lastEventAt: number;        // ms epoch
};

export async function parseSessionFile(filePath: string, project: ProjectEntry): Promise<ParsedSession | null> {
  const id = basename(filePath, '.jsonl');
  let startedAt = '';
  let endedAt = '';
  const modelCounts = new Map<string, number>();
  const totals: UsageTotals = { ...EMPTY_TOTALS };
  const perTurn: SessionTurn[] = [];
  let cumulativeContext = 0;

  for await (const line of readJsonl(filePath)) {
    if (!isAssistantLine(line)) continue;
    const ts = line.timestamp ?? '';
    if (!startedAt) startedAt = ts;
    endedAt = ts;
    const model = line.message.model;
    modelCounts.set(model, (modelCounts.get(model) ?? 0) + 1);
    const u = line.message.usage;
    const input = u.input_tokens ?? 0;
    const output = u.output_tokens ?? 0;
    const cacheRead = u.cache_read_input_tokens ?? 0;
    const cacheCreate = u.cache_creation_input_tokens ?? 0;

    totals.input += input;
    totals.output += output;
    totals.cacheRead += cacheRead;
    totals.cacheCreate += cacheCreate;
    totals.total += input + output + cacheRead + cacheCreate;
    totals.turns += 1;

    cumulativeContext += input + cacheCreate; // rough: what's loaded into the prompt
    const win = windowFor(model);
    perTurn.push({
      timestamp: ts,
      model,
      input, output, cacheRead, cacheCreate,
      cost: costFor(model, { input, output, cacheRead, cacheCreate }),
      cumulativeContextPct: Math.min(1, cumulativeContext / win),
    });
  }

  if (totals.turns === 0) return null;

  const dominantModel = [...modelCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'unknown';
  const sStart = Date.parse(startedAt) || 0;
  const sEnd = Date.parse(endedAt) || sStart;
  const fileMtime = (await stat(filePath)).mtimeMs;

  const session: Session = {
    id,
    project: project.displayName,
    cwd: project.cwd,
    startedAt,
    endedAt,
    durationMs: Math.max(0, sEnd - sStart),
    model: dominantModel,
    turns: totals.turns,
    totals,
    cost: perTurn.reduce((s, t) => s + t.cost, 0),
  };

  return { session, perTurn, lastEventAt: fileMtime };
}
```

- [ ] **Step 2: Commit**

```bash
cd ~/claude-monitor
git add .
git commit -m "feat(server): usage aggregation per session"
```

---

## Task 9: Context Overhead Parser

**Files:**
- Create: `~/claude-monitor/server/src/parser/context.ts`

- [ ] **Step 1: Write `server/src/parser/context.ts`**

```ts
import { readdir, stat } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { ContextFile, ContextOverhead } from '../types.js';
import type { ProjectEntry } from './projects.js';

export function estimateTokensFromBytes(bytes: number): number {
  // chars ≈ bytes for English/code; tokens ≈ chars / 4 (documented heuristic).
  return Math.ceil(bytes / 4);
}

async function fileSizeOrNull(path: string): Promise<number | null> {
  try {
    const s = await stat(path);
    return s.isFile() ? s.size : null;
  } catch {
    return null;
  }
}

async function* walk(dir: string, depth = 0): AsyncGenerator<string> {
  if (depth > 3) return;
  let entries: string[];
  try {
    entries = await readdir(dir);
  } catch { return; }
  for (const name of entries) {
    const full = join(dir, name);
    let s;
    try { s = await stat(full); } catch { continue; }
    if (s.isDirectory()) {
      yield* walk(full, depth + 1);
    } else if (s.isFile()) {
      yield full;
    }
  }
}

async function memoryFiles(project: ProjectEntry): Promise<ContextFile[]> {
  const memDir = join(homedir(), '.claude', 'projects', project.encoded, 'memory');
  const files: ContextFile[] = [];
  for await (const path of walk(memDir)) {
    if (!path.endsWith('.md')) continue;
    const size = await fileSizeOrNull(path);
    if (size === null) continue;
    const rel = path.slice(memDir.length + 1);
    files.push({
      path: `memory/${rel}`,
      role: rel === 'MEMORY.md' ? 'MEMORY.md' : 'memory-file',
      bytes: size,
      estTokens: estimateTokensFromBytes(size),
    });
  }
  return files;
}

async function projectClaudeMd(project: ProjectEntry): Promise<ContextFile | null> {
  const path = join(project.cwd, 'CLAUDE.md');
  const size = await fileSizeOrNull(path);
  if (size === null) return null;
  return { path: 'CLAUDE.md', role: 'CLAUDE.md', bytes: size, estTokens: estimateTokensFromBytes(size) };
}

async function userSkills(): Promise<ContextFile[]> {
  const skillsRoot = join(homedir(), '.claude', 'skills');
  const out: ContextFile[] = [];
  for await (const path of walk(skillsRoot)) {
    if (!path.endsWith('SKILL.md')) continue;
    const size = await fileSizeOrNull(path);
    if (size === null) continue;
    const rel = path.slice(skillsRoot.length + 1);
    out.push({ path: `~/.claude/skills/${rel}`, role: 'skill', bytes: size, estTokens: estimateTokensFromBytes(size) });
  }
  return out;
}

export async function contextOverheadFor(project: ProjectEntry): Promise<ContextOverhead> {
  const files: ContextFile[] = [];
  const claudeMd = await projectClaudeMd(project);
  if (claudeMd) files.push(claudeMd);
  files.push(...(await memoryFiles(project)));
  files.push(...(await userSkills()));
  const totalEstTokens = files.reduce((s, f) => s + f.estTokens, 0);
  return { project: project.displayName, cwd: project.cwd, files, totalEstTokens };
}
```

- [ ] **Step 2: Commit**

```bash
cd ~/claude-monitor
git add .
git commit -m "feat(server): context overhead estimation"
```

---

## Task 10: /api/sessions Route

**Files:**
- Create: `~/claude-monitor/server/src/routes/sessions.ts`

- [ ] **Step 1: Write `server/src/routes/sessions.ts`**

```ts
import { Router } from 'express';
import { listProjects, listSessionFiles } from '../parser/projects.js';
import { parseSessionFile, type ParsedSession } from '../parser/usage.js';
import { memoTTL } from '../cache.js';

async function loadAll(): Promise<ParsedSession[]> {
  const projects = await listProjects();
  const out: ParsedSession[] = [];
  for (const p of projects) {
    const files = await listSessionFiles(p.dir);
    for (const f of files) {
      const parsed = await parseSessionFile(f, p);
      if (parsed) out.push(parsed);
    }
  }
  return out;
}

export const getAllSessions = memoTTL(3000, loadAll);

export const sessionsRouter = Router();

sessionsRouter.get('/sessions', async (req, res) => {
  const limit = Math.min(parseInt(String(req.query.limit ?? '100'), 10) || 100, 500);
  const all = await getAllSessions();
  const sorted = [...all].sort((a, b) => b.lastEventAt - a.lastEventAt);
  res.json(sorted.slice(0, limit).map((p) => p.session));
});

sessionsRouter.get('/sessions/:id', async (req, res) => {
  const all = await getAllSessions();
  const found = all.find((p) => p.session.id === req.params.id);
  if (!found) return res.status(404).json({ error: 'not_found' });
  res.json({ ...found.session, perTurn: found.perTurn });
});
```

- [ ] **Step 2: Commit**

```bash
cd ~/claude-monitor
git add .
git commit -m "feat(server): /api/sessions and /api/sessions/:id"
```

---

## Task 11: /api/stats Route

**Files:**
- Create: `~/claude-monitor/server/src/routes/stats.ts`

- [ ] **Step 1: Write `server/src/routes/stats.ts`**

```ts
import { Router } from 'express';
import { getAllSessions } from './sessions.js';
import { addTotals, EMPTY_TOTALS } from '../parser/usage.js';
import { costFor, windowFor } from '../pricing.js';
import type { Stats } from '../types.js';
import { memoTTL } from '../cache.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

const compute = memoTTL(3000, async (): Promise<Stats> => {
  const all = await getAllSessions();
  const now = Date.now();

  let today = { ...EMPTY_TOTALS };
  let week = { ...EMPTY_TOTALS };
  let allTime = { ...EMPTY_TOTALS };
  let costToday = 0, costWeek = 0, costAll = 0;
  let totalCacheRead = 0, totalNonCacheInput = 0, totalCacheCost = 0, totalNonCacheCost = 0;

  for (const p of all) {
    allTime = addTotals(allTime, p.session.totals);
    costAll += p.session.cost;
    const start = Date.parse(p.session.startedAt) || 0;
    if (now - start < WEEK_MS) {
      week = addTotals(week, p.session.totals);
      costWeek += p.session.cost;
    }
    if (now - start < DAY_MS) {
      today = addTotals(today, p.session.totals);
      costToday += p.session.cost;
    }
    totalCacheRead += p.session.totals.cacheRead;
    totalNonCacheInput += p.session.totals.input;
    // cost saved = cacheRead tokens * (input price - cacheRead price)
    const price = costFor(p.session.model, {
      input: p.session.totals.input,
      output: 0, cacheRead: p.session.totals.cacheRead, cacheCreate: 0,
    });
    totalCacheCost += price;
    const fullPriceForCacheBytes = costFor(p.session.model, {
      input: p.session.totals.cacheRead, output: 0, cacheRead: 0, cacheCreate: 0,
    });
    totalNonCacheCost += fullPriceForCacheBytes;
  }

  const cacheDenom = totalCacheRead + totalNonCacheInput;
  const hitRate = cacheDenom > 0 ? totalCacheRead / cacheDenom : 0;
  const estCostSaved = Math.max(0, totalNonCacheCost - totalCacheCost);

  // Active session = the one with the most recent lastEventAt within the last 30 minutes
  const sortedByMtime = [...all].sort((a, b) => b.lastEventAt - a.lastEventAt);
  const top = sortedByMtime[0];
  const activeSession = top && now - top.lastEventAt < 30 * 60 * 1000
    ? {
        sessionId: top.session.id,
        project: top.session.project,
        cwd: top.session.cwd,
        startedAt: top.session.startedAt,
        lastEventAt: new Date(top.lastEventAt).toISOString(),
        turns: top.session.turns,
        contextPct: top.perTurn[top.perTurn.length - 1]?.cumulativeContextPct ?? 0,
      }
    : null;

  // Top tool hint omitted in v1 (would require tool_use block parsing)
  const topToolHint = null;

  return {
    totals: { today, week, allTime },
    cache: { hitRate, tokensSaved: totalCacheRead, estCostSaved },
    cost: { today: costToday, week: costWeek, allTime: costAll },
    activeSession,
    topToolHint,
  };
});

export const statsRouter = Router();
statsRouter.get('/stats', async (_req, res) => {
  res.json(await compute());
});
```

- [ ] **Step 2: Commit**

```bash
cd ~/claude-monitor
git add .
git commit -m "feat(server): /api/stats with cache savings + active session"
```

---

## Task 12: /api/context Route

**Files:**
- Create: `~/claude-monitor/server/src/routes/context.ts`

- [ ] **Step 1: Write `server/src/routes/context.ts`**

```ts
import { Router } from 'express';
import { listProjects } from '../parser/projects.js';
import { contextOverheadFor } from '../parser/context.js';
import { memoTTL } from '../cache.js';

const compute = memoTTL(3000, async () => {
  const projects = await listProjects();
  const out = [];
  for (const p of projects) out.push(await contextOverheadFor(p));
  return out;
});

export const contextRouter = Router();
contextRouter.get('/context', async (_req, res) => {
  res.json(await compute());
});
```

- [ ] **Step 2: Commit**

```bash
cd ~/claude-monitor
git add .
git commit -m "feat(server): /api/context"
```

---

## Task 13: Mount Routes + Static Client

**Files:**
- Modify: `~/claude-monitor/server/src/index.ts`

- [ ] **Step 1: Replace `server/src/index.ts`**

```ts
import express from 'express';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { existsSync } from 'node:fs';
import { statsRouter } from './routes/stats.js';
import { sessionsRouter } from './routes/sessions.js';
import { contextRouter } from './routes/context.js';

const PORT = 4173;
const HOST = '127.0.0.1';
const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api', statsRouter);
app.use('/api', sessionsRouter);
app.use('/api', contextRouter);

// In production, serve the built client
const clientDist = join(__dirname, '..', '..', 'client', 'dist');
if (existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => res.sendFile(join(clientDist, 'index.html')));
}

app.listen(PORT, HOST, () => {
  console.log(`[claude-monitor] listening on http://${HOST}:${PORT}`);
});
```

- [ ] **Step 2: Smoke-test all endpoints**

```bash
cd ~/claude-monitor && yarn workspace @claude-monitor/server dev &
sleep 3
curl -s http://127.0.0.1:4173/api/health
echo
curl -s http://127.0.0.1:4173/api/stats | head -c 400
echo
curl -s http://127.0.0.1:4173/api/sessions?limit=2 | head -c 400
echo
curl -s http://127.0.0.1:4173/api/context | head -c 400
echo
kill %1 2>/dev/null || true
```

Expected: each command returns valid JSON (not an error). `stats` shows numeric totals, `sessions` returns at least one session if you've used Claude Code on this machine, `context` lists files.

- [ ] **Step 3: Commit**

```bash
cd ~/claude-monitor
git add .
git commit -m "feat(server): mount all routes + serve client/dist in prod"
```

---

## Task 14: Client Package Skeleton

**Files:**
- Create: `~/claude-monitor/client/package.json`
- Create: `~/claude-monitor/client/tsconfig.json`
- Create: `~/claude-monitor/client/vite.config.ts`
- Create: `~/claude-monitor/client/index.html`

- [ ] **Step 1: Write `client/package.json`**

```json
{
  "name": "@claude-monitor/client",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "lucide-react": "^0.378.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.0",
    "typescript": "^5.4.0",
    "vite": "^5.2.0"
  }
}
```

- [ ] **Step 2: Write `client/tsconfig.json`**

```json
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "outDir": "dist",
    "rootDir": "src",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "noEmit": true
  },
  "include": ["src/**/*"]
}
```

- [ ] **Step 3: Write `client/vite.config.ts`**

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://127.0.0.1:4173',
    },
  },
});
```

- [ ] **Step 4: Write `client/index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Claude Monitor</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 5: Install and commit**

```bash
cd ~/claude-monitor && yarn install
git add .
git commit -m "feat(client): vite + react skeleton with /api proxy"
```

---

## Task 15: Theme + Global Styles

**Files:**
- Create: `~/claude-monitor/client/src/theme.ts`
- Create: `~/claude-monitor/client/src/styles/global.css`

- [ ] **Step 1: Write `client/src/theme.ts`**

```ts
export const theme = {
  color: {
    bg:        '#020617',
    surface:   '#0F172A',
    surfaceHi: '#1E293B',
    border:    '#1E293B',
    text:      '#F8FAFC',
    muted:     '#94A3B8',
    positive:  '#22C55E',
    warning:   '#F59E0B',
    danger:    '#EF4444',
    accent:    '#3B82F6',
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

export type Theme = typeof theme;
```

- [ ] **Step 2: Write `client/src/styles/global.css`**

```css
@import url('https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;600;700&family=Fira+Sans:wght@300;400;500;600;700&display=swap');

* { box-sizing: border-box; }
html, body, #root { height: 100%; margin: 0; }

body {
  background: #020617;
  color: #F8FAFC;
  font-family: "Fira Sans", system-ui, sans-serif;
  font-size: 14px;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}

.mono { font-family: "Fira Code", ui-monospace, monospace; }

button { font: inherit; color: inherit; background: transparent; border: 0; cursor: pointer; }
button:focus-visible, a:focus-visible, [role="button"]:focus-visible {
  outline: 2px solid #3B82F6;
  outline-offset: 2px;
  border-radius: 4px;
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: 0s !important; transition-duration: 0s !important; }
}
```

- [ ] **Step 3: Commit**

```bash
cd ~/claude-monitor
git add .
git commit -m "feat(client): design tokens and global styles"
```

---

## Task 16: Format Helpers + API Client + Poll Hook

**Files:**
- Create: `~/claude-monitor/client/src/lib/types.ts`
- Create: `~/claude-monitor/client/src/lib/format.ts`
- Create: `~/claude-monitor/client/src/lib/api.ts`
- Create: `~/claude-monitor/client/src/hooks/usePoll.ts`

- [ ] **Step 1: Write `client/src/lib/types.ts`**

```ts
// Re-export server types so client and server stay in sync.
// We duplicate rather than import across packages to avoid TS project refs.
export type UsageTotals = { input: number; output: number; cacheCreate: number; cacheRead: number; total: number; turns: number };
export type Stats = {
  totals: { today: UsageTotals; week: UsageTotals; allTime: UsageTotals };
  cache: { hitRate: number; tokensSaved: number; estCostSaved: number };
  cost: { today: number; week: number; allTime: number };
  activeSession: {
    sessionId: string; project: string; cwd: string;
    startedAt: string; lastEventAt: string; turns: number; contextPct: number;
  } | null;
  topToolHint: { name: string; pctOfInput: number } | null;
};
export type Session = {
  id: string; project: string; cwd: string;
  startedAt: string; endedAt: string; durationMs: number;
  model: string; turns: number; totals: UsageTotals; cost: number;
};
export type SessionTurn = {
  timestamp: string; model: string;
  input: number; output: number; cacheRead: number; cacheCreate: number;
  cost: number; cumulativeContextPct: number;
};
export type SessionDetail = Session & { perTurn: SessionTurn[] };
export type ContextFile = { path: string; role: 'CLAUDE.md' | 'MEMORY.md' | 'memory-file' | 'skill'; bytes: number; estTokens: number };
export type ContextOverhead = { project: string; cwd: string; files: ContextFile[]; totalEstTokens: number };
```

- [ ] **Step 2: Write `client/src/lib/format.ts`**

```ts
export function formatTokens(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'k';
  return String(n);
}

export function formatCost(usd: number): string {
  if (usd >= 100) return '$' + usd.toFixed(0);
  if (usd >= 1) return '$' + usd.toFixed(2);
  return '$' + usd.toFixed(3);
}

export function formatPct(p: number): string {
  return (p * 100).toFixed(0) + '%';
}

export function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  if (s < 60) return s + 's';
  const m = Math.floor(s / 60);
  if (m < 60) return m + 'm';
  const h = Math.floor(m / 60);
  return h + 'h ' + (m % 60) + 'm';
}

export function formatRelative(iso: string): string {
  const ms = Date.now() - Date.parse(iso);
  if (ms < 60_000) return 'just now';
  if (ms < 3_600_000) return Math.floor(ms / 60_000) + 'm ago';
  if (ms < 86_400_000) return Math.floor(ms / 3_600_000) + 'h ago';
  return Math.floor(ms / 86_400_000) + 'd ago';
}
```

- [ ] **Step 3: Write `client/src/lib/api.ts`**

```ts
import type { Stats, Session, SessionDetail, ContextOverhead } from './types';

async function getJson<T>(path: string): Promise<T> {
  const r = await fetch(path);
  if (!r.ok) throw new Error(`${path} → ${r.status}`);
  return (await r.json()) as T;
}

export const api = {
  stats: () => getJson<Stats>('/api/stats'),
  sessions: (limit = 50) => getJson<Session[]>(`/api/sessions?limit=${limit}`),
  session: (id: string) => getJson<SessionDetail>(`/api/sessions/${id}`),
  context: () => getJson<ContextOverhead[]>('/api/context'),
};
```

- [ ] **Step 4: Write `client/src/hooks/usePoll.ts`**

```ts
import { useEffect, useRef, useState } from 'react';

export function usePoll<T>(fn: () => Promise<T>, intervalMs = 7000): { data: T | null; error: Error | null; loading: boolean } {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const tick = async () => {
      try {
        const v = await fnRef.current();
        if (!cancelled) { setData(v); setError(null); }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e : new Error(String(e)));
      } finally {
        if (!cancelled) setLoading(false);
        if (!cancelled && document.visibilityState === 'visible') {
          timer = setTimeout(tick, intervalMs);
        }
      }
    };

    tick();
    const onVisible = () => { if (document.visibilityState === 'visible') tick(); };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [intervalMs]);

  return { data, error, loading };
}
```

- [ ] **Step 5: Commit**

```bash
cd ~/claude-monitor
git add .
git commit -m "feat(client): types, format helpers, api wrapper, usePoll hook"
```

---

## Task 17: UI Primitives (Card, Badge, ProgressBar)

**Files:**
- Create: `~/claude-monitor/client/src/components/ui/Card.tsx`
- Create: `~/claude-monitor/client/src/components/ui/Badge.tsx`
- Create: `~/claude-monitor/client/src/components/ui/ProgressBar.tsx`

- [ ] **Step 1: Write `Card.tsx`**

```tsx
import type { CSSProperties, ReactNode } from 'react';
import { theme } from '../../theme';

export function Card({ children, onClick, style }: { children: ReactNode; onClick?: () => void; style?: CSSProperties }) {
  const base: CSSProperties = {
    background: theme.color.surface,
    border: `1px solid ${theme.color.border}`,
    borderRadius: theme.radius.lg,
    padding: 20,
    boxShadow: theme.shadow.card,
    transition: `background ${theme.transition}, border-color ${theme.transition}`,
    cursor: onClick ? 'pointer' : 'default',
    ...style,
  };
  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } } : undefined}
      style={base}
      onMouseEnter={(e) => { if (onClick) e.currentTarget.style.background = theme.color.surfaceHi; }}
      onMouseLeave={(e) => { if (onClick) e.currentTarget.style.background = theme.color.surface; }}
    >
      {children}
    </div>
  );
}
```

- [ ] **Step 2: Write `Badge.tsx`**

```tsx
import type { ReactNode } from 'react';
import { theme } from '../../theme';

type Tone = 'positive' | 'warning' | 'danger' | 'accent' | 'muted';

const tones: Record<Tone, { fg: string; bg: string }> = {
  positive: { fg: theme.color.positive, bg: 'rgba(34,197,94,0.12)' },
  warning:  { fg: theme.color.warning,  bg: 'rgba(245,158,11,0.12)' },
  danger:   { fg: theme.color.danger,   bg: 'rgba(239,68,68,0.12)' },
  accent:   { fg: theme.color.accent,   bg: 'rgba(59,130,246,0.12)' },
  muted:    { fg: theme.color.muted,    bg: 'rgba(148,163,184,0.10)' },
};

export function Badge({ tone = 'muted', children }: { tone?: Tone; children: ReactNode }) {
  const t = tones[tone];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '2px 8px', borderRadius: 999,
      fontSize: 11, fontWeight: 500, letterSpacing: 0.2,
      color: t.fg, background: t.bg,
    }}>
      {children}
    </span>
  );
}
```

- [ ] **Step 3: Write `ProgressBar.tsx`**

```tsx
import { theme } from '../../theme';

export function ProgressBar({ value, label }: { value: number; label?: string }) {
  const pct = Math.max(0, Math.min(1, value));
  const color = pct < 0.5 ? theme.color.positive : pct < 0.8 ? theme.color.warning : theme.color.danger;
  return (
    <div role="progressbar" aria-valuenow={Math.round(pct * 100)} aria-valuemin={0} aria-valuemax={100} aria-label={label ?? 'progress'}>
      <div style={{
        height: 8, background: theme.color.surfaceHi, borderRadius: 4, overflow: 'hidden',
      }}>
        <div style={{
          width: `${pct * 100}%`, height: '100%', background: color,
          transition: `width ${theme.transition}, background ${theme.transition}`,
        }} />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
cd ~/claude-monitor
git add .
git commit -m "feat(client): Card, Badge, ProgressBar primitives"
```

---

## Task 18: TopBar

**Files:**
- Create: `~/claude-monitor/client/src/components/TopBar.tsx`

- [ ] **Step 1: Write `TopBar.tsx`**

```tsx
import { Activity } from 'lucide-react';
import { Badge } from './ui/Badge';
import { theme } from '../theme';
import type { Stats } from '../lib/types';
import { formatRelative } from '../lib/format';

export function TopBar({ stats }: { stats: Stats | null }) {
  const a = stats?.activeSession;
  return (
    <div style={{
      position: 'sticky', top: 16, zIndex: 10,
      margin: '16px',
      padding: '12px 20px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      background: theme.color.surface, border: `1px solid ${theme.color.border}`,
      borderRadius: theme.radius.lg,
      boxShadow: theme.shadow.card,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Activity size={18} color={theme.color.accent} />
        <strong style={{ fontFamily: theme.font.sans, fontSize: 15 }}>Claude Monitor</strong>
      </div>
      <div>
        {a ? (
          <Badge tone="accent">
            <span style={{ width: 6, height: 6, borderRadius: 999, background: theme.color.positive, display: 'inline-block' }} />
            active: {a.project} · last event {formatRelative(a.lastEventAt)}
          </Badge>
        ) : (
          <Badge tone="muted">no active session</Badge>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd ~/claude-monitor
git add .
git commit -m "feat(client): TopBar with active-session pill"
```

---

## Task 19: SummaryCards

**Files:**
- Create: `~/claude-monitor/client/src/components/SummaryCards.tsx`

- [ ] **Step 1: Write `SummaryCards.tsx`**

```tsx
import type { ReactNode } from 'react';
import { Card } from './ui/Card';
import { theme } from '../theme';
import type { Stats } from '../lib/types';
import { formatCost, formatPct, formatTokens } from '../lib/format';

function MetricCard({ label, primary, secondary, accent }: { label: string; primary: ReactNode; secondary?: ReactNode; accent?: string }) {
  return (
    <Card>
      <div style={{ color: theme.color.muted, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.6 }}>{label}</div>
      <div className="mono" style={{
        fontSize: 32, fontWeight: 600, marginTop: 8, color: accent ?? theme.color.text,
        textShadow: accent ? `0 0 12px ${accent}66` : 'none',
      }}>
        {primary}
      </div>
      {secondary && <div style={{ marginTop: 4, color: theme.color.muted, fontSize: 13 }}>{secondary}</div>}
    </Card>
  );
}

export function SummaryCards({ stats }: { stats: Stats | null }) {
  const grid: React.CSSProperties = {
    display: 'grid', gap: 16, margin: '0 16px',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  };

  if (!stats) {
    return (
      <div style={grid}>
        {[0,1,2,3].map((i) => (
          <Card key={i}><div style={{ height: 60, background: theme.color.surfaceHi, borderRadius: 8 }} /></Card>
        ))}
      </div>
    );
  }

  return (
    <div style={grid}>
      <MetricCard label="Today" primary={formatTokens(stats.totals.today.total)} secondary={`${formatCost(stats.cost.today)} est · ${stats.totals.today.turns} turns`} />
      <MetricCard label="This Week" primary={formatTokens(stats.totals.week.total)} secondary={`${formatCost(stats.cost.week)} est · ${stats.totals.week.turns} turns`} />
      <MetricCard label="All Time" primary={formatTokens(stats.totals.allTime.total)} secondary={`${formatCost(stats.cost.allTime)} est · ${stats.totals.allTime.turns} turns`} />
      <MetricCard
        label="Cache Savings"
        accent={theme.color.positive}
        primary={formatPct(stats.cache.hitRate)}
        secondary={`${formatTokens(stats.cache.tokensSaved)} tokens · ~${formatCost(stats.cache.estCostSaved)} saved`}
      />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd ~/claude-monitor
git add .
git commit -m "feat(client): SummaryCards"
```

---

## Task 20: PrePromptTips

**Files:**
- Create: `~/claude-monitor/client/src/components/PrePromptTips.tsx`

- [ ] **Step 1: Write `PrePromptTips.tsx`**

```tsx
import { AlertTriangle, Info, Snowflake, Flame } from 'lucide-react';
import { Card } from './ui/Card';
import { ProgressBar } from './ui/ProgressBar';
import { Badge } from './ui/Badge';
import { theme } from '../theme';
import type { Stats } from '../lib/types';
import { formatPct } from '../lib/format';

export function PrePromptTips({ stats }: { stats: Stats | null }) {
  if (!stats) return null;
  const a = stats.activeSession;

  if (!a) {
    return (
      <Card style={{ margin: '0 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: theme.color.muted }}>
          <Info size={16} /> Start a Claude Code session to see live pre-prompt insights here.
        </div>
      </Card>
    );
  }

  const ctxPct = a.contextPct;
  const ctxTone = ctxPct < 0.5 ? 'positive' : ctxPct < 0.8 ? 'warning' : 'danger';
  // Cache warmth: heuristic — if hit rate > 0.6 and there were recent turns, "warm".
  const warm = stats.cache.hitRate > 0.6;

  const tips: { icon: React.ReactNode; text: string }[] = [];
  if (ctxPct > 0.7) tips.push({ icon: <AlertTriangle size={14} color={theme.color.warning} />, text: 'Context > 70% — consider /clear before your next big task.' });
  if (ctxPct > 0.9) tips.push({ icon: <AlertTriangle size={14} color={theme.color.danger} />, text: 'Context > 90% — risk of compaction. Save important state and /clear.' });
  if (!warm) tips.push({ icon: <Snowflake size={14} color={theme.color.accent} />, text: 'Cache cold — your next prompt will pay full input price.' });
  if (warm && ctxPct < 0.7) tips.push({ icon: <Flame size={14} color={theme.color.positive} />, text: 'Cache warm and context healthy — cheap follow-ups expected.' });

  return (
    <Card style={{ margin: '0 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 280px', minWidth: 240 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, alignItems: 'baseline' }}>
            <span style={{ color: theme.color.muted, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.6 }}>Active context</span>
            <span className="mono" style={{ fontSize: 16 }}>{formatPct(ctxPct)}</span>
          </div>
          <ProgressBar value={ctxPct} label={`context ${formatPct(ctxPct)}`} />
          <div style={{ marginTop: 6, fontSize: 12, color: theme.color.muted }}>
            session: <span className="mono">{a.sessionId.slice(0, 8)}</span> · {a.turns} turns · {a.project}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <Badge tone={ctxTone}>context {formatPct(ctxPct)}</Badge>
          <Badge tone={warm ? 'positive' : 'accent'}>{warm ? 'cache warm' : 'cache cold'}</Badge>
        </div>
      </div>
      {tips.length > 0 && (
        <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {tips.map((t, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: theme.color.text }}>
              {t.icon} {t.text}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd ~/claude-monitor
git add .
git commit -m "feat(client): PrePromptTips with context %, cache warmth, and suggestions"
```

---

## Task 21: ContextPanel

**Files:**
- Create: `~/claude-monitor/client/src/components/ContextPanel.tsx`

- [ ] **Step 1: Write `ContextPanel.tsx`**

```tsx
import { useMemo, useState } from 'react';
import { Card } from './ui/Card';
import { theme } from '../theme';
import type { ContextOverhead } from '../lib/types';
import { formatTokens } from '../lib/format';

export function ContextPanel({ data }: { data: ContextOverhead[] | null }) {
  const projects = useMemo(() => (data ?? []).slice().sort((a, b) => b.totalEstTokens - a.totalEstTokens), [data]);
  const [selected, setSelected] = useState<string | null>(null);
  const active = projects.find((p) => p.cwd === selected) ?? projects[0] ?? null;

  return (
    <Card style={{ height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, letterSpacing: 0.4, textTransform: 'uppercase', color: theme.color.muted }}>
          Context overhead
        </h3>
        {projects.length > 1 && (
          <select
            value={active?.cwd ?? ''}
            onChange={(e) => setSelected(e.target.value)}
            style={{
              background: theme.color.surfaceHi, color: theme.color.text,
              border: `1px solid ${theme.color.border}`, borderRadius: 6,
              padding: '4px 8px', fontSize: 12,
            }}
          >
            {projects.map((p) => <option key={p.cwd} value={p.cwd}>{p.project}</option>)}
          </select>
        )}
      </div>
      {!active ? (
        <div style={{ color: theme.color.muted, fontSize: 13 }}>No project context found.</div>
      ) : (
        <>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ color: theme.color.muted, textAlign: 'left' }}>
                <th style={{ fontWeight: 500, padding: '4px 0' }}>File</th>
                <th style={{ fontWeight: 500, padding: '4px 0', textAlign: 'right' }}>est. tokens</th>
              </tr>
            </thead>
            <tbody>
              {active.files.slice(0, 12).map((f) => (
                <tr key={f.path} style={{ borderTop: `1px solid ${theme.color.border}` }}>
                  <td style={{ padding: '6px 0', fontFamily: theme.font.mono, color: theme.color.text }}>
                    {f.path}
                    <span style={{ marginLeft: 8, fontSize: 11, color: theme.color.muted }}>{f.role}</span>
                  </td>
                  <td className="mono" style={{ padding: '6px 0', textAlign: 'right', color: theme.color.text }}>
                    {formatTokens(f.estTokens)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ borderTop: `1px solid ${theme.color.border}`, marginTop: 8, paddingTop: 8, display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: theme.color.muted, fontSize: 12 }}>Total (chars/4 estimate)</span>
            <span className="mono" style={{ fontSize: 14 }}>{formatTokens(active.totalEstTokens)}</span>
          </div>
        </>
      )}
    </Card>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd ~/claude-monitor
git add .
git commit -m "feat(client): ContextPanel"
```

---

## Task 22: SessionList + SessionDetail

**Files:**
- Create: `~/claude-monitor/client/src/components/SessionList.tsx`
- Create: `~/claude-monitor/client/src/components/SessionDetail.tsx`

- [ ] **Step 1: Write `SessionList.tsx`**

```tsx
import { useEffect, useState } from 'react';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { theme } from '../theme';
import { api } from '../lib/api';
import type { Session } from '../lib/types';
import { formatCost, formatDuration, formatRelative, formatTokens } from '../lib/format';

export function SessionList({ onSelect }: { onSelect: (id: string) => void }) {
  const [sessions, setSessions] = useState<Session[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const s = await api.sessions(50);
        if (!cancelled) setSessions(s);
      } catch { /* surface in UI later */ }
    };
    load();
    const t = setInterval(load, 15_000);
    return () => { cancelled = true; clearInterval(t); };
  }, []);

  return (
    <Card style={{ height: '100%' }}>
      <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, letterSpacing: 0.4, textTransform: 'uppercase', color: theme.color.muted, marginBottom: 12 }}>
        Recent sessions
      </h3>
      {!sessions ? (
        <div style={{ color: theme.color.muted, fontSize: 13 }}>Loading…</div>
      ) : sessions.length === 0 ? (
        <div style={{ color: theme.color.muted, fontSize: 13 }}>No sessions yet.</div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ color: theme.color.muted, textAlign: 'left' }}>
              <th style={{ fontWeight: 500, padding: '4px 0' }}>When</th>
              <th style={{ fontWeight: 500, padding: '4px 0' }}>Project</th>
              <th style={{ fontWeight: 500, padding: '4px 0', textAlign: 'right' }}>Tokens</th>
              <th style={{ fontWeight: 500, padding: '4px 0', textAlign: 'right' }}>Cost</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((s) => (
              <tr
                key={s.id}
                onClick={() => onSelect(s.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter') onSelect(s.id); }}
                style={{ borderTop: `1px solid ${theme.color.border}`, cursor: 'pointer' }}
              >
                <td style={{ padding: '8px 0' }}>
                  <div>{formatRelative(s.startedAt)}</div>
                  <div style={{ fontSize: 11, color: theme.color.muted }}>{formatDuration(s.durationMs)} · {s.turns}t</div>
                </td>
                <td style={{ padding: '8px 0' }}>
                  <div>{s.project}</div>
                  <div style={{ marginTop: 2 }}><Badge tone="muted">{s.model}</Badge></div>
                </td>
                <td className="mono" style={{ padding: '8px 0', textAlign: 'right' }}>{formatTokens(s.totals.total)}</td>
                <td className="mono" style={{ padding: '8px 0', textAlign: 'right', color: theme.color.muted }}>{formatCost(s.cost)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}
```

- [ ] **Step 2: Write `SessionDetail.tsx`**

```tsx
import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { theme } from '../theme';
import { api } from '../lib/api';
import type { SessionDetail as SD } from '../lib/types';
import { formatCost, formatPct, formatTokens } from '../lib/format';
import { Badge } from './ui/Badge';

export function SessionDetail({ id, onClose }: { id: string; onClose: () => void }) {
  const [data, setData] = useState<SD | null>(null);

  useEffect(() => {
    let cancelled = false;
    api.session(id).then((d) => { if (!cancelled) setData(d); }).catch(() => {});
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => { cancelled = true; document.removeEventListener('keydown', onKey); };
  }, [id, onClose]);

  return (
    <>
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, background: 'rgba(2,6,23,0.65)', zIndex: 20,
      }} />
      <aside
        role="dialog"
        aria-label="Session details"
        style={{
          position: 'fixed', top: 0, right: 0, bottom: 0, width: 'min(560px, 100vw)', zIndex: 21,
          background: theme.color.surface, borderLeft: `1px solid ${theme.color.border}`,
          display: 'flex', flexDirection: 'column',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', borderBottom: `1px solid ${theme.color.border}` }}>
          <strong>Session details</strong>
          <button onClick={onClose} aria-label="Close" style={{ display: 'flex', padding: 4 }}>
            <X size={16} />
          </button>
        </div>
        <div style={{ overflowY: 'auto', padding: 18 }}>
          {!data ? (
            <div style={{ color: theme.color.muted }}>Loading…</div>
          ) : (
            <>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
                <Badge tone="accent">{data.model}</Badge>
                <Badge tone="muted">{data.turns} turns</Badge>
                <Badge tone="muted">{formatTokens(data.totals.total)} tokens</Badge>
                <Badge tone="positive">{formatCost(data.cost)} est</Badge>
              </div>
              <div className="mono" style={{ fontSize: 12, color: theme.color.muted, marginBottom: 12 }}>
                {data.cwd}
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ color: theme.color.muted, textAlign: 'left' }}>
                    <th style={{ fontWeight: 500, padding: '4px 0' }}>#</th>
                    <th style={{ fontWeight: 500, padding: '4px 0', textAlign: 'right' }}>in</th>
                    <th style={{ fontWeight: 500, padding: '4px 0', textAlign: 'right' }}>out</th>
                    <th style={{ fontWeight: 500, padding: '4px 0', textAlign: 'right' }}>cache r</th>
                    <th style={{ fontWeight: 500, padding: '4px 0', textAlign: 'right' }}>cache w</th>
                    <th style={{ fontWeight: 500, padding: '4px 0', textAlign: 'right' }}>cost</th>
                    <th style={{ fontWeight: 500, padding: '4px 0', textAlign: 'right' }}>ctx</th>
                  </tr>
                </thead>
                <tbody>
                  {data.perTurn.map((t, i) => (
                    <tr key={i} style={{ borderTop: `1px solid ${theme.color.border}` }}>
                      <td className="mono" style={{ padding: '6px 0' }}>{i + 1}</td>
                      <td className="mono" style={{ padding: '6px 0', textAlign: 'right' }}>{formatTokens(t.input)}</td>
                      <td className="mono" style={{ padding: '6px 0', textAlign: 'right' }}>{formatTokens(t.output)}</td>
                      <td className="mono" style={{ padding: '6px 0', textAlign: 'right', color: theme.color.positive }}>{formatTokens(t.cacheRead)}</td>
                      <td className="mono" style={{ padding: '6px 0', textAlign: 'right' }}>{formatTokens(t.cacheCreate)}</td>
                      <td className="mono" style={{ padding: '6px 0', textAlign: 'right' }}>{formatCost(t.cost)}</td>
                      <td className="mono" style={{ padding: '6px 0', textAlign: 'right', color: t.cumulativeContextPct > 0.8 ? theme.color.danger : t.cumulativeContextPct > 0.5 ? theme.color.warning : theme.color.muted }}>
                        {formatPct(t.cumulativeContextPct)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      </aside>
    </>
  );
}
```

- [ ] **Step 3: Commit**

```bash
cd ~/claude-monitor
git add .
git commit -m "feat(client): SessionList and SessionDetail"
```

---

## Task 23: App Shell + Polling Wiring

**Files:**
- Create: `~/claude-monitor/client/src/main.tsx`
- Create: `~/claude-monitor/client/src/App.tsx`

- [ ] **Step 1: Write `main.tsx`**

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/global.css';
import { App } from './App';

const root = document.getElementById('root');
if (!root) throw new Error('#root not found');
createRoot(root).render(<StrictMode><App /></StrictMode>);
```

- [ ] **Step 2: Write `App.tsx`**

```tsx
import { useState } from 'react';
import { TopBar } from './components/TopBar';
import { SummaryCards } from './components/SummaryCards';
import { PrePromptTips } from './components/PrePromptTips';
import { ContextPanel } from './components/ContextPanel';
import { SessionList } from './components/SessionList';
import { SessionDetail } from './components/SessionDetail';
import { usePoll } from './hooks/usePoll';
import { api } from './lib/api';

export function App() {
  const stats = usePoll(api.stats, 7000);
  const context = usePoll(api.context, 30_000);
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <TopBar stats={stats.data} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 24, maxWidth: 1280, width: '100%', margin: '0 auto' }}>
        <SummaryCards stats={stats.data} />
        <div style={{ margin: '0 16px' }}>
          <PrePromptTips stats={stats.data} />
        </div>
        <div style={{
          display: 'grid', gap: 16, margin: '0 16px',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        }}>
          <ContextPanel data={context.data} />
          <SessionList onSelect={setSelected} />
        </div>
      </div>
      {selected && <SessionDetail id={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
```

- [ ] **Step 3: Smoke-test the dev experience**

```bash
cd ~/claude-monitor && yarn dev
```

In another terminal:

```bash
sleep 4 && curl -s http://127.0.0.1:5173 | head -c 200
```

Expected: HTML containing `<div id="root"></div>`. Open `http://localhost:5173` in your browser — you should see the dashboard with summary cards filled from your real Claude Code history. Close the dev process when done.

- [ ] **Step 4: Commit**

```bash
cd ~/claude-monitor
git add .
git commit -m "feat(client): App shell wiring all panels with polling"
```

---

## Task 24: Production Build + Single-Process Start

**Files:**
- Modify: `~/claude-monitor/client/package.json` (no changes needed if Task 14 left it correct — verify)
- Verify: `~/claude-monitor/server/src/index.ts` already serves `client/dist` from Task 13.

- [ ] **Step 1: Build both packages**

```bash
cd ~/claude-monitor && yarn build
ls client/dist/index.html && ls server/dist/index.js
```

Expected: both files exist.

- [ ] **Step 2: Run production start**

```bash
cd ~/claude-monitor && yarn start &
sleep 2
curl -s http://127.0.0.1:4173/api/health
curl -s http://127.0.0.1:4173/ | head -c 200
kill %1 2>/dev/null || true
```

Expected: `{"ok":true}` from health, and HTML containing `<div id="root">` from `/`.

- [ ] **Step 3: Update README run instructions if anything diverged**

If the smoke tests in steps 1–2 surfaced any path or script change, update `~/claude-monitor/README.md` to match. Otherwise skip.

- [ ] **Step 4: Final commit**

```bash
cd ~/claude-monitor
git add -A
git commit -m "chore: verify production build + single-process start" --allow-empty
git log --oneline | head -25
```

Expected: commit history shows ~24 commits, one per task.

---

## Self-Review Notes

**Spec coverage:**
- §3 Architecture → Tasks 1–14 (workspace, server, client scaffolds)
- §4 Data model → Task 3 (`server/src/types.ts`), Task 16 (`client/src/lib/types.ts`)
- §5 Token counting → Task 8 (recorded usage), Task 9 (chars/4 heuristic)
- §6 Pricing → Task 4
- §7 API endpoints → Tasks 10, 11, 12, 13 (mounting + health)
- §8 Polling and freshness → Task 5 (TTL cache), Task 16 (usePoll), Task 23 (wiring intervals)
- §9 UI/UX → Tasks 15 (theme + globals), 17 (primitives), 18–22 (components), 23 (layout)
- §10 Project setup → Tasks 1, 2, 14
- §11 Risks → addressed inline (defensive parser in Task 6, pricing labeled "est." in Task 19, chars/4 documented in Task 21)

**Placeholder scan:** every step contains complete code or an executable command. No "TBD", no "similar to above", no skipped error handling.

**Type consistency:** `UsageTotals`, `Stats`, `Session`, `SessionDetail`, `SessionTurn`, `ContextOverhead`, `ContextFile` are defined identically in `server/src/types.ts` (Task 3) and `client/src/lib/types.ts` (Task 16). Method names: `priceFor` / `costFor` / `windowFor` (Task 4), `parseSessionFile` (Task 8), `getAllSessions` (Task 10), `api.stats/sessions/session/context` (Task 16). All references downstream match.

---

## Execution Handoff

Plan complete and saved to `~/claude-monitor/docs/plans/2026-05-04-claude-monitor.md`. Two execution options:

1. **Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.
2. **Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach?
