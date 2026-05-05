import { useState } from 'react';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { theme } from '../theme';
import type { Session } from '../lib/types';
import { formatCost, formatDuration, formatRelative, formatTokens } from '../lib/format';

type SortKey = 'when' | 'title' | 'project' | 'tokens' | 'cost';
type SortDir = 'asc' | 'desc';

function sortSessions(sessions: Session[], key: SortKey, dir: SortDir): Session[] {
  const sorted = [...sessions].sort((a, b) => {
    switch (key) {
      case 'when':    return Date.parse(a.startedAt) - Date.parse(b.startedAt);
      case 'title':   return a.title.localeCompare(b.title);
      case 'project': return a.project.localeCompare(b.project);
      case 'tokens':  return a.totals.total - b.totals.total;
      case 'cost':    return a.cost - b.cost;
    }
  });
  return dir === 'asc' ? sorted : sorted.reverse();
}

function SortTh({ label, col, active, dir, onSort, right }: {
  label: string; col: SortKey; active: SortKey; dir: SortDir;
  onSort: (col: SortKey) => void; right?: boolean;
}) {
  const isActive = col === active;
  return (
    <th
      onClick={() => onSort(col)}
      style={{
        fontWeight: 500, padding: '4px 0', textAlign: right ? 'right' : 'left',
        cursor: 'pointer', userSelect: 'none',
        color: isActive ? theme.color.text : theme.color.muted,
        whiteSpace: 'nowrap',
      }}
    >
      {label}{' '}
      <span style={{ fontSize: 10, opacity: isActive ? 1 : 0.3 }}>
        {isActive ? (dir === 'asc' ? '▲' : '▼') : '▲'}
      </span>
    </th>
  );
}

export function SessionList({ sessions, onSelect }: { sessions: Session[] | null; onSelect: (id: string) => void }) {
  const [sortKey, setSortKey] = useState<SortKey>('when');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  function handleSort(col: SortKey) {
    if (col === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(col);
      setSortDir('desc');
    }
  }

  const sorted = sessions ? sortSessions(sessions, sortKey, sortDir) : null;

  return (
    <Card style={{ height: '100%' }}>
      <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, letterSpacing: 0.4, textTransform: 'uppercase', color: theme.color.muted, marginBottom: 12 }}>
        Recent sessions
      </h3>
      {!sorted ? (
        <div style={{ color: theme.color.muted, fontSize: 13 }}>Loading…</div>
      ) : sorted.length === 0 ? (
        <div style={{ color: theme.color.muted, fontSize: 13 }}>No sessions yet.</div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ textAlign: 'left' }}>
              <SortTh label="When"    col="when"    active={sortKey} dir={sortDir} onSort={handleSort} />
              <SortTh label="Title"   col="title"   active={sortKey} dir={sortDir} onSort={handleSort} />
              <SortTh label="Project" col="project" active={sortKey} dir={sortDir} onSort={handleSort} />
              <SortTh label="Tokens"  col="tokens"  active={sortKey} dir={sortDir} onSort={handleSort} right />
              <SortTh label="Cost"    col="cost"    active={sortKey} dir={sortDir} onSort={handleSort} right />
            </tr>
          </thead>
          <tbody>
            {sorted.map((s) => (
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
                <td style={{ padding: '8px 12px 8px 0', maxWidth: 320 }}>
                  <div title={s.title} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {s.title}
                  </div>
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
