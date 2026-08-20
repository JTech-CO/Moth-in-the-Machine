export const RENDER_QUALITIES = ['auto', 'low'] as const;

export type RenderQuality = (typeof RENDER_QUALITIES)[number];

export const DEFAULT_RENDER_QUALITY: RenderQuality = 'auto';

export function isRenderQuality(value: unknown): value is RenderQuality {
  return RENDER_QUALITIES.some((quality) => quality === value);
}

export function selectForRenderQuality<Value>(
  values: readonly Value[],
  quality: RenderQuality,
): readonly Value[] {
  if (quality === 'auto' || values.length <= 2) {
    return values;
  }

  return values.filter((_, index) => index % 2 === 0 || index === values.length - 1);
}
