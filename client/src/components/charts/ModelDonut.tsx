import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { Card } from '../ui/Card';
import { theme } from '../../theme';
import type { ModelBreakdown } from '../../lib/types';
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

function colorFor(model: string): string {
  if (model in MODEL_COLORS) return MODEL_COLORS[model];
  for (const [key, color] of Object.entries(MODEL_COLORS)) {
    if (model.startsWith(key)) return color;
  }
  return FALLBACK_COLOR;
}

function shortName(model: string): string {
  if (model.includes('opus-4-7') && model.includes('1m')) return 'Opus 4.7 [1M]';
  if (model.includes('opus-4-7')) return 'Opus 4.7';
  if (model.includes('opus-4-6')) return 'Opus 4.6';
  if (model.includes('sonnet-4-6')) return 'Sonnet 4.6';
  if (model.includes('sonnet-4-5')) return 'Sonnet 4.5';
  if (model.includes('haiku-4-5')) return 'Haiku 4.5';
  return model;
}

export function ModelDonut({ breakdown }: { breakdown: ModelBreakdown[] | null }) {
  const data = (breakdown ?? []).map((b) => ({ name: shortName(b.model), cost: b.cost, turns: b.turns, model: b.model }));
  const total = data.reduce((s, d) => s + d.cost, 0);

  return (
    <Card style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flexShrink: 0, color: theme.color.muted, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 }}>
        By Model
      </div>
      {!breakdown || data.length === 0 ? (
        <div style={{ color: theme.color.muted, fontSize: 13 }}>No data yet.</div>
      ) : (
        <>
          <div style={{ flex: 1, minHeight: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="cost"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius="42%"
                  outerRadius="88%"
                  paddingAngle={2}
                  strokeWidth={0}
                >
                  {data.map((d) => (
                    <Cell key={d.model} fill={colorFor(d.model)} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v: unknown) => [formatCost(v as number), 'Cost']}
                  contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: 'var(--color-text)' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div style={{ flexShrink: 0, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3px 8px', marginTop: 6 }}>
            {data.map((d) => (
              <div key={d.model} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, minWidth: 0 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: colorFor(d.model), flexShrink: 0 }} />
                <span style={{ color: theme.color.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{d.name}</span>
                <span style={{ color: theme.color.muted, fontSize: 10, flexShrink: 0 }}>{total > 0 ? ((d.cost / total) * 100).toFixed(0) : 0}%</span>
              </div>
            ))}
          </div>
        </>
      )}
    </Card>
  );
}
