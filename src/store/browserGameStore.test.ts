import { afterEach, describe, expect, it, vi } from 'vitest';

import { GAME_SCHEMA_VERSION, GAME_STORAGE_KEY, type GameStorage } from '@/store/persistence';

class MemoryStorage implements GameStorage {
  readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe('browserGameStore', () => {
  it('uses unavailable persistence when no browser window exists', async () => {
    vi.stubGlobal('window', undefined);
    vi.resetModules();

    const { browserGameStore } = await import('@/store/browserGameStore');

    expect(browserGameStore.getState().persistenceStatus).toBe('unavailable');
  });

  it('hydrates from browser LocalStorage', async () => {
    const localStorage = new MemoryStorage();
    localStorage.setItem(
      GAME_STORAGE_KEY,
      JSON.stringify({
        schemaVersion: GAME_SCHEMA_VERSION,
        progress: {
          completedStages: [{ stageId: 1, bestTimeMs: 1947, bestStars: 3 }],
          totalStars: 3,
        },
        settings: {
          showControlHints: false,
        },
      }),
    );
    vi.stubGlobal('window', { localStorage });
    vi.resetModules();

    const { browserGameStore } = await import('@/store/browserGameStore');

    expect(browserGameStore.getState()).toMatchObject({
      persistenceStatus: 'loaded',
      progress: {
        completedStages: [{ stageId: 1, bestTimeMs: 1947, bestStars: 3 }],
        totalStars: 3,
      },
      settings: {
        showControlHints: false,
        renderQuality: 'auto',
      },
    });
  });

  it('survives a blocked LocalStorage getter', async () => {
    const blockedWindow = {};

    Object.defineProperty(blockedWindow, 'localStorage', {
      get: () => {
        throw new Error('blocked');
      },
    });
    vi.stubGlobal('window', blockedWindow);
    vi.resetModules();

    const { browserGameStore } = await import('@/store/browserGameStore');

    expect(browserGameStore.getState().persistenceStatus).toBe('unavailable');
  });
});
