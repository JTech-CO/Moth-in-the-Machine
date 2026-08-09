import { describe, expect, it } from 'vitest';

import {
  distance3D,
  intersectsAabb,
  intersectsSphereAabb,
  intersectsSpheres,
  isLandingSuccessful,
  LANDING_MAX_DISTANCE,
  LANDING_STOP_SPEED,
  magnitude3D,
  type Aabb,
  type Sphere,
  type Vec3,
} from '@/utils/collision';

const point = (x: number, y: number, z: number): Vec3 => ({ x, y, z });

const unitBox: Aabb = {
  min: point(0, 0, 0),
  max: point(1, 1, 1),
};

describe('vector measurements', () => {
  it('calculates full 3D distance and magnitude', () => {
    expect(distance3D(point(0, 0, 0), point(3, 4, 12))).toBe(13);
    expect(magnitude3D(point(2, -3, 6))).toBe(7);
  });

  it.each([
    point(Number.NaN, 0, 0),
    point(0, Number.POSITIVE_INFINITY, 0),
    point(0, 0, Number.NEGATIVE_INFINITY),
  ])('rejects a non-finite vector %#', (invalidVector) => {
    expect(() => magnitude3D(invalidVector)).toThrow(RangeError);
  });

  it('rejects non-finite derived measurements', () => {
    expect(() => distance3D(point(Number.MAX_VALUE, 0, 0), point(-Number.MAX_VALUE, 0, 0))).toThrow(
      RangeError,
    );
    expect(() => magnitude3D(point(Number.MAX_VALUE, Number.MAX_VALUE, 0))).toThrow(RangeError);
  });
});

describe('AABB intersection', () => {
  it('detects overlap and inclusive face contact', () => {
    expect(
      intersectsAabb(unitBox, {
        min: point(0.25, 0.25, 0.25),
        max: point(0.75, 0.75, 0.75),
      }),
    ).toBe(true);
    expect(
      intersectsAabb(unitBox, {
        min: point(1, 0.25, 0.25),
        max: point(2, 0.75, 0.75),
      }),
    ).toBe(true);
  });

  it.each([
    {
      min: point(1.001, 0, 0),
      max: point(2, 1, 1),
    },
    {
      min: point(0, 1.001, 0),
      max: point(1, 2, 1),
    },
    {
      min: point(0, 0, 1.001),
      max: point(1, 1, 2),
    },
  ] as const)('rejects separated boxes %#', (separatedBox) => {
    expect(intersectsAabb(unitBox, separatedBox)).toBe(false);
  });

  it('rejects malformed and non-finite boxes', () => {
    expect(() =>
      intersectsAabb(unitBox, {
        min: point(2, 0, 0),
        max: point(1, 1, 1),
      }),
    ).toThrow(RangeError);
    expect(() =>
      intersectsAabb(unitBox, {
        min: point(0, 0, 0),
        max: point(1, Number.NaN, 1),
      }),
    ).toThrow(RangeError);
  });
});

describe('sphere intersection', () => {
  const first: Sphere = {
    center: point(0, 0, 0),
    radius: 1,
  };

  it('detects sphere overlap and inclusive contact', () => {
    expect(
      intersectsSpheres(first, {
        center: point(1.5, 0, 0),
        radius: 0.75,
      }),
    ).toBe(true);
    expect(
      intersectsSpheres(first, {
        center: point(2, 0, 0),
        radius: 1,
      }),
    ).toBe(true);
  });

  it('rejects separated or invalid spheres', () => {
    expect(
      intersectsSpheres(first, {
        center: point(2.001, 0, 0),
        radius: 1,
      }),
    ).toBe(false);
    expect(() =>
      intersectsSpheres(first, {
        center: point(0, 0, 0),
        radius: -0.1,
      }),
    ).toThrow(RangeError);
    expect(() =>
      intersectsSpheres(
        { center: point(0, 0, 0), radius: Number.MAX_VALUE },
        { center: point(0, 0, 0), radius: Number.MAX_VALUE },
      ),
    ).toThrow(RangeError);
  });
});

describe('sphere-AABB intersection', () => {
  it('detects centers inside boxes and inclusive face or corner contact', () => {
    expect(
      intersectsSphereAabb(
        {
          center: point(0.5, 0.5, 0.5),
          radius: 0,
        },
        unitBox,
      ),
    ).toBe(true);
    expect(
      intersectsSphereAabb(
        {
          center: point(2, 0.5, 0.5),
          radius: 1,
        },
        unitBox,
      ),
    ).toBe(true);
    expect(
      intersectsSphereAabb(
        {
          center: point(2, 2, 2),
          radius: Math.sqrt(3),
        },
        unitBox,
      ),
    ).toBe(true);
  });

  it('rejects separated spheres and validates both shapes', () => {
    expect(
      intersectsSphereAabb(
        {
          center: point(2.01, 0.5, 0.5),
          radius: 1,
        },
        unitBox,
      ),
    ).toBe(false);
    expect(() =>
      intersectsSphereAabb(
        {
          center: point(0, 0, 0),
          radius: Number.NaN,
        },
        unitBox,
      ),
    ).toThrow(RangeError);
  });
});

describe('landing success', () => {
  it('uses the documented inclusive distance and full-speed limits', () => {
    expect(
      isLandingSuccessful(
        point(LANDING_MAX_DISTANCE, 0, 0),
        point(0, 0, 0),
        point(0, LANDING_STOP_SPEED, 0),
      ),
    ).toBe(true);
  });

  it('rejects excessive distance or speed, including diagonal motion', () => {
    expect(isLandingSuccessful(point(0.5001, 0, 0), point(0, 0, 0), point(0, 0, 0))).toBe(false);
    expect(isLandingSuccessful(point(0, 0, 0), point(0, 0, 0), point(0.1001, 0, 0))).toBe(false);
    expect(isLandingSuccessful(point(0, 0, 0), point(0, 0, 0), point(0.08, 0.08, 0))).toBe(false);
  });

  it('does not mutate caller-owned inputs', () => {
    const position = Object.freeze(point(1, 2, 3));
    const target = Object.freeze(point(1, 2, 3.5));
    const velocity = Object.freeze(point(0.06, 0.08, 0));

    expect(isLandingSuccessful(position, target, velocity)).toBe(true);
    expect(position).toEqual(point(1, 2, 3));
    expect(target).toEqual(point(1, 2, 3.5));
    expect(velocity).toEqual(point(0.06, 0.08, 0));
  });

  it('rejects non-finite landing vectors', () => {
    expect(() =>
      isLandingSuccessful(point(Number.NaN, 0, 0), point(0, 0, 0), point(0, 0, 0)),
    ).toThrow(RangeError);
    expect(() =>
      isLandingSuccessful(point(0, 0, 0), point(0, 0, 0), point(Number.POSITIVE_INFINITY, 0, 0)),
    ).toThrow(RangeError);
    expect(() =>
      isLandingSuccessful(point(1, 0, 0), point(0, 0, 0), point(Number.NaN, 0, 0)),
    ).toThrow(RangeError);
  });
});
