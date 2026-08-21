export const MIN_HEALTH = 0;
export const MAX_HEALTH = 100;

const HEALTH_INTEGER_SNAP_EPSILON = 1e-9;

function assertFiniteNumber(value: number, label: string): void {
  if (!Number.isFinite(value)) {
    throw new RangeError(label + ' must be finite.');
  }
}

function assertCurrentHealth(health: number): void {
  assertFiniteNumber(health, 'health');

  if (health < MIN_HEALTH || health > MAX_HEALTH) {
    throw new RangeError('health must be between 0 and 100.');
  }
}

function assertNonNegative(value: number, label: string): void {
  assertFiniteNumber(value, label);

  if (value < 0) {
    throw new RangeError(label + ' must be non-negative.');
  }
}

function normalizeHealthNoise(health: number): number {
  const nearestInteger = Math.round(health);

  return Math.abs(health - nearestInteger) <= HEALTH_INTEGER_SNAP_EPSILON ? nearestInteger : health;
}

export function clampHealth(health: number): number {
  assertFiniteNumber(health, 'health');

  const clampedHealth = Math.min(MAX_HEALTH, Math.max(MIN_HEALTH, health));
  const normalizedHealth = normalizeHealthNoise(clampedHealth);

  return normalizedHealth === MIN_HEALTH ? MIN_HEALTH : normalizedHealth;
}

export function applyHealthDelta(currentHealth: number, delta: number): number {
  assertCurrentHealth(currentHealth);
  assertFiniteNumber(delta, 'health delta');

  return clampHealth(currentHealth + delta);
}

export function applyDamage(currentHealth: number, damage: number): number {
  assertCurrentHealth(currentHealth);
  assertNonNegative(damage, 'damage');

  return applyHealthDelta(currentHealth, -damage);
}

export function applyDamageRate(
  currentHealth: number,
  damagePerSecond: number,
  deltaSeconds: number,
): number {
  assertCurrentHealth(currentHealth);
  assertNonNegative(damagePerSecond, 'damage per second');
  assertNonNegative(deltaSeconds, 'delta seconds');

  const damage = damagePerSecond * deltaSeconds;
  assertFiniteNumber(damage, 'calculated damage');

  return applyDamage(currentHealth, damage);
}

export function isHealthDepleted(health: number): boolean {
  assertCurrentHealth(health);
  return health === MIN_HEALTH;
}
