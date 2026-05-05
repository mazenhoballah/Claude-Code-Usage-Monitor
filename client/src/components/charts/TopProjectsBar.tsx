import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import { Card } from '../ui/Card';
import { theme } from '../../theme';
import type { Session } from '../../lib/types';
import { formatCost } from '../../lib/format';

const GRADIENT_COLORS = ['#7c3aed', '#6d28d9', '#5b21b6', '#4c1d95', '#3b0764'];

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
    <Card>
      <div style={{ color: theme.color.muted, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 16 }}>
        Top Projects — All Time Cost
      </div>
      {!sessions || data.length === 0 ? (
        <div style={{ color: theme.color.muted, fontSize: 13 }}>No data yet.</div>
      ) : (
        <ResponsiveContainer width="100%" height={Math.max(100, data.length * 44)}>
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid horizontal={false} stroke="var(--color-border)" />
            <XAxis type="number" tickFormatter={(v) => `$${v.toFixed(0)}`} tick={{ fontSize: 11, fill: 'var(--color-muted)' }} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="project" width={80} tick={{ fontSize: 12, fill: 'var(--color-text)' }} axisLine={false} tickLine={false} />
            <Tooltip
              formatter={(v: unknown) => [formatCost(v as number), 'Cost']}
              contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12 }}
              labelStyle={{ color: 'var(--color-text)' }}
              cursor={{ fill: 'var(--color-surface-hi)' }}
            />
            <Bar dataKey="cost" radius={[0, 4, 4, 0]} maxBarSize={32}>
              {data.map((_, i) => (
                <Cell key={i} fill={GRADIENT_COLORS[Math.min(i, GRADIENT_COLORS.length - 1)]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}
