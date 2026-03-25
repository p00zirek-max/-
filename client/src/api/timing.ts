import { api } from './client';
import type { TimingShift, TimingScene, TimingDraft } from '@kinotabel/shared';

export const timingApi = {
  getShifts(params?: { project_id?: string }): Promise<TimingShift[]> {
    return api.get<TimingShift[]>('/timing/shifts', params);
  },

  createShift(data: Omit<TimingShift, 'id'>): Promise<TimingShift> {
    return api.post('/timing/shifts', data);
  },

  updateShift(id: string, data: Partial<TimingShift>): Promise<TimingShift> {
    return api.put(`/timing/shifts/${id}`, data);
  },

  getScenes(params?: { shift_id?: string }): Promise<TimingScene[]> {
    return api.get<TimingScene[]>('/timing/scenes', params);
  },

  createScene(data: Omit<TimingScene, 'id'>): Promise<TimingScene> {
    return api.post('/timing/scenes', data);
  },

  updateScene(id: string, data: Partial<TimingScene>): Promise<TimingScene> {
    return api.put(`/timing/scenes/${id}`, data);
  },

  saveDraft(data: Omit<TimingDraft, 'id' | 'updated_at'>): Promise<TimingDraft> {
    return api.post('/timing/draft', data);
  },

  getDraft(params: { project_id: string; type: 'shift' | 'scene' }): Promise<TimingDraft | null> {
    return api.get<TimingDraft | null>('/timing/draft', params);
  },
};
