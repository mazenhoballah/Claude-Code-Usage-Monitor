import type { Stats, Session, SessionDetail, ContextOverhead } from './types';

async function getJson<T>(path: string): Promise<T> {
  const r = await fetch(path);
  if (!r.ok) throw new Error(`${path} → ${r.status}`);
  return (await r.json()) as T;
}

export const api = {
  stats: () => getJson<Stats>('/api/stats'),
  sessions: (limit = 50) => getJson<Session[]>(`/api/sessions?limit=${limit}`),
  session: (id: string) => getJson<SessionDetail>(`/api/sessions/${id}`),
  context: () => getJson<ContextOverhead[]>('/api/context'),
};
