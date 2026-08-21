import { intersectsAabb, type Aabb, type Vec3 } from '@/utils/collision';

export type CorridorEnvironmentId = 'relay-bay' | 'switching-gallery' | 'logic-labyrinth';

export type StructuralStyle = 'bulkhead' | 'deck' | 'core';

export interface StructuralBlockDefinition {
  readonly id: string;
  readonly collider: Aabb;
  readonly style: StructuralStyle;
}

export interface CorridorLayoutDefinition {
  readonly id: CorridorEnvironmentId;
  readonly label: string;
  readonly structures: readonly StructuralBlockDefinition[];
}

const point = (x: number, y: number, z: number): Vec3 => Object.freeze({ x, y, z });

const block = (
  id: string,
  style: StructuralStyle,
  minimum: readonly [number, number, number],
  maximum: readonly [number, number, number],
): StructuralBlockDefinition =>
  Object.freeze({
    id,
    style,
    collider: Object.freeze({
      min: point(...minimum),
      max: point(...maximum),
    }),
  });

const RELAY_BAY: CorridorLayoutDefinition = Object.freeze({
  id: 'relay-bay',
  label: 'RELAY BAY',
  structures: Object.freeze([]),
});

const SWITCHING_GALLERY: CorridorLayoutDefinition = Object.freeze({
  id: 'switching-gallery',
  label: 'SWITCHING GALLERY',
  structures: Object.freeze([
    block('normal-gate-left-a', 'bulkhead', [-4.03, -2.21, -4.3], [1.05, 2.71, -3.84]),
    block('normal-gate-right-a', 'bulkhead', [-1.05, -2.21, -9.2], [4.03, 2.71, -8.74]),
    block('normal-gate-left-b', 'bulkhead', [-4.03, -2.21, -14.1], [1.05, 2.71, -13.64]),
    block('normal-gate-right-b', 'bulkhead', [-1.05, -2.21, -19], [4.03, 2.71, -18.54]),
    block('normal-ceiling-bus-left', 'deck', [-3.85, 1.88, -25.8], [-2.85, 2.71, 3.7]),
    block('normal-ceiling-bus-right', 'deck', [2.85, 1.88, -25.8], [3.85, 2.71, 3.7]),
  ]),
});

const LOGIC_LABYRINTH: CorridorLayoutDefinition = Object.freeze({
  id: 'logic-labyrinth',
  label: 'LOGIC CORE LABYRINTH',
  structures: Object.freeze([
    block('hard-deck-floor-a', 'deck', [-4.03, -2.21, -3.95], [4.03, 0.12, -3.5]),
    block('hard-deck-ceiling-a', 'deck', [-4.03, 0.18, -7.85], [4.03, 2.71, -7.4]),
    block('hard-gate-left', 'bulkhead', [-4.03, -2.21, -11.75], [0.92, 2.71, -11.3]),
    block('hard-gate-right', 'bulkhead', [-0.92, -2.21, -15.65], [4.03, 2.71, -15.2]),
    block('hard-deck-floor-b', 'deck', [-4.03, -2.21, -19.55], [4.03, 0.38, -19.1]),
    block('hard-deck-ceiling-b', 'deck', [-4.03, -0.08, -23.25], [4.03, 2.71, -22.8]),
    block('hard-core-spine', 'core', [-0.28, -0.7, -18.8], [0.28, 1.35, -8.1]),
  ]),
});

export const CORRIDOR_LAYOUTS: Readonly<Record<CorridorEnvironmentId, CorridorLayoutDefinition>> =
  Object.freeze({
    'relay-bay': RELAY_BAY,
    'switching-gallery': SWITCHING_GALLERY,
    'logic-labyrinth': LOGIC_LABYRINTH,
  });

function assertFiniteVector(vector: Vec3, label: string): void {
  if (!Number.isFinite(vector.x) || !Number.isFinite(vector.y) || !Number.isFinite(vector.z)) {
    throw new RangeError(label + ' must contain finite coordinates.');
  }
}

function createPlayerAabb(position: Vec3, halfExtents: Vec3): Aabb {
  assertFiniteVector(position, 'position');
  assertFiniteVector(halfExtents, 'half extents');

  if (halfExtents.x < 0 || halfExtents.y < 0 || halfExtents.z < 0) {
    throw new RangeError('half extents must be non-negative.');
  }

  return {
    min: {
      x: position.x - halfExtents.x,
      y: position.y - halfExtents.y,
      z: position.z - halfExtents.z,
    },
    max: {
      x: position.x + halfExtents.x,
      y: position.y + halfExtents.y,
      z: position.z + halfExtents.z,
    },
  };
}

export function getCorridorLayout(id: CorridorEnvironmentId): CorridorLayoutDefinition {
  return CORRIDOR_LAYOUTS[id];
}

export function findBlockingStructures(
  environment: CorridorEnvironmentId,
  position: Vec3,
  halfExtents: Vec3,
): readonly string[] {
  const playerAabb = createPlayerAabb(position, halfExtents);

  return Object.freeze(
    getCorridorLayout(environment)
      .structures.filter((structure) => intersectsAabb(playerAabb, structure.collider))
      .map((structure) => structure.id),
  );
}
