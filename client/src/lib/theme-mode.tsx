import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

export const STORAGE_KEY = 'cm.themeMode';

type ThemeModeContextValue = {
  mode: ThemeMode;
  resolved: ResolvedTheme;
  setMode: (next: ThemeMode) => void;
  cycle: () => void;
};

const ThemeModeContext = createContext<ThemeModeContextValue | null>(null);

function readStoredMode(): ThemeMode {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === 'light' || raw === 'dark' || raw === 'system') return raw;
  } catch {
    // localStorage unavailable; fall through
  }
  return 'light';
}

function writeStoredMode(mode: ThemeMode): void {
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // localStorage unavailable; ignore
  }
}

function systemPrefersDark(): boolean {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function resolve(mode: ThemeMode): ResolvedTheme {
  if (mode === 'system') return systemPrefersDark() ? 'dark' : 'light';
  return mode;
}

const NEXT: Record<ThemeMode, ThemeMode> = {
  light: 'dark',
  dark: 'system',
  system: 'light',
};

export function ThemeModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(() => readStoredMode());
  const [resolved, setResolved] = useState<ResolvedTheme>(() => resolve(readStoredMode()));

  // Apply resolved theme to <html data-theme=…> whenever it changes.
  useEffect(() => {
    document.documentElement.dataset.theme = resolved;
  }, [resolved]);

  // Re-resolve when mode changes.
  useEffect(() => {
    setResolved(resolve(mode));
  }, [mode]);

  // While in 'system', live-track OS theme changes.
  useEffect(() => {
    if (mode !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => setResolved(mq.matches ? 'dark' : 'light');
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [mode]);

  const setMode = useCallback((next: ThemeMode) => {
    writeStoredMode(next);
    setModeState(next);
  }, []);

  const cycle = useCallback(() => {
    setModeState(prev => {
      const next = NEXT[prev];
      writeStoredMode(next);
      return next;
    });
  }, []);

  const value = useMemo<ThemeModeContextValue>(
    () => ({ mode, resolved, setMode, cycle }),
    [mode, resolved, setMode, cycle],
  );

  return <ThemeModeContext.Provider value={value}>{children}</ThemeModeContext.Provider>;
}

export function useThemeMode(): ThemeModeContextValue {
  const ctx = useContext(ThemeModeContext);
  if (!ctx) throw new Error('useThemeMode must be used within <ThemeModeProvider>');
  return ctx;
}
