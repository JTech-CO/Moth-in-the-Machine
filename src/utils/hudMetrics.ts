import type { Vec3 } from '@/utils/collision';
import { MAX_HEALTH, MIN_HEALTH } from '@/utils/health';
import { calculateStars, type StarRating } from '@/utils/starCalculator';

const DEFAULT_MINIMAP_PADDING_PERCENT = 8;
const MAX_MINIMAP_PADDING_PERCENT = 50;
const MIN_DAMAGE_SEVERITY = 0.18;
const MAX_DAMAGE_SEVERITY = 0.82;
const DAMAGE_AT_MAXIMUM_SEVERITY = 40;

export interface MinimapBounds {
  readonly min: {
    readonly x: number;
    readonly z: number;
  };
  readonly max: {
    readonly x: number;
    readonly z: number;
  };
}

export interface MinimapPoint {
  readonly xPercent: number;
  readonly yPercent: number;
}

export interface DamageFeedback {
  readonly amount: number;
  readonly severity: number;
}

function assertHudMilliseconds(milliseconds: number): void {
  if (!Number.isSafeInteger(milliseconds) || milliseconds < 0) {
    throw new RangeError('HUD time must be a non-negative safe integer.');
  }
}

function assertFiniteNumber(value: number, label: string): void {
  if (!Number.isFinite(value)) {
    throw new RangeError(label + ' must be finite.');
  }
}

function assertHealth(health: number, label: string): void {
  assertFiniteNumber(health, label);

  if (health < MIN_HEALTH || health > MAX_HEALTH) {
    throw new RangeError(label + ' must be between 0 and 100.');
  }
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function formatIsoSeconds(seconds: number, milliseconds: number): string {
  if (milliseconds === 0) {
    return String(seconds);
  }

  const fractionalMilliseconds = String(milliseconds).padStart(3, '0').replace(/0+$/, '');
  return `${seconds}.${fractionalMilliseconds}`;
}

export function formatHudTime(milliseconds: number): string {
  assertHudMilliseconds(milliseconds);

  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const tenths = Math.floor((milliseconds % 1000) / 100);

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${tenths}`;
}

export function toDurationIso(milliseconds: number): string {
  assertHudMilliseconds(milliseconds);

  const totalSeconds = Math.floor(milliseconds / 1000);
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const millisecondsWithinSecond = milliseconds % 1000;
  const dayComponent = days > 0 ? `${days}D` : '';
  const hourComponent = hours > 0 ? `${hours}H` : '';
  const minuteComponent = minutes > 0 ? `${minutes}M` : '';
  const secondComponent = formatIsoSeconds(seconds, millisecondsWithinSecond);

  return `P${dayComponent}T${hourComponent}${minuteComponent}${secondComponent}S`;
}

export function projectMinimapPoint(
  point: Vec3,
  bounds: MinimapBounds,
  paddingPercent = DEFAULT_MINIMAP_PADDING_PERCENT,
): MinimapPoint {
  assertFiniteNumber(point.x, 'minimap point.x');
  assertFiniteNumber(point.y, 'minimap point.y');
  assertFiniteNumber(point.z, 'minimap point.z');
  assertFiniteNumber(bounds.min.x, 'minimap bounds.min.x');
  assertFiniteNumber(bounds.min.z, 'minimap bounds.min.z');
  assertFiniteNumber(bounds.max.x, 'minimap bounds.max.x');
  assertFiniteNumber(bounds.max.z, 'minimap bounds.max.z');
  assertFiniteNumber(paddingPercent, 'minimap padding percent');

  if (bounds.min.x >= bounds.max.x || bounds.min.z >= bounds.max.z) {
    throw new RangeError('minimap bounds minimums must be less than maximums.');
  }

  if (paddingPercent < 0 || paddingPercent >= MAX_MINIMAP_PADDING_PERCENT) {
    throw new RangeError('minimap padding percent must be between 0 and 50.');
  }

  const clampedX = clamp(point.x, bounds.min.x, bounds.max.x);
  const clampedZ = clamp(point.z, bounds.min.z, bounds.max.z);
  const drawablePercent = 100 - paddingPercent * 2;
  const normalizedX = (clampedX - bounds.min.x) / (bounds.max.x - bounds.min.x);
  const normalizedZFromStart = (bounds.max.z - clampedZ) / (bounds.max.z - bounds.min.z);

  return {
    xPercent: paddingPercent + normalizedX * drawablePercent,
    yPercent: paddingPercent + normalizedZFromStart * drawablePercent,
  };
}

export function getDamageFeedback(
  previousHealth: number,
  currentHealth: number,
): DamageFeedback | null {
  assertHealth(previousHealth, 'previous health');
  assertHealth(currentHealth, 'current health');

  if (currentHealth >= previousHealth) {
    return null;
  }

  const amount = previousHealth - currentHealth;
  const normalizedDamage = Math.min(amount / DAMAGE_AT_MAXIMUM_SEVERITY, 1);

  return {
    amount,
    severity: MIN_DAMAGE_SEVERITY + normalizedDamage * (MAX_DAMAGE_SEVERITY - MIN_DAMAGE_SEVERITY),
  };
}

export function resolveHudStars(health: number, finalStars?: StarRating | null): StarRating {
  if (finalStars !== undefined && finalStars !== null) {
    if (!Number.isInteger(finalStars) || finalStars < 0 || finalStars > 3) {
      throw new RangeError('final stars must be an integer between 0 and 3.');
    }

    return finalStars;
  }

  return calculateStars(health);
}
