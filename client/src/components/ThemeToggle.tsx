import { Moon, Monitor, Sun } from 'lucide-react';
import { useState } from 'react';
import { useThemeMode } from '../lib/theme-mode';
import type { ThemeMode } from '../lib/theme-mode';
import { theme } from '../theme';

const NEXT_MODE: Record<ThemeMode, ThemeMode> = {
  light: 'dark',
  dark: 'system',
  system: 'light',
};

export function ThemeToggle() {
  const { mode, resolved, cycle } = useThemeMode();
  const [hover, setHover] = useState(false);

  const Icon = mode === 'light' ? Sun : mode === 'dark' ? Moon : Monitor;
  const label =
    mode === 'system'
      ? `Theme: system (resolved: ${resolved}). Switch to ${NEXT_MODE[mode]}.`
      : `Theme: ${mode}. Switch to ${NEXT_MODE[mode]}.`;

  return (
    <button
      type="button"
      onClick={cycle}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      aria-label={label}
      title={label}
      style={{
        width: 28,
        height: 28,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: theme.radius.sm,
        background: hover ? theme.color.surfaceHi : 'transparent',
        color: theme.color.text,
        transition: theme.transition,
      }}
    >
      <Icon size={16} />
    </button>
  );
}
