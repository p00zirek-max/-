import { Sun, Moon } from 'lucide-react';
import { useUiStore } from '../../store/ui-store';

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className = '' }: ThemeToggleProps) {
  const { theme, toggleTheme } = useUiStore();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={[
        'inline-flex items-center gap-2 h-10 px-3',
        'rounded-[var(--radius-md)] transition-all duration-fast',
        'text-[var(--color-text-secondary)]',
        'hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)]',
        className,
      ].join(' ')}
      aria-label={theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
    >
      {theme === 'dark' ? (
        <Sun className="h-5 w-5" />
      ) : (
        <Moon className="h-5 w-5" />
      )}
      <span className="text-body">
        {theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
      </span>
    </button>
  );
}
