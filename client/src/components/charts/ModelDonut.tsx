import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { Card } from '../ui/Card';
import { theme } from '../../theme';
import type { ModelBreakdown } from '../../lib/types';
import { formatCost } from '../../lib/format';
import { colorForModel } from '../../lib/modelColors';

function shortName(model: string): string {
  if (model.includes('opus-4-7') && model.includes('1m')) return 'Opus 4.7 [1M]';
  if (model.includes('opus-4-7')) return 'Opus 4.7';
  if (model.includes('opus-4-6')) return 'Opus 4.6';
  if (model.includes('sonnet-4-6')) return 'Sonnet 4.6';
  if (model.includes('sonnet-4-5')) return 'Sonnet 4.5';
  if (model.includes('haiku-4-5')) return 'Haiku 4.5';
  return model;
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number; payload: { model: string; name: string } }> }) {
  if (!active || !payload || !payload[0]) return null;
  const { name, value, payload: data } = payload[0];
  const color = colorForModel(data.model);
  return (
    <div style={{
      background: 'var(--color-surface-hi)',
      border: '1px solid var(--color-border)',
      borderRadius: 8,
      padding: '8px 10px',
      fontSize: 12,
      fontFamily: 'Fira Code',
      boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
    }}>
      <div style={{ color: 'var(--color-text)', fontWeight: 600, marginBottom: 4 }}>{name}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color }}>
        <span style={{ width: 6, height: 6, borderRadius: 1, background: color, flexShrink: 0 }} />
        {formatCost(value)}
      </div>
    </div>
  );
}

export function ModelDonut({ breakdown }: { breakdown: ModelBreakdown[] | null }) {
  const data = (breakdown ?? []).map((b) => ({
    name: shortName(b.model),
    cost: b.cost,
    turns: b.turns,
    model: b.model,
  }));
  const total = data.reduce((s, d) => s + d.cost, 0);

  return (
    <Card style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div
        style={{
          flexShrink: 0,
          fontFamily: theme.font.sans,
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: 1.5,
          textTransform: 'uppercase',
          color: theme.color.muted,
          marginBottom: 8,
        }}
      >
        By Model
      </div>
      {!breakdown || data.length === 0 ? (
        <div style={{ color: theme.color.muted, fontSize: 13 }}>No data yet.</div>
      ) : (
        <>
          <div style={{ flex: 1, minHeight: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <defs>
                  {data.map((d) => {
                    const modelColor = colorForModel(d.model);
                    return (
                      <radialGradient key={d.model} id={`grad-${d.model}`} cx="35%" cy="35%">
                        <stop offset="0%" stopColor={modelColor} stopOpacity={1} />
                        <stop offset="100%" stopColor={modelColor} stopOpacity={0.55} />
                      </radialGradient>
                    );
                  })}
                </defs>
                <Pie
                  data={data}
                  dataKey="cost"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius="44%"
                  outerRadius="84%"
                  paddingAngle={2}
                  strokeWidth={0}
                >
                  {data.map((d) => (
                    <Cell key={d.model} fill={`url(#grad-${d.model})`} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} cursor={false} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div
            style={{
              flexShrink: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: 5,
              marginTop: 8,
            }}
          >
            {data.map((d) => (
              <div
                key={d.model}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7,
                  fontSize: 11,
                  minWidth: 0,
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 2,
                    background: colorForModel(d.model),
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    color: theme.color.text,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    flex: 1,
                    fontFamily: theme.font.mono,
                    fontSize: 11,
                  }}
                >
                  {d.name}
                </span>
                <span
                  style={{
                    color: colorForModel(d.model),
                    fontFamily: theme.font.mono,
                    fontSize: 10,
                    fontWeight: 600,
                    flexShrink: 0,
                  }}
                >
                  {total > 0 ? ((d.cost / total) * 100).toFixed(0) : 0}%
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </Card>
  );
}
