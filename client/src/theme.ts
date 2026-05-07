export const theme = {
  color: {
    bg:        'var(--color-bg)',
    surface:   'var(--color-surface)',
    surfaceHi: 'var(--color-surface-hi)',
    border:    'var(--color-border)',
    text:      'var(--color-text)',
    muted:     'var(--color-muted)',
    positive:  'var(--color-positive)',
    warning:   'var(--color-warning)',
    danger:    'var(--color-danger)',
    accent:    'var(--color-accent)',
  },
  font: {
    mono:    '"Fira Code", ui-monospace, monospace',
    sans:    '"Fira Sans", system-ui, sans-serif',
    display: '"Syne", "Fira Sans", sans-serif',
  },
  radius: { sm: 6, md: 10, lg: 14 },
  shadow: {
    glow: 'var(--shadow-glow)',
    card: 'var(--shadow-card)',
  },
  transition: '150ms ease-out',
} as const;

export type Theme = typeof theme;
