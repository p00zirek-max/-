/** Timing shift — one shooting day */
export interface TimingShift {
  id: string;
  project_id: string;
  shift_number: number;
  date: string;               // ISO date
  address: string;

  // Shift times: plan/fact
  shift_start_plan: string | null;
  shift_start_fact: string | null;
  shift_end_plan: string | null;
  shift_end_fact: string | null;

  // Lunch times: plan/fact
  lunch_start_plan: string | null;
  lunch_start_fact: string | null;
  lunch_end_plan: string | null;
  lunch_end_fact: string | null;

  // Day duration: plan/fact
  duration_plan: string | null;
  duration_fact: string | null;

  // Scene count: plan/fact
  scenes_plan: number | null;
  scenes_fact: number | null;

  comment: string | null;
}

/** Timing scene — one scene within a shooting day */
export interface TimingScene {
  id: string;
  shift_id: string;
  date: string;
  shift_number: number;
  scene_number: string;

  rehearsal_start: string | null;

  motor_plan: string | null;
  motor_fact: string | null;
  stop_plan: string | null;
  stop_fact: string | null;

  duration_plan: string | null;
  duration_fact: string | null;

  comment: string | null;
}

/** Timing draft — JSON payload for autosave */
export interface TimingDraft {
  id: string;
  project_id: string;
  type: 'shift' | 'scene';
  payload: string;           // JSON string
  updated_at: string;
}
