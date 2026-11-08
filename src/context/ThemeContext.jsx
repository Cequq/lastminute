import { createContext, useContext, useEffect, useState } from 'react';

// Горим: 'light' | 'dark' | 'system'. Сонголтыг хөтөчид хадгална (хадгалах боломжгүй бол системийнхийг дагана).
const ThemeContext = createContext(null);
const KEY = 'lm.theme';

const readSaved = () => { try { return localStorage.getItem(KEY) || 'system'; } catch { return 'system'; } };
const systemDark = () => window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState(readSaved);
  const [isDark, setIsDark] = useState(() => (readSaved() === 'system' ? systemDark() : readSaved() === 'dark'));

  useEffect(() => {
    const apply = () => {
      const dark = mode === 'system' ? systemDark() : mode === 'dark';
      setIsDark(dark);
      document.documentElement.classList.toggle('dark', dark);
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#08141b' : '#f2f4f5');
    };
    apply();
    try { localStorage.setItem(KEY, mode); } catch { /* хадгалах боломжгүй орчин */ }
    // Системийн горим өөрчлөгдвөл дагана
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (mode !== 'system' || !mq) return undefined;
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [mode]);

  return <ThemeContext.Provider value={{ mode, setMode, isDark }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme нь ThemeProvider дотор ашиглагдана');
  return ctx;
}

// Recharts зэрэг SVG-д ашиглах өнгө
export function useChartColors() {
  const { isDark } = useTheme();
  return isDark
    ? { grid: '#1e3644', axis: '#6b818c', axisStrong: '#a6b7bf', brand: '#3FB8AC', cursor: '#132733', tooltip: { background: '#0e1f29', border: '1px solid #1e3644', borderRadius: 12, fontSize: 12, color: '#e7eef1' } }
    : { grid: '#dfe5e8', axis: '#86969f', axisStrong: '#455761', brand: '#12756E', cursor: '#f2f4f5', tooltip: { background: '#fff', border: '1px solid #dfe5e8', borderRadius: 12, fontSize: 12, color: '#0e1e28' } };
}
