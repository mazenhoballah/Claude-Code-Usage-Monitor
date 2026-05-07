import { Router } from 'express';
import { getAllSessions } from './sessions.js';
import { EMPTY_TOTALS } from '../parser/usage.js';
import { costFor } from '../pricing.js';
import type { Stats, UsageTotals, ModelBreakdown } from '../types.js';
import { memoTTL } from '../cache.js';

const H5_MS   = 5 * 60 * 60 * 1000;
const DAY_MS  = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

function startOfLocalDay(now: number): number {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

const compute = memoTTL(3000, async (): Promise<Stats> => {
  const all = await getAllSessions();
  const now = Date.now();
  const todayStart = startOfLocalDay(now);
  const weekStart  = now - WEEK_MS;
  const fiveHStart = now - H5_MS;

  const today: UsageTotals = { ...EMPTY_TOTALS };
  const week: UsageTotals  = { ...EMPTY_TOTALS };
  const allTime: UsageTotals = { ...EMPTY_TOTALS };
  const fiveH: UsageTotals = { ...EMPTY_TOTALS };
  let costToday = 0, costWeek = 0, costAll = 0, costFiveH = 0;
  let totalCacheRead = 0, totalCacheCreate = 0, totalNonCacheInput = 0;
  let totalCostSaved = 0;
  const modelMap = new Map<string, { cost: number; turns: number }>();

  for (const p of all) {
    for (const t of p.perTurn) {
      const ts = Date.parse(t.timestamp) || 0;
      const turnTotal = t.input + t.output + t.cacheRead + t.cacheCreate;

      allTime.input += t.input;
      allTime.output += t.output;
      allTime.cacheRead += t.cacheRead;
      allTime.cacheCreate += t.cacheCreate;
      allTime.total += turnTotal;
      allTime.turns += 1;
      costAll += t.cost;

      if (ts >= weekStart) {
        week.input += t.input;
        week.output += t.output;
        week.cacheRead += t.cacheRead;
        week.cacheCreate += t.cacheCreate;
        week.total += turnTotal;
        week.turns += 1;
        costWeek += t.cost;
      }
      if (ts >= todayStart) {
        today.input += t.input;
        today.output += t.output;
        today.cacheRead += t.cacheRead;
        today.cacheCreate += t.cacheCreate;
        today.total += turnTotal;
        today.turns += 1;
        costToday += t.cost;
      }
      if (ts >= fiveHStart) {
        fiveH.input += t.input;
        fiveH.output += t.output;
        fiveH.cacheRead += t.cacheRead;
        fiveH.cacheCreate += t.cacheCreate;
        fiveH.total += turnTotal;
        fiveH.turns += 1;
        costFiveH += t.cost;
      }

      totalCacheRead += t.cacheRead;
      totalCacheCreate += t.cacheCreate;
      totalNonCacheInput += t.input;

      // Savings: cacheRead bytes were billed at cache-read rate; if they had
      // been regular input, the cost would be cacheRead * inputPrice.
      const cachedCost = costFor(t.model, { input: 0, output: 0, cacheRead: t.cacheRead, cacheCreate: 0 });
      const wouldBeFullCost = costFor(t.model, { input: t.cacheRead, output: 0, cacheRead: 0, cacheCreate: 0 });
      totalCostSaved += Math.max(0, wouldBeFullCost - cachedCost);

      // Per-model breakdown from actual turn model (not dominant session model)
      const mKey = t.model === '<synthetic>' ? null : t.model;
      if (mKey) {
        const prev = modelMap.get(mKey) ?? { cost: 0, turns: 0 };
        modelMap.set(mKey, { cost: prev.cost + t.cost, turns: prev.turns + 1 });
      }
    }
  }

  const modelBreakdown: ModelBreakdown[] = [...modelMap.entries()]
    .map(([model, v]) => ({ model, ...v }))
    .sort((a, b) => b.cost - a.cost);

  // Hit rate denominator includes cacheCreate (writes are misses you paid for).
  const cacheDenom = totalCacheRead + totalCacheCreate + totalNonCacheInput;
  const hitRate = cacheDenom > 0 ? totalCacheRead / cacheDenom : 0;
  const estCostSaved = totalCostSaved;

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
    totals: { today, week, allTime, fiveH },
    cache: { hitRate, tokensSaved: totalCacheRead, estCostSaved },
    cost: { today: costToday, week: costWeek, allTime: costAll, fiveH: costFiveH },
    modelBreakdown,
    activeSession,
    topToolHint,
  };
});

export const statsRouter = Router();
statsRouter.get('/stats', async (_req, res) => {
  res.json(await compute());
});
