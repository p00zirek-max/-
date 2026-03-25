import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { BottomBar } from './BottomBar';
import { useUiStore } from '../../store/ui-store';
import { useAuth } from '../../hooks/useAuth';
import { PageSpinner } from '../ui/Spinner';

export function Layout() {
  const { initialized } = useAuth();
  const sidebarOpen = useUiStore((s) => s.sidebarOpen);

  if (!initialized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <PageSpinner />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar (desktop) */}
      <Sidebar />

      {/* Main content area */}
      <main
        className={[
          'flex-1 min-w-0',
          'pb-[var(--bottombar-height)] md:pb-0',
          'transition-all duration-normal',
        ].join(' ')}
      >
        <div className="max-w-[var(--content-max-width)] mx-auto px-4 py-6 lg:px-6">
          <Outlet />
        </div>
      </main>

      {/* Bottom bar (mobile) */}
      <BottomBar />
    </div>
  );
}
