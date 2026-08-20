import { describe, expect, it } from 'vitest';

import {
  DEFAULT_RENDER_QUALITY,
  isRenderQuality,
  RENDER_QUALITIES,
  selectForRenderQuality,
} from '@/utils/renderQuality';

describe('render quality', () => {
  it('accepts only the durable quality modes and defaults to adaptive rendering', () => {
    expect(RENDER_QUALITIES).toEqual(['auto', 'low']);
    expect(DEFAULT_RENDER_QUALITY).toBe('auto');
    expect(isRenderQuality('auto')).toBe(true);
    expect(isRenderQuality('low')).toBe(true);
    expect(isRenderQuality('high')).toBe(false);
    expect(isRenderQuality(null)).toBe(false);
  });

  it('preserves full-detail collections in auto mode and halves them deterministically in low mode', () => {
    const fixtures = ['a', 'b', 'c', 'd', 'e'] as const;

    expect(selectForRenderQuality(fixtures, 'auto')).toBe(fixtures);
    expect(selectForRenderQuality(fixtures, 'low')).toEqual(['a', 'c', 'e']);
    expect(selectForRenderQuality([], 'low')).toEqual([]);
  });
});
