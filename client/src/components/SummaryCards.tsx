import type { ReactNode } from 'react';
import { theme } from '../theme';
import type { Stats } from '../lib/types';
import { formatCost, formatPct, formatTokens } from '../lib/format';

function MetricCard({
  label,
  primary,
  secondary,
}: {
  label: string;
  primary: ReactNode;
  secondary?: ReactNode;
}) {
  return (
    <div
      style={{
        background: theme.color.surface,
        border: `1px solid ${theme.color.border}`,
        borderLeft: `3px solid ${theme.color.accent}`,
        borderRadius: `0 ${theme.radius.md}px ${theme.radius.md}px 0`,
        padding: '16px 20px',
        boxShadow: theme.shadow.card,
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
        transition: `border-color ${theme.transition}, box-shadow ${theme.transition}`,
        cursor: 'default',
      }}
    >
      <div
        style={{
          fontFamily: theme.font.sans,
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: 1,
          textTransform: 'uppercase',
          color: theme.color.muted,
          marginBottom: 12,
        }}
      >
        {label}
      </div>
      <div
        className="mono"
        style={{
          fontSize: 32,
          fontWeight: 600,
          lineHeight: 1,
          color: theme.color.text,
          letterSpacing: -0.5,
        }}
      >
        {primary}
      </div>
      {secondary && (
        <div
          style={{
            marginTop: 8,
            fontSize: 12,
            color: theme.color.muted,
            lineHeight: 1.5,
          }}
        >
          {secondary}
        </div>
      )}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div
      style={{
        background: theme.color.surface,
        border: `1px solid ${theme.color.border}`,
        borderLeft: `3px solid ${theme.color.accent}`,
        borderRadius: `0 ${theme.radius.md}px ${theme.radius.md}px 0`,
        padding: '16px 20px',
        boxShadow: theme.shadow.card,
      }}
    >
      <div
        className="shimmer"
        style={{
          height: 11,
          width: '45%',
          background: theme.color.surfaceHi,
          borderRadius: 3,
          marginBottom: 12,
        }}
      />
      <div
        className="shimmer"
        style={{
          height: 32,
          width: '60%',
          background: theme.color.surfaceHi,
          borderRadius: 4,
          marginBottom: 10,
        }}
      />
      <div
        className="shimmer"
        style={{
          height: 12,
          width: '85%',
          background: theme.color.surfaceHi,
          borderRadius: 3,
        }}
      />
    </div>
  );
}

export function SummaryCards({ stats }: { stats: Stats | null }) {
  const grid: React.CSSProperties = {
    display: 'grid',
    gap: 12,
    gridTemplateColumns: 'repeat(5, 1fr)',
  };

  if (!stats) {
    return (
      <div style={grid}>
        {[0, 1, 2, 3, 4].map((i) => <SkeletonCard key={i} />)}
      </div>
    );
  }

  return (
    <div style={grid}>
      <MetricCard
        label="Today"
        primary={formatTokens(stats.totals.today.total)}
        secondary={`${formatCost(stats.cost.today)} est · ${stats.totals.today.turns} turns`}
      />
      <MetricCard
        label="This Week"
        primary={formatTokens(stats.totals.week.total)}
        secondary={`${formatCost(stats.cost.week)} est · ${stats.totals.week.turns} turns`}
      />
      <MetricCard
        label="All Time"
        primary={formatTokens(stats.totals.allTime.total)}
        secondary={`${formatCost(stats.cost.allTime)} est · ${stats.totals.allTime.turns} turns`}
      />
      <MetricCard
        label="Cache Efficiency"
        primary={formatPct(stats.cache.hitRate)}
        secondary={`~${formatCost(stats.cache.estCostSaved)} saved · ${formatTokens(stats.cache.tokensSaved)} tokens`}
      />
      <MetricCard
        label="Last 5 Hours"
        primary={formatTokens(stats.totals.fiveH.total)}
        secondary={`${formatCost(stats.cost.fiveH)} est · ${stats.totals.fiveH.turns} turns`}
      />
    </div>
  );
}
