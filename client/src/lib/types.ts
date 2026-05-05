// Re-export server types so client and server stay in sync.
// We duplicate rather than import across packages to avoid TS project refs.
export type UsageTotals = { input: number; output: number; cacheCreate: number; cacheRead: number; total: number; turns: number };
export type ModelBreakdown = { model: string; cost: number; turns: number };

export type Stats = {
  totals: { today: UsageTotals; week: UsageTotals; allTime: UsageTotals };
  cache: { hitRate: number; tokensSaved: number; estCostSaved: number };
  cost: { today: number; week: number; allTime: number };
  modelBreakdown: ModelBreakdown[];
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
  title: string;
};
export type SessionTurn = {
  timestamp: string; model: string;
  input: number; output: number; cacheRead: number; cacheCreate: number;
  cost: number; cumulativeContextPct: number;
};
export type SessionDetail = Session & { perTurn: SessionTurn[] };
export type ContextFile = { path: string; role: 'CLAUDE.md' | 'MEMORY.md' | 'memory-file' | 'skill'; bytes: number; estTokens: number };
export type ContextOverhead = { project: string; cwd: string; files: ContextFile[]; totalEstTokens: number };
