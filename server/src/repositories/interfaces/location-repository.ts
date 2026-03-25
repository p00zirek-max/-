import type { Location } from '@kinotabel/shared';

export interface LocationFilters {
  project_id: string;
  date?: string;
  date_from?: string;
  date_to?: string;
}

export interface ILocationRepository {
  findAll(filters: LocationFilters): Promise<Location[]>;
  findById(id: string): Promise<Location | null>;
  create(location: Location): Promise<Location>;
  update(id: string, data: Partial<Location>): Promise<Location>;
}
