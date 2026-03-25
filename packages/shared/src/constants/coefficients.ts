/** Shift coefficient — fixed list (D-025) */
export const SHIFT_COEFFICIENTS = {
  FULL: 1.0,      // полная смена
  HALF: 0.5,      // половина
  DOUBLE: 2.0,    // двойная
} as const;

export type ShiftCoefficient = (typeof SHIFT_COEFFICIENTS)[keyof typeof SHIFT_COEFFICIENTS];

/** Map from display label to numeric value */
export const COEFFICIENT_LABELS: Record<string, ShiftCoefficient> = {
  'полная смена': SHIFT_COEFFICIENTS.FULL,
  'половина': SHIFT_COEFFICIENTS.HALF,
  'двойная': SHIFT_COEFFICIENTS.DOUBLE,
};

/** Reverse map: numeric value to label */
export const COEFFICIENT_DISPLAY: Record<ShiftCoefficient, string> = {
  [SHIFT_COEFFICIENTS.FULL]: 'Полная смена',
  [SHIFT_COEFFICIENTS.HALF]: 'Половина',
  [SHIFT_COEFFICIENTS.DOUBLE]: 'Двойная',
};
