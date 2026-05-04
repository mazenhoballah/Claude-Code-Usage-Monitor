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
