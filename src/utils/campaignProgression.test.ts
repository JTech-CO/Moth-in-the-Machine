import { describe, expect, it } from 'vitest';

import {
  CAMPAIGN_DIFFICULTIES,
  CAMPAIGN_STAGE_IDS,
  getDifficultyUnlockState,
  getDifficultyUnlocks,
  getStageIdsForDifficulty,
  isDifficultyUnlocked,
  normalizeCompletedStageIds,
} from './campaignProgression';

describe('campaign progression', () => {
  it('keeps only the tutorial unlocked for new players', () => {
    const unlocks = getDifficultyUnlocks([]);

    expect(unlocks.tutorial).toMatchObject({
      unlocked: true,
      prerequisiteCompleted: 0,
      prerequisiteRequired: 0,
      prerequisiteRemaining: 0,
    });
    expect(unlocks.easy.unlocked).toBe(false);
    expect(unlocks.normal.unlocked).toBe(false);
    expect(unlocks.hard.unlocked).toBe(false);
  });

  it('unlocks easy only after tutorial stage 1 is complete', () => {
    expect(isDifficultyUnlocked('easy', [2, 3, 4, 8, 9, 10])).toBe(false);
    expect(isDifficultyUnlocked('easy', [1])).toBe(true);
  });

  it('unlocks normal after three distinct easy stages', () => {
    expect(getDifficultyUnlocks([1, 2, 3]).normal).toMatchObject({
      unlocked: false,
      prerequisiteCompleted: 2,
      prerequisiteRemaining: 1,
    });

    expect(getDifficultyUnlocks([2, 4, 7]).normal).toMatchObject({
      unlocked: true,
      prerequisiteCompleted: 3,
      prerequisiteRemaining: 0,
    });
  });

  it('unlocks hard after three distinct normal stages', () => {
    expect(isDifficultyUnlocked('hard', [8, 12])).toBe(false);
    expect(isDifficultyUnlocked('hard', [8, 10, 13])).toBe(true);
  });

  it('does not count duplicates toward an unlock requirement', () => {
    const unlocks = getDifficultyUnlocks([2, 2, 2, 4, 4]);

    expect(unlocks.normal).toMatchObject({
      unlocked: false,
      prerequisiteCompleted: 2,
      prerequisiteRequired: 3,
      prerequisiteRemaining: 1,
    });
  });

  it('ignores malformed, fractional, and out-of-campaign values', () => {
    const malformed: readonly unknown[] = [
      null,
      undefined,
      '1',
      Number.NaN,
      Number.POSITIVE_INFINITY,
      0,
      -1,
      1.5,
      20,
      {},
      1,
    ];

    expect([...normalizeCompletedStageIds(malformed)]).toEqual([1]);
    expect(getDifficultyUnlocks(malformed).easy.unlocked).toBe(true);
    expect(getDifficultyUnlocks(malformed).normal.unlocked).toBe(false);
  });

  it('does not mutate the supplied progress array', () => {
    const completed = Object.freeze([13, 2, 1, 8]);
    const snapshot = [...completed];

    getDifficultyUnlocks(completed);

    expect(completed).toEqual(snapshot);
  });

  it('derives unlocks directly from persisted stage progress', () => {
    const unlocks = getDifficultyUnlockState({
      completedStages: [
        { stageId: 2, bestTimeMs: 1_000, bestStars: 1 },
        { stageId: 4, bestTimeMs: 1_100, bestStars: 2 },
        { stageId: 7, bestTimeMs: 1_200, bestStars: 3 },
      ],
    });

    expect(unlocks.normal.unlocked).toBe(true);
    expect(unlocks.hard.unlocked).toBe(false);
  });

  it('exposes the ordered campaign difficulties and their stage groups', () => {
    expect(CAMPAIGN_DIFFICULTIES).toEqual(['tutorial', 'easy', 'normal', 'hard']);
    expect(CAMPAIGN_STAGE_IDS).toEqual({
      tutorial: [1],
      easy: [2, 3, 4, 5, 6, 7],
      normal: [8, 9, 10, 11, 12, 13],
      hard: [14, 15, 16, 17, 18, 19],
    });
    expect(getStageIdsForDifficulty('hard')).toBe(CAMPAIGN_STAGE_IDS.hard);
  });
});
