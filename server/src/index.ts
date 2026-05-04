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
