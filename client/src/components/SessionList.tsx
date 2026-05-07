import React, { useState, useRef } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { theme } from '../theme';
import type { Session, SessionDetail, SessionRequest } from '../lib/types';
import { api } from '../lib/api';
import { formatCost, formatDuration, formatRelative, formatTokens } from '../lib/format';
import { colorForModel } from '../lib/modelColors';

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
        fontWeight: 500, padding: '6px 0', textAlign: right ? 'right' : 'left',
        cursor: 'pointer', userSelect: 'none',
        color: isActive ? theme.color.text : theme.color.muted,
        whiteSpace: 'nowrap',
        position: 'sticky', top: 0,
        background: theme.color.surface,
        borderBottom: `1px solid ${theme.color.border}`,
      }}
    >
      {label}{' '}
      <span style={{ fontSize: 10, opacity: isActive ? 1 : 0.3 }}>
        {isActive ? (dir === 'asc' ? '▲' : '▼') : '▲'}
      </span>
    </th>
  );
}

function RequestsTable({ detail }: { detail: SessionDetail }) {
  const rows: SessionRequest[] = detail.requests ?? [];

  const thBase: React.CSSProperties = {
    fontSize: 11, fontWeight: 600, letterSpacing: 0.5,
    textTransform: 'uppercase', color: theme.color.muted,
    padding: '5px 10px', textAlign: 'left',
    borderBottom: `1px solid ${theme.color.border}`,
    whiteSpace: 'nowrap', background: theme.color.surfaceHi,
  };
  const thR: React.CSSProperties = { ...thBase, textAlign: 'right' };
  const mono: React.CSSProperties = { fontFamily: theme.font.mono };

  if (rows.length === 0) {
    return (
      <div style={{ padding: '10px 14px 10px 14px', fontSize: 12, color: theme.color.muted }}>
        No user requests found in this session.
      </div>
    );
  }

  return (
    <div style={{
      margin: '0 0 6px 28px',
      borderLeft: `2px solid ${theme.color.accent}`,
      background: theme.color.surfaceHi,
      borderRadius: '0 0 6px 6px',
      overflow: 'hidden',
    }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr>
            <th style={{ ...thBase, width: 28 }}>#</th>
            <th style={thBase}>Prompt</th>
            <th style={thBase}>Model</th>
            <th style={thBase}>Agents</th>
            <th style={thR}>Input</th>
            <th style={thR}>Output</th>
            <th style={{ ...thR, color: theme.color.positive }}>CR</th>
            <th style={{ ...thR, color: theme.color.warning }}>CW</th>
            <th style={thR}>Total</th>
            <th style={thR}>Cost</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((req) => (
            <tr key={req.id} style={{ borderTop: `1px solid ${theme.color.border}` }}>
              <td style={{ ...mono, padding: '6px 10px', color: theme.color.muted, fontWeight: 600 }}>
                {req.id}
              </td>
              <td style={{ padding: '6px 10px', maxWidth: 340, minWidth: 160 }}>
                <div
                  title={req.userText}
                  style={{
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    color: theme.color.text, fontWeight: 500,
                  }}
                >
                  {req.userText || <span style={{ color: theme.color.muted, fontStyle: 'italic' }}>—</span>}
                </div>
              </td>
              <td style={{ padding: '6px 10px', whiteSpace: 'nowrap' }}>
                <span style={{
                  color: colorForModel(req.model),
                  fontWeight: 600,
                  fontSize: 11,
                  fontFamily: theme.font.mono,
                }}>
                  {req.model.replace(/^claude-/, '').replace(/-\d{8}$/, '')}
                </span>
              </td>
              <td style={{ padding: '6px 10px', whiteSpace: 'nowrap' }}>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {req.subAgents.length === 0
                    ? <span style={{ color: theme.color.muted, fontSize: 11 }}>—</span>
                    : req.subAgents.map((a) => <Badge key={a} tone="muted">{a}</Badge>)
                  }
                </div>
              </td>
              <td style={{ ...mono, padding: '6px 10px', textAlign: 'right', color: theme.color.muted }}>{formatTokens(req.input)}</td>
              <td style={{ ...mono, padding: '6px 10px', textAlign: 'right', color: theme.color.muted }}>{formatTokens(req.output)}</td>
              <td style={{ ...mono, padding: '6px 10px', textAlign: 'right', color: theme.color.positive, fontWeight: 600 }}>{formatTokens(req.cacheRead)}</td>
              <td style={{ ...mono, padding: '6px 10px', textAlign: 'right', color: theme.color.warning, fontWeight: 600 }}>{formatTokens(req.cacheCreate)}</td>
              <td style={{ ...mono, padding: '6px 10px', textAlign: 'right', color: theme.color.text, fontWeight: 600 }}>{formatTokens(req.total)}</td>
              <td style={{ ...mono, padding: '6px 10px', textAlign: 'right', color: theme.color.positive, fontWeight: 600 }}>{formatCost(req.cost)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function SessionList({ sessions, onSelect: _onSelect }: { sessions: Session[] | null; onSelect: (id: string) => void }) {
  const [sortKey, setSortKey] = useState<SortKey>('when');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [detailCache, setDetailCache] = useState<Map<string, SessionDetail | 'loading'>>(new Map());
  const fetchingRef = useRef<Set<string>>(new Set());

  function handleSort(col: SortKey) {
    if (col === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(col);
      setSortDir('desc');
    }
  }

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

    if (!detailCache.has(id) && !fetchingRef.current.has(id)) {
      fetchingRef.current.add(id);
      setDetailCache((cache) => new Map(cache).set(id, 'loading'));
      api.session(id)
        .then((detail) => {
          setDetailCache((cache) => new Map(cache).set(id, detail));
        })
        .catch(() => {
          setDetailCache((cache) => {
            const m = new Map(cache);
            m.delete(id);
            return m;
          });
        })
        .finally(() => {
          fetchingRef.current.delete(id);
        });
    }
  }

  const sorted = sessions ? sortSessions(sessions, sortKey, sortDir) : null;

  return (
    <Card style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <h3 style={{ margin: '0 0 0 0', flexShrink: 0, fontSize: 14, fontWeight: 600, letterSpacing: 0.4, textTransform: 'uppercase', color: theme.color.muted }}>
        All sessions
      </h3>
      {!sorted ? (
        <div style={{ color: theme.color.muted, fontSize: 13, marginTop: 12 }}>Loading…</div>
      ) : sorted.length === 0 ? (
        <div style={{ color: theme.color.muted, fontSize: 13, marginTop: 12 }}>No sessions yet.</div>
      ) : (
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', marginTop: 4 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ textAlign: 'left' }}>
                {/* empty chevron column */}
                <th style={{
                  width: 28,
                  padding: '6px 0',
                  position: 'sticky', top: 0,
                  background: theme.color.surface,
                  borderBottom: `1px solid ${theme.color.border}`,
                }} />
                <SortTh label="When"    col="when"    active={sortKey} dir={sortDir} onSort={handleSort} />
                <SortTh label="Title"   col="title"   active={sortKey} dir={sortDir} onSort={handleSort} />
                <SortTh label="Project" col="project" active={sortKey} dir={sortDir} onSort={handleSort} />
                <SortTh label="Tokens"  col="tokens"  active={sortKey} dir={sortDir} onSort={handleSort} right />
                <SortTh label="Cost"    col="cost"    active={sortKey} dir={sortDir} onSort={handleSort} right />
              </tr>
            </thead>
            <tbody>
              {sorted.map((s) => {
                const isExpanded = expanded.has(s.id);
                const detail = detailCache.get(s.id);
                return (
                  <React.Fragment key={s.id}>
                    <tr
                      onClick={() => toggleExpand(s.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === 'Enter') toggleExpand(s.id); }}
                      style={{ borderTop: `1px solid ${theme.color.border}`, cursor: 'pointer' }}
                    >
                      <td style={{ padding: '7px 4px 7px 0', width: 28, verticalAlign: 'middle' }}>
                        {isExpanded
                          ? <ChevronDown size={14} color={theme.color.accent} />
                          : <ChevronRight size={14} color={theme.color.muted} />
                        }
                      </td>
                      <td style={{ padding: '7px 12px 7px 0' }}>
                        <div style={{ color: theme.color.accent, fontWeight: 500 }}>{formatRelative(s.startedAt)}</div>
                        <div style={{ fontSize: 11, color: theme.color.muted, marginTop: 1 }}>{formatDuration(s.durationMs)} · <span style={{ color: theme.color.warning }}>{s.turns}t</span></div>
                      </td>
                      <td style={{ padding: '7px 12px 7px 0', maxWidth: 320 }}>
                        <div title={s.title} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>
                          {s.title}
                        </div>
                      </td>
                      <td style={{ padding: '7px 12px 7px 0' }}>
                        <div style={{ color: theme.color.text, fontWeight: 500 }}>{s.project}</div>
                        <div style={{ marginTop: 2 }}>
                          <span style={{
                            color: colorForModel(s.model),
                            fontWeight: 600,
                            fontSize: 11,
                            fontFamily: theme.font.mono,
                          }}>
                            {s.model.replace(/^claude-/, '').replace(/-\d{8}$/, '')}
                          </span>
                        </div>
                      </td>
                      <td className="mono" style={{ padding: '7px 0', textAlign: 'right', color: theme.color.text }}>{formatTokens(s.totals.total)}</td>
                      <td className="mono" style={{ padding: '7px 0', textAlign: 'right', color: theme.color.positive, fontWeight: 600 }}>{formatCost(s.cost)}</td>
                    </tr>
                    {isExpanded && (
                      <tr>
                        <td colSpan={6} style={{ padding: '0 0 8px 0', background: theme.color.surface }}>
                          {detail === 'loading' || detail === undefined ? (
                            <div style={{ padding: '8px 12px', fontSize: 12, color: theme.color.muted }}>
                              Loading…
                            </div>
                          ) : (
                            <RequestsTable detail={detail} />
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
