import { create } from 'zustand';

type Theme = 'dark' | 'light';

interface FilterState {
  employeeIds: string[];
  positionIds: string[];
  dateFrom: string | null;
  dateTo: string | null;
  months: string[];
}

interface UiState {
  /** Current theme */
  theme: Theme;
  /** Sidebar open (desktop) */
  sidebarOpen: boolean;
  /** Active report/list filters */
  filters: FilterState;

  /** Toggle theme */
  toggleTheme: () => void;
  /** Set specific theme */
  setTheme: (theme: Theme) => void;
  /** Toggle sidebar */
  toggleSidebar: () => void;
  /** Set sidebar state */
  setSidebarOpen: (open: boolean) => void;
  /** Update filters */
  setFilters: (filters: Partial<FilterState>) => void;
  /** Reset all filters */
  resetFilters: () => void;
}

const DEFAULT_FILTERS: FilterState = {
  employeeIds: [],
  positionIds: [],
  dateFrom: null,
  dateTo: null,
  months: [],
};

function getInitialTheme(): Theme {
  const stored = localStorage.getItem('kinotabel-theme');
  if (stored === 'light' || stored === 'dark') return stored;
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('kinotabel-theme', theme);
}

export const useUiStore = create<UiState>((set) => ({
  theme: getInitialTheme(),
  sidebarOpen: true,
  filters: { ...DEFAULT_FILTERS },

  toggleTheme: () =>
    set((state) => {
      const next = state.theme === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      return { theme: next };
    }),

  setTheme: (theme) => {
    applyTheme(theme);
    set({ theme });
  },

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  setFilters: (partial) =>
    set((state) => ({
      filters: { ...state.filters, ...partial },
    })),

  resetFilters: () => set({ filters: { ...DEFAULT_FILTERS } }),
}));
