import { afterEach, describe, expect, it, vi } from 'vitest';

import { releaseCanvasPointerLock } from '@/utils/pointerLock';

function createCanvas(): HTMLCanvasElement {
  return {} as HTMLCanvasElement;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('releaseCanvasPointerLock', () => {
  it('does nothing when rendered without a browser document', () => {
    vi.stubGlobal('document', undefined);

    expect(releaseCanvasPointerLock(createCanvas())).toBe(false);
  });

  it('does nothing when there is no canvas', () => {
    const exitPointerLock = vi.fn();

    expect(
      releaseCanvasPointerLock(null, {
        pointerLockElement: null,
        exitPointerLock,
      }),
    ).toBe(false);
    expect(exitPointerLock).not.toHaveBeenCalled();
  });

  it('does not release a pointer lock owned by another element', () => {
    const canvas = createCanvas();
    const exitPointerLock = vi.fn();

    expect(
      releaseCanvasPointerLock(canvas, {
        pointerLockElement: {} as Element,
        exitPointerLock,
      }),
    ).toBe(false);
    expect(exitPointerLock).not.toHaveBeenCalled();
  });

  it('immediately requests release when the canvas owns pointer lock', () => {
    const canvas = createCanvas();
    const exitPointerLock = vi.fn();

    expect(
      releaseCanvasPointerLock(canvas, {
        pointerLockElement: canvas,
        exitPointerLock,
      }),
    ).toBe(true);
    expect(exitPointerLock).toHaveBeenCalledOnce();
  });

  it('uses the active browser document by default', () => {
    const canvas = createCanvas();
    const exitPointerLock = vi.fn();
    vi.stubGlobal('document', {
      pointerLockElement: canvas,
      exitPointerLock,
    });

    expect(releaseCanvasPointerLock(canvas)).toBe(true);
    expect(exitPointerLock).toHaveBeenCalledOnce();
  });

  it('absorbs synchronous release errors', () => {
    const canvas = createCanvas();
    const release = () =>
      releaseCanvasPointerLock(canvas, {
        pointerLockElement: canvas,
        exitPointerLock: () => {
          throw new Error('Pointer lock unavailable');
        },
      });

    expect(release).not.toThrow();
    expect(release()).toBe(false);
  });

  it('absorbs asynchronous release rejection', async () => {
    const canvas = createCanvas();
    let rejectRelease: (reason?: unknown) => void = () => undefined;
    const release = new Promise<void>((_resolve, reject) => {
      rejectRelease = reject;
    });

    expect(
      releaseCanvasPointerLock(canvas, {
        pointerLockElement: canvas,
        exitPointerLock: () => release,
      }),
    ).toBe(true);

    rejectRelease(new Error('Pointer lock unavailable'));
    await Promise.resolve();
  });
});
