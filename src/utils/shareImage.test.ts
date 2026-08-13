import { describe, expect, it, vi } from 'vitest';

import { generateShareImage, SHARE_IMAGE_SIZE, ShareImageError } from '@/utils/shareImage';
import type { ResultPresentation } from '@/utils/resultPresentation';

const PRESENTATION = {
  outcome: 'cleared',
  statusLabel: 'FLIGHT CLEARED',
  stageId: 2,
  stageCode: 'E-01',
  stageName: 'Relay Approach',
  targetLabel: 'RELAY A-16',
  timeMs: 5_600,
  timeLabel: '00:05.6',
  timeIso: 'PT5.6S',
  remainingHealth: 100,
  healthLabel: '100 HP',
  stars: 3,
  starText: '★★★',
  timestamp: '1947-09-09T00:00:00.000Z',
  fileName: 'moth-in-the-machine-e-01.png',
  shareText: 'Moth in the Machine · E-01 · ★★★ · 00:05.6 · 100 HP',
} as const satisfies ResultPresentation;

function createContext() {
  const text: string[] = [];
  const calls: string[] = [];
  const gradient = { addColorStop: vi.fn() };
  const methods = new Set([
    'arc',
    'beginPath',
    'bezierCurveTo',
    'closePath',
    'ellipse',
    'fill',
    'fillRect',
    'lineTo',
    'moveTo',
    'restore',
    'rotate',
    'save',
    'stroke',
    'strokeRect',
    'translate',
  ]);
  const target: Record<PropertyKey, unknown> = {
    createLinearGradient: vi.fn(() => gradient),
    createRadialGradient: vi.fn(() => gradient),
    fillText: vi.fn((value: string) => {
      text.push(value);
      calls.push(`text:${value}`);
    }),
  };
  const context = new Proxy(target, {
    get(object, property) {
      if (Reflect.has(object, property)) return Reflect.get(object, property);
      if (typeof property === 'string' && methods.has(property)) {
        const method = vi.fn(() => calls.push(property));
        Reflect.set(object, property, method);
        return method;
      }
      return undefined;
    },
    set(object, property, value) {
      Reflect.set(object, property, value);
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
  return { context, text, calls };
}

function fontDependencies() {
  return {
    loadFont: vi.fn(async () => undefined),
    scheduleTimeout: vi.fn((callback: () => void) => setTimeout(callback, 1_000)),
    cancelTimeout: vi.fn((timeout: ReturnType<typeof setTimeout>) => clearTimeout(timeout)),
  };
}

describe('generateShareImage', () => {
  it('prefers a 1080 square OffscreenCanvas and draws the logbook hierarchy', async () => {
    const { context, text, calls } = createContext();
    const png = new Blob(['png'], { type: 'image/png' });
    const offscreen = {
      width: SHARE_IMAGE_SIZE,
      height: SHARE_IMAGE_SIZE,
      getContext: vi.fn(() => context),
      convertToBlob: vi.fn(async () => png),
    } as unknown as OffscreenCanvas;
    const createOffscreenCanvas = vi.fn(() => offscreen);
    const createHtmlCanvas = vi.fn(() => null);

    const result = await generateShareImage(PRESENTATION, {
      ...fontDependencies(),
      createOffscreenCanvas,
      createHtmlCanvas,
    });

    expect(result).toBe(png);
    expect(createOffscreenCanvas).toHaveBeenCalledWith(1080, 1080);
    expect(createHtmlCanvas).not.toHaveBeenCalled();
    expect(offscreen.getContext).toHaveBeenCalledWith('2d');
    expect(offscreen.convertToBlob).toHaveBeenCalledWith({ type: 'image/png' });
    expect(text).toEqual(
      expect.arrayContaining([
        'MOTH IN THE MACHINE',
        'FLIGHT CLEARED · E-01',
        'RELAY APPROACH',
        '★★★',
        'TIME  00:05.6',
        'HEALTH  100 HP',
        '#MothInTheMachine  #FirstComputerBug',
      ]),
    );
    expect(text.indexOf('MOTH IN THE MACHINE')).toBeLessThan(text.indexOf('★★★'));
    expect(text.indexOf('★★★')).toBeLessThan(text.indexOf('TIME  00:05.6'));
    expect(text.indexOf('TIME  00:05.6')).toBeLessThan(
      text.indexOf('#MothInTheMachine  #FirstComputerBug'),
    );
    expect(calls).toContain('bezierCurveTo');
    expect(calls).toContain('ellipse');
    expect(calls).toContain('rotate');
  });

  it('falls back to an HTML canvas and encodes it with toBlob', async () => {
    const { context } = createContext();
    const png = new Blob(['html-png'], { type: 'image/png' });
    const htmlCanvas = {
      width: 1,
      height: 1,
      getContext: vi.fn(() => context),
      toBlob: vi.fn((callback: BlobCallback) => callback(png)),
    } as unknown as HTMLCanvasElement;

    await expect(
      generateShareImage(PRESENTATION, {
        ...fontDependencies(),
        createOffscreenCanvas: () => null,
        createHtmlCanvas: () => htmlCanvas,
      }),
    ).resolves.toBe(png);
    expect(htmlCanvas.width).toBe(1080);
    expect(htmlCanvas.height).toBe(1080);
    expect(htmlCanvas.toBlob).toHaveBeenCalledWith(expect.any(Function), 'image/png');
  });

  it('uses HTML when OffscreenCanvas construction throws', async () => {
    const { context } = createContext();
    const png = new Blob(['fallback']);
    const htmlCanvas = {
      width: 0,
      height: 0,
      getContext: () => context,
      toBlob: (callback: BlobCallback) => callback(png),
    } as unknown as HTMLCanvasElement;
    await expect(
      generateShareImage(PRESENTATION, {
        ...fontDependencies(),
        createOffscreenCanvas: () => {
          throw new Error('unsupported');
        },
        createHtmlCanvas: () => htmlCanvas,
      }),
    ).resolves.toBe(png);
  });

  it('retries with HTML when the OffscreenCanvas has no 2D context', async () => {
    const png = new Blob(['html-after-context-failure'], { type: 'image/png' });
    const offscreen = {
      width: 1080,
      height: 1080,
      getContext: vi.fn(() => null),
      convertToBlob: vi.fn(async () => new Blob(['unused'])),
    } as unknown as OffscreenCanvas;
    const { context } = createContext();
    const htmlCanvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => context),
      toBlob: vi.fn((callback: BlobCallback) => callback(png)),
    } as unknown as HTMLCanvasElement;
    const createOffscreenCanvas = vi.fn(() => offscreen);
    const createHtmlCanvas = vi.fn(() => htmlCanvas);

    await expect(
      generateShareImage(PRESENTATION, {
        ...fontDependencies(),
        createOffscreenCanvas,
        createHtmlCanvas,
      }),
    ).resolves.toBe(png);
    expect(offscreen.convertToBlob).not.toHaveBeenCalled();
    expect(createHtmlCanvas).toHaveBeenCalledWith(1080, 1080);
    expect(createOffscreenCanvas.mock.invocationCallOrder[0]).toBeLessThan(
      createHtmlCanvas.mock.invocationCallOrder[0] ?? Number.POSITIVE_INFINITY,
    );
    expect(htmlCanvas.toBlob).toHaveBeenCalledWith(expect.any(Function), 'image/png');
  });

  it.each([
    {
      encoderFailure: 'rejected encoder',
      createOffscreen: (context: CanvasRenderingContext2D) =>
        ({
          width: 1080,
          height: 1080,
          getContext: vi.fn(() => context),
          convertToBlob: vi.fn(async () => {
            throw new Error('offscreen encoder rejected');
          }),
        }) as unknown as OffscreenCanvas,
    },
    {
      encoderFailure: 'null encoder result',
      createOffscreen: (context: CanvasRenderingContext2D) =>
        ({
          width: 1080,
          height: 1080,
          getContext: vi.fn(() => context),
          convertToBlob: vi.fn(async () => null),
        }) as unknown as OffscreenCanvas,
    },
    {
      encoderFailure: 'missing encoder',
      createOffscreen: (context: CanvasRenderingContext2D) =>
        ({
          width: 1080,
          height: 1080,
          getContext: vi.fn(() => context),
        }) as unknown as OffscreenCanvas,
    },
  ])('retries with HTML after an OffscreenCanvas $encoderFailure', async ({ createOffscreen }) => {
    const { context: offscreenContext } = createContext();
    const { context: htmlContext } = createContext();
    const png = new Blob(['html-after-encoder-failure'], { type: 'image/png' });
    const htmlCanvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => htmlContext),
      toBlob: vi.fn((callback: BlobCallback) => callback(png)),
    } as unknown as HTMLCanvasElement;
    const offscreen = createOffscreen(offscreenContext);
    const createOffscreenCanvas = vi.fn(() => offscreen);
    const createHtmlCanvas = vi.fn(() => htmlCanvas);

    await expect(
      generateShareImage(PRESENTATION, {
        ...fontDependencies(),
        createOffscreenCanvas,
        createHtmlCanvas,
      }),
    ).resolves.toBe(png);
    expect(createHtmlCanvas).toHaveBeenCalledWith(1080, 1080);
    expect(createOffscreenCanvas.mock.invocationCallOrder[0]).toBeLessThan(
      createHtmlCanvas.mock.invocationCallOrder[0] ?? Number.POSITIVE_INFINITY,
    );
    expect(htmlCanvas.toBlob).toHaveBeenCalledWith(expect.any(Function), 'image/png');
  });

  it('returns the final HTML backend error when both canvas backends fail', async () => {
    const { context: offscreenContext } = createContext();
    const { context: htmlContext } = createContext();
    const offscreen = {
      width: 1080,
      height: 1080,
      getContext: vi.fn(() => offscreenContext),
      convertToBlob: vi.fn(async () => {
        throw new Error('offscreen encoder rejected');
      }),
    } as unknown as OffscreenCanvas;
    const htmlCanvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => htmlContext),
    } as unknown as HTMLCanvasElement;

    await expect(
      generateShareImage(PRESENTATION, {
        ...fontDependencies(),
        createOffscreenCanvas: () => offscreen,
        createHtmlCanvas: () => htmlCanvas,
      }),
    ).rejects.toMatchObject({
      name: 'ShareImageError',
      message: 'This canvas cannot encode PNG images.',
    });
    expect(offscreen.convertToBlob).toHaveBeenCalledOnce();
    expect(htmlCanvas.getContext).toHaveBeenCalledWith('2d');
  });

  it('continues with fallback typography after font failure and timeout', async () => {
    const { context } = createContext();
    const png = new Blob(['fallback']);
    const canvas = {
      width: 1080,
      height: 1080,
      getContext: () => context,
      convertToBlob: async () => png,
    } as unknown as OffscreenCanvas;
    await expect(
      generateShareImage(PRESENTATION, {
        createOffscreenCanvas: () => canvas,
        loadFont: async () => {
          throw new Error('font unavailable');
        },
      }),
    ).resolves.toBe(png);
    await expect(
      generateShareImage(PRESENTATION, {
        createOffscreenCanvas: () => canvas,
        loadFont: () => new Promise(() => undefined),
        scheduleTimeout: (callback) => {
          const timeout = setTimeout(callback, 0);
          return timeout;
        },
        cancelTimeout: clearTimeout,
      }),
    ).resolves.toBe(png);
  });

  it('reports missing canvas and rendering contexts', async () => {
    await expect(
      generateShareImage(PRESENTATION, {
        ...fontDependencies(),
        createOffscreenCanvas: () => null,
        createHtmlCanvas: () => null,
      }),
    ).rejects.toThrow('cannot create a canvas');
    const canvas = {
      width: 1080,
      height: 1080,
      getContext: () => null,
      convertToBlob: async () => new Blob(),
    } as unknown as OffscreenCanvas;
    await expect(
      generateShareImage(PRESENTATION, {
        ...fontDependencies(),
        createOffscreenCanvas: () => canvas,
      }),
    ).rejects.toThrow('no 2D rendering context');
  });

  it('wraps encoder rejection and rejects null HTML blobs', async () => {
    const { context } = createContext();
    const rejectedCanvas = {
      width: 1080,
      height: 1080,
      getContext: () => context,
      convertToBlob: async () => {
        throw new Error('encoder failed');
      },
    } as unknown as OffscreenCanvas;
    await expect(
      generateShareImage(PRESENTATION, {
        ...fontDependencies(),
        createOffscreenCanvas: () => rejectedCanvas,
      }),
    ).rejects.toMatchObject({
      name: 'ShareImageError',
      message: 'The share image could not be encoded as PNG.',
    });

    const nullBlobCanvas = {
      width: 1080,
      height: 1080,
      getContext: () => context,
      toBlob: (callback: BlobCallback) => callback(null),
    } as unknown as HTMLCanvasElement;
    await expect(
      generateShareImage(PRESENTATION, {
        ...fontDependencies(),
        createOffscreenCanvas: () => null,
        createHtmlCanvas: () => nullBlobCanvas,
      }),
    ).rejects.toBeInstanceOf(ShareImageError);
  });

  it('rejects canvases without a PNG encoder', async () => {
    const { context } = createContext();
    const canvas = {
      width: 1080,
      height: 1080,
      getContext: () => context,
    } as unknown as HTMLCanvasElement;
    await expect(
      generateShareImage(PRESENTATION, {
        ...fontDependencies(),
        createOffscreenCanvas: () => null,
        createHtmlCanvas: () => canvas,
      }),
    ).rejects.toThrow('cannot encode PNG images');
  });
});
