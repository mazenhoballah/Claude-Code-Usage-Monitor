import { useState } from 'react';
import { TopBar } from './components/TopBar';
import { SummaryCards } from './components/SummaryCards';
import { PrePromptTips } from './components/PrePromptTips';
import { ContextPanel } from './components/ContextPanel';
import { SessionList } from './components/SessionList';
import { SessionDetail } from './components/SessionDetail';
import { usePoll } from './hooks/usePoll';
import { api } from './lib/api';

export function App() {
  const stats = usePoll(api.stats, 7000);
  const context = usePoll(api.context, 30_000);
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <TopBar stats={stats.data} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 24, maxWidth: 1280, width: '100%', margin: '0 auto' }}>
        <SummaryCards stats={stats.data} />
        <div style={{ margin: '0 16px' }}>
          <PrePromptTips stats={stats.data} />
        </div>
        <div style={{
          display: 'grid', gap: 16, margin: '0 16px',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        }}>
          <ContextPanel data={context.data} />
          <SessionList onSelect={setSelected} />
        </div>
      </div>
      {selected && <SessionDetail id={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
