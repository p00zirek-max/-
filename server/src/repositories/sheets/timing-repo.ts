/**
 * Google Sheets implementation of ITimingRepository.
 */

import type { TimingShift, TimingScene, TimingDraft } from '@kinotabel/shared';
import type { ITimingRepository, TimingShiftFilters } from '../interfaces/timing-repository';
import {
  readSheetCached, appendRow, updateRow, findRowByColumnValue, invalidateCache,
} from './sheets-client';
import { config } from '../../config';

function rowToTimingShift(row: string[]): TimingShift {
  return {
    id: row[0] || '',
    project_id: row[1] || '',
    shift_number: Number(row[2]) || 0,
    date: row[3] || '',
    address: row[4] || '',
    shift_start_plan: row[5] || null,
    shift_start_fact: row[6] || null,
    shift_end_plan: row[7] || null,
    shift_end_fact: row[8] || null,
    lunch_start_plan: row[9] || null,
    lunch_start_fact: row[10] || null,
    lunch_end_plan: row[11] || null,
    lunch_end_fact: row[12] || null,
    duration_plan: row[13] || null,
    duration_fact: row[14] || null,
    scenes_plan: row[15] ? Number(row[15]) : null,
    scenes_fact: row[16] ? Number(row[16]) : null,
    comment: row[17] || null,
  };
}

function timingShiftToRow(s: TimingShift): (string | number | boolean | null)[] {
  return [
    s.id, s.project_id, s.shift_number, s.date, s.address,
    s.shift_start_plan, s.shift_start_fact, s.shift_end_plan, s.shift_end_fact,
    s.lunch_start_plan, s.lunch_start_fact, s.lunch_end_plan, s.lunch_end_fact,
    s.duration_plan, s.duration_fact, s.scenes_plan, s.scenes_fact, s.comment,
  ];
}

function rowToTimingScene(row: string[]): TimingScene {
  return {
    id: row[0] || '',
    shift_id: row[1] || '',
    date: row[2] || '',
    shift_number: Number(row[3]) || 0,
    scene_number: row[4] || '',
    rehearsal_start: row[5] || null,
    motor_plan: row[6] || null,
    motor_fact: row[7] || null,
    stop_plan: row[8] || null,
    stop_fact: row[9] || null,
    duration_plan: row[10] || null,
    duration_fact: row[11] || null,
    comment: row[12] || null,
  };
}

function timingSceneToRow(s: TimingScene): (string | number | boolean | null)[] {
  return [
    s.id, s.shift_id, s.date, s.shift_number, s.scene_number,
    s.rehearsal_start, s.motor_plan, s.motor_fact,
    s.stop_plan, s.stop_fact, s.duration_plan, s.duration_fact,
    s.comment,
  ];
}

export class SheetsTimingRepository implements ITimingRepository {
  private readonly shiftSheet = config.sheets.timingShifts;
  private readonly sceneSheet = config.sheets.timingScenes;

  // ─── Shifts ───

  async findAllShifts(filters: TimingShiftFilters): Promise<TimingShift[]> {
    const rows = await readSheetCached(this.shiftSheet);
    let shifts = rows.map(rowToTimingShift);

    shifts = shifts.filter(s => s.project_id === filters.project_id);
    if (filters.date) {
      shifts = shifts.filter(s => s.date === filters.date);
    }
    if (filters.shift_number !== undefined) {
      shifts = shifts.filter(s => s.shift_number === filters.shift_number);
    }
    return shifts;
  }

  async findShiftById(id: string): Promise<TimingShift | null> {
    const rows = await readSheetCached(this.shiftSheet);
    const row = rows.find(r => r[0] === id);
    return row ? rowToTimingShift(row) : null;
  }

  async createShift(shift: TimingShift): Promise<TimingShift> {
    await appendRow(this.shiftSheet, timingShiftToRow(shift));
    invalidateCache(this.shiftSheet);
    return shift;
  }

  async updateShift(id: string, data: Partial<TimingShift>): Promise<TimingShift> {
    const rowNum = await findRowByColumnValue(this.shiftSheet, 0, id);
    if (rowNum === -1) throw new Error(`Timing shift ${id} not found`);

    const existing = await this.findShiftById(id);
    if (!existing) throw new Error(`Timing shift ${id} not found`);

    const updated = { ...existing, ...data, id } as TimingShift;
    await updateRow(this.shiftSheet, rowNum, timingShiftToRow(updated));
    invalidateCache(this.shiftSheet);
    return updated;
  }

  // ─── Scenes ───

  async findScenesByShiftId(shiftId: string): Promise<TimingScene[]> {
    const rows = await readSheetCached(this.sceneSheet);
    return rows.filter(r => r[1] === shiftId).map(rowToTimingScene);
  }

  async findSceneById(id: string): Promise<TimingScene | null> {
    const rows = await readSheetCached(this.sceneSheet);
    const row = rows.find(r => r[0] === id);
    return row ? rowToTimingScene(row) : null;
  }

  async createScene(scene: TimingScene): Promise<TimingScene> {
    await appendRow(this.sceneSheet, timingSceneToRow(scene));
    invalidateCache(this.sceneSheet);
    return scene;
  }

  async updateScene(id: string, data: Partial<TimingScene>): Promise<TimingScene> {
    const rowNum = await findRowByColumnValue(this.sceneSheet, 0, id);
    if (rowNum === -1) throw new Error(`Timing scene ${id} not found`);

    const existing = await this.findSceneById(id);
    if (!existing) throw new Error(`Timing scene ${id} not found`);

    const updated = { ...existing, ...data, id } as TimingScene;
    await updateRow(this.sceneSheet, rowNum, timingSceneToRow(updated));
    invalidateCache(this.sceneSheet);
    return updated;
  }

  // ─── Draft ───

  async getDraft(projectId: string, type: 'shift' | 'scene'): Promise<TimingDraft | null> {
    // Drafts are stored in a simple key-value format on the _settings sheet
    // For simplicity, we store them as rows with project_id + type as key
    const rows = await readSheetCached(config.sheets.settings);
    const row = rows.find(r => r[0] === `draft:${projectId}:${type}`);
    if (!row) return null;
    return {
      id: row[0],
      project_id: projectId,
      type,
      payload: row[1] || '{}',
      updated_at: row[2] || '',
    };
  }

  async saveDraft(draft: TimingDraft): Promise<TimingDraft> {
    const key = `draft:${draft.project_id}:${draft.type}`;
    const rowNum = await findRowByColumnValue(config.sheets.settings, 0, key);

    const values = [key, draft.payload, new Date().toISOString()];

    if (rowNum === -1) {
      await appendRow(config.sheets.settings, values);
    } else {
      await updateRow(config.sheets.settings, rowNum, values);
    }
    invalidateCache(config.sheets.settings);
    return { ...draft, id: key, updated_at: new Date().toISOString() };
  }
}
