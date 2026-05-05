import { useState } from 'react';
import { TopBar } from './components/TopBar';
import { SummaryCards } from './components/SummaryCards';
import { PrePromptTips } from './components/PrePromptTips';
import { ContextPanel } from './components/ContextPanel';
import { SessionList } from './components/SessionList';
import { TodaySessions } from './components/TodaySessions';
import { SessionDetail } from './components/SessionDetail';
import { ModelDonut } from './components/charts/ModelDonut';
import { DailyCostBar } from './components/charts/DailyCostBar';
import { TopProjectsBar } from './components/charts/TopProjectsBar';
import { TokenStackedBar } from './components/charts/TokenStackedBar';
import { usePoll } from './hooks/usePoll';
import { api } from './lib/api';

export function App() {
  const stats = usePoll(api.stats, 7000);
  const context = usePoll(api.context, 30_000);
  const sessions = usePoll(api.sessions, 15_000);
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <TopBar stats={stats.data} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 24, maxWidth: 1280, width: '100%', margin: '0 auto' }}>
        <SummaryCards stats={stats.data} />

        {/* Charts row 1: daily cost (wide) + model donut (narrow) */}
        <div style={{ margin: '0 16px', display: 'grid', gridTemplateColumns: '1fr 280px', gap: 16 }}>
          <DailyCostBar sessions={sessions.data} />
          <ModelDonut sessions={sessions.data} />
        </div>

        {/* Charts row 2: top projects + token breakdown */}
        <div style={{ margin: '0 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <TopProjectsBar sessions={sessions.data} />
          <TokenStackedBar sessions={sessions.data} />
        </div>

        <div style={{ margin: '0 16px' }}>
          <PrePromptTips stats={stats.data} />
        </div>
        <div style={{ margin: '0 16px' }}>
          <ContextPanel data={context.data} />
        </div>
        <div style={{ margin: '0 16px' }}>
          <TodaySessions sessions={sessions.data} onSelect={setSelected} />
        </div>
        <div style={{ margin: '0 16px' }}>
          <SessionList sessions={sessions.data} onSelect={setSelected} />
        </div>
      </div>
      {selected && <SessionDetail id={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
