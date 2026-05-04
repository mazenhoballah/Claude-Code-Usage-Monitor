import type { ReactNode } from 'react';
import { theme } from '../../theme';

type Tone = 'positive' | 'warning' | 'danger' | 'accent' | 'muted';

const tones: Record<Tone, { fg: string; bg: string }> = {
  positive: { fg: theme.color.positive, bg: 'rgba(34,197,94,0.12)' },
  warning:  { fg: theme.color.warning,  bg: 'rgba(245,158,11,0.12)' },
  danger:   { fg: theme.color.danger,   bg: 'rgba(239,68,68,0.12)' },
  accent:   { fg: theme.color.accent,   bg: 'rgba(59,130,246,0.12)' },
  muted:    { fg: theme.color.muted,    bg: 'rgba(148,163,184,0.10)' },
};

export function Badge({ tone = 'muted', children }: { tone?: Tone; children: ReactNode }) {
  const t = tones[tone];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '2px 8px', borderRadius: 999,
      fontSize: 11, fontWeight: 500, letterSpacing: 0.2,
      color: t.fg, background: t.bg,
    }}>
      {children}
    </span>
  );
}
