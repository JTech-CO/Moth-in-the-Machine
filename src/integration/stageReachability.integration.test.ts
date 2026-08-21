import { describe, expect, it } from 'vitest';

import {
  CORRIDOR_INTERIOR_BOUNDS,
  PLAYER_CENTER_BOUNDS,
  PLAYER_CONFIG,
} from '@/components/three/sceneConfig';
import {
  intersectsAabb,
  intersectsSphereAabb,
  LANDING_PLANE_TOLERANCE,
  type Aabb,
  type Vec3,
} from '@/utils/collision';
import { findBlockingStructures } from '@/utils/corridorLayouts';
import {
  simulatePlayerStep,
  type PlayerPhysicsConfig,
  type PlayerSimulationState,
} from '@/utils/playerPhysics';
import {
  createHazardRuntimeState,
  evaluateStageHazards,
  evaluateSurfaceLandingAttempt,
} from '@/utils/stageHazards';
import { STAGE_DEFINITIONS, type ObstacleDefinition, type StageDefinition } from '@/utils/stages';

const PLAYER_HALF_EXTENTS: Vec3 = {
  x: PLAYER_CONFIG.halfExtents[0],
  y: PLAYER_CONFIG.halfExtents[1],
  z: PLAYER_CONFIG.halfExtents[2],
};
const PHYSICS_CONFIG: PlayerPhysicsConfig = {
  acceleration: PLAYER_CONFIG.acceleration,
  maxHorizontalSpeed: PLAYER_CONFIG.maximumSpeed,
  maxVerticalSpeed: PLAYER_CONFIG.maximumVerticalSpeed,
  horizontalDrag: PLAYER_CONFIG.drag,
  hoverVerticalDrag: PLAYER_CONFIG.hoverVerticalDamping,
  landingDescentSpeed: PLAYER_CONFIG.maximumDescentSpeed,
  landingVerticalResponse: PLAYER_CONFIG.landingVerticalResponse,
  centerBounds: PLAYER_CENTER_BOUNDS,
};
const GRID_STEP = 0.5;
const SEGMENT_SAMPLE_STEP = 0.08;
const ENDPOINT_CONNECTION_RADIUS = 0.9;
const MINIMUM_INWARD_APPROACH_CLEARANCE = 0.3;
const START_KEY = 'start';

interface GridCoordinate {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

interface FrontierEntry {
  readonly coordinate: GridCoordinate;
  readonly cost: number;
  readonly score: number;
}

class MinFrontier {
  private readonly entries: FrontierEntry[] = [];

  get size(): number {
    return this.entries.length;
  }

  push(entry: FrontierEntry): void {
    this.entries.push(entry);
    let index = this.entries.length - 1;

    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);

      if (this.entries[parentIndex].score <= entry.score) {
        break;
      }

      this.entries[index] = this.entries[parentIndex];
      index = parentIndex;
    }

    this.entries[index] = entry;
  }

  pop(): FrontierEntry | undefined {
    const first = this.entries[0];
    const last = this.entries.pop();

    if (first === undefined || last === undefined || this.entries.length === 0) {
      return first;
    }

    let index = 0;

    while (true) {
      const leftIndex = index * 2 + 1;
      const rightIndex = leftIndex + 1;

      if (leftIndex >= this.entries.length) {
        break;
      }

      const smallerChildIndex =
        rightIndex < this.entries.length &&
        this.entries[rightIndex].score < this.entries[leftIndex].score
          ? rightIndex
          : leftIndex;

      if (this.entries[smallerChildIndex].score >= last.score) {
        break;
      }

      this.entries[index] = this.entries[smallerChildIndex];
      index = smallerChildIndex;
    }

    this.entries[index] = last;
    return first;
  }
}

const point = (x: number, y: number, z: number): Vec3 => ({ x, y, z });

function playerAabb(position: Vec3): Aabb {
  return {
    min: point(
      position.x - PLAYER_HALF_EXTENTS.x,
      position.y - PLAYER_HALF_EXTENTS.y,
      position.z - PLAYER_HALF_EXTENTS.z,
    ),
    max: point(
      position.x + PLAYER_HALF_EXTENTS.x,
      position.y + PLAYER_HALF_EXTENTS.y,
      position.z + PLAYER_HALF_EXTENTS.z,
    ),
  };
}

function hazardVolumeIntersectsPlayer(obstacle: ObstacleDefinition, collider: Aabb): boolean {
  switch (obstacle.type) {
    case 'wire':
      return intersectsAabb(collider, obstacle.collider);
    case 'spark':
    case 'vacuum-tube':
      return intersectsSphereAabb(obstacle.collider, collider);
    case 'overheated-relay':
      return intersectsSphereAabb({ center: obstacle.center, radius: obstacle.range }, collider);
  }
}

function findIntersectingHazardVolumes(stage: StageDefinition, position: Vec3): readonly string[] {
  const collider = playerAabb(position);

  return stage.obstacles
    .filter((obstacle) => hazardVolumeIntersectsPlayer(obstacle, collider))
    .map((obstacle) => obstacle.id);
}

function isInsidePlayerBounds(position: Vec3): boolean {
  return (
    position.x >= PLAYER_CENTER_BOUNDS.min.x &&
    position.x <= PLAYER_CENTER_BOUNDS.max.x &&
    position.y >= PLAYER_CENTER_BOUNDS.min.y &&
    position.y <= PLAYER_CENTER_BOUNDS.max.y &&
    position.z >= PLAYER_CENTER_BOUNDS.min.z &&
    position.z <= PLAYER_CENTER_BOUNDS.max.z
  );
}

function isNavigationClear(stage: StageDefinition, position: Vec3): boolean {
  return (
    isInsidePlayerBounds(position) &&
    findBlockingStructures(stage.environment, position, PLAYER_HALF_EXTENTS).length === 0 &&
    findIntersectingHazardVolumes(stage, position).length === 0
  );
}

function interpolate(first: Vec3, second: Vec3, progress: number): Vec3 {
  return point(
    first.x + (second.x - first.x) * progress,
    first.y + (second.y - first.y) * progress,
    first.z + (second.z - first.z) * progress,
  );
}

function distance(first: Vec3, second: Vec3): number {
  return Math.hypot(first.x - second.x, first.y - second.y, first.z - second.z);
}

function sampleSegment(first: Vec3, second: Vec3): readonly Vec3[] {
  const sampleCount = Math.max(1, Math.ceil(distance(first, second) / SEGMENT_SAMPLE_STEP));

  return Array.from({ length: sampleCount + 1 }, (_, index) =>
    interpolate(first, second, index / sampleCount),
  );
}

function isSegmentClear(stage: StageDefinition, first: Vec3, second: Vec3): boolean {
  return sampleSegment(first, second).every((position) => isNavigationClear(stage, position));
}

function axisSamples(minimum: number, maximum: number, inset: number): readonly number[] {
  const values: number[] = [];

  for (let value = minimum + inset; value <= maximum - inset + 1e-9; value += GRID_STEP) {
    values.push(Number(value.toFixed(6)));
  }

  return values;
}

const GRID_AXES = {
  x: axisSamples(PLAYER_CENTER_BOUNDS.min.x, PLAYER_CENTER_BOUNDS.max.x, 0.25),
  y: axisSamples(PLAYER_CENTER_BOUNDS.min.y, PLAYER_CENTER_BOUNDS.max.y, 0.25),
  z: axisSamples(PLAYER_CENTER_BOUNDS.min.z, PLAYER_CENTER_BOUNDS.max.z, 0.25),
} as const;

function coordinateKey(coordinate: GridCoordinate): string {
  return `${coordinate.x}:${coordinate.y}:${coordinate.z}`;
}

function coordinatePosition(coordinate: GridCoordinate): Vec3 {
  return point(GRID_AXES.x[coordinate.x], GRID_AXES.y[coordinate.y], GRID_AXES.z[coordinate.z]);
}

function gridNeighbors(coordinate: GridCoordinate): readonly GridCoordinate[] {
  const candidates = [
    { ...coordinate, x: coordinate.x - 1 },
    { ...coordinate, x: coordinate.x + 1 },
    { ...coordinate, y: coordinate.y - 1 },
    { ...coordinate, y: coordinate.y + 1 },
    { ...coordinate, z: coordinate.z - 1 },
    { ...coordinate, z: coordinate.z + 1 },
  ];

  return candidates.filter(
    (candidate) =>
      candidate.x >= 0 &&
      candidate.x < GRID_AXES.x.length &&
      candidate.y >= 0 &&
      candidate.y < GRID_AXES.y.length &&
      candidate.z >= 0 &&
      candidate.z < GRID_AXES.z.length,
  );
}

function heuristic(position: Vec3, goal: Vec3): number {
  return distance(position, goal) / GRID_STEP;
}

function findEndpointConnections(
  stage: StageDefinition,
  endpoint: Vec3,
): readonly GridCoordinate[] {
  const connections: GridCoordinate[] = [];

  for (let x = 0; x < GRID_AXES.x.length; x += 1) {
    for (let y = 0; y < GRID_AXES.y.length; y += 1) {
      for (let z = 0; z < GRID_AXES.z.length; z += 1) {
        const coordinate = { x, y, z };
        const position = coordinatePosition(coordinate);

        if (
          distance(position, endpoint) <= ENDPOINT_CONNECTION_RADIUS &&
          isSegmentClear(stage, endpoint, position)
        ) {
          connections.push(coordinate);
        }
      }
    }
  }

  return connections;
}

function reconstructPath(
  parents: ReadonlyMap<string, string>,
  coordinates: ReadonlyMap<string, GridCoordinate>,
  lastKey: string,
  spawn: Vec3,
  approach: Vec3,
): readonly Vec3[] {
  const reversed: Vec3[] = [approach];
  let key = lastKey;

  while (key !== START_KEY) {
    const coordinate = coordinates.get(key);

    if (coordinate === undefined) {
      throw new Error(`Missing coordinate for ${key}.`);
    }

    reversed.push(coordinatePosition(coordinate));
    const parent = parents.get(key);

    if (parent === undefined) {
      throw new Error(`Missing parent for ${key}.`);
    }

    key = parent;
  }

  reversed.push(spawn);
  return reversed.reverse();
}

function findReachableApproachPath(stage: StageDefinition, approach: Vec3): readonly Vec3[] | null {
  if (!isNavigationClear(stage, stage.spawnPosition) || !isNavigationClear(stage, approach)) {
    return null;
  }

  if (isSegmentClear(stage, stage.spawnPosition, approach)) {
    return [stage.spawnPosition, approach];
  }

  const frontier = new MinFrontier();
  const costs = new Map<string, number>();
  const parents = new Map<string, string>();
  const coordinates = new Map<string, GridCoordinate>();
  const goalConnectionKeys = new Set(
    findEndpointConnections(stage, approach).map((coordinate) => coordinateKey(coordinate)),
  );

  for (const coordinate of findEndpointConnections(stage, stage.spawnPosition)) {
    const key = coordinateKey(coordinate);
    const position = coordinatePosition(coordinate);
    const cost = distance(stage.spawnPosition, position) / GRID_STEP;

    costs.set(key, cost);
    parents.set(key, START_KEY);
    coordinates.set(key, coordinate);
    frontier.push({ coordinate, cost, score: cost + heuristic(position, approach) });
  }

  while (frontier.size > 0) {
    const entry = frontier.pop();

    if (entry === undefined) {
      break;
    }

    const key = coordinateKey(entry.coordinate);

    if (entry.cost !== costs.get(key)) {
      continue;
    }

    if (goalConnectionKeys.has(key)) {
      return reconstructPath(parents, coordinates, key, stage.spawnPosition, approach);
    }

    const position = coordinatePosition(entry.coordinate);

    for (const neighbor of gridNeighbors(entry.coordinate)) {
      const neighborKey = coordinateKey(neighbor);
      const neighborPosition = coordinatePosition(neighbor);

      if (!isSegmentClear(stage, position, neighborPosition)) {
        continue;
      }

      const nextCost = entry.cost + 1;

      if (nextCost >= (costs.get(neighborKey) ?? Number.POSITIVE_INFINITY)) {
        continue;
      }

      costs.set(neighborKey, nextCost);
      parents.set(neighborKey, key);
      coordinates.set(neighborKey, neighbor);
      frontier.push({
        coordinate: neighbor,
        cost: nextCost,
        score: nextCost + heuristic(neighborPosition, approach),
      });
    }
  }

  return null;
}

function normalColliderRadius(normal: Vec3): number {
  return (
    Math.abs(normal.x) * PLAYER_HALF_EXTENTS.x +
    Math.abs(normal.y) * PLAYER_HALF_EXTENTS.y +
    Math.abs(normal.z) * PLAYER_HALF_EXTENTS.z
  );
}

function inwardApproach(stage: StageDefinition): Vec3 {
  const { normal, position } = stage.target;

  return point(
    position.x + normal.x * MINIMUM_INWARD_APPROACH_CLEARANCE,
    position.y + normal.y * MINIMUM_INWARD_APPROACH_CLEARANCE,
    position.z + normal.z * MINIMUM_INWARD_APPROACH_CLEARANCE,
  );
}

function physicalSurfacePosition(stage: StageDefinition): Vec3 {
  const { normal, position } = stage.target;
  const radius = normalColliderRadius(normal);

  return point(
    position.x - normal.x * radius,
    position.y - normal.y * radius,
    position.z - normal.z * radius,
  );
}

function simulateLandingFromApproach(stage: StageDefinition, approach: Vec3) {
  let state: PlayerSimulationState = {
    position: approach,
    velocity: point(0, 0, 0),
  };
  const maximumSteps = Math.ceil(2 / PLAYER_CONFIG.fixedDelta);

  for (let step = 0; step < maximumSteps; step += 1) {
    const previous = state;
    state = simulatePlayerStep(
      previous,
      {
        forward: 0,
        right: 0,
        yaw: 0,
        pitch: 0,
        mode: 'landing-ready',
        landingSurfaceNormal: stage.target.normal,
      },
      PLAYER_CONFIG.fixedDelta,
      PHYSICS_CONFIG,
    );
    const result = evaluateSurfaceLandingAttempt(
      'landing-ready',
      {
        previousPosition: previous.position,
        position: state.position,
        approachVelocity: previous.velocity,
      },
      stage.target,
    );

    if (result !== 'none') {
      return { result, state, stepCount: step + 1 };
    }
  }

  return { result: 'none' as const, state, stepCount: maximumSteps };
}

function assertRuntimePathIsClear(stage: StageDefinition, path: readonly Vec3[]): void {
  for (let index = 0; index < path.length - 1; index += 1) {
    for (const position of sampleSegment(path[index], path[index + 1])) {
      expect(findBlockingStructures(stage.environment, position, PLAYER_HALF_EXTENTS)).toEqual([]);
      expect(findIntersectingHazardVolumes(stage, position)).toEqual([]);
      expect(
        evaluateStageHazards(
          stage.obstacles,
          position,
          PLAYER_HALF_EXTENTS,
          0,
          createHazardRuntimeState(),
        ).blockingObstacleIds,
      ).toEqual([]);
    }
  }
}

describe('M9 full-campaign geometry reachability', () => {
  it.each(STAGE_DEFINITIONS)(
    'keeps stage $id ($name) target contact and inward approach hazard-clear',
    (stage) => {
      const { normal, position: targetPosition } = stage.target;
      const targetSurface = physicalSurfacePosition(stage);
      const approach = inwardApproach(stage);
      const normalAxis = (['x', 'y', 'z'] as const).find((axis) => Math.abs(normal[axis]) === 1);

      expect(normalAxis).toBeDefined();

      if (normalAxis === undefined) {
        throw new Error(`Stage ${stage.id} has no cardinal target normal.`);
      }

      const expectedSurfaceCoordinate =
        normal[normalAxis] > 0
          ? CORRIDOR_INTERIOR_BOUNDS.min[normalAxis]
          : CORRIDOR_INTERIOR_BOUNDS.max[normalAxis];
      const approachFace = point(
        approach.x - normal.x * normalColliderRadius(normal),
        approach.y - normal.y * normalColliderRadius(normal),
        approach.z - normal.z * normalColliderRadius(normal),
      );
      const measuredClearance =
        (approachFace.x - targetSurface.x) * normal.x +
        (approachFace.y - targetSurface.y) * normal.y +
        (approachFace.z - targetSurface.z) * normal.z;

      expect(targetSurface[normalAxis]).toBeCloseTo(expectedSurfaceCoordinate, 12);
      expect(measuredClearance).toBeCloseTo(MINIMUM_INWARD_APPROACH_CLEARANCE, 12);
      expect(measuredClearance).toBeGreaterThan(LANDING_PLANE_TOLERANCE);
      expect(isInsidePlayerBounds(targetPosition)).toBe(true);
      expect(isInsidePlayerBounds(approach)).toBe(true);
      expect(
        findBlockingStructures(stage.environment, targetPosition, PLAYER_HALF_EXTENTS),
      ).toEqual([]);
      expect(findBlockingStructures(stage.environment, approach, PLAYER_HALF_EXTENTS)).toEqual([]);
      expect(findIntersectingHazardVolumes(stage, targetPosition)).toEqual([]);
      expect(findIntersectingHazardVolumes(stage, approach)).toEqual([]);
      expect(isSegmentClear(stage, approach, targetPosition)).toBe(true);
      const landing = simulateLandingFromApproach(stage, approach);

      expect(landing.result).toBe('success');
      expect(landing.stepCount).toBeLessThan(Math.ceil(2 / PLAYER_CONFIG.fixedDelta));
      expect(Object.values(landing.state.position).every(Number.isFinite)).toBe(true);
      expect(Object.values(landing.state.velocity).every(Number.isFinite)).toBe(true);
    },
  );

  it.each(STAGE_DEFINITIONS)(
    'finds and validates a deterministic hazard-clear route through stage $id ($name)',
    (stage) => {
      const approach = inwardApproach(stage);
      const path = findReachableApproachPath(stage, approach);

      expect(
        path,
        `stage ${stage.id} has no route from spawn to its target approach`,
      ).not.toBeNull();

      if (path === null) {
        return;
      }

      expect(path[0]).toEqual(stage.spawnPosition);
      expect(path.at(-1)).toEqual(approach);
      assertRuntimePathIsClear(stage, path);
    },
    30_000,
  );
});
