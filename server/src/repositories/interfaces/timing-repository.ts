import type { TimingShift, TimingScene, TimingDraft } from '@kinotabel/shared';

export interface TimingShiftFilters {
  project_id: string;
  date?: string;
  shift_number?: number;
}

export interface ITimingRepository {
  // Shifts (shooting days)
  findAllShifts(filters: TimingShiftFilters): Promise<TimingShift[]>;
  findShiftById(id: string): Promise<TimingShift | null>;
  createShift(shift: TimingShift): Promise<TimingShift>;
  updateShift(id: string, data: Partial<TimingShift>): Promise<TimingShift>;

  // Scenes
  findScenesByShiftId(shiftId: string): Promise<TimingScene[]>;
  findSceneById(id: string): Promise<TimingScene | null>;
  createScene(scene: TimingScene): Promise<TimingScene>;
  updateScene(id: string, data: Partial<TimingScene>): Promise<TimingScene>;

  // Draft
  getDraft(projectId: string, type: 'shift' | 'scene'): Promise<TimingDraft | null>;
  saveDraft(draft: TimingDraft): Promise<TimingDraft>;
}
