import type { CorridorEnvironmentId } from '@/utils/corridorLayouts';
import type { Aabb, Sphere, Vec3 } from '@/utils/collision';

export const TOTAL_STAGE_COUNT = 19 as const;

export type StageId =
  1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19;
export type StageDifficulty = 'tutorial' | 'easy' | 'normal' | 'hard';
export type CorridorEnvironment = CorridorEnvironmentId;
export type TargetSurface = 'floor' | 'ceiling' | 'left-wall' | 'right-wall';

export interface LandingTargetDefinition {
  readonly position: Vec3;
  readonly surface: TargetSurface;
  readonly normal: Vec3;
}

interface ObstacleBase {
  readonly id: string;
}

export interface WireObstacleDefinition extends ObstacleBase {
  readonly type: 'wire';
  readonly collider: Aabb;
  readonly damage: number;
}

export interface SparkObstacleDefinition extends ObstacleBase {
  readonly type: 'spark';
  readonly collider: Sphere;
  readonly damage: number;
}

export interface OverheatedRelayObstacleDefinition extends ObstacleBase {
  readonly type: 'overheated-relay';
  readonly center: Vec3;
  readonly coreRadius: number;
  readonly range: number;
  readonly minDamagePerSecond: number;
  readonly maxDamagePerSecond: number;
}

export interface VacuumTubeObstacleDefinition extends ObstacleBase {
  readonly type: 'vacuum-tube';
  readonly collider: Sphere;
  readonly damage: number;
}

export type ObstacleDefinition =
  | WireObstacleDefinition
  | SparkObstacleDefinition
  | OverheatedRelayObstacleDefinition
  | VacuumTubeObstacleDefinition;

export interface StageDefinition {
  readonly id: StageId;
  readonly difficulty: StageDifficulty;
  readonly stageNumberWithinDifficulty: number;
  readonly environment: CorridorEnvironment;
  readonly name: string;
  readonly targetLabel: string;
  readonly spawnPosition: Vec3;
  readonly target: LandingTargetDefinition;
  readonly targetPosition: Vec3;
  readonly targetSurface: TargetSurface;
  readonly obstacles: readonly ObstacleDefinition[];
}

const point = (x: number, y: number, z: number): Vec3 => Object.freeze({ x, y, z });

export const CANONICAL_SPAWN_POSITION: Vec3 = point(0, -0.25, 3.55);

const TARGET_NORMALS: Readonly<Record<TargetSurface, Vec3>> = Object.freeze({
  floor: point(0, 1, 0),
  ceiling: point(0, -1, 0),
  'left-wall': point(1, 0, 0),
  'right-wall': point(-1, 0, 0),
});

const roundWireCoordinate = (value: number): number => Math.round(value * 100) / 100;

const wire = (id: string, center: readonly [number, number, number]): WireObstacleDefinition => {
  const [x, y, z] = center;
  const halfWidth = 0.12;
  const halfHeight = 2.2;
  const halfDepth = 0.14;

  return Object.freeze({
    id,
    type: 'wire',
    collider: Object.freeze({
      min: point(
        roundWireCoordinate(x - halfWidth),
        roundWireCoordinate(y - halfHeight),
        roundWireCoordinate(z - halfDepth),
      ),
      max: point(
        roundWireCoordinate(x + halfWidth),
        roundWireCoordinate(y + halfHeight),
        roundWireCoordinate(z + halfDepth),
      ),
    }),
    damage: 15,
  });
};

const spark = (
  id: string,
  center: readonly [number, number, number],
  radius: number,
): SparkObstacleDefinition =>
  Object.freeze({
    id,
    type: 'spark',
    collider: Object.freeze({ center: point(...center), radius }),
    damage: 25,
  });

const overheatedRelay = (
  id: string,
  center: readonly [number, number, number],
  coreRadius: number,
  range: number,
): OverheatedRelayObstacleDefinition =>
  Object.freeze({
    id,
    type: 'overheated-relay',
    center: point(...center),
    coreRadius,
    range,
    minDamagePerSecond: 8,
    maxDamagePerSecond: 20,
  });

const vacuumTube = (
  id: string,
  center: readonly [number, number, number],
  radius = 1.25,
): VacuumTubeObstacleDefinition =>
  Object.freeze({
    id,
    type: 'vacuum-tube',
    collider: Object.freeze({ center: point(...center), radius }),
    damage: 40,
  });

const stage = (
  id: StageId,
  difficulty: StageDifficulty,
  stageNumberWithinDifficulty: number,
  environment: CorridorEnvironment,
  name: string,
  targetLabel: string,
  targetSurface: TargetSurface,
  targetPosition: readonly [number, number, number],
  obstacles: readonly ObstacleDefinition[],
): StageDefinition => {
  const target: LandingTargetDefinition = Object.freeze({
    position: point(...targetPosition),
    surface: targetSurface,
    normal: TARGET_NORMALS[targetSurface],
  });

  return Object.freeze({
    id,
    difficulty,
    stageNumberWithinDifficulty,
    environment,
    name,
    targetLabel,
    spawnPosition: CANONICAL_SPAWN_POSITION,
    target,
    targetPosition: target.position,
    targetSurface: target.surface,
    obstacles: Object.freeze(obstacles),
  });
};

export const STAGE_DEFINITIONS: readonly StageDefinition[] = Object.freeze([
  stage(
    1,
    'tutorial',
    1,
    'relay-bay',
    'CONTACT CHECK',
    'TEST PAD T-01',
    'floor',
    [0, -2.05, -5.5],
    [wire('s1-wire-a', [-1.6, 0.2, 0.3]), spark('s1-spark-a', [1.45, -0.25, -2.7], 0.65)],
  ),
  stage(
    2,
    'easy',
    1,
    'relay-bay',
    'RELAY APPROACH',
    'RELAY A-16',
    'floor',
    [-1.8, -2.05, -9.2],
    [
      wire('s2-wire-a', [-1.65, 0.2, 0.4]),
      spark('s2-spark-a', [1.35, -0.4, -3], 0.65),
      overheatedRelay('s2-hot-a', [-3.45, 0.1, -6.3], 0.45, 1.75),
    ],
  ),
  stage(
    3,
    'easy',
    2,
    'relay-bay',
    'INSULATION RUN',
    'RELAY A-28',
    'floor',
    [2.1, -2.05, -13.2],
    [
      wire('s3-wire-a', [1.7, 0.2, 0.25]),
      spark('s3-spark-a', [-1.4, 0.65, -3], 0.65),
      wire('s3-wire-b', [-2.1, 0.2, -6.2]),
      overheatedRelay('s3-hot-a', [3.5, 0, -9.5], 0.45, 1.8),
    ],
  ),
  stage(
    4,
    'easy',
    3,
    'relay-bay',
    'THERMAL DRIFT',
    'RELAY B-34',
    'floor',
    [-2.35, -2.05, -17],
    [
      wire('s4-wire-a', [-1.8, 0.2, 0.3]),
      spark('s4-spark-a', [1.4, 0.5, -3.1], 0.68),
      overheatedRelay('s4-hot-a', [-3.5, -0.1, -6.8], 0.45, 1.9),
      wire('s4-wire-b', [1.9, 0.2, -10.2]),
      spark('s4-spark-b', [-0.6, 1, -13.8], 0.68),
    ],
  ),
  stage(
    5,
    'easy',
    4,
    'relay-bay',
    'FILAMENT WATCH',
    'RELAY C-42',
    'floor',
    [0.65, -2.05, -20.2],
    [
      wire('s5-wire-a', [1.9, 0.2, 0.3]),
      spark('s5-spark-a', [-1.35, -0.4, -3], 0.68),
      vacuumTube('s5-vacuum-a', [2.1, -0.9, -6.7]),
      wire('s5-wire-b', [-1.7, 0.2, -10]),
      overheatedRelay('s5-hot-a', [3.5, 0.2, -13.5], 0.45, 2),
      spark('s5-spark-b', [-0.5, 1.15, -16.8], 0.7),
    ],
  ),
  stage(
    6,
    'easy',
    5,
    'relay-bay',
    'CONTACT ARRAY',
    'RELAY D-55',
    'floor',
    [-2.35, -2.05, -23],
    [
      wire('s6-wire-left', [-2.25, 0.2, 0.25]),
      wire('s6-wire-right', [2.25, 0.2, 0.25]),
      spark('s6-spark-a', [0, 1, -3.5], 0.7),
      overheatedRelay('s6-hot-a', [3.5, 0, -7.2], 0.45, 2),
      wire('s6-wire-mid', [-1.45, 0.2, -10.8]),
      vacuumTube('s6-vacuum-a', [2.1, -0.8, -14.4]),
      spark('s6-spark-b', [-1.25, 0.2, -18], 0.7),
    ],
  ),
  stage(
    7,
    'easy',
    6,
    'relay-bay',
    'CASCADE TEST',
    'RELAY E-70',
    'floor',
    [2.35, -2.05, -24.5],
    [
      wire('s7-wire-left', [-2.15, 0.2, 0.25]),
      wire('s7-wire-right', [2.15, 0.2, 0.25]),
      spark('s7-spark-a', [0.15, 0.9, -4.5], 0.75),
      overheatedRelay('s7-hot-a', [-3.55, -0.1, -9.2], 0.45, 2.25),
      wire('s7-wire-mid', [1.3, 0.2, -13.6]),
      vacuumTube('s7-vacuum-a', [-2.15, -1.15, -17.8]),
      spark('s7-spark-b', [1.45, -0.6, -21.2], 0.7),
      overheatedRelay('s7-hot-b', [3.5, 0.8, -22], 0.45, 1.7),
    ],
  ),

  stage(
    8,
    'normal',
    1,
    'switching-gallery',
    'FIRST TRANSFER',
    'SWITCH S-08',
    'floor',
    [2.1, -2.05, -7],
    [
      wire('s8-wire-a', [-1.9, 0.2, 0.5]),
      spark('s8-spark-a', [-0.4, -0.6, -1.7], 0.65),
      vacuumTube('s8-vacuum-a', [-1.9, 1, -2.9]),
      overheatedRelay('s8-hot-a', [-3.45, 0, -5.6], 0.45, 1.7),
      spark('s8-spark-b', [0, 0.7, -6], 0.65),
    ],
  ),
  stage(
    9,
    'normal',
    2,
    'switching-gallery',
    'CROSS-CONNECTION',
    'SWITCH S-17',
    'left-wall',
    [-3.65, -0.65, -12],
    [
      wire('s9-wire-a', [-1.9, 0.2, 0.5]),
      spark('s9-spark-a', [0, 1, -2], 0.68),
      overheatedRelay('s9-hot-a', [3.5, 0, -5.8], 0.45, 1.8),
      wire('s9-wire-b', [1.8, 0.2, -6.6]),
      spark('s9-spark-b', [0.7, -0.7, -8], 0.65),
      vacuumTube('s9-vacuum-a', [1.7, 0.8, -10.5]),
    ],
  ),
  stage(
    10,
    'normal',
    3,
    'switching-gallery',
    'UPPER BUS',
    'BUS U-24',
    'ceiling',
    [1.75, 2.55, -16.4],
    [
      wire('s10-wire-a', [-1.8, 0.2, 0.5]),
      spark('s10-spark-a', [-0.2, -0.7, -1.7], 0.68),
      overheatedRelay('s10-hot-a', [3.5, 0, -5.7], 0.45, 1.8),
      wire('s10-wire-b', [1.8, 0.2, -6.5]),
      vacuumTube('s10-vacuum-a', [-1.7, 0.6, -10.7]),
      spark('s10-spark-b', [-0.8, 1.2, -12], 0.68),
      wire('s10-wire-c', [-1.8, 0.2, -15]),
    ],
  ),
  stage(
    11,
    'normal',
    4,
    'switching-gallery',
    'REVERSING BANK',
    'SWITCH R-31',
    'right-wall',
    [3.65, 0.45, -17.7],
    [
      wire('s11-wire-a', [-1.9, 0.2, 0.4]),
      spark('s11-spark-a', [0.2, 1.2, -1.8], 0.7),
      overheatedRelay('s11-hot-a', [-3.5, 0, -2.8], 0.45, 1.75),
      wire('s11-wire-b', [1.9, 0.2, -6.2]),
      spark('s11-spark-b', [1.1, -0.8, -7.3], 0.68),
      overheatedRelay('s11-hot-b', [-3.5, 0.2, -10.8], 0.45, 1.85),
      vacuumTube('s11-vacuum-a', [-1.8, 0.7, -11.7]),
      wire('s11-wire-c', [-1.8, 0.2, -15.5]),
    ],
  ),
  stage(
    12,
    'normal',
    5,
    'switching-gallery',
    'SWITCHING CEILING',
    'BUS U-46',
    'ceiling',
    [-1.75, 2.55, -21.4],
    [
      wire('s12-wire-a', [-1.9, 0.2, 0.4]),
      spark('s12-spark-a', [0, -0.8, -1.8], 0.7),
      overheatedRelay('s12-hot-a', [-3.5, 0.2, -2.8], 0.45, 1.8),
      wire('s12-wire-b', [1.8, 0.2, -6.2]),
      vacuumTube('s12-vacuum-a', [-1.7, 0.8, -10.4]),
      spark('s12-spark-b', [-0.8, 1, -11.8], 0.68),
      overheatedRelay('s12-hot-b', [3.5, 0, -15.6], 0.45, 1.85),
      wire('s12-wire-c', [1.8, 0.2, -16.8]),
      spark('s12-spark-c', [1.2, 0, -20.2], 0.7),
    ],
  ),
  stage(
    13,
    'normal',
    6,
    'switching-gallery',
    'GALLERY EXIT',
    'CONTACT G-60',
    'left-wall',
    [-3.65, -0.85, -24.6],
    [
      wire('s13-wire-a', [-1.9, 0.2, 0.5]),
      spark('s13-spark-a', [-0.3, -0.8, -1.8], 0.7),
      overheatedRelay('s13-hot-a', [-3.5, 0.5, -2.8], 0.45, 1.85),
      wire('s13-wire-b', [1.8, 0.2, -5.8]),
      spark('s13-spark-b', [1, 0.9, -7], 0.7),
      vacuumTube('s13-vacuum-a', [-1.8, -0.8, -10.5]),
      spark('s13-spark-c', [-0.7, 1.2, -12], 0.7),
      overheatedRelay('s13-hot-b', [3.5, -0.2, -15.3], 0.45, 1.9),
      wire('s13-wire-c', [1.8, 0.2, -16.8]),
      vacuumTube('s13-vacuum-b', [1.5, 0.7, -21.2]),
    ],
  ),

  stage(
    14,
    'hard',
    1,
    'logic-labyrinth',
    'LOGIC ENTRY',
    'LOGIC L-01',
    'right-wall',
    [3.65, 1.1, -13.4],
    [
      wire('s14-wire-a', [-1.8, 0.2, 0.5]),
      spark('s14-spark-a', [0, -1, -1.6], 0.7),
      spark('s14-spark-b', [1.4, 1.2, -5.1], 0.7),
      vacuumTube('s14-vacuum-a', [-1.8, 0.9, -6.3]),
      wire('s14-wire-b', [-1.7, 0.2, -8.8]),
      overheatedRelay('s14-hot-a', [-3.45, 0, -9.7], 0.45, 1.9),
      spark('s14-spark-c', [-0.5, -0.7, -10.5], 0.68),
    ],
  ),
  stage(
    15,
    'hard',
    2,
    'logic-labyrinth',
    'BINARY CROSSING',
    'GATE B-12',
    'ceiling',
    [-2, 2.55, -17.5],
    [
      wire('s15-wire-a', [-1.8, 0.2, 0.5]),
      spark('s15-spark-a', [0, -1, -1.6], 0.7),
      spark('s15-spark-b', [1.4, 1.2, -5.1], 0.7),
      vacuumTube('s15-vacuum-a', [-1.8, 0.9, -6.3]),
      wire('s15-wire-b', [-1.7, 0.2, -9]),
      overheatedRelay('s15-hot-a', [-3.45, 0, -10], 0.45, 1.9),
      overheatedRelay('s15-hot-b', [3.45, 0, -13.1], 0.45, 1.9),
      wire('s15-wire-c', [1.6, 0.2, -14.2]),
    ],
  ),
  stage(
    16,
    'hard',
    3,
    'logic-labyrinth',
    'MEMORY DECK',
    'MEMORY M-23',
    'left-wall',
    [-3.65, 1.15, -20.9],
    [
      wire('s16-wire-a', [-1.8, 0.2, 0.5]),
      spark('s16-spark-a', [0, -1, -1.6], 0.7),
      spark('s16-spark-b', [1.4, 1.2, -5.1], 0.7),
      vacuumTube('s16-vacuum-a', [-1.8, 0.9, -6.3]),
      wire('s16-wire-b', [-1.7, 0.2, -9]),
      overheatedRelay('s16-hot-a', [-3.45, 0, -10], 0.45, 1.9),
      overheatedRelay('s16-hot-b', [3.45, 0, -13.1], 0.45, 1.9),
      wire('s16-wire-c', [1.6, 0.2, -14.2]),
      spark('s16-spark-c', [-1.8, -1, -17.8], 0.75),
    ],
  ),
  stage(
    17,
    'hard',
    4,
    'logic-labyrinth',
    'CONTROL DESCENT',
    'CONTROL C-35',
    'right-wall',
    [3.65, -1.1, -24.6],
    [
      wire('s17-wire-a', [-1.8, 0.2, 0.5]),
      spark('s17-spark-a', [0, -1, -1.6], 0.7),
      spark('s17-spark-b', [1.4, 1.2, -5.1], 0.7),
      vacuumTube('s17-vacuum-a', [-1.8, 0.9, -6.3]),
      wire('s17-wire-b', [-1.7, 0.2, -9]),
      overheatedRelay('s17-hot-a', [-3.45, 0, -10], 0.45, 1.9),
      overheatedRelay('s17-hot-b', [3.45, 0, -13.1], 0.45, 1.9),
      wire('s17-wire-c', [1.6, 0.2, -14.2]),
      spark('s17-spark-c', [-1.8, -1, -17.8], 0.75),
      spark('s17-spark-d', [-1.2, 1.25, -21.4], 0.7),
    ],
  ),
  stage(
    18,
    'hard',
    5,
    'logic-labyrinth',
    'CEILING REGISTER',
    'REGISTER R-47',
    'ceiling',
    [1.9, 2.55, -25.1],
    [
      wire('s18-wire-a', [-1.8, 0.2, 0.5]),
      spark('s18-spark-a', [0, -1, -1.6], 0.7),
      spark('s18-spark-b', [1.4, 1.2, -5.1], 0.7),
      vacuumTube('s18-vacuum-a', [-1.8, 0.9, -6.3]),
      wire('s18-wire-b', [-1.7, 0.2, -9]),
      overheatedRelay('s18-hot-a', [-3.45, 0, -10], 0.45, 1.9),
      overheatedRelay('s18-hot-b', [3.45, 0, -13.1], 0.45, 1.9),
      wire('s18-wire-c', [1.6, 0.2, -14.2]),
      spark('s18-spark-c', [-1.8, -1, -17.8], 0.75),
      vacuumTube('s18-vacuum-b', [1.8, 0.9, -20.8]),
      spark('s18-spark-d', [-1.5, -1, -24.1], 0.65),
    ],
  ),
  stage(
    19,
    'hard',
    6,
    'logic-labyrinth',
    'FAULT REGISTER',
    'PANEL F / RELAY 70',
    'left-wall',
    [-3.65, 0.65, -25.25],
    [
      wire('s19-wire-a', [-1.8, 0.2, 0.5]),
      spark('s19-spark-a', [0, -1, -1.6], 0.7),
      overheatedRelay('s19-hot-a', [-3.45, 0.2, -2.5], 0.45, 1.8),
      spark('s19-spark-b', [1.4, 1.2, -5.1], 0.7),
      vacuumTube('s19-vacuum-a', [-1.8, 0.9, -6.3]),
      wire('s19-wire-b', [-1.7, 0.2, -9]),
      overheatedRelay('s19-hot-b', [-3.45, 0, -10], 0.45, 1.9),
      overheatedRelay('s19-hot-c', [3.45, 0, -13.1], 0.45, 1.9),
      wire('s19-wire-c', [1.6, 0.2, -14.2]),
      spark('s19-spark-c', [-1.8, -1, -17.8], 0.75),
      vacuumTube('s19-vacuum-b', [1.8, 0.9, -20.8]),
      wire('s19-wire-d', [1.6, 0.2, -24]),
    ],
  ),
]);

export const FIRST_STAGE_ID: StageId = STAGE_DEFINITIONS[0].id;

export function isStageId(value: number): value is StageId {
  return Number.isInteger(value) && value >= FIRST_STAGE_ID && value <= TOTAL_STAGE_COUNT;
}

export function getStageDefinition(id: number): StageDefinition {
  if (!isStageId(id)) {
    throw new RangeError(`Unsupported stage id: ${id}`);
  }

  return STAGE_DEFINITIONS[id - 1];
}

export function getNextStageId(id: number): StageId | null {
  if (!isStageId(id)) {
    throw new RangeError(`Unsupported stage id: ${id}`);
  }

  return id < TOTAL_STAGE_COUNT ? ((id + 1) as StageId) : null;
}

export function getStagesByDifficulty(difficulty: StageDifficulty): readonly StageDefinition[] {
  return Object.freeze(
    STAGE_DEFINITIONS.filter((stageDefinition) => stageDefinition.difficulty === difficulty),
  );
}
