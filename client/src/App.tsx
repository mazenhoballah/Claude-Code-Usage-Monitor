import { useState } from 'react';
import { TopBar } from './components/TopBar';
import type { Tab } from './components/TopBar';
import { SessionDetail } from './components/SessionDetail';
import { DashboardPage } from './pages/DashboardPage';
import { SessionsPage } from './pages/SessionsPage';
import { TipsPage } from './pages/TipsPage';
import { FormulasPage } from './pages/FormulasPage';
import { usePoll } from './hooks/usePoll';
import { api } from './lib/api';

export function App() {
  const stats = usePoll(api.stats, 7000);
  const sessions = usePoll(api.sessions, 15_000);
  const [selected, setSelected] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');

  const scrollable = activeTab === 'tips' || activeTab === 'formulas';

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <TopBar stats={stats.data} activeTab={activeTab} onTabChange={setActiveTab} />
      <div style={{
        flex: 1,
        overflowY: scrollable ? 'auto' : 'hidden',
        overflowX: 'hidden',
        padding: '0 180px 16px',
        boxSizing: 'border-box',
      }}>
        {activeTab === 'dashboard' && <DashboardPage stats={stats.data} sessions={sessions.data} />}
        {activeTab === 'sessions'  && <SessionsPage sessions={sessions.data} onSelect={setSelected} />}
        {activeTab === 'tips'      && <TipsPage />}
        {activeTab === 'formulas'  && <FormulasPage />}
      </div>
      {selected && <SessionDetail id={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
