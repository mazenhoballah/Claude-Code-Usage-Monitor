import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { theme } from '../theme';
import { api } from '../lib/api';
import type { SessionDetail as SD } from '../lib/types';
import { formatCost, formatPct, formatTokens } from '../lib/format';
import { Badge } from './ui/Badge';

export function SessionDetail({ id, onClose }: { id: string; onClose: () => void }) {
  const [data, setData] = useState<SD | null>(null);

  useEffect(() => {
    let cancelled = false;
    api.session(id).then((d) => { if (!cancelled) setData(d); }).catch(() => {});
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => { cancelled = true; document.removeEventListener('keydown', onKey); };
  }, [id, onClose]);

  return (
    <>
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, background: 'rgba(2,6,23,0.65)', zIndex: 20,
      }} />
      <aside
        role="dialog"
        aria-label="Session details"
        style={{
          position: 'fixed', top: 0, right: 0, bottom: 0, width: 'min(560px, 100vw)', zIndex: 21,
          background: theme.color.surface, borderLeft: `1px solid ${theme.color.border}`,
          display: 'flex', flexDirection: 'column',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', borderBottom: `1px solid ${theme.color.border}` }}>
          <strong>Session details</strong>
          <button onClick={onClose} aria-label="Close" style={{ display: 'flex', padding: 4 }}>
            <X size={16} />
          </button>
        </div>
        <div style={{ overflowY: 'auto', padding: 18 }}>
          {!data ? (
            <div style={{ color: theme.color.muted }}>Loading…</div>
          ) : (
            <>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
                <Badge tone="accent">{data.model}</Badge>
                <Badge tone="muted">{data.turns} turns</Badge>
                <Badge tone="muted">{formatTokens(data.totals.total)} tokens</Badge>
                <Badge tone="positive">{formatCost(data.cost)} est</Badge>
              </div>
              <div className="mono" style={{ fontSize: 12, color: theme.color.muted, marginBottom: 12 }}>
                {data.cwd}
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ color: theme.color.muted, textAlign: 'left' }}>
                    <th style={{ fontWeight: 500, padding: '4px 0' }}>#</th>
                    <th style={{ fontWeight: 500, padding: '4px 0', textAlign: 'right' }}>in</th>
                    <th style={{ fontWeight: 500, padding: '4px 0', textAlign: 'right' }}>out</th>
                    <th style={{ fontWeight: 500, padding: '4px 0', textAlign: 'right' }}>cache r</th>
                    <th style={{ fontWeight: 500, padding: '4px 0', textAlign: 'right' }}>cache w</th>
                    <th style={{ fontWeight: 500, padding: '4px 0', textAlign: 'right' }}>cost</th>
                    <th style={{ fontWeight: 500, padding: '4px 0', textAlign: 'right' }}>ctx</th>
                  </tr>
                </thead>
                <tbody>
                  {data.perTurn.map((t, i) => (
                    <tr key={i} style={{ borderTop: `1px solid ${theme.color.border}` }}>
                      <td className="mono" style={{ padding: '6px 0' }}>{i + 1}</td>
                      <td className="mono" style={{ padding: '6px 0', textAlign: 'right' }}>{formatTokens(t.input)}</td>
                      <td className="mono" style={{ padding: '6px 0', textAlign: 'right' }}>{formatTokens(t.output)}</td>
                      <td className="mono" style={{ padding: '6px 0', textAlign: 'right', color: theme.color.positive }}>{formatTokens(t.cacheRead)}</td>
                      <td className="mono" style={{ padding: '6px 0', textAlign: 'right' }}>{formatTokens(t.cacheCreate)}</td>
                      <td className="mono" style={{ padding: '6px 0', textAlign: 'right' }}>{formatCost(t.cost)}</td>
                      <td className="mono" style={{ padding: '6px 0', textAlign: 'right', color: t.cumulativeContextPct > 0.8 ? theme.color.danger : t.cumulativeContextPct > 0.5 ? theme.color.warning : theme.color.muted }}>
                        {formatPct(t.cumulativeContextPct)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      </aside>
    </>
  );
}
