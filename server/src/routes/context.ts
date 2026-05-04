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
