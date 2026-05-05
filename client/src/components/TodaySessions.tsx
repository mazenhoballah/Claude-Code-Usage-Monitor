import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { theme } from '../theme';
import type { Session } from '../lib/types';
import { formatCost, formatDuration, formatTokens } from '../lib/format';

function startOfLocalDay(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function TodaySessions({ sessions, onSelect }: { sessions: Session[] | null; onSelect: (id: string) => void }) {
  const todayStart = startOfLocalDay();
  const todaySessions = sessions
    ? sessions.filter((s) => {
        const ts = Date.parse(s.endedAt);
        return ts >= todayStart;
      })
    : null;

  const totalCost = todaySessions?.reduce((sum, s) => sum + s.cost, 0) ?? 0;
  const totalTokens = todaySessions?.reduce((sum, s) => sum + s.totals.total, 0) ?? 0;

  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 12 }}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, letterSpacing: 0.4, textTransform: 'uppercase', color: theme.color.muted }}>
          Today's sessions
        </h3>
        {todaySessions && todaySessions.length > 0 && (
          <span style={{ fontSize: 12, color: theme.color.muted }}>
            {formatTokens(totalTokens)} tokens · {formatCost(totalCost)} est
          </span>
        )}
      </div>
      {!todaySessions ? (
        <div style={{ color: theme.color.muted, fontSize: 13 }}>Loading…</div>
      ) : todaySessions.length === 0 ? (
        <div style={{ color: theme.color.muted, fontSize: 13 }}>No sessions today yet.</div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ color: theme.color.muted, textAlign: 'left' }}>
              <th style={{ fontWeight: 500, padding: '4px 0' }}>Project</th>
              <th style={{ fontWeight: 500, padding: '4px 0' }}>Title</th>
              <th style={{ fontWeight: 500, padding: '4px 0', textAlign: 'right' }}>Turns</th>
              <th style={{ fontWeight: 500, padding: '4px 0', textAlign: 'right' }}>Tokens</th>
              <th style={{ fontWeight: 500, padding: '4px 0', textAlign: 'right' }}>Cost</th>
            </tr>
          </thead>
          <tbody>
            {todaySessions.map((s) => (
              <tr
                key={s.id}
                onClick={() => onSelect(s.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter') onSelect(s.id); }}
                style={{ borderTop: `1px solid ${theme.color.border}`, cursor: 'pointer' }}
              >
                <td style={{ padding: '8px 12px 8px 0' }}>
                  <div>{s.project}</div>
                  <div style={{ marginTop: 2 }}><Badge tone="muted">{s.model}</Badge></div>
                </td>
                <td style={{ padding: '8px 12px 8px 0', maxWidth: 360 }}>
                  <div title={s.title} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {s.title}
                  </div>
                  <div style={{ fontSize: 11, color: theme.color.muted }}>{formatDuration(s.durationMs)}</div>
                </td>
                <td className="mono" style={{ padding: '8px 0', textAlign: 'right' }}>{s.turns}</td>
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
