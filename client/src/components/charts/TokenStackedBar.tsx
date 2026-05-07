import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Card } from '../ui/Card';
import { theme } from '../../theme';
import type { Session } from '../../lib/types';
import { formatTokens } from '../../lib/format';

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

const LEGEND_COLORS: Record<string, string> = {
  'Input':        'var(--chart-input)',
  'Output':       'var(--chart-output)',
  'Cache Write':  'var(--chart-cache-write)',
  'Cache Read':   'var(--chart-cache-read)',
};

// Map for easier color lookup in tooltip
const COLOR_MAP: Record<string, string> = {
  'input':       'var(--chart-input)',
  'output':      'var(--chart-output)',
  'cacheCreate': 'var(--chart-cache-write)',
  'cacheRead':   'var(--chart-cache-read)',
};

const COLOR_LABELS: Record<string, string> = {
  'input':       'Input',
  'output':      'Output',
  'cacheCreate': 'Cache Write',
  'cacheRead':   'Cache Read',
};

function CustomLegend({ payload }: { payload?: Array<{ value: string; color: string }> }) {
  if (!payload) return null;
  return (
    <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap', paddingTop: 6 }}>
      {payload.map((entry) => (
        <div key={entry.value} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--color-muted)' }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, background: LEGEND_COLORS[entry.value] ?? entry.color, display: 'inline-block', flexShrink: 0 }} />
          {entry.value}
        </div>
      ))}
    </div>
  );
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ dataKey: string; value: number; name: string }> }) {
  if (!active || !payload) return null;
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
      {payload.map((entry, idx) => {
        const color = COLOR_MAP[entry.dataKey] || entry.name;
        return (
          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 6, color, ...(idx > 0 && { marginTop: 4 }) }}>
            <span style={{ width: 6, height: 6, borderRadius: 1, background: color, flexShrink: 0 }} />
            <span>{COLOR_LABELS[entry.dataKey] || entry.name}</span>
            <span style={{ marginLeft: 'auto', paddingLeft: 8 }}>{formatTokens(entry.value)}</span>
          </div>
        );
      })}
    </div>
  );
}

export function TokenStackedBar({ sessions }: { sessions: Session[] | null }) {
  const days = last7Days();
  const byDate = new Map<string, { input: number; output: number; cacheRead: number; cacheCreate: number }>();
  for (const { date } of days) byDate.set(date, { input: 0, output: 0, cacheRead: 0, cacheCreate: 0 });

  for (const s of sessions ?? []) {
    const date = localDateStr(new Date(s.startedAt));
    const bucket = byDate.get(date);
    if (!bucket) continue;
    bucket.input       += s.totals.input;
    bucket.output      += s.totals.output;
    bucket.cacheRead   += s.totals.cacheRead;
    bucket.cacheCreate += s.totals.cacheCreate;
  }

  const data = days.map(({ date, label }) => {
    const b = byDate.get(date)!;
    return { label, ...b };
  });

  const tickFormatter = (v: number) =>
    v >= 1_000_000 ? (v / 1_000_000).toFixed(1) + 'M'
    : v >= 1000    ? (v / 1000).toFixed(0) + 'k'
    : String(v);

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
          Token Breakdown
        </span>
        <span style={{ fontSize: 11, color: theme.color.muted, fontFamily: theme.font.mono }}>
          last 7 days
        </span>
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
            <defs>
              <linearGradient id="inputGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--chart-input)" stopOpacity={1} />
                <stop offset="100%" stopColor="var(--chart-input)" stopOpacity={0.60} />
              </linearGradient>
              <linearGradient id="outputGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--chart-output)" stopOpacity={1} />
                <stop offset="100%" stopColor="var(--chart-output)" stopOpacity={0.60} />
              </linearGradient>
              <linearGradient id="cacheWriteGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--chart-cache-write)" stopOpacity={1} />
                <stop offset="100%" stopColor="var(--chart-cache-write)" stopOpacity={0.60} />
              </linearGradient>
              <linearGradient id="cacheReadGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--chart-cache-read)" stopOpacity={1} />
                <stop offset="100%" stopColor="var(--chart-cache-read)" stopOpacity={0.60} />
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
              tickFormatter={tickFormatter}
              tick={{ fontSize: 10, fill: 'var(--color-muted)', fontFamily: 'Fira Code' }}
              axisLine={false}
              tickLine={false}
              width={36}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--color-surface-hi)', opacity: 0.6 }} />
            <Legend content={<CustomLegend />} />
            <Bar dataKey="cacheRead"   name="Cache Read"  stackId="t" fill="url(#cacheReadGrad)" />
            <Bar dataKey="cacheCreate" name="Cache Write" stackId="t" fill="url(#cacheWriteGrad)" />
            <Bar dataKey="output"      name="Output"      stackId="t" fill="url(#outputGrad)" />
            <Bar dataKey="input"       name="Input"       stackId="t" fill="url(#inputGrad)" radius={[5, 5, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
