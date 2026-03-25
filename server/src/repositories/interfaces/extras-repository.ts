import type { Extras } from '@kinotabel/shared';

export interface ExtrasFilters {
  project_id: string;
  date?: string;
  date_from?: string;
  date_to?: string;
}

export interface IExtrasRepository {
  findAll(filters: ExtrasFilters): Promise<Extras[]>;
  findById(id: string): Promise<Extras | null>;
  create(extras: Extras): Promise<Extras>;
  update(id: string, data: Partial<Extras>): Promise<Extras>;
  delete(id: string): Promise<void>;
}
