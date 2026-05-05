import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Card } from '../ui/Card';
import { theme } from '../../theme';
import type { Session } from '../../lib/types';
import { formatCost } from '../../lib/format';

function last7Days(): { date: string; label: string }[] {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    const date = d.toISOString().slice(0, 10);
    const label = i === 0 ? 'Today' : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    days.push({ date, label });
  }
  return days;
}

export function DailyCostBar({ sessions }: { sessions: Session[] | null }) {
  const days = last7Days();
  const byDate = new Map<string, number>();
  for (const s of sessions ?? []) {
    const date = s.startedAt.slice(0, 10);
    byDate.set(date, (byDate.get(date) ?? 0) + s.cost);
  }
  const data = days.map(({ date, label }) => ({ label, cost: byDate.get(date) ?? 0 }));

  return (
    <Card>
      <div style={{ color: theme.color.muted, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 16 }}>
        Last 7 Days — Cost
      </div>
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={data} margin={{ top: 0, right: 0, left: -16, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--color-border)" />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--color-muted)' }} axisLine={false} tickLine={false} />
          <YAxis tickFormatter={(v) => `$${v.toFixed(0)}`} tick={{ fontSize: 11, fill: 'var(--color-muted)' }} axisLine={false} tickLine={false} />
          <Tooltip
            formatter={(v: unknown) => [formatCost(v as number), 'Cost']}
            contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12 }}
            labelStyle={{ color: 'var(--color-text)' }}
            cursor={{ fill: 'var(--color-surface-hi)' }}
          />
          <Bar dataKey="cost" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={48} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}
