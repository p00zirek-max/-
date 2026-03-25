import { api } from './client';
import type { DashboardOverview } from '@kinotabel/shared';

export const dashboardApi = {
  getOverview(params: { project_id: string; date_from?: string; date_to?: string }): Promise<DashboardOverview> {
    return api.get<DashboardOverview>('/dashboard/overview', params);
  },
};
