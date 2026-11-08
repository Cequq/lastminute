import { Moon, Sun, Monitor } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const ORDER = ['light', 'dark', 'system'];
const META = {
  light: { icon: Sun, label: 'Цайвар горим' },
  dark: { icon: Moon, label: 'Бараан горим' },
  system: { icon: Monitor, label: 'Системийн горим' },
};

// Дарах бүрт цайвар → бараан → систем гэж солигдоно
export default function ThemeToggle({ className = '' }) {
  const { mode, setMode } = useTheme();
  const next = ORDER[(ORDER.indexOf(mode) + 1) % ORDER.length];
  const Icon = META[mode].icon;
  return (
    <button onClick={() => setMode(next)} className={`btn-ghost p-2.5 ${className}`}
            aria-label={`${META[mode].label}. ${META[next].label} руу шилжих`} title={META[mode].label}>
      <Icon className="h-5 w-5" />
    </button>
  );
}
