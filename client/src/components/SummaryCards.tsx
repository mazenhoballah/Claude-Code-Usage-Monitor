import type { ReactNode } from 'react';
import { Card } from './ui/Card';
import { theme } from '../theme';
import type { Stats } from '../lib/types';
import { formatCost, formatPct, formatTokens } from '../lib/format';

function MetricCard({ label, primary, secondary, accent }: { label: string; primary: ReactNode; secondary?: ReactNode; accent?: string }) {
  return (
    <Card>
      <div style={{ color: theme.color.muted, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.6 }}>{label}</div>
      <div className="mono" style={{
        fontSize: 32, fontWeight: 600, marginTop: 8, color: accent ?? theme.color.text,
        textShadow: accent ? `0 0 12px ${accent}66` : 'none',
      }}>
        {primary}
      </div>
      {secondary && <div style={{ marginTop: 4, color: theme.color.muted, fontSize: 13 }}>{secondary}</div>}
    </Card>
  );
}

export function SummaryCards({ stats }: { stats: Stats | null }) {
  const grid: React.CSSProperties = {
    display: 'grid', gap: 16, margin: '0 16px',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  };

  if (!stats) {
    return (
      <div style={grid}>
        {[0,1,2,3].map((i) => (
          <Card key={i}><div style={{ height: 60, background: theme.color.surfaceHi, borderRadius: 8 }} /></Card>
        ))}
      </div>
    );
  }

  return (
    <div style={grid}>
      <MetricCard label="Today" primary={formatTokens(stats.totals.today.total)} secondary={`${formatCost(stats.cost.today)} est · ${stats.totals.today.turns} turns`} />
      <MetricCard label="This Week" primary={formatTokens(stats.totals.week.total)} secondary={`${formatCost(stats.cost.week)} est · ${stats.totals.week.turns} turns`} />
      <MetricCard label="All Time" primary={formatTokens(stats.totals.allTime.total)} secondary={`${formatCost(stats.cost.allTime)} est · ${stats.totals.allTime.turns} turns`} />
      <MetricCard
        label="Cache Savings"
        accent={theme.color.positive}
        primary={formatPct(stats.cache.hitRate)}
        secondary={`${formatTokens(stats.cache.tokensSaved)} tokens · ~${formatCost(stats.cache.estCostSaved)} saved`}
      />
    </div>
  );
}
