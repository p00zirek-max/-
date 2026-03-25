import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { useAuthStore } from './store/auth-store';

// Admin pages
import { Dashboard } from './pages/admin/Dashboard';
import { ShiftsList } from './pages/admin/ShiftsList';
import { ShiftForm } from './pages/admin/ShiftForm';
import { TimingForm } from './pages/admin/TimingForm';
import { ExtrasForm } from './pages/admin/ExtrasForm';
import { LocationsForm } from './pages/admin/LocationsForm';
import { Employees } from './pages/admin/Employees';
import { ProductionReport } from './pages/admin/ProductionReport';

// Accounting pages
import { SummaryReport } from './pages/accounting/SummaryReport';
import { IndividualReport } from './pages/accounting/IndividualReport';
import { Export } from './pages/accounting/Export';

// Employee pages
import { PersonalShiftForm } from './pages/employee/PersonalShiftForm';

import type { UserRole } from '@kinotabel/shared';

/** Roles allowed to access a route */
interface RouteGuardProps {
  children: React.ReactNode;
  allowed: readonly UserRole[];
}

function RouteGuard({ children, allowed }: RouteGuardProps) {
  const role = useAuthStore((s) => s.role);

  if (!role) {
    return <Navigate to="/" replace />;
  }

  if (!allowed.includes(role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

const OPERATIONAL: readonly UserRole[] = ['admin', 'ams'];
const REPORT_VIEWERS: readonly UserRole[] = ['admin', 'producer', 'director', 'accounting'];
const ALL_STAFF: readonly UserRole[] = ['admin', 'producer', 'director', 'ams', 'accounting'];
const MANAGERS: readonly UserRole[] = ['admin', 'producer', 'director'];
const WITH_EMPLOYEES: readonly UserRole[] = ['admin', 'producer', 'director', 'accounting'];

function DefaultRedirect() {
  const role = useAuthStore((s) => s.role);

  if (role === 'accounting') return <Navigate to="/reports/summary" replace />;
  if (role === 'employee') return <Navigate to="/shifts" replace />;
  return <Navigate to="/dashboard" replace />;
}

export function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        {/* Personal form - no auth, no layout */}
        <Route path="/form/:token" element={<PersonalShiftForm />} />

        {/* Main app with layout */}
        <Route element={<Layout />}>
          <Route index element={<DefaultRedirect />} />

          <Route
            path="/dashboard"
            element={
              <RouteGuard allowed={ALL_STAFF}>
                <Dashboard />
              </RouteGuard>
            }
          />

          <Route
            path="/shifts"
            element={
              <RouteGuard allowed={ALL_STAFF}>
                <ShiftsList />
              </RouteGuard>
            }
          />
          <Route
            path="/shifts/new"
            element={
              <RouteGuard allowed={OPERATIONAL}>
                <ShiftForm />
              </RouteGuard>
            }
          />
          <Route
            path="/shifts/:id"
            element={
              <RouteGuard allowed={OPERATIONAL}>
                <ShiftForm />
              </RouteGuard>
            }
          />

          <Route
            path="/timing"
            element={
              <RouteGuard allowed={[...OPERATIONAL, 'producer', 'director']}>
                <TimingForm />
              </RouteGuard>
            }
          />

          <Route
            path="/extras"
            element={
              <RouteGuard allowed={ALL_STAFF}>
                <ExtrasForm />
              </RouteGuard>
            }
          />

          <Route
            path="/locations"
            element={
              <RouteGuard allowed={[...OPERATIONAL, 'producer', 'director']}>
                <LocationsForm />
              </RouteGuard>
            }
          />

          <Route
            path="/employees"
            element={
              <RouteGuard allowed={WITH_EMPLOYEES}>
                <Employees />
              </RouteGuard>
            }
          />

          <Route
            path="/reports/summary"
            element={
              <RouteGuard allowed={[...REPORT_VIEWERS, 'ams']}>
                <SummaryReport />
              </RouteGuard>
            }
          />
          <Route
            path="/reports/individual"
            element={
              <RouteGuard allowed={REPORT_VIEWERS}>
                <IndividualReport />
              </RouteGuard>
            }
          />
          <Route
            path="/reports/production"
            element={
              <RouteGuard allowed={ALL_STAFF}>
                <ProductionReport />
              </RouteGuard>
            }
          />

          <Route
            path="/export"
            element={
              <RouteGuard allowed={REPORT_VIEWERS}>
                <Export />
              </RouteGuard>
            }
          />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
