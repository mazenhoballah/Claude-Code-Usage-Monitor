import { Router } from 'express';
import { getAllSessions } from './sessions.js';
import { addTotals, EMPTY_TOTALS } from '../parser/usage.js';
import { costFor } from '../pricing.js';
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
