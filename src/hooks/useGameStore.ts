import { useStore } from 'zustand';

import { browserGameStore } from '@/store/browserGameStore';
import type { GameStoreState } from '@/store/gameStore';

export function useGameStore<T>(selector: (state: GameStoreState) => T): T {
  return useStore(browserGameStore, selector);
}
