/** Rounding mode for overtime calculation (D-001) */
export const ROUNDING_MODES = {
  HALF_HOUR: 'half_hour',
  HOUR: 'hour',
} as const;

export type RoundingMode = (typeof ROUNDING_MODES)[keyof typeof ROUNDING_MODES];

/** Map from display label to value */
export const ROUNDING_LABELS: Record<string, RoundingMode> = {
  'Полчаса': ROUNDING_MODES.HALF_HOUR,
  'полчаса': ROUNDING_MODES.HALF_HOUR,
  'Час': ROUNDING_MODES.HOUR,
  'час': ROUNDING_MODES.HOUR,
};
