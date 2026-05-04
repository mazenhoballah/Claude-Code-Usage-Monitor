import express from 'express';

const PORT = 4173;
const HOST = '127.0.0.1';

const app = express();

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.listen(PORT, HOST, () => {
  console.log(`[claude-monitor] server listening on http://${HOST}:${PORT}`);
});
