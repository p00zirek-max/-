/**
 * Safe money arithmetic using decimal.js.
 * NEVER use floating point for money calculations.
 */

import Decimal from 'decimal.js';

// Configure decimal.js for financial calculations
Decimal.set({
  precision: 20,
  rounding: Decimal.ROUND_HALF_UP,
});

/** Create a Decimal from any numeric input */
export function toDecimal(value: number | string | Decimal): Decimal {
  return new Decimal(value);
}

/** Multiply two values safely */
export function multiply(a: number | string, b: number | string): Decimal {
  return new Decimal(a).mul(new Decimal(b));
}

/** Add multiple values safely */
export function add(...values: (number | string | Decimal)[]): Decimal {
  return values.reduce<Decimal>(
    (sum, v) => sum.plus(new Decimal(v)),
    new Decimal(0),
  );
}

/** Subtract b from a safely */
export function subtract(a: number | string, b: number | string): Decimal {
  return new Decimal(a).minus(new Decimal(b));
}

/** Divide a by b safely */
export function divide(a: number | string, b: number | string): Decimal {
  return new Decimal(a).div(new Decimal(b));
}

/** Convert Decimal to string with 2 decimal places */
export function toMoneyString(value: Decimal): string {
  return value.toFixed(2);
}

/** Convert Decimal to number (use only for display, never for further calculations) */
export function toNumber(value: Decimal): number {
  return value.toNumber();
}

/** Check if value is zero */
export function isZero(value: number | string | Decimal): boolean {
  return new Decimal(value).isZero();
}

/**
 * Calculate FK multiplier: 1 + (fk_percent / 100)
 * @param fkPercent  FK percentage (e.g. 9 means 9%)
 * @returns Decimal multiplier (e.g. 1.09)
 */
export function fkMultiplier(fkPercent: number): Decimal {
  return new Decimal(1).plus(new Decimal(fkPercent).div(100));
}
