import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Card } from '../ui/Card';
import { theme } from '../../theme';
import type { Session } from '../../lib/types';
import { formatCost } from '../../lib/format';

export function TopProjectsBar({ sessions }: { sessions: Session[] | null }) {
  const byProject = new Map<string, number>();
  for (const s of sessions ?? []) {
    byProject.set(s.project, (byProject.get(s.project) ?? 0) + s.cost);
  }

  const data = [...byProject.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([project, cost]) => ({ project, cost }));

  return (
    <Card style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div
        style={{
          flexShrink: 0,
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginBottom: 12,
        }}
      >
        <span
          style={{
            fontFamily: theme.font.sans,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 1.5,
            textTransform: 'uppercase',
            color: theme.color.muted,
          }}
        >
          Top Projects
        </span>
        <span style={{ fontSize: 11, color: theme.color.muted, fontFamily: theme.font.mono }}>
          all-time cost
        </span>
      </div>
      {!sessions || data.length === 0 ? (
        <div style={{ color: theme.color.muted, fontSize: 13 }}>No data yet.</div>
      ) : (
        <div style={{ flex: 1, minHeight: 0 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
              <XAxis
                type="number"
                tickFormatter={(v) => `$${v.toFixed(0)}`}
                tick={{ fontSize: 10, fill: 'var(--color-muted)', fontFamily: 'Fira Code' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="project"
                width={88}
                tick={{ fontSize: 11, fill: 'var(--color-text)', fontFamily: 'Fira Code' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                formatter={(v: unknown) => [formatCost(v as number), 'Cost']}
                contentStyle={{
                  background: 'var(--color-surface-hi)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 8,
                  fontSize: 12,
                  fontFamily: 'Fira Code',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
                }}
                labelStyle={{ color: 'var(--color-text)', fontWeight: 600, marginBottom: 2 }}
                cursor={{ fill: 'var(--color-surface-hi)', opacity: 0.6 }}
              />
              <Bar dataKey="cost" radius={[0, 5, 5, 0]} maxBarSize={26}>
                {data.map((d, i) => {
                  const intensity = 0.35 + 0.65 * (1 - i / Math.max(data.length - 1, 1));
                  return (
                    <Cell
                      key={d.project}
                      fill={`var(--color-accent)`}
                      fillOpacity={intensity}
                    />
                  );
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
