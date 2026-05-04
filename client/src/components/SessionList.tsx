import { useEffect, useState } from 'react';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { theme } from '../theme';
import { api } from '../lib/api';
import type { Session } from '../lib/types';
import { formatCost, formatDuration, formatRelative, formatTokens } from '../lib/format';

export function SessionList({ onSelect }: { onSelect: (id: string) => void }) {
  const [sessions, setSessions] = useState<Session[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const s = await api.sessions(50);
        if (!cancelled) setSessions(s);
      } catch { /* surface in UI later */ }
    };
    load();
    const t = setInterval(load, 15_000);
    return () => { cancelled = true; clearInterval(t); };
  }, []);

  return (
    <Card style={{ height: '100%' }}>
      <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, letterSpacing: 0.4, textTransform: 'uppercase', color: theme.color.muted, marginBottom: 12 }}>
        Recent sessions
      </h3>
      {!sessions ? (
        <div style={{ color: theme.color.muted, fontSize: 13 }}>Loading…</div>
      ) : sessions.length === 0 ? (
        <div style={{ color: theme.color.muted, fontSize: 13 }}>No sessions yet.</div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ color: theme.color.muted, textAlign: 'left' }}>
              <th style={{ fontWeight: 500, padding: '4px 0' }}>When</th>
              <th style={{ fontWeight: 500, padding: '4px 0' }}>Project</th>
              <th style={{ fontWeight: 500, padding: '4px 0', textAlign: 'right' }}>Tokens</th>
              <th style={{ fontWeight: 500, padding: '4px 0', textAlign: 'right' }}>Cost</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((s) => (
              <tr
                key={s.id}
                onClick={() => onSelect(s.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter') onSelect(s.id); }}
                style={{ borderTop: `1px solid ${theme.color.border}`, cursor: 'pointer' }}
              >
                <td style={{ padding: '8px 0' }}>
                  <div>{formatRelative(s.startedAt)}</div>
                  <div style={{ fontSize: 11, color: theme.color.muted }}>{formatDuration(s.durationMs)} · {s.turns}t</div>
                </td>
                <td style={{ padding: '8px 0' }}>
                  <div>{s.project}</div>
                  <div style={{ marginTop: 2 }}><Badge tone="muted">{s.model}</Badge></div>
                </td>
                <td className="mono" style={{ padding: '8px 0', textAlign: 'right' }}>{formatTokens(s.totals.total)}</td>
                <td className="mono" style={{ padding: '8px 0', textAlign: 'right', color: theme.color.muted }}>{formatCost(s.cost)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}
