import { describe, expect, it } from 'vitest';

import {
  CANONICAL_SPAWN_POSITION,
  FIRST_STAGE_ID,
  getStagesByDifficulty,
  getNextStageId,
  getStageDefinition,
  isStageId,
  STAGE_DEFINITIONS,
  TOTAL_STAGE_COUNT,
  type ObstacleDefinition,
  type StageDifficulty,
  type TargetSurface,
} from '@/utils/stages';

const getAllObstacles = (): readonly ObstacleDefinition[] =>
  STAGE_DEFINITIONS.flatMap((stage) => stage.obstacles);

describe('stage definitions', () => {
  it('defines one tutorial followed by six stages per difficulty', () => {
    expect(
      STAGE_DEFINITIONS.map(
        ({ id, difficulty, stageNumberWithinDifficulty, environment, name, targetSurface }) => ({
          id,
          difficulty,
          stageNumberWithinDifficulty,
          environment,
          name,
          targetSurface,
        }),
      ),
    ).toEqual(
      [
        [1, 'tutorial', 1, 'relay-bay', 'CONTACT CHECK', 'floor'],
        [2, 'easy', 1, 'relay-bay', 'RELAY APPROACH', 'floor'],
        [3, 'easy', 2, 'relay-bay', 'INSULATION RUN', 'floor'],
        [4, 'easy', 3, 'relay-bay', 'THERMAL DRIFT', 'floor'],
        [5, 'easy', 4, 'relay-bay', 'FILAMENT WATCH', 'floor'],
        [6, 'easy', 5, 'relay-bay', 'CONTACT ARRAY', 'floor'],
        [7, 'easy', 6, 'relay-bay', 'CASCADE TEST', 'floor'],
        [8, 'normal', 1, 'switching-gallery', 'FIRST TRANSFER', 'floor'],
        [9, 'normal', 2, 'switching-gallery', 'CROSS-CONNECTION', 'left-wall'],
        [10, 'normal', 3, 'switching-gallery', 'UPPER BUS', 'ceiling'],
        [11, 'normal', 4, 'switching-gallery', 'REVERSING BANK', 'right-wall'],
        [12, 'normal', 5, 'switching-gallery', 'SWITCHING CEILING', 'ceiling'],
        [13, 'normal', 6, 'switching-gallery', 'GALLERY EXIT', 'left-wall'],
        [14, 'hard', 1, 'logic-labyrinth', 'LOGIC ENTRY', 'right-wall'],
        [15, 'hard', 2, 'logic-labyrinth', 'BINARY CROSSING', 'ceiling'],
        [16, 'hard', 3, 'logic-labyrinth', 'MEMORY DECK', 'left-wall'],
        [17, 'hard', 4, 'logic-labyrinth', 'CONTROL DESCENT', 'right-wall'],
        [18, 'hard', 5, 'logic-labyrinth', 'CEILING REGISTER', 'ceiling'],
        [19, 'hard', 6, 'logic-labyrinth', 'FAULT REGISTER', 'left-wall'],
      ].map(([id, difficulty, stageNumberWithinDifficulty, environment, name, targetSurface]) => ({
        id,
        difficulty,
        stageNumberWithinDifficulty,
        environment,
        name,
        targetSurface,
      })),
    );

    expect(TOTAL_STAGE_COUNT).toBe(19);
  });

  it('keeps stage and obstacle ids unique', () => {
    const stageIds = STAGE_DEFINITIONS.map((stage) => stage.id);
    const obstacleIds = getAllObstacles().map((obstacle) => obstacle.id);

    expect(new Set(stageIds).size).toBe(stageIds.length);
    expect(new Set(obstacleIds).size).toBe(obstacleIds.length);
  });

  it('contains all four obstacle kinds with the specified damage model', () => {
    const obstacles = getAllObstacles();

    expect(new Set(obstacles.map((obstacle) => obstacle.type))).toEqual(
      new Set(['wire', 'spark', 'overheated-relay', 'vacuum-tube']),
    );

    for (const obstacle of obstacles) {
      switch (obstacle.type) {
        case 'wire':
          expect(obstacle.damage).toBe(15);
          expect(obstacle.collider).toEqual(
            expect.objectContaining({ min: expect.any(Object), max: expect.any(Object) }),
          );
          break;
        case 'spark':
          expect(obstacle.damage).toBe(25);
          expect(obstacle.collider.radius).toBeGreaterThan(0);
          break;
        case 'overheated-relay':
          expect(obstacle.minDamagePerSecond).toBe(8);
          expect(obstacle.maxDamagePerSecond).toBe(20);
          expect(obstacle.coreRadius).toBeGreaterThan(0);
          expect(obstacle.range).toBeGreaterThan(obstacle.coreRadius);
          break;
        case 'vacuum-tube':
          expect(obstacle.damage).toBe(40);
          expect(obstacle.collider.radius).toBe(1.25);
          break;
      }
    }
  });

  it('converts wire centers and half-extents into exact AABBs', () => {
    const firstWire = getStageDefinition(1).obstacles[0];
    const finalStageWire = getStageDefinition(7).obstacles[4];

    expect(firstWire).toMatchObject({
      type: 'wire',
      collider: {
        min: { x: -1.72, y: -2, z: 0.16 },
        max: { x: -1.48, y: 2.4, z: 0.44 },
      },
    });
    expect(finalStageWire).toMatchObject({
      type: 'wire',
      collider: {
        min: { x: 1.18, y: -2, z: -13.74 },
        max: { x: 1.42, y: 2.4, z: -13.46 },
      },
    });
  });

  it('uses finite coordinates, dimensions, and damage values', () => {
    const numericLeaves: number[] = [];

    JSON.stringify(STAGE_DEFINITIONS, (_key, value: unknown) => {
      if (typeof value === 'number') {
        numericLeaves.push(value);
      }

      return value;
    });

    expect(numericLeaves.length).toBeGreaterThan(0);
    expect(numericLeaves.every(Number.isFinite)).toBe(true);
  });

  it('deep-freezes exported configuration data', () => {
    const firstStage = STAGE_DEFINITIONS[0];
    const firstWire = firstStage.obstacles[0];

    expect(Object.isFrozen(STAGE_DEFINITIONS)).toBe(true);
    expect(Object.isFrozen(firstStage)).toBe(true);
    expect(Object.isFrozen(firstStage.spawnPosition)).toBe(true);
    expect(Object.isFrozen(firstStage.targetPosition)).toBe(true);
    expect(Object.isFrozen(firstStage.obstacles)).toBe(true);
    expect(Object.isFrozen(firstWire)).toBe(true);
    if (firstWire.type === 'wire') {
      expect(Object.isFrozen(firstWire.collider)).toBe(true);
      expect(Object.isFrozen(firstWire.collider.min)).toBe(true);
      expect(Object.isFrozen(firstWire.collider.max)).toBe(true);
    }
  });
  it('uses canonical spawn, inward target normals, and exact contact planes', () => {
    const normals: Readonly<Record<TargetSurface, { x: number; y: number; z: number }>> = {
      floor: { x: 0, y: 1, z: 0 },
      ceiling: { x: 0, y: -1, z: 0 },
      'left-wall': { x: 1, y: 0, z: 0 },
      'right-wall': { x: -1, y: 0, z: 0 },
    };

    for (const stageDefinition of STAGE_DEFINITIONS) {
      expect(stageDefinition.spawnPosition).toBe(CANONICAL_SPAWN_POSITION);
      expect(stageDefinition.targetPosition).toBe(stageDefinition.target.position);
      expect(stageDefinition.targetSurface).toBe(stageDefinition.target.surface);
      expect(stageDefinition.target.normal).toEqual(normals[stageDefinition.target.surface]);

      switch (stageDefinition.target.surface) {
        case 'floor':
          expect(stageDefinition.target.position.y).toBe(-2.05);
          break;
        case 'ceiling':
          expect(stageDefinition.target.position.y).toBe(2.55);
          break;
        case 'left-wall':
          expect(stageDefinition.target.position.x).toBe(-3.65);
          break;
        case 'right-wall':
          expect(stageDefinition.target.position.x).toBe(3.65);
          break;
      }
    }
  });

  it('keeps every spawn and target finite and inside playable center bounds', () => {
    for (const stageDefinition of STAGE_DEFINITIONS) {
      for (const position of [stageDefinition.spawnPosition, stageDefinition.target.position]) {
        expect(Object.values(position).every(Number.isFinite)).toBe(true);
        expect(position.x).toBeGreaterThanOrEqual(-3.65);
        expect(position.x).toBeLessThanOrEqual(3.65);
        expect(position.y).toBeGreaterThanOrEqual(-2.05);
        expect(position.y).toBeLessThanOrEqual(2.55);
        expect(position.z).toBeGreaterThanOrEqual(-26.48);
        expect(position.z).toBeLessThanOrEqual(4.65);
      }
    }
  });

  it('increases obstacle density inside each six-stage difficulty band', () => {
    const expectedCounts: Readonly<Record<StageDifficulty, readonly number[]>> = {
      tutorial: [2],
      easy: [3, 4, 5, 6, 7, 8],
      normal: [5, 6, 7, 8, 9, 10],
      hard: [7, 8, 9, 10, 11, 12],
    };

    for (const [difficulty, counts] of Object.entries(expectedCounts)) {
      expect(
        STAGE_DEFINITIONS.filter(
          (stageDefinition) => stageDefinition.difficulty === difficulty,
        ).map((stageDefinition) => stageDefinition.obstacles.length),
      ).toEqual(counts);
    }
  });
});

describe('stage lookup helpers', () => {
  it('exposes the canonical first stage for the title-screen gate', () => {
    expect(FIRST_STAGE_ID).toBe(STAGE_DEFINITIONS[0].id);
  });

  it('recognizes every supported stage id', () => {
    for (let id = FIRST_STAGE_ID; id <= TOTAL_STAGE_COUNT; id += 1) {
      expect(isStageId(id)).toBe(true);
      expect(getStageDefinition(id).id).toBe(id);
    }
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, -1, 0, 1.5, 20])(
    'rejects unsupported stage id %s',
    (id) => {
      expect(isStageId(id)).toBe(false);
      expect(() => getStageDefinition(id)).toThrow(RangeError);
      expect(() => getNextStageId(id)).toThrow(RangeError);
    },
  );

  it.each([
    ['tutorial', 1],
    ['easy', 6],
    ['normal', 6],
    ['hard', 6],
  ] as const)('returns a frozen %s stage band', (difficulty, count) => {
    const stages = getStagesByDifficulty(difficulty);

    expect(stages).toHaveLength(count);
    expect(stages.every((stage) => stage.difficulty === difficulty)).toBe(true);
    expect(Object.isFrozen(stages)).toBe(true);
  });

  it('advances sequentially and stops after the final stage', () => {
    expect(getNextStageId(1)).toBe(2);
    expect(getNextStageId(2)).toBe(3);
    expect(getNextStageId(18)).toBe(19);
    expect(getNextStageId(19)).toBeNull();
  });
});
