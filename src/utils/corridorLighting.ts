import type { CorridorEnvironmentId } from '@/utils/corridorLayouts';

export type CorridorLightPosition = readonly [x: number, y: number, z: number];

export interface CorridorLightFixture {
  readonly id: string;
  readonly position: CorridorLightPosition;
  readonly color: string;
  readonly intensity: number;
  readonly distance: number;
  readonly decay: number;
  readonly castsShadow: false;
}

export interface CorridorFillLight {
  readonly skyColor: string;
  readonly groundColor: string;
  readonly intensity: number;
}

export interface CorridorLightingDefinition {
  readonly fill: CorridorFillLight | null;
  readonly fixtures: readonly CorridorLightFixture[];
}

const fixture = (
  id: string,
  position: CorridorLightPosition,
  color: string,
  intensity: number,
  distance: number,
): CorridorLightFixture =>
  Object.freeze({
    id,
    position: Object.freeze(position),
    color,
    intensity,
    distance,
    decay: 2,
    castsShadow: false,
  });

const fill = (skyColor: string, groundColor: string, intensity: number): CorridorFillLight =>
  Object.freeze({ skyColor, groundColor, intensity });

export const CORRIDOR_LIGHTING: Readonly<
  Record<CorridorEnvironmentId, CorridorLightingDefinition>
> = Object.freeze({
  'relay-bay': Object.freeze({
    fill: null,
    fixtures: Object.freeze([]),
  }),
  'switching-gallery': Object.freeze({
    fill: fill('#b58a56', '#10171a', 0.5),
    fixtures: Object.freeze([
      fixture('gallery-guide-a', [-2.65, 2.34, 0], '#f0b74f', 5.2, 10),
      fixture('gallery-guide-b', [2.65, 2.34, -8], '#f0b74f', 5.2, 10),
      fixture('gallery-guide-c', [-2.65, 2.34, -16], '#f0b74f', 5.2, 10),
      fixture('gallery-guide-d', [2.65, 2.34, -24], '#f0b74f', 5.2, 10),
    ]),
  }),
  'logic-labyrinth': Object.freeze({
    fill: fill('#885844', '#080d11', 0.46),
    fixtures: Object.freeze([
      fixture('labyrinth-guide-a', [-2.7, 2.3, 0], '#e3a846', 5.4, 8.5),
      fixture('labyrinth-guide-b', [2.7, 2.3, -6], '#c84b32', 5, 8.5),
      fixture('labyrinth-guide-c', [-2.7, 2.3, -12], '#e3a846', 5.4, 8.5),
      fixture('labyrinth-guide-d', [2.7, 2.3, -18], '#c84b32', 5, 8.5),
      fixture('labyrinth-guide-e', [-2.7, 2.3, -24], '#e3a846', 5.4, 8.5),
    ]),
  }),
});

export function getCorridorLighting(
  environment: CorridorEnvironmentId,
): CorridorLightingDefinition {
  return CORRIDOR_LIGHTING[environment];
}
