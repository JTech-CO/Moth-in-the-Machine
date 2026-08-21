import { afterEach, describe, expect, it, vi } from 'vitest';

import { drawShareImage, generateShareImage, ShareImageError } from '@/utils/shareImage';
import type { ResultPresentation } from '@/utils/resultPresentation';

const PRESENTATION = {
  outcome: 'cleared',
  statusLabel: 'STAGE CLEARED',
  stageId: 2,
  stageCode: 'E-01',
  stageName: 'RELAY APPROACH',
  targetLabel: 'RELAY A-16',
  timeMs: 1_947,
  timeLabel: '00:01.9',
  timeIso: 'PT1.947S',
  remainingHealth: 100,
  healthLabel: '100 HP',
  stars: 3,
  starText: '★★★',
  timestamp: '1947-09-09T12:34:56.789Z',
  fileName: 'moth_E-01.png',
  shareText: 'share',
} as const satisfies ResultPresentation;

function context2d(overrides: Record<string, unknown> = {}) {
  const gradient = { addColorStop: vi.fn() };
  const functions = new Set([
    'arc',
    'beginPath',
    'bezierCurveTo',
    'closePath',
    'ellipse',
    'fill',
    'fillRect',
    'fillText',
    'lineTo',
    'moveTo',
    'restore',
    'rotate',
    'save',
    'stroke',
    'strokeRect',
    'translate',
  ]);
  return new Proxy(
    {
      createLinearGradient: () => gradient,
      createRadialGradient: () => gradient,
      ...overrides,
    } as Record<PropertyKey, unknown>,
    {
      get(target, property) {
        if (Reflect.has(target, property)) return Reflect.get(target, property);
        if (typeof property === 'string' && functions.has(property)) {
          const method = vi.fn();
          Reflect.set(target, property, method);
          return method;
        }
        return undefined;
      },
      set(target, property, value) {
        Reflect.set(target, property, value);
        return true;
      },
    },
  ) as unknown as CanvasRenderingContext2D;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('shareImage browser defaults', () => {
  it('uses the global OffscreenCanvas and fallback font path without a document', async () => {
    const png = new Blob(['offscreen'], { type: 'image/png' });
    const context = context2d();
    class FakeOffscreenCanvas {
      public constructor(
        public width: number,
        public height: number,
      ) {}
      public getContext() {
        return context;
      }
      public async convertToBlob() {
        return png;
      }
    }
    vi.stubGlobal('document', undefined);
    vi.stubGlobal('OffscreenCanvas', FakeOffscreenCanvas);

    await expect(generateShareImage(PRESENTATION)).resolves.toBe(png);
  });

  it('uses document fonts and the default HTML canvas fallback', async () => {
    const png = new Blob(['dom'], { type: 'image/png' });
    const canvas = {
      width: 0,
      height: 0,
      getContext: () => context2d(),
      toBlob: (callback: BlobCallback) => callback(png),
    };
    const load = vi.fn(async () => ['font-face']);
    const createElement = vi.fn(() => canvas);
    vi.stubGlobal('OffscreenCanvas', undefined);
    vi.stubGlobal('document', { fonts: { load }, createElement });

    await expect(generateShareImage(PRESENTATION)).resolves.toBe(png);
    expect(load).toHaveBeenCalledWith(
      expect.stringContaining('Courier Prime'),
      'MOTH IN THE MACHINE',
    );
    expect(createElement).toHaveBeenCalledWith('canvas');
    expect(canvas.width).toBe(1080);
    expect(canvas.height).toBe(1080);
  });

  it('handles a synchronous timeout scheduler and ignores later font completion', async () => {
    const png = new Blob(['timeout']);
    const canvas = {
      width: 1080,
      height: 1080,
      getContext: () => context2d(),
      convertToBlob: async () => png,
    } as unknown as OffscreenCanvas;
    await expect(
      generateShareImage(PRESENTATION, {
        createOffscreenCanvas: () => canvas,
        loadFont: async () => undefined,
        scheduleTimeout: (callback) => {
          callback();
          return 1 as unknown as ReturnType<typeof setTimeout>;
        },
        cancelTimeout: vi.fn(),
        fontTimeoutMs: -1,
      }),
    ).resolves.toBe(png);
  });

  it('preserves the context even when drawing fails', () => {
    const restore = vi.fn();
    const context = context2d({
      save: vi.fn(),
      restore,
      fillRect: vi.fn(() => {
        throw new Error('paint failed');
      }),
    });
    expect(() => drawShareImage(context, PRESENTATION)).toThrow('paint failed');
    expect(restore).toHaveBeenCalledOnce();
  });

  it('preserves an explicit ShareImageError returned by the Offscreen encoder', async () => {
    const canvas = {
      width: 1080,
      height: 1080,
      getContext: () => context2d(),
      convertToBlob: async () => null,
    } as unknown as OffscreenCanvas;
    await expect(
      generateShareImage(PRESENTATION, {
        createOffscreenCanvas: () => canvas,
        loadFont: async () => undefined,
      }),
    ).rejects.toMatchObject({
      name: 'ShareImageError',
      message: 'The share image encoder returned no PNG data.',
    });
    await expect(
      generateShareImage(PRESENTATION, {
        createOffscreenCanvas: () => canvas,
        loadFont: async () => undefined,
      }),
    ).rejects.toBeInstanceOf(ShareImageError);
  });
});
