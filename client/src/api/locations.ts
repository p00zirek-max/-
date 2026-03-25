import { api } from './client';
import type { Location, LocationInput } from '@kinotabel/shared';

export const locationsApi = {
  getLocations(params?: { project_id?: string; date?: string }): Promise<Location[]> {
    return api.get<Location[]>('/locations', params);
  },

  getLocation(id: string): Promise<Location> {
    return api.get<Location>(`/locations/${id}`);
  },

  createLocation(input: LocationInput): Promise<Location> {
    return api.post('/locations', input);
  },

  updateLocation(id: string, input: Partial<LocationInput>): Promise<Location> {
    return api.put(`/locations/${id}`, input);
  },

  deleteLocation(id: string): Promise<void> {
    return api.delete(`/locations/${id}`);
  },
};
