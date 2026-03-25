import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  CalendarDays,
  Clock,
  Users,
  MapPin,
  FileText,
  UserCircle,
  Download,
  Film,
  ChevronLeft,
} from 'lucide-react';
import { useAuthStore } from '../../store/auth-store';
import { useUiStore } from '../../store/ui-store';
import { ThemeToggle } from './ThemeToggle';
import type { UserRole } from '@kinotabel/shared';
import type { ReactNode } from 'react';

interface NavItem {
  path: string;
  label: string;
  icon: ReactNode;
  roles: readonly UserRole[];
}

const NAV_ITEMS: NavItem[] = [
  {
    path: '/dashboard',
    label: 'Дашборд',
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
    path: '/timing',
    label: 'Хронометраж',
    icon: <Clock className="h-5 w-5" />,
    roles: ['admin', 'ams', 'producer', 'director'],
  },
  {
    path: '/extras',
    label: 'АМС',
    icon: <Users className="h-5 w-5" />,
    roles: ['admin', 'ams', 'producer', 'director', 'accounting'],
  },
  {
    path: '/locations',
    label: 'Локации',
    icon: <MapPin className="h-5 w-5" />,
    roles: ['admin', 'ams', 'producer', 'director'],
  },
  {
    path: '/employees',
    label: 'Сотрудники',
    icon: <UserCircle className="h-5 w-5" />,
    roles: ['admin', 'producer', 'director', 'accounting'],
  },
  {
    path: '/reports/summary',
    label: 'Сводный отчёт',
    icon: <FileText className="h-5 w-5" />,
    roles: ['admin', 'ams', 'producer', 'director', 'accounting'],
  },
  {
    path: '/reports/individual',
    label: 'Индивидуальный',
    icon: <UserCircle className="h-5 w-5" />,
    roles: ['admin', 'producer', 'director', 'accounting'],
  },
  {
    path: '/reports/production',
    label: 'Производственный',
    icon: <Film className="h-5 w-5" />,
    roles: ['admin', 'ams', 'producer', 'director', 'accounting'],
  },
  {
    path: '/export',
    label: 'Экспорт',
    icon: <Download className="h-5 w-5" />,
    roles: ['admin', 'producer', 'director', 'accounting'],
  },
];

export function Sidebar() {
  const role = useAuthStore((s) => s.role);
  const displayName = useAuthStore((s) => s.displayName);
  const logout = useAuthStore((s) => s.logout);
  const { sidebarOpen, toggleSidebar } = useUiStore();
  const location = useLocation();

  const filteredItems = NAV_ITEMS.filter(
    (item) => role && item.roles.includes(role),
  );

  return (
    <aside
      className={[
        'hidden md:flex flex-col h-screen',
        'bg-[var(--color-bg-sidebar)] border-r border-[var(--color-border-default)]',
        'transition-all duration-normal',
        sidebarOpen ? 'w-[var(--sidebar-width)]' : 'w-[var(--sidebar-collapsed-width)]',
      ].join(' ')}
    >
      {/* Logo */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-[var(--color-border-default)]">
        {sidebarOpen && (
          <span className="text-h3 font-bold text-[var(--color-text-primary)] tracking-tight truncate">
            Кинотабель
          </span>
        )}
        <button
          type="button"
          onClick={toggleSidebar}
          className="p-1.5 rounded-[var(--radius-md)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)] transition-colors duration-fast"
          aria-label={sidebarOpen ? 'Свернуть' : 'Развернуть'}
        >
          <ChevronLeft
            className={[
              'h-5 w-5 transition-transform duration-normal',
              sidebarOpen ? '' : 'rotate-180',
            ].join(' ')}
          />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {filteredItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => [
              'flex items-center gap-3 h-10 px-3 rounded-[var(--radius-md)]',
              'transition-all duration-fast group',
              isActive || location.pathname.startsWith(item.path)
                ? 'bg-[var(--color-bg-selected)] text-[var(--color-accent-primary)]'
                : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)]',
            ].join(' ')}
            title={!sidebarOpen ? item.label : undefined}
          >
            <span className="shrink-0">{item.icon}</span>
            {sidebarOpen && (
              <span className="text-body-medium truncate">{item.label}</span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Bottom section */}
      <div className="border-t border-[var(--color-border-default)] p-2 space-y-1">
        {sidebarOpen && (
          <ThemeToggle className="w-full justify-start" />
        )}

        {/* User info */}
        {sidebarOpen && displayName && (
          <div className="px-3 py-2">
            <p className="text-small text-[var(--color-text-secondary)] truncate">
              {displayName}
            </p>
            <button
              type="button"
              onClick={logout}
              className="text-small text-[var(--color-text-muted)] hover:text-[var(--color-error)] transition-colors"
            >
              Выйти
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
