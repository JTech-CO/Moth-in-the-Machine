import { MAX_HEALTH, MIN_HEALTH } from '@/utils/health';
import { formatHudTime, toDurationIso } from '@/utils/hudMetrics';
import { calculateStars, type StarRating } from '@/utils/starCalculator';
import { isStageId, type StageDefinition, type StageDifficulty } from '@/utils/stages';

export type ResultOutcome = 'cleared' | 'failed';

export interface ResultSnapshotInput {
  readonly stageId: number;
  readonly timeMs: number;
  readonly remainingHealth: number;
  readonly stars: number;
  readonly timestamp: Date;
}

export interface ResultPresentation {
  readonly outcome: ResultOutcome;
  readonly statusLabel: string;
  readonly stageId: number;
  readonly stageCode: string;
  readonly stageName: string;
  readonly targetLabel: string;
  readonly timeMs: number;
  readonly timeLabel: string;
  readonly timeIso: string;
  readonly remainingHealth: number;
  readonly healthLabel: string;
  readonly stars: StarRating;
  readonly starText: string;
  readonly timestamp: string;
  readonly fileName: string;
  readonly shareText: string;
}

const GAME_NAME = 'Moth in the Machine';
const SHARE_HASHTAGS = '#MothInTheMachine #MarkII';
const DIFFICULTY_CODES: Readonly<Record<StageDifficulty, string>> = Object.freeze({
  tutorial: 'T',
  easy: 'E',
  normal: 'N',
  hard: 'H',
});
const DIFFICULTY_FIRST_STAGE_IDS: Readonly<Record<StageDifficulty, number>> = Object.freeze({
  tutorial: 1,
  easy: 2,
  normal: 8,
  hard: 14,
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function assertNonEmptyString(value: unknown, label: string): asserts value is string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new TypeError(`${label} must be a non-empty string.`);
  }
}

function assertResult(result: ResultSnapshotInput): asserts result is ResultSnapshotInput {
  if (!isRecord(result)) {
    throw new TypeError('result must be an object.');
  }

  if (!isStageId(result.stageId)) {
    throw new RangeError('result stage id is invalid.');
  }

  if (!Number.isSafeInteger(result.timeMs) || result.timeMs < 0) {
    throw new RangeError('result time must be a non-negative safe integer.');
  }

  if (
    !Number.isFinite(result.remainingHealth) ||
    result.remainingHealth < MIN_HEALTH ||
    result.remainingHealth > MAX_HEALTH
  ) {
    throw new RangeError('result health must be between 0 and 100.');
  }

  if (!Number.isInteger(result.stars) || result.stars < 0 || result.stars > 3) {
    throw new RangeError('result stars must be an integer between 0 and 3.');
  }

  if (!(result.timestamp instanceof Date) || !Number.isFinite(result.timestamp.getTime())) {
    throw new RangeError('result timestamp must be a valid Date.');
  }
}

function assertStage(stage: StageDefinition): asserts stage is StageDefinition {
  if (!isRecord(stage)) {
    throw new TypeError('stage must be an object.');
  }

  if (!isStageId(stage.id)) {
    throw new RangeError('stage id is invalid.');
  }

  if (!Object.hasOwn(DIFFICULTY_CODES, stage.difficulty)) {
    throw new RangeError('stage difficulty is invalid.');
  }

  const maximumStageNumber = stage.difficulty === 'tutorial' ? 1 : 6;

  if (
    !Number.isSafeInteger(stage.stageNumberWithinDifficulty) ||
    stage.stageNumberWithinDifficulty < 1 ||
    stage.stageNumberWithinDifficulty > maximumStageNumber
  ) {
    throw new RangeError('stage number within difficulty is invalid.');
  }

  const expectedStageId =
    DIFFICULTY_FIRST_STAGE_IDS[stage.difficulty] + stage.stageNumberWithinDifficulty - 1;

  if (stage.id !== expectedStageId) {
    throw new RangeError('stage id does not match its difficulty and stage number.');
  }

  assertNonEmptyString(stage.name, 'stage name');
  assertNonEmptyString(stage.targetLabel, 'target label');
}

function assertOutcome(outcome: ResultOutcome): void {
  if (outcome !== 'cleared' && outcome !== 'failed') {
    throw new RangeError('result outcome must be cleared or failed.');
  }
}

function assertOutcomeStars(
  outcome: ResultOutcome,
  remainingHealth: number,
  stars: number,
): asserts stars is StarRating {
  if (outcome === 'failed') {
    if (stars !== 0) {
      throw new RangeError('failed results must have zero stars.');
    }

    return;
  }

  const expectedStars = calculateStars(remainingHealth);

  if (expectedStars === 0 || stars !== expectedStars) {
    throw new RangeError('cleared result stars must match the remaining health.');
  }
}

function createStageCode(stage: StageDefinition): string {
  const prefix = DIFFICULTY_CODES[stage.difficulty];
  const stageNumber = String(stage.stageNumberWithinDifficulty).padStart(2, '0');

  return `${prefix}-${stageNumber}`;
}

function createFileTimestamp(timestamp: string): string {
  return timestamp.replaceAll(':', '-').replace('.', '-');
}

export function createResultPresentation(
  result: ResultSnapshotInput,
  outcome: ResultOutcome,
  stage: StageDefinition,
): ResultPresentation {
  assertResult(result);
  assertOutcome(outcome);
  assertStage(stage);

  if (result.stageId !== stage.id) {
    throw new RangeError('result stage id must match the stage definition.');
  }

  assertOutcomeStars(outcome, result.remainingHealth, result.stars);

  const statusLabel = outcome === 'cleared' ? 'STAGE CLEARED' : 'FLIGHT FAILED';
  const stageCode = createStageCode(stage);
  const timeLabel = formatHudTime(result.timeMs);
  const timeIso = toDurationIso(result.timeMs);
  const healthLabel = `${Math.ceil(result.remainingHealth)} HP`;
  const starText = `${'★'.repeat(result.stars)}${'☆'.repeat(3 - result.stars)}`;
  const timestamp = result.timestamp.toISOString();
  const fileName = `moth-in-the-machine_${stageCode}_${outcome}_${createFileTimestamp(timestamp)}.png`;
  const shareText = [
    `${GAME_NAME} — ${statusLabel}`,
    `${stageCode} · ${stage.name} · ${stage.targetLabel}`,
    `${starText} · ${timeLabel} · ${healthLabel}`,
    SHARE_HASHTAGS,
  ].join('\n');

  return Object.freeze({
    outcome,
    statusLabel,
    stageId: result.stageId,
    stageCode,
    stageName: stage.name,
    targetLabel: stage.targetLabel,
    timeMs: result.timeMs,
    timeLabel,
    timeIso,
    remainingHealth: result.remainingHealth,
    healthLabel,
    stars: result.stars,
    starText,
    timestamp,
    fileName,
    shareText,
  });
}
