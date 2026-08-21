import { describe, expect, it } from 'vitest';

import type { Aabb, Sphere, Vec3 } from '@/utils/collision';
import {
  CONTACT_DAMAGE_TICK_SECONDS,
  createHazardRuntimeState,
  evaluateLandingAttempt,
  evaluateStageHazards,
  evaluateSurfaceLandingAttempt,
  latchLandingAttempt,
  type HazardRuntimeState,
} from '@/utils/stageHazards';
import type { ObstacleDefinition } from '@/utils/stages';

const point = (x: number, y: number, z: number): Vec3 => ({ x, y, z });
const playerHalfExtents = point(0.5, 0.5, 0.5);
const playerPosition = point(0, 0, 0);

const box = (min: Vec3, max: Vec3): Aabb => ({ min, max });
const sphere = (center: Vec3, radius: number): Sphere => ({ center, radius });

type WireObstacle = Extract<ObstacleDefinition, { type: 'wire' }>;
type SparkObstacle = Extract<ObstacleDefinition, { type: 'spark' }>;
type HeatObstacle = Extract<ObstacleDefinition, { type: 'overheated-relay' }>;
type VacuumObstacle = Extract<ObstacleDefinition, { type: 'vacuum-tube' }>;

const wire = (overrides: Partial<WireObstacle> = {}): WireObstacle => ({
  id: 'wire-1',
  type: 'wire',
  collider: box(point(0.5, -0.25, -0.25), point(1, 0.25, 0.25)),
  damage: 15,
  ...overrides,
});

const spark = (overrides: Partial<SparkObstacle> = {}): SparkObstacle => ({
  id: 'spark-1',
  type: 'spark',
  collider: sphere(point(-1, 0, 0), 0.5),
  damage: 25,
  ...overrides,
});

const heat = (overrides: Partial<HeatObstacle> = {}): HeatObstacle => ({
  id: 'heat-1',
  type: 'overheated-relay',
  center: point(0, 0, 0),
  coreRadius: 1,
  range: 3,
  minDamagePerSecond: 8,
  maxDamagePerSecond: 20,
  ...overrides,
});

const vacuum = (overrides: Partial<VacuumObstacle> = {}): VacuumObstacle => ({
  id: 'vacuum-1',
  type: 'vacuum-tube',
  collider: sphere(point(0, 0, 1), 0.5),
  damage: 40,
  ...overrides,
});

function evaluate(
  obstacles: readonly ObstacleDefinition[],
  position = playerPosition,
  deltaSeconds = 1 / 60,
  runtime: HazardRuntimeState = createHazardRuntimeState(),
) {
  return evaluateStageHazards(obstacles, position, playerHalfExtents, deltaSeconds, runtime);
}

describe('contact hazards', () => {
  it('applies wire and spark endpoint damage on inclusive contact entry', () => {
    const result = evaluate([wire(), spark()]);

    expect(result.damage).toBe(40);
    expect(result.events).toEqual([
      { obstacleId: 'wire-1', type: 'wire', damage: 15 },
      { obstacleId: 'spark-1', type: 'spark', damage: 25 },
    ]);
    expect(result.blockingObstacleIds).toEqual(['wire-1', 'spark-1']);
    expect([...result.runtime.activeContactIds]).toEqual(['wire-1', 'spark-1']);
  });

  it('ticks wire and spark damage again after 1/60 second of maintained contact', () => {
    const first = evaluate([wire(), spark()]);
    const second = evaluate([wire(), spark()], playerPosition, 1 / 60, first.runtime);

    expect(second.damage).toBe(40);
    expect(second.events).toEqual([
      { obstacleId: 'wire-1', type: 'wire', damage: 15 },
      { obstacleId: 'spark-1', type: 'spark', damage: 25 },
    ]);
    expect(second.blockingObstacleIds).toEqual(['wire-1', 'spark-1']);
  });

  it('accumulates sub-tick contact time before applying the next tick', () => {
    const entered = evaluate([wire()], playerPosition, 0);
    const halfTick = evaluate(
      [wire()],
      playerPosition,
      CONTACT_DAMAGE_TICK_SECONDS / 2,
      entered.runtime,
    );
    const fullTick = evaluate(
      [wire()],
      playerPosition,
      CONTACT_DAMAGE_TICK_SECONDS / 2,
      halfTick.runtime,
    );

    expect(halfTick.damage).toBe(0);
    expect(halfTick.runtime.contactRemainderSecondsById.get('wire-1')).toBeCloseTo(
      CONTACT_DAMAGE_TICK_SECONDS / 2,
      12,
    );
    expect(fullTick.damage).toBe(15);
    expect(fullTick.runtime.contactRemainderSecondsById.get('wire-1')).toBe(0);
  });

  it.each([30, 60, 120])(
    'keeps one second of sustained contact damage identical at %i Hz',
    (hz) => {
      const obstacles = [wire(), spark()];
      let runtime = evaluate(obstacles, playerPosition, 0).runtime;
      let sustainedDamage = 0;

      for (let frame = 0; frame < hz; frame += 1) {
        const result = evaluate(obstacles, playerPosition, 1 / hz, runtime);
        sustainedDamage += result.damage;
        runtime = result.runtime;
      }

      expect(sustainedDamage).toBe(60 * (15 + 25));
    },
  );

  it('damages again after an exit and re-entry', () => {
    const obstacle = wire();
    const first = evaluate([obstacle]);
    const exited = evaluate([obstacle], point(10, 0, 0), 1 / 60, first.runtime);
    const reentered = evaluate([obstacle], playerPosition, 1 / 60, exited.runtime);

    expect(exited.runtime.activeContactIds.size).toBe(0);
    expect(exited.runtime.contactRemainderSecondsById.size).toBe(0);
    expect(reentered.damage).toBe(15);
  });

  it('does not mutate caller-owned obstacle or runtime data', () => {
    const activeContactIds = new Set<string>(['old-contact']);
    const spentOneShotIds = new Set<string>(['old-vacuum']);
    const contactRemainderSecondsById = new Map<string, number>([['old-contact', 0.01]]);
    const runtime = { activeContactIds, spentOneShotIds, contactRemainderSecondsById };
    const obstacle = Object.freeze(wire());

    const result = evaluate([obstacle], playerPosition, 1 / 60, runtime);

    expect(activeContactIds).toEqual(new Set(['old-contact']));
    expect(spentOneShotIds).toEqual(new Set(['old-vacuum']));
    expect(contactRemainderSecondsById).toEqual(new Map([['old-contact', 0.01]]));
    expect(result.runtime.activeContactIds).not.toBe(activeContactIds);
    expect(result.runtime.spentOneShotIds).not.toBe(spentOneShotIds);
    expect(result.runtime.contactRemainderSecondsById).not.toBe(contactRemainderSecondsById);
    expect(obstacle.damage).toBe(15);
  });
});

describe('overheated relay', () => {
  it('uses exact core, linear midpoint, and range endpoint rates', () => {
    expect(evaluate([heat()], point(1, 0, 0), 0.5).damage).toBeCloseTo(10, 10);
    expect(evaluate([heat()], point(2, 0, 0), 0.5).damage).toBeCloseTo(7, 10);
    expect(evaluate([heat()], point(3, 0, 0), 0.5).damage).toBeCloseTo(4, 10);
    expect(evaluate([heat()], point(3.001, 0, 0), 0.5).damage).toBe(0);
  });

  it.each([30, 60, 120])('produces frame-rate independent heat damage at %i Hz', (hz) => {
    let totalDamage = 0;
    let runtime = createHazardRuntimeState();

    for (let frame = 0; frame < hz * 2; frame += 1) {
      const result = evaluate([heat()], point(2, 0, 0), 1 / hz, runtime);
      totalDamage += result.damage;
      runtime = result.runtime;
    }

    expect(totalDamage).toBeCloseTo(28, 10);
  });

  it('does not emit zero-damage events', () => {
    const result = evaluate([heat()], point(0, 0, 0), 0);

    expect(result.damage).toBe(0);
    expect(result.events).toEqual([]);
  });
});

describe('vacuum tube one-shot damage', () => {
  it('applies 40 damage only once per runtime, including after exit and re-entry', () => {
    const obstacle = vacuum();
    const first = evaluate([obstacle]);
    const exited = evaluate([obstacle], point(10, 0, 0), 1 / 60, first.runtime);
    const reentered = evaluate([obstacle], playerPosition, 1 / 60, exited.runtime);

    expect(first.damage).toBe(40);
    expect(first.events).toEqual([{ obstacleId: 'vacuum-1', type: 'vacuum-tube', damage: 40 }]);
    expect(exited.damage).toBe(0);
    expect(reentered.damage).toBe(0);
    expect(reentered.runtime.spentOneShotIds.has('vacuum-1')).toBe(true);
  });

  it('becomes available again in a fresh stage runtime', () => {
    const firstAttempt = evaluate([vacuum()]);
    const nextAttempt = evaluate([vacuum()], playerPosition, 1 / 60, createHazardRuntimeState());

    expect(firstAttempt.damage).toBe(40);
    expect(nextAttempt.damage).toBe(40);
  });
});

describe('combined evaluation and validation', () => {
  it('aggregates simultaneous contact, heat, and one-shot damage', () => {
    const result = evaluate([wire(), spark(), heat(), vacuum()]);

    expect(result.damage).toBeCloseTo(80 + 20 / 60, 10);
    expect(result.events).toHaveLength(4);
    expect(result.blockingObstacleIds).toEqual(['wire-1', 'spark-1']);
  });

  it('returns independent empty runtime collections', () => {
    const first = createHazardRuntimeState();
    const second = createHazardRuntimeState();

    expect(first.activeContactIds).not.toBe(second.activeContactIds);
    expect(first.spentOneShotIds).not.toBe(second.spentOneShotIds);
    expect(first.contactRemainderSecondsById).not.toBe(second.contactRemainderSecondsById);
  });

  it.each([
    () => evaluate([], point(Number.NaN, 0, 0)),
    () =>
      evaluateStageHazards([], playerPosition, point(-1, 0, 0), 1 / 60, createHazardRuntimeState()),
    () =>
      evaluateStageHazards(
        [],
        point(Number.MAX_VALUE, 0, 0),
        point(Number.MAX_VALUE, 0, 0),
        1 / 60,
        createHazardRuntimeState(),
      ),
    () => evaluate([], playerPosition, Number.POSITIVE_INFINITY),
    () => evaluate([wire({ damage: Number.NaN as 15 })]),
    () => evaluate([heat({ range: 1 })]),
    () => evaluate([heat({ minDamagePerSecond: 21 as 8 })]),
  ])('rejects invalid finite values %#', (invoke) => {
    expect(invoke).toThrow(RangeError);
  });

  it('rejects duplicate or empty IDs and malformed runtime IDs', () => {
    expect(() => evaluate([wire(), wire()])).toThrow(RangeError);
    expect(() => evaluate([wire({ id: ' ' })])).toThrow(TypeError);
    expect(() =>
      evaluate([wire()], playerPosition, 1 / 60, {
        activeContactIds: new Set([123 as unknown as string]),
        spentOneShotIds: new Set(),
        contactRemainderSecondsById: new Map(),
      }),
    ).toThrow(TypeError);
    expect(() =>
      evaluate([wire()], playerPosition, 1 / 60, {
        activeContactIds: new Set(['wire-1']),
        spentOneShotIds: new Set(),
        contactRemainderSecondsById: new Map([['wire-1', Number.NaN]]),
      }),
    ).toThrow(RangeError);
    expect(() =>
      evaluate([wire()], playerPosition, 1 / 60, {
        activeContactIds: new Set(),
        spentOneShotIds: new Set(),
        contactRemainderSecondsById: new Map([['wire-1', 0]]),
      }),
    ).toThrow(RangeError);
    expect(() =>
      evaluate([wire()], playerPosition, 1 / 60, {
        activeContactIds: new Set(['wire-1']),
        spentOneShotIds: new Set(),
        contactRemainderSecondsById: new Map([['wire-1', CONTACT_DAMAGE_TICK_SECONDS]]),
      }),
    ).toThrow(RangeError);
  });
});

describe('landing attempts', () => {
  const target = point(0, -2, 0);

  it('returns none until landing-ready mode reaches the floor', () => {
    expect(evaluateLandingAttempt('hover', target, point(0, 0, 0), target, -2)).toBe('none');
    expect(
      evaluateLandingAttempt('landing-ready', point(0, -1.999, 0), point(0, 0, 0), target, -2),
    ).toBe('none');
  });

  it('accepts inclusive landing distance and speed boundaries at the floor', () => {
    expect(
      evaluateLandingAttempt('landing-ready', point(0.5, -2, 0), point(0, 0.1, 0), target, -2),
    ).toBe('success');
  });

  it('fails outside the target but lets a valid pad contact settle before success', () => {
    expect(
      evaluateLandingAttempt('landing-ready', point(0.501, -2, 0), point(0, 0, 0), target, -2),
    ).toBe('failure');
    expect(
      evaluateLandingAttempt(
        'landing-ready',
        point(0.000_904_552, -2, 0),
        point(0.107_105_432, 0, 0),
        target,
        -2,
      ),
    ).toBe('none');
    expect(
      evaluateLandingAttempt(
        'landing-ready',
        point(0.003_478, -2, 0),
        point(0.098_871, 0, 0),
        target,
        -2,
      ),
    ).toBe('success');
  });

  it('validates all landing inputs even before an attempt can complete', () => {
    expect(() =>
      evaluateLandingAttempt('hover', point(Number.NaN, 0, 0), point(0, 0, 0), target, -2),
    ).toThrow(RangeError);
    expect(() =>
      evaluateLandingAttempt(
        'landing-ready',
        target,
        point(0, 0, 0),
        target,
        Number.POSITIVE_INFINITY,
      ),
    ).toThrow(RangeError);
    expect(() =>
      evaluateLandingAttempt('invalid' as 'hover', target, point(0, 0, 0), target, -2),
    ).toThrow(TypeError);
  });
});
describe('multi-surface landing attempts', () => {
  const origin = point(0, 0, 0);
  const surfaces = [
    {
      surface: 'floor' as const,
      normal: point(0, 1, 0),
      previousPosition: point(0, 0.1, 0),
      approachVelocity: point(0, -1, 0),
    },
    {
      surface: 'ceiling' as const,
      normal: point(0, -1, 0),
      previousPosition: point(0, -0.1, 0),
      approachVelocity: point(0, 1, 0),
    },
    {
      surface: 'left-wall' as const,
      normal: point(1, 0, 0),
      previousPosition: point(0.1, 0, 0),
      approachVelocity: point(-1, 0, 0),
    },
    {
      surface: 'right-wall' as const,
      normal: point(-1, 0, 0),
      previousPosition: point(-0.1, 0, 0),
      approachVelocity: point(1, 0, 0),
    },
  ] as const;

  it.each(surfaces)(
    'clears a safe pre-bounce contact on $surface',
    ({ surface, normal, previousPosition, approachVelocity }) => {
      expect(
        evaluateSurfaceLandingAttempt(
          'landing-ready',
          { previousPosition, position: origin, approachVelocity },
          { position: origin, surface, normal },
        ),
      ).toBe('success');
    },
  );

  it('returns failure for an outside or unsafe target contact', () => {
    const target = { position: origin, surface: 'floor' as const, normal: point(0, 1, 0) };

    expect(
      evaluateSurfaceLandingAttempt(
        'landing-ready',
        {
          previousPosition: point(0.501, 0.1, 0),
          position: point(0.501, 0, 0),
          approachVelocity: point(0, -1, 0),
        },
        target,
      ),
    ).toBe('failure');
    expect(
      evaluateSurfaceLandingAttempt(
        'landing-ready',
        {
          previousPosition: point(0, 0.1, 0),
          position: origin,
          approachVelocity: point(0, -2.001, 0),
        },
        target,
      ),
    ).toBe('failure');
  });

  it('does not terminate before contact, in hover, or while departing', () => {
    const target = { position: origin, surface: 'left-wall' as const, normal: point(1, 0, 0) };

    expect(
      evaluateSurfaceLandingAttempt(
        'landing-ready',
        {
          previousPosition: point(0.2, 0, 0),
          position: point(0.021, 0, 0),
          approachVelocity: point(-1, 0, 0),
        },
        target,
      ),
    ).toBe('none');
    expect(
      evaluateSurfaceLandingAttempt(
        'hover',
        {
          previousPosition: point(0.1, 0, 0),
          position: origin,
          approachVelocity: point(-1, 0, 0),
        },
        target,
      ),
    ).toBe('none');
    expect(
      evaluateSurfaceLandingAttempt(
        'landing-ready',
        {
          previousPosition: origin,
          position: origin,
          approachVelocity: point(0.1, 0, 0),
        },
        target,
      ),
    ).toBe('none');
  });

  it('keeps a target clear irreversible after a later bounce sample', () => {
    const target = { position: origin, surface: 'right-wall' as const, normal: point(-1, 0, 0) };
    const contact = evaluateSurfaceLandingAttempt(
      'landing-ready',
      {
        previousPosition: point(-0.1, 0, 0),
        position: origin,
        approachVelocity: point(1, 0, 0),
      },
      target,
    );
    const afterBounce = evaluateSurfaceLandingAttempt(
      'landing-ready',
      {
        previousPosition: origin,
        position: point(-0.05, 0, 0),
        approachVelocity: point(-0.3, 0, 0),
      },
      target,
    );

    expect(contact).toBe('success');
    expect(afterBounce).toBe('none');
    expect(latchLandingAttempt(contact, afterBounce)).toBe('success');
    expect(latchLandingAttempt('failure', 'success')).toBe('failure');
  });

  it('validates surface-normal pairs, modes, and latch values', () => {
    const motion = {
      previousPosition: point(0, 0.1, 0),
      position: origin,
      approachVelocity: point(0, -1, 0),
    };

    expect(() =>
      evaluateSurfaceLandingAttempt('landing-ready', motion, {
        position: origin,
        surface: 'floor',
        normal: point(0, -1, 0),
      }),
    ).toThrow(RangeError);
    expect(() =>
      evaluateSurfaceLandingAttempt('landing-ready', motion, {
        position: origin,
        surface: 'rear-wall' as 'floor',
        normal: point(0, 1, 0),
      }),
    ).toThrow(TypeError);
    expect(() =>
      evaluateSurfaceLandingAttempt('invalid' as 'hover', motion, {
        position: origin,
        surface: 'floor',
        normal: point(0, 1, 0),
      }),
    ).toThrow(TypeError);
    expect(() => latchLandingAttempt('invalid' as 'none', 'success')).toThrow(TypeError);
    expect(() => latchLandingAttempt('none', 'invalid' as 'success')).toThrow(TypeError);
  });
});
