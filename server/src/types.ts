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

export type ModelBreakdown = { model: string; cost: number; turns: number };

export type Stats = {
  totals: { today: UsageTotals; week: UsageTotals; allTime: UsageTotals; fiveH: UsageTotals };
  cache: { hitRate: number; tokensSaved: number; estCostSaved: number };
  cost: { today: number; week: number; allTime: number; fiveH: number };
  modelBreakdown: ModelBreakdown[];
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
  title: string;
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

export type SessionAgent = {
  agentName: string;
  description: string;
  model: string;
  input: number;
  output: number;
  cacheRead: number;
  cacheCreate: number;
  total: number;
  turns: number;
  cost: number;
};

export type SessionRequest = {
  id: number;
  userText: string;
  model: string;
  subAgents: string[];
  input: number;
  output: number;
  cacheRead: number;
  cacheCreate: number;
  total: number;
  turns: number;
  cost: number;
};

export type SessionDetail = Session & { perTurn: SessionTurn[]; agents: SessionAgent[]; requests: SessionRequest[] };

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
