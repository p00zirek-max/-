import { api } from './client';
import type { Extras, ExtrasInput } from '@kinotabel/shared';

export const extrasApi = {
  getExtras(params?: { project_id?: string; date?: string }): Promise<Extras[]> {
    return api.get<Extras[]>('/extras', params);
  },

  getExtra(id: string): Promise<Extras> {
    return api.get<Extras>(`/extras/${id}`);
  },

  createExtra(input: ExtrasInput): Promise<Extras> {
    return api.post('/extras', input);
  },

  updateExtra(id: string, input: Partial<ExtrasInput>): Promise<Extras> {
    return api.put(`/extras/${id}`, input);
  },

  deleteExtra(id: string): Promise<void> {
    return api.delete(`/extras/${id}`);
  },
};
