import { Activity } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { theme } from '../theme';
import type { Stats } from '../lib/types';
import { formatRelative } from '../lib/format';

export type Tab = 'dashboard' | 'sessions' | 'tips' | 'formulas' | 'whats-new';

const TABS: { id: Tab; label: string }[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'sessions', label: 'Sessions' },
  { id: 'tips', label: 'Tips' },
  { id: 'formulas', label: 'Formulas' },
  { id: 'whats-new', label: "What's New" },
];

export function TopBar({
  stats,
  activeTab,
  onTabChange,
}: {
  stats: Stats | null;
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}) {
  const a = stats?.activeSession;

  return (
    <header
      style={{
        background: theme.color.surface,
        borderBottom: `1px solid ${theme.color.border}`,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'stretch',
        padding: '0 32px',
        height: 52,
        gap: 20,
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
      {/* Brand */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 9,
          flexShrink: 0,
        }}>
        <Activity size={15} color={theme.color.accent} strokeWidth={2.5} />
        <span
          style={{
            fontFamily: theme.font.display,
            fontWeight: 700,
            fontSize: 12,
            letterSpacing: 2.8,
            textTransform: 'uppercase',
            color: theme.color.text,
            whiteSpace: 'nowrap',
          }}>
          Anthrometer
        </span>
      </div>

      {/* Divider */}
      <div
        style={{
          width: 1,
          margin: '14px 4px',
          background: theme.color.border,
          flexShrink: 0,
        }}
      />

      {/* Tabs */}
      <nav style={{ display: 'flex', flex: 1 }}>
        {TABS.map((tab) => {
          const active = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              style={{
                padding: '0 16px',
                height: '100%',
                background: 'transparent',
                border: 'none',
                borderBottom: active
                  ? `2px solid ${theme.color.accent}`
                  : '2px solid transparent',
                color: active ? theme.color.text : theme.color.muted,
                fontFamily: theme.font.sans,
                fontSize: 13,
                fontWeight: active ? 600 : 400,
                cursor: 'pointer',
                transition: 'color 140ms ease, border-color 140ms ease',
                letterSpacing: 0.2,
                marginBottom: -1,
              }}>
              {tab.label}
            </button>
          );
        })}
      </nav>

      {/* Session status + theme toggle */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          flexShrink: 0,
        }}>
        {a ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              fontSize: 12,
              padding: '4px 10px',
              borderRadius: 6,
              background: 'rgba(6,182,212,0.10)',
              border: '1px solid rgba(6,182,212,0.30)',
            }}>
            <span
              className='pulse-dot'
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: theme.color.accent,
                display: 'inline-block',
                flexShrink: 0,
              }}
            />
            <span style={{ color: theme.color.accent, fontWeight: 600 }}>
              {a.project}
            </span>
            <span style={{ color: theme.color.muted }}>·</span>
            <span style={{ color: theme.color.muted }}>
              {formatRelative(a.lastEventAt)}
            </span>
          </div>
        ) : (
          <div
            style={{
              fontSize: 12,
              padding: '4px 10px',
              borderRadius: 6,
              color: theme.color.muted,
              border: `1px solid ${theme.color.border}`,
            }}>
            No active session
          </div>
        )}
        <ThemeToggle />
      </div>
    </header>
  );
}
