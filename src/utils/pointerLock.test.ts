import { afterEach, describe, expect, it, vi } from 'vitest';

import { releaseCanvasPointerLock, requestCanvasPointerLock } from '@/utils/pointerLock';

function createCanvas(requestPointerLock = vi.fn()): HTMLCanvasElement {
  return { requestPointerLock } as unknown as HTMLCanvasElement;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('requestCanvasPointerLock', () => {
  it('does nothing when rendered without a browser document', () => {
    vi.stubGlobal('document', undefined);
    const canvas = createCanvas();

    expect(requestCanvasPointerLock(canvas)).toBe(false);
    expect(canvas.requestPointerLock).not.toHaveBeenCalled();
  });

  it('does nothing when there is no canvas', () => {
    expect(requestCanvasPointerLock(null, { pointerLockElement: null })).toBe(false);
  });

  it('treats an already-owned pointer lock as successful without requesting it again', () => {
    const canvas = createCanvas();

    expect(requestCanvasPointerLock(canvas, { pointerLockElement: canvas })).toBe(true);
    expect(canvas.requestPointerLock).not.toHaveBeenCalled();
  });

  it('requests pointer lock and reports synchronous success', () => {
    const requestPointerLock = vi.fn();
    const canvas = createCanvas(requestPointerLock);

    expect(requestCanvasPointerLock(canvas, { pointerLockElement: null })).toBe(true);
    expect(requestPointerLock).toHaveBeenCalledOnce();
  });

  it('uses the active browser document by default', () => {
    const requestPointerLock = vi.fn();
    const canvas = createCanvas(requestPointerLock);
    vi.stubGlobal('document', { pointerLockElement: null });

    expect(requestCanvasPointerLock(canvas)).toBe(true);
    expect(requestPointerLock).toHaveBeenCalledOnce();
  });

  it('absorbs synchronous request errors', () => {
    const canvas = createCanvas(
      vi.fn(() => {
        throw new Error('Pointer lock unavailable');
      }),
    );
    const request = () => requestCanvasPointerLock(canvas, { pointerLockElement: null });

    expect(request).not.toThrow();
    expect(request()).toBe(false);
  });

  it('absorbs asynchronous request rejection', async () => {
    let rejectRequest: (reason?: unknown) => void = () => undefined;
    const request = new Promise<void>((_resolve, reject) => {
      rejectRequest = reject;
    });
    const canvas = createCanvas(vi.fn(() => request));

    expect(requestCanvasPointerLock(canvas, { pointerLockElement: null })).toBe(true);

    rejectRequest(new Error('Pointer lock unavailable'));
    await Promise.resolve();
  });
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
