import { Activity } from 'lucide-react';
import { Badge } from './ui/Badge';
import { theme } from '../theme';
import type { Stats } from '../lib/types';
import { formatRelative } from '../lib/format';

export function TopBar({ stats }: { stats: Stats | null }) {
  const a = stats?.activeSession;
  return (
    <div style={{
      position: 'sticky', top: 16, zIndex: 10,
      margin: '16px',
      padding: '12px 20px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      background: theme.color.surface, border: `1px solid ${theme.color.border}`,
      borderRadius: theme.radius.lg,
      boxShadow: theme.shadow.card,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Activity size={18} color={theme.color.accent} />
        <strong style={{ fontFamily: theme.font.sans, fontSize: 15 }}>Claude Monitor</strong>
      </div>
      <div>
        {a ? (
          <Badge tone="accent">
            <span style={{ width: 6, height: 6, borderRadius: 999, background: theme.color.positive, display: 'inline-block' }} />
            active: {a.project} · last event {formatRelative(a.lastEventAt)}
          </Badge>
        ) : (
          <Badge tone="muted">no active session</Badge>
        )}
      </div>
    </div>
  );
}
