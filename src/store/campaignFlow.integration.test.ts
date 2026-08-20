import { describe, expect, it, vi } from 'vitest';

import type { GameResult, StageProgress } from '@/store/gameTypes';
import { createGameStore, type GameStoreApi } from '@/store/gameStore';
import { GAME_SCHEMA_VERSION, GAME_STORAGE_KEY, type GameStorage } from '@/store/persistence';
import { getDifficultyUnlockState, type DifficultyUnlockMap } from '@/utils/campaignProgression';
import {
  createResultPresentation,
  type ResultPresentation,
  type ResultOutcome,
} from '@/utils/resultPresentation';
import { copyShareImage, downloadShareImage } from '@/utils/shareActions';
import { STAGE_DEFINITIONS, type StageDefinition } from '@/utils/stages';

class MemoryStorage implements GameStorage {
  readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

const RESULT_CLOCK_EPOCH = Date.parse('1947-09-09T12:00:00.000Z');
const EXPECTED_STAGE_CODES = [
  'T-01',
  'E-01',
  'E-02',
  'E-03',
  'E-04',
  'E-05',
  'E-06',
  'N-01',
  'N-02',
  'N-03',
  'N-04',
  'N-05',
  'N-06',
  'H-01',
  'H-02',
  'H-03',
  'H-04',
  'H-05',
  'H-06',
] as const;
const CLEAR_PROFILES = [
  { damage: 0, remainingHealth: 100, stars: 3 },
  { damage: 50, remainingHealth: 50, stars: 2 },
  { damage: 99, remainingHealth: 1, stars: 1 },
] as const;

interface ClearedStage {
  readonly presentation: ResultPresentation;
  readonly record: StageProgress;
  readonly result: GameResult;
}

function createResultClock(): () => Date {
  let resultIndex = 0;

  return () => new Date(RESULT_CLOCK_EPOCH + resultIndex++ * 60_000);
}

function getUnlocks(store: GameStoreApi): DifficultyUnlockMap {
  return getDifficultyUnlockState(store.getState().progress);
}

function expectUnlockedDifficulties(
  unlocks: DifficultyUnlockMap,
  expected: readonly [boolean, boolean, boolean, boolean],
): void {
  expect([
    unlocks.tutorial.unlocked,
    unlocks.easy.unlocked,
    unlocks.normal.unlocked,
    unlocks.hard.unlocked,
  ]).toEqual(expected);
}

function expectPresentationParity(
  presentation: ResultPresentation,
  result: GameResult,
  outcome: ResultOutcome,
  stage: StageDefinition,
  expectedStageCode: string,
): void {
  const expectedStars = `${'★'.repeat(result.stars)}${'☆'.repeat(3 - result.stars)}`;

  expect(presentation).toMatchObject({
    outcome,
    statusLabel: outcome === 'cleared' ? 'STAGE CLEARED' : 'FLIGHT FAILED',
    stageId: result.stageId,
    stageCode: expectedStageCode,
    stageName: stage.name,
    targetLabel: stage.targetLabel,
    timeMs: result.timeMs,
    remainingHealth: result.remainingHealth,
    healthLabel: `${Math.ceil(result.remainingHealth)} HP`,
    stars: result.stars,
    starText: expectedStars,
    timestamp: result.timestamp.toISOString(),
  });
  expect(presentation.shareText.split('\n')).toEqual([
    `Moth in the Machine — ${presentation.statusLabel}`,
    `${expectedStageCode} · ${stage.name} · ${stage.targetLabel}`,
    `${expectedStars} · ${presentation.timeLabel} · ${Math.ceil(result.remainingHealth)} HP`,
    '#MothInTheMachine #MarkII',
    'https://jtech-co.github.io/Moth-in-the-Machine/',
  ]);
  expect(presentation.fileName).toBe(
    `moth-in-the-machine_${expectedStageCode}_${outcome}_${result.timestamp
      .toISOString()
      .replaceAll(':', '-')
      .replace('.', '-')}.png`,
  );
  expect(Object.isFrozen(presentation)).toBe(true);
}

function clearActiveStage(
  store: GameStoreApi,
  stage: StageDefinition,
  campaignIndex: number,
): ClearedStage {
  const profile = CLEAR_PROFILES[campaignIndex % CLEAR_PROFILES.length];
  const elapsedTimeMs = 30_000 + stage.id * 1_947;
  const stateAtStart = store.getState();

  expect(stateAtStart).toMatchObject({
    currentStageId: stage.id,
    elapsedTimeMs: 0,
    status: 'playing',
    stars: 0,
    result: null,
    player: {
      health: 100,
      position: stage.spawnPosition,
      velocity: { x: 0, y: 0, z: 0 },
      isLanded: false,
    },
  });
  expect(stateAtStart.player.position).not.toBe(stage.spawnPosition);

  store.getState().setElapsedTimeMs(elapsedTimeMs);
  if (profile.damage > 0) {
    expect(store.getState().updateHealth(-profile.damage)).toBe(profile.remainingHealth);
  }

  const result = store.getState().land(true);
  if (result === null) {
    throw new Error(`Stage ${stage.id} did not produce a clear result.`);
  }

  expect(store.getState()).toMatchObject({
    currentStageId: stage.id,
    elapsedTimeMs,
    status: 'cleared',
    stars: profile.stars,
    player: {
      health: profile.remainingHealth,
      isLanded: true,
    },
  });
  expect(store.getState().result).toBe(result);
  expect(result).toMatchObject({
    stageId: stage.id,
    timeMs: elapsedTimeMs,
    remainingHealth: profile.remainingHealth,
    stars: profile.stars,
  });

  const presentation = createResultPresentation(result, 'cleared', stage);
  expectPresentationParity(
    presentation,
    result,
    'cleared',
    stage,
    EXPECTED_STAGE_CODES[campaignIndex],
  );

  return {
    presentation,
    result,
    record: {
      stageId: stage.id,
      bestTimeMs: elapsedTimeMs,
      bestStars: profile.stars,
    },
  };
}

describe('M9 full campaign domain/store integration', () => {
  it('fails, retries, unlocks, clears, returns, and restores the complete 19-stage campaign', async () => {
    const storage = new MemoryStorage();
    const now = createResultClock();
    let store = createGameStore({ storage, now });

    expect(store.getState().persistenceStatus).toBe('empty');
    expectUnlockedDifficulties(getUnlocks(store), [true, false, false, false]);

    const tutorial = STAGE_DEFINITIONS[0];
    store.getState().startStage(tutorial.id);
    store.getState().setPlayerSnapshot({ x: 1.25, y: -0.75, z: -3.5 }, { x: 0.5, y: -0.25, z: -1 });
    store.getState().setElapsedTimeMs(7_777);
    expect(store.getState().updateHealth(-100)).toBe(0);

    const failedResult = store.getState().result;
    if (failedResult === null) {
      throw new Error('Fatal tutorial damage did not produce a failure result.');
    }

    expect(store.getState()).toMatchObject({
      currentStageId: tutorial.id,
      stageRunId: 1,
      elapsedTimeMs: 7_777,
      status: 'failed',
      stars: 0,
      player: { health: 0, isLanded: false },
      progress: { completedStages: [], totalStars: 0 },
    });
    expect(failedResult).toEqual({
      stageId: tutorial.id,
      timeMs: 7_777,
      remainingHealth: 0,
      stars: 0,
      timestamp: new Date(RESULT_CLOCK_EPOCH),
    });
    expectPresentationParity(
      createResultPresentation(failedResult, 'failed', tutorial),
      failedResult,
      'failed',
      tutorial,
      'T-01',
    );
    expect(storage.getItem(GAME_STORAGE_KEY)).toBeNull();
    expectUnlockedDifficulties(getUnlocks(store), [true, false, false, false]);

    store.getState().startStage(tutorial.id);
    expect(store.getState()).toMatchObject({
      currentStageId: tutorial.id,
      stageRunId: 2,
      elapsedTimeMs: 0,
      status: 'playing',
      stars: 0,
      result: null,
      player: {
        health: 100,
        position: tutorial.spawnPosition,
        velocity: { x: 0, y: 0, z: 0 },
        isLanded: false,
      },
    });

    const expectedRecords: StageProgress[] = [];
    let finalPresentation: ResultPresentation | null = null;

    for (const [campaignIndex, stage] of STAGE_DEFINITIONS.entries()) {
      expect(getUnlocks(store)[stage.difficulty].unlocked).toBe(true);

      if (stage.id !== tutorial.id) {
        store.getState().startStage(stage.id);
      }

      const cleared = clearActiveStage(store, stage, campaignIndex);
      expectedRecords.push(cleared.record);
      finalPresentation = cleared.presentation;

      expect(store.getState().progress).toEqual({
        completedStages: expectedRecords,
        totalStars: expectedRecords.reduce((total, record) => total + record.bestStars, 0),
      });
      expect(store.getState().saveProgress()).toBe('saved');

      const persisted = JSON.parse(storage.getItem(GAME_STORAGE_KEY) ?? 'null') as unknown;
      expect(persisted).toEqual({
        schemaVersion: GAME_SCHEMA_VERSION,
        progress: store.getState().progress,
        settings: { showControlHints: true, renderQuality: 'auto' },
      });

      store.getState().returnToMenu();
      expect(store.getState()).toMatchObject({
        currentStageId: null,
        elapsedTimeMs: 0,
        status: 'idle',
        stars: 0,
        result: null,
        progress: {
          completedStages: expectedRecords,
        },
      });

      store = createGameStore({ storage, now });
      expect(store.getState()).toMatchObject({
        currentStageId: null,
        stageRunId: 0,
        elapsedTimeMs: 0,
        status: 'idle',
        stars: 0,
        result: null,
        persistenceStatus: 'loaded',
        progress: {
          completedStages: expectedRecords,
        },
      });

      if (stage.id === 1) {
        expectUnlockedDifficulties(getUnlocks(store), [true, true, false, false]);
        expect(getUnlocks(store).easy).toMatchObject({
          prerequisiteCompleted: 1,
          prerequisiteRequired: 1,
          prerequisiteRemaining: 0,
        });
      }

      if (stage.id === 3) {
        expect(getUnlocks(store).normal).toMatchObject({
          unlocked: false,
          prerequisiteCompleted: 2,
          prerequisiteRequired: 3,
          prerequisiteRemaining: 1,
        });
      }

      if (stage.id === 4) {
        expect(getUnlocks(store).normal).toMatchObject({
          unlocked: true,
          prerequisiteCompleted: 3,
          prerequisiteRequired: 3,
          prerequisiteRemaining: 0,
        });
      }

      if (stage.id === 9) {
        expect(getUnlocks(store).hard).toMatchObject({
          unlocked: false,
          prerequisiteCompleted: 2,
          prerequisiteRequired: 3,
          prerequisiteRemaining: 1,
        });
      }

      if (stage.id === 10) {
        expect(getUnlocks(store).hard).toMatchObject({
          unlocked: true,
          prerequisiteCompleted: 3,
          prerequisiteRequired: 3,
          prerequisiteRemaining: 0,
        });
      }
    }

    expect(finalPresentation).not.toBeNull();
    if (finalPresentation === null) {
      throw new Error('The campaign did not produce a final presentation.');
    }

    expect(store.getState().progress).toEqual({
      completedStages: expectedRecords,
      totalStars: 39,
    });
    expect(expectedRecords.map((record) => record.stageId)).toEqual(
      Array.from({ length: 19 }, (_, index) => index + 1),
    );
    expectUnlockedDifficulties(getUnlocks(store), [true, true, true, true]);
    expect(getUnlocks(store).normal.prerequisiteCompleted).toBe(6);
    expect(getUnlocks(store).hard.prerequisiteCompleted).toBe(6);
    expect(finalPresentation).toMatchObject({
      stageId: 19,
      stageCode: 'H-06',
      outcome: 'cleared',
      stars: 3,
      timestamp: new Date(RESULT_CLOCK_EPOCH + 19 * 60_000).toISOString(),
    });

    const png = new Blob(['m9-final-result'], { type: 'image/png' });
    const createClipboardItem = vi.fn((data: Record<string, Blob>) => data);
    const writeImage = vi.fn(async () => {
      throw new Error('image clipboard blocked');
    });
    const writeText = vi.fn(async () => undefined);

    await expect(
      copyShareImage(png, finalPresentation, {
        clipboard: { write: writeImage, writeText },
        createClipboardItem,
      }),
    ).resolves.toBe('text');
    expect(createClipboardItem).toHaveBeenCalledWith({ 'image/png': png });
    expect(writeText).toHaveBeenCalledWith(finalPresentation.shareText);

    const anchor = {
      href: '',
      download: '',
      rel: '',
      click: vi.fn(),
      remove: vi.fn(),
    };
    const appendAnchor = vi.fn();
    const createObjectUrl = vi.fn(() => 'blob:m9-final-result');
    const revokeObjectUrl = vi.fn();
    const schedule = vi.fn((callback: () => void) => {
      callback();
      return 1;
    });

    downloadShareImage(png, finalPresentation, {
      createAnchor: () => anchor,
      appendAnchor,
      createObjectUrl,
      revokeObjectUrl,
      schedule,
      revokeDelayMs: 0,
    });

    expect(anchor).toMatchObject({
      href: 'blob:m9-final-result',
      download: finalPresentation.fileName,
      rel: 'noopener',
    });
    expect(createObjectUrl).toHaveBeenCalledWith(png);
    expect(appendAnchor).toHaveBeenCalledWith(anchor);
    expect(anchor.click).toHaveBeenCalledOnce();
    expect(anchor.remove).toHaveBeenCalledOnce();
    expect(schedule).toHaveBeenCalledWith(expect.any(Function), 0);
    expect(revokeObjectUrl).toHaveBeenCalledWith('blob:m9-final-result');
  });
});
