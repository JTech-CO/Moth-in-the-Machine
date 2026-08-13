import { describe, expect, it } from 'vitest';

import {
  createResultPresentation,
  type ResultOutcome,
  type ResultSnapshotInput,
} from '@/utils/resultPresentation';
import { getStageDefinition, type StageDefinition } from '@/utils/stages';

const timestamp = new Date('1947-09-09T12:34:56.789Z');

function createResult(overrides: Partial<ResultSnapshotInput> = {}): ResultSnapshotInput {
  return {
    stageId: 2,
    timeMs: 1947,
    remainingHealth: 100,
    stars: 3,
    timestamp,
    ...overrides,
  };
}

function alterStage(overrides: Partial<StageDefinition>): StageDefinition {
  return { ...getStageDefinition(2), ...overrides };
}

describe('createResultPresentation', () => {
  it('creates one immutable canonical presentation for a cleared result', () => {
    const presentation = createResultPresentation(createResult(), 'cleared', getStageDefinition(2));

    expect(presentation).toEqual({
      outcome: 'cleared',
      statusLabel: 'STAGE CLEARED',
      stageId: 2,
      stageCode: 'E-01',
      stageName: 'RELAY APPROACH',
      targetLabel: 'RELAY A-16',
      timeMs: 1947,
      timeLabel: '00:01.9',
      timeIso: 'PT1.947S',
      remainingHealth: 100,
      healthLabel: '100 HP',
      stars: 3,
      starText: '★★★',
      timestamp: '1947-09-09T12:34:56.789Z',
      fileName: 'moth-in-the-machine_E-01_cleared_1947-09-09T12-34-56-789Z.png',
      shareText:
        'Moth in the Machine — STAGE CLEARED\n' +
        'E-01 · RELAY APPROACH · RELAY A-16\n' +
        '★★★ · 00:01.9 · 100 HP\n' +
        '#MothInTheMachine #MarkII',
    });
    expect(Object.isFrozen(presentation)).toBe(true);
  });

  it('formats a failed result, fractional health, and empty stars consistently', () => {
    const presentation = createResultPresentation(
      createResult({ timeMs: 0, remainingHealth: 49.25, stars: 0 }),
      'failed',
      getStageDefinition(2),
    );

    expect(presentation).toMatchObject({
      statusLabel: 'FLIGHT FAILED',
      timeLabel: '00:00.0',
      timeIso: 'PT0S',
      healthLabel: '50 HP',
      starText: '☆☆☆',
    });
  });

  it.each([
    [1, 'T-01'],
    [2, 'E-01'],
    [7, 'E-06'],
    [8, 'N-01'],
    [13, 'N-06'],
    [14, 'H-01'],
    [19, 'H-06'],
  ] as const)('derives the canonical stage code for stage %s', (stageId, expectedCode) => {
    const stage = getStageDefinition(stageId);
    const result = createResult({
      stageId,
      remainingHealth: 0,
      stars: 0,
    });

    expect(createResultPresentation(result, 'failed', stage).stageCode).toBe(expectedCode);
  });

  it.each([
    ['stage id', createResult({ stageId: 0 })],
    ['negative time', createResult({ timeMs: -1 })],
    ['fractional time', createResult({ timeMs: 1.5 })],
    ['unsafe time', createResult({ timeMs: Number.MAX_SAFE_INTEGER + 1 })],
    ['negative health', createResult({ remainingHealth: -1 })],
    ['excess health', createResult({ remainingHealth: 101 })],
    ['non-finite health', createResult({ remainingHealth: Number.NaN })],
    ['fractional stars', createResult({ stars: 1.5 })],
    ['excess stars', createResult({ stars: 4 })],
    ['invalid date', createResult({ timestamp: new Date(Number.NaN) })],
  ])('rejects invalid result input: %s', (_label, result) => {
    expect(() => createResultPresentation(result, 'cleared', getStageDefinition(2))).toThrow(
      RangeError,
    );
  });

  it('rejects non-object results and non-Date timestamps', () => {
    expect(() =>
      createResultPresentation(
        null as unknown as ResultSnapshotInput,
        'cleared',
        getStageDefinition(2),
      ),
    ).toThrow(TypeError);
    expect(() =>
      createResultPresentation(
        createResult({ timestamp: '1947-09-09' as unknown as Date }),
        'cleared',
        getStageDefinition(2),
      ),
    ).toThrow(RangeError);
  });

  it('rejects mismatched result and stage ids', () => {
    expect(() =>
      createResultPresentation(createResult({ stageId: 3 }), 'cleared', getStageDefinition(2)),
    ).toThrow(/must match/);
  });

  it.each([
    ['cleared', createResult({ remainingHealth: 100, stars: 0 })],
    ['cleared', createResult({ remainingHealth: 50, stars: 3 })],
    ['cleared', createResult({ remainingHealth: 0, stars: 0 })],
    ['failed', createResult({ remainingHealth: 100, stars: 3 })],
  ] as const)('rejects stars inconsistent with a %s outcome', (outcome, result) => {
    expect(() =>
      createResultPresentation(result, outcome as ResultOutcome, getStageDefinition(2)),
    ).toThrow(/stars/);
  });

  it('rejects an unsupported outcome', () => {
    expect(() =>
      createResultPresentation(createResult(), 'cancelled' as ResultOutcome, getStageDefinition(2)),
    ).toThrow(/outcome/);
  });

  it.each([
    ['invalid id', alterStage({ id: 0 as StageDefinition['id'] })],
    ['invalid difficulty', alterStage({ difficulty: 'expert' as StageDefinition['difficulty'] })],
    ['invalid sequence', alterStage({ stageNumberWithinDifficulty: 7 })],
    ['mismatched sequence', alterStage({ stageNumberWithinDifficulty: 2 })],
    ['empty name', alterStage({ name: '  ' })],
    ['empty target', alterStage({ targetLabel: '' })],
  ])('rejects malformed stage definitions: %s', (_label, stage) => {
    expect(() => createResultPresentation(createResult(), 'cleared', stage)).toThrow();
  });

  it('rejects non-object stage definitions', () => {
    expect(() =>
      createResultPresentation(createResult(), 'cleared', null as unknown as StageDefinition),
    ).toThrow(TypeError);
  });
});
