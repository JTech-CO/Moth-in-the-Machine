import { describe, expect, it } from 'vitest';

import {
  CANVAS_CONFIG,
  calculateAdaptiveDpr,
  getCanvasConfig,
  getPerformanceBounds,
  LOW_SPEC_CANVAS_CONFIG,
  LOW_SPEC_PERFORMANCE_BOUNDS,
} from '@/components/three/sceneConfig';

describe('low-spec scene configuration', () => {
  it('uses a lower DPR ceiling, no antialiasing, and the same renderer power preference', () => {
    expect(LOW_SPEC_CANVAS_CONFIG).toEqual({
      dpr: [0.75, 1],
      antialias: false,
      powerPreference: 'high-performance',
      toneMappingExposure: 0.92,
    });
    expect(getCanvasConfig('auto')).toBe(CANVAS_CONFIG);
    expect(getCanvasConfig('low')).toBe(LOW_SPEC_CANVAS_CONFIG);
  });

  it('keeps adaptive DPR active inside each quality budget', () => {
    expect(calculateAdaptiveDpr(1, 3, 'low')).toBe(1);
    expect(calculateAdaptiveDpr(0.5, 1, 'low')).toBe(0.88);
    expect(calculateAdaptiveDpr(0, 1, 'low')).toBe(0.75);
    expect(calculateAdaptiveDpr(Number.NaN, Number.NaN, 'low')).toBe(0.75);
  });

  it('targets 60 FPS automatically and the documented 30 FPS low-spec floor', () => {
    expect(getPerformanceBounds('auto')).toEqual([57, 61]);
    expect(LOW_SPEC_PERFORMANCE_BOUNDS).toEqual([28, 32]);
    expect(getPerformanceBounds('low')).toEqual([28, 32]);
  });
});
