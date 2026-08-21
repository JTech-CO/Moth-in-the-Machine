import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { GameStoreApi, GameStoreState } from '@/store/gameStore';

const useStoreMock = vi.hoisted(() => vi.fn());

vi.mock('zustand', () => ({
  useStore: useStoreMock,
}));

import { useGameStore } from '@/hooks/useGameStore';
import { browserGameStore } from '@/store/browserGameStore';

describe('useGameStore', () => {
  beforeEach(() => {
    useStoreMock.mockReset();
    useStoreMock.mockImplementation(
      (store: GameStoreApi, selector: (state: GameStoreState) => unknown) =>
        selector(store.getState()),
    );
  });

  it('connects selectors to the browser store singleton', () => {
    expect(useGameStore((state) => state.player.health)).toBe(100);
    expect(useStoreMock).toHaveBeenCalledWith(browserGameStore, expect.any(Function));
  });
});
