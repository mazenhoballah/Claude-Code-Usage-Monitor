import { useMemo, useState } from 'react';
import { Card } from './ui/Card';
import { theme } from '../theme';
import type { ContextOverhead } from '../lib/types';
import { formatTokens } from '../lib/format';

export function ContextPanel({ data }: { data: ContextOverhead[] | null }) {
  const projects = useMemo(() => (data ?? []).slice().sort((a, b) => b.totalEstTokens - a.totalEstTokens), [data]);
  const [selected, setSelected] = useState<string | null>(null);
  const active = projects.find((p) => p.cwd === selected) ?? projects[0] ?? null;

  return (
    <Card style={{ height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, letterSpacing: 0.4, textTransform: 'uppercase', color: theme.color.muted }}>
          Context overhead
        </h3>
        {projects.length > 1 && (
          <select
            value={active?.cwd ?? ''}
            onChange={(e) => setSelected(e.target.value)}
            style={{
              background: theme.color.surfaceHi, color: theme.color.text,
              border: `1px solid ${theme.color.border}`, borderRadius: 6,
              padding: '4px 8px', fontSize: 12,
            }}
          >
            {projects.map((p) => <option key={p.cwd} value={p.cwd}>{p.project}</option>)}
          </select>
        )}
      </div>
      {!active ? (
        <div style={{ color: theme.color.muted, fontSize: 13 }}>No project context found.</div>
      ) : (
        <>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ color: theme.color.muted, textAlign: 'left' }}>
                <th style={{ fontWeight: 500, padding: '4px 0' }}>File</th>
                <th style={{ fontWeight: 500, padding: '4px 0', textAlign: 'right' }}>est. tokens</th>
              </tr>
            </thead>
            <tbody>
              {active.files.slice(0, 12).map((f) => (
                <tr key={f.path} style={{ borderTop: `1px solid ${theme.color.border}` }}>
                  <td style={{ padding: '6px 0', fontFamily: theme.font.mono, color: theme.color.text }}>
                    {f.path}
                    <span style={{ marginLeft: 8, fontSize: 11, color: theme.color.muted }}>{f.role}</span>
                  </td>
                  <td className="mono" style={{ padding: '6px 0', textAlign: 'right', color: theme.color.text }}>
                    {formatTokens(f.estTokens)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ borderTop: `1px solid ${theme.color.border}`, marginTop: 8, paddingTop: 8, display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: theme.color.muted, fontSize: 12 }}>Total (chars/4 estimate)</span>
            <span className="mono" style={{ fontSize: 14 }}>{formatTokens(active.totalEstTokens)}</span>
          </div>
        </>
      )}
    </Card>
  );
}
