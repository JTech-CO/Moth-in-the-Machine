import type { CorridorEnvironmentId } from '@/utils/corridorLayouts';
import type { StageDifficulty } from '@/utils/stages';

const MENU_CORRIDORS: Readonly<Record<StageDifficulty, CorridorEnvironmentId>> = Object.freeze({
  tutorial: 'relay-bay',
  easy: 'relay-bay',
  normal: 'switching-gallery',
  hard: 'logic-labyrinth',
});

export function getMenuCorridorEnvironment(
  difficulty: StageDifficulty | null,
): CorridorEnvironmentId {
  return difficulty === null ? 'relay-bay' : MENU_CORRIDORS[difficulty];
}
