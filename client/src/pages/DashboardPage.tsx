import { SummaryCards } from '../components/SummaryCards';
import { PrePromptTips } from '../components/PrePromptTips';
import { DailyCostBar } from '../components/charts/DailyCostBar';
import { ModelDonut } from '../components/charts/ModelDonut';
import { TopProjectsBar } from '../components/charts/TopProjectsBar';
import { TokenStackedBar } from '../components/charts/TokenStackedBar';
import type { Stats, Session } from '../lib/types';

export function DashboardPage({ stats, sessions }: { stats: Stats | null; sessions: Session[] | null }) {
  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      boxSizing: 'border-box',
    }}>
      {/* Summary cards */}
      <div style={{ flexShrink: 0 }}>
        <SummaryCards stats={stats} />
      </div>

      {/* Chart row 1: daily cost (wide) + model donut (narrow) */}
      <div style={{
        flex: 1, minHeight: 0,
        display: 'grid', gridTemplateColumns: '1fr 300px', gap: 12,
      }}>
        <DailyCostBar sessions={sessions} />
        <ModelDonut breakdown={stats?.modelBreakdown ?? null} />
      </div>

      {/* Chart row 2: top projects + token breakdown */}
      <div style={{
        flex: 1, minHeight: 0,
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12,
      }}>
        <TopProjectsBar sessions={sessions} />
        <TokenStackedBar sessions={sessions} />
      </div>

      {/* Active session tips */}
      <div style={{ flexShrink: 0 }}>
        <PrePromptTips stats={stats} />
      </div>
    </div>
  );
}
