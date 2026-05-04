import type { CSSProperties, ReactNode } from 'react';
import { theme } from '../../theme';

export function Card({ children, onClick, style }: { children: ReactNode; onClick?: () => void; style?: CSSProperties }) {
  const base: CSSProperties = {
    background: theme.color.surface,
    border: `1px solid ${theme.color.border}`,
    borderRadius: theme.radius.lg,
    padding: 20,
    boxShadow: theme.shadow.card,
    transition: `background ${theme.transition}, border-color ${theme.transition}`,
    cursor: onClick ? 'pointer' : 'default',
    ...style,
  };
  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } } : undefined}
      style={base}
      onMouseEnter={(e) => { if (onClick) e.currentTarget.style.background = theme.color.surfaceHi; }}
      onMouseLeave={(e) => { if (onClick) e.currentTarget.style.background = theme.color.surface; }}
    >
      {children}
    </div>
  );
}
