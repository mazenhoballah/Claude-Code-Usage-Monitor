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
