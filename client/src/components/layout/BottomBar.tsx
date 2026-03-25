import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  CalendarDays,
  FileText,
  Users,
  Download,
} from 'lucide-react';
import { useAuthStore } from '../../store/auth-store';
import type { UserRole } from '@kinotabel/shared';
import type { ReactNode } from 'react';

interface TabItem {
  path: string;
  label: string;
  icon: ReactNode;
  roles: readonly UserRole[];
}

const ADMIN_TABS: TabItem[] = [
  {
    path: '/dashboard',
    label: 'Главная',
    icon: <LayoutDashboard className="h-5 w-5" />,
    roles: ['admin', 'ams', 'producer', 'director'],
  },
  {
    path: '/shifts',
    label: 'Смены',
    icon: <CalendarDays className="h-5 w-5" />,
    roles: ['admin', 'ams', 'producer', 'director', 'accounting'],
  },
  {
    path: '/employees',
    label: 'Люди',
    icon: <Users className="h-5 w-5" />,
    roles: ['admin', 'producer', 'director', 'accounting'],
  },
  {
    path: '/reports/summary',
    label: 'Отчёты',
    icon: <FileText className="h-5 w-5" />,
    roles: ['admin', 'ams', 'producer', 'director', 'accounting'],
  },
  {
    path: '/export',
    label: 'Экспорт',
    icon: <Download className="h-5 w-5" />,
    roles: ['admin', 'producer', 'director', 'accounting'],
  },
];

export function BottomBar() {
  const role = useAuthStore((s) => s.role);

  const tabs = ADMIN_TABS.filter(
    (tab) => role && tab.roles.includes(role),
  ).slice(0, 5);

  if (tabs.length === 0) return null;

  return (
    <nav
      className={[
        'md:hidden fixed bottom-0 left-0 right-0 z-[var(--z-sticky)]',
        'h-[var(--bottombar-height)]',
        'bg-[var(--color-bg-sidebar)] border-t border-[var(--color-border-default)]',
        'flex items-center justify-around px-1',
        'safe-area-inset-bottom',
      ].join(' ')}
    >
      {tabs.map((tab) => (
        <NavLink
          key={tab.path}
          to={tab.path}
          className={({ isActive }) => [
            'flex flex-col items-center justify-center gap-0.5',
            'flex-1 h-full',
            'transition-colors duration-fast',
            isActive
              ? 'text-[var(--color-accent-primary)]'
              : 'text-[var(--color-text-muted)]',
          ].join(' ')}
        >
          {tab.icon}
          <span className="text-xs leading-none">{tab.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
