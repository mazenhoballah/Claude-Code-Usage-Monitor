import { stat } from 'node:fs/promises';
import { basename } from 'node:path';
import { extractProgressAssistant, extractUserText, isAgentProgressLine, isAiTitleLine, isAssistantLine, isUserLine, readJsonl } from './jsonl.js';
import type { ToolUseBlock } from './jsonl.js';
import type { ProjectEntry } from './projects.js';
import type { Session, SessionAgent, SessionRequest, SessionTurn, UsageTotals } from '../types.js';
import { costFor, windowFor } from '../pricing.js';

function deriveTitleFromUserText(text: string | null): string | null {
  if (!text) return null;
  // Take the first non-empty line, collapse whitespace, truncate.
  const firstLine = text.split('\n').map((l) => l.trim()).find((l) => l.length > 0) ?? '';
  const cleaned = firstLine.replace(/\s+/g, ' ').trim();
  if (!cleaned) return null;
  const MAX = 80;
  return cleaned.length > MAX ? cleaned.slice(0, MAX - 1).trimEnd() + '…' : cleaned;
}

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
  agents: SessionAgent[];
  requests: SessionRequest[];
  lastEventAt: number;        // ms epoch
};

type RequestAcc = {
  userText: string;
  modelCounts: Map<string, number>;
  subAgentSet: Set<string>;
  input: number;
  output: number;
  cacheRead: number;
  cacheCreate: number;
  turns: number;
  cost: number;
};

function newRequestAcc(userText: string): RequestAcc {
  return { userText, modelCounts: new Map(), subAgentSet: new Set(), input: 0, output: 0, cacheRead: 0, cacheCreate: 0, turns: 0, cost: 0 };
}

function finalizeReq(acc: RequestAcc, id: number): SessionRequest {
  const model = [...acc.modelCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'unknown';
  return {
    id,
    userText: acc.userText,
    model,
    subAgents: [...acc.subAgentSet],
    input: acc.input,
    output: acc.output,
    cacheRead: acc.cacheRead,
    cacheCreate: acc.cacheCreate,
    total: acc.input + acc.output + acc.cacheRead + acc.cacheCreate,
    turns: acc.turns,
    cost: acc.cost,
  };
}

type AgentBucket = {
  model: string;
  input: number;
  output: number;
  cacheRead: number;
  cacheCreate: number;
  turns: number;
  cost: number;
  // insertion-order key for sorting (0 = main, then sub-agents in appearance order)
  order: number;
};

type ToolUseInfo = {
  subagent_type: string;
  description: string;
};

function accumulateBucket(
  bucket: AgentBucket,
  model: string,
  input: number,
  output: number,
  cacheRead: number,
  cacheCreate: number,
): void {
  bucket.model = model;
  bucket.input += input;
  bucket.output += output;
  bucket.cacheRead += cacheRead;
  bucket.cacheCreate += cacheCreate;
  bucket.turns += 1;
  bucket.cost += costFor(model, { input, output, cacheRead, cacheCreate });
}

function emptyBucket(order: number, model = 'unknown'): AgentBucket {
  return { model, input: 0, output: 0, cacheRead: 0, cacheCreate: 0, turns: 0, cost: 0, order };
}

export async function parseSessionFile(filePath: string, project: ProjectEntry): Promise<ParsedSession | null> {
  const id = basename(filePath, '.jsonl');
  let startedAt = '';
  let endedAt = '';
  const modelCounts = new Map<string, number>();
  const totals: UsageTotals = { ...EMPTY_TOTALS };
  const perTurn: SessionTurn[] = [];
  const seenRequests = new Set<string>();
  let aiTitle: string | null = null;
  let firstUserText: string | null = null;

  // Per-agent aggregation structures
  const toolUseMap = new Map<string, ToolUseInfo>();
  const agentBuckets = new Map<string, AgentBucket>();
  let bucketCount = 0;

  // Ensure 'main' bucket always exists and is first
  agentBuckets.set('main', emptyBucket(bucketCount++));

  // Per-request accumulation
  const requests: SessionRequest[] = [];
  let currentRequest: RequestAcc | null = null;

  for await (const line of readJsonl(filePath)) {
    if (isAiTitleLine(line) && line.aiTitle) {
      aiTitle = line.aiTitle;
      continue;
    }
    if (isUserLine(line)) {
      const t = extractUserText(line);
      if (t) {
        if (firstUserText === null) firstUserText = t;
        // Real user message → finalize previous request and start a new one
        if (currentRequest && currentRequest.turns > 0) {
          requests.push(finalizeReq(currentRequest, requests.length + 1));
        }
        const truncated = t.length > 140 ? t.slice(0, 139) + '…' : t;
        currentRequest = newRequestAcc(truncated);
      }
    }

    // Handle agent_progress lines (sub-agent turns) separately
    if (isAgentProgressLine(line)) {
      const assistantLine = extractProgressAssistant(line);
      if (!assistantLine) continue;
      const ts = assistantLine.timestamp ?? '';
      if (!startedAt) startedAt = ts;
      endedAt = ts;
      if (assistantLine.requestId) {
        if (seenRequests.has(assistantLine.requestId)) continue;
        seenRequests.add(assistantLine.requestId);
      }
      const model = assistantLine.message.model;
      modelCounts.set(model, (modelCounts.get(model) ?? 0) + 1);
      const u = assistantLine.message.usage;
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

      const win = windowFor(model);
      const contextPct = Math.min(1, (input + cacheCreate + cacheRead) / win);
      perTurn.push({
        timestamp: ts,
        model,
        input, output, cacheRead, cacheCreate,
        cost: costFor(model, { input, output, cacheRead, cacheCreate }),
        cumulativeContextPct: contextPct,
      });

      // Accumulate into the sub-agent bucket keyed by toolUseID
      const toolUseID = line.toolUseID;
      if (toolUseID) {
        if (!agentBuckets.has(toolUseID)) {
          agentBuckets.set(toolUseID, emptyBucket(bucketCount++, model));
        }
        accumulateBucket(agentBuckets.get(toolUseID)!, model, input, output, cacheRead, cacheCreate);
      } else {
        accumulateBucket(agentBuckets.get('main')!, model, input, output, cacheRead, cacheCreate);
      }

      // Accumulate into current request; use parentToolUseID to resolve sub-agent name
      if (currentRequest) {
        const info = line.parentToolUseID ? toolUseMap.get(line.parentToolUseID) : undefined;
        if (info) currentRequest.subAgentSet.add(info.subagent_type);
        currentRequest.modelCounts.set(model, (currentRequest.modelCounts.get(model) ?? 0) + 1);
        currentRequest.input += input;
        currentRequest.output += output;
        currentRequest.cacheRead += cacheRead;
        currentRequest.cacheCreate += cacheCreate;
        currentRequest.turns += 1;
        currentRequest.cost += costFor(model, { input, output, cacheRead, cacheCreate });
      }
      continue;
    }

    // Promote non-progress assistant lines
    if (!isAssistantLine(line)) continue;
    const assistantLine = line;
    const ts = assistantLine.timestamp ?? '';
    if (!startedAt) startedAt = ts;
    endedAt = ts;
    // Claude Code emits one assistant line per content block/iteration but they
    // share a requestId and the same usage stats. Dedupe so a single API call
    // isn't billed 2–3× over.
    if (assistantLine.requestId) {
      if (seenRequests.has(assistantLine.requestId)) continue;
      seenRequests.add(assistantLine.requestId);
    }

    // Scan content for Agent tool_use blocks and populate toolUseMap
    const content = assistantLine.message.content;
    if (Array.isArray(content)) {
      for (const block of content) {
        if (block.type === 'tool_use') {
          const tb = block as ToolUseBlock;
          if (tb.name === 'Agent') {
            toolUseMap.set(tb.id, {
              subagent_type: String(tb.input.subagent_type ?? 'general-purpose'),
              description: String(tb.input.description ?? ''),
            });
          }
        }
      }
    }

    const model = assistantLine.message.model;
    modelCounts.set(model, (modelCounts.get(model) ?? 0) + 1);
    const u = assistantLine.message.usage;
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

    const win = windowFor(model);
    // Context % = all tokens loaded into this prompt / context window.
    // input + cacheCreate + cacheRead = total prompt tokens for this turn.
    const contextPct = Math.min(1, (input + cacheCreate + cacheRead) / win);
    perTurn.push({
      timestamp: ts,
      model,
      input, output, cacheRead, cacheCreate,
      cost: costFor(model, { input, output, cacheRead, cacheCreate }),
      cumulativeContextPct: contextPct,
    });

    // Accumulate into the main agent bucket
    accumulateBucket(agentBuckets.get('main')!, model, input, output, cacheRead, cacheCreate);

    // Accumulate into current request
    if (currentRequest) {
      currentRequest.modelCounts.set(model, (currentRequest.modelCounts.get(model) ?? 0) + 1);
      currentRequest.input += input;
      currentRequest.output += output;
      currentRequest.cacheRead += cacheRead;
      currentRequest.cacheCreate += cacheCreate;
      currentRequest.turns += 1;
      currentRequest.cost += costFor(model, { input, output, cacheRead, cacheCreate });
    }
  }

  // Finalize the last open request
  if (currentRequest && currentRequest.turns > 0) {
    requests.push(finalizeReq(currentRequest, requests.length + 1));
  }

  if (totals.turns === 0) return null;

  const dominantModel = [...modelCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'unknown';
  const sStart = Date.parse(startedAt) || 0;
  const sEnd = Date.parse(endedAt) || sStart;
  const fileMtime = (await stat(filePath)).mtimeMs;

  const sessionTitle = aiTitle ?? deriveTitleFromUserText(firstUserText) ?? 'Untitled session';

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
    title: sessionTitle,
  };

  // Build agents array sorted by insertion order
  const agents: SessionAgent[] = [...agentBuckets.entries()]
    .sort((a, b) => a[1].order - b[1].order)
    .filter(([, b]) => b.turns > 0)
    .map(([key, b]) => {
      const isMain = key === 'main';
      const info = isMain ? null : toolUseMap.get(key);
      return {
        agentName: isMain ? 'main' : (info?.subagent_type ?? 'general-purpose'),
        description: isMain ? sessionTitle : (info?.description ?? ''),
        model: b.model,
        input: b.input,
        output: b.output,
        cacheRead: b.cacheRead,
        cacheCreate: b.cacheCreate,
        total: b.input + b.output + b.cacheRead + b.cacheCreate,
        turns: b.turns,
        cost: b.cost,
      };
    });

  return { session, perTurn, agents, requests, lastEventAt: fileMtime };
}
