import { createGameStore } from '@/store/gameStore';
import type { GameStorage } from '@/store/persistence';

function resolveBrowserStorage(): GameStorage | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export const browserGameStore = createGameStore({
  storage: resolveBrowserStorage(),
});
