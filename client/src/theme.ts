export const theme = {
  color: {
    bg:        '#020617',
    surface:   '#0F172A',
    surfaceHi: '#1E293B',
    border:    '#1E293B',
    text:      '#F8FAFC',
    muted:     '#94A3B8',
    positive:  '#22C55E',
    warning:   '#F59E0B',
    danger:    '#EF4444',
    accent:    '#3B82F6',
  },
  font: {
    mono: '"Fira Code", ui-monospace, monospace',
    sans: '"Fira Sans", system-ui, sans-serif',
  },
  radius: { sm: 6, md: 10, lg: 16 },
  shadow: {
    glow: '0 0 12px rgba(59, 130, 246, 0.25)',
    card: '0 4px 24px rgba(0, 0, 0, 0.4)',
  },
  transition: '150ms ease-out',
} as const;

export type Theme = typeof theme;
