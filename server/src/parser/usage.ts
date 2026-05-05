import { stat } from 'node:fs/promises';
import { basename } from 'node:path';
import { extractProgressAssistant, extractUserText, isAiTitleLine, isAssistantLine, isUserLine, readJsonl } from './jsonl.js';
import type { ProjectEntry } from './projects.js';
import type { Session, SessionTurn, UsageTotals } from '../types.js';
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
  lastEventAt: number;        // ms epoch
};

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

  for await (const line of readJsonl(filePath)) {
    if (isAiTitleLine(line) && line.aiTitle) {
      aiTitle = line.aiTitle;
      continue;
    }
    if (isUserLine(line) && firstUserText === null) {
      const t = extractUserText(line);
      if (t) firstUserText = t;
    }
    // Promote sub-agent progress records to assistant lines
    const assistantLine = isAssistantLine(line) ? line : extractProgressAssistant(line);
    if (!assistantLine) continue;
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
    title: aiTitle ?? deriveTitleFromUserText(firstUserText) ?? 'Untitled session',
  };

  return { session, perTurn, lastEventAt: fileMtime };
}
