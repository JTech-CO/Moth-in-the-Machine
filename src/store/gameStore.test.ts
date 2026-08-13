import { describe, expect, it } from 'vitest';

import { createDefaultPlayerState } from '@/store/gameTypes';
import { createGameStore } from '@/store/gameStore';
import { GAME_SCHEMA_VERSION, GAME_STORAGE_KEY, type GameStorage } from '@/store/persistence';
import { getStageDefinition } from '@/utils/stages';

class MemoryStorage implements GameStorage {
  readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

const fixedTimestamp = new Date('1947-09-09T12:00:00.000Z');
const fixedClock = () => fixedTimestamp;

describe('createGameStore', () => {
  it('creates isolated stores with safe transient and durable defaults', () => {
    const firstStore = createGameStore();
    const secondStore = createGameStore();

    expect(firstStore.getState()).toMatchObject({
      player: {
        health: 100,
        position: { x: 0, y: 0, z: 0 },
        velocity: { x: 0, y: 0, z: 0 },
        isLanded: false,
      },
      currentStageId: null,
      stageRunId: 0,
      elapsedTimeMs: 0,
      status: 'idle',
      stars: 0,
      result: null,
      progress: {
        completedStages: [],
        totalStars: 0,
      },
      settings: {
        showControlHints: true,
      },
      persistenceStatus: 'unavailable',
    });

    firstStore.getState().updateSettings({ showControlHints: false });
    expect(secondStore.getState().settings.showControlHints).toBe(true);
    expect(firstStore.getState().player.position).not.toBe(firstStore.getState().player.velocity);
  });

  it('starts a stage and resets all transient session state', () => {
    const store = createGameStore({ now: fixedClock });

    store.getState().startStage(1);
    store.getState().setElapsedTimeMs(4000);
    store.getState().updateHealth(-75);
    store.getState().land(true);
    store.getState().startStage(2);

    expect(store.getState()).toMatchObject({
      player: {
        health: 100,
        position: getStageDefinition(2).spawnPosition,
        velocity: { x: 0, y: 0, z: 0 },
        isLanded: false,
      },
      currentStageId: 2,
      stageRunId: 2,
      elapsedTimeMs: 0,
      status: 'playing',
      stars: 0,
      result: null,
    });
  });
  it('pauses and resumes only an active run while preserving transient state', () => {
    const store = createGameStore();

    store.getState().startStage(2);
    store.getState().setPlayerSnapshot({ x: 1, y: -0.5, z: -4 }, { x: 0.5, y: -0.25, z: -1 });
    store.getState().setElapsedTimeMs(4321);
    store.getState().updateHealth(-25);

    const beforePause = store.getState();
    store.getState().pauseStage();
    const paused = store.getState();

    expect(paused).toMatchObject({
      currentStageId: 2,
      stageRunId: 1,
      elapsedTimeMs: 4321,
      status: 'paused',
      stars: 0,
      result: null,
    });
    expect(paused.player).toBe(beforePause.player);
    expect(paused.progress).toBe(beforePause.progress);
    expect(paused.settings).toBe(beforePause.settings);

    store.getState().pauseStage();
    expect(store.getState()).toBe(paused);

    store.getState().resumeStage();
    const resumed = store.getState();

    expect(resumed).toMatchObject({
      currentStageId: 2,
      stageRunId: 1,
      elapsedTimeMs: 4321,
      status: 'playing',
      stars: 0,
      result: null,
    });
    expect(resumed.player).toBe(paused.player);
    expect(resumed.progress).toBe(paused.progress);
    expect(resumed.settings).toBe(paused.settings);

    store.getState().resumeStage();
    expect(store.getState()).toBe(resumed);
  });

  it('keeps pause and resume identity-safe outside their guarded transitions', () => {
    const store = createGameStore({ now: fixedClock });
    const idle = store.getState();

    store.getState().pauseStage();
    store.getState().resumeStage();
    expect(store.getState()).toBe(idle);

    store.getState().startStage(1);
    store.getState().land(true);
    const cleared = store.getState();

    store.getState().pauseStage();
    store.getState().resumeStage();
    expect(store.getState()).toBe(cleared);
  });

  it('ignores late player, timer, health, and landing mutations while paused', () => {
    const store = createGameStore();

    store.getState().startStage(1);
    store.getState().setElapsedTimeMs(1947);
    store.getState().updateHealth(-20);
    store.getState().pauseStage();
    const paused = store.getState();

    store.getState().setPlayerSnapshot({ x: 3, y: 2, z: 1 }, { x: -3, y: -2, z: -1 });
    store.getState().setElapsedTimeMs(9999);
    expect(store.getState().updateHealth(-60)).toBe(80);
    expect(store.getState().land(true)).toBeNull();

    expect(store.getState()).toBe(paused);
  });

  it('fully resets a paused run when restarting or returning to the menu', () => {
    const store = createGameStore();

    store.getState().startStage(1);
    store.getState().setElapsedTimeMs(2500);
    store.getState().updateHealth(-40);
    store.getState().pauseStage();
    store.getState().startStage(2);

    expect(store.getState()).toMatchObject({
      player: createDefaultPlayerState(getStageDefinition(2).spawnPosition),
      currentStageId: 2,
      stageRunId: 2,
      elapsedTimeMs: 0,
      status: 'playing',
      stars: 0,
      result: null,
    });

    store.getState().pauseStage();
    store.getState().returnToMenu();

    expect(store.getState()).toMatchObject({
      player: createDefaultPlayerState(),
      currentStageId: null,
      stageRunId: 2,
      elapsedTimeMs: 0,
      status: 'idle',
      stars: 0,
      result: null,
    });
  });
  it('returns to the campaign menu without discarding durable progress or settings', () => {
    const store = createGameStore({ now: fixedClock });

    store.getState().updateSettings({ showControlHints: false });
    store.getState().startStage(1);
    store.getState().setElapsedTimeMs(2000);
    store.getState().updateHealth(-20);
    store.getState().land(true);

    const completedProgress = store.getState().progress;
    store.getState().returnToMenu();

    expect(store.getState()).toMatchObject({
      player: createDefaultPlayerState(),
      currentStageId: null,
      stageRunId: 1,
      elapsedTimeMs: 0,
      status: 'idle',
      stars: 0,
      result: null,
      settings: { showControlHints: false },
    });
    expect(store.getState().progress).toBe(completedProgress);

    const idleState = store.getState();
    store.getState().returnToMenu();
    expect(store.getState()).toBe(idleState);
  });

  it('clones the canonical stage spawn and increments the run token on retries', () => {
    const store = createGameStore();
    const stage = getStageDefinition(1);

    store.getState().startStage(stage.id);
    expect(store.getState()).toMatchObject({
      currentStageId: stage.id,
      stageRunId: 1,
      player: {
        position: stage.spawnPosition,
        health: 100,
        velocity: { x: 0, y: 0, z: 0 },
        isLanded: false,
      },
    });
    expect(store.getState().player.position).not.toBe(stage.spawnPosition);

    store.getState().updateHealth(-40);
    store.getState().setElapsedTimeMs(1947);
    store.getState().startStage(stage.id);

    expect(store.getState()).toMatchObject({
      currentStageId: stage.id,
      stageRunId: 2,
      elapsedTimeMs: 0,
      status: 'playing',
      player: {
        position: stage.spawnPosition,
        health: 100,
        velocity: { x: 0, y: 0, z: 0 },
        isLanded: false,
      },
    });
  });

  it.each([20, 99])('rejects an unsupported stage id atomically: %s', (stageId) => {
    const store = createGameStore();
    const before = store.getState();

    expect(() => store.getState().startStage(stageId)).toThrow(RangeError);
    expect(store.getState()).toBe(before);
  });

  it.each([0, -1, 1.5, Number.POSITIVE_INFINITY, Number.MAX_SAFE_INTEGER + 1])(
    'rejects an invalid stage id: %s',
    (stageId) => {
      const store = createGameStore();
      const before = store.getState();

      expect(() => store.getState().startStage(stageId)).toThrow(RangeError);
      expect(store.getState()).toBe(before);
    },
  );

  it('stores immutable position and velocity snapshots', () => {
    const store = createGameStore();
    const position = Object.freeze({ x: 1, y: 2, z: 3 });
    const velocity = Object.freeze({ x: -0.1, y: 0.2, z: 0.3 });

    store.getState().startStage(1);
    store.getState().setPlayerSnapshot(position, velocity);

    expect(store.getState().player.position).toEqual(position);
    expect(store.getState().player.velocity).toEqual(velocity);
    expect(store.getState().player.position).not.toBe(position);
    expect(store.getState().player.velocity).not.toBe(velocity);
  });

  it.each([
    [
      { x: Number.NaN, y: 0, z: 0 },
      { x: 0, y: 0, z: 0 },
    ],
    [
      { x: 0, y: 0, z: 0 },
      { x: 0, y: Number.POSITIVE_INFINITY, z: 0 },
    ],
  ] as const)('rejects non-finite player snapshots %#', (position, velocity) => {
    const store = createGameStore();
    const before = store.getState();

    expect(() => store.getState().setPlayerSnapshot(position, velocity)).toThrow(RangeError);
    expect(store.getState()).toBe(before);
  });

  it('sets an integer elapsed time and rejects invalid values', () => {
    const store = createGameStore();

    store.getState().startStage(1);
    store.getState().setElapsedTimeMs(1234);
    expect(store.getState().elapsedTimeMs).toBe(1234);

    const before = store.getState();

    for (const invalidTime of [
      -1,
      1.5,
      Number.NaN,
      Number.POSITIVE_INFINITY,
      Number.MAX_SAFE_INTEGER + 1,
    ]) {
      expect(() => store.getState().setElapsedTimeMs(invalidTime)).toThrow(RangeError);
      expect(store.getState()).toBe(before);
    }
  });

  it('updates, clamps, and depletes health through the M2 domain function', () => {
    const store = createGameStore();

    store.getState().startStage(1);
    expect(store.getState().updateHealth(-35)).toBe(65);
    expect(store.getState().player.health).toBe(65);

    expect(store.getState().updateHealth(100)).toBe(100);
    expect(store.getState().player.health).toBe(100);

    expect(store.getState().updateHealth(-500)).toBe(0);
    expect(store.getState()).toMatchObject({
      player: {
        health: 0,
        isLanded: false,
      },
      status: 'failed',
      stars: 0,
      result: null,
    });
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    'rejects an invalid health delta without changing state: %s',
    (delta) => {
      const store = createGameStore();
      const before = store.getState();

      expect(() => store.getState().updateHealth(delta)).toThrow(RangeError);
      expect(store.getState()).toBe(before);
    },
  );

  it.each([
    { damage: 0, health: 100, expectedStars: 3 },
    { damage: 50, health: 50, expectedStars: 2 },
    { damage: 99, health: 1, expectedStars: 1 },
  ])(
    'lands successfully with $expectedStars stars at $health HP',
    ({ damage, health, expectedStars }) => {
      const store = createGameStore({ now: fixedClock });

      store.getState().startStage(2);
      store.getState().setElapsedTimeMs(2500);
      store.getState().updateHealth(-damage);
      const result = store.getState().land(true);

      expect(result).toEqual({
        stageId: 2,
        timeMs: 2500,
        remainingHealth: health,
        stars: expectedStars,
        timestamp: fixedTimestamp,
      });
      expect(result?.timestamp).not.toBe(fixedTimestamp);
      expect(store.getState()).toMatchObject({
        player: {
          health,
          isLanded: true,
        },
        status: 'cleared',
        stars: expectedStars,
        progress: {
          completedStages: [
            {
              stageId: 2,
              bestTimeMs: 2500,
              bestStars: expectedStars,
            },
          ],
          totalStars: expectedStars,
        },
      });
    },
  );

  it('records failure without changing completed progress', () => {
    const store = createGameStore({ now: fixedClock });

    store.getState().startStage(1);
    store.getState().setElapsedTimeMs(900);
    const result = store.getState().land(false);

    expect(result).toEqual({
      stageId: 1,
      timeMs: 900,
      remainingHealth: 100,
      stars: 0,
      timestamp: fixedTimestamp,
    });
    expect(store.getState()).toMatchObject({
      player: { isLanded: false },
      status: 'failed',
      stars: 0,
      progress: {
        completedStages: [],
        totalStars: 0,
      },
    });
  });

  it('cannot turn depleted health or a missing stage into a successful landing', () => {
    const depletedStore = createGameStore({ now: fixedClock });

    depletedStore.getState().startStage(1);
    depletedStore.getState().updateHealth(-100);
    const depletedState = depletedStore.getState();
    expect(depletedStore.getState().land(true)).toBeNull();
    expect(depletedStore.getState()).toBe(depletedState);
    expect(depletedStore.getState().progress.completedStages).toEqual([]);

    const idleStore = createGameStore({ now: fixedClock });
    const idleState = idleStore.getState();
    idleStore.getState().setPlayerSnapshot({ x: 1, y: 2, z: 3 }, { x: 1, y: 1, z: 1 });
    idleStore.getState().setElapsedTimeMs(1234);
    idleStore.getState().updateHealth(-50);
    expect(idleStore.getState().land(true)).toBeNull();
    expect(idleStore.getState()).toBe(idleState);
  });

  it('fails safely when a playing session has no stage id', () => {
    const store = createGameStore({ now: fixedClock });

    store.setState({ status: 'playing', currentStageId: null });

    expect(store.getState().land(true)).toBeNull();
    expect(store.getState()).toMatchObject({
      status: 'failed',
      stars: 0,
      result: null,
      progress: { completedStages: [], totalStars: 0 },
    });
  });

  it('rejects non-boolean landing input at runtime', () => {
    const store = createGameStore();
    const before = store.getState();

    expect(() => store.getState().land('yes' as unknown as boolean)).toThrow(TypeError);
    expect(store.getState()).toBe(before);
  });

  it('keeps terminal landing results idempotent', () => {
    const store = createGameStore({ now: fixedClock });

    store.getState().startStage(1);
    const firstResult = store.getState().land(true);
    const terminalState = store.getState();
    const secondResult = store.getState().land(false);

    expect(secondResult).toBe(firstResult);
    expect(store.getState()).toBe(terminalState);
  });

  it('freezes every transient mutation after a stage is cleared', () => {
    const store = createGameStore({ now: fixedClock });

    store.getState().startStage(1);
    store.getState().setElapsedTimeMs(1000);
    const result = store.getState().land(true);
    const terminalState = store.getState();

    store.getState().updateHealth(-100);
    store.getState().setElapsedTimeMs(2000);
    store.getState().setPlayerSnapshot({ x: 9, y: 9, z: 9 }, { x: 1, y: 1, z: 1 });

    expect(store.getState().land(false)).toBe(result);
    expect(store.getState()).toBe(terminalState);
  });

  it('cannot revive a depleted failure before a new stage starts', () => {
    const store = createGameStore({ now: fixedClock });

    store.getState().startStage(1);
    store.getState().updateHealth(-100);
    const terminalState = store.getState();

    store.getState().updateHealth(100);
    store.getState().setElapsedTimeMs(2000);
    store.getState().setPlayerSnapshot({ x: 9, y: 9, z: 9 }, { x: 1, y: 1, z: 1 });

    expect(store.getState().land(true)).toBeNull();
    expect(store.getState()).toBe(terminalState);

    store.getState().startStage(2);
    expect(store.getState()).toMatchObject({
      currentStageId: 2,
      status: 'playing',
      player: { health: 100 },
    });
  });

  it('fully resets position, health, velocity, and timer after a failed run', () => {
    const store = createGameStore();
    const spawn = getStageDefinition(3).spawnPosition;

    store.getState().startStage(3);
    store.getState().setPlayerSnapshot({ x: -2.15, y: -1.15, z: -17.8 }, { x: 1, y: -1, z: 0.5 });
    store.getState().setElapsedTimeMs(1947);
    expect(store.getState().updateHealth(-100)).toBe(0);

    store.getState().startStage(3);

    expect(store.getState()).toMatchObject({
      currentStageId: 3,
      stageRunId: 2,
      elapsedTimeMs: 0,
      status: 'playing',
      stars: 0,
      result: null,
      player: {
        health: 100,
        position: spawn,
        velocity: { x: 0, y: 0, z: 0 },
        isLanded: false,
      },
    });
  });

  it('merges fastest time and highest stars independently per stage', () => {
    const store = createGameStore({ now: fixedClock });

    store.getState().startStage(2);
    store.getState().setElapsedTimeMs(2000);
    store.getState().land(true);

    store.getState().startStage(2);
    store.getState().setElapsedTimeMs(1000);
    store.getState().updateHealth(-99);
    store.getState().land(true);

    store.getState().startStage(1);
    store.getState().setElapsedTimeMs(1500);
    store.getState().updateHealth(-50);
    store.getState().land(true);

    expect(store.getState().progress).toEqual({
      completedStages: [
        { stageId: 1, bestTimeMs: 1500, bestStars: 2 },
        { stageId: 2, bestTimeMs: 1000, bestStars: 3 },
      ],
      totalStars: 5,
    });
  });

  it('saves durable state and restores it into a fresh store only', () => {
    const storage = new MemoryStorage();
    const firstStore = createGameStore({ storage, now: fixedClock });

    firstStore.getState().startStage(3);
    firstStore.getState().setPlayerSnapshot({ x: 1, y: 2, z: 3 }, { x: 0.1, y: 0.2, z: 0.3 });
    firstStore.getState().setElapsedTimeMs(5000);
    firstStore.getState().updateHealth(-50);
    firstStore.getState().land(true);
    firstStore.getState().updateSettings({ showControlHints: false });

    expect(firstStore.getState().saveProgress()).toBe('saved');

    const persisted = JSON.parse(storage.getItem(GAME_STORAGE_KEY)!);
    expect(persisted).toEqual({
      schemaVersion: GAME_SCHEMA_VERSION,
      progress: {
        completedStages: [{ stageId: 3, bestTimeMs: 5000, bestStars: 2 }],
        totalStars: 2,
      },
      settings: {
        showControlHints: false,
      },
    });
    expect(persisted).not.toHaveProperty('player');
    expect(persisted).not.toHaveProperty('result');
    expect(persisted).not.toHaveProperty('elapsedTimeMs');

    const reloadedStore = createGameStore({ storage, now: fixedClock });

    expect(reloadedStore.getState()).toMatchObject({
      player: {
        health: 100,
        position: { x: 0, y: 0, z: 0 },
        velocity: { x: 0, y: 0, z: 0 },
        isLanded: false,
      },
      currentStageId: null,
      stageRunId: 0,
      elapsedTimeMs: 0,
      status: 'idle',
      stars: 0,
      result: null,
      progress: {
        completedStages: [{ stageId: 3, bestTimeMs: 5000, bestStars: 2 }],
        totalStars: 2,
      },
      settings: {
        showControlHints: false,
      },
      persistenceStatus: 'loaded',
    });
  });

  it('falls back from malformed JSON and repairs it on the next save', () => {
    const storage = new MemoryStorage();
    storage.setItem(GAME_STORAGE_KEY, '{broken');

    const store = createGameStore({ storage });

    expect(store.getState()).toMatchObject({
      persistenceStatus: 'invalid',
      progress: { completedStages: [], totalStars: 0 },
      settings: { showControlHints: true },
    });
    expect(store.getState().saveProgress()).toBe('saved');
    expect(() => JSON.parse(storage.getItem(GAME_STORAGE_KEY)!)).not.toThrow();
  });

  it('preserves unknown future-version data by refusing to overwrite it', () => {
    const storage = new MemoryStorage();
    const futurePayload = JSON.stringify({
      schemaVersion: GAME_SCHEMA_VERSION + 1,
      progress: {
        completedStages: [],
        totalStars: 0,
      },
      settings: {
        showControlHints: false,
      },
    });
    storage.setItem(GAME_STORAGE_KEY, futurePayload);

    const store = createGameStore({ storage });

    expect(store.getState().persistenceStatus).toBe('future-version');
    expect(store.getState().saveProgress()).toBe('read-only');
    expect(storage.getItem(GAME_STORAGE_KEY)).toBe(futurePayload);
  });

  it('rechecks the live payload before saving over a future schema version', () => {
    const storage = new MemoryStorage();
    const store = createGameStore({ storage });
    const futurePayload = JSON.stringify({
      schemaVersion: GAME_SCHEMA_VERSION + 1,
      progress: { completedStages: [], totalStars: 0 },
      settings: { showControlHints: false },
    });

    storage.setItem(GAME_STORAGE_KEY, futurePayload);

    expect(store.getState().persistenceStatus).toBe('empty');
    expect(store.getState().saveProgress()).toBe('read-only');
    expect(storage.getItem(GAME_STORAGE_KEY)).toBe(futurePayload);
  });

  it('reports storage write failures without rolling back in-memory progress', () => {
    const storage: GameStorage = {
      getItem: () => null,
      setItem: () => {
        throw new Error('quota exceeded');
      },
    };
    const store = createGameStore({ storage, now: fixedClock });

    store.getState().startStage(1);
    store.getState().land(true);

    const progressBeforeSave = store.getState().progress;
    expect(store.getState().saveProgress()).toBe('failed');
    expect(store.getState().progress).toBe(progressBeforeSave);
  });

  it('updates settings and rejects malformed patches', () => {
    const store = createGameStore();

    store.getState().updateSettings({ showControlHints: false });
    expect(store.getState().settings.showControlHints).toBe(false);

    const unchangedState = store.getState();
    store.getState().updateSettings({});
    expect(store.getState()).toBe(unchangedState);

    for (const patch of [null, [], { showControlHints: 'no' }] as unknown as Array<
      Partial<{ showControlHints: boolean }>
    >) {
      expect(() => store.getState().updateSettings(patch)).toThrow(TypeError);
      expect(store.getState()).toBe(unchangedState);
    }
  });

  it('uses the default clock when no clock dependency is supplied', () => {
    const store = createGameStore();

    store.getState().startStage(1);
    const result = store.getState().land(true);

    expect(result?.timestamp).toBeInstanceOf(Date);
    expect(Number.isFinite(result?.timestamp.getTime())).toBe(true);
  });

  it('keeps failed landing results idempotent', () => {
    const store = createGameStore({ now: fixedClock });

    store.getState().startStage(1);
    const firstResult = store.getState().land(false);
    const terminalState = store.getState();
    const secondResult = store.getState().land(true);

    expect(secondResult).toBe(firstResult);
    expect(store.getState()).toBe(terminalState);
  });

  it('rejects an invalid clock before committing a result', () => {
    const store = createGameStore({ now: () => new Date(Number.NaN) });

    store.getState().startStage(1);
    const before = store.getState();

    expect(() => store.getState().land(true)).toThrow(RangeError);
    expect(store.getState()).toBe(before);
  });
});
