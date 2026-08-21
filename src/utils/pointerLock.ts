export interface PointerLockDocument {
  readonly pointerLockElement: Element | null;
  exitPointerLock(): Promise<void> | void;
}

type PointerLockRequestDocument = Pick<PointerLockDocument, 'pointerLockElement'>;

export function requestCanvasPointerLock(
  canvas: HTMLCanvasElement | null,
  pointerLockDocument: PointerLockRequestDocument | null = typeof document === 'undefined'
    ? null
    : document,
): boolean {
  if (canvas === null || pointerLockDocument === null) {
    return false;
  }

  if (pointerLockDocument.pointerLockElement === canvas) {
    return true;
  }

  try {
    const request: Promise<void> | void = canvas.requestPointerLock();

    if (request !== undefined) {
      void request.catch(() => undefined);
    }

    return true;
  } catch {
    return false;
  }
}

export function releaseCanvasPointerLock(
  canvas: HTMLCanvasElement | null,
  pointerLockDocument: PointerLockDocument | null = typeof document === 'undefined'
    ? null
    : document,
): boolean {
  if (
    canvas === null ||
    pointerLockDocument === null ||
    pointerLockDocument.pointerLockElement !== canvas
  ) {
    return false;
  }

  try {
    const release = pointerLockDocument.exitPointerLock();

    if (release !== undefined) {
      void release.catch(() => undefined);
    }

    return true;
  } catch {
    return false;
  }
}
