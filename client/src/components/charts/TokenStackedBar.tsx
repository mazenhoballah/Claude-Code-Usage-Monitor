import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { Card } from '../ui/Card';
import { theme } from '../../theme';
import type { Session } from '../../lib/types';
import { formatTokens } from '../../lib/format';

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

export function TokenStackedBar({ sessions }: { sessions: Session[] | null }) {
  const days = last7Days();
  const byDate = new Map<string, { input: number; output: number; cacheRead: number; cacheCreate: number }>();
  for (const { date, label: _ } of days) byDate.set(date, { input: 0, output: 0, cacheRead: 0, cacheCreate: 0 });

  for (const s of sessions ?? []) {
    const date = s.startedAt.slice(0, 10);
    const bucket = byDate.get(date);
    if (!bucket) continue;
    bucket.input      += s.totals.input;
    bucket.output     += s.totals.output;
    bucket.cacheRead  += s.totals.cacheRead;
    bucket.cacheCreate += s.totals.cacheCreate;
  }

  const data = days.map(({ date, label }) => {
    const b = byDate.get(date)!;
    return { label, ...b };
  });

  const tickFormatter = (v: number) => v >= 1_000_000 ? (v / 1_000_000).toFixed(1) + 'M' : v >= 1000 ? (v / 1000).toFixed(0) + 'k' : String(v);

  return (
    <Card>
      <div style={{ color: theme.color.muted, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 16 }}>
        Last 7 Days — Token Breakdown
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} margin={{ top: 0, right: 0, left: -8, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--color-border)" />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--color-muted)' }} axisLine={false} tickLine={false} />
          <YAxis tickFormatter={tickFormatter} tick={{ fontSize: 11, fill: 'var(--color-muted)' }} axisLine={false} tickLine={false} />
          <Tooltip
            formatter={(v: unknown, name: unknown) => [formatTokens(v as number), name as string]}
            contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12 }}
            labelStyle={{ color: 'var(--color-text)' }}
            cursor={{ fill: 'var(--color-surface-hi)' }}
          />
          <Legend iconSize={10} wrapperStyle={{ fontSize: 11, color: theme.color.muted }} />
          <Bar dataKey="cacheRead"  name="Cache Read"   stackId="t" fill="#22c55e" />
          <Bar dataKey="cacheCreate" name="Cache Write" stackId="t" fill="#f59e0b" />
          <Bar dataKey="output"     name="Output"       stackId="t" fill="#3b82f6" />
          <Bar dataKey="input"      name="Input"        stackId="t" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}
