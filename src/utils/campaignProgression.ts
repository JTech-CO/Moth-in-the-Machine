export const CAMPAIGN_DIFFICULTIES = ['tutorial', 'easy', 'normal', 'hard'] as const;

export type CampaignDifficulty = (typeof CAMPAIGN_DIFFICULTIES)[number];

const TUTORIAL_STAGE_IDS = [1] as const;
const EASY_STAGE_IDS = [2, 3, 4, 5, 6, 7] as const;
const NORMAL_STAGE_IDS = [8, 9, 10, 11, 12, 13] as const;
const HARD_STAGE_IDS = [14, 15, 16, 17, 18, 19] as const;

export const CAMPAIGN_STAGE_IDS = {
  tutorial: TUTORIAL_STAGE_IDS,
  easy: EASY_STAGE_IDS,
  normal: NORMAL_STAGE_IDS,
  hard: HARD_STAGE_IDS,
} satisfies Readonly<Record<CampaignDifficulty, readonly number[]>>;

export const CAMPAIGN_UNLOCK_REQUIREMENTS = {
  tutorial: 0,
  easy: 1,
  normal: 3,
  hard: 3,
} as const satisfies Readonly<Record<CampaignDifficulty, number>>;

export interface DifficultyUnlockState {
  readonly difficulty: CampaignDifficulty;
  readonly unlocked: boolean;
  /** Completed stages in the prerequisite difficulty. */
  readonly prerequisiteCompleted: number;
  readonly prerequisiteRequired: number;
  readonly prerequisiteRemaining: number;
}

export type DifficultyUnlockMap = Readonly<Record<CampaignDifficulty, DifficultyUnlockState>>;

/**
 * Returns the canonical, distinct stage IDs represented by persisted progress.
 * Unknown values are accepted deliberately so malformed storage data cannot
 * accidentally unlock campaign content.
 */
export function normalizeCompletedStageIds(
  completedStageIds: readonly unknown[],
): ReadonlySet<number> {
  const normalized = new Set<number>();

  for (const value of completedStageIds) {
    if (
      typeof value === 'number' &&
      Number.isInteger(value) &&
      value >= TUTORIAL_STAGE_IDS[0] &&
      value <= HARD_STAGE_IDS[HARD_STAGE_IDS.length - 1]
    ) {
      normalized.add(value);
    }
  }

  return normalized;
}

function countCompleted(
  completedStageIds: ReadonlySet<number>,
  stageIds: readonly number[],
): number {
  let count = 0;

  for (const stageId of stageIds) {
    if (completedStageIds.has(stageId)) {
      count += 1;
    }
  }

  return count;
}

function createUnlockState(
  difficulty: CampaignDifficulty,
  prerequisiteCompleted: number,
  prerequisiteRequired: number,
): DifficultyUnlockState {
  return {
    difficulty,
    unlocked: prerequisiteCompleted >= prerequisiteRequired,
    prerequisiteCompleted,
    prerequisiteRequired,
    prerequisiteRemaining: Math.max(0, prerequisiteRequired - prerequisiteCompleted),
  };
}

/**
 * ID-oriented API for pure callers and tests. UI code can use
 * `getDifficultyUnlockState(progress)` directly.
 */
export function getDifficultyUnlocks(completedStageIds: readonly unknown[]): DifficultyUnlockMap {
  const completed = normalizeCompletedStageIds(completedStageIds);
  const tutorialCompleted = countCompleted(completed, TUTORIAL_STAGE_IDS);
  const easyCompleted = countCompleted(completed, EASY_STAGE_IDS);
  const normalCompleted = countCompleted(completed, NORMAL_STAGE_IDS);

  return {
    tutorial: createUnlockState('tutorial', 0, 0),
    easy: createUnlockState('easy', tutorialCompleted, CAMPAIGN_UNLOCK_REQUIREMENTS.easy),
    normal: createUnlockState('normal', easyCompleted, CAMPAIGN_UNLOCK_REQUIREMENTS.normal),
    hard: createUnlockState('hard', normalCompleted, CAMPAIGN_UNLOCK_REQUIREMENTS.hard),
  };
}

/** Derives campaign locks directly from the persisted game progress shape. */
export function getDifficultyUnlockState<Stage extends { readonly stageId: unknown }>(progress: {
  readonly completedStages: readonly Stage[];
}): DifficultyUnlockMap {
  return getDifficultyUnlocks(progress.completedStages.map((stage) => stage.stageId));
}

export function isDifficultyUnlocked(
  difficulty: CampaignDifficulty,
  completedStageIds: readonly unknown[],
): boolean {
  return getDifficultyUnlocks(completedStageIds)[difficulty].unlocked;
}

export function getStageIdsForDifficulty(difficulty: CampaignDifficulty): readonly number[] {
  return CAMPAIGN_STAGE_IDS[difficulty];
}
