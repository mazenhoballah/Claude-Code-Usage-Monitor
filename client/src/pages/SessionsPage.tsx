import { SessionList } from '../components/SessionList';
import type { Session } from '../lib/types';

export function SessionsPage({ sessions, onSelect }: { sessions: Session[] | null; onSelect: (id: string) => void }) {
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
      <SessionList sessions={sessions} onSelect={onSelect} />
    </div>
  );
}
