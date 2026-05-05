import { Activity } from 'lucide-react';
import { Badge } from './ui/Badge';
import { ThemeToggle } from './ThemeToggle';
import { theme } from '../theme';
import type { Stats } from '../lib/types';
import { formatRelative } from '../lib/format';

export type Tab = 'dashboard' | 'sessions' | 'tips' | 'formulas';

const TABS: { id: Tab; label: string }[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'sessions',  label: 'Sessions' },
  { id: 'tips',      label: 'Tips' },
  { id: 'formulas',  label: 'Formulas' },
];

export function TopBar({ stats, activeTab, onTabChange }: {
  stats: Stats | null;
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}) {
  const a = stats?.activeSession;
  return (
    <div style={{ position: 'sticky', top: 16, zIndex: 10, margin: '16px' }}>
      <div style={{
        background: theme.color.surface,
        border: `1px solid ${theme.color.border}`,
        borderRadius: theme.radius.lg,
        boxShadow: theme.shadow.card,
        overflow: 'hidden',
      }}>
        {/* Header row */}
        <div style={{
          padding: '12px 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Activity size={18} color={theme.color.accent} />
            <strong style={{ fontFamily: theme.font.sans, fontSize: 15 }}>Claude Monitor</strong>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ThemeToggle />
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
        {/* Tab row */}
        <div style={{ display: 'flex', borderTop: `1px solid ${theme.color.border}` }}>
          {TABS.map((tab) => {
            const active = tab.id === activeTab;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                style={{
                  padding: '9px 22px',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: active ? `2px solid ${theme.color.accent}` : '2px solid transparent',
                  color: active ? theme.color.accent : theme.color.muted,
                  fontFamily: theme.font.sans,
                  fontSize: 13,
                  fontWeight: active ? 600 : 400,
                  cursor: 'pointer',
                  transition: theme.transition,
                  letterSpacing: 0.2,
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
