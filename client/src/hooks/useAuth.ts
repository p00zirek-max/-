import { useEffect } from 'react';
import { useAuthStore } from '../store/auth-store';
import { api } from '../api/client';
import type { AuthVerifyResponse, PersonalLinkResponse } from '@kinotabel/shared';

/**
 * Hook to initialize and manage auth state.
 * Checks existing token on mount, verifies with server.
 */
export function useAuth() {
  const {
    uid,
    role,
    displayName,
    initialized,
    employeeId,
    projectId,
    setUser,
    setEmployeeSession,
    setInitialized,
    logout,
  } = useAuthStore();

  useEffect(() => {
    if (initialized) return;

    const init = async () => {
      // Demo mode: skip API verification, auth-store already has demo values
      if (!import.meta.env.VITE_FIREBASE_PROJECT_ID && !localStorage.getItem('kinotabel-auth-token') && !localStorage.getItem('kinotabel-personal-token')) {
        setInitialized();
        return;
      }

      const authToken = localStorage.getItem('kinotabel-auth-token');
      const personalToken = localStorage.getItem('kinotabel-personal-token');

      if (authToken) {
        try {
          const data = await api.get<AuthVerifyResponse>('/auth/me');
          setUser({
            uid: data.user.uid,
            displayName: data.user.email,
            email: data.user.email,
            role: data.user.role,
            token: authToken,
          });
        } catch {
          localStorage.removeItem('kinotabel-auth-token');
        }
      } else if (personalToken) {
        try {
          const data = await api.post<PersonalLinkResponse>('/auth/verify-token', {
            token: personalToken,
          });
          setEmployeeSession({
            employeeId: data.employee_id,
            employeeName: data.employee_name,
            projectId: data.project_id,
            token: data.session_token,
          });
        } catch {
          localStorage.removeItem('kinotabel-personal-token');
        }
      }

      setInitialized();
    };

    init();
  }, [initialized, setUser, setEmployeeSession, setInitialized]);

  return {
    isAuthenticated: !!uid,
    isEmployee: role === 'employee',
    uid,
    role,
    displayName,
    employeeId,
    projectId,
    initialized,
    logout,
  };
}

/**
 * Hook for personal form token verification.
 * Used on /form/:token route.
 */
export function usePersonalToken(token: string | undefined) {
  const { setEmployeeSession, setInitialized } = useAuthStore();

  useEffect(() => {
    if (!token) return;

    const verify = async () => {
      try {
        const data = await api.post<PersonalLinkResponse>('/auth/verify-token', { token });
        setEmployeeSession({
          employeeId: data.employee_id,
          employeeName: data.employee_name,
          projectId: data.project_id,
          token: data.session_token,
        });
      } catch {
        // Invalid token — will show error state
      }
      setInitialized();
    };

    verify();
  }, [token, setEmployeeSession, setInitialized]);
}
