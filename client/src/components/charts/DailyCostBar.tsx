import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Card } from '../ui/Card';
import { theme } from '../../theme';
import type { Session } from '../../lib/types';
import { formatCost } from '../../lib/format';

function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function last7Days(): { date: string; label: string }[] {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    const date = localDateStr(d);
    const label = i === 0 ? 'Today' : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    days.push({ date, label });
  }
  return days;
}

export function DailyCostBar({ sessions }: { sessions: Session[] | null }) {
  const days = last7Days();
  const byDate = new Map<string, number>();
  for (const s of sessions ?? []) {
    const date = localDateStr(new Date(s.startedAt));
    byDate.set(date, (byDate.get(date) ?? 0) + s.cost);
  }
  const data = days.map(({ date, label }) => ({ label, cost: byDate.get(date) ?? 0 }));

  return (
    <Card style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div
        style={{
          flexShrink: 0,
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginBottom: 16,
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
          Daily Cost
        </span>
        <span style={{ fontSize: 11, color: theme.color.muted, fontFamily: theme.font.mono }}>
          last 7 days
        </span>
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
            <defs>
              <linearGradient id="costGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="var(--chart-cost)" stopOpacity={1} />
                <stop offset="100%" stopColor="var(--chart-cost)" stopOpacity={0.45} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: 'var(--color-muted)', fontFamily: 'Fira Code' }}
              axisLine={false}
              tickLine={false}
              dy={5}
            />
            <YAxis
              tickFormatter={(v) => `$${v.toFixed(0)}`}
              tick={{ fontSize: 10, fill: 'var(--color-muted)', fontFamily: 'Fira Code' }}
              axisLine={false}
              tickLine={false}
              width={38}
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
            <Bar dataKey="cost" fill="url(#costGrad)" radius={[5, 5, 0, 0]} maxBarSize={52} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
