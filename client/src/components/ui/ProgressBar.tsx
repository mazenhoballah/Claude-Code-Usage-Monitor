import { theme } from '../../theme';

export function ProgressBar({ value, label }: { value: number; label?: string }) {
  const pct = Math.max(0, Math.min(1, value));
  const color = pct < 0.5 ? theme.color.positive : pct < 0.8 ? theme.color.warning : theme.color.danger;
  return (
    <div role="progressbar" aria-valuenow={Math.round(pct * 100)} aria-valuemin={0} aria-valuemax={100} aria-label={label ?? 'progress'}>
      <div style={{
        height: 8, background: theme.color.surfaceHi, borderRadius: 4, overflow: 'hidden',
      }}>
        <div style={{
          width: `${pct * 100}%`, height: '100%', background: color,
          transition: `width ${theme.transition}, background ${theme.transition}`,
        }} />
      </div>
    </div>
  );
}
