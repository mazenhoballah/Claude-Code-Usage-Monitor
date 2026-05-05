import { TodaySessions } from '../components/TodaySessions';
import { SessionList } from '../components/SessionList';
import type { Session } from '../lib/types';

export function SessionsPage({ sessions, onSelect }: { sessions: Session[] | null; onSelect: (id: string) => void }) {
  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      boxSizing: 'border-box',
    }}>
      {/* Today's sessions – shrinks to content, table caps at 240px with internal scroll */}
      <div style={{ flexShrink: 0 }}>
        <TodaySessions sessions={sessions} onSelect={onSelect} />
      </div>

      {/* All sessions – fills remaining height, table scrolls internally */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <SessionList sessions={sessions} onSelect={onSelect} />
      </div>
    </div>
  );
}
