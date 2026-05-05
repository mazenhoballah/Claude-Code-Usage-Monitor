import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { Card } from '../ui/Card';
import { theme } from '../../theme';
import type { Session } from '../../lib/types';
import { formatCost } from '../../lib/format';

const MODEL_COLORS: Record<string, string> = {
  'claude-opus-4-7[1m]': '#7c3aed',
  'claude-opus-4-7':     '#8b5cf6',
  'claude-opus-4-6':     '#a78bfa',
  'claude-sonnet-4-6':   '#3b82f6',
  'claude-sonnet-4-5':   '#60a5fa',
  'claude-haiku-4-5':    '#22c55e',
};
const FALLBACK_COLOR = '#94a3b8';

function shortName(model: string): string {
  if (model.includes('opus-4-7') && model.includes('1m')) return 'Opus 4.7 [1M]';
  if (model.includes('opus-4-7')) return 'Opus 4.7';
  if (model.includes('opus-4-6')) return 'Opus 4.6';
  if (model.includes('sonnet-4-6')) return 'Sonnet 4.6';
  if (model.includes('sonnet-4-5')) return 'Sonnet 4.5';
  if (model.includes('haiku-4-5')) return 'Haiku 4.5';
  return model;
}

export function ModelDonut({ sessions }: { sessions: Session[] | null }) {
  const byModel = new Map<string, number>();
  for (const s of sessions ?? []) {
    byModel.set(s.model, (byModel.get(s.model) ?? 0) + s.cost);
  }

  const data = [...byModel.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([model, cost]) => ({ name: shortName(model), cost, model }));

  const total = data.reduce((s, d) => s + d.cost, 0);

  return (
    <Card style={{ height: '100%' }}>
      <div style={{ color: theme.color.muted, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 12 }}>
        By Model
      </div>
      {!sessions || data.length === 0 ? (
        <div style={{ color: theme.color.muted, fontSize: 13 }}>No data yet.</div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie
                data={data}
                dataKey="cost"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={72}
                paddingAngle={2}
                strokeWidth={0}
              >
                {data.map((d) => (
                  <Cell key={d.model} fill={MODEL_COLORS[d.model] ?? FALLBACK_COLOR} />
                ))}
              </Pie>
              <Tooltip
                formatter={(v: unknown) => [formatCost(v as number), 'Cost']}
                contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: 'var(--color-text)' }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
            {data.map((d) => (
              <div key={d.model} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: MODEL_COLORS[d.model] ?? FALLBACK_COLOR, flexShrink: 0 }} />
                <span style={{ flex: 1, color: theme.color.text }}>{d.name}</span>
                <span className="mono" style={{ color: theme.color.muted }}>{formatCost(d.cost)}</span>
                <span style={{ color: theme.color.muted, fontSize: 11 }}>({total > 0 ? ((d.cost / total) * 100).toFixed(0) : 0}%)</span>
              </div>
            ))}
          </div>
        </>
      )}
    </Card>
  );
}
