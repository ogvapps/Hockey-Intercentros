import { useSyncExternalStore } from 'react';

export type Theme = 'light' | 'dark';

// A single module-level store so every toggle in the app shows the same state.
const listeners = new Set<() => void>();

const readInitialTheme = (): Theme => {
  try {
    const saved = localStorage.getItem('theme');
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {}
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

let currentTheme: Theme = readInitialTheme();

const applyTheme = (theme: Theme) => {
  document.documentElement.classList.toggle('dark', theme === 'dark');
  try { localStorage.setItem('theme', theme); } catch {}
};

applyTheme(currentTheme);

export const setTheme = (theme: Theme) => {
  currentTheme = theme;
  applyTheme(theme);
  listeners.forEach(l => l());
};

export const toggleTheme = () => setTheme(currentTheme === 'dark' ? 'light' : 'dark');

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, () => currentTheme);
  return { theme, isDarkMode: theme === 'dark', toggleTheme };
}
