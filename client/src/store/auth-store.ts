import { create } from 'zustand';
import type { UserRole } from '@kinotabel/shared';

interface AuthState {
  /** Current user UID (Firebase or personal token) */
  uid: string | null;
  /** Display name */
  displayName: string | null;
  /** Email */
  email: string | null;
  /** User role */
  role: UserRole | null;
  /** Firebase ID token for API calls */
  token: string | null;
  /** Project ID the user is currently viewing */
  projectId: string | null;
  /** Whether auth state has been initialized */
  initialized: boolean;
  /** Employee ID (for personal form access) */
  employeeId: string | null;

  /** Set auth user after login */
  setUser: (user: {
    uid: string;
    displayName: string | null;
    email: string | null;
    role: UserRole;
    token: string;
  }) => void;

  /** Set personal token session (employee access) */
  setEmployeeSession: (session: {
    employeeId: string;
    employeeName: string;
    projectId: string;
    token: string;
  }) => void;

  /** Set current project */
  setProjectId: (projectId: string) => void;

  /** Update token (after refresh) */
  setToken: (token: string) => void;

  /** Mark as initialized */
  setInitialized: () => void;

  /** Logout */
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  uid: null,
  displayName: null,
  email: null,
  role: null,
  token: null,
  projectId: null,
  initialized: false,
  employeeId: null,

  setUser: (user) => {
    localStorage.setItem('kinotabel-auth-token', user.token);
    set({
      uid: user.uid,
      displayName: user.displayName,
      email: user.email,
      role: user.role,
      token: user.token,
    });
  },

  setEmployeeSession: (session) => {
    localStorage.setItem('kinotabel-personal-token', session.token);
    set({
      uid: session.employeeId,
      displayName: session.employeeName,
      email: null,
      role: 'employee',
      token: session.token,
      projectId: session.projectId,
      employeeId: session.employeeId,
    });
  },

  setProjectId: (projectId) => set({ projectId }),

  setToken: (token) => {
    localStorage.setItem('kinotabel-auth-token', token);
    set({ token });
  },

  setInitialized: () => set({ initialized: true }),

  logout: () => {
    localStorage.removeItem('kinotabel-auth-token');
    localStorage.removeItem('kinotabel-personal-token');
    set({
      uid: null,
      displayName: null,
      email: null,
      role: null,
      token: null,
      projectId: null,
      employeeId: null,
    });
  },
}));
