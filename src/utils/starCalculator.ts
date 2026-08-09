import { MAX_HEALTH, MIN_HEALTH } from '@/utils/health';

export type StarRating = 0 | 1 | 2 | 3;

export function calculateStars(remainingHealth: number): StarRating {
  if (!Number.isFinite(remainingHealth)) {
    throw new RangeError('remaining health must be finite.');
  }

  if (remainingHealth < MIN_HEALTH || remainingHealth > MAX_HEALTH) {
    throw new RangeError('remaining health must be between 0 and 100.');
  }

  if (remainingHealth === MAX_HEALTH) {
    return 3;
  }

  if (remainingHealth >= 50) {
    return 2;
  }

  if (remainingHealth > MIN_HEALTH) {
    return 1;
  }

  return 0;
}
